-- Notificaciones: bandeja dentro de la app + push del servidor + tareas programadas.
-- Toda notificación es una fila en public.notifications creada por un disparador;
-- la app la recibe por Realtime (y como push si está cerrada, vía la Edge Function
-- send-push) y muestra la bandeja leyendo la misma tabla.

-- ============================================================================
-- Tablas
-- ============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);
create unique index if not exists uq_notifications_dedupe on public.notifications (user_id, dedupe_key) where dedupe_key is not null;
alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_delete_own" on public.notifications for delete using (user_id = auth.uid());
-- Sin policy de insert: solo las crean los disparadores (security definer).

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text,
  updated_at timestamptz not null default now()
);
create index if not exists idx_push_tokens_user on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
create policy "push_tokens_own" on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Configuración interna (URL de la Edge Function de push, etc.). Sin policies:
-- solo la lee el disparador (security definer) y la service role.
create table if not exists public.internal_config (
  key text primary key,
  value text not null
);
alter table public.internal_config enable row level security;

alter publication supabase_realtime add table public.notifications;

-- ============================================================================
-- notify(): único punto de entrada para crear una notificación
-- ============================================================================

create or replace function public.notify(
  p_user uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}',
  p_dedupe text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  values (p_user, p_type, p_title, p_body, p_data, p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end;
$$;

create or replace function public.fmt_usd(cents bigint)
returns text
language sql
immutable
as $$
  select '$' || replace(to_char(cents / 100.0, 'FM9999990.00'), '.', ',');
$$;

-- ============================================================================
-- Push: cada notificación nueva avisa a la Edge Function (si está configurada)
-- ============================================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_key text;
begin
  select value into v_url from public.internal_config where key = 'push_function_url';
  if v_url is null then
    return new;
  end if;
  select value into v_key from public.internal_config where key = 'push_function_key';
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || coalesce(v_key, '')),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  -- Un fallo de push nunca debe frenar la compra o el retiro que lo originó.
  return new;
end;
$$;

drop trigger if exists trg_dispatch_push on public.notifications;
create trigger trg_dispatch_push after insert on public.notifications
  for each row execute function public.dispatch_push();

-- ============================================================================
-- Disparadores de negocio
-- ============================================================================

-- Venta pagada: avisa al organizador (y al comprador si su pago estaba en revisión).
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

drop trigger if exists trg_notify_order_paid on public.orders;
create trigger trg_notify_order_paid after insert or update of status on public.orders
  for each row when (new.status = 'paid') execute function public.notify_on_order_paid();

-- Cupo bajo o agotado.
create or replace function public.notify_on_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old integer := old.quantity - old.sold - old.reserved;
  v_new integer := new.quantity - new.sold - new.reserved;
  v_threshold integer := greatest(3, ceil(new.quantity * 0.1)::integer);
  v_event public.events%rowtype;
  v_owner uuid;
begin
  if v_new > v_old or new.quantity = 0 then
    return new;
  end if;
  select * into v_event from public.events where id = new.event_id;
  if v_event.status not in ('published', 'live', 'sold_out') then
    return new;
  end if;
  select owner_user_id into v_owner from public.organizers where id = v_event.organizer_id;

  if v_new <= 0 and v_old > 0 then
    perform public.notify(v_owner, 'sold_out', 'Entradas agotadas',
      new.name || ' de ' || v_event.title || ' se agotó.',
      jsonb_build_object('route', '/organizador/analiticas/' || v_event.id, 'event_id', v_event.id),
      'stock:' || new.id || ':out');
  elsif v_new > 0 and v_new <= v_threshold and v_old > v_threshold then
    perform public.notify(v_owner, 'low_stock', 'Quedan pocas entradas',
      'Quedan ' || v_new || ' de ' || new.name || ' para ' || v_event.title || '.',
      jsonb_build_object('route', '/organizador/analiticas/' || v_event.id, 'event_id', v_event.id),
      'stock:' || new.id || ':low');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_stock on public.ticket_types;
create trigger trg_notify_stock after update of sold, reserved on public.ticket_types
  for each row execute function public.notify_on_stock();

-- Pago rechazado: avisa al comprador para que lo corrija.
create or replace function public.notify_on_payment_rejected()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_title text;
begin
  select * into v_order from public.orders where id = new.order_id;
  select title into v_title from public.events where id = v_order.event_id;
  perform public.notify(
    v_order.user_id, 'payment_rejected', 'Tu pago fue rechazado',
    coalesce(new.rejection_reason, 'Revisa la referencia e intenta de nuevo') || ' · ' || v_title,
    jsonb_build_object('route', '/tickets', 'order_id', v_order.id),
    'payrej:' || new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_payment_rejected on public.payments;
create trigger trg_notify_payment_rejected after update of status on public.payments
  for each row when (new.status = 'rejected' and old.status is distinct from 'rejected')
  execute function public.notify_on_payment_rejected();

-- Retiro pagado o rechazado.
create or replace function public.notify_on_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_user_id into v_owner from public.organizers where id = new.organizer_id;
  if new.status = 'pagado' then
    perform public.notify(v_owner, 'withdrawal_paid', 'Retiro pagado',
      'Te enviamos ' || public.fmt_usd(new.amount_cents) || ' a tu cuenta.',
      jsonb_build_object('route', '/organizador/retiros'), 'wd:' || new.id);
  elsif new.status = 'rechazado' then
    perform public.notify(v_owner, 'withdrawal_rejected', 'Retiro rechazado',
      'No pudimos procesar tu retiro de ' || public.fmt_usd(new.amount_cents) || '. El monto sigue en tu saldo.',
      jsonb_build_object('route', '/organizador/retiros'), 'wd:' || new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_withdrawal on public.withdrawals;
create trigger trg_notify_withdrawal after update of status on public.withdrawals
  for each row when (new.status in ('pagado', 'rechazado') and old.status is distinct from new.status)
  execute function public.notify_on_withdrawal();

-- Resultado de la verificación del organizador.
create or replace function public.notify_on_organizer_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status = 'verificado' then
    perform public.notify(new.owner_user_id, 'organizer_approved', 'Ya eres organizador',
      'Tu cuenta fue aprobada. Publica tu primer evento.', jsonb_build_object('route', '/organizador'));
  elsif new.verification_status = 'rechazado' then
    perform public.notify(new.owner_user_id, 'organizer_rejected', 'No pudimos verificarte',
      coalesce(new.rejection_reason, 'Revisa tus datos y vuelve a enviarlos.'), jsonb_build_object('route', '/organizador/activar'));
  elsif new.verification_status = 'suspendido' then
    perform public.notify(new.owner_user_id, 'organizer_suspended', 'Cuenta suspendida',
      coalesce(new.rejection_reason, 'Escríbenos a soporte@plann.app para revisar tu caso.'), jsonb_build_object('route', '/organizador/activar'));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_organizer_status on public.organizers;
create trigger trg_notify_organizer_status after update of verification_status on public.organizers
  for each row when (new.verification_status is distinct from old.verification_status)
  execute function public.notify_on_organizer_status();

-- Evento cancelado: avisa a todos los que tenían compras.
create or replace function public.notify_on_event_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select distinct user_id from public.orders
    where event_id = new.id and status in ('paid', 'pending_payment', 'in_verification')
  loop
    perform public.notify(r.user_id, 'event_cancelled', 'Evento cancelado',
      new.title || ' fue cancelado' || case when new.cancelled_reason is not null then ': ' || new.cancelled_reason else '' end || '. Si ya pagaste, te devolveremos el dinero.',
      jsonb_build_object('route', '/tickets', 'event_id', new.id), 'cancel:' || new.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_event_cancelled on public.events;
create trigger trg_notify_event_cancelled after update of status on public.events
  for each row when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function public.notify_on_event_cancelled();

-- ============================================================================
-- Recordatorio de víspera (organizador y compradores con entrada válida)
-- ============================================================================

create or replace function public.notify_upcoming_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  e record;
  r record;
  v_count integer := 0;
  v_owner uuid;
  v_sold integer;
  v_cap integer;
begin
  for e in
    select * from public.events
    where status in ('published', 'sold_out', 'live')
      and starts_at between now() + interval '20 hours' and now() + interval '28 hours'
  loop
    select owner_user_id into v_owner from public.organizers where id = e.organizer_id;
    select coalesce(sum(sold), 0), coalesce(sum(quantity), 0) into v_sold, v_cap from public.ticket_types where event_id = e.id;
    perform public.notify(v_owner, 'event_tomorrow', 'Mañana es tu evento',
      e.title || ' · ' || v_sold || ' de ' || v_cap || ' entradas vendidas.',
      jsonb_build_object('route', '/organizador/analiticas/' || e.id, 'event_id', e.id), 'tomorrow:' || e.id);
    v_count := v_count + 1;

    for r in select distinct user_id from public.tickets where event_id = e.id and status = 'valid' loop
      perform public.notify(r.user_id, 'event_tomorrow', 'Mañana es tu evento',
        e.title || ' — ' || coalesce(e.venue_name, 'revisa el lugar en la app') || '. Ten tu QR a la mano.',
        jsonb_build_object('route', '/tickets', 'event_id', e.id), 'tomorrow:' || e.id);
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end;
$$;

-- ============================================================================
-- Tareas programadas (pg_cron)
-- ============================================================================

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('notify-upcoming-events', '0 * * * *', 'select public.notify_upcoming_events()');
  -- Libera los cupos de pedidos sin pagar cuyo plazo venció (antes nadie la llamaba).
  perform cron.schedule('expire-stale-orders', '* * * * *', 'select public.expire_stale_orders()');
exception when others then
  raise notice 'pg_cron no disponible: programa notify_upcoming_events() y expire_stale_orders() por otro medio (%).', sqlerrm;
end $$;
