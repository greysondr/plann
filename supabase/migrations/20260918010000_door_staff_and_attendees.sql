-- Personal de puerta (solo validan entradas) y lista real de asistentes.

create table if not exists public.organizer_staff (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  unique (organizer_id, user_id)
);
alter table public.organizer_staff enable row level security;
create index if not exists idx_organizer_staff_user on public.organizer_staff (user_id);

-- Sin policies de escritura: solo add_door_staff / remove_door_staff.
create policy "organizer_staff_select" on public.organizer_staff
  for select using (
    user_id = auth.uid() or public.is_organizer_owner(organizer_id) or public.is_admin()
  );

create or replace function public.is_door_staff(target_organizer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizer_staff
    where organizer_id = target_organizer_id and user_id = auth.uid()
  );
$$;

create or replace function public.add_door_staff(p_email text)
returns public.organizer_staff
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizers%rowtype;
  v_user public.users%rowtype;
  v_row public.organizer_staff%rowtype;
begin
  select * into v_org from public.organizers
   where owner_user_id = auth.uid() and verification_status = 'verificado';
  if not found then
    raise exception 'organizer_not_verified';
  end if;

  select * into v_user from public.users where lower(email) = lower(trim(p_email));
  if not found then
    raise exception 'user_not_found';
  end if;
  if v_user.id = auth.uid() then
    raise exception 'cannot_add_self';
  end if;

  insert into public.organizer_staff (organizer_id, user_id, email, full_name)
  values (v_org.id, v_user.id, v_user.email, v_user.full_name)
  on conflict (organizer_id, user_id) do update set email = excluded.email
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.remove_door_staff(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.organizer_staff s
   where s.id = p_staff_id and public.is_organizer_owner(s.organizer_id);
end;
$$;

-- El check-in ahora lo pueden hacer el dueño, el personal de puerta y admin.
create or replace function public.checkin_ticket(p_code text, p_event_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
  v_ticket public.tickets%rowtype;
  v_organizer_id uuid;
begin
  v_normalized := upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));

  select * into v_ticket
  from public.tickets
  where regexp_replace(upper(code), '[^A-Z0-9]', '', 'g') = v_normalized
  limit 1;

  if not found or (p_event_id is not null and v_ticket.event_id <> p_event_id) then
    return jsonb_build_object('status', 'invalid');
  end if;

  select organizer_id into v_organizer_id from public.events where id = v_ticket.event_id;
  if not (public.is_admin() or public.is_organizer_owner(v_organizer_id) or public.is_door_staff(v_organizer_id)) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_ticket.status = 'used' then
    return jsonb_build_object(
      'status', 'used',
      'ticket_id', v_ticket.id,
      'attendee_name', v_ticket.attendee_name,
      'checked_in_at', v_ticket.checked_in_at
    );
  end if;

  if v_ticket.status <> 'valid' then
    return jsonb_build_object('status', 'invalid');
  end if;

  update public.tickets
  set status = 'used', checked_in_at = now(), checked_in_by = auth.uid()
  where id = v_ticket.id;

  return jsonb_build_object(
    'status', 'valid',
    'ticket_id', v_ticket.id,
    'attendee_name', v_ticket.attendee_name
  );
end;
$$;

-- Conteo para el escáner (dueño y puerta). Solo cuenta entradas vigentes.
create or replace function public.event_checkin_counts(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organizer_id uuid;
begin
  select organizer_id into v_organizer_id from public.events where id = p_event_id;
  if not (public.is_admin() or public.is_organizer_owner(v_organizer_id) or public.is_door_staff(v_organizer_id)) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'total', count(*) filter (where status in ('valid', 'used')),
      'used', count(*) filter (where status = 'used')
    )
    from public.tickets where event_id = p_event_id
  );
end;
$$;

-- Lista de asistentes: solo dueño y admin (el personal de puerta no ve datos de compradores).
create or replace function public.list_event_attendees(p_event_id uuid)
returns table (
  ticket_id uuid,
  code text,
  attendee_name text,
  ticket_type_name text,
  status text,
  checked_in_at timestamptz,
  total_usd_cents integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_organizer_id uuid;
begin
  select organizer_id into v_organizer_id from public.events where id = p_event_id;
  if not (public.is_admin() or public.is_organizer_owner(v_organizer_id)) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select t.id, t.code,
           coalesce(nullif(t.attendee_name, ''), u.full_name, u.email, 'Asistente'),
           tt.name, t.status, t.checked_in_at, o.total_usd_cents
    from public.tickets t
    join public.orders o on o.id = t.order_id
    join public.ticket_types tt on tt.id = t.ticket_type_id
    left join public.users u on u.id = t.user_id
    where t.event_id = p_event_id
    order by t.created_at desc;
end;
$$;

grant execute on function public.add_door_staff(text) to authenticated;
grant execute on function public.remove_door_staff(uuid) to authenticated;
grant execute on function public.event_checkin_counts(uuid) to authenticated;
grant execute on function public.list_event_attendees(uuid) to authenticated;

alter publication supabase_realtime add table public.organizer_staff;
