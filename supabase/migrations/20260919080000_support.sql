-- Soporte: tickets de ayuda con conversación (PLANN-PROYECTO.md 6.x y 7.x).
-- Los crea el usuario (comprador u organizador); Plann responde desde la web admin.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organizer_id uuid references public.organizers(id) on delete set null,
  category text not null check (category in ('pago', 'entrada', 'evento', 'retiro', 'cuenta', 'otro')),
  subject text not null check (length(subject) between 4 and 120),
  status text not null default 'abierto' check (status in ('abierto', 'en_proceso', 'resuelto', 'cerrado')),
  priority text not null default 'normal' check (priority in ('normal', 'alta')),
  order_id uuid references public.orders(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists idx_support_tickets_user on public.support_tickets (user_id, last_message_at desc);
create index if not exists idx_support_tickets_status on public.support_tickets (status, priority, last_message_at desc);
alter table public.support_tickets enable row level security;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_role text not null check (author_role in ('user', 'staff')),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_support_messages_ticket on public.support_messages (ticket_id, created_at);
alter table public.support_messages enable row level security;

drop policy if exists "support_tickets_own_select" on public.support_tickets;
create policy "support_tickets_own_select" on public.support_tickets for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "support_messages_own_select" on public.support_messages;
create policy "support_messages_own_select" on public.support_messages for select using (
  exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or public.is_admin()))
);
-- Sin insert/update: solo create_support_ticket / reply_support_ticket (usuario) y la web admin (service role).

create or replace function public.create_support_ticket(
  p_category text,
  p_subject text,
  p_body text,
  p_order_id uuid default null,
  p_event_id uuid default null
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets%rowtype;
  v_org public.organizers%rowtype;
  v_priority text := 'normal';
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if length(trim(coalesce(p_subject, ''))) < 4 or length(trim(coalesce(p_body, ''))) < 10 then
    raise exception 'support_text_short';
  end if;
  if (select count(*) from public.support_tickets where user_id = auth.uid() and status in ('abierto', 'en_proceso')) >= 5 then
    raise exception 'support_too_many_open';
  end if;
  if p_order_id is not null and not exists (select 1 from public.orders where id = p_order_id and (user_id = auth.uid() or exists (
       select 1 from public.events e where e.id = orders.event_id and public.can_view_org(e.organizer_id)))) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into v_org from public.organizers where owner_user_id = auth.uid();
  if found and v_org.plan = 'business' then
    v_priority := 'alta';
  end if;

  insert into public.support_tickets (user_id, organizer_id, category, subject, priority, order_id, event_id)
  values (auth.uid(), v_org.id, p_category, trim(p_subject), v_priority, p_order_id, p_event_id)
  returning * into v_ticket;
  insert into public.support_messages (ticket_id, author_id, author_role, body) values (v_ticket.id, auth.uid(), 'user', trim(p_body));
  return v_ticket;
end;
$$;
grant execute on function public.create_support_ticket(text, text, text, uuid, uuid) to authenticated;

create or replace function public.reply_support_ticket(p_ticket_id uuid, p_body text)
returns public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets%rowtype;
  v_msg public.support_messages%rowtype;
begin
  select * into v_ticket from public.support_tickets where id = p_ticket_id and user_id = auth.uid();
  if not found then
    raise exception 'ticket_not_found';
  end if;
  if length(trim(coalesce(p_body, ''))) < 1 or length(p_body) > 2000 then
    raise exception 'support_text_short';
  end if;
  if v_ticket.status = 'cerrado' then
    raise exception 'ticket_closed';
  end if;
  insert into public.support_messages (ticket_id, author_id, author_role, body) values (p_ticket_id, auth.uid(), 'user', trim(p_body)) returning * into v_msg;
  update public.support_tickets
     set status = case when status = 'resuelto' then 'abierto' else status end, updated_at = now(), last_message_at = now()
   where id = p_ticket_id;
  return v_msg;
end;
$$;
grant execute on function public.reply_support_ticket(uuid, text) to authenticated;

-- Cuando Plann responde o cambia el estado, se avisa a la persona.
create or replace function public.notify_support_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ticket public.support_tickets%rowtype;
begin
  if new.author_role <> 'staff' then
    return new;
  end if;
  select * into v_ticket from public.support_tickets where id = new.ticket_id;
  perform public.notify(v_ticket.user_id, 'support_reply', 'Plann respondió tu consulta',
    left(new.body, 140),
    jsonb_build_object('route', case when v_ticket.organizer_id is not null then '/soporte/' || v_ticket.id else '/soporte/' || v_ticket.id end, 'ticket_id', v_ticket.id),
    'support:' || new.id);
  return new;
end;
$$;
drop trigger if exists trg_notify_support_reply on public.support_messages;
create trigger trg_notify_support_reply after insert on public.support_messages for each row execute function public.notify_support_reply();

do $$ begin alter publication supabase_realtime add table public.support_messages; exception when duplicate_object then null; end $$;
