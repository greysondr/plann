-- Datos de prueba: Barquisimeto/Lara (PLANN-PROYECTO.md, sección 26.2, cierre de Semana 1)
-- "Al terminar la semana: abres la app en tu teléfono y ves eventos reales de
-- Barquisimeto cargados a mano." Estos son de ejemplo, no reales.

insert into public.cities (id, name, state, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'Barquisimeto', 'Lara', true),
  ('00000000-0000-0000-0000-000000000002', 'Cabudare', 'Lara', true)
on conflict (id) do nothing;

insert into public.categories (id, name, slug, sort_order) values
  ('00000000-0000-0000-0000-000000000101', 'Conciertos', 'conciertos', 1),
  ('00000000-0000-0000-0000-000000000102', 'Fiestas', 'fiestas', 2),
  ('00000000-0000-0000-0000-000000000103', 'Tours', 'tours', 3),
  ('00000000-0000-0000-0000-000000000104', 'Deportes', 'deportes', 4),
  ('00000000-0000-0000-0000-000000000105', 'Familia', 'familia', 5),
  ('00000000-0000-0000-0000-000000000106', 'Teatro', 'teatro', 6),
  ('00000000-0000-0000-0000-000000000107', 'Gastronomía', 'gastronomia', 7),
  ('00000000-0000-0000-0000-000000000108', 'Ferias', 'ferias', 8)
on conflict (id) do nothing;

insert into public.exchange_rates (date, rate_bcv, margin_pct, rate_applied, source) values
  (current_date, 42.30, 0.03, 42.30 * 1.03, 'seed-manual')
on conflict (date) do nothing;

insert into public.receiving_accounts (id, type, label, details, is_active, show_in_app) values
  (
    '00000000-0000-0000-0000-000000000201',
    'pago_movil',
    'Pago Móvil Plann',
    '{"banco": "Banco Plaza", "telefono": "0414-1234567", "cedula": "J-12345678-9"}'::jsonb,
    true,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000202',
    'zelle',
    'Zelle Plann',
    '{"correo": "pagos@plann.app", "nombre": "Plann LLC"}'::jsonb,
    true,
    true
  )
on conflict (id) do nothing;

-- Nota: este organizador de prueba necesita un auth.users real para owner_user_id.
-- Si estás corriendo `supabase start` local, crea primero un usuario de prueba
-- (Auth > Add user en el Studio local, o supabase.auth.signUp) y reemplaza el uuid de abajo.
do $$
declare
  test_owner_id uuid;
  test_organizer_id uuid := '00000000-0000-0000-0000-000000000301';
  event1_id uuid := '00000000-0000-0000-0000-000000000401';
  event2_id uuid := '00000000-0000-0000-0000-000000000402';
  event3_id uuid := '00000000-0000-0000-0000-000000000403';
begin
  select id into test_owner_id from auth.users order by created_at limit 1;

  if test_owner_id is null then
    raise notice 'No hay usuarios en auth.users todavía. Crea uno (Studio > Authentication > Add user) y vuelve a correr el seed para cargar el organizador y los eventos de prueba.';
    return;
  end if;

  insert into public.organizers (
    id, owner_user_id, name, slug, bio, contact_phone, city_id,
    verification_status, plan, commission_rate
  ) values (
    test_organizer_id, test_owner_id, 'Cultura Viva Barquisimeto', 'cultura-viva-bqto',
    'Productora local de conciertos y ferias culturales en Lara.',
    '0414-0000000', '00000000-0000-0000-0000-000000000001',
    'verificado', 'basico', 0.12
  )
  on conflict (id) do nothing;

  insert into public.events (
    id, organizer_id, title, slug, kind, category_id, description, images,
    city_id, venue_name, venue_address, venue_lat, venue_lng,
    starts_at, ends_at, status, refund_policy, min_age, source
  ) values
  (
    event1_id, test_organizer_id, 'Noche de Salsa en el Obelisco', 'noche-salsa-obelisco',
    'event', '00000000-0000-0000-0000-000000000101',
    'Una noche de salsa en vivo con orquestas locales, al pie del Obelisco de Barquisimeto.',
    array['https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=70'],
    '00000000-0000-0000-0000-000000000001',
    'Plaza El Obelisco', 'Av. Libertador, Barquisimeto', 10.0678, -69.3467,
    (current_date + interval '10 days' + interval '20 hours'),
    (current_date + interval '10 days' + interval '23 hours'),
    'published', '24h', 0, 'organizer'
  ),
  (
    event2_id, test_organizer_id, 'Tour a Cubiro: aire de montaña', 'tour-cubiro-aire-montana',
    'tour', '00000000-0000-0000-0000-000000000103',
    'Un día completo en Cubiro: caminata, comida típica y paisaje de montaña. Incluye transporte ida y vuelta desde Barquisimeto.',
    array['https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=70'],
    '00000000-0000-0000-0000-000000000001',
    'Punto de encuentro: C.C. Sambil Barquisimeto', 'Av. Libertador con Av. Rotaria', 10.0500, -69.3200,
    (current_date + interval '17 days' + interval '7 hours'),
    (current_date + interval '17 days' + interval '18 hours'),
    'published', '72h', 0, 'organizer'
  ),
  (
    event3_id, null, 'Feria de Emprendedores de Lara', 'feria-emprendedores-lara',
    'event', '00000000-0000-0000-0000-000000000108',
    'Feria informativa con emprendedores de toda la región. Entrada libre. Este evento todavía no se vende en Plann.',
    array['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=70'],
    '00000000-0000-0000-0000-000000000001',
    'Bararida', 'Parque Zoológico Bararida, Barquisimeto', 10.0270, -69.3350,
    (current_date + interval '5 days' + interval '9 hours'),
    (current_date + interval '5 days' + interval '17 hours'),
    'published', 'none', 0, 'curated'
  )
  on conflict (id) do update set images = excluded.images;

  -- IDs fijos a propósito: sin ellos, cada vez que se vuelve a correr este
  -- seed (por ejemplo al agregar las fotos) "on conflict do nothing" no
  -- encontraba ningún conflicto (el id por defecto es aleatorio) y se
  -- duplicaban filas de ticket_types en cada corrida.
  insert into public.ticket_types (id, event_id, name, price_cents, quantity, min_per_order, max_per_order) values
    ('00000000-0000-0000-0000-000000000501', event1_id, 'General', 1000, 200, 1, 6),
    ('00000000-0000-0000-0000-000000000502', event2_id, 'Cupo Tour', 3500, 20, 1, 4)
  on conflict (id) do nothing;
  -- event3 (curado) no tiene ticket_types: es informativo, no se vende en Plann (sección 24.1).
end $$;
