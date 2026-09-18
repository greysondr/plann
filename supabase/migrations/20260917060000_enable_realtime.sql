-- Sin esto, todo el código de suscripciones en tiempo real de la app
-- (pantalla "verificando tu pago", disponibilidad de tickets, verificación de
-- organizador) nunca dispara: Realtime solo transmite cambios de las tablas
-- que están explícitamente en la publicación "supabase_realtime". Estaba
-- vacía.

alter publication supabase_realtime add table
  public.orders,
  public.payments,
  public.tickets,
  public.ticket_types,
  public.organizers,
  public.loyalty_entries,
  public.favorites,
  public.event_reminders,
  public.events;
