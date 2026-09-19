# Crecimiento (seguidores, reseñas, páginas públicas) y un hueco de privacidad

Migración: `20260919050000_growth_and_privacy.sql`.

## Hueco de privacidad que se cerró
`organizers` era legible por cualquiera, **incluso sin sesión**, con todas sus columnas: cédula o RIF
(`legal_document`), cuenta de cobro (`payout_account`), motivo de rechazo y comisión. Un `curl` con la
anon key devolvía la cuenta bancaria de un organizador. Ahora `anon` y `authenticated` solo leen las
columnas públicas y el dueño lee su fila completa con `my_organizer()` (security definer). La app y el
panel web se movieron a esa función. Antes de desplegar conviene revisar que ninguna otra tabla tenga
policies `using (true)` con columnas sensibles.

## Seguidores
`follows`: el comprador sigue a un organizador desde la página del evento (botón «Seguir»). Al
publicarse un evento (nuevo o borrador que sale) se avisa a los seguidores. `organizer_followers()`
da el conteo (público). Un organizador no se sigue a sí mismo en la interfaz.

## Reseñas
- `submit_review()`: solo quien tiene entrada válida o usada del evento, y solo cuando el evento ya
  empezó. Una reseña por persona y evento (volver a enviar la edita). Nombre público "Nombre A.".
- `reply_review()`: solo el dueño; la respuesta es pública. Avisos en ambos sentidos.
- Vistas `organizer_ratings` / `event_ratings` alimentan las estrellas en tarjetas y perfiles.
- App: «Calificar este evento» en la página del evento y en Mis tickets > Pasados; pantalla propia del
  organizador para responder. Web: reseñas con distribución y respuesta.

## Páginas públicas y enlaces
- Web: `/e/<slug>` (evento) y `/o/<slug>` (organizador), sin sesión, con metadatos Open Graph para que
  WhatsApp/Instagram muestren título, fecha, precio y foto. 404 real si no existe o no está publicado.
- `?src=instagram|whatsapp|facebook|tiktok` se cuenta con `record_link_visit` (anon, sanitizado); el
  organizador ve de dónde llegan en el detalle del evento. También hay QR y afiche imprimible
  (`/organizador/eventos/<id>/afiche`).
- Compartir desde la app usa `EXPO_PUBLIC_WEB_URL`; en la web `NEXT_PUBLIC_SITE_URL`. **Hay que poner el
  dominio real antes de lanzar** (hoy `https://plann.app` y `http://localhost:3000` como valores por
  defecto).

## Pendiente
- El botón «Comprar» de la página pública abre `plann://evento/<id>`; falta universal link / App Link
  (requiere dominio y firma de la app) para que abra la app o la tienda.
- Seguir/dejar de seguir desde el perfil público del organizador dentro de la app (hoy solo desde un
  evento).
- Moderación de reseñas (reportar / ocultar).
