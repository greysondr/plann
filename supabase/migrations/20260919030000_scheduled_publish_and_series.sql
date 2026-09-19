-- Publicación programada y eventos recurrentes.

alter table public.events add column if not exists publish_at timestamptz;

-- Los borradores con fecha de publicación pasan a 'published' solos (y se avisa al organizador).
create or replace function public.publish_scheduled_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    update public.events e
       set status = 'published', publish_at = null, updated_at = now()
      from public.organizers o
     where e.status = 'draft'
       and e.publish_at is not null
       and e.publish_at <= now()
       and e.starts_at > now()
       and o.id = e.organizer_id
       and o.verification_status = 'verificado'
    returning e.id, e.title, o.owner_user_id
  loop
    perform public.notify(r.owner_user_id, 'event_published', 'Tu evento ya está publicado',
      r.title || ' ya se puede comprar en Plann.',
      jsonb_build_object('route', '/organizador/analiticas/' || r.id, 'event_id', r.id), 'published:' || r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

do $$
begin
  perform cron.schedule('publish-scheduled-events', '* * * * *', 'select public.publish_scheduled_events()');
exception when others then
  raise notice 'pg_cron no disponible: programa publish_scheduled_events() por otro medio (%).', sqlerrm;
end $$;

-- repeat_event: crea N copias del evento cada p_interval_days días, como borrador o publicadas.
-- Copia las entradas (sin ventas) y corre sus ventanas de venta el mismo intervalo.
create or replace function public.repeat_event(p_event_id uuid, p_count integer, p_interval_days integer, p_publish boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src public.events%rowtype;
  v_new uuid;
  v_shift interval;
  i integer;
begin
  select * into v_src from public.events where id = p_event_id;
  if not found then
    raise exception 'event_not_found';
  end if;
  if not public.is_organizer_owner(v_src.organizer_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_count < 1 or p_count > 12 then
    raise exception 'invalid_count';
  end if;
  if p_interval_days < 1 or p_interval_days > 366 then
    raise exception 'invalid_interval';
  end if;
  if p_publish and not exists (select 1 from public.organizers where id = v_src.organizer_id and verification_status = 'verificado') then
    raise exception 'organizer_not_verified';
  end if;

  for i in 1..p_count loop
    v_shift := (i * p_interval_days) * interval '1 day';
    insert into public.events (
      organizer_id, title, slug, kind, category_id, description, images, city_id, venue_name, venue_address,
      venue_lat, venue_lng, starts_at, ends_at, status, refund_policy, min_age, source
    ) values (
      v_src.organizer_id, v_src.title, regexp_replace(lower(v_src.slug), '-[a-z0-9]{6,}$', '') || '-' || substr(md5(random()::text), 1, 7),
      v_src.kind, v_src.category_id, v_src.description, v_src.images, v_src.city_id, v_src.venue_name, v_src.venue_address,
      v_src.venue_lat, v_src.venue_lng, v_src.starts_at + v_shift, v_src.ends_at + v_shift,
      case when p_publish then 'published' else 'draft' end, v_src.refund_policy, v_src.min_age, 'organizer'
    )
    returning id into v_new;

    insert into public.ticket_types (event_id, name, description, price_cents, quantity, min_per_order, max_per_order, sales_start, sales_end)
    select v_new, name, description, price_cents, quantity, min_per_order, max_per_order,
           case when sales_start is null then null else sales_start + v_shift end,
           case when sales_end is null then null else sales_end + v_shift end
      from public.ticket_types where event_id = p_event_id;
  end loop;
  return p_count;
end;
$$;
grant execute on function public.repeat_event(uuid, integer, integer, boolean) to authenticated;
