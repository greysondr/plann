-- La instancia local de Supabase instala pgcrypto (y su función hmac()) en
-- el esquema "extensions", no en "public". handle_order_paid() fijaba
-- search_path = public a secas, así que nunca podía encontrar hmac().

create or replace function public.handle_order_paid()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  i integer;
  new_ticket_id uuid;
  is_first_purchase boolean;
  points_earned integer;
begin
  if new.status <> 'paid' or (tg_op = 'UPDATE' and old.status = 'paid') then
    return new;
  end if;

  update public.ticket_types
  set
    reserved = greatest(0, reserved - new.quantity),
    sold = sold + new.quantity
  where id = new.ticket_type_id;

  for i in 1..new.quantity loop
    new_ticket_id := gen_random_uuid();
    insert into public.tickets (id, order_id, event_id, ticket_type_id, user_id, code, qr_signature, status)
    values (
      new_ticket_id,
      new.id,
      new.event_id,
      new.ticket_type_id,
      new.user_id,
      public.generate_ticket_code(),
      encode(
        hmac(
          convert_to(new_ticket_id::text || ':' || new.event_id::text, 'UTF8'),
          convert_to('plann-dev-secret', 'UTF8'),
          'sha256'::text
        ),
        'hex'
      ),
      'valid'
    );
  end loop;

  select not exists (
    select 1 from public.orders
    where user_id = new.user_id and status = 'paid' and id <> new.id
  ) into is_first_purchase;

  points_earned := round(new.subtotal_cents / 100.0);
  insert into public.loyalty_entries (user_id, points, reason, order_id)
  values (new.user_id, points_earned, 'Compra', new.id);

  if is_first_purchase then
    insert into public.loyalty_entries (user_id, points, reason, order_id)
    values (new.user_id, 50, 'Primera compra', new.id);
  end if;

  return new;
end;
$$;
