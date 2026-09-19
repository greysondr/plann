-- Postgres da EXECUTE a PUBLIC por defecto en cada función nueva. Las funciones security definer
-- internas (notify, reverse_order_loyalty, evaluate_coupon, tareas programadas...) eran ejecutables
-- por cualquier usuario vía /rest/v1/rpc: un comprador podía enviar una notificación falsa a cualquiera.

-- 1) Solo las corren los disparadores y pg_cron (dueño postgres), nunca la API.
revoke execute on function public.notify(uuid, text, text, text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.reverse_order_loyalty(uuid) from public, anon, authenticated;
revoke execute on function public.evaluate_coupon(text, uuid, integer, uuid) from public, anon, authenticated;
revoke execute on function public.publish_scheduled_events() from public, anon, authenticated;
revoke execute on function public.notify_upcoming_events() from public, anon, authenticated;
revoke execute on function public.expire_stale_orders() from public, anon, authenticated;

-- 2) Funciones que deben exigir sesión: fuera de anon.
revoke execute on function public.add_door_staff(text) from public, anon;
revoke execute on function public.remove_door_staff(uuid) from public, anon;
revoke execute on function public.admin_review_payment(uuid, text, text) from public, anon;
revoke execute on function public.cancel_event(uuid, text) from public, anon;
revoke execute on function public.checkin_ticket(text, uuid) from public, anon;
revoke execute on function public.create_order(uuid, integer, uuid, text) from public, anon;
revoke execute on function public.event_checkin_counts(uuid) from public, anon;
revoke execute on function public.event_link_stats(uuid) from public, anon;
revoke execute on function public.event_view_stats(uuid[], integer) from public, anon;
revoke execute on function public.issue_comp_tickets(uuid, text, integer, text) from public, anon;
revoke execute on function public.list_event_attendees(uuid) from public, anon;
revoke execute on function public.my_organizer() from public, anon;
revoke execute on function public.preview_coupon(uuid, integer, text) from public, anon;
revoke execute on function public.record_event_view(uuid) from public, anon;
revoke execute on function public.repeat_event(uuid, integer, integer, boolean) from public, anon;
revoke execute on function public.reply_review(uuid, text) from public, anon;
revoke execute on function public.request_order_refund(uuid, text) from public, anon;
revoke execute on function public.request_withdrawal(integer, text, text) from public, anon;
revoke execute on function public.send_event_announcement(uuid, text) from public, anon;
revoke execute on function public.submit_payment(uuid, text, text, uuid, text, text, text, text) from public, anon;
revoke execute on function public.submit_review(uuid, integer, text) from public, anon;

-- 3) Que el resto de funciones futuras nazcan cerradas: hay que dar EXECUTE a propósito.
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public grant execute on functions to postgres, service_role;

-- 4) Los disparadores ya no pueden asumir que notify() es invocable por el rol de la sesión:
--    corren con el dueño de la función (security definer), así que siguen funcionando.
-- Tickets: el organizador ya no puede editar el estado de un ticket a mano (por ejemplo,
-- revalidar uno anulado por un reembolso). El check-in va solo por checkin_ticket().
drop policy if exists "tickets_update_organizer_or_admin" on public.tickets;
create policy "tickets_update_admin" on public.tickets for update using (public.is_admin()) with check (public.is_admin());
