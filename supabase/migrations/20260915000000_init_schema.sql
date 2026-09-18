-- Plann — esquema inicial del MVP (PLANN-PROYECTO.md, sección 26.2, Semana 1)
-- Alcance: users, organizers, events, ticket_types, orders, payments, tickets,
-- receiving_accounts, exchange_rates, settings — con RLS desde el día uno.
-- Además: cities y categories, referenciadas por events (sección 9) y necesarias
-- para cargar los primeros eventos de prueba de Barquisimeto.
--
-- Fuera de alcance a propósito (no crear todavía): order_items, venues,
-- organizer_members, coupons, withdrawals, refunds, featured_slots,
-- subscriptions, loyalty_*, affiliate_*, suppliers_*, audit_log.
-- Ver CLAUDE.md antes de agregar cualquiera de estas.

create extension if not exists pgcrypto;

-- ============================================================================
-- Funciones de ayuda para RLS
-- ============================================================================

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in (
    'buyer', 'organizer', 'admin_super', 'admin_finance', 'admin_support'
  )),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin_super', 'admin_finance', 'admin_support')
  );
$$;

-- is_organizer_owner() se define más abajo, justo después de crear la tabla
-- organizers: es una función SQL (no plpgsql) y Postgres valida que las
-- tablas referenciadas existan al momento de crearla, no al invocarla.

-- ============================================================================
-- Catálogos: ciudades y categorías
-- ============================================================================

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cities enable row level security;
alter table public.categories enable row level security;

create policy "cities_public_read" on public.cities
  for select using (true);
create policy "categories_public_read" on public.categories
  for select using (true);

create policy "cities_admin_write" on public.cities
  for all using (public.is_admin()) with check (public.is_admin());
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- users — perfil público, 1:1 con auth.users
-- ============================================================================

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text,
  full_name text,
  document_id text,
  avatar_url text,
  city_id uuid references public.cities(id),
  birth_date date,
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.user_roles enable row level security;

create policy "users_select_own_or_admin" on public.users
  for select using (id = auth.uid() or public.is_admin());
create policy "users_update_own" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "users_admin_all" on public.users
  for all using (public.is_admin()) with check (public.is_admin());

create policy "user_roles_select_own_or_admin" on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());
create policy "user_roles_admin_write" on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- Crea el perfil público automáticamente al registrarse (sección 3.1).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);

  insert into public.user_roles (user_id, role)
  values (new.id, 'buyer')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- organizers
-- ============================================================================

create table if not exists public.organizers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  logo_url text,
  cover_url text,
  bio text,
  contact_phone text,
  city_id uuid references public.cities(id),
  verification_status text not null default 'pendiente'
    check (verification_status in ('pendiente', 'verificado', 'rechazado', 'suspendido')),
  plan text not null default 'basico' check (plan in ('basico', 'pro', 'business')),
  commission_rate numeric(5,4) not null default 0.12,
  is_plann_own boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_organizer_owner(target_organizer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizers
    where id = target_organizer_id
      and owner_user_id = auth.uid()
  );
$$;

alter table public.organizers enable row level security;

create policy "organizers_public_read" on public.organizers
  for select using (true);
create policy "organizers_owner_write" on public.organizers
  for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "organizers_admin_all" on public.organizers
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- events
-- ============================================================================

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references public.organizers(id) on delete set null,
  title text not null,
  slug text not null unique,
  kind text not null default 'event' check (kind in ('event', 'tour', 'experience', 'booking')),
  category_id uuid references public.categories(id),
  description text,
  images text[] not null default '{}',
  city_id uuid references public.cities(id),
  venue_name text,
  venue_address text,
  venue_lat double precision,
  venue_lng double precision,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'published', 'sold_out', 'live', 'finished', 'cancelled')),
  refund_policy text not null default '24h' check (refund_policy in ('none', '24h', '72h', 'always')),
  min_age integer not null default 0,
  -- Modo cartelera (sección 24): eventos informativos sin organizador registrado.
  source text not null default 'organizer' check (source in ('organizer', 'curated')),
  claimed_by uuid references public.organizers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events_public_read_published" on public.events
  for select using (
    status in ('published', 'sold_out', 'live', 'finished')
    or public.is_organizer_owner(organizer_id)
    or public.is_admin()
  );
create policy "events_owner_write" on public.events
  for all using (public.is_organizer_owner(organizer_id))
  with check (public.is_organizer_owner(organizer_id));
create policy "events_admin_all" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- ticket_types — un solo tipo por evento en el MVP (sección 26.1),
-- pero la tabla soporta varios desde ya para no migrar dos veces.
-- ============================================================================

create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null default 'General',
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  quantity integer not null check (quantity >= 0),
  sold integer not null default 0 check (sold >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  min_per_order integer not null default 1,
  max_per_order integer not null default 6, -- sección 16, decisión #34
  sales_start timestamptz,
  sales_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sold_reserved_within_quantity check (sold + reserved <= quantity)
);

alter table public.ticket_types enable row level security;

create policy "ticket_types_public_read" on public.ticket_types
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          e.status in ('published', 'sold_out', 'live', 'finished')
          or public.is_organizer_owner(e.organizer_id)
          or public.is_admin()
        )
    )
  );
create policy "ticket_types_owner_write" on public.ticket_types
  for all using (
    exists (
      select 1 from public.events e
      where e.id = event_id and public.is_organizer_owner(e.organizer_id)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and public.is_organizer_owner(e.organizer_id)
    )
  );
create policy "ticket_types_admin_all" on public.ticket_types
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- receiving_accounts y exchange_rates (sección 4)
-- ============================================================================

create table if not exists public.receiving_accounts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('pago_movil', 'transfer', 'zelle', 'binance', 'stripe')),
  label text not null,
  details jsonb not null default '{}',
  is_active boolean not null default true,
  show_in_app boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.receiving_accounts enable row level security;

create policy "receiving_accounts_public_read" on public.receiving_accounts
  for select using (show_in_app and is_active);
create policy "receiving_accounts_admin_all" on public.receiving_accounts
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  rate_bcv numeric(10,4) not null,
  margin_pct numeric(5,4) not null default 0.03, -- sección 25.2, DECIDIR por defecto
  rate_applied numeric(10,4) not null,
  source text not null default 'pydolarve',
  created_at timestamptz not null default now()
);

alter table public.exchange_rates enable row level security;

create policy "exchange_rates_public_read" on public.exchange_rates
  for select using (true);
create policy "exchange_rates_admin_all" on public.exchange_rates
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- orders — el MVP no usa order_items: un evento = un tipo de ticket (26.1)
-- ============================================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  event_id uuid not null references public.events(id),
  ticket_type_id uuid not null references public.ticket_types(id),
  quantity integer not null check (quantity between 1 and 6),
  status text not null default 'pending_payment' check (status in (
    'pending_payment', 'in_verification', 'paid', 'expired', 'cancelled',
    'refunded', 'partially_refunded'
  )),
  subtotal_cents integer not null,
  service_fee_cents integer not null,
  total_usd_cents integer not null,
  total_bs integer,
  rate_used numeric(10,4),
  currency_paid text check (currency_paid in ('usd', 'bs')),
  commission_cents integer not null,
  organizer_net_cents integer not null,
  idempotency_key uuid not null unique,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders_select_own_organizer_or_admin" on public.orders
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_id and public.is_organizer_owner(e.organizer_id)
    )
  );
create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid());
create policy "orders_update_own_or_admin" on public.orders
  for update using (user_id = auth.uid() or public.is_admin());
create policy "orders_admin_all" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- payments (sección 4.2)
-- ============================================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null check (method in ('pago_movil', 'transfer', 'zelle')),
  amount_cents integer not null,
  currency text not null check (currency in ('usd', 'bs')),
  reference text not null,
  payer_phone text,
  payer_document text,
  payer_bank text,
  receipt_url text,
  status text not null default 'submitted'
    check (status in ('submitted', 'matched', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  receiving_account_id uuid references public.receiving_accounts(id),
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments_select_own_or_admin" on public.payments
  for select using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
create policy "payments_insert_own" on public.payments
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
create policy "payments_admin_review" on public.payments
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- tickets (sección 8.2, 9)
-- ============================================================================

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_id uuid not null references public.events(id),
  ticket_type_id uuid not null references public.ticket_types(id),
  user_id uuid not null references auth.users(id),
  code text not null unique, -- PLN-XXXXXX
  qr_signature text not null,
  attendee_name text,
  attendee_document text,
  status text not null default 'valid'
    check (status in ('valid', 'used', 'refunded', 'transferred', 'void')),
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.tickets enable row level security;

create policy "tickets_select_own_organizer_or_admin" on public.tickets
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_id and public.is_organizer_owner(e.organizer_id)
    )
  );
create policy "tickets_update_organizer_or_admin" on public.tickets
  for update using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_id and public.is_organizer_owner(e.organizer_id)
    )
  );
create policy "tickets_admin_all" on public.tickets
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- settings — panel de monetización (sección 21), solo admin en el MVP
-- ============================================================================

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "settings_admin_all" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Índices
-- ============================================================================

create index if not exists idx_events_city_status on public.events (city_id, status);
create index if not exists idx_events_organizer on public.events (organizer_id);
create index if not exists idx_ticket_types_event on public.ticket_types (event_id);
create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_orders_event on public.orders (event_id);
create index if not exists idx_orders_status_expires on public.orders (status, expires_at);
create index if not exists idx_payments_order on public.payments (order_id);
create index if not exists idx_payments_status on public.payments (status);
create index if not exists idx_tickets_user on public.tickets (user_id);
create index if not exists idx_tickets_event on public.tickets (event_id);
create index if not exists idx_tickets_code on public.tickets (code);
