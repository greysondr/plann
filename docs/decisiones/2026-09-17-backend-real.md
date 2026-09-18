# Backend real: se adopta el de /plann y se conecta la app móvil

**Contexto.** El móvil y la web admin corrían sobre datos simulados en cada
app por separado. Existía una carpeta hermana `/Users/greyson/Downloads/plann`
(el usuario no sabía que existía) con un backend de Supabase completo para
este mismo proyecto: esquema, RLS, `packages/core` y `packages/db` con tests.
En vez de reconstruirlo desde cero, se trajo ese esquema a `plann1/supabase` y
`plann1/packages`, y se conectó `apps/mobile` a él. La web admin sigue en
datos simulados (`apps/web/src/lib/mock-data.ts`) — es el siguiente paso.

**Backend local.** `supabase start` corre Postgres + Auth + Storage + Realtime
en Docker. Se excluyeron `logflare`/`vector` (`-x logflare -x vector`) porque
la máquina solo tiene ~3.8 GB asignados a Docker y esos dos contenedores no
llegaban a healthy — no hacen falta para desarrollo local.

**Lógica de negocio que vive en Postgres, no en el cliente** (sección 29.2:
"no son adornos, son el núcleo"):
- `create_order()` — reserva atómica de cupo con `select ... for update`.
- `submit_payment()` — registra el pago y mueve la orden a `en_verificacion`.
- `admin_review_payment()` — aprobar/rechazar, pensado para cuando haya login
  real de admin; la web admin de por ahora escribe directo con la service
  role key, que ya salta las políticas RLS.
- `checkin_ticket()` — el escáner.
- El trigger `handle_order_paid()` emite los tickets (con código PLN-XXXXXX y
  firma HMAC) y acredita puntos Plann cuando una orden pasa a `paid`.
- Se cerró un hueco de seguridad heredado: la policy original dejaba a
  cualquier comprador poner su propia orden en `paid` a mano. Ahora solo se
  puede a través de estas funciones `security definer`.

**Tablas nuevas sobre el esquema base** (que traía solo lo del MVP estricto de
la sección 26.1): `favorites`, `event_reminders`, `loyalty_entries`,
`withdrawals`, `audit_log`, la vista `organizer_balances`, y una columna
`organizers.legal_document` para la cédula/RIF de la verificación.

## Bugs encontrados construyendo esto (no eran del backend original)

1. **`events` tiene dos FK hacia `organizers`** (`organizer_id` y
   `claimed_by`, para cuando alguien reclama un evento de la cartelera).
   PostgREST no podía resolver el embed `organizers(...)` y la consulta de
   eventos fallaba en silencio → la app no mostraba ningún evento. Se
   soluciona nombrando la relación: `organizers!events_organizer_id_fkey(...)`.

2. **El seed de `ticket_types` no tenía id fijo.** Cada vez que se volvía a
   correr `seed.sql` (por ejemplo al agregar las fotos de los eventos),
   `on conflict do nothing` no encontraba ningún conflicto — el id por
   defecto es aleatorio — y se duplicaba la fila. Se corrigió dándoles UUIDs
   fijos, igual que ya tenían `events` y `organizers`.

3. **Ninguna tabla estaba en la publicación `supabase_realtime`.** Todo el
   código de suscripciones en tiempo real de `AppStore.tsx` (pantalla
   "verificando tu pago", disponibilidad de tickets, verificación de
   organizador que se actualiza sola) estaba bien escrito pero nunca
   disparaba, porque Postgres no replicaba cambios de esas tablas. Se
   agregaron con `alter publication supabase_realtime add table ...`.

4. **El dashboard de organizador leía la fuente de datos equivocada.**
   `organizador/index.tsx` calculaba ingresos a partir de `orders` del store,
   que son *mis compras como comprador* (`eq('user_id', mi_id)`), no las
   órdenes de otros compradores en mis eventos. Se agregó `organizerOrders`
   en `AppStore.tsx`, con su propia consulta (`event_id in (mis eventos)`,
   permitida por la policy `is_organizer_owner`) y su propio canal de
   realtime. Verificado de punta a punta: un comprador distinto ("comprador
   @plann.app") le compró un ticket al organizador de prueba, y el panel de
   organizador mostró los $8,80 netos correctos — antes se habría quedado en
   $0 porque esa venta no era "mía" como comprador.

5. **`organizerStatus` nunca coincidía porque la base de datos habla español
   y el tipo de la app habla inglés.** `public.organizers.verification_status`
   guarda `'pendiente' | 'verificado' | 'rechazado' | 'suspendido'`, pero
   `OrganizerStatus` en `core/types.ts` es `'none' | 'pending' | 'verified'`
   (así estaba desde el prototipo con datos simulados). `fetchMyOrganizer`
   hacía un cast directo (`data.verification_status as OrganizerStatus`) sin
   traducir, así que el estado en memoria quedaba literalmente en
   `"verificado"` — y cualquier comparación contra `"verified"`
   (`useOrganizerGuard`, el botón de perfil) fallaba siempre, aunque la base
   de datos dijera que sí estabas verificado. Cada intento de entrar a
   `/organizador` mandaba de vuelta a la pantalla de activación. Se agregó
   `mapOrganizerStatus()` en `AppStore.tsx` para traducir el valor al cargar
   el perfil de organizador.

## Fotos y notificaciones

- **Fotos de evento**: bucket `event-images` en Storage (público de lectura,
  solo el dueño puede subir/borrar sus propios archivos). El formulario de
  publicar evento (`organizador/crear.tsx`) pide una foto horizontal de al
  menos 1600×900 (16:9) — el mismo recorte que usa la tarjeta y la portada
  del evento — y muestra una vista previa idéntica a como se va a ver.
- **Recordatorios**: notificaciones locales con `expo-notifications`, sin
  servidor de push. Al activar "recordar evento" se agenda un aviso 2 horas
  antes con `scheduleNotificationAsync`; al desactivarlo se cancela. El id de
  la notificación se guarda en AsyncStorage (`plann.reminder-notifications.v1`)
  para poder cancelarla después.

## Pendiente explícito

- La web admin sigue sin conectar al backend real.
- La expiración automática de órdenes vencidas (`expire_stale_orders()`)
  existe pero nadie la llama todavía — hace falta un cron (`pg_cron`, ya
  viene en el Postgres de Supabase) o una Edge Function programada.
- Sin reseñas, sin canje de puntos en el checkout, sin reembolsos desde la
  app: mismo alcance que ya se había identificado antes de este trabajo.
