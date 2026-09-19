# Panel del organizador: web y app, con las mismas analíticas

Un organizador aprobado tiene un panel privado completo para gestionar sus
eventos, **en la web y dentro de la app**. Ambos leen el mismo Supabase con la
sesión del propio organizador (RLS + las funciones de Postgres), nunca con la
service role, así que ven exactamente lo suyo y nada más.

## Web (`apps/web`, ruta `/organizador`, separada del `/admin` de Plann)

- Login con correo y contraseña de Supabase (`@supabase/ssr`, cookies).
  `src/proxy.ts` (en Next 16 "middleware" se llama proxy) manda al login a quien
  no tenga sesión; el layout del panel decide qué ve según el estado:
  sin solicitud (formulario para pedir verificación), pendiente, rechazado
  (motivo + reenviar), suspendido, o verificado (panel completo).
- Secciones: Dashboard (KPIs con comparación contra el período anterior, ventas
  por día, ingresos por evento/tipo de entrada, día de la semana, próximos
  eventos, últimos pedidos), Eventos (crear con foto y vista previa 16:9,
  editar, duplicar, pausar, cancelar, entradas múltiples), detalle de evento
  (analíticas, asistentes con check-in manual y CSV), Ventas (filtros, CSV),
  Finanzas (saldo, retiros, resumen mensual, comisión), Equipo de puerta y
  Configuración (perfil, logo, cuenta de cobro).
- Toda mutación es una Server Action que usa el cliente con la sesión del
  usuario; las reglas (verificado, saldo, cupos, cancelación) siguen viviendo en
  Postgres, igual que en la app.
- La hora de los eventos se interpreta y muestra en hora de Venezuela (UTC-4).

## App (`apps/mobile`, modo organizador)

Dashboard con los mismos KPIs y gráficos (dibujados con `react-native-svg`, que
ya estaba enlazado: no hizo falta recompilar), y pantallas de Mis eventos,
Ventas y pedidos, Analíticas por evento, Retiros, Equipo de puerta y Mi negocio.
Las cifras de app y web coinciden porque comparten la lógica.

## Analíticas compartidas

`apps/web/src/lib/org/analytics.ts` es la fuente de verdad (funciones puras con
pruebas). `scripts/sync-org-analytics.sh` la copia a
`apps/mobile/src/core/orgAnalytics.ts` (Metro no puede importar fuera de
`apps/mobile`). Correr el script después de tocar el original; no editar la copia.

## Notas

- Los días se cuentan en hora de Venezuela: una venta a las 9 pm no debe caer al
  día siguiente. La asistencia por hora agrupa por hora absoluta para que una
  fiesta que cruza la medianoche no estire el eje.
- `supabase/demo/sales_history.sql` genera ~40 días de ventas ficticias
  (compradores demoXX@plann.app sin contraseña) y un evento finalizado con 86%
  de asistencia. Solo desarrollo local; usa el trigger real de órdenes pagadas.
- Variables de la web en `apps/web/.env.local` (ver `.env.example`).

## Pendiente

- El login de admin de Plann (`/admin`) sigue sin autenticación real.
- Sin reseñas, sin notificaciones push al organizador en cada venta.
- Las analíticas se calculan en el cliente/servidor sobre todas las órdenes; con
  decenas de miles de pedidos conviene moverlas a funciones SQL agregadas.
