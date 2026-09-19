# Galería de fotos, publicación programada y eventos recurrentes

Migración: `20260919030000_scheduled_publish_and_series.sql`.

## Galería (hasta 5 fotos)
`events.images` ya era un arreglo; la app y la web solo usaban la primera. Ahora el organizador
sube hasta 5 fotos 16:9, reordena, cambia la portada y quita. La portada (primera) es la de
tarjetas y Buscar; el comprador desliza las demás en la página del evento (paginado con
indicador). En la app cada foto se recorta 16:9 al elegirla; en la web se valida tamaño y
proporción y se avisa si quedará borrosa. Las fotos ya guardadas se conservan al editar
(`existing_images`) y solo se suben las nuevas.

## Publicación programada
`events.publish_at`. Un evento con fecha de publicación queda en borrador y la tarea
`publish-scheduled-events` (pg_cron, cada minuto) lo pasa a `published` y avisa al organizador.
Solo publica si el organizador sigue verificado y el evento no ya empezó. En la app se elige
día y una de tres horas (8:00, 12:00, 18:00, hora de Venezuela); en la web, cualquier hora.

## Eventos recurrentes
`repeat_event(evento, copias, intervalo_dias, publicar)`: hasta 12 copias cada 7/14/30 días con
las mismas entradas, sin ventas, y con las ventanas de preventa corridas el mismo intervalo.
Salen como **borrador** para que se revisen (fecha, cupo) antes de publicar. Solo el dueño.
Desde la app: Eventos > Repetir; en la web, en el detalle del evento.

## Pendiente
- Reordenar fotos arrastrando (hoy es "Hacer portada").
- Mover una foto nueva a portada en la web antes de guardar (hoy se sube al final).
