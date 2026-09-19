# Retención: lista de espera, alertas, última hora, cumpleaños, comunitarios y regalos

Migración: `20260920000000_retention_features.sql`.

## Lista de espera y alertas de precio
- `event_alerts (user, event, kind: waitlist|price)`. El comprador las activa desde el evento: «Avisarme si se libera un cupo» (solo si todo está agotado) o «Avisarme si baja el precio o hay oferta».
- Trigger sobre `ticket_types`: cuando un tipo pasa de 0 a >0 disponibles avisa a la lista de espera (y la vacía: es de un solo uso); cuando baja `price_cents` avisa a quienes vigilan el precio.

## Oferta de última hora
- `ticket_types.last_minute_pct` (5–90) y `last_minute_hours` (1–72). Se activa cuando faltan esas horas para el evento y hasta que termine.
- Cron cada 10 min (`notify-last-minute`) avisa una sola vez a quienes vigilan el precio y a los seguidores del organizador.
- La rebaja la absorbe el organizador (igual que un cupón: fee y comisión van sobre lo rebajado).

## Cumpleaños
- El comprador guarda su fecha en Perfil > Mi cumpleaños (solo él la ve). El organizador elige `organizers.birthday_pct` (0/10/15/20/30).
- Ventana: 3 días antes y después, en hora de Venezuela. Cron diario a las 8 a. m. avisa el día del cumpleaños si hay eventos con descuento.
- Se decidió que lo pague el organizador (opt-in), no Plann, para no tocar la liquidación.

## Reglas de descuento
`create_order` aplica el **mayor** entre cupón, última hora y cumpleaños; no se suman. Si gana la oferta automática el cupón no se consume. `orders.discount_kind` guarda cuál se usó. `quote_auto_offer` deja que la app muestre el mismo precio que cobrará el servidor.

## Gratis y comunitarios
`events.is_community` (lo marca el organizador, app y web). La portada tiene la sección «Gratis y comunitarios» (gratis por precio o marcados comunitarios) y «Ofertas de última hora».

## Regalar entradas
- `ticket_gifts` + RPC `gift_ticket`, `cancel_gift`. Si el correo ya tiene cuenta, la entrada pasa de inmediato y el **código se regenera** (el QR viejo deja de servir; el regalador no puede quedarse con una copia). Si no tiene cuenta, la entrada queda en `transferred` (no se puede usar) hasta que se registre; el trigger `claim_pending_gifts` la entrega. El regalador puede cancelar mientras esté pendiente.
- No se puede regalar una entrada usada, anulada, de evento terminado/cancelado, ni a uno mismo.

## Pendiente
- Push no probado en dispositivo físico; las pantallas nuevas de la app compilan y sus RPC se probaron por SQL, pero no se recorrieron en el simulador.
- Un reembolso de la orden original anula también una entrada ya regalada.
