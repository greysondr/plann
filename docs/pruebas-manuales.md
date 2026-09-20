# Guía de pruebas manuales (entorno local)

Todas las cuentas usan la contraseña **`plann1234`**.

| Correo | Qué es | Para probar |
|---|---|---|
| `nuevo@plann.app` | Comprador sin historial | Explorar, comprar, pagar, ver tickets, lista de espera, alertas de precio |
| `ana@plann.app` | Comprador que **cumple años hoy** | Regalo de cumpleaños de Plann (10 %, tope $5) al comprar |
| `amigo@plann.app` | Comprador vacío | Recibir una entrada regalada o una cortesía |
| `comprador@plann.app` | Comprador con 1 entrada, solicitud de organizador rechazada y personal de puerta de Cultura Viva | Casos especiales y reintentar la verificación |
| `aspirante@plann.app` | Usuario que aún **no** pidió ser organizador | Flujo «Conviértete en organizador» (luego apruébalo en el admin) |
| `grey@plann.app` | **Organizador dueño**, plan Básico, verificado (Cultura Viva Barquisimeto) | Todo el panel: eventos, cupones, ofertas, cortesías, mensajes, equipo, retiros, reportes |
| `pro@plann.app` | **Organizador dueño**, plan Pro (Eventos Laguna Pro, sin eventos) | Crear eventos desde cero; saldo que se libera 3 días después de cada venta |
| `editor@plann.app` | Equipo de Cultura Viva: **Editor** | Gestiona eventos, cupones y mensajes; NO ve dinero ni equipo |
| `finanzas@plann.app` | Equipo de Cultura Viva: **Finanzas** | Solo lectura de ventas, saldo y reportes; NO edita |
| `puerta@plann.app` | Equipo de Cultura Viva: **Puerta** | Solo «Modo puerta» y escáner |
| `admin@plann.app` | **Administrador de Plann** | `/acceso-admin`: aprobar pagos, retiros, organizadores, reembolsos y soporte |
| `demo01..15@plann.app` | Compradores con historial (datos de demostración) | Solo aparecen en gráficos y listas; **no pueden iniciar sesión** |

Usa un correo nuevo cualquiera (por ejemplo `invitado@plann.app`) para probar invitaciones a personas sin cuenta y el registro.

## Dónde entrar
- **App móvil** (compradores y organizador): `cd apps/mobile && npx expo start`, luego `i` para el simulador.
- **Panel del organizador**: http://localhost:3001/organizador
- **Admin**: http://localhost:3001/acceso-admin (el puerto 3000 lo usa otro proyecto).

## Recorridos completos
1. **Comprar, de punta a punta**: `nuevo@` elige un evento → checkout → Pago Móvil → escribe una referencia → queda «Pendiente». `admin@` → *Pagos y conciliación* → **Aprobar** → a `nuevo@` le llegan las entradas y una notificación. Con «Rechazar» (y motivo) el comprador puede reintentar.
2. **Cumpleaños**: `ana@` compra una entrada de pago: aparece «Regalo de cumpleaños de Plann» (−10 %, máximo $5). El organizador cobra el precio completo.
3. **Última hora**: `grey@` → Mis eventos → *Ofertas* → 20 % desde 72 h antes; `nuevo@` lo ve en la portada y en el checkout.
4. **Lista de espera**: agota un tipo de entrada (cupo pequeño); `nuevo@` toca «Avisarme si se libera un cupo»; sube el cupo y le llega el aviso.
5. **Regalar**: `nuevo@` → Mis tickets → *Regalar esta entrada* → `amigo@` (llega al instante, con QR nuevo) o un correo sin cuenta (queda pendiente y se entrega al registrarse).
6. **Cortesías**: `grey@` → evento → Asistentes → *Invitar a alguien* con `amigo@` o un correo nuevo.
7. **Puerta**: `puerta@` → Modo puerta → escanea el QR de una entrada válida; la segunda vez dice «ya usada».
8. **Organizador nuevo**: `aspirante@` pide ser organizador → `admin@` → *Solicitudes* → aprobar → `aspirante@` ya ve el panel.
9. **Equipo**: `grey@` → Equipo → invita un correo nuevo con rol Editor/Finanzas/Puerta → regístrate con ese correo y verifica los permisos.
10. **Retiros**: `grey@` → Retiros → pedir retiro (mínimo $5) → `admin@` → *Solicitudes* → «Marcar pagado» → `grey@` recibe la notificación.
11. **Cancelación y reembolsos**: `grey@` cancela un evento con ventas → `admin@` marca los reembolsos en *Solicitudes*.
12. **Soporte**: cualquiera → Ayuda y soporte → escribe; `admin@` → *Soporte* → responde y le llega el aviso.

## Límites conocidos
- En el admin, Pagos, Solicitudes (organizadores, retiros y reembolsos) y Soporte son reales. Dashboard, Organizadores, Eventos, Usuarios, Reportes y Configuración siguen con datos de ejemplo.
- Las notificaciones push no llegan a un teléfono físico en local; sí aparecen dentro de la app.
- Los pagos no se verifican contra un banco: los confirma el admin a mano.
