# Operaciones del organizador: retiros, editar/cancelar eventos y aprobación real

**Contexto.** El organizador podía crear eventos y ver su dinero, pero no
cobrarlo, no corregir un evento y nadie podía aprobarlo sin tocar la base de
datos. Migración: `20260918000000_organizer_operations.sql`.

## Decisiones

- **Retiros solo por `request_withdrawal()`.** Se eliminó la policy que dejaba
  insertar en `withdrawals` directo (un organizador podía pedir más que su
  saldo). La función bloquea la fila del organizador, exige verificado, mínimo
  $5,00 y monto <= `organizer_balances.balance_available_cents`. Guarda el
  método y la cuenta en `organizers.payout_*` para la próxima vez.
- **Cancelar evento = `cancel_event()`**, no un update. Cierra compras sin
  confirmar, pasa las pagadas a `refund_pending`, anula tickets y libera
  reservas. `refund_pending` sale del saldo del organizador al instante
  (la vista solo suma órdenes `paid`); finanzas lo pasa a `refunded`.
- **Pausar ventas** es `events.sales_paused` (el evento sigue visible pero
  `create_order` rechaza con `sales_paused`).
- **Triggers de guarda** (`guard_organizer_write`, `guard_event_write`,
  `guard_ticket_type_write`): la policy `for all` dejaba al organizador
  ponerse `verificado`, cambiar su comisión/plan, publicar sin estar
  verificado, poner `sold = 0` o cancelar sin reembolsar. Distinguen la app
  (`current_user = 'authenticated'`) de las funciones `security definer` y la
  service role, que pasan libres.
- **Rechazado puede reintentar** (`rechazado -> pendiente`); suspendido no.
  La app ya distingue `rejected` y `suspended` (antes ambos eran "none").
- **Web admin, página Solicitudes**: primera página con datos reales (service
  role solo en servidor, `apps/web/src/lib/supabase-admin.ts`). Aprobar o
  rechazar organizadores (motivo obligatorio), pagar retiros, marcar
  reembolsos. Cada acción escribe en `audit_log`.

## Bug encontrado

La policy nueva de `events` (comprador ve eventos cancelados donde compró)
consultaba `orders`, cuya policy consulta `events`: recursión infinita de RLS
que rompía la lectura de eventos para todos. Se resolvió con la función
`security definer` `user_has_order_for_event()`. Lo detectó el test con rol
`authenticated`, no la app.

## Pendiente

- La web admin no tiene login: `SUPABASE_SERVICE_ROLE_KEY` da acceso total.
  Hace falta auth real de admin (+ `is_admin()` en las acciones) antes de
  desplegar. El resto de páginas del admin sigue en datos simulados.
- Si un organizador ya retiró dinero y luego cancela, su saldo queda
  negativo; falta definir cómo se cobra (compensar contra próximas ventas).
- Al cancelar no se avisa a los compradores (sin push del servidor); solo lo
  ven en Mis tickets. Los puntos de lealtad de compras reembolsadas no se
  revierten.
- Sin varios tipos de entrada al crear, personal de puerta, cupones ni
  estadísticas por día.
