# Notificaciones (bandeja + push del servidor) y edición completa de eventos

Migración: `20260919000000_notifications.sql`. Función: `supabase/functions/send-push`.

## Notificaciones

Toda notificación es una fila en `public.notifications`, creada por **disparadores de
Postgres** (no por la app): así aparecen sin importar quién cambie el dato (la app, la
web admin, un script). La app las recibe de tres formas: bandeja (`/notificaciones`),
banner en vivo por Realtime, y push de Expo cuando la app está cerrada.

| Aviso | A quién | Cuándo |
|---|---|---|
| Nueva venta | organizador | una orden pasa a `paid` |
| Quedan pocas / agotadas | organizador | el cupo cae bajo max(3, 10%) o llega a 0 |
| Tu pago fue aprobado | comprador | la orden pasa de en revisión a `paid` |
| Tu pago fue rechazado | comprador | el pago pasa a `rejected` (con el motivo) |
| Retiro pagado / rechazado | organizador | cambia el estado del retiro |
| Ya eres organizador / no verificado / suspendido | organizador | cambia `verification_status` |
| Evento cancelado | compradores | el evento pasa a `cancelled` (resuelve el pendiente de avisar) |
| Mañana es tu evento | organizador y asistentes | tarea horaria (`pg_cron`), evento entre 20 y 28 h |

- `notify()` deduplica por `dedupe_key` (p. ej. `sale:<orden>`): reintentos o una tarea
  que corre dos veces no duplican avisos.
- El push sale por `dispatch_push()` -> `pg_net` -> Edge Function `send-push` -> API de
  Expo. Un fallo de push **nunca** rompe la compra que lo originó (bloque `exception`).
  Los tokens que Expo reporta como `DeviceNotRegistered` se borran solos.
- Con la app abierta se silencia el push remoto (ya lo muestra Realtime) para no duplicar.
- Tocar un aviso (con la app abierta, en segundo plano o cerrada) abre `data.route`.
- Se activa en cada entorno insertando en `internal_config`
  `push_function_url` y `push_function_key` (service role). Sin esas filas, no hay push
  pero la bandeja y los avisos en vivo funcionan igual.
- **Verificado de punta a punta** contra la API real de Expo (con un token falso: la
  función lo detectó y lo eliminó). Falta probar con un teléfono físico y un
  `projectId` de EAS: el simulador no recibe push.

## Tareas programadas (pg_cron)

- `expire-stale-orders` cada minuto: **nadie llamaba a `expire_stale_orders()`**, así que
  un pedido sin pagar retenía cupos para siempre. Era el punto 4 de pendientes.
- `notify-upcoming-events` cada hora.

## Edición de eventos en la app

La app ya permite lo mismo que la web: cambiar la foto (recorte 16:9 con vista previa),
categoría, ciudad, lugar, dirección y la **ubicación en un mapa** (tocar o arrastrar el
pin), además de nombre, descripción, fecha y hora. Crear un evento también pide la
ubicación. `react-native-maps` ya estaba en la app, no hizo falta recompilar.

## Pendiente

- Probar push en dispositivo real (necesita cuenta Apple Developer y `projectId` de EAS).
- Correos transaccionales (confirmación de compra, etc.): no hay proveedor de correo.
- Mensaje masivo del organizador a sus asistentes: la infraestructura ya existe
  (`notify()`); falta la pantalla y limitar la frecuencia.
- Preferencias por tipo de aviso (silenciar «cupo bajo», etc.).
