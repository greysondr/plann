-- Historial de ventas de DEMOSTRACIÓN para probar el panel del organizador
-- (dashboard, analíticas, asistencia). Solo desarrollo local; no es parte del
-- seed. Idempotente: borra lo que generó antes (ids con prefijo d0000000-/b0000000-)
-- y lo vuelve a crear. Ejecutar como postgres:
--   docker exec -i supabase_db_plann1 psql -U postgres < supabase/demo/sales_history.sql

begin;
select setseed(0.42);

-- 1. Limpieza de una corrida anterior --------------------------------------
update public.ticket_types tt
   set sold = greatest(0, sold - coalesce((select sum(o.quantity) from public.orders o
       where o.ticket_type_id = tt.id and o.id::text like 'd0000000-%' and o.status = 'paid'), 0))
 where tt.id in ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000502');
delete from public.loyalty_entries where order_id::text like 'd0000000-%';
delete from public.tickets where order_id::text like 'd0000000-%';
delete from public.orders where id::text like 'd0000000-%';
delete from public.ticket_types where id = '00000000-0000-0000-0000-000000000503';
delete from public.events where id = '00000000-0000-0000-0000-000000000404';
delete from auth.users where id::text like 'b0000000-%';

-- 2. Compradores ficticios (sin contraseña: no pueden iniciar sesión) -------
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select ('b0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'demo' || lpad(n::text, 2, '0') || '@plann.app', now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('full_name', (array['Ana Pérez','Luis Mendoza','Carla Rojas','José Rivas','María Gómez','Pedro Colmenárez','Daniela Torres','Andrés Silva','Valentina Ríos','Carlos Peña','Sofía Álvarez','Miguel Ramos','Gabriela León','Ricardo Mora','Isabel Suárez'])[n]),
       now() - (n * interval '3 days'), now()
from generate_series(1, 15) n;

update public.users u
   set full_name = (au.raw_user_meta_data->>'full_name')
  from auth.users au
 where au.id = u.id and au.id::text like 'b0000000-%';

-- 3. Evento ya finalizado (para medir asistencia real) -----------------------
insert into public.events (id, organizer_id, title, slug, kind, category_id, description, images, city_id, venue_name, starts_at, ends_at, status, refund_policy, source)
select '00000000-0000-0000-0000-000000000404', organizer_id, 'Festival de Jazz en la Plaza', 'festival-de-jazz-plaza-demo', 'event',
       category_id, 'Una tarde de jazz en vivo con bandas de Lara.',
       array['https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200'],
       city_id, 'Plaza Bolívar', now() - interval '10 days', now() - interval '10 days' + interval '4 hours', 'finished', '24h', 'organizer'
from public.events where id = '00000000-0000-0000-0000-000000000401';

insert into public.ticket_types (id, event_id, name, price_cents, quantity, sold, reserved, max_per_order)
values ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000404', 'General', 800, 150, 0, 0, 6);

-- 4. Ventas ---------------------------------------------------------------------
create temp table demo_plan (ticket_type_id uuid, target int, start_day int, end_day int, skew numeric);
insert into demo_plan values
  ('00000000-0000-0000-0000-000000000501', 90, 40, 0, 0.55),   -- Salsa: acelera hacia hoy
  ('00000000-0000-0000-0000-000000000502', 11, 30, 0, 0.6),    -- Cubiro cupo tour
  ('00000000-0000-0000-0000-000000000503', 118, 42, 11, 0.8);  -- Jazz (ya pasó)

do $$
declare
  p record;
  tt public.ticket_types%rowtype;
  left_n int; qty int; n int := 0; day_off numeric; created timestamptz;
  status text; sub int; fee int; commission int; total int; rate numeric;
  oid uuid; buyer uuid; roll numeric;
begin
  select rate_applied into rate from public.exchange_rates order by date desc limit 1;
  for p in select * from demo_plan loop
    select * into tt from public.ticket_types where id = p.ticket_type_id;
    left_n := p.target;
    while left_n > 0 loop
      qty := least(left_n, 1 + floor(random() * 3.4)::int);
      left_n := left_n - qty;
      n := n + 1;
      -- día de la compra: sesgado hacia el final del rango de venta
      day_off := p.end_day + (p.start_day - p.end_day) * (1 - power(random(), p.skew));
      created := now() - (day_off * interval '1 day') - (random() * interval '10 hours');
      buyer := ('b0000000-0000-4000-8000-' || lpad((1 + floor(random() * 15))::text, 12, '0'))::uuid;
      oid := ('d0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
      sub := tt.price_cents * qty;
      fee := greatest(50, round(sub * 0.03));
      commission := round(sub * 0.12);
      total := sub + fee;
      insert into public.orders (id, user_id, event_id, ticket_type_id, quantity, status, subtotal_cents, service_fee_cents,
        total_usd_cents, total_bs, rate_used, currency_paid, commission_cents, organizer_net_cents, idempotency_key,
        expires_at, paid_at, created_at, updated_at)
      values (oid, buyer, tt.event_id, tt.id, qty, 'paid', sub, fee, total, round(total / 100.0 * rate), rate,
        (array['usd','bs','bs'])[1 + floor(random() * 3)::int], commission, sub - commission,
        gen_random_uuid(), created + interval '15 minutes', created + (random() * interval '90 minutes'), created, created);

      -- El trigger on_order_paid emite los tickets, mueve el cupo y acredita puntos.

      -- pedidos que no se concretaron (no ocupan cupo)
      roll := random();
      if roll < 0.22 then
        n := n + 1;
        insert into public.orders (id, user_id, event_id, ticket_type_id, quantity, status, subtotal_cents, service_fee_cents,
          total_usd_cents, commission_cents, organizer_net_cents, idempotency_key, expires_at, created_at, updated_at)
        values (('d0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, buyer, tt.event_id, tt.id, 1,
          case when roll < 0.17 then 'expired' else 'cancelled' end, tt.price_cents, greatest(50, round(tt.price_cents * 0.03)),
          tt.price_cents + greatest(50, round(tt.price_cents * 0.03)), round(tt.price_cents * 0.12), tt.price_cents - round(tt.price_cents * 0.12),
          gen_random_uuid(), created + interval '15 minutes', created, created);
      end if;
    end loop;
  end loop;
end $$;

-- Asistencia del evento que ya pasó: ~86% entró, a lo largo de la primera hora y media.
update public.tickets t
   set status = 'used', checked_in_at = e.starts_at + (random() * interval '90 minutes')
  from public.events e
 where e.id = t.event_id and e.id = '00000000-0000-0000-0000-000000000404' and t.order_id::text like 'd0000000-%' and random() < 0.86;

-- 5. Reservas de pedidos pendientes reales (el trigger las descuenta al pagar)
update public.ticket_types tt
   set reserved = coalesce((select sum(o.quantity) from public.orders o where o.ticket_type_id = tt.id and o.status in ('pending_payment', 'in_verification')), 0)
 where tt.id in ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000503');

commit;

select e.title, tt.name, tt.sold, tt.reserved, tt.quantity,
       (select count(*) from public.tickets t where t.ticket_type_id = tt.id and t.status = 'used') as used
  from public.ticket_types tt join public.events e on e.id = tt.event_id order by e.starts_at;
select status, count(*), sum(organizer_net_cents) net from public.orders group by status order by 1;
