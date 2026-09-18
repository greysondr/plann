-- Bucket para las fotos que suben los organizadores al publicar un evento
-- (sección 5.1 de la identidad: fotos reales, no solo el placeholder).
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- Lectura pública (las fotos se muestran a cualquiera navegando la app, con
-- o sin sesión). Solo un usuario autenticado puede subir, y solo puede
-- tocar sus propios archivos (carpeta con su organizer_id).
create policy "event_images_public_read" on storage.objects
  for select using (bucket_id = 'event-images');

create policy "event_images_authenticated_insert" on storage.objects
  for insert with check (bucket_id = 'event-images' and auth.role() = 'authenticated');

create policy "event_images_owner_update" on storage.objects
  for update using (bucket_id = 'event-images' and owner = auth.uid());

create policy "event_images_owner_delete" on storage.objects
  for delete using (bucket_id = 'event-images' and owner = auth.uid());
