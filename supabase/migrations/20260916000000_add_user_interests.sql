-- Onboarding (PLANN-PROYECTO.md, sección 5.1): categorías elegidas al registrarse.
-- full_name, phone, birth_date y city_id ya existían en la migración inicial.

alter table public.users
  add column if not exists interests text[] not null default '{}';
