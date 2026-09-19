-- El descuento de cumpleaños lo paga Plann (no el organizador).
-- 10 % con tope de $5 por compra, una vez por año, en cualquier evento de pago.
alter table public.orders add column if not exists plann_subsidy_cents integer not null default 0;
alter table public.organizers drop column if exists birthday_pct;

create or replace function public._auto_offer(p_ticket_type_id uuid, p_quantity integer, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tt public.ticket_types%rowtype;
  v_event public.events%rowtype;
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

  select birth_date into v_bd from public.users where id = p_user;
  if v_bd is not null
     and exists (
       select 1 from generate_series(-1, 1) y
        where abs(v_today - (v_bd + make_interval(years => extract(year from v_today)::int - extract(year from v_bd)::int + y))::date) <= 3
     )
     and not exists (
       select 1 from public.orders o
        where o.user_id = p_user and o.discount_kind = 'birthday'
          and o.status not in ('expired', 'cancelled', 'refunded')
          and o.created_at > now() - interval '300 days'
     ) then
    v_bday := least(round(v_gross * 0.10), 500);
  end if;

  if v_lm = 0 and v_bday = 0 then
    return jsonb_build_object('kind', null, 'discount_cents', 0);
  end if;
  if v_bday > v_lm then
    return jsonb_build_object('kind', 'birthday', 'discount_cents', v_bday, 'label', 'Regalo de cumpleaños de Plann');
  end if;
  return jsonb_build_object('kind', 'last_minute', 'discount_cents', v_lm, 'label', 'Oferta de última hora ' || v_tt.last_minute_pct || '%');
end;
$$;
revoke execute on function public._auto_offer(uuid, integer, uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_order(p_ticket_type_id uuid, p_quantity integer, p_idempotency_key uuid, p_coupon_code text DEFAULT NULL::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_subsidy integer := 0;
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
  -- El descuento de cumpleaños lo paga Plann: el organizador cobra como si no existiera.
  if v_kind = 'birthday' then
    v_subsidy := v_discount;
  end if;

  v_subtotal := v_gross - v_discount;
  v_is_free := v_subtotal = 0;

  select rate_applied into v_rate from public.exchange_rates order by date desc limit 1;
  v_rate := coalesce(v_rate, 0);

  if v_is_free then
    v_fee := 0; v_commission := 0; v_total := 0; v_total_bs := 0;
  else
    v_fee := greatest(50, round(v_subtotal * 0.03));
    v_commission := round((v_subtotal + v_subsidy) * coalesce(v_organizer.commission_rate, 0.12));
    v_total := v_subtotal + v_fee;
    v_total_bs := round((v_total / 100.0) * v_rate);
  end if;

  insert into public.orders (
    user_id, event_id, ticket_type_id, quantity, status,
    subtotal_cents, service_fee_cents, total_usd_cents, total_bs, rate_used,
    commission_cents, organizer_net_cents, discount_cents, coupon_id, discount_kind, plann_subsidy_cents,
    idempotency_key, expires_at, paid_at
  ) values (
    auth.uid(), v_event.id, v_ticket_type.id, p_quantity,
    case when v_is_free then 'paid' else 'pending_payment' end,
    v_subtotal, v_fee, v_total, v_total_bs, nullif(v_rate, 0),
    v_commission, v_subtotal + v_subsidy - v_commission, v_discount, v_coupon_id, case when v_discount > 0 then v_kind end, v_subsidy,
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
$function$;

revoke execute on function public.create_order(uuid, integer, uuid, text) from public, anon;
grant execute on function public.create_order(uuid, integer, uuid, text) to authenticated;

create or replace function public.notify_birthdays()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Caracas')::date;
  u record;
begin
  if not exists (select 1 from public.events where status = 'published' and starts_at > now()) then
    return;
  end if;
  for u in
    select id, coalesce(split_part(full_name, ' ', 1), '') as first_name from public.users
     where birth_date is not null and status = 'active'
       and extract(month from birth_date) = extract(month from v_today)
       and extract(day from birth_date) = extract(day from v_today)
  loop
    perform public.notify(u.id, 'birthday', 'Feliz cumpleaños' || case when u.first_name <> '' then ', ' || u.first_name else '' end,
      'Plann te regala 10% (hasta $5) en tu próxima entrada, durante estos días.',
      jsonb_build_object('route', '/'), 'birthday:' || extract(year from v_today));
  end loop;
end;
$$;
revoke execute on function public.notify_birthdays() from public, anon, authenticated;
