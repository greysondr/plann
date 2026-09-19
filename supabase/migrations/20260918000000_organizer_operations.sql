-- Operaciones del organizador: retiros, cancelar/pausar eventos, cierre de
-- huecos de seguridad y datos para la aprobación desde el admin.

-- ============================================================================
-- Columnas nuevas
-- ============================================================================

alter table public.organizers
  add column if not exists payout_method text check (payout_method in ('pago_movil', 'transfer', 'zelle')),
  add column if not exists payout_account text,
  add column if not exists rejection_reason text;

alter table public.events
  add column if not exists sales_paused boolean not null default false,
  add column if not exists cancelled_reason text,
  add column if not exists cancelled_at timestamptz;

-- 'refund_pending': el evento se canceló y hay que devolver el dinero al
-- comprador. Sale del saldo del organizador de inmediato (organizer_balances
-- solo suma órdenes 'paid'); pasa a 'refunded' cuando finanzas confirma la devolución.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'pending_payment', 'in_verification', 'paid', 'expired', 'cancelled',
  'refund_pending', 'refunded', 'partially_refunded'
));

-- ============================================================================
-- Guardas: lo que un organizador NO puede cambiar por su cuenta
-- (current_user = 'authenticated' cuando viene directo de la app; las
-- funciones security definer y la service role corren con otro rol).
-- ============================================================================

create or replace function public.guard_organizer_write()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.verification_status <> 'pendiente'
       or new.plan <> 'basico'
       or new.is_plann_own
       or new.commission_rate <> 0.12 then
      raise exception 'organizer_fields_protected';
    end if;
    return new;
  end if;

  if new.owner_user_id <> old.owner_user_id
     or new.plan <> old.plan
     or new.commission_rate <> old.commission_rate
     or new.is_plann_own <> old.is_plann_own then
    raise exception 'organizer_fields_protected';
  end if;

  -- Solo puede reintentar tras un rechazo; aprobarse o reactivarse no.
  if new.verification_status <> old.verification_status then
    if not (old.verification_status = 'rechazado' and new.verification_status = 'pendiente') then
      raise exception 'organizer_status_protected';
    end if;
    new.rejection_reason := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_organizer_write on public.organizers;
create trigger trg_guard_organizer_write
  before insert or update on public.organizers
  for each row execute function public.guard_organizer_write();

create or replace function public.guard_event_write()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Solo un organizador verificado publica; el resto queda en borrador.
    if new.organizer_id is null
       or not exists (
         select 1 from public.organizers
         where id = new.organizer_id and verification_status = 'verificado'
       ) then
      raise exception 'organizer_not_verified';
    end if;
    if new.status = 'cancelled' or new.source <> 'organizer' then
      raise exception 'event_fields_protected';
    end if;
    return new;
  end if;

  if old.status in ('cancelled', 'finished') then
    raise exception 'event_closed';
  end if;
  if new.organizer_id is distinct from old.organizer_id
     or new.source <> old.source
     or new.claimed_by is distinct from old.claimed_by then
    raise exception 'event_fields_protected';
  end if;
  -- Cancelar solo por cancel_event(): reembolsa y libera cupos.
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    raise exception 'use_cancel_event';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_event_write on public.events;
create trigger trg_guard_event_write
  before insert or update on public.events
  for each row execute function public.guard_event_write();

-- El organizador puede cambiar precio y cupo, pero no fabricar ni borrar
-- ventas: sold y reserved solo los mueven create_order y el trigger de pagos.
create or replace function public.guard_ticket_type_write()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.sold <> 0 or new.reserved <> 0 then
      raise exception 'ticket_counters_protected';
    end if;
    return new;
  end if;

  if new.sold <> old.sold or new.reserved <> old.reserved or new.event_id <> old.event_id then
    raise exception 'ticket_counters_protected';
  end if;
  if new.quantity < old.sold + old.reserved then
    raise exception 'quantity_below_sold';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_ticket_type_write on public.ticket_types;
create trigger trg_guard_ticket_type_write
  before insert or update on public.ticket_types
  for each row execute function public.guard_ticket_type_write();

-- Quien compró entradas de un evento cancelado debe poder seguir viéndolo
-- (para leer el aviso de reembolso).
-- security definer para no crear un ciclo de RLS: la policy de orders consulta events.
create or replace function public.user_has_order_for_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders where event_id = target_event_id and user_id = auth.uid()
  );
$$;

drop policy if exists "events_public_read_published" on public.events;
create policy "events_public_read_published" on public.events
  for select using (
    status in ('published', 'sold_out', 'live', 'finished')
    or public.is_organizer_owner(organizer_id)
    or public.is_admin()
    or (status = 'cancelled' and public.user_has_order_for_event(id))
  );

-- ============================================================================
-- create_order: no vende si el organizador pausó las ventas
-- ============================================================================

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
  if v_event.sales_paused then
    raise exception 'sales_paused';
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

-- ============================================================================
-- cancel_event: cancela, libera cupos y deja los pagos por reembolsar
-- ============================================================================

create or replace function public.cancel_event(p_event_id uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_refunds integer;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found';
  end if;
  if not (public.is_organizer_owner(v_event.organizer_id) or public.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_event.status in ('cancelled', 'finished') then
    raise exception 'event_closed';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason_required';
  end if;

  update public.events
     set status = 'cancelled', cancelled_reason = trim(p_reason), cancelled_at = now(), updated_at = now()
   where id = p_event_id;

  -- Compras sin confirmar: se cierran, no hay dinero que devolver.
  update public.orders
     set status = 'cancelled', updated_at = now()
   where event_id = p_event_id and status in ('pending_payment', 'in_verification');

  -- Compras pagadas: quedan por reembolsar y sus tickets dejan de servir.
  with refunded as (
    update public.orders
       set status = 'refund_pending', updated_at = now()
     where event_id = p_event_id and status = 'paid'
    returning id
  )
  select count(*) into v_refunds from refunded;

  update public.tickets set status = 'void'
   where event_id = p_event_id and status in ('valid');

  update public.ticket_types set reserved = 0 where event_id = p_event_id;

  return v_refunds;
end;
$$;

grant execute on function public.cancel_event(uuid, text) to authenticated;

-- ============================================================================
-- request_withdrawal: único camino para pedir un retiro (validado contra saldo)
-- ============================================================================

drop policy if exists "withdrawals_owner_insert" on public.withdrawals;

create or replace function public.request_withdrawal(
  p_amount_cents integer,
  p_method text,
  p_account text
)
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizers%rowtype;
  v_balance bigint;
  v_row public.withdrawals%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if p_method not in ('pago_movil', 'transfer', 'zelle') then
    raise exception 'invalid_method';
  end if;
  if length(trim(coalesce(p_account, ''))) < 6 then
    raise exception 'account_required';
  end if;

  select * into v_org from public.organizers where owner_user_id = auth.uid() for update;
  if not found or v_org.verification_status <> 'verificado' then
    raise exception 'organizer_not_verified';
  end if;

  if p_amount_cents < 500 then
    raise exception 'below_minimum';
  end if;

  select balance_available_cents into v_balance
    from public.organizer_balances where organizer_id = v_org.id;
  if p_amount_cents > coalesce(v_balance, 0) then
    raise exception 'insufficient_balance';
  end if;

  update public.organizers
     set payout_method = p_method, payout_account = trim(p_account), updated_at = now()
   where id = v_org.id;

  insert into public.withdrawals (organizer_id, amount_cents, method, reference)
  values (v_org.id, p_amount_cents, p_method, trim(p_account))
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.request_withdrawal(integer, text, text) to authenticated;

alter publication supabase_realtime add table public.withdrawals;
