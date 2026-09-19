# Varios tipos de entrada, personal de puerta y lista real de asistentes

Migración: `20260918010000_door_staff_and_attendees.sql`.

## Decisiones

- **Varios tipos de entrada** (general, VIP, preventa o el nombre que quiera): se
  crean al publicar y se pueden agregar, renombrar, cambiar de precio/cupo y
  eliminar (solo si no tienen ventas) desde Editar evento. La página del evento
  del comprador ahora tiene selector; antes usaba siempre `ticketTypes[0]`.
  Precio vacío o 0 = gratis por tipo. Sin ventanas de venta por fechas todavía
  (las columnas `sales_start/sales_end` existen pero no se usan).
- **Personal de puerta por organizador, no por evento**: `organizer_staff`. El
  dueño lo agrega por correo (la persona debe tener cuenta en Plann). Sin
  policies de escritura: solo `add_door_staff` / `remove_door_staff`. Puede
  validar entradas (`checkin_ticket`) y ver el conteo (`event_checkin_counts`);
  no puede listar asistentes ni ver dinero (`list_event_attendees` es solo
  dueño/admin). Nadie puede agregarse a sí mismo ni quitar personal ajeno.
- **Modo puerta** (`/puerta`): aparece en Perfil si la persona está en algún
  equipo. Lista los eventos próximos de esos organizadores y abre el escáner.

## Bug encontrado

El escáner y la lista de asistentes contaban los tickets **del usuario logueado**
(`tickets` del store), no los del evento. Para un organizador mostraban 0 o solo
sus propias compras. Ahora vienen de `event_checkin_counts` y
`list_event_attendees` (con búsqueda, "Dar entrada" manual y compartir CSV).
Además el código manual comparaba también contra el id del ticket con guiones,
que nunca coincidía; se quitó.

## Usuarios de prueba (solo Supabase local)

`grey@plann.app` (organizador verificado) y `comprador@plann.app`, contraseña
`plann1234`. `Sabor Lara Tours` es una solicitud de organizador rechazada.

## Pendiente

- Escáner sin internet (bajar la lista y sincronizar después).
- Ventanas de venta por tipo de entrada, cupones y cortesías.
- Invitar al personal de puerta por enlace si aún no tiene cuenta.
