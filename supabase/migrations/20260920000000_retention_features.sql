-- Lista de espera, alertas de precio, ofertas de última hora, descuento de
-- cumpleaños, eventos comunitarios y regalo de entradas.

alter table public.ticket_types
  add column if not exists last_minute_pct integer check (last_minute_pct between 5 and 90),
  add column if not exists last_minute_hours integer check (last_minute_hours between 1 and 72),
  add column if not exists last_minute_notified_at timestamptz;
alter table public.organizers
  add column if not exists birthday_pct integer not null default 0 check (birthday_pct between 0 and 50);
alter table public.events
  add column if not exists is_community boolean not null default false;
alter table public.orders
  add column if not exists discount_kind text check (discount_kind in ('coupon', 'last_minute', 'birthday'));

-- ---------------------------------------------------------------- ofertas automáticas
create or replace function public._auto_offer(p_ticket_type_id uuid, p_quantity integer, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tt public.ticket_types%rowtype;
  v_event public.events%rowtype;
  v_pct_org integer;
  v_bd date;
  v_today date := (now() at time zone 'America/Caracas')::date;
  v_gross integer;
  v_lm integer := 0;
  v_bday integer := 0;
begin
  select * into v_tt from public.ticket_types where id = p_ticket_type_id;
  if not found or v_tt.price_cents = 0 then
    return jsonb_build_object('kind', null, 'discount_cents', 0);
  end if;
  select * into v_event from public.events where id = v_tt.event_id;
  v_gross := v_tt.price_cents * p_quantity;

  if v_tt.last_minute_pct is not null and v_tt.last_minute_hours is not null
     and now() >= v_event.starts_at - make_interval(hours => v_tt.last_minute_hours)
     and now() < coalesce(v_event.ends_at, v_event.starts_at + interval '6 hours') then
    v_lm := round(v_gross * v_tt.last_minute_pct / 100.0);
  end if;

  select birthday_pct into v_pct_org from public.organizers where id = v_event.organizer_id;
  select birth_date into v_bd from public.users where id = p_user;
  if coalesce(v_pct_org, 0) > 0 and v_bd is not null and exists (
    select 1 from generate_series(-1, 1) y
     where abs(v_today - (v_bd + make_interval(years => extract(year from v_today)::int - extract(year from v_bd)::int + y))::date) <= 3
  ) then
    v_bday := round(v_gross * v_pct_org / 100.0);
  end if;

  if v_lm = 0 and v_bday = 0 then
    return jsonb_build_object('kind', null, 'discount_cents', 0);
  end if;
  if v_bday > v_lm then
    return jsonb_build_object('kind', 'birthday', 'discount_cents', v_bday, 'label', 'Descuento de cumpleaños ' || v_pct_org || '%');
  end if;
  return jsonb_build_object('kind', 'last_minute', 'discount_cents', v_lm, 'label', 'Oferta de última hora ' || v_tt.last_minute_pct || '%');
end;
$$;
revoke execute on function public._auto_offer(uuid, integer, uuid) from public, anon, authenticated;

create or replace function public.quote_auto_offer(p_ticket_type_id uuid, p_quantity integer)
returns jsonb
language sql
security definer
set search_path = public
as $$ select public._auto_offer(p_ticket_type_id, greatest(1, p_quantity), auth.uid()) $$;
revoke execute on function public.quote_auto_offer(uuid, integer) from public, anon;
grant execute on function public.quote_auto_offer(uuid, integer) to authenticated;

-- create_order: aplica el mejor descuento entre cupón y oferta automática (no se suman)
create or replace function public.create_order(p_ticket_type_id uuid, p_quantity integer, p_idempotency_key uuid, p_coupon_code text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_type public.ticket_types%rowtype;
  v_event public.events%rowtype;
  v_organizer public.organizers%rowtype;
  v_available integer;
  v_gross integer;
  v_discount integer := 0;
  v_coupon_id uuid;
  v_kind text;
  v_subtotal integer;
  v_fee integer;
  v_commission integer;
  v_total integer;
  v_is_free boolean;
  v_rate numeric(10,4);
  v_total_bs integer;
  v_eval jsonb;
  v_auto jsonb;
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if p_quantity < 1 or p_quantity > 6 then
    raise exception 'invalid_quantity';
  end if;

  select * into v_ticket_type from public.ticket_types where id = p_ticket_type_id for update;
  if not found then
    raise exception 'ticket_type_not_found';
  end if;

  select * into v_event from public.events where id = v_ticket_type.event_id;
  if v_event.status not in ('published', 'sold_out', 'live') then
    raise exception 'event_not_on_sale';
  end if;
  if v_event.sales_paused then
    raise exception 'sales_paused';
  end if;
  if v_ticket_type.sales_start is not null and v_ticket_type.sales_start > now() then
    raise exception 'sales_not_started';
  end if;
  if v_ticket_type.sales_end is not null and v_ticket_type.sales_end < now() then
    raise exception 'sales_ended';
  end if;

  v_available := v_ticket_type.quantity - v_ticket_type.sold - v_ticket_type.reserved;
  if v_available < p_quantity then
    raise exception 'sold_out';
  end if;

  select * into v_organizer from public.organizers where id = v_event.organizer_id;
  v_gross := v_ticket_type.price_cents * p_quantity;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    v_eval := public.evaluate_coupon(p_coupon_code, p_ticket_type_id, p_quantity, auth.uid());
    if not (v_eval->>'valid')::boolean then
      raise exception '%', v_eval->>'reason';
    end if;
    v_discount := (v_eval->>'discount_cents')::integer;
    v_coupon_id := (v_eval->>'coupon_id')::uuid;
    v_kind := 'coupon';
  end if;

  v_auto := public._auto_offer(p_ticket_type_id, p_quantity, auth.uid());
  if (v_auto->>'discount_cents')::integer > v_discount then
    v_discount := (v_auto->>'discount_cents')::integer;
    v_coupon_id := null;
    v_kind := v_auto->>'kind';
  end if;

  v_subtotal := v_gross - v_discount;
  v_is_free := v_subtotal = 0;

  select rate_applied into v_rate from public.exchange_rates order by date desc limit 1;
  v_rate := coalesce(v_rate, 0);

  if v_is_free then
    v_fee := 0; v_commission := 0; v_total := 0; v_total_bs := 0;
  else
    v_fee := greatest(50, round(v_subtotal * 0.03));
    v_commission := round(v_subtotal * coalesce(v_organizer.commission_rate, 0.12));
    v_total := v_subtotal + v_fee;
    v_total_bs := round((v_total / 100.0) * v_rate);
  end if;

  insert into public.orders (
    user_id, event_id, ticket_type_id, quantity, status,
    subtotal_cents, service_fee_cents, total_usd_cents, total_bs, rate_used,
    commission_cents, organizer_net_cents, discount_cents, coupon_id, discount_kind,
    idempotency_key, expires_at, paid_at
  ) values (
    auth.uid(), v_event.id, v_ticket_type.id, p_quantity,
    case when v_is_free then 'paid' else 'pending_payment' end,
    v_subtotal, v_fee, v_total, v_total_bs, nullif(v_rate, 0),
    v_commission, v_subtotal - v_commission, v_discount, v_coupon_id, case when v_discount > 0 then v_kind end,
    p_idempotency_key,
    now() + interval '15 minutes',
    case when v_is_free then now() else null end
  )
  returning * into v_order;

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, user_id, discount_cents)
    values (v_coupon_id, v_order.id, auth.uid(), v_discount);
  end if;

  if not v_is_free then
    update public.ticket_types set reserved = reserved + p_quantity where id = v_ticket_type.id;
  end if;

  return v_order;
end;
$$;
revoke execute on function public.create_order(uuid, integer, uuid, text) from public, anon;
grant execute on function public.create_order(uuid, integer, uuid, text) to authenticated;

-- ---------------------------------------------------------------- lista de espera y alertas
create table if not exists public.event_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('waitlist', 'price')),
  created_at timestamptz not null default now(),
  unique (user_id, event_id, kind)
);
alter table public.event_alerts enable row level security;
drop policy if exists event_alerts_own on public.event_alerts;
create policy event_alerts_own on public.event_alerts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.event_alerts to authenticated;

create or replace function public.trg_ticket_type_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  r record;
begin
  select * into v_event from public.events where id = new.event_id;
  if v_event.status not in ('published', 'sold_out', 'live') then
    return new;
  end if;

  if (old.quantity - old.sold - old.reserved) <= 0 and (new.quantity - new.sold - new.reserved) > 0 then
    for r in select user_id from public.event_alerts where event_id = new.event_id and kind = 'waitlist' loop
      perform public.notify(r.user_id, 'waitlist', 'Se liberó un cupo',
        'Hay entradas disponibles otra vez para ' || v_event.title || '. Corre antes de que se agoten.',
        jsonb_build_object('route', '/evento/' || new.event_id, 'event_id', new.event_id));
    end loop;
    delete from public.event_alerts where event_id = new.event_id and kind = 'waitlist';
  end if;

  if new.price_cents < old.price_cents then
    for r in select user_id from public.event_alerts where event_id = new.event_id and kind = 'price' loop
      perform public.notify(r.user_id, 'price', 'Bajó el precio',
        v_event.title || ': ' || new.name || ' ahora cuesta ' || public.fmt_usd(new.price_cents) || '.',
        jsonb_build_object('route', '/evento/' || new.event_id, 'event_id', new.event_id),
        'price:' || new.id || ':' || new.price_cents || ':' || r.user_id);
    end loop;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_ticket_type_alerts() from public, anon, authenticated;
drop trigger if exists trg_ticket_type_alerts on public.ticket_types;
create trigger trg_ticket_type_alerts after update of sold, reserved, quantity, price_cents on public.ticket_types
  for each row execute function public.trg_ticket_type_alerts();

create or replace function public.trg_reset_last_minute()
returns trigger language plpgsql as $$
begin
  if (new.last_minute_pct, new.last_minute_hours) is distinct from (old.last_minute_pct, old.last_minute_hours) then
    new.last_minute_notified_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_reset_last_minute() from public, anon, authenticated;
drop trigger if exists trg_reset_last_minute on public.ticket_types;
create trigger trg_reset_last_minute before update on public.ticket_types
  for each row execute function public.trg_reset_last_minute();

-- Avisa cuando se abre la ventana de última hora (a quienes vigilan el precio y a los seguidores)
create or replace function public.notify_last_minute_offers()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  u record;
begin
  for r in
    select tt.id, tt.name, tt.last_minute_pct, e.id as event_id, e.title, e.organizer_id
      from public.ticket_types tt
      join public.events e on e.id = tt.event_id
     where tt.last_minute_pct is not null and tt.last_minute_notified_at is null
       and e.status in ('published', 'live')
       and now() >= e.starts_at - make_interval(hours => tt.last_minute_hours)
       and now() < coalesce(e.ends_at, e.starts_at + interval '6 hours')
       and tt.quantity - tt.sold - tt.reserved > 0
  loop
    for u in
      select user_id from public.event_alerts where event_id = r.event_id and kind = 'price'
      union
      select user_id from public.follows where organizer_id = r.organizer_id
    loop
      perform public.notify(u.user_id, 'last_minute', 'Oferta de última hora',
        r.title || ': ' || r.last_minute_pct || '% menos en ' || r.name || ' solo por hoy.',
        jsonb_build_object('route', '/evento/' || r.event_id, 'event_id', r.event_id),
        'lastminute:' || r.id || ':' || u.user_id);
    end loop;
    update public.ticket_types set last_minute_notified_at = now() where id = r.id;
  end loop;
end;
$$;
revoke execute on function public.notify_last_minute_offers() from public, anon, authenticated;

-- ---------------------------------------------------------------- cumpleaños
create or replace function public.notify_birthdays()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Caracas')::date;
  v_offers integer;
  u record;
begin
  select count(*) into v_offers
    from public.events e join public.organizers o on o.id = e.organizer_id
   where o.birthday_pct > 0 and e.status = 'published' and e.starts_at > now();
  if v_offers = 0 then
    return;
  end if;
  for u in
    select id, coalesce(split_part(full_name, ' ', 1), '') as first_name from public.users
     where birth_date is not null and status = 'active'
       and extract(month from birth_date) = extract(month from v_today)
       and extract(day from birth_date) = extract(day from v_today)
  loop
    perform public.notify(u.id, 'birthday', 'Feliz cumpleaños' || case when u.first_name <> '' then ', ' || u.first_name else '' end,
      'Tienes descuento de cumpleaños en ' || v_offers || ' ' || case when v_offers = 1 then 'evento' else 'eventos' end || ' durante estos días.',
      jsonb_build_object('route', '/'), 'birthday:' || extract(year from v_today));
  end loop;
end;
$$;
revoke execute on function public.notify_birthdays() from public, anon, authenticated;

select cron.schedule('notify-last-minute', '*/10 * * * *', 'select public.notify_last_minute_offers()');
select cron.schedule('notify-birthdays', '0 12 * * *', 'select public.notify_birthdays()');

-- ---------------------------------------------------------------- regalar entradas
create table if not exists public.ticket_gifts (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  from_user uuid not null references auth.users(id),
  to_email text not null,
  to_user uuid references auth.users(id),
  message text check (message is null or length(message) <= 300),
  status text not null default 'pending' check (status in ('pending', 'claimed', 'cancelled')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index if not exists idx_ticket_gifts_email on public.ticket_gifts (lower(to_email)) where status = 'pending';
alter table public.ticket_gifts enable row level security;
drop policy if exists ticket_gifts_parties on public.ticket_gifts;
create policy ticket_gifts_parties on public.ticket_gifts for select
  using (from_user = auth.uid() or to_user = auth.uid() or public.is_admin());
grant select on public.ticket_gifts to authenticated;

-- El QR viejo deja de servir: el código se regenera al cambiar de dueño.
create or replace function public._transfer_ticket(p_ticket uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_try integer := 0;
begin
  loop
    begin
      update public.tickets
         set user_id = p_to, status = 'valid', code = public.generate_ticket_code(),
             attendee_name = null, attendee_document = null
       where id = p_ticket;
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 5 then raise; end if;
    end;
  end loop;
end;
$$;
revoke execute on function public._transfer_ticket(uuid, uuid) from public, anon, authenticated;

create or replace function public.gift_ticket(p_ticket_id uuid, p_email text, p_message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets%rowtype;
  v_event public.events%rowtype;
  v_email text := lower(trim(p_email));
  v_to uuid;
  v_from_name text;
  v_gift uuid;
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if v_email !~ '^\S+@\S+\.\S+$' then
    raise exception 'email_invalid';
  end if;
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found or v_ticket.user_id <> auth.uid() then
    raise exception 'ticket_not_found';
  end if;
  if v_ticket.status <> 'valid' or v_ticket.checked_in_at is not null then
    raise exception 'ticket_not_giftable';
  end if;
  select * into v_event from public.events where id = v_ticket.event_id;
  if coalesce(v_event.ends_at, v_event.starts_at + interval '6 hours') < now() or v_event.status = 'cancelled' then
    raise exception 'event_over';
  end if;

  select id into v_to from public.users where lower(email) = v_email;
  if v_to = auth.uid() then
    raise exception 'gift_to_self';
  end if;
  select coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Alguien') into v_from_name from public.users where id = auth.uid();

  if v_to is not null then
    perform public._transfer_ticket(p_ticket_id, v_to);
    insert into public.ticket_gifts (ticket_id, from_user, to_email, to_user, message, status, claimed_at)
    values (p_ticket_id, auth.uid(), v_email, v_to, nullif(trim(p_message), ''), 'claimed', now());
    perform public.notify(v_to, 'gift', v_from_name || ' te regaló una entrada',
      v_event.title || case when nullif(trim(p_message), '') is not null then ' · «' || trim(p_message) || '»' else '' end,
      jsonb_build_object('route', '/tickets', 'event_id', v_event.id));
    return jsonb_build_object('status', 'delivered');
  end if;

  update public.tickets set status = 'transferred' where id = p_ticket_id;
  insert into public.ticket_gifts (ticket_id, from_user, to_email, message)
  values (p_ticket_id, auth.uid(), v_email, nullif(trim(p_message), ''))
  returning id into v_gift;
  return jsonb_build_object('status', 'pending', 'gift_id', v_gift);
end;
$$;
revoke execute on function public.gift_ticket(uuid, text, text) from public, anon;
grant execute on function public.gift_ticket(uuid, text, text) to authenticated;

create or replace function public.cancel_gift(p_gift_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gift public.ticket_gifts%rowtype;
begin
  select * into v_gift from public.ticket_gifts where id = p_gift_id for update;
  if not found or v_gift.from_user <> auth.uid() or v_gift.status <> 'pending' then
    raise exception 'gift_not_found';
  end if;
  update public.tickets set status = 'valid' where id = v_gift.ticket_id and status = 'transferred';
  update public.ticket_gifts set status = 'cancelled' where id = p_gift_id;
end;
$$;
revoke execute on function public.cancel_gift(uuid) from public, anon;
grant execute on function public.cancel_gift(uuid) to authenticated;

create or replace function public.claim_pending_gifts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  v_title text;
  v_from text;
begin
  for g in select * from public.ticket_gifts where status = 'pending' and lower(to_email) = lower(new.email) for update loop
    perform public._transfer_ticket(g.ticket_id, new.id);
    update public.ticket_gifts set status = 'claimed', to_user = new.id, claimed_at = now() where id = g.id;
    select e.title into v_title from public.tickets t join public.events e on e.id = t.event_id where t.id = g.ticket_id;
    select coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Alguien') into v_from from public.users where id = g.from_user;
    perform public.notify(new.id, 'gift', v_from || ' te regaló una entrada', v_title,
      jsonb_build_object('route', '/tickets'));
    perform public.notify(g.from_user, 'gift', 'Tu regalo fue recibido', g.to_email || ' ya tiene su entrada para ' || v_title || '.',
      jsonb_build_object('route', '/tickets'));
  end loop;
  return new;
end;
$$;
revoke execute on function public.claim_pending_gifts() from public, anon, authenticated;
drop trigger if exists trg_claim_pending_gifts on public.users;
create trigger trg_claim_pending_gifts after insert on public.users
  for each row execute function public.claim_pending_gifts();
