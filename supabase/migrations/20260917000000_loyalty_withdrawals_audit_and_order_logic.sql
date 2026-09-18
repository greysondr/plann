-- Extiende el esquema base traído de /plann con lo que ya construimos en las
-- apps de plann1 sobre datos simulados: favoritos, recordatorios, puntos
-- Plann (sección 19), retiros de organizador (sección 7.3) y auditoría
-- (sección 7.12). También agrega la lógica de negocio central que el MVP
-- (sección 26.1, 26.2 semana 2 y 29.2) exige que viva en Postgres, no solo
-- en el cliente: reserva atómica de cupo al crear una orden, y emisión de
-- tickets + acreditación de puntos cuando una orden pasa a pagada.

-- ============================================================================
-- favoritos y recordatorios de evento
-- ============================================================================

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.favorites enable row level security;
create policy "favorites_owner_all" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.event_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.event_reminders enable row level security;
create policy "event_reminders_owner_all" on public.event_reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- loyalty_entries — libro mayor de puntos Plann (sección 19.1)
-- Nunca se inserta directo desde el cliente: solo el trigger de
-- handle_order_paid() (compra) o un admin (ajuste manual, sección 19.6).
-- ============================================================================

create table if not exists public.loyalty_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null,
  reason text not null,
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.loyalty_entries enable row level security;
create index if not exists idx_loyalty_entries_user on public.loyalty_entries (user_id);

create policy "loyalty_entries_select_own_or_admin" on public.loyalty_entries
  for select using (user_id = auth.uid() or public.is_admin());
create policy "loyalty_entries_admin_write" on public.loyalty_entries
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- withdrawals — retiros de organizador (sección 7.3)
-- ============================================================================

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  method text not null,
  reference text,
  status text not null default 'pendiente' check (status in ('pendiente', 'pagado', 'rechazado')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);
alter table public.withdrawals enable row level security;
create index if not exists idx_withdrawals_organizer on public.withdrawals (organizer_id);

create policy "withdrawals_owner_or_admin_select" on public.withdrawals
  for select using (public.is_organizer_owner(organizer_id) or public.is_admin());
create policy "withdrawals_owner_insert" on public.withdrawals
  for insert with check (public.is_organizer_owner(organizer_id));
create policy "withdrawals_admin_update" on public.withdrawals
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- audit_log — registro inmutable de acciones de admin (sección 7.12)
-- Sin policy de update/delete: a propósito, es de solo lectura una vez creado.
-- ============================================================================

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_label text not null,
  action text not null,
  target text,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;

create policy "audit_log_admin_select" on public.audit_log
  for select using (public.is_admin());
create policy "audit_log_admin_insert" on public.audit_log
  for insert with check (public.is_admin());

-- ============================================================================
-- Vista de saldos de organizador: neto pagado - retiros pagados - retiros
-- pendientes (para no dejar "disponible" dinero ya solicitado). Sin columnas
-- de saldo en la tabla organizers: siempre se calcula, nunca puede desincronizarse.
-- ============================================================================

create or replace view public.organizer_balances
with (security_invoker = true) as
select
  o.id as organizer_id,
  coalesce(sum(ord.organizer_net_cents) filter (where ord.status = 'paid'), 0)::bigint as net_paid_cents,
  coalesce((
    select sum(w.amount_cents) from public.withdrawals w
    where w.organizer_id = o.id and w.status = 'pagado'
  ), 0)::bigint as withdrawn_cents,
  coalesce((
    select sum(w.amount_cents) from public.withdrawals w
    where w.organizer_id = o.id and w.status = 'pendiente'
  ), 0)::bigint as pending_withdrawal_cents,
  (
    coalesce(sum(ord.organizer_net_cents) filter (where ord.status = 'paid'), 0)
    - coalesce((select sum(w.amount_cents) from public.withdrawals w where w.organizer_id = o.id and w.status = 'pagado'), 0)
    - coalesce((select sum(w.amount_cents) from public.withdrawals w where w.organizer_id = o.id and w.status = 'pendiente'), 0)
  )::bigint as balance_available_cents
from public.organizers o
left join public.events e on e.organizer_id = o.id
left join public.orders ord on ord.event_id = e.id
group by o.id;

-- ============================================================================
-- Emisión de tickets + puntos al pagar (secciones 8.1, 9, 19.1)
-- ============================================================================

create or replace function public.generate_ticket_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sin O/0/I/1 (sección 26.3)
  out_code text := '';
  i integer;
begin
  for i in 1..6 loop
    out_code := out_code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
  end loop;
  return 'PLN-' || out_code;
end;
$$;

create or replace function public.handle_order_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
  new_ticket_id uuid;
  is_first_purchase boolean;
  points_earned integer;
begin
  if new.status <> 'paid' or (tg_op = 'UPDATE' and old.status = 'paid') then
    return new;
  end if;

  -- Confirma cupo: pasa de reservado a vendido (o solo suma si fue gratis y
  -- nunca pasó por 'pending_payment'/reserved).
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
          'sha256'
        ),
        'hex'
      ),
      'valid'
    );
  end loop;

  -- Puntos Plann: 1 punto por dólar del subtotal (sin el fee), +50 en la
  -- primera compra pagada del usuario (sección 19.1).
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
$$;

drop trigger if exists on_order_paid on public.orders;
create trigger on_order_paid
  after insert or update on public.orders
  for each row execute function public.handle_order_paid();

-- ============================================================================
-- create_order() — reserva atómica de cupo (sección 29.2: "no son adornos,
-- son el núcleo"). Bloquea la fila del ticket_type para que dos compradores
-- concurrentes no puedan agotar el mismo cupo por una condición de carrera.
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

  if v_is_free then
    v_fee := 0;
    v_commission := 0;
    v_total := 0;
  else
    v_fee := greatest(50, round(v_subtotal * 0.03));
    v_commission := round(v_subtotal * coalesce(v_organizer.commission_rate, 0.12));
    v_total := v_subtotal + v_fee;
  end if;

  insert into public.orders (
    user_id, event_id, ticket_type_id, quantity, status,
    subtotal_cents, service_fee_cents, total_usd_cents, commission_cents, organizer_net_cents,
    idempotency_key, expires_at, paid_at
  ) values (
    auth.uid(), v_event.id, v_ticket_type.id, p_quantity,
    case when v_is_free then 'paid' else 'pending_payment' end,
    v_subtotal, v_fee, v_total, v_commission, v_subtotal - v_commission,
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

grant execute on function public.create_order(uuid, integer, uuid) to authenticated;

-- ============================================================================
-- expire_stale_orders() — libera cupo reservado de órdenes vencidas.
-- Se llama desde un cron de Supabase (pg_cron) o desde la web admin al
-- cargar la cola de pagos; no depende de que el cliente siga conectado.
-- ============================================================================

create or replace function public.expire_stale_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    update public.orders
    set status = 'expired'
    where status = 'pending_payment' and expires_at < now()
    returning ticket_type_id, quantity
  loop
    update public.ticket_types
    set reserved = greatest(0, reserved - v_row.quantity)
    where id = v_row.ticket_type_id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.expire_stale_orders() to authenticated;
