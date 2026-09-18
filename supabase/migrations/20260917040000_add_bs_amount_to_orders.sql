-- create_order() no llenaba total_bs ni rate_used, y el checkout de la app
-- necesita mostrar el monto exacto en bolívares (sección 4: "monto en Bs con
-- céntimos únicos"). Se agrega usando la tasa del día más reciente.

create or replace function public.create_order(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_idempotency_key uuid
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
  v_subtotal integer;
  v_fee integer;
  v_commission integer;
  v_total integer;
  v_is_free boolean;
  v_rate numeric(10,4);
  v_total_bs integer;
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

  v_available := v_ticket_type.quantity - v_ticket_type.sold - v_ticket_type.reserved;
  if v_available < p_quantity then
    raise exception 'sold_out';
  end if;

  select * into v_organizer from public.organizers where id = v_event.organizer_id;
  v_is_free := v_ticket_type.price_cents = 0;
  v_subtotal := v_ticket_type.price_cents * p_quantity;

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
    commission_cents, organizer_net_cents,
    idempotency_key, expires_at, paid_at
  ) values (
    auth.uid(), v_event.id, v_ticket_type.id, p_quantity,
    case when v_is_free then 'paid' else 'pending_payment' end,
    v_subtotal, v_fee, v_total, v_total_bs, nullif(v_rate, 0),
    v_commission, v_subtotal - v_commission,
    p_idempotency_key,
    now() + interval '15 minutes',
    case when v_is_free then now() else null end
  )
  returning * into v_order;

  if v_is_free then
    update public.ticket_types set sold = sold + p_quantity where id = v_ticket_type.id;
  else
    update public.ticket_types set reserved = reserved + p_quantity where id = v_ticket_type.id;
  end if;

  return v_order;
end;
$$;
