# Cupones, cortesías y mensajes a los asistentes

Migración: `20260919010000_coupons_comps_announcements.sql`.

## Cupones

- Tablas `coupons` y `coupon_redemptions`. Porcentaje (1-100) o monto fijo (centavos);
  para un evento o todos los del organizador; usos máximos; un uso por persona; vencimiento.
- `create_order(..., p_coupon_code)` aplica el descuento en el servidor. `preview_coupon()`
  lo calcula para mostrarlo en el checkout antes de reservar (la app nunca decide el precio).
- **El organizador absorbe el descuento**: el fee de servicio (3%, mínimo $0,50) y la
  comisión de Plann se calculan sobre el subtotal ya rebajado. Ej.: 1 entrada de $10 con
  $5 de descuento -> subtotal $5, fee $0,50, total $5,50, comisión $0,60, neto $4,40.
- Un cupón que deja el total en $0 crea la orden ya pagada (como una entrada gratis).
- Los usos cuentan solo pedidos vivos: uno expirado o cancelado libera el uso. El cupón
  se bloquea con `for update` al evaluarlo, así dos compras simultáneas no pasan el tope.
- La comisión que cobra Plann baja con el cupón: es una decisión de producto que conviene
  confirmar (alternativa: comisión sobre el precio de lista).

## Cortesías (invitados)

`issue_comp_tickets()`: el organizador verificado regala entradas a alguien que **ya tiene
cuenta**. Orden `is_comp` en $0: emite tickets y ocupa cupo, pero **no** da puntos ni bono
de primera compra, **no** genera aviso de "nueva venta" (al invitado se le avisa que lo
invitaron) y **no** entra en las analíticas de ventas, conversión ni compradores
(`isPaid` excluye `is_comp`). Sí cuenta en asistencia.

## Mensajes a los asistentes

`send_event_announcement()`: notificación a cada persona con ticket válido o usado.
Límite: 3 mensajes por evento cada 24 h, 5 a 500 caracteres, no en eventos cerrados. Llega
como push si la app está cerrada (misma infraestructura de notificaciones).

## Bug encontrado

`create_order` de una entrada gratis sumaba `sold` dos veces (lo hacía la función y otra vez
el disparador `on_order_paid`), agotando el cupo el doble de rápido. Ya no.

## Dónde se usa

App: Más > Cupones; Asistentes > Invitar a alguien / Avisar a todos; campo de cupón en el
checkout. Web: Cupones y, en el detalle del evento, Invitar y Avisar.

## Pendiente

- Invitar por correo a quien todavía no tiene cuenta (hoy debe registrarse primero).
- Cupones con fecha de inicio/fin desde la interfaz (el esquema ya lo soporta).
- Reportes de cupones (cuánto descuento se dio) y cupones por primera compra.
