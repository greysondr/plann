-- Equipo con roles (puerta, editor, finanzas), límites por plan, invitaciones a quien aún no tiene
-- cuenta, y soporte con tickets. Todo con permisos verificados en la base, no solo en la interfaz.

-- ============================================================================
-- Roles
--   owner   dueño: todo, incluido dinero, cancelar, reembolsar, equipo y perfil
--   editor  gestiona eventos, entradas, cupones, cortesías, mensajes, reseñas y ve analíticas;
--           NO ve retiros ni cuentas de cobro, NO cancela, NO reembolsa
--   finance solo lectura: ventas, analíticas, saldo, retiros y reportes
--   door    solo valida entradas (como hasta ahora)
-- ============================================================================

alter table public.organizer_staff
  add column if not exists role text not null default 'door' check (role in ('door', 'editor', 'finance'));

create or replace function public.org_role(p_org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.organizers where id = p_org and owner_user_id = auth.uid()) then 'owner'
    else (select s.role from public.organizer_staff s where s.organizer_id = p_org and s.user_id = auth.uid())
  end;
$$;
create or replace function public.can_view_org(p_org uuid) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.org_role(p_org) in ('owner', 'editor', 'finance'), false); $$;
create or replace function public.can_manage_org(p_org uuid) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.org_role(p_org) in ('owner', 'editor'), false); $$;
create or replace function public.can_view_money(p_org uuid) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.org_role(p_org) in ('owner', 'finance'), false); $$;
grant execute on function public.org_role(uuid), public.can_view_org(uuid), public.can_manage_org(uuid), public.can_view_money(uuid) to anon, authenticated;

-- ============================================================================
-- Políticas: de "solo el dueño" a "según el rol"
-- ============================================================================

drop policy if exists "events_owner_write" on public.events;
create policy "events_owner_write" on public.events for all
  using (public.can_manage_org(organizer_id)) with check (public.can_manage_org(organizer_id));

drop policy if exists "events_public_read_published" on public.events;
create policy "events_public_read_published" on public.events for select using (
  status in ('published', 'sold_out', 'live', 'finished')
  or public.can_view_org(organizer_id)
  or public.is_admin()
  or (status = 'cancelled' and public.user_has_order_for_event(id))
);

drop policy if exists "ticket_types_owner_write" on public.ticket_types;
create policy "ticket_types_owner_write" on public.ticket_types for all
  using (exists (select 1 from public.events e where e.id = ticket_types.event_id and public.can_manage_org(e.organizer_id)))
  with check (exists (select 1 from public.events e where e.id = ticket_types.event_id and public.can_manage_org(e.organizer_id)));

drop policy if exists "ticket_types_public_read" on public.ticket_types;
create policy "ticket_types_public_read" on public.ticket_types for select using (
  exists (select 1 from public.events e where e.id = ticket_types.event_id
          and (e.status in ('published', 'sold_out', 'live', 'finished') or public.can_view_org(e.organizer_id) or public.is_admin()))
);

drop policy if exists "coupons_owner_all" on public.coupons;
create policy "coupons_owner_all" on public.coupons for all
  using (public.can_manage_org(organizer_id)) with check (public.can_manage_org(organizer_id));

drop policy if exists "redemptions_select" on public.coupon_redemptions;
create policy "redemptions_select" on public.coupon_redemptions for select using (
  user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.coupons c where c.id = coupon_id and public.can_view_org(c.organizer_id))
);

drop policy if exists "orders_select_own_organizer_or_admin" on public.orders;
create policy "orders_select_own_organizer_or_admin" on public.orders for select using (
  user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.events e where e.id = orders.event_id and public.can_view_org(e.organizer_id))
);

drop policy if exists "tickets_select_own_organizer_or_admin" on public.tickets;
create policy "tickets_select_own_organizer_or_admin" on public.tickets for select using (
  user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.events e where e.id = tickets.event_id and public.can_view_org(e.organizer_id))
);

drop policy if exists "withdrawals_owner_or_admin_select" on public.withdrawals;
create policy "withdrawals_owner_or_admin_select" on public.withdrawals for select using (public.can_view_money(organizer_id) or public.is_admin());

drop policy if exists "announcements_owner_select" on public.announcements;
create policy "announcements_owner_select" on public.announcements for select using (public.can_manage_org(organizer_id) or public.is_admin());

-- ============================================================================
-- Funciones: editor puede gestionar; finanzas/editor pueden ver
-- ============================================================================

create or replace function public.issue_comp_tickets(p_ticket_type_id uuid, p_email text, p_quantity integer, p_note text DEFAULT NULL::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tt public.ticket_types%rowtype;
  v_event public.events%rowtype;
  v_guest public.users%rowtype;
  v_order public.orders%rowtype;
begin
  if p_quantity < 1 or p_quantity > 6 then
    raise exception 'invalid_quantity';
  end if;

  select * into v_tt from public.ticket_types where id = p_ticket_type_id for update;
  if not found then
    raise exception 'ticket_type_not_found';
  end if;
  select * into v_event from public.events where id = v_tt.event_id;
  if not (public.can_manage_org(v_event.organizer_id) or public.is_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organizers where id = v_event.organizer_id and verification_status = 'verificado') then
    raise exception 'organizer_not_verified';
  end if;
  if v_event.status not in ('published', 'sold_out', 'live') then
    raise exception 'event_not_on_sale';
  end if;
  if v_tt.quantity - v_tt.sold - v_tt.reserved < p_quantity then
    raise exception 'sold_out';
  end if;

  select * into v_guest from public.users where lower(email) = lower(trim(p_email));
  if not found then
    raise exception 'user_not_found';
  end if;

  insert into public.orders (
    user_id, event_id, ticket_type_id, quantity, status,
    subtotal_cents, service_fee_cents, total_usd_cents, total_bs,
    commission_cents, organizer_net_cents, is_comp, comp_note,
    idempotency_key, expires_at, paid_at
  ) values (
    v_guest.id, v_event.id, v_tt.id, p_quantity, 'paid',
    0, 0, 0, 0, 0, 0, true, nullif(trim(coalesce(p_note, '')), ''),
    gen_random_uuid(), now(), now()
  )
  returning * into v_order;
  return v_order;
end;
$function$;

create or replace function public.send_event_announcement(p_event_id uuid, p_message text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event public.events%rowtype;
  v_message text := trim(coalesce(p_message, ''));
  v_ann uuid;
  v_count integer;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'event_not_found';
  end if;
  if not public.can_manage_org(v_event.organizer_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_event.status in ('cancelled', 'finished') then
    raise exception 'event_closed';
  end if;
  if length(v_message) < 5 or length(v_message) > 500 then
    raise exception 'message_length';
  end if;
  if (select count(*) from public.announcements where event_id = p_event_id and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'announcement_limit';
  end if;

  insert into public.announcements (event_id, organizer_id, message)
  values (p_event_id, v_event.organizer_id, v_message)
  returning id into v_ann;

  select count(*) into v_count from (
    select distinct user_id from public.tickets where event_id = p_event_id and status in ('valid', 'used')
  ) t;

  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  select distinct t.user_id, 'organizer_message', v_event.title, v_message,
         jsonb_build_object('route', '/tickets', 'event_id', p_event_id, 'announcement_id', v_ann),
         'ann:' || v_ann
    from public.tickets t
   where t.event_id = p_event_id and t.status in ('valid', 'used');

  update public.announcements set recipients = v_count where id = v_ann;
  return v_count;
end;
$function$;

create or replace function public.repeat_event(p_event_id uuid, p_count integer, p_interval_days integer, p_publish boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if not public.can_manage_org(v_src.organizer_id) then
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
$function$;

create or replace function public.reply_review(p_review_id uuid, p_reply text)
 RETURNS reviews
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row public.reviews%rowtype;
  v_title text;
begin
  select * into v_row from public.reviews where id = p_review_id;
  if not found then
    raise exception 'review_not_found';
  end if;
  if not public.can_manage_org(v_row.organizer_id) then
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
$function$;

create or replace function public.list_event_attendees(p_event_id uuid)
 RETURNS TABLE(ticket_id uuid, code text, attendee_name text, ticket_type_name text, status text, checked_in_at timestamp with time zone, total_usd_cents integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_organizer_id uuid;
begin
  select organizer_id into v_organizer_id from public.events where id = p_event_id;
  if not (public.is_admin() or public.can_view_org(v_organizer_id)) then
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
$function$;

create or replace function public.event_view_stats(p_event_ids uuid[], p_days integer DEFAULT 90)
 RETURNS TABLE(event_id uuid, day date, views integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
    select v.event_id, v.viewed_on, count(*)::integer
      from public.event_views v
      join public.events e on e.id = v.event_id
     where v.event_id = any(p_event_ids)
       and v.viewed_on >= ((now() at time zone 'America/Caracas')::date - p_days)
       and (public.can_view_org(e.organizer_id) or public.is_admin())
     group by v.event_id, v.viewed_on
     order by v.viewed_on;
end;
$function$;

create or replace function public.event_link_stats(p_event_id uuid)
 RETURNS TABLE(src text, visits integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not (public.is_admin() or public.can_view_org((select organizer_id from public.events where id = p_event_id))) then
    return;
  end if;
  return query select l.src, count(*)::integer from public.link_visits l where l.event_id = p_event_id group by l.src order by 2 desc;
end;
$function$;


-- ============================================================================
-- Equipo: agregar con rol y límite por plan; invitar a quien aún no tiene cuenta
--   Básico 1 persona · Pro 5 · Business hasta 50 (PLANN-PROYECTO.md 2.2)
-- ============================================================================

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  email text not null,
  role text not null default 'door' check (role in ('door', 'editor', 'finance')),
  created_at timestamptz not null default now(),
  unique (organizer_id, email)
);
alter table public.staff_invites enable row level security;
drop policy if exists "staff_invites_owner_select" on public.staff_invites;
create policy "staff_invites_owner_select" on public.staff_invites for select using (public.is_organizer_owner(organizer_id) or public.is_admin());

create or replace function public.staff_limit(p_plan text)
returns integer language sql immutable as $$
  select case p_plan when 'business' then 50 when 'pro' then 5 else 1 end;
$$;

drop function if exists public.add_door_staff(text);
create or replace function public.add_door_staff(p_email text, p_role text default 'door')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizers%rowtype;
  v_user public.users%rowtype;
  v_email text := lower(trim(p_email));
  v_used integer;
  v_exists boolean;
begin
  if p_role not in ('door', 'editor', 'finance') then
    raise exception 'invalid_role';
  end if;
  select * into v_org from public.organizers where owner_user_id = auth.uid() and verification_status = 'verificado';
  if not found then
    raise exception 'organizer_not_verified';
  end if;

  select * into v_user from public.users where lower(email) = v_email;
  v_exists := found;
  if v_exists and v_user.id = auth.uid() then
    raise exception 'cannot_add_self';
  end if;

  select (select count(*) from public.organizer_staff where organizer_id = v_org.id
            and not (v_exists and user_id = v_user.id))
       + (select count(*) from public.staff_invites where organizer_id = v_org.id and email <> v_email)
    into v_used;
  if v_used >= public.staff_limit(v_org.plan) then
    raise exception 'staff_limit_reached';
  end if;

  if v_exists then
    insert into public.organizer_staff (organizer_id, user_id, email, full_name, role)
    values (v_org.id, v_user.id, v_user.email, v_user.full_name, p_role)
    on conflict (organizer_id, user_id) do update set role = excluded.role, email = excluded.email;
    delete from public.staff_invites where organizer_id = v_org.id and email = v_email;
    return jsonb_build_object('status', 'added');
  end if;

  insert into public.staff_invites (organizer_id, email, role) values (v_org.id, v_email, p_role)
  on conflict (organizer_id, email) do update set role = excluded.role;
  return jsonb_build_object('status', 'invited');
end;
$$;
grant execute on function public.add_door_staff(text, text) to authenticated;

create or replace function public.cancel_staff_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.staff_invites i where i.id = p_invite_id and public.is_organizer_owner(i.organizer_id);
end;
$$;
grant execute on function public.cancel_staff_invite(uuid) to authenticated;

-- Cuando alguien crea su cuenta con un correo invitado, entra al equipo solo.
create or replace function public.accept_staff_invites()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.organizer_staff (organizer_id, user_id, email, full_name, role)
  select i.organizer_id, new.id, new.email, new.full_name, i.role
    from public.staff_invites i where i.email = lower(new.email)
  on conflict (organizer_id, user_id) do nothing;
  delete from public.staff_invites where email = lower(new.email);
  return new;
end;
$$;
drop trigger if exists trg_accept_staff_invites on public.users;
create trigger trg_accept_staff_invites after insert on public.users for each row execute function public.accept_staff_invites();

-- Un cambio de rol se avisa a la persona.
create or replace function public.notify_staff_added()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  select name into v_name from public.organizers where id = new.organizer_id;
  perform public.notify(new.user_id, 'staff_added', 'Te sumaron a un equipo',
    v_name || ' te agregó como ' || case new.role when 'door' then 'personal de puerta' when 'editor' then 'editor' else 'finanzas' end || '.',
    jsonb_build_object('route', case when new.role = 'door' then '/puerta' else '/organizador' end), 'staff:' || new.id || ':' || new.role);
  return new;
end;
$$;
drop trigger if exists trg_notify_staff_added on public.organizer_staff;
create trigger trg_notify_staff_added after insert or update of role on public.organizer_staff for each row execute function public.notify_staff_added();

-- ============================================================================
-- Espacio de trabajo: qué organizador y qué rol tiene quien inicia sesión.
-- El dueño ve su fila completa; el equipo la ve sin cédula, cuenta de cobro ni motivo de rechazo.
-- ============================================================================

create or replace function public.my_workspace()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  o public.organizers%rowtype;
  v_role text;
begin
  select * into o from public.organizers where owner_user_id = auth.uid();
  if found then
    return jsonb_build_object('role', 'owner', 'organizer', to_jsonb(o));
  end if;
  select s.role into v_role
    from public.organizer_staff s join public.organizers org on org.id = s.organizer_id
   where s.user_id = auth.uid() and s.role in ('editor', 'finance') and org.verification_status = 'verificado'
   order by s.created_at limit 1;
  if v_role is null then
    return null;
  end if;
  select org.* into o
    from public.organizer_staff s join public.organizers org on org.id = s.organizer_id
   where s.user_id = auth.uid() and s.role = v_role and org.verification_status = 'verificado'
   order by s.created_at limit 1;
  return jsonb_build_object('role', v_role, 'organizer', to_jsonb(o) - 'legal_document' - 'payout_method' - 'payout_account' - 'rejection_reason');
end;
$$;
grant execute on function public.my_workspace() to authenticated;
