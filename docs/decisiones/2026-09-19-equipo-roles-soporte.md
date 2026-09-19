# Equipo con roles, soporte y cierre de funciones internas

## Roles
- `owner`, `editor`, `finance`, `door`, resueltos en BD con `org_role()`, `can_view_org`, `can_manage_org`, `can_view_money`.
- `my_workspace()` devuelve `{role, organizer}`; al personal se le ocultan los campos sensibles (documento legal, cuenta de cobro).
- Editor: publica/edita, cupones, cortesías, mensajes. Finanzas: solo lectura de ventas, saldo, retiros, reportes. Puerta: solo validar QR.
- Límite de personas por plan: básico 1, pro 5, business 50. Las invitaciones pendientes cuentan.
- `staff_invites`: si el correo aún no tiene cuenta, la invitación se acepta sola al registrarse.
- App y web ocultan las herramientas según rol; la seguridad real está en RLS/RPC, no en la UI.

## Soporte
- Tablas de tickets y mensajes con categorías (pago, entrada, evento, retiro, cuenta, otro). Prioridad alta para organizadores de pago.
- App: `/soporte` (FAQ, nueva consulta, mis consultas, WhatsApp opcional con `EXPO_PUBLIC_SUPPORT_WHATSAPP`) y `/soporte/[id]` (hilo en tiempo real).
- Web: `/organizador/soporte` y bandeja `/admin/soporte`. La respuesta del admin genera notificación al usuario.

## Seguridad: funciones internas
Postgres da EXECUTE a PUBLIC por defecto. Funciones como `notify()`, `reverse_order_loyalty()`, `evaluate_coupon()` eran llamables por RPC: un comprador podía enviar una notificación falsa al organizador (reproducido). Migración `20260919060000_lock_internal_functions.sql` las revoca y ajusta los privilegios por defecto.

## Pendiente / límites
- Las pantallas de soporte de la app compilan (tsc) pero no se validaron visualmente en el simulador.
- Finanzas no puede solicitar retiros (solo owner).
- Puerta no está limitada por evento.
