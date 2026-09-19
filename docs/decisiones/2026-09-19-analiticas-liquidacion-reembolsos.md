# Analíticas y negocio: visitas, saldo por liberar, liquidación, reembolsos

Migración: `20260919040000_views_settlement_refunds.sql`.

## Saldo pendiente vs disponible (PLANN-PROYECTO.md 2.6) — corrige un riesgo real
Antes todo lo vendido era retirable al instante: un organizador podía vender, retirar y cancelar
el evento dejando a Plann con el reembolso. `organizer_balances` ahora separa:
- **Básico**: disponible 3 días después de que termina el evento.
- **Pro**: 3 días después de cada venta. **Business**: 24 horas.
- `balance_available_cents` ya descuenta retiros pagados y pendientes, y `request_withdrawal` lo usa,
  así que la regla se hace cumplir en el servidor. "Por liberar" = vendido − liberado.
- No implementada todavía: la **reserva de garantía** del 10 % hasta 7 días después del evento, y el
  mínimo de retiro de $20 (sigue en $5, marcado [DECIDIR] en el documento).

## Reembolsos
- `request_order_refund()`: el organizador anula UNA compra pagada (no cortesías, no si alguien ya
  entró, no en eventos cerrados). La orden pasa a `refund_pending`, se anulan sus tickets, se libera el
  cupo, sale del saldo y se avisa al comprador. Plann la marca `refunded` desde Solicitudes.
- `reverse_order_loyalty()`: los puntos ganados por una compra se revierten al reembolsarla, también
  cuando `cancel_event` la reembolsa (era un pendiente conocido).

## Visitas
`event_views` (una visita por persona y día, sin contar al organizador ni a su equipo) escrita con
`record_event_view` cuando el comprador abre un evento; se lee con `event_view_stats` (agregado por
día, solo el dueño). Da el embudo visita → compra.

## Liquidación, comparar y reportes
- Liquidación por evento (bruto a precio de lista, cupones, comisión, reembolsos, neto): app y web.
- Comparar eventos: neto, ocupación, ticket promedio, visitas, visita→compra, conversión, asistencia.
- Reportes mensuales: en la web CSV con BOM (Excel abre bien los acentos) y "guardar como PDF" por el
  diálogo de impresión; en la app se comparte el CSV. Comprobante de retiro: web imprimible, app
  compartible.
- Todo el cálculo está en `analytics.ts` (con pruebas), compartido web/app.

## Pendiente
- Planes Pro/Business: hoy `organizers.plan` es una etiqueta (la comisión la pone el admin). Falta el
  cobro de la suscripción y el cambio de plan (ver bloque de soporte).
- Reserva de garantía del 10 %.
