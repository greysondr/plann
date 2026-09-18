-- Cierra un hueco de seguridad heredado del esquema base: la policy
-- "orders_update_own_or_admin" dejaba a cualquier comprador poner su propia
-- orden en 'paid' sin pagar nada (el USING permitía el update, pero no había
-- WITH CHECK que restringiera a qué estado). Se reemplaza por RPCs
-- security definer que son la única forma de mover una orden de estado,
-- igual que create_order() ya hace para crearla (sección 29.2 y 10.1:
-- "ninguna transición fuera de esta lista debe poder ocurrir en ningún lado").

drop policy if exists "orders_update_own_or_admin" on public.orders;

-- ============================================================================
-- submit_payment() — el comprador registra referencia + captura de su pago
-- (sección 8.1: pending_payment -> en_verificacion).
-- ============================================================================

create or replace function public.submit_payment(
  p_order_id uuid,
  p_method text,
  p_reference text,
  p_receiving_account_id uuid default null,
  p_payer_phone text default null,
  p_payer_document text default null,
  p_payer_bank text default null,
  p_receipt_url text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid();
  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'order_not_awaiting_payment';
  end if;
  if v_order.expires_at < now() then
    raise exception 'order_expired';
  end if;

  insert into public.payments (
    order_id, method, amount_cents, currency, reference,
    payer_phone, payer_document, payer_bank, receipt_url, receiving_account_id, status
  ) values (
    p_order_id, p_method, v_order.total_usd_cents, 'usd', p_reference,
    p_payer_phone, p_payer_document, p_payer_bank, p_receipt_url, p_receiving_account_id, 'submitted'
  )
  returning * into v_payment;

  update public.orders set status = 'in_verification', updated_at = now() where id = p_order_id;

  return v_payment;
end;
$$;

grant execute on function public.submit_payment(uuid, text, text, uuid, text, text, text, text) to authenticated;

-- ============================================================================
-- admin_review_payment() — aprobar o rechazar (sección 7.2 / 26.2 semana 3).
-- Aprobar cae en cascada sobre la orden ('paid'), que a su vez dispara
-- handle_order_paid() (tickets + puntos). Rechazar regresa la orden a
-- pending_payment para que el comprador pueda volver a intentar.
-- ============================================================================

create or replace function public.admin_review_payment(
  p_payment_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid_decision';
  end if;

  select * into v_payment from public.payments where id = p_payment_id;
  if not found then
    raise exception 'payment_not_found';
  end if;

  update public.payments
  set status = p_decision, rejection_reason = p_rejection_reason, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id
  returning * into v_payment;

  if p_decision = 'approved' then
    update public.orders set status = 'paid', paid_at = now(), updated_at = now() where id = v_payment.order_id;
  else
    update public.orders set status = 'pending_payment', updated_at = now() where id = v_payment.order_id;
  end if;

  insert into public.audit_log (actor_id, actor_label, action, target, detail)
  values (
    auth.uid(),
    coalesce((select full_name from public.users where id = auth.uid()), 'Admin'),
    case when p_decision = 'approved' then 'Aprobó pago' else 'Rechazó pago' end,
    v_payment.order_id::text,
    jsonb_build_object('payment_id', v_payment.id, 'reason', p_rejection_reason)
  );

  return v_payment;
end;
$$;

grant execute on function public.admin_review_payment(uuid, text, text) to authenticated;

-- ============================================================================
-- checkin_ticket() — escáner en la puerta (sección 26.2 semana 3, 26.3).
-- Solo el dueño del evento (organizador) o un admin puede validar.
-- ============================================================================

create or replace function public.checkin_ticket(p_code text, p_event_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
  v_ticket public.tickets%rowtype;
begin
  v_normalized := upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));

  select * into v_ticket
  from public.tickets
  where regexp_replace(upper(code), '[^A-Z0-9]', '', 'g') = v_normalized
     or upper(id::text) = v_normalized
  limit 1;

  if not found or (p_event_id is not null and v_ticket.event_id <> p_event_id) then
    return jsonb_build_object('status', 'invalid');
  end if;

  if not (public.is_admin() or public.is_organizer_owner(
    (select organizer_id from public.events where id = v_ticket.event_id)
  )) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_ticket.status = 'used' then
    return jsonb_build_object(
      'status', 'used',
      'ticket_id', v_ticket.id,
      'attendee_name', v_ticket.attendee_name,
      'checked_in_at', v_ticket.checked_in_at
    );
  end if;

  if v_ticket.status <> 'valid' then
    return jsonb_build_object('status', 'invalid');
  end if;

  update public.tickets
  set status = 'used', checked_in_at = now(), checked_in_by = auth.uid()
  where id = v_ticket.id;

  return jsonb_build_object(
    'status', 'valid',
    'ticket_id', v_ticket.id,
    'attendee_name', v_ticket.attendee_name
  );
end;
$$;

grant execute on function public.checkin_ticket(text, uuid) to authenticated;
