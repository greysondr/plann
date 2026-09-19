-- 1) Privacidad: columnas sensibles de organizers dejan de ser públicas.
-- 2) Crecimiento: seguidores, reseñas, visitas por enlace.

-- ============================================================================
-- 1. organizers: solo columnas públicas para anon/authenticated
-- La política de filas sigue siendo "todos leen" (los eventos embeben al organizador);
-- lo que cambia es QUÉ columnas. legal_document, payout_*, rejection_reason y
-- commission_rate solo los ve el dueño, con my_organizer().
-- ============================================================================

revoke select on public.organizers from anon, authenticated;
grant select (id, owner_user_id, name, slug, logo_url, cover_url, bio, contact_phone, city_id, verification_status, plan, is_plann_own, created_at, updated_at)
  on public.organizers to anon, authenticated;

create or replace function public.my_organizer()
returns setof public.organizers
language sql
stable
security definer
set search_path = public
as $$
  select * from public.organizers where owner_user_id = auth.uid();
$$;
grant execute on function public.my_organizer() to authenticated;

-- ============================================================================
-- 2. Seguidores
-- ============================================================================

create table if not exists public.follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, organizer_id)
);
create index if not exists idx_follows_organizer on public.follows (organizer_id);
alter table public.follows enable row level security;
drop policy if exists "follows_own_select" on public.follows;
create policy "follows_own_select" on public.follows for select using (user_id = auth.uid());
drop policy if exists "follows_own_insert" on public.follows;
create policy "follows_own_insert" on public.follows for insert with check (user_id = auth.uid());
drop policy if exists "follows_own_delete" on public.follows;
create policy "follows_own_delete" on public.follows for delete using (user_id = auth.uid());

create or replace function public.organizer_followers(p_organizer_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.follows where organizer_id = p_organizer_id;
$$;
grant execute on function public.organizer_followers(uuid) to anon, authenticated;

-- Al publicarse un evento, se avisa a los seguidores del organizador.
create or replace function public.notify_followers_new_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_name text;
  r record;
begin
  if new.organizer_id is null or new.source <> 'organizer' or new.starts_at <= now() then
    return new;
  end if;
  select name into v_org_name from public.organizers where id = new.organizer_id;
  for r in select user_id from public.follows where organizer_id = new.organizer_id loop
    perform public.notify(r.user_id, 'followed_organizer_event', v_org_name,
      'Publicó un evento nuevo: ' || new.title,
      jsonb_build_object('route', '/evento/' || new.id, 'event_id', new.id), 'newev:' || new.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_followers_new_event on public.events;
drop trigger if exists trg_notify_followers_new_event_upd on public.events;
create trigger trg_notify_followers_new_event after insert on public.events
  for each row when (new.status = 'published')
  execute function public.notify_followers_new_event();
create trigger trg_notify_followers_new_event_upd after update of status on public.events
  for each row when (new.status = 'published' and old.status is distinct from 'published')
  execute function public.notify_followers_new_event();

-- ============================================================================
-- 3. Reseñas
-- ============================================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) <= 500),
  author_name text not null,
  reply text check (reply is null or length(reply) <= 500),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists idx_reviews_organizer on public.reviews (organizer_id, created_at desc);
create index if not exists idx_reviews_event on public.reviews (event_id);
alter table public.reviews enable row level security;
drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews for select using (true);
drop policy if exists "reviews_own_delete" on public.reviews;
create policy "reviews_own_delete" on public.reviews for delete using (user_id = auth.uid());
-- Sin insert/update: solo submit_review y reply_review.

-- Solo reseña quien tiene entrada de ese evento y el evento ya empezó.
create or replace function public.submit_review(p_event_id uuid, p_rating integer, p_comment text default null)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_name text;
  v_row public.reviews%rowtype;
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if p_rating < 1 or p_rating > 5 then
    raise exception 'invalid_rating';
  end if;
  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.organizer_id is null then
    raise exception 'event_not_found';
  end if;
  if v_event.starts_at > now() then
    raise exception 'event_not_started';
  end if;
  if not exists (select 1 from public.tickets where event_id = p_event_id and user_id = auth.uid() and status in ('valid', 'used')) then
    raise exception 'no_ticket';
  end if;

  select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), split_part(email, '@', 1)) ||
         case when position(' ' in trim(coalesce(full_name, ''))) > 0 then ' ' || upper(left(split_part(trim(full_name), ' ', 2), 1)) || '.' else '' end
    into v_name from public.users where id = auth.uid();

  insert into public.reviews (event_id, organizer_id, user_id, rating, comment, author_name)
  values (p_event_id, v_event.organizer_id, auth.uid(), p_rating, nullif(trim(coalesce(p_comment, '')), ''), coalesce(v_name, 'Asistente'))
  on conflict (event_id, user_id) do update
    set rating = excluded.rating, comment = excluded.comment, created_at = now()
  returning * into v_row;

  select owner_user_id into v_owner from public.organizers where id = v_event.organizer_id;
  perform public.notify(v_owner, 'new_review', 'Nueva reseña',
    v_row.author_name || ' calificó ' || v_event.title || ' con ' || v_row.rating || ' de 5.',
    jsonb_build_object('route', '/organizador/resenas', 'event_id', v_event.id), 'review:' || v_row.id);
  return v_row;
end;
$$;
grant execute on function public.submit_review(uuid, integer, text) to authenticated;

create or replace function public.reply_review(p_review_id uuid, p_reply text)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.reviews%rowtype;
  v_title text;
begin
  select * into v_row from public.reviews where id = p_review_id;
  if not found then
    raise exception 'review_not_found';
  end if;
  if not public.is_organizer_owner(v_row.organizer_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reply, ''))) < 2 or length(trim(p_reply)) > 500 then
    raise exception 'message_length';
  end if;
  update public.reviews set reply = trim(p_reply), replied_at = now() where id = p_review_id returning * into v_row;
  select title into v_title from public.events where id = v_row.event_id;
  perform public.notify(v_row.user_id, 'review_reply', 'Respondieron tu reseña',
    'El organizador respondió tu reseña de ' || v_title || '.',
    jsonb_build_object('route', '/evento/' || v_row.event_id, 'event_id', v_row.event_id), 'reply:' || v_row.id || ':' || extract(epoch from v_row.replied_at)::bigint);
  return v_row;
end;
$$;
grant execute on function public.reply_review(uuid, text) to authenticated;

create or replace view public.organizer_ratings as
  select organizer_id, round(avg(rating)::numeric, 2) as rating_avg, count(*)::integer as rating_count
    from public.reviews group by organizer_id;
grant select on public.organizer_ratings to anon, authenticated;

create or replace view public.event_ratings as
  select event_id, round(avg(rating)::numeric, 2) as rating_avg, count(*)::integer as rating_count
    from public.reviews group by event_id;
grant select on public.event_ratings to anon, authenticated;

-- ============================================================================
-- 4. Visitas por enlace (?src=instagram): de dónde llega la gente a la página pública
-- ============================================================================

create table if not exists public.link_visits (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  src text not null default 'directo',
  created_at timestamptz not null default now()
);
create index if not exists idx_link_visits_event on public.link_visits (event_id, created_at);
alter table public.link_visits enable row level security;

create or replace function public.record_link_visit(p_event_id uuid, p_src text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src text := lower(left(regexp_replace(coalesce(p_src, ''), '[^a-zA-Z0-9_-]', '', 'g'), 30));
begin
  if not exists (select 1 from public.events where id = p_event_id and status in ('published', 'sold_out', 'live')) then
    return;
  end if;
  insert into public.link_visits (event_id, src) values (p_event_id, case when v_src = '' then 'directo' else v_src end);
end;
$$;
grant execute on function public.record_link_visit(uuid, text) to anon, authenticated;

create or replace function public.event_link_stats(p_event_id uuid)
returns table (src text, visits integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or public.is_organizer_owner((select organizer_id from public.events where id = p_event_id))) then
    return;
  end if;
  return query select l.src, count(*)::integer from public.link_visits l where l.event_id = p_event_id group by l.src order by 2 desc;
end;
$$;
grant execute on function public.event_link_stats(uuid) to authenticated;

do $$ begin alter publication supabase_realtime add table public.reviews; exception when duplicate_object then null; end $$;
