-- Cupones de descuento, entradas de cortesía (invitados) y mensajes a los asistentes.

-- ============================================================================
-- Cupones
-- ============================================================================

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade, -- null = todos mis eventos
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint coupon_percent_range check (discount_type <> 'percent' or discount_value <= 100)
);
create unique index if not exists uq_coupons_code on public.coupons (organizer_id, upper(code));
alter table public.coupons enable row level security;

create policy "coupons_owner_all" on public.coupons
  for all using (public.is_organizer_owner(organizer_id)) with check (public.is_organizer_owner(organizer_id));
create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  discount_cents integer not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_redemptions_coupon on public.coupon_redemptions (coupon_id);
alter table public.coupon_redemptions enable row level security;
create policy "redemptions_select" on public.coupon_redemptions
  for select using (
    user_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.coupons c where c.id = coupon_id and public.is_organizer_owner(c.organizer_id))
  );
-- Sin policies de escritura: solo create_order (security definer).

alter table public.orders
  add column if not exists discount_cents integer not null default 0,
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists is_comp boolean not null default false,
  add column if not exists comp_note text;

-- Un cupón es válido para (usuario, entrada, cantidad) si existe, está activo, dentro
-- de fechas, con usos disponibles y sin pasar el límite por usuario. Los usos cuentan
-- solo pedidos vivos: uno expirado o cancelado libera su cupo de uso.
create or replace function public.evaluate_coupon(
  p_code text,
  p_ticket_type_id uuid,
  p_quantity integer,
  p_user uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tt public.ticket_types%rowtype;
  v_event public.events%rowtype;
  v_coupon public.coupons%rowtype;
  v_subtotal integer;
  v_discount integer;
  v_used integer;
  v_user_used integer;
begin
  select * into v_tt from public.ticket_types where id = p_ticket_type_id;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'ticket_type_not_found');
  end if;
  select * into v_event from public.events where id = v_tt.event_id;

  select * into v_coupon from public.coupons
   where organizer_id = v_event.organizer_id and upper(code) = upper(trim(p_code))
   for update;
  if not found or not v_coupon.active or (v_coupon.event_id is not null and v_coupon.event_id <> v_event.id) then
    return jsonb_build_object('valid', false, 'reason', 'coupon_invalid');
  end if;
  if (v_coupon.valid_from is not null and v_coupon.valid_from > now())
     or (v_coupon.valid_until is not null and v_coupon.valid_until < now()) then
    return jsonb_build_object('valid', false, 'reason', 'coupon_expired');
  end if;

  select count(*) into v_used from public.coupon_redemptions r
    join public.orders o on o.id = r.order_id
   where r.coupon_id = v_coupon.id and o.status not in ('expired', 'cancelled');
  if v_coupon.max_uses is not null and v_used >= v_coupon.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'coupon_exhausted');
  end if;

  select count(*) into v_user_used from public.coupon_redemptions r
    join public.orders o on o.id = r.order_id
   where r.coupon_id = v_coupon.id and r.user_id = p_user and o.status not in ('expired', 'cancelled');
  if v_user_used >= v_coupon.per_user_limit then
    return jsonb_build_object('valid', false, 'reason', 'coupon_used');
  end if;

  v_subtotal := v_tt.price_cents * p_quantity;
  if v_coupon.discount_type = 'percent' then
    v_discount := round(v_subtotal * v_coupon.discount_value / 100.0);
  else
    v_discount := least(v_coupon.discount_value, v_subtotal);
  end if;
  return jsonb_build_object('valid', true, 'coupon_id', v_coupon.id, 'discount_cents', least(v_discount, v_subtotal));
end;
$$;

create or replace function public.preview_coupon(p_ticket_type_id uuid, p_quantity integer, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  return public.evaluate_coupon(p_code, p_ticket_type_id, p_quantity, auth.uid()) - 'coupon_id';
end;
$$;
grant execute on function public.preview_coupon(uuid, integer, text) to authenticated;

-- ============================================================================
-- create_order con cupón. El descuento lo absorbe el organizador: la comisión y el
-- fee de servicio se calculan sobre el subtotal ya rebajado.
-- ============================================================================

drop function if exists public.create_order(uuid, integer, uuid);

create or replace function public.create_order(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_idempotency_key uuid,
  p_coupon_code text default null
)
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
  v_subtotal integer;
  v_fee integer;
  v_commission integer;
  v_total integer;
  v_is_free boolean;
  v_rate numeric(10,4);
  v_total_bs integer;
  v_eval jsonb;
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
  end if;

  v_subtotal := v_gross - v_discount;
  v_is_free := v_subtotal = 0;

  select rate_applied into v_rate from public.exchange_rates order by date desc limit 1;
  v_rate := coalesce(v_rate, 0);

  if v_is_free then
    v_fee := 0;
    v_commission := 0;
    v_total := 0;
    v_total_bs := 0;
  else
    v_fee := greatest(50, round(v_subtotal * 0.03));
    v_commission := round(v_subtotal * coalesce(v_organizer.commission_rate, 0.12));
    v_total := v_subtotal + v_fee;
    v_total_bs := round((v_total / 100.0) * v_rate);
  end if;

  insert into public.orders (
    user_id, event_id, ticket_type_id, quantity, status,
    subtotal_cents, service_fee_cents, total_usd_cents, total_bs, rate_used,
    commission_cents, organizer_net_cents, discount_cents, coupon_id,
    idempotency_key, expires_at, paid_at
  ) values (
    auth.uid(), v_event.id, v_ticket_type.id, p_quantity,
    case when v_is_free then 'paid' else 'pending_payment' end,
    v_subtotal, v_fee, v_total, v_total_bs, nullif(v_rate, 0),
    v_commission, v_subtotal - v_commission, v_discount, v_coupon_id,
    p_idempotency_key,
    now() + interval '15 minutes',
    case when v_is_free then now() else null end
  )
  returning * into v_order;

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, user_id, discount_cents)
    values (v_coupon_id, v_order.id, auth.uid(), v_discount);
  end if;

  -- Gratis: el disparador on_order_paid ya suma "sold" y emite los tickets.
  if not v_is_free then
    update public.ticket_types set reserved = reserved + p_quantity where id = v_ticket_type.id;
  end if;

  return v_order;
end;
$$;
grant execute on function public.create_order(uuid, integer, uuid, text) to authenticated;

-- ============================================================================
-- Cortesías: el organizador regala entradas a alguien que ya tiene cuenta.
-- No cuestan, no dan puntos, no cuentan como venta ni comisión.
-- ============================================================================

create or replace function public.issue_comp_tickets(
  p_ticket_type_id uuid,
  p_email text,
  p_quantity integer,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tt public.ticket_types%rowtype;
  v_event public.events%rowtype;
  v_guest public.users%rowtype;
  v_order public.orders%rowtype;
begin
  if p_quantity < 1 or p_quantity > 6 then
    raise exception 'invalid_quantity';
  end if;

  select * into v_tt from public.ticket_types where id = p_ticket_type_id for update;
  if not found then
    raise exception 'ticket_type_not_found';
  end if;
  select * into v_event from public.events where id = v_tt.event_id;
  if not (public.is_organizer_owner(v_event.organizer_id) or public.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizers where id = v_event.organizer_id and verification_status = 'verificado') then
    raise exception 'organizer_not_verified';
  end if;
  if v_event.status not in ('published', 'sold_out', 'live') then
    raise exception 'event_not_on_sale';
  end if;
  if v_tt.quantity - v_tt.sold - v_tt.reserved < p_quantity then
    raise exception 'sold_out';
  end if;

  select * into v_guest from public.users where lower(email) = lower(trim(p_email));
  if not found then
    raise exception 'user_not_found';
  end if;

  insert into public.orders (
    user_id, event_id, ticket_type_id, quantity, status,
    subtotal_cents, service_fee_cents, total_usd_cents, total_bs,
    commission_cents, organizer_net_cents, is_comp, comp_note,
    idempotency_key, expires_at, paid_at
  ) values (
    v_guest.id, v_event.id, v_tt.id, p_quantity, 'paid',
    0, 0, 0, 0, 0, 0, true, nullif(trim(coalesce(p_note, '')), ''),
    gen_random_uuid(), now(), now()
  )
  returning * into v_order;
  return v_order;
end;
$$;
grant execute on function public.issue_comp_tickets(uuid, text, integer, text) to authenticated;

-- handle_order_paid: las cortesías no otorgan puntos ni bono de primera compra.
CREATE OR REPLACE FUNCTION public.handle_order_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  i integer;
  new_ticket_id uuid;
  is_first_purchase boolean;
  points_earned integer;
begin
  if new.status <> 'paid' or (tg_op = 'UPDATE' and old.status = 'paid') then
    return new;
  end if;

  update public.ticket_types
  set
    reserved = greatest(0, reserved - new.quantity),
    sold = sold + new.quantity
  where id = new.ticket_type_id;

  for i in 1..new.quantity loop
    new_ticket_id := gen_random_uuid();
    insert into public.tickets (id, order_id, event_id, ticket_type_id, user_id, code, qr_signature, status)
    values (
      new_ticket_id,
      new.id,
      new.event_id,
      new.ticket_type_id,
      new.user_id,
      public.generate_ticket_code(),
      encode(
        hmac(
          convert_to(new_ticket_id::text || ':' || new.event_id::text, 'UTF8'),
          convert_to('plann-dev-secret', 'UTF8'),
          'sha256'::text
        ),
        'hex'
      ),
      'valid'
    );
  end loop;

  if new.is_comp then
    return new;
  end if;

  select not exists (
    select 1 from public.orders
    where user_id = new.user_id and status = 'paid' and id <> new.id
  ) into is_first_purchase;

  points_earned := round(new.subtotal_cents / 100.0);
  insert into public.loyalty_entries (user_id, points, reason, order_id)
  values (new.user_id, points_earned, 'Compra', new.id);

  if is_first_purchase then
    insert into public.loyalty_entries (user_id, points, reason, order_id)
    values (new.user_id, 50, 'Primera compra', new.id);
  end if;

  return new;
end;
$function$;


-- Avisos de venta: una cortesía no es una venta; al invitado se le avisa que lo invitaron.
create or replace function public.notify_on_order_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_owner uuid;
  v_type text;
begin
  select * into v_event from public.events where id = new.event_id;
  select owner_user_id into v_owner from public.organizers where id = v_event.organizer_id;
  select name into v_type from public.ticket_types where id = new.ticket_type_id;

  if new.is_comp then
    perform public.notify(
      new.user_id, 'comp_ticket', 'Te invitaron a un evento',
      'Tienes ' || new.quantity || ' ' || case when new.quantity = 1 then 'entrada' else 'entradas' end || ' de cortesía para ' || v_event.title || '.',
      jsonb_build_object('route', '/tickets', 'event_id', v_event.id, 'order_id', new.id),
      'comp:' || new.id
    );
    return new;
  end if;

  perform public.notify(
    v_owner, 'new_sale', 'Nueva venta',
    new.quantity || ' × ' || v_type || ' · ' || v_event.title || case when new.organizer_net_cents > 0 then ' — ' || public.fmt_usd(new.organizer_net_cents) else '' end,
    jsonb_build_object('route', '/organizador/ventas', 'event_id', v_event.id, 'order_id', new.id),
    'sale:' || new.id
  );

  if tg_op = 'UPDATE' and old.status in ('in_verification', 'pending_payment') then
    perform public.notify(
      new.user_id, 'payment_approved', 'Tu pago fue aprobado',
      'Ya tienes tus entradas para ' || v_event.title || '.',
      jsonb_build_object('route', '/tickets', 'event_id', v_event.id, 'order_id', new.id),
      'paid:' || new.id
    );
  end if;
  return new;
end;
$$;

-- ============================================================================
-- Mensajes a los asistentes
-- ============================================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  message text not null,
  recipients integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_announcements_event on public.announcements (event_id, created_at desc);
alter table public.announcements enable row level security;
create policy "announcements_owner_select" on public.announcements
  for select using (public.is_organizer_owner(organizer_id) or public.is_admin());
-- Sin policy de escritura: solo send_event_announcement.

-- Límite: 3 mensajes por evento cada 24 h, para que nadie use esto como spam.
create or replace function public.send_event_announcement(p_event_id uuid, p_message text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_message text := trim(coalesce(p_message, ''));
  v_ann uuid;
  v_count integer;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'event_not_found';
  end if;
  if not public.is_organizer_owner(v_event.organizer_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_event.status in ('cancelled', 'finished') then
    raise exception 'event_closed';
  end if;
  if length(v_message) < 5 or length(v_message) > 500 then
    raise exception 'message_length';
  end if;
  if (select count(*) from public.announcements where event_id = p_event_id and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'announcement_limit';
  end if;

  insert into public.announcements (event_id, organizer_id, message)
  values (p_event_id, v_event.organizer_id, v_message)
  returning id into v_ann;

  select count(*) into v_count from (
    select distinct user_id from public.tickets where event_id = p_event_id and status in ('valid', 'used')
  ) t;

  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  select distinct t.user_id, 'organizer_message', v_event.title, v_message,
         jsonb_build_object('route', '/tickets', 'event_id', p_event_id, 'announcement_id', v_ann),
         'ann:' || v_ann
    from public.tickets t
   where t.event_id = p_event_id and t.status in ('valid', 'used');

  update public.announcements set recipients = v_count where id = v_ann;
  return v_count;
end;
$$;
grant execute on function public.send_event_announcement(uuid, text) to authenticated;
