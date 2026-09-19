CREATE OR REPLACE FUNCTION public.issue_comp_tickets(p_ticket_type_id uuid, p_email text, p_quantity integer, p_note text DEFAULT NULL::text)
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
  v_email text := lower(trim(p_email));
  v_owner uuid;
begin
  if v_email !~ '^\S+@\S+\.\S+$' then
    raise exception 'email_invalid';
  end if;
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

  -- Sin cuenta todavía: la cortesía se emite a nombre de quien invita y queda
  -- como regalo pendiente; le llega sola cuando la persona se registre con ese correo.
  select * into v_guest from public.users where lower(email) = v_email;
  if not found then
    v_owner := auth.uid();
    v_guest.id := v_owner;
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

  if v_owner is not null then
    update public.tickets set status = 'transferred' where order_id = v_order.id;
    insert into public.ticket_gifts (ticket_id, from_user, to_email, message)
    select id, v_owner, v_email, nullif(trim(coalesce(p_note, '')), '') from public.tickets where order_id = v_order.id;
  end if;
  return v_order;
end;
$function$;

revoke execute on function public.issue_comp_tickets(uuid, text, integer, text) from public, anon;
grant execute on function public.issue_comp_tickets(uuid, text, integer, text) to authenticated;

-- Una sola notificación por evento y remitente (una cortesía puede traer varias entradas);
-- si viene de una cortesía, el aviso nombra al organizador.
create or replace function public.claim_pending_gifts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  v_event uuid;
  v_title text;
  v_from text;
  v_comp boolean;
  v_org text;
begin
  for g in select * from public.ticket_gifts where status = 'pending' and lower(to_email) = lower(new.email) for update loop
    perform public._transfer_ticket(g.ticket_id, new.id);
    update public.ticket_gifts set status = 'claimed', to_user = new.id, claimed_at = now() where id = g.id;
    select e.id, e.title, o.is_comp, org.name
      into v_event, v_title, v_comp, v_org
      from public.tickets t
      join public.events e on e.id = t.event_id
      join public.orders o on o.id = t.order_id
      join public.organizers org on org.id = e.organizer_id
     where t.id = g.ticket_id;
    select coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Alguien') into v_from from public.users where id = g.from_user;
    perform public.notify(
      new.id, 'gift',
      case when v_comp then v_org || ' te invitó a un evento' else v_from || ' te regaló una entrada' end,
      v_title || case when g.message is not null then ' · «' || g.message || '»' else '' end,
      jsonb_build_object('route', '/tickets', 'event_id', v_event),
      'gift:' || v_event || ':' || g.from_user);
    perform public.notify(g.from_user, 'gift', 'Tu invitación fue recibida', g.to_email || ' ya tiene su entrada para ' || v_title || '.',
      jsonb_build_object('route', '/tickets'), 'giftdone:' || v_event || ':' || g.to_email);
  end loop;
  return new;
end;
$$;
revoke execute on function public.claim_pending_gifts() from public, anon, authenticated;
