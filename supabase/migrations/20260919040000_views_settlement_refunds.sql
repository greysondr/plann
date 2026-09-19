-- Visitas a eventos, saldo pendiente/disponible por plan, reembolsos individuales y liquidación.

-- ============================================================================
-- Visitas (embudo visita -> compra)
-- ============================================================================

create table if not exists public.event_views (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_on date not null default ((now() at time zone 'America/Caracas')::date),
  created_at timestamptz not null default now(),
  unique (event_id, user_id, viewed_on)
);
create index if not exists idx_event_views_event on public.event_views (event_id, viewed_on);
alter table public.event_views enable row level security;
-- Sin policies: se escribe con record_event_view y se lee con event_view_stats.

-- Una visita por persona y día. El propio organizador y su equipo no cuentan.
create or replace function public.record_event_view(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    return;
  end if;
  select organizer_id into v_org from public.events
   where id = p_event_id and status in ('published', 'sold_out', 'live');
  if not found then
    return;
  end if;
  if v_org is not null and (public.is_organizer_owner(v_org) or public.is_door_staff(v_org)) then
    return;
  end if;
  insert into public.event_views (event_id, user_id) values (p_event_id, auth.uid())
  on conflict (event_id, user_id, viewed_on) do nothing;
end;
$$;
grant execute on function public.record_event_view(uuid) to authenticated;

create or replace function public.event_view_stats(p_event_ids uuid[], p_days integer default 90)
returns table (event_id uuid, day date, views integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
    select v.event_id, v.viewed_on, count(*)::integer
      from public.event_views v
      join public.events e on e.id = v.event_id
     where v.event_id = any(p_event_ids)
       and v.viewed_on >= ((now() at time zone 'America/Caracas')::date - p_days)
       and (public.is_organizer_owner(e.organizer_id) or public.is_admin())
     group by v.event_id, v.viewed_on
     order by v.viewed_on;
end;
$$;
grant execute on function public.event_view_stats(uuid[], integer) to authenticated;

-- ============================================================================
-- Puntos de lealtad: se revierten cuando una compra se reembolsa
-- ============================================================================

create or replace function public.reverse_order_loyalty(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_earned integer;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.is_comp then
    return;
  end if;
  if exists (select 1 from public.loyalty_entries where order_id = p_order_id and reason = 'Reembolso') then
    return;
  end if;
  select coalesce(sum(points), 0) into v_earned from public.loyalty_entries where order_id = p_order_id and reason = 'Compra';
  if v_earned > 0 then
    insert into public.loyalty_entries (user_id, points, reason, order_id)
    values (v_order.user_id, -v_earned, 'Reembolso', p_order_id);
  end if;
end;
$$;

-- cancel_event ahora también revierte los puntos de las compras reembolsadas.
create or replace function public.cancel_event(p_event_id uuid, p_reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  perform public.reverse_order_loyalty(o.id) from public.orders o where o.event_id = p_event_id and o.status = 'refund_pending';

  update public.tickets set status = 'void'
   where event_id = p_event_id and status in ('valid');

  update public.ticket_types set reserved = 0 where event_id = p_event_id;

  return v_refunds;
end;
$function$;

-- ============================================================================
-- Reembolso individual: el organizador anula UNA compra pagada.
-- Sale de su saldo, anula los tickets, libera el cupo y queda por devolver (admin).
-- ============================================================================

create or replace function public.request_order_refund(p_order_id uuid, p_reason text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_event public.events%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  select * into v_event from public.events where id = v_order.event_id;
  if not (public.is_organizer_owner(v_event.organizer_id) or public.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_order.is_comp then
    raise exception 'comp_no_refund';
  end if;
  if v_order.status <> 'paid' then
    raise exception 'order_not_refundable';
  end if;
  if v_event.status in ('cancelled', 'finished') then
    raise exception 'event_closed';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason_required';
  end if;
  if exists (select 1 from public.tickets where order_id = p_order_id and status = 'used') then
    raise exception 'tickets_used';
  end if;

  update public.orders set status = 'refund_pending', updated_at = now() where id = p_order_id returning * into v_order;
  update public.tickets set status = 'void' where order_id = p_order_id and status = 'valid';
  update public.ticket_types set sold = greatest(0, sold - v_order.quantity) where id = v_order.ticket_type_id;
  perform public.reverse_order_loyalty(p_order_id);

  perform public.notify(
    v_order.user_id, 'order_refunded', 'Anularon tu compra',
    'Tu compra de ' || v_event.title || ' fue anulada: ' || trim(p_reason) || '. Te devolveremos ' || public.fmt_usd(v_order.total_usd_cents) || '.',
    jsonb_build_object('route', '/tickets', 'order_id', p_order_id), 'refund:' || p_order_id
  );
  return v_order;
end;
$$;
grant execute on function public.request_order_refund(uuid, text) to authenticated;

-- ============================================================================
-- Saldo: pendiente de liberar vs disponible (PLANN-PROYECTO.md sección 2.6)
--   Básico:   disponible 3 días después de que termina el evento
--   Pro:      3 días después de cada venta
--   Business: 24 horas después de cada venta
-- Protege contra eventos que se cancelan después de que el organizador ya retiró.
-- ============================================================================

drop view if exists public.organizer_balances;
create view public.organizer_balances
with (security_invoker = true) as
select
  o.id as organizer_id,
  coalesce(sum(ord.organizer_net_cents) filter (where ord.status = 'paid' and not ord.is_comp), 0)::bigint as net_paid_cents,
  coalesce((select sum(w.amount_cents) from public.withdrawals w where w.organizer_id = o.id and w.status = 'pagado'), 0)::bigint as withdrawn_cents,
  coalesce((select sum(w.amount_cents) from public.withdrawals w where w.organizer_id = o.id and w.status = 'pendiente'), 0)::bigint as pending_withdrawal_cents,
  (
    coalesce(sum(ord.organizer_net_cents) filter (
      where ord.status = 'paid' and not ord.is_comp and (
        (o.plan = 'business' and ord.paid_at <= now() - interval '1 day')
        or (o.plan = 'pro' and ord.paid_at <= now() - interval '3 days')
        or (o.plan = 'basico' and coalesce(e.ends_at, e.starts_at) <= now() - interval '3 days')
      )
    ), 0)
    - coalesce((select sum(w.amount_cents) from public.withdrawals w where w.organizer_id = o.id and w.status in ('pagado', 'pendiente')), 0)
  )::bigint as balance_available_cents,
  coalesce(sum(ord.organizer_net_cents) filter (where ord.status = 'refund_pending'), 0)::bigint as refund_pending_cents
from public.organizers o
left join public.events e on e.organizer_id = o.id
left join public.orders ord on ord.event_id = e.id
group by o.id, o.plan;
grant select on public.organizer_balances to authenticated;
