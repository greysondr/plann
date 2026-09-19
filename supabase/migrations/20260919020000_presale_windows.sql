-- Ventana de venta por tipo de entrada (preventas): create_order rechaza compras fuera de fecha.
-- Las columnas sales_start / sales_end ya existían en ticket_types y no se usaban.

alter table public.ticket_types
  add constraint ticket_sales_window_valid check (sales_start is null or sales_end is null or sales_end > sales_start);

create or replace function public.create_order(p_ticket_type_id uuid, p_quantity integer, p_idempotency_key uuid, p_coupon_code text DEFAULT NULL::text)
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
$function$;
grant execute on function public.create_order(uuid, integer, uuid, text) to authenticated;
