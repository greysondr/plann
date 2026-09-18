# Plann — Documento maestro del proyecto

App de tickets, boletos, reservas y planes turísticos. Barquisimeto / Lara, Venezuela.
Propietario: Grey. Construcción con Claude Code.

Este archivo es la **fuente de verdad** del proyecto: qué es Plann, cómo gana dinero, qué hace cada tipo de usuario, cómo funcionan los pagos, qué se construye y en qué orden. La identidad visual vive en `PLANN-IDENTIDAD-VISUAL.md` y este documento la asume.

Los puntos marcados **[DECIDIR]** son decisiones de negocio que aún no están cerradas. Claude Code debe usar el valor por defecto que aparece al lado hasta que Grey lo cambie.

---

## 0. Índice

1. Visión y resumen
2. Modelo de negocio (cómo gana dinero Plann)
3. Usuarios y roles
4. Pagos en Venezuela: cómo se cobra "por la app"
5. App móvil — experiencia del comprador
6. Modo organizador — panel dentro de la app
7. Web admin de Plann
8. Flujos clave paso a paso
9. Modelo de datos
10. Stack técnico y arquitectura
11. Seguridad y antifraude
12. Notificaciones y comunicación
13. Roadmap por fases
14. Métricas del negocio (KPIs)
15. Legal y operativo en Venezuela
16. Decisiones pendientes
17. Estructura del repositorio y prompt inicial para Claude Code
18. Assets y referencias
19. Plann Puntos — programa de lealtad (compradores)
20. Nivel de organizador — puntos y beneficios
21. Panel de control de monetización (todo editable)
22. Ideas adicionales priorizadas
23. Programa de embajadores e influencers
24. Arranque en frío: la etapa Cartelera
25. Manejo del dinero y riesgo cambiario
26. Plan real: MVP en 4 semanas
27. Canales de venta: puntos físicos y taquilla
28. Requisitos de tiendas, privacidad y datos personales
29. Venta a alta demanda y recuperación de cuenta
30. Errores, estados vacíos, gama baja y accesibilidad

---

## 1. Visión y resumen

**Qué es.** Plann es el lugar donde la gente de Lara descubre qué hacer y compra el ticket en el mismo sitio: conciertos, fiestas, ferias, deportes, teatro, tours a Cubiro, Sanare, Yacambú, excursiones, planes de fin de semana, reservas en experiencias (catas, paseos, cabañas). El organizador publica, Plann vende, valida en puerta y liquida.

**Problema que resuelve.**
- Los eventos en Lara se venden por WhatsApp e Instagram: capturas de pago, listas en Excel, cero control en la puerta y reventa de "tickets" falsos.
- Los tours y planes turísticos no tienen un canal de reserva con pago confirmado.
- El comprador no tiene dónde ver todo lo que hay este fin de semana en un solo lugar.

**Propuesta de valor.**
- Comprador: ve todo lo que hay, paga desde la app con los métodos que ya usa (Pago móvil, Zelle, Binance, tarjeta), recibe un ticket con QR que sí es válido.
- Organizador: publica en minutos, ve ventas en tiempo real, escanea en la puerta con el teléfono, recibe su dinero sin perseguir capturas.
- Plann: cobra una comisión por cada ticket y una suscripción a los organizadores que quieren más; además vende sus propios planes con margen completo.

**Alcance inicial [DECIDIR]** — por defecto: Barquisimeto y el estado Lara. La arquitectura soporta cualquier ciudad de Venezuela desde el día uno (campo `city` y `state` en todo).

**Plataformas.** App móvil Android + iOS (React Native / Expo). Web admin de Plann (Next.js). Web pública mínima (landing + página de evento compartible para redes).

---

## 2. Modelo de negocio

Plann tiene **cinco vías de ingreso** (cuatro principales más el fee de gestión de afiliados, sección 23). Todas se administran desde la web admin y se registran en la tabla `platform_revenue`.

### 2.1 Comisión por ticket vendido (ingreso principal)

Cada ticket vendido en Plann genera dos cobros:

| Concepto | Quién lo paga | Valor por defecto [DECIDIR] |
|---|---|---|
| Comisión de plataforma | Se descuenta al organizador del precio del ticket | **10 %** del precio |
| Fee de servicio | Lo paga el comprador encima del precio | **$0,50** por ticket (mín.) o **3 %**, lo que sea mayor |

La comisión varía según el plan de suscripción del organizador (ver 2.2). El fee de servicio es fijo para todos los compradores.

**Ejemplo con un ticket de $10:**
- Comprador paga $10,50 (precio $10 + fee $0,50)
- Organizador recibe $9,00 (precio $10 − 10 %)
- Plann gana $1,50 ($1,00 comisión + $0,50 fee)

Reglas:
- Eventos gratuitos: sin comisión ni fee. Plann los permite porque traen usuarios.
- Tickets con precio en USD; el comprador puede pagar en Bs a la tasa BCV del día (ver sección 4).
- La comisión se calcula sobre el precio final después de descuentos/cupones del organizador.
- Reembolsos: se devuelve el precio; el fee de servicio no se devuelve salvo cancelación del evento por parte del organizador.

### 2.2 Suscripción mensual para organizadores

| Plan | Precio/mes [DECIDIR] | Comisión | Incluye |
|---|---|---|---|
| **Básico** | Gratis | 12 % | Publicar eventos, escáner QR, 1 usuario staff, estadísticas básicas, liquidación semanal |
| **Pro** | $19 | 8 % | Todo lo anterior + 5 staff, estadísticas avanzadas, cupones, 2 destacados/mes, exportar asistentes, liquidación cada 3 días, badge "Organizador Pro" |
| **Business** | $59 | 6 % | Todo lo anterior + staff ilimitado, varios perfiles/marcas, destacados ilimitados en su ciudad, liquidación en 24 h, soporte prioritario, acceso a API |

- Cobro mensual por los mismos métodos de pago de la app. Si no paga, baja a Básico al vencer (no se bloquea nada, solo se pierde lo del plan).
- El admin puede dar meses gratis (para captar organizadores grandes al inicio).

### 2.3 Cobro por destacar eventos (visibilidad)

El organizador paga para aparecer en lugares premium de la app:

| Ubicación | Precio [DECIDIR] |
|---|---|
| Carrusel "Destacados" del inicio | $5 / día · $25 / semana |
| Tarjeta héroe del inicio (1 sola por ciudad por día) | $15 / día |
| Primer resultado en su categoría | $10 / semana |
| Notificación push a usuarios de la ciudad interesados en la categoría | $20 por envío (máx. 1 por evento) |

- Se compra desde el panel del organizador con fecha de inicio y fin.
- Los destacados se etiquetan visualmente ("Destacado", eyebrow rosa), sin engañar al usuario.
- El admin puede poner destacados manuales sin costo (para curar el inicio).

### 2.4 Planes turísticos propios de Plann

Plann actúa como organizador de sus propios productos: tours (Cubiro, Sanare, Quíbor, Yacambú, Cerro Saroche, Terepaima), paquetes de fin de semana, experiencias con aliados locales (posadas, guías, transporte).

- Se publican con un perfil de organizador especial `Plann Experiencias` (verificado, con badge propio).
- Plann fija el precio; el margen bruto = precio − costo del proveedor (transporte, guía, entrada, comida). Meta de margen: 25–40 %.
- Los proveedores (aliados) se registran en el admin con su costo por persona y se les paga aparte (tabla `suppliers`, `supplier_payouts`).
- Estos planes pueden requerir **cupo mínimo** para confirmarse (ej. mínimo 8 personas). Si no se llega al mínimo 48 h antes, se reembolsa automáticamente y se notifica.

### 2.5 Ingresos futuros (no construir en MVP)

- Publicidad de negocios locales (restaurantes, hoteles) en la app.
- Comisión por reservas de alojamiento/transporte asociadas a un plan.
- Venta de datos agregados y anónimos de demanda a organizadores (qué categorías buscan más, qué días).

### 2.6 Liquidación al organizador (payout)

- Todo el dinero de las ventas entra a las cuentas de Plann (Bs, Zelle, Binance, Stripe).
- Cada orden pagada suma al **saldo pendiente** del organizador el neto (precio − comisión).
- El saldo pasa a **disponible** según la regla del plan: Básico → después de que el evento ocurra y pasen 3 días (protege contra eventos cancelados); Pro → 3 días después de cada venta; Business → 24 h.
- El organizador solicita retiro desde su panel eligiendo el método (Pago móvil, transferencia Bs, Zelle, Binance/USDT). Mínimo de retiro: $20 [DECIDIR].
- Admin aprueba y ejecuta el pago manualmente (MVP) o por API bancaria (fase 2), marca como pagado, se genera comprobante.
- Plann mantiene una **reserva de garantía** de 10 % del saldo hasta 7 días después del evento para cubrir reembolsos.

---

## 3. Usuarios y roles

Una sola cuenta puede tener varios roles. El rol se guarda en la tabla `user_roles` y la app muestra u oculta secciones según eso.

### 3.1 Comprador (rol por defecto)

Cualquier persona que se registra. Puede buscar, comprar, reservar, guardar favoritos, dejar reseñas, ver sus tickets, tener saldo Plann, invitar amigos.

Registro: correo + contraseña, Google, Apple (obligatorio en iOS). Teléfono venezolano opcional pero pedido en el primer checkout (para Pago móvil y contacto del organizador).

### 3.2 Organizador

Un comprador activa el "Modo organizador" desde Perfil. Para **publicar** un evento de pago debe estar **verificado** [DECIDIR — por defecto: sí, verificación obligatoria para eventos de pago; eventos gratis se publican sin verificación pero pasan moderación].

Verificación (KYC ligero): nombre legal o razón social, cédula o RIF, foto de la cédula, selfie, teléfono, redes sociales del organizador, datos de cobro. El admin aprueba en la web admin. Estados: `pendiente`, `verificado`, `rechazado`, `suspendido`.

Sub-roles dentro de un organizador (tabla `organizer_members`):
- **Dueño**: todo, incluido finanzas y retiros.
- **Editor**: crea y edita eventos, ve estadísticas, no ve finanzas ni retira.
- **Staff / puerta**: solo puede escanear tickets de los eventos que se le asignen. Se invita por link o código y usa la misma app.

### 3.3 Proveedor / aliado (fase 3)

Guías, transportistas, posadas que participan en los planes propios de Plann. No usan la app: el admin los gestiona. Más adelante pueden tener un acceso web mínimo para ver sus servicios asignados y pagos.

### 3.3a Punto de venta físico

Comercio aliado que vende tickets en efectivo contra un saldo prepago. Ver sección 27.

### 3.3b Embajador / influencer

Cualquier usuario puede solicitar el rol de embajador para promover eventos con su código y cobrar comisión por venta. Ver sección 23.

### 3.4 Equipo Plann (web admin)

| Rol | Puede |
|---|---|
| **Superadmin** (Grey) | Todo: configuración, comisiones, borrar, pagos, roles del equipo |
| **Finanzas** | Verificar pagos, aprobar retiros, reembolsos, conciliación, reportes |
| **Soporte** | Ver usuarios y órdenes, responder tickets de ayuda, reenviar tickets, editar datos básicos |
| **Moderador** | Aprobar/rechazar eventos y organizadores, gestionar reseñas y reportes |
| **Operaciones (planes propios)** | Catálogo de planes de Plann, proveedores, cupos, listas de pasajeros |

---

## 4. Pagos en Venezuela: cómo se cobra "por la app"

Objetivo: el comprador **nunca sale de la app** y el ticket se emite **sin que un humano tenga que hacer nada** en la mayoría de los casos. Como en Venezuela no hay una pasarela única, Plann combina varios métodos con confirmación automática y un respaldo manual.

### 4.1 Métodos de pago (orden en el checkout)

| Método | Moneda | Confirmación | Fase |
|---|---|---|---|
| **Pago móvil** | Bs (tasa BCV del día) | Automática por conciliación bancaria; respaldo manual | MVP (manual+semi) / F2 (automática) |
| **Transferencia bancaria** | Bs | Igual que Pago móvil | MVP |
| **Zelle** | USD | Semi-automática (referencia + monto) + respaldo manual | MVP |
| **Binance Pay / USDT** | USD | Automática por API de Binance Pay (merchant) | F2 |
| **Tarjeta internacional** | USD | Automática por Stripe (requiere empresa fuera de Venezuela, ver 15) | F2 |
| **Saldo Plann** (wallet) | USD | Instantánea | F3 |
| **Efectivo en puerta** | Bs/USD | El organizador confirma al recibirlo; ticket queda "reservado" | Opcional, lo activa el organizador |

### 4.2 Cómo funciona el pago con Pago móvil / transferencia / Zelle (MVP)

1. El comprador elige el método. La app muestra los datos de Plann (banco, teléfono, cédula/RIF; para Zelle el correo) con botón **Copiar** en cada dato y el **monto exacto**. Para Pago móvil el monto en Bs lleva **céntimos únicos** (ej. Bs 1.234,17) que identifican la orden: esto permite conciliar automáticamente.
2. Se crea la orden en estado `pendiente_pago` y se **bloquean los tickets 15 minutos**. Cuenta regresiva visible.
3. El comprador paga desde su banco y vuelve a la app. Ingresa: **número de referencia** (últimos 6–8 dígitos), banco emisor, teléfono/cédula del pagador y opcionalmente sube la captura. Un solo formulario, lo más corto posible.
4. La orden pasa a `en_verificacion`.
5. **Conciliación automática** (motor `payment-matcher`, Edge Function con cron cada 60 s):
   - Fuente A (fase 2): API bancaria del banco receptor (Banco Plaza, Mercantil, Banesco y Bancamiga ofrecen consultas de Pago móvil recibidos a comercios afiliados; requiere cuenta jurídica y afiliación).
   - Fuente B (MVP): lectura de las notificaciones de pago recibido que el banco envía por correo/SMS a la cuenta de Plann (parser que extrae monto, referencia, origen).
   - Si encuentra un pago con **mismo monto exacto y misma referencia** (o mismo monto único con céntimos + misma ventana de tiempo) → orden `pagada` → tickets emitidos → push "Tu ticket está listo".
6. Si en 10 minutos no hay match automático, la orden entra en la **cola de verificación manual** de la web admin, con la captura y los datos. El admin confirma o rechaza en un clic. Meta: 95 % de pagos confirmados sin intervención humana en fase 2; en MVP, meta de menos de 15 minutos de espera.
7. Si se rechaza (referencia falsa, monto distinto): el comprador recibe notificación con el motivo y puede corregir la referencia una vez; a la segunda, la orden se cancela y se liberan los tickets.

### 4.3 Tasa de cambio

- Tasa **BCV oficial** del día, actualizada automáticamente (API pública tipo `pydolarve` o scraping del BCV como respaldo). Se guarda en `exchange_rates` con fecha y fuente.
- La app siempre muestra `$X,XX` y debajo `≈ Bs Y · tasa BCV de hoy`.
- La tasa se congela en el momento de crear la orden y se guarda en la orden (`rate_used`). Válida durante los 15 minutos de bloqueo.
- El admin puede fijar un **margen sobre la tasa** (por defecto 0 %) [DECIDIR] para cubrir el riesgo cambiario entre el cobro en Bs y la liquidación en USD.

### 4.4 Reembolsos

- Política por defecto: cancelación gratis hasta 24 h antes del evento (el organizador puede elegir: sin reembolso / hasta 24 h / hasta 72 h / siempre).
- El comprador pide el reembolso desde el ticket. Si la política lo permite, se aprueba automáticamente; si no, va al organizador y luego al admin.
- El reembolso se paga como **saldo Plann** (instantáneo, fase 3) o al mismo método de pago (manual por finanzas, MVP). El comprador elige.
- Si el organizador cancela el evento, reembolso total incluido el fee, obligatorio, y el organizador pierde el derecho a retirar hasta que todo esté devuelto.

### 4.5 Impuestos y facturación

- Los precios incluyen cualquier impuesto que el organizador deba cobrar; Plann no es agente de retención en MVP.
- Plann emite comprobante de compra digital (no factura fiscal) por cada orden. La facturación fiscal (SENIAT) queda como tarea de fase 2 con un contador (ver sección 15).

---

## 5. App móvil — experiencia del comprador

Sigue `PLANN-IDENTIDAD-VISUAL.md` al pie de la letra (oscuro, vidrio, rosa único, Manrope, Newake solo en el logo).

### 5.1 Onboarding
- 3 pantallas máximo: qué es Plann, elige tu ciudad (Barquisimeto por defecto por GPS), elige categorías que te interesan.
- Registro con Google, Apple o correo. Se puede **explorar sin cuenta**; la cuenta se pide al comprar o guardar.

### 5.2 Inicio
- Saludo con nombre y ciudad. Buscador. Chips de categoría (Todos · Conciertos · Fiestas · Tours · Deportes · Familia · Teatro · Gastronomía · Ferias).
- **Tarjeta héroe** (destacado pagado o curado por admin).
- Secciones: "Este fin de semana", "Cerca de ti", "Tours y planes", "Nuevos", "Gratis", "Por menos de $10", "Planes Plann" (los propios).
- Cada tarjeta: foto, eyebrow rosa (tipo · duración o fecha), título, rating · reseñas, precio "desde".

### 5.3 Buscar
- Búsqueda por texto (nombre, lugar, artista, organizador). Filtros: fecha (hoy, mañana, fin de semana, calendario), categoría, precio, ciudad/zona, solo gratis, con cupo disponible.
- Vista lista y **vista mapa** con pines rosa (Mapbox). Tocar un pin abre tarjeta flotante de vidrio.

### 5.4 Detalle de evento / plan
- Galería de fotos, título, organizador (con badge verificado y rating), fecha y hora, lugar con mini-mapa y botón "Cómo llegar", duración, descripción, qué incluye / qué llevar (para tours), punto de encuentro, políticas (cancelación, edad mínima), reseñas.
- Lista de **tipos de ticket** (General, VIP, Early bird, Niño, Mesa para 4…) con precio, cupos restantes ("Quedan 12"), y selector de cantidad.
- Barra inferior fija: precio total a la izquierda, botón **Reservar** / **Comprar** a la derecha.
- Compartir: genera link `plann.app/e/nombre-del-evento` con vista previa para WhatsApp/Instagram.

### 5.5 Checkout (una sola pantalla, con pasos)
1. Resumen de tickets y cantidad.
2. Datos del asistente (nombre y cédula, solo si el organizador lo exige; por defecto solo el comprador).
3. Cupón de descuento.
4. Método de pago (sección 4).
5. Total en USD y en Bs. Botón **Pagar**.
6. Pantalla de estado: "Verificando tu pago" con animación sutil → "Listo, aquí está tu ticket".

### 5.6 Mis tickets
- Pestañas: Próximos · Pasados · Pendientes de pago.
- Ticket con el diseño de la identidad (muescas, perforación, QR sobre placa crema). Muestra código corto tipo `PLN-8K3M2Q`, nombre, evento, fecha, lugar, tipo de ticket.
- Acciones: agregar a calendario, ver en mapa, transferir a otro usuario (si el organizador lo permite; el QR original se invalida), pedir reembolso, contactar al organizador (WhatsApp o chat interno), descargar PDF.
- Los tickets se guardan **offline** (cache) para que el QR abra sin internet.

### 5.7 Reservas de planes (tours)
- Igual que un evento, pero con: cupo mínimo para confirmar, fecha de salida, punto y hora de encuentro, checklist de qué llevar, contacto del guía el día antes, y estado "Confirmado" / "Esperando cupo mínimo".

### 5.8 Perfil
- Datos, métodos de pago guardados (solo referencias, nunca datos sensibles), saldo Plann, favoritos, mis reseñas, invitar amigos (código de referido: ambos reciben $1 de saldo tras la primera compra del invitado [DECIDIR]), notificaciones, ayuda/soporte, **Modo organizador** (activar / entrar), cerrar sesión.

### 5.9 Otros
- Notificaciones push: ticket emitido, recordatorio 24 h y 2 h antes, cambio de evento, eventos nuevos en tus categorías (máx. 2/semana), destacados pagados.
- Reseñas: solo quien tuvo un ticket validado (check-in) puede reseñar, hasta 7 días después. Rating 1–5 + texto opcional.
- Reportar evento (fraude, contenido inapropiado) → cola de moderación.
- Soporte: FAQ + formulario que crea un ticket de ayuda visible en la web admin; y botón WhatsApp de Plann.

---

## 6. Modo organizador — panel dentro de la app

Se entra desde Perfil → **Organizador**. Mantiene la misma estética, pero con densidad de datos mayor. Todo lo que hay aquí también existe en la web (`plann.app/organizador`) con más comodidad para escritorio; ambos usan la misma API.

### 6.1 Dashboard del organizador
Selector de periodo (hoy · 7 días · 30 días · evento específico · personalizado). Tarjetas de vidrio con:
- **Ingresos netos** (lo que va a recibir) y ventas brutas.
- **Tickets vendidos / disponibles** con barra de progreso.
- **Visitas al evento → ventas** (tasa de conversión).
- **Check-ins hoy** (en vivo durante el evento).
- Saldo: pendiente · disponible · retirado.
- Gráfica de ventas por día (línea), por tipo de ticket (barras), por método de pago (dona). Todo en rosa/crema, sin colores extra.
- Origen de las ventas: app (inicio, búsqueda, mapa), link compartido, destacado pagado, cupón.
- Alertas: "Tu evento es en 2 días y llevas 40 % vendido", "3 pagos esperando verificación", "Suscripción vence en 5 días".

### 6.2 Mis eventos
Lista con estado: Borrador · En revisión · Publicado · Agotado · En curso · Finalizado · Cancelado. Duplicar evento, pausar ventas, archivar.

### 6.3 Crear / editar evento (asistente por pasos, se puede guardar como borrador)
1. **Básico**: título, categoría, tipo (evento / tour / experiencia / reserva), descripción, fotos (mín. 1, máx. 10), video corto opcional.
2. **Cuándo y dónde**: fecha(s) y hora (soporta varias fechas/funciones y eventos recurrentes), duración, lugar (búsqueda con mapa; lugares frecuentes guardados), punto de encuentro (tours), ciudad.
3. **Tickets**: uno o varios tipos; cada uno con nombre, precio USD (o gratis), cupo, mínimo/máximo por orden, fechas de venta, visibilidad (público / oculto por link), descripción ("incluye 2 bebidas"). Early bird con fecha límite. Cupo mínimo para confirmar (tours).
4. **Reglas**: política de reembolso, edad mínima, pedir cédula de cada asistente, permitir transferencia de tickets, permitir efectivo en puerta, mensaje que se muestra en el ticket ("Trae tu cédula").
5. **Promoción**: cupones (porcentaje o monto, límite de usos, fecha), destacar evento (compra directa aquí), link compartible.
6. **Vista previa y publicar**: se ve exactamente como en la app. Eventos de organizadores nuevos o con reportes pasan por revisión del admin (menos de 24 h); organizadores Pro/Business con buen historial se publican directo.

### 6.4 Asistentes
- Lista de compradores con: nombre, tipo de ticket, cantidad, estado (pagado, pendiente, check-in hecho, reembolsado), método de pago, fecha.
- Buscar, filtrar, exportar CSV/Excel (Pro+).
- Enviar mensaje a todos los asistentes (cambio de hora, recordatorio) — se envía como push + correo, máximo 3 por evento.
- Añadir asistente manual (cortesía o venta en efectivo): genera ticket sin cobro; queda registrado como "cortesía" y no suma ingresos.

### 6.5 Check-in (escáner)
- Botón grande **Escanear** que abre la cámara. Lee el QR, verifica firma y estado con el servidor, y muestra pantalla completa: **verde crema "Válido"** con nombre y tipo de ticket, o **"Ya usado a las 8:42 pm"** / **"Inválido"** / **"Reembolsado"** en rosa. Vibración distinta para cada caso.
- Modo **offline**: descarga la lista de tickets del evento antes; valida localmente y sincroniza cuando hay señal. Evita dobles entradas entre varios escáneres con sincronización cada 10 s.
- Búsqueda manual por nombre o código si el QR no abre.
- Contador en vivo: 312 / 500 dentro.
- Staff: cada miembro ve solo los eventos asignados y solo esta pantalla.

### 6.6 Finanzas
- Saldo pendiente, disponible, en reserva de garantía, retirado. Historial de movimientos por orden.
- **Solicitar retiro**: monto, método (Pago móvil / transferencia / Zelle / Binance), datos de cobro guardados y verificados. Estados: solicitado · en proceso · pagado · rechazado (con motivo). Comprobante descargable.
- Resumen por evento: bruto, comisión Plann, reembolsos, neto.
- Facturas de suscripción y destacados.

### 6.7 Promoción
- Comprar destacados (ver 2.3) con calendario de disponibilidad.
- Cupones: crear, pausar, ver usos y ventas generadas.
- Links con seguimiento: `plann.app/e/evento?src=instagram` para saber de dónde vienen las ventas.

### 6.8 Perfil de organizador
- Nombre público, logo, portada, descripción, redes, teléfono de contacto, ciudad. Rating promedio y reseñas recibidas (puede responder). Badge de verificado y de plan.
- Equipo: invitar miembros por link, asignar rol y eventos.
- Suscripción: plan actual, cambiar, historial de pagos.

---

## 7. Web admin de Plann

`admin.plann.app`. Next.js. Variante **clara** del sistema de diseño (sección 8 de la identidad visual): fondo crema, tarjetas blancas, acento rosa, sin blur. Solo acceso con cuenta del equipo Plann + autenticación de dos factores.

### 7.1 Dashboard general (pantalla de inicio)
Selector de periodo y ciudad. Tarjetas KPI:
- **GMV** (ventas brutas de tickets) y variación vs. periodo anterior.
- **Ingresos de Plann** desglosados: comisiones · fees · suscripciones · destacados · planes propios (margen).
- Órdenes: creadas, pagadas, tasa de conversión de checkout, abandonadas.
- Usuarios: nuevos, activos (DAU/MAU), compradores recurrentes.
- Organizadores: activos, nuevos, pendientes de verificar.
- Eventos: publicados, en revisión, próximos 7 días.
- **Dinero en movimiento**: pagos esperando verificación (con tiempo promedio de espera), retiros pendientes, reembolsos pendientes.
- Gráficas: GMV por día, ingresos por vía, ventas por categoría, ventas por método de pago, mapa de calor por ciudad/zona.
- Panel de alertas: pagos con más de 15 min sin verificar, eventos reportados, retiros grandes, organizadores con tasa de reembolso alta, intentos de pago rechazados repetidos (fraude).

### 7.2 Pagos y conciliación
- Cola de verificación manual: captura, referencia, monto esperado vs. recibido, banco, comprador, evento. Botones Aprobar / Rechazar (con motivo). Atajos de teclado.
- Conciliación: lista de pagos recibidos en las cuentas de Plann (importados por API / correo / carga manual de estado de cuenta CSV) y órdenes sin pago; emparejar manualmente cuando el motor no pudo.
- Configuración de cuentas receptoras (bancos, teléfonos de Pago móvil, correo Zelle, Binance) y cuál se muestra en la app en cada momento (rotación).
- Tasa BCV del día: valor, fuente, historial, margen aplicado.

### 7.3 Retiros y liquidaciones
- Solicitudes de retiro con datos de cobro, saldo del organizador, historial de reembolsos. Aprobar → marcar pagado con referencia → notificar. Rechazar con motivo.
- Reporte de cuánto debe Plann a todos los organizadores (pasivo) en tiempo real.

### 7.4 Reembolsos y disputas
- Cola de solicitudes; ver política del evento, ticket, si hubo check-in. Aprobar (a saldo o al método original) / rechazar. Registro de disputas con notas internas.

### 7.5 Organizadores
- Lista con estado de verificación, plan, ventas totales, rating, tasa de reembolso, reportes. Ficha completa: documentos de KYC, eventos, finanzas, equipo, historial de acciones.
- Aprobar / rechazar / suspender verificación. Cambiar plan, regalar meses. Notas internas.

### 7.6 Eventos y moderación
- Cola de revisión de eventos nuevos y editados. Ver como se verá en la app. Aprobar / pedir cambios / rechazar.
- Todos los eventos con filtros; editar cualquier campo; pausar ventas; cancelar con reembolso masivo; poner destacado manual.
- Reportes de usuarios y reseñas denunciadas.

### 7.7 Usuarios (compradores)
- Buscar por nombre, correo, teléfono, cédula, código de ticket. Ficha: órdenes, tickets, saldo, reseñas, dispositivos, notas. Acciones: reenviar ticket, ajustar saldo (con motivo y registro), bloquear.

### 7.8 Planes propios de Plann (operaciones)
- Catálogo de planes con costos por proveedor y margen calculado. Calendario de salidas con cupos vendidos / mínimo / máximo.
- Lista de pasajeros por salida (nombre, cédula, teléfono, contacto de emergencia) exportable para el guía y el transporte.
- Proveedores: datos, servicios, costo, pagos realizados.
- Confirmar o cancelar salida (dispara reembolsos automáticos si no se llenó el mínimo).

### 7.9 Monetización
- Suscripciones: activas, por vencer, ingresos MRR, cambios de plan.
- Destacados: calendario de ocupación por ubicación y ciudad, ingresos, aprobar creatividades si se decide moderarlas.
- Configuración de precios: comisión por plan, fee de servicio, precios de destacados, precios de suscripción, mínimo de retiro, reserva de garantía, políticas por defecto. Cada cambio queda en el registro de auditoría y aplica solo a órdenes nuevas. **Detalle completo en la sección 21.**
- Programa de puntos: reglas de acumulación y canje, niveles, pasivo de puntos, costo del programa. Ver secciones 19 y 20.

### 7.10 Comunicación
- Push masivo segmentado (ciudad, categoría de interés, compradores del último mes, organizadores). Vista previa, programar, resultados (enviados, abiertos).
- Plantillas de correo y push (ticket emitido, recordatorio, reembolso, verificación aprobada, etc.) editables.
- Soporte: bandeja de tickets de ayuda con estado, asignación, respuestas y macros.

### 7.11 Reportes
- Exportables (CSV/Excel/PDF): ventas por periodo, por organizador, por evento, por método de pago; ingresos de Plann; pasivo con organizadores; reembolsos; suscripciones; para el contador (sección 15).

### 7.12 Configuración y auditoría
- Categorías, ciudades y zonas, lugares frecuentes, textos legales, versiones mínimas de la app, modo mantenimiento, banderas de funciones (feature flags) para activar métodos de pago o secciones.
- Equipo Plann: usuarios, roles, 2FA.
- **Registro de auditoría**: toda acción de admin (quién, qué, cuándo, antes/después). Inmutable.

---

## 8. Flujos clave paso a paso

### 8.1 Compra de ticket
Explorar → Detalle → Elegir tickets → Checkout (cuenta si no tiene) → Método de pago → Orden `pendiente_pago` + bloqueo 15 min → Pagar en banco → Registrar referencia → `en_verificacion` → Motor de conciliación o admin → `pagada` → Emisión de tickets (QR firmado) → Push + correo → Aparece en Mis tickets.
Si expira el bloqueo: orden `expirada`, tickets liberados, push "Tu reserva expiró, ¿quieres intentarlo de nuevo?".

### 8.2 Check-in
Staff abre Escanear → Lee QR → Servidor verifica firma, evento correcto, ticket `valido` y no usado → Marca `usado` con hora y quién escaneó → Pantalla Válido. Duplicado → "Ya usado" con hora. Con varios escáneres offline: cada uno guarda localmente y sincroniza; ante conflicto gana el primer check-in por timestamp.

### 8.3 Verificación de organizador
Activar modo organizador → Formulario KYC → Estado `pendiente` (puede crear borradores, no publicar de pago) → Admin revisa en menos de 24 h → `verificado` (push + correo) o `rechazado` con motivo y opción de corregir.

### 8.4 Publicación de evento
Borrador → Publicar → Si organizador nuevo o marcado: `en_revision` → Admin aprueba → `publicado`. Si organizador confiable: `publicado` directo, y el admin lo ve en "Publicados recientemente" por si hay que actuar.

### 8.5 Liquidación
Venta pagada → neto a `saldo_pendiente` → Regla del plan lo pasa a `saldo_disponible` → Organizador pide retiro → Admin ejecuta → `pagado` con comprobante.

### 8.6 Reembolso
Comprador pide desde el ticket → Si política lo permite y no hay check-in: aprobado automático → Ticket `reembolsado`, QR invalidado, cupo liberado → Devolución a saldo (instantánea) o método original (finanzas, manual) → Se descuenta del saldo del organizador (o de la reserva).

### 8.7 Destacar evento
Panel organizador → Promoción → Elegir ubicación y fechas (ve disponibilidad) → Pagar (mismos métodos) → Al confirmarse el pago aparece en la posición comprada durante el periodo → Estadísticas de vistas y ventas atribuidas.

### 8.8 Plan propio de Plann con cupo mínimo
Admin crea plan y salidas → Compradores reservan → 48 h antes: si cupo ≥ mínimo → `confirmada`, push a todos con punto de encuentro y contacto del guía; si no → `cancelada`, reembolso automático total → Día del tour: guía usa la app como staff para check-in.

---

## 9. Modelo de datos (Postgres / Supabase)

Solo entidades y campos clave. Todos los montos en centavos de USD (`integer`) salvo que se indique. Todas las tablas con `id uuid`, `created_at`, `updated_at`.

**users** — `email`, `phone`, `full_name`, `document_id` (cédula, opcional), `avatar_url`, `city_id`, `interests text[]`, `referral_code`, `referred_by`, `push_tokens`, `status` (active/blocked).

**user_roles** — `user_id`, `role` (buyer/organizer/admin_super/admin_finance/admin_support/admin_moderator/admin_ops).

**organizers** — `owner_user_id`, `name`, `slug`, `logo_url`, `cover_url`, `bio`, `socials jsonb`, `contact_phone`, `city_id`, `verification_status`, `verification_docs jsonb`, `verified_at`, `plan` (basic/pro/business), `plan_expires_at`, `commission_rate`, `trust_level` (new/trusted), `rating_avg`, `rating_count`, `is_plann_own boolean`.

**organizer_members** — `organizer_id`, `user_id`, `role` (owner/editor/staff), `event_ids uuid[]` (para staff), `invited_by`, `status`.

**venues** — `name`, `address`, `city_id`, `lat`, `lng`, `place_id`, `created_by_organizer_id`.

**events** — `organizer_id`, `title`, `slug`, `kind` (event/tour/experience/booking), `category_id`, `description`, `images text[]`, `video_url`, `venue_id`, `meeting_point`, `city_id`, `starts_at`, `ends_at`, `duration_minutes`, `is_recurring`, `status` (draft/in_review/published/sold_out/live/finished/cancelled), `refund_policy` (none/24h/72h/always), `min_age`, `require_attendee_id`, `allow_transfer`, `allow_cash_at_door`, `ticket_note`, `min_capacity` (tours), `confirm_status` (pending/confirmed/cancelled), `views_count`, `is_featured_manual`, `review_notes`.

**event_dates** — `event_id`, `starts_at`, `ends_at`, `capacity_override` (para varias funciones/salidas).

**ticket_types** — `event_id`, `name`, `description`, `price` (0 = gratis), `quantity`, `sold`, `reserved`, `min_per_order`, `max_per_order`, `sales_start`, `sales_end`, `visibility` (public/hidden), `sort_order`.

**coupons** — `organizer_id`, `event_id` (nullable = todos), `code`, `type` (percent/amount), `value`, `max_uses`, `uses`, `starts_at`, `ends_at`, `status`.

**orders** — `user_id`, `event_id`, `event_date_id`, `status` (pending_payment/in_verification/paid/expired/cancelled/refunded/partially_refunded), `subtotal`, `discount`, `service_fee`, `total_usd`, `total_bs`, `rate_used`, `currency_paid`, `payment_method`, `coupon_id`, `expires_at`, `source` (home/search/map/link/featured/coupon), `source_ref`, `paid_at`, `attendees jsonb`.

**order_items** — `order_id`, `ticket_type_id`, `quantity`, `unit_price`, `commission_rate`, `commission_amount`, `organizer_net`.

**tickets** — `order_id`, `order_item_id`, `event_id`, `user_id` (dueño actual), `code` (PLN-XXXXXX), `qr_signature`, `attendee_name`, `attendee_document`, `status` (valid/used/refunded/transferred/void), `checked_in_at`, `checked_in_by`, `transferred_from`.

**payments** — `order_id`, `method`, `amount`, `currency`, `reference`, `payer_phone`, `payer_document`, `payer_bank`, `receipt_url`, `status` (submitted/matched/approved/rejected), `matched_by` (auto/admin_user_id), `rejection_reason`, `receiving_account_id`, `provider_payload jsonb`.

**receiving_accounts** — `type` (pago_movil/transfer/zelle/binance/stripe), `label`, `details jsonb`, `is_active`, `show_in_app`.

**bank_inbound_transactions** — `receiving_account_id`, `amount`, `currency`, `reference`, `origin_phone`, `origin_bank`, `received_at`, `raw`, `matched_payment_id` (fuente para el motor de conciliación).

**exchange_rates** — `date`, `rate_bcv`, `margin_pct`, `rate_applied`, `source`.

**organizer_balances** — `organizer_id`, `pending`, `available`, `reserved`, `withdrawn` (vista materializada o tabla mantenida por triggers).

**balance_entries** — `organizer_id`, `type` (sale/refund/commission/withdrawal/adjustment/guarantee_hold/guarantee_release), `amount`, `order_id`, `withdrawal_id`, `available_at`, `note`.

**withdrawals** — `organizer_id`, `amount`, `method`, `payout_details jsonb`, `status` (requested/processing/paid/rejected), `processed_by`, `proof_url`, `reference`, `rejection_reason`.

**refunds** — `order_id`, `ticket_ids uuid[]`, `amount`, `to` (wallet/original), `status`, `requested_by`, `approved_by`, `reason`.

**wallets** / **wallet_entries** — saldo Plann del comprador (fase 3).

**subscriptions** — `organizer_id`, `plan`, `price`, `status`, `current_period_end`, `payment_id`.

**featured_slots** — `event_id`, `organizer_id`, `placement` (home_carousel/home_hero/category_top/push), `city_id`, `starts_at`, `ends_at`, `price`, `status`, `payment_id`, `views`, `attributed_orders`.

**platform_revenue** — `type` (commission/service_fee/subscription/featured/own_plan_margin), `amount`, `ref_id`, `date`.

**suppliers** / **supplier_services** / **supplier_payouts** — proveedores de los planes propios (fase 3).

**loyalty_accounts** — `user_id`, `balance` (puntos), `lifetime_earned`, `tier` (nuevo/frecuente/plus), `tier_since`, `tier_expires_at`, `last_activity_at`.

**loyalty_entries** — `user_id`, `type` (earn_purchase/earn_bonus/earn_review/earn_referral/earn_checkin/redeem/expire/adjust/reverse), `points` (+/−), `order_id`, `rule_id`, `available_at`, `expires_at`, `note`, `created_by`.

**loyalty_rules** — `key` (points_per_usd, bonus_review, bonus_referral, bonus_checkin, bonus_first_purchase, birthday_multiplier…), `value`, `active`, `starts_at`, `ends_at`, `city_id` (nullable), `category_id` (nullable), `updated_by`. Todas las reglas se editan desde el admin; ninguna está en el código.

**loyalty_tiers** — `key`, `name`, `min_points_12m`, `benefits jsonb` (fee_discount_pct, presale_hours, extra_refund_hours, priority_support, monthly_free_points…), `active`.

**redemptions** — `user_id`, `order_id`, `points_used`, `usd_value`, `type` (discount/free_ticket/upgrade), `status`.

**organizer_scores** — `organizer_id`, `score`, `tier` (nuevo/bronce/plata/oro/platino), `tier_since`, `score_12m`, `last_recalc_at`.

**organizer_score_entries** — `organizer_id`, `type` (sales/tickets_validated/rating/on_time/low_refunds/reply_reviews/event_completed/cancellation_penalty/report_penalty/late_payment_penalty), `points` (+/−), `event_id`, `note`, `created_at`.

**organizer_tiers** — `key`, `name`, `min_score`, `benefits jsonb` (commission_discount_pts, payout_days, free_featured_per_month, skip_review, guarantee_reserve_pct, badge, beta_access), `active`.

**reviews** — `event_id`, `organizer_id`, `user_id`, `ticket_id`, `rating`, `text`, `organizer_reply`, `status`.

**favorites**, **reports**, **support_tickets**, **support_messages**, **notifications**, **notification_campaigns**, **audit_log** (`actor_id`, `action`, `entity`, `entity_id`, `before jsonb`, `after jsonb`), **categories**, **cities**, **settings** (clave/valor con historial).

---

## 10. Stack técnico y arquitectura

Elegido para que una persona sin experiencia previa programando pueda construirlo con Claude Code, con servicios administrados y sin servidores que mantener.

| Capa | Tecnología | Por qué |
|---|---|---|
| App móvil | **Expo (React Native) + TypeScript + Expo Router** | Android e iOS con un código; actualizaciones OTA con EAS Update sin pasar por tiendas para cambios menores |
| UI móvil | Componentes propios siguiendo la identidad; `expo-blur` para vidrio; `react-native-reanimated`; `react-native-svg`; fuente Manrope vía `@expo-google-fonts/manrope`; Newake como asset local | Control total del look |
| Backend | **Supabase**: Postgres, Auth, Storage, Edge Functions (Deno/TypeScript), Realtime, Cron | Base de datos + autenticación + archivos + funciones sin servidor propio; RLS para seguridad por rol |
| Web admin y web organizador | **Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui** | Rápido de construir; se despliega en Vercel |
| Web pública | Misma app Next.js: landing y páginas `/e/[slug]` con Open Graph para compartir | SEO y previews en WhatsApp |
| Mapas | Mapbox (móvil y web) | Buen estilo oscuro personalizable; alternativa Google Maps |
| Push | Expo Push Notifications (FCM + APNs) | Gratis y sencillo |
| Correo | Resend (transaccional) | Plantillas simples |
| QR | `react-native-qrcode-svg`; contenido = token firmado (HMAC-SHA256 con secreto del servidor) con `ticket_id`, `event_id`, `issued_at` | Imposible de falsificar sin el secreto |
| Escáner | `expo-camera` con lector de códigos | |
| Tasa BCV | Edge Function con cron diario: API pública (ej. pydolarve) con respaldo de scraping al sitio del BCV | |
| Pagos automáticos (F2) | Binance Pay Merchant API; Stripe (empresa fuera de VE); APIs bancarias de Pago móvil según banco afiliado; parser de correos de notificación bancaria (Resend inbound o Gmail API) | Ver sección 4 |
| Análisis y errores | PostHog (eventos de producto) + Sentry (errores) | Saber qué usan y qué falla |
| Monorepo | pnpm workspaces + Turborepo: `apps/mobile`, `apps/web`, `packages/db` (tipos generados de Supabase), `packages/ui-tokens` (colores, tipografía), `packages/core` (cálculos de precio, comisiones, validaciones compartidas) | Un solo lugar para las reglas de negocio |
| Hosting | Supabase (backend), Vercel (web), EAS (builds y tiendas) | |
| Costo estimado inicial | Supabase Pro $25/mes + Vercel gratis/Pro $20 + EAS $19/mes (o gratis con límites) + Mapbox gratis hasta 50k cargas + dominio | ~$50–70/mes |

### 10.1 Principios de arquitectura
- **Toda regla de dinero vive en el servidor** (Edge Functions / funciones SQL): cálculo de totales, comisiones, emisión de tickets, cambios de estado de orden, saldos. La app solo muestra y solicita.
- **Estados como máquina de estados**: transiciones permitidas definidas en `packages/core/state-machines.ts` y validadas en base de datos con triggers.
- **Idempotencia**: crear orden, registrar pago y check-in aceptan una `idempotency_key` para que reintentos por mala señal no dupliquen nada.
- **RLS (Row Level Security)** en todas las tablas: un comprador solo ve sus órdenes; un organizador solo sus eventos y asistentes; staff solo los eventos asignados; admin según rol.
- **Tiempo real** donde importa: contador de check-in, cola de verificación en admin, estado de la orden en la pantalla "Verificando tu pago".
- **Offline-first** en tickets y en escáner.
- **Feature flags** en tabla `settings` para encender métodos de pago y secciones sin publicar nueva versión.

### 10.2 Endpoints / funciones principales (Edge Functions)
`create-order`, `submit-payment`, `payment-matcher` (cron 60 s), `expire-orders` (cron 60 s), `issue-tickets`, `validate-ticket`, `sync-checkins`, `request-refund`, `process-refund`, `request-withdrawal`, `update-exchange-rate` (cron diario), `send-notification`, `purchase-featured`, `subscribe-plan`, `confirm-or-cancel-tour` (cron 48 h antes), `generate-share-preview`, `webhook-binance`, `webhook-stripe`, `ingest-bank-email`.

---

## 11. Seguridad y antifraude

- Autenticación Supabase con verificación de correo; 2FA obligatorio para equipo Plann; sesión de staff limitada al día del evento.
- QR firmado y validado siempre contra el servidor (o contra la lista descargada y firmada en modo offline). El QR incluye un `nonce` que cambia si el ticket se transfiere.
- **Límites**: máximo 10 tickets por orden por defecto (el organizador puede subirlo); máximo 3 órdenes pendientes por usuario; bloqueo temporal tras 3 referencias de pago rechazadas.
- Detección de referencias repetidas (misma referencia usada en dos órdenes) y de capturas editadas (comparar monto/fecha con el texto reconocido por OCR en fase 2).
- Reserva de garantía y liquidación posterior al evento para organizadores nuevos.
- Rate limiting en Edge Functions; validación de entrada con Zod compartido entre app y servidor.
- Datos sensibles (cédula, documentos KYC) en bucket privado con URLs firmadas de corta duración; nunca en la app cacheados.
- Backups diarios automáticos de Supabase; point-in-time recovery en plan Pro.
- Registro de auditoría inmutable para toda acción administrativa.
- Nunca guardar datos de tarjeta: Stripe los maneja.

---

## 12. Notificaciones y comunicación

| Evento | Push | Correo | WhatsApp (F3, API oficial) |
|---|---|---|---|
| Orden creada, esperando pago | Sí | — | — |
| Ticket emitido | Sí | Sí (con PDF) | Sí |
| Pago rechazado | Sí | Sí | — |
| Recordatorio 24 h y 2 h | Sí | — | — |
| Cambio o cancelación de evento | Sí | Sí | Sí |
| Tour confirmado / cancelado por cupo | Sí | Sí | Sí |
| Reembolso procesado | Sí | Sí | — |
| Verificación de organizador | Sí | Sí | — |
| Venta nueva (organizador) | Sí (agrupadas cada 15 min) | Resumen diario | — |
| Retiro pagado | Sí | Sí | — |
| Eventos nuevos en tus intereses | Sí (máx. 2/semana) | Boletín semanal opt-in | — |

Todos los textos en español venezolano, cercano y directo, sin signos de exclamación (ver sección 7 de la identidad).

---

## 13. Roadmap por fases

Estimaciones para una persona trabajando con Claude Code varias horas al día. Cada fase termina con algo usable.

### Fase 0 — Fundamentos (semana 1–2)
- Monorepo, Supabase, Expo, Next.js configurados. Tokens de diseño en `packages/ui-tokens`. Fuentes cargadas. Logo.
- Esquema de base de datos completo (sección 9) con RLS y migraciones. Tipos generados.
- Auth (correo, Google, Apple). Pantallas base con la identidad. Componentes de vidrio reutilizables.
- CI: lint, tipos, tests de `packages/core` (cálculo de precios y comisiones).

> **Empieza por la sección 26**, no por aquí. La Fase 1 completa es el destino; el MVP de 4 semanas es el primer paso y lo que se construye ahora.

### Fase 1 — MVP vendible (semana 3–8)
Comprador: onboarding, inicio, buscar (lista + mapa), detalle, checkout con Pago móvil / transferencia / Zelle (referencia + captura), pantalla de verificación en tiempo real, Mis tickets con QR offline, perfil, favoritos, compartir link con preview web.
Organizador: verificación KYC, crear/editar evento con tipos de ticket y cupones, dashboard básico, asistentes, escáner con offline, finanzas con retiro, staff.
Admin: dashboard, cola de verificación de pagos, retiros, organizadores, moderación de eventos, usuarios, configuración de comisiones y cuentas receptoras, tasa BCV, auditoría.
Motor de conciliación semi-automático (referencia + monto único) y cola manual.
Publicación en Google Play y App Store (TestFlight primero). Lanzamiento con 5–10 organizadores de Barquisimeto invitados con meses Pro gratis.

### Fase 2 — Automatizar y monetizar más (semana 9–14)
- Conciliación automática: API bancaria de Pago móvil (banco afiliado) + parser de correos bancarios. Binance Pay. Stripe para tarjeta internacional.
- Suscripciones Pro/Business con cobro y downgrade automático.
- Destacados pagados con calendario de disponibilidad y atribución de ventas.
- Reembolsos automáticos según política. Transferencia de tickets.
- Estadísticas avanzadas de organizador (conversión, origen, comparación entre eventos).
- Reseñas y reportes. Push segmentado desde admin. Facturación fiscal con contador.
- **Embajadores v1** (sección 23): código, link, atribución, comisión desde la comisión de Plann, panel y retiros.
- **Eventos exclusivos por nivel y privados por invitación** (sección 19.4), incluido el primer Plann Privé.
- **Plann Puntos v1** (sección 19): acumulación por compra, canje como descuento en checkout, niveles de comprador. **Nivel de organizador v1** (sección 20) con beneficios automáticos.
- **Panel de control de monetización** completo (sección 21): todo porcentaje y precio editable desde el admin con simulador.

### Fase 3 — Planes propios y crecimiento (semana 15–22)
- Marketplace de campañas de afiliados, códigos con descuento, niveles de embajador y ranking (sección 23.9). Membresía Plann Black.
- Módulo de planes turísticos de Plann: proveedores, salidas, cupo mínimo, listas de pasajeros, confirmación automática.
- Saldo Plann (wallet), reembolsos instantáneos a saldo, referidos.
- WhatsApp API para tickets y recordatorios.
- Web del organizador para escritorio completa. Exportaciones y reportes contables.
- Expansión a otras ciudades (Valencia, Maracaibo, Caracas) con curación de contenido y organizadores ancla.

### Fase 4 — Escala (a partir del mes 6)
- API pública para organizadores Business. Widget de venta embebible en Instagram/web del organizador.
- Publicidad de negocios locales. Recomendaciones personalizadas. Programa de embajadores por ciudad.

---

## 14. Métricas del negocio (KPIs)

Las que aparecen en el dashboard del admin, en orden de importancia:

1. **GMV mensual** y **take rate** (ingresos Plann / GMV). Meta: take rate 12–15 % combinando comisión + fees.
2. **Ingresos de Plann por vía** y MRR de suscripciones.
3. **Tasa de conversión** detalle → checkout → pagado. Meta: > 60 % de checkouts iniciados terminan pagados.
4. **Tiempo medio de verificación de pago**. Meta MVP: < 15 min; F2: < 2 min con 95 % automático.
5. **Compradores recurrentes** (2+ compras en 90 días). Meta: 30 %.
6. **Organizadores activos** (1+ evento publicado en 30 días) y **retención** de organizadores (publican de nuevo).
7. **Tasa de reembolso** y **tasa de disputas**. Alerta si > 5 % en un organizador.
8. **Tickets validados / vendidos** (asistencia real).
9. **CAC** (costo por comprador nuevo) vs. **LTV** (margen por comprador en 12 meses).
10. **NPS** de compradores y organizadores (encuesta en app cada 90 días).

---

## 15. Legal y operativo en Venezuela

Información general para organizar el trabajo, no asesoría legal ni fiscal. Confirmar todo con un contador y un abogado en Venezuela antes de lanzar.

- **Empresa en Venezuela**: registrar una compañía (C.A. o S.R.L.) o firma personal con RIF para tener cuentas bancarias jurídicas, afiliarse a Pago móvil comercial y facturar. Sin RIF comercial no hay API bancaria de Pago móvil.
- **Empresa fuera de Venezuela**: Stripe y algunas pasarelas no operan con empresas venezolanas; se necesita una entidad en EE. UU. u otro país (una LLC, como la que ya existe para otro proyecto, o una nueva y separada para no mezclar riesgos). Definir con un abogado si conviene una LLC exclusiva para Plann.
- **Impuestos**: IVA sobre comisiones y suscripciones, ISLR, patente municipal en Barquisimeto (Iribarren), IGTF en pagos en divisas. El contador define qué cobra Plann y cómo se factura; el sistema debe poder aplicar un impuesto porcentual configurable a comisiones/fees (campo `tax_rate` en `settings`).
- **Términos y condiciones** separados para compradores y organizadores; política de reembolsos; política de privacidad (datos personales y cédulas: solo lo necesario, acceso restringido, derecho a borrado).
- **Contrato con organizadores**: Plann es intermediario; el organizador es responsable del evento, permisos, seguridad y cumplimiento (permisos municipales, SAPI si aplica, seguros).
- **Planes propios**: los tours requieren proveedores con RTN (Registro Turístico Nacional) y seguro para pasajeros; Plann como operador puede necesitar su propia inscripción ante MINTUR. Verificar antes de la fase 3.
- **Menores**: no se venden tickets a menores de 18 sin representante; eventos 18+ marcan `min_age` y el staff verifica cédula en puerta.
- **Tiendas**: cuenta de Google Play ($25 único) y Apple Developer ($99/año) a nombre de la empresa. Apple exige Sign in with Apple si hay login social.

---

## 16. Decisiones pendientes

| # | Decisión | Valor por defecto mientras se decide |
|---|---|---|
| 1 | Porcentaje de comisión por ticket | 12 % Básico · 8 % Pro · 6 % Business |
| 2 | Fee de servicio al comprador | $0,50 o 3 %, el mayor |
| 3 | Precios de suscripción | Pro $19 · Business $59 |
| 4 | Precios de destacados | Ver 2.3 |
| 5 | ¿Verificación obligatoria para publicar eventos de pago? | Sí |
| 6 | ¿Cualquier usuario puede publicar eventos gratis? | Sí, con moderación |
| 7 | Alcance de lanzamiento | Barquisimeto / Lara |
| 8 | Mínimo de retiro | $20 |
| 9 | Margen sobre tasa BCV | 0 % |
| 10 | Recompensa por referido | $1 de saldo para ambos tras la primera compra |
| 11 | Dominio | `plann.app` (verificar disponibilidad; alternativas `plann.com.ve`, `plannve.com`) |
| 12 | Entidad legal para Stripe/Binance | LLC exclusiva para Plann (por confirmar) |
| 13 | Banco principal para Pago móvil comercial (define qué API se integra) | Por definir; candidatos: Banco Plaza, Mercantil, Bancamiga, Banesco |
| 14 | ¿Existe ya algo construido (código, dominio, cuentas)? | Se asume que se empieza de cero |
| 15 | Nombre público del perfil de planes propios | "Plann Experiencias" |
| 16 | Valor del punto para el comprador | 1 punto = $0,01 (1 punto por cada $1 gastado) |
| 17 | Tope de descuento pagado con puntos por orden | 30 % del subtotal |
| 18 | Caducidad de puntos | 12 meses sin actividad |
| 19 | ¿El descuento por puntos lo absorbe Plann o el organizador? | Plann (sale de su comisión), salvo promociones que el organizador financie |
| 20 | Umbrales de nivel de comprador | Frecuente 300 pts/año · Plus 1.000 pts/año |
| 21 | Descuento de comisión por nivel de organizador | Bronce 0 · Plata −0,5 · Oro −1 · Platino −2 puntos porcentuales |
| 22 | Umbrales de los 5 niveles de comprador | 0 · 300 · 1.000 · 3.000 · 8.000 pts en 12 meses |
| 23 | Precio de la membresía Plann Black | $49/año, plazas limitadas por ciudad |
| 24 | Cuánto de tu comisión se lleva el embajador | 30 % de la comisión de Plann (35/40/45 % por nivel) |
| 25 | Fee de gestión sobre la comisión que paga el organizador al embajador | 2 puntos porcentuales |
| 26 | Ventana de atribución del link de embajador | 30 días, último clic, el código escrito gana siempre |
| 27 | ¿Los embajadores se aprueban a mano o automático? | A mano en fase 2; automático con reglas cuando haya volumen |
| 28 | Margen sobre la tasa BCV (tasa Plann) | 3 %, revisable cada semana según la brecha |
| 29 | Moneda en que se le paga al organizador | La misma en que se cobró la venta |
| 30 | Comisión del punto de venta físico | $0,50 o 4 % por ticket, el mayor |
| 31 | Comisión en modo taquilla | La mitad de la comisión normal |
| 32 | Horario de verificación manual de pagos | 8 a. m. a 12 a. m., promesa de 15 minutos |
| 33 | Ruta de lanzamiento | Cartelera + un organizador aliado (sección 24) |
| 34 | Máximo de tickets por usuario por evento | 6, editable por el organizador |
| 35 | Retención de capturas de pago | 12 meses |
| 36 | ¿Se listan eventos 18+ desde el inicio? | Sí, con filtro por edad y fecha de nacimiento en el registro |

---

## 17. Estructura del repositorio y prompt inicial para Claude Code

```
plann/
├── PLANN-PROYECTO.md            ← este archivo
├── PLANN-IDENTIDAD-VISUAL.md
├── CLAUDE.md                    ← instrucciones cortas para Claude Code (ver abajo)
├── assets/
│   ├── logo/Recurso_1.png       (logo completo pin + wordmark, fondo crema)
│   └── fonts/NewakeFont-Demo.otf
├── apps/
│   ├── mobile/                  Expo + Expo Router
│   └── web/                     Next.js: /admin, /organizador, landing, /e/[slug]
├── packages/
│   ├── core/                    reglas de negocio: precios, comisiones, máquinas de estado, validaciones (Zod)
│   ├── db/                      tipos generados de Supabase, cliente, queries compartidas
│   └── ui-tokens/               colores, tipografía, radios, sombras (de la identidad visual)
├── supabase/
│   ├── migrations/
│   ├── functions/               Edge Functions (sección 10.2)
│   └── seed.sql                 categorías, ciudades, lugares, eventos de prueba
└── docs/
    ├── decisiones/              una nota por decisión tomada (ADR)
    └── legal/                   términos, privacidad, reembolsos
```

### Contenido sugerido para `CLAUDE.md`

```
# Plann — instrucciones para Claude Code

Lee PLANN-PROYECTO.md (qué construir) y PLANN-IDENTIDAD-VISUAL.md (cómo se ve) antes de tocar código.

Reglas:
- Toda lógica de dinero (totales, comisiones, saldos, emisión de tickets, estados de orden) va en supabase/functions o en SQL, nunca solo en la app.
- Cálculos compartidos y validaciones viven en packages/core y se importan desde mobile, web y functions.
- Montos en centavos de USD (integer). Bs solo para mostrar, con la tasa guardada en la orden.
- Cada tabla nueva lleva RLS desde la primera migración.
- Sigue la identidad visual exactamente: un solo acento (#E9417F), Manrope para UI, Newake solo en el logo, sin emoji en la interfaz, sin verdes/azules.
- Copy en español de Venezuela, tuteo, sin signos de exclamación.
- Antes de implementar algo marcado [DECIDIR], usa el valor por defecto y anótalo en docs/decisiones/.
- Trabaja por fases (sección 13). No empieces la fase 2 sin que la 1 esté funcionando de punta a punta.
- Cada función de packages/core lleva tests. Ejecuta lint y tipos antes de dar por terminada una tarea.
```

### Prompt inicial para arrancar

> Lee `PLANN-PROYECTO.md` y `PLANN-IDENTIDAD-VISUAL.md`. Vamos a empezar la Fase 0. Crea el monorepo con pnpm + Turborepo con `apps/mobile` (Expo, TypeScript, Expo Router), `apps/web` (Next.js 15, Tailwind, shadcn/ui), `packages/core`, `packages/db` y `packages/ui-tokens`. En `ui-tokens` traduce todos los tokens de la identidad visual (colores, tipografía, radios, sombras, glows, superficies de vidrio). Luego escribe la migración inicial de Supabase con todas las tablas de la sección 9, con RLS por rol, y genera los tipos. Termina con un `README.md` que explique cómo correr cada app en local. Ve paso a paso y muéstrame qué creaste al terminar cada bloque.

---

## 18. Assets y referencias

- `PLANN-IDENTIDAD-VISUAL.md` — colores, vidrio, glow, tipografía, componentes, voz.
- `Recurso_1.png` — logo (pin rosa con ticket crema + wordmark "Plann" en tinta sobre crema). Falta generar: versión sobre fondo oscuro (wordmark en crema), pin solo (ícono de app 1024×1024, adaptativo Android), favicon, splash.
- `NewakeFont-Demo.otf` — versión demo de Newake. **Antes de publicar en tiendas hay que comprar la licencia comercial** de la fuente o sustituirla.
- Manrope — Google Fonts, licencia OFL, libre para uso comercial.
- Fuentes de datos: tasa BCV (bcv.org.ve / API pública), Mapbox, Expo, Supabase, Stripe, Binance Pay Merchant.


---

## 19. Plann Puntos — programa de lealtad (compradores)

**Para qué sirve.** Que el comprador vuelva a Plann en vez de comprarle por Instagram al organizador. Es el arma contra la desintermediación: el organizador siempre puede vender por fuera, pero el comprador pierde puntos, preventa y protección si lo hace.

**Nombre en la app:** «Puntos Plann». Se ven en Perfil con un contador y en el checkout como «Tienes 340 puntos · úsalos aquí».

### 19.1 Cómo se ganan

| Acción | Puntos [editable] | Cuándo se acreditan |
|---|---|---|
| Comprar | **1 punto por cada $1** del precio (no del fee) | 24 h después de que termine el evento |
| Primera compra | +50 | Con la primera compra pagada |
| Check-in validado | +10 | Al escanear su ticket |
| Reseña con texto | +15 | Al publicarla |
| Reseña con foto | +25 | Al publicarla |
| Invitar a un amigo | +100 | Cuando el invitado hace check-in en su primera compra |
| Cumpleaños | ×2 en toda compra ese mes | Automático |
| Categoría nueva | +20 | Primera compra en una categoría que nunca compró |
| Plan propio de Plann | ×2 puntos | Para empujar lo que deja más margen |
| Comprar con anticipación (+14 días) | ×1,5 | Mejora el flujo de caja |

Todas las reglas viven en `loyalty_rules` y se prenden, apagan y ajustan desde el admin, con fecha de inicio y fin, y se pueden limitar a una ciudad o categoría (por ejemplo: «doble puntos en Tours durante septiembre»).

### 19.2 Cómo se canjean

- **Descuento en el checkout**: 100 puntos = $1. Tope por orden: **30 %** del subtotal [editable]. El descuento se aplica al precio, no al fee de servicio.
- **Ticket gratis en planes propios de Plann** a partir de cierto umbral (ej. 3.000 puntos = un tour a Cubiro). Es lo más barato para Plann, porque el costo real es el del proveedor, no el precio de venta.
- **Mejoras**: pasar de General a VIP pagando la diferencia con puntos, cuando el organizador lo habilite.
- **Sin conversión a dinero**: los puntos nunca se retiran ni se transfieren entre usuarios.

### 19.3 Niveles de comprador — la escalera Plann

Cinco niveles. Cada uno desbloquea **más descuento y cosas nuevas que antes no podías hacer**, y los dos últimos abren la puerta a lo que nadie más puede comprar: eventos exclusivos y privados. El nivel se calcula con los puntos ganados en los **últimos 12 meses** (no con el saldo disponible: gastar puntos no te baja de nivel).

| | **Explorador** | **Frecuente** | **Insider** | **Élite** | **Plann Black** |
|---|---|---|---|---|---|
| Umbral (pts/12 meses) [editable] | 0 | 300 | 1.000 | 3.000 | 8.000 + invitación |
| Puntos que acumula | ×1 | ×1,25 | ×1,5 | ×2 | ×3 |
| Fee de servicio | Completo | −50 % | Sin fee | Sin fee | Sin fee |
| Descuento fijo en planes propios de Plann | — | 5 % | 10 % | 15 % | 20 % |
| Tope de pago con puntos por orden | 30 % | 40 % | 50 % | 70 % | 100 % |
| Preventa antes que el público | — | 6 h | 24 h | 48 h | 72 h |
| Cancelación extendida sobre la política del evento | — | — | +24 h | +48 h | Siempre reembolsable hasta 6 h antes |
| Cupo reservado en eventos que se agotan | — | — | — | 2 puestos | 4 puestos |
| **Eventos exclusivos (solo para niveles altos)** | — | — | Algunos | Todos | Todos + acompañante |
| **Eventos privados por invitación** | — | — | — | Por invitación | Siempre |
| Soporte | Normal | Prioritario | Prioritario | Línea directa por WhatsApp | Contacto personal |
| Otros | — | Sorteos | Cupón de $2 al mes · badge en reseñas | Upgrade gratis a VIP cuando haya cupo · 1 invitado a su precio | Mesa o zona preferencial cuando el organizador la ofrezca · acceso anticipado a funciones nuevas |

**Reglas de la escalera**
- Subir es inmediato: al cruzar el umbral, el beneficio se activa en la misma compra siguiente.
- Bajar no: hay **60 días de gracia**, con aviso a los 30 días («te faltan 120 puntos para conservar Élite»).
- El nivel se muestra siempre en Perfil con una barra de progreso: «Te faltan 180 puntos para Insider» y la lista de lo que desbloquea. Eso es lo que hace que la gente compre en Plann y no por fuera.
- **Plann Black no se alcanza solo con puntos**: requiere puntaje + invitación del equipo Plann (o compra de la membresía anual, ver 19.5). Es deliberadamente escaso: si todos son Black, no vale nada.
- El nivel es del usuario, no transferible, y se pierde si la cuenta es bloqueada por fraude.

### 19.4 Eventos exclusivos y privados

Esta es la parte que hace que el sistema no sea «descuentos»: es **acceso**. Hay tres tipos de acceso restringido, configurables por el organizador o por Plann.

| Tipo | Quién lo ve | Para qué sirve |
|---|---|---|
| **Exclusivo por nivel** | Solo usuarios de nivel X o superior. El resto ve la tarjeta con candado y el texto «Exclusivo Élite · te faltan 400 puntos» | Aspiracional: el que no puede entrar ve lo que se pierde y compra más |
| **Privado por invitación** | Solo quien recibe la invitación nominal (push + correo). No aparece en búsqueda ni en el inicio | Fiestas cerradas, preestrenos, catas, cenas con el artista, apertura de un local |
| **Oculto por link** | Cualquiera con el link, sin aparecer en la app | Eventos corporativos, listas de invitados del organizador |

**Cómo se configura.** En el paso «Reglas» del asistente de creación de evento aparece `visibilidad`: público · exclusivo por nivel (elige nivel mínimo) · privado por invitación (sube la lista o filtra por nivel, ciudad y categorías compradas) · oculto por link. También se puede restringir **un solo tipo de ticket**: el evento es público, pero la zona VIP o las 20 entradas de «acceso backstage» solo las ve Élite o Black.

**Eventos propios de Plann para niveles altos («Plann Privé»).** Dos o tres veces al mes, Plann organiza algo pequeño y bueno solo para Élite y Black: una cata en una posada de Sanare, un amanecer en Cubiro con desayuno, una función privada, una mesa reservada en la apertura de un local aliado. Cuestan poco de producir porque los aliados los quieren (les llevas a la gente que más gasta) y logran tres cosas a la vez: le dan sentido real al nivel, dejan margen completo porque son planes propios, y te dan contenido que la gente comparte.

**Por qué esto también te da dinero directamente:**
- Los eventos exclusivos suelen tener precio más alto → misma comisión sobre un ticket más caro.
- Los organizadores **pagan por acceder a esa audiencia**: un destacado dirigido solo a Élite/Black es un producto aparte, más caro que un destacado normal (precio sugerido: $30 por envío) porque llega a los compradores que más gastan.
- Es la razón más fuerte para que un comprador consolide todas sus compras en Plann en vez de repartirse entre Instagram y la app.
- Los aliados (posadas, restaurantes, locales) quieren aparecer en Plann Privé y eso abre la puerta a acuerdos comerciales con ellos.

**Reglas de honestidad:** nunca esconder un evento público detrás de un nivel para simular escasez, y nunca vender un nivel prometiendo eventos que no existen. Si en un mes no hay evento Privé, no se anuncia.

### 19.5 Membresía Plann Black (opcional, fase 3)

Además de ganarse por puntos, Plann Black puede **comprarse**: $49 al año [DECIDIR]. Incluye todo lo de Black durante 12 meses. Es ingreso puro y adelantado, y funciona como filtro: quien paga, usa. Límite de plazas por ciudad (ej. 300 en Barquisimeto) para que siga siendo escaso. Si además alcanza el puntaje por compras, se le renueva gratis el año siguiente.

### 19.6 Cuánto le cuesta esto a Plann

Con la configuración por defecto, el programa cuesta cerca del **1 % del GMV** (1 punto por dólar, punto = $0,01), más los bonos. Es decir: si la comisión es 10 %, el take rate efectivo baja a ~9 %. Reglas para que no se descontrole:

- El costo del canje sale de la comisión de Plann, no del pago al organizador (salvo promociones que el organizador financie explícitamente).
- Los puntos son un **pasivo contable**: `loyalty_accounts` alimenta un reporte «Pasivo de puntos» en el admin (puntos en circulación × valor). Si ese número crece más rápido que el GMV, hay que ajustar reglas.
- Los puntos se acreditan **después del evento**, nunca al pagar. Así un reembolso o un evento cancelado no regala puntos.
- Reembolso → se revierten los puntos de esa orden (`type: reverse`). Si ya los gastó, el saldo puede quedar negativo hasta que vuelva a comprar.
- Caducidad: 12 meses sin actividad [editable]. Aviso por push 30 días antes.
- Antifraude: tope de puntos por día, referidos válidos solo con check-in real, misma cédula o teléfono no puede autoreferirse, cuentas señaladas por el admin no acumulan.
- El admin puede ajustar puntos manualmente (compensación por un problema) con motivo obligatorio, y queda en el registro de auditoría.

---

## 20. Nivel de organizador — puntos y beneficios

Los organizadores no ganan puntos canjeables por dinero: ganan **reputación medida** («Nivel Plann»), y el nivel desbloquea beneficios que cuestan poco y motivan mucho. Esto separa a los organizadores serios de los improvisados sin que tengas que decidir a mano caso por caso.

### 20.1 Cómo se calcula el puntaje

Se recalcula cada noche sobre los últimos 12 meses.

| Suma | Puntos [editable] |
|---|---|
| Por cada $100 vendidos | +1 |
| Evento completado sin incidentes | +25 |
| Rating promedio ≥ 4,5 (con 10+ reseñas) | +50 |
| Asistencia (check-ins/vendidos) ≥ 80 % | +30 |
| Responder reseñas dentro de 72 h | +5 cada una |
| Publicar con 14+ días de anticipación | +10 por evento |
| Suscripción pagada a tiempo | +20 al mes |

| Resta | Puntos |
|---|---|
| Cancelar un evento ya publicado con ventas | −150 |
| Tasa de reembolso > 10 % en un evento | −80 |
| Reporte de usuario confirmado por moderación | −100 |
| Cambio de fecha o lugar a menos de 72 h | −50 |
| Rating promedio < 3,5 | −60 |

### 20.2 Niveles y beneficios

| Nivel | Puntaje [editable] | Beneficios |
|---|---|---|
| **Nuevo** | 0 | Comisión de su plan · liquidación después del evento + 3 días · revisión de cada evento |
| **Bronce** | 200 | Publica sin revisión previa · badge Bronce · reserva de garantía 10 % → 7 % |
| **Plata** | 600 | Comisión **−0,5 pts** · liquidación en 5 días · 1 destacado gratis al mes · badge visible en la tarjeta del evento |
| **Oro** | 1.500 | Comisión **−1 pt** · liquidación en 3 días · 2 destacados gratis al mes · prioridad en el carrusel del inicio · soporte prioritario · reserva 3 % |
| **Platino** | 4.000 | Comisión **−2 pts** · liquidación en 24 h · 4 destacados gratis al mes · sin reserva de garantía · acceso anticipado a funciones nuevas · aparece en «Organizadores destacados» · gestor de cuenta |

Regla importante: los beneficios que cuestan dinero (descuento de comisión) están topados. La comisión **nunca baja de 4 %** [editable], sin importar plan + nivel combinados.

- Suspensión: un organizador suspendido pierde el nivel y vuelve a Nuevo al ser reactivado.
- El nivel es **visible para el comprador** (badge en el perfil y en la tarjeta del evento). Eso es lo que lo hace valioso: vende más.
- El admin puede fijar el nivel manualmente (para atraer a un organizador grande) con fecha de vencimiento y motivo.

### 20.3 Créditos de organizador (opcional, fase 3)

Además del nivel, cada dólar que el organizador le paga a Plann (comisiones, suscripción, destacados) puede devolverle **créditos Plann** canjeables solo dentro de la plataforma: destacados, envíos de push, reportes avanzados. Por defecto **2 % de lo que paga** vuelve como crédito. Cuesta poco (es inventario propio) y hace que reinvierta en la plataforma en vez de irse.

---

## 21. Panel de control de monetización (todo editable)

Requisito explícito: **ningún porcentaje ni precio está escrito en el código.** Todo vive en base de datos y se edita desde `admin.plann.app → Monetización → Configuración`, sin publicar una versión nueva de la app.

### 21.1 Qué se puede editar

| Grupo | Parámetros |
|---|---|
| Comisiones | Comisión por plan (Básico/Pro/Business) · comisión mínima absoluta · comisión por categoría (ej. Tours 8 %, Conciertos 12 %) · comisión por ciudad · comisión especial por organizador |
| Fee del comprador | Monto fijo · porcentaje · cuál aplica (el mayor / el menor / solo fijo) · tope máximo · fee en eventos gratis · descuento de fee por nivel del comprador |
| Suscripciones | Precio de cada plan · duración de prueba gratis · qué incluye cada plan |
| Destacados | Precio por ubicación, por día y por semana · precio por ciudad · cupos disponibles por día |
| Liquidación | Días de espera por plan y por nivel · mínimo de retiro · porcentaje y duración de la reserva de garantía |
| Tasa de cambio | Margen sobre la tasa BCV · fuente · hora de actualización |
| Puntos | Todas las reglas de las secciones 19 y 20, con fecha de inicio/fin y segmento |
| Políticas | Política de reembolso por defecto · minutos de bloqueo del carrito · máximo de tickets por orden |
| Impuestos | Porcentaje aplicable a comisiones y fees, configurable cuando el contador lo defina |

### 21.2 Cómo funciona un cambio

1. Editas el valor. La pantalla muestra **el antes y el después** y a cuántos organizadores o eventos afecta.
2. **Simulador**: antes de guardar, el panel calcula con las ventas de los últimos 30 días cuánto habrías ganado con la configuración nueva frente a la actual. Así no cambias a ciegas.
3. Eliges cuándo aplica: inmediato o con fecha futura (`effective_from`).
4. Se guarda como **versión nueva** en `pricing_versions`; la anterior no se borra.
5. **Cada orden guarda la versión de precios que usó** (`orders.pricing_version_id`). Cambiar la comisión hoy nunca altera ni recalcula órdenes viejas ni saldos ya generados.
6. Todo cambio queda en el registro de auditoría con quién, cuándo y el valor anterior.

Tablas: `pricing_versions` (`key`, `value jsonb`, `effective_from`, `effective_to`, `created_by`, `note`) y `organizer_overrides` (`organizer_id`, `key`, `value`, `expires_at`, `reason`).

---

## 22. Ideas adicionales priorizadas

Ordenadas por lo que más aporta a tus ganancias frente a lo que cuesta construir.

### Nivel 1 — Alto ingreso, construir pronto

**1. Códigos de promotor / RRPP.** En la vida nocturna de Barquisimeto quien vende no es el local: son los promotores. Cada promotor tiene su link y su código; el organizador le asigna una comisión (ej. $1 por ticket o 10 %); Plann lleva la cuenta y le paga desde el mismo sistema, quedándose con un 2–3 % adicional por administrar esa liquidación. Le quita al organizador su dolor más grande (cuadrar con 15 promotores por WhatsApp) y te trae ventas sin gastar en publicidad. *Fase 2.*

**2. Mapa de mesas y zonas.** Discotecas, tascas y eventos con mesas venden por ubicación, no por ticket general. Un mapa donde el comprador toca la mesa que quiere, ve el consumo incluido y la reserva. Es la diferencia entre cobrar comisión sobre tickets de $8 y sobre mesas de $150. *Fase 2–3.*

**3. Pago en cuotas o apartado.** Muy venezolano y casi nadie lo ofrece: reservar con 30 % y pagar el resto hasta X días antes, con recordatorios automáticos. Sube la conversión en tickets caros (conciertos, tours, paquetes) y el ticket promedio. Si no completa, pierde el abono o se le devuelve como puntos, según la política del organizador. *Fase 3.*

**4. Reventa oficial.** Mercado secundario dentro de Plann: quien no puede ir revende al precio original o con tope (ej. máximo 110 %), el QR viejo se invalida y se emite uno nuevo. Plann cobra comisión otra vez sobre la misma entrada y mata la reventa fraudulenta por Instagram, que es el problema número uno de los eventos agotados. *Fase 3.*

**5. Seguro de ticket opcional.** +10 % sobre el precio a cambio de reembolso garantizado por cualquier motivo hasta 6 h antes. Margen alto porque poca gente lo usa. Necesita reglas claras y provisión contable. *Fase 3.*

### Nivel 2 — Aumentan el ticket promedio

**6. Extras y combos en el checkout.** Transporte ida y vuelta, estacionamiento, camiseta, botella, combo de bebidas, entrada + cena. Cada extra es un `ticket_type` de tipo `addon` con su propio inventario. Sube el gasto por persona sin traer un comprador nuevo.

**7. Consumo cashless en el evento (fase 4).** El asistente recarga saldo y paga en la barra escaneando su QR. Plann cobra comisión por la recarga y el organizador elimina el manejo de efectivo. Es un negocio en sí mismo, pero necesita hardware y operación: no lo toques hasta tener volumen.

**8. Abonos y pases de temporada.** Un pase para todas las fechas de un ciclo (liga, festival, temporada de teatro). Cobras varias entradas por adelantado.

**9. Tarjetas de regalo Plann.** Se venden como producto, el dinero entra antes del gasto y una parte nunca se canjea.

**10. Precio dinámico por demanda.** El organizador define que el precio suba automáticamente al vender el 50 % y el 80 % del cupo. Crea urgencia real y sube el ingreso por ticket.

### Nivel 3 — Crecimiento y retención (baratas de construir)

**11. Lista de espera en eventos agotados.** «Avísame si se libera». Cada reembolso se revende solo y tienes demanda medida para decirle al organizador: «hay 200 personas esperando, abre otra fecha».

**12. Comprar en grupo.** Reservar 4 puestos y que cada amigo pague el suyo con su propio link. Elimina el «pásame el pago móvil» y convierte a 1 comprador en 4 usuarios registrados.

**13. Regalar un ticket.** Enviar un ticket a otra persona por WhatsApp con un mensaje. Adquisición gratis.

**14. Plann Semana.** Cada jueves, push y correo con los planes del fin de semana en Lara. Se vuelve el hábito de la ciudad y es inventario publicitario que puedes venderle a negocios locales.

**15. Sección social ligera.** «3 de tus contactos van a este evento». Poderoso en eventos jóvenes, pero siempre opt-in por privacidad.

**16. Panel de audiencia para el organizador.** Edad, zona, cuántos son recurrentes, a qué otras categorías van. Es la razón más fuerte para pagar el plan Business y no te cuesta nada: son datos que ya tienes, siempre agregados y anónimos.

**17. Widget de venta embebible.** El organizador pone el botón de compra de Plann en su Instagram o en su página. Vendes en su terreno y cobras comisión igual.

**18. Sorteos y giveaways.** El organizador sortea entradas entre quienes compraron o compartieron. Herramienta de marketing dentro del panel, cobrable en los planes altos.

### Nivel 4 — Más adelante

**19. Plann Empresas.** Eventos corporativos, compra de tickets en bloque con factura.
**20. Marketplace de proveedores.** Sonido, catering, seguridad, fotografía: Plann conecta y cobra comisión por referido.
**21. API pública y white-label.** Un teatro o un estadio usa el motor de Plann con su propia marca, pagando fijo + comisión.
**22. Recomendaciones personalizadas** según historial y categorías; sube la conversión del inicio.
**23. Expansión por ciudades** con un embajador local remunerado por porcentaje del GMV que genere.

### Qué NO construir todavía
- Chat interno completo entre comprador y organizador (WhatsApp ya lo resuelve; un botón basta).
- Streaming de eventos dentro de la app.
- Criptomoneda o token propio.
- Red social completa. Plann vende planes; no compite con Instagram.

---

## 23. Programa de embajadores e influencers

Un influencer de Barquisimeto con 30 mil seguidores vende más entradas en una story que un mes de publicidad pagada. Hoy lo hace gratis o cobrando un cachet fijo por adelantado, sin que nadie pueda medir si funcionó. Plann lo convierte en un canal medible donde **el influencer cobra por venta**, el organizador solo paga si vende, y Plann gana en el medio.

Esto es distinto de los códigos de promotor/RRPP (idea 1 de la sección 22), aunque comparten el motor: el promotor trabaja para un organizador concreto en la puerta de una fiesta; el embajador trabaja para la plataforma y puede promover cualquier evento del catálogo.

### 23.1 Cómo entra alguien

- Nuevo rol **Embajador**, activable desde Perfil → «Gana con Plann». No hace falta ser famoso: cualquiera puede aplicar y el desempeño decide.
- Solicitud corta: nombre, redes con enlace, ciudad, seguidores aproximados, qué tipo de público tiene. El admin aprueba en la web (cola de verificación como la de organizadores).
- Al aprobarse recibe su **código personal** (ej. `MARIA`) y su **link** (`plann.app/e/evento?ref=MARIA`), más materiales listos para publicar: flyer del evento con su código encima, formato story, texto sugerido.
- Puede ser embajador **y** comprador **y** organizador con la misma cuenta.

### 23.2 Cómo se le paga

Hay dos bolsillos, y se pueden combinar:

| Fuente | Quién paga | Valor por defecto [editable] |
|---|---|---|
| **Comisión de plataforma** | Sale de la comisión de Plann, no del organizador | **30 % de la comisión de Plann** en esa venta (con comisión del 10 %, el embajador gana 3 % del precio) |
| **Comisión del organizador** | La ofrece el organizador para su evento | Libre: porcentaje o monto fijo por ticket (ej. 10 % o $1) |

Cuando el organizador ofrece comisión, Plann cobra un **fee de gestión de 2 puntos porcentuales** sobre lo que se le paga al embajador, por llevar la contabilidad, la atribución y el pago. Ese fee es una quinta vía de ingreso y se registra en `platform_revenue` como `affiliate_fee`.

**Código con descuento.** El embajador puede tener un código que además le da un descuento al comprador (ej. 5 % con `MARIA`). Ese descuento lo financia el organizador, no Plann, y se configura al crear la campaña. Es lo que hace que la gente use el código en vez de comprar directo.

### 23.3 Marketplace de campañas

El organizador publica desde su panel: «Ofrezco 10 % por cada ticket vendido de este evento, hasta 200 tickets». Los embajadores ven el tablero de campañas disponibles filtrado por ciudad y categoría, se unen con un toque y reciben su link y sus materiales.

- El organizador puede dejarlo **abierto** (cualquier embajador se une) o **por invitación** (elige a quién).
- Puede exigir nivel mínimo de embajador (ver 23.5) o mínimo de seguidores.
- Ve en tiempo real el ranking: quién está vendiendo, cuántos clics, cuánto lleva pagado. Puede cerrar la campaña cuando quiera; lo vendido se respeta.
- Plann puede crear campañas propias para sus planes turísticos, con comisión más alta porque el margen es suyo.

### 23.4 Atribución: quién se lleva la venta

Reglas claras, escritas en `packages/core` y explicadas al embajador en su panel:

1. **El código escrito en el checkout gana siempre** sobre el link. Es lo más justo y lo que el influencer puede controlar.
2. Sin código: gana el **último link tocado** dentro de los **30 días** previos a la compra [editable]. La atribución se guarda en el dispositivo y en el servidor al iniciar sesión.
3. La comisión se genera solo con la orden **pagada**, y se **acredita 3 días después del evento**, para que los reembolsos no dejen saldos imposibles de cobrar.
4. Reembolso de una orden → se revierte la comisión de esa orden.
5. Un embajador **no cobra por su propia compra** ni por compras desde el mismo teléfono o cédula.
6. Tickets de cortesía, ventas manuales y pagos en efectivo en puerta no generan comisión.

Antifraude: detección de clics masivos desde la misma IP, órdenes con el mismo código y el mismo dispositivo, patrones de compra y reembolso inmediato. El admin puede congelar el saldo de un embajador y revisar antes de pagar.

### 23.5 Panel del embajador (en la app)

Mantiene la estética de la app, en su propia sección:

- **Ganancias**: pendiente · disponible · retirado. Retiro por los mismos métodos que los organizadores (Pago móvil, transferencia, Zelle, Binance), mínimo $10 [editable].
- **Rendimiento**: clics, compradores nuevos que trajo, ventas, conversión, ticket promedio, ganancia por evento. Gráfica de los últimos 30 días.
- **Mis campañas**: activas, terminadas, disponibles para unirse.
- **Materiales**: flyers y stories con su código, link para copiar, código QR para poner en un video.
- **Ranking**: su posición entre embajadores de la ciudad (opcional, se puede ocultar). Los primeros del mes ganan un bono [editable].

### 23.6 Niveles de embajador

Igual que con organizadores, el desempeño desbloquea condiciones mejores:

| Nivel | Requisito (90 días) [editable] | Beneficios |
|---|---|---|
| **Embajador** | Aprobado | 30 % de la comisión de Plann · retiro a los 3 días del evento |
| **Embajador Plata** | 30 ventas | 35 % · acceso anticipado a campañas 24 h antes · materiales personalizados |
| **Embajador Oro** | 100 ventas | 40 % · aparece en «Recomendado por» dentro del evento · invitación a eventos Plann Privé · puede negociar cachet fijo además de comisión |
| **Embajador Plann** (curado por el equipo) | Por invitación | 45 % · campañas exclusivas de planes propios · perfil dentro de la app con sus recomendaciones |

Un embajador Oro que además compra alcanza rápido los niveles altos de comprador: los dos sistemas se alimentan.

### 23.7 Qué se ve en la web admin

- Cola de aprobación de embajadores con sus redes.
- Lista de embajadores: ventas, ganancias, conversión, tasa de reembolso de lo que trae, nivel, estado.
- Campañas activas con presupuesto comprometido por organizador.
- Comisiones por pagar (pasivo con embajadores) y cola de retiros, igual que la de organizadores.
- Configuración editable: porcentaje por nivel, fee de gestión, ventana de atribución, mínimo de retiro, bonos del ranking.
- Reporte de **CAC por embajador**: cuánto te cuesta cada comprador nuevo traído por ese canal frente a la publicidad pagada. Si un embajador trae compradores que vuelven, súbele la comisión; si trae gente que compra una vez y no regresa, bájala.

### 23.8 Modelo de datos

**affiliates** — `user_id`, `code`, `status` (pending/approved/suspended), `tier`, `socials jsonb`, `city_id`, `followers_estimate`, `default_share_pct`, `approved_by`, `notes`.

**affiliate_campaigns** — `event_id`, `organizer_id`, `type` (open/invite), `organizer_commission_type` (percent/amount), `organizer_commission_value`, `buyer_discount_pct`, `max_tickets`, `min_affiliate_tier`, `starts_at`, `ends_at`, `status`, `budget_committed`.

**affiliate_campaign_members** — `campaign_id`, `affiliate_id`, `joined_at`, `link_slug`, `status`.

**affiliate_clicks** — `affiliate_id`, `event_id`, `campaign_id`, `device_hash`, `ip_hash`, `user_id` (si hay sesión), `created_at`.

**affiliate_commissions** — `affiliate_id`, `order_id`, `campaign_id`, `source` (platform_share/organizer), `base_amount`, `rate`, `amount`, `platform_fee`, `status` (pending/available/paid/reversed), `available_at`.

**affiliate_balances** y **affiliate_withdrawals** — misma estructura que las del organizador, reutilizando el motor de retiros.

Campos añadidos: `orders.affiliate_id`, `orders.affiliate_code`, `orders.attribution_type` (code/link), `events.visibility`, `events.min_tier`, `ticket_types.min_tier`, `event_invitations` (`event_id`, `user_id`, `sent_at`, `opened_at`, `used`).

### 23.9 En qué fase se construye

- **Fase 2**: rol de embajador, código y link, atribución, comisión desde la comisión de Plann, panel básico, retiros, admin.
- **Fase 3**: marketplace de campañas del organizador, códigos con descuento, niveles de embajador, ranking y bonos, reporte de CAC.

---

## 24. Arranque en frío: la etapa Cartelera

El problema más grande de Plann no es técnico. Sin organizadores no hay eventos, sin eventos no hay compradores, y sin compradores ningún organizador se molesta en publicar. Se rompe por un lado: **Plann arranca siendo la cartelera de Lara, no una tienda.**

Con dos personas operando, esta es la ruta recomendada: **Cartelera + un organizador aliado**. La cartelera no requiere operación diaria y te consigue usuarios; el aliado te da la primera venta real. Los planes propios de Plann quedan para después, porque producir un tour consume el tiempo que necesitas para la app.

### 24.1 Qué es el modo cartelera

La app se publica con todos los eventos que están pasando en Barquisimeto, aunque el organizador no tenga cuenta. Cada uno se carga como **evento informativo**:

- Ficha completa: foto, título, categoría, fecha, hora, lugar con mapa, precio referencial, descripción corta.
- Etiqueta clara **«Información»** y una línea honesta: «Este evento todavía no se vende en Plann». Botón «Ver en Instagram del organizador» o «Escribir por WhatsApp».
- Botón **«¿Es tu evento? Recláma­lo»**, que lleva al flujo de registro de organizador con ese evento ya cargado.
- Campo interno `source` = `curated` y `claimed_by` cuando el organizador lo reclama.

El usuario abre Plann y encuentra valor desde el día uno aunque no pueda comprar nada. Ese es todo el punto.

### 24.2 Reglas para no meterte en problemas

- Solo **información pública**: lo que el organizador ya publicó en sus redes.
- **No usar el flyer del organizador como imagen principal** sin permiso. Mejor: foto del lugar, foto genérica de la categoría o una imagen propia con el sistema visual de Plann. Si el organizador da permiso, se usa su flyer.
- Siempre con **crédito y link al organizador**. Plann no se presenta como vendedor ni recibe dinero de ese evento.
- Retirar cualquier evento a pedido del organizador en menos de 24 h, sin discutir.
- Nunca inventar precios, cupos o datos. Si no se sabe la hora, se deja vacío.

### 24.3 De dónde sale el contenido

Una persona, dos o tres horas a la semana: Instagram de locales, productoras y bares; grupos de WhatsApp de eventos de Barquisimeto; carteleras de teatros, el Estadio Antonio Herrera Gutiérrez y centros culturales; ferias y fiestas patronales de Lara; agencias de turismo con salidas a Cubiro, Sanare, Yacambú y El Tocuyo.

Meta del primer mes: **80 a 120 eventos publicados** y la cartelera siempre con algo para el fin de semana siguiente. Una cartelera vacía es peor que no tener app.

### 24.4 Cómo se convierte en ventas

1. Publicas la cartelera y la mueves: **Plann Semana** cada jueves en Instagram y por WhatsApp, con los planes del fin de semana. Este contenido es lo que te trae usuarios sin gastar en publicidad.
2. A las dos o tres semanas ya puedes decirle a un organizador algo concreto: «tu evento tuvo 430 visitas en Plann y 90 personas lo guardaron». Eso convence más que cualquier presentación.
3. Ahí le ofreces el paquete de entrada (24.5) y su siguiente evento se vende dentro de Plann.
4. Cuando 15 o 20 eventos se venden en la app, la cartelera deja de ser el producto y pasa a ser el fondo del catálogo.

### 24.5 Oferta para los primeros 10 organizadores

Están haciéndote el favor a ti, no al revés. La oferta debe ser imposible de rechazar:

- **0 % de comisión en sus dos primeros eventos.** Solo cobras el fee de servicio al comprador.
- Plan **Pro gratis por 6 meses** y nivel Plata de arranque.
- **Importación gratis de sus ventas anteriores**: si ya vendió 300 entradas por WhatsApp, sube su lista y Plann genera los 300 QR y le presta el escáner. No le cambias su forma de vender, le resuelves la puerta.
- **Tú en la puerta el día del evento**, con tu teléfono y el respaldo. La primera vez se acompaña, no se manda un instructivo.
- Liquidación en 24 h durante los primeros tres meses.
- Su logo en la portada de la app como organizador fundador.

A quién buscar primero: un local nocturno con eventos semanales (volumen y repetición), una productora de conciertos medianos (ticket alto), una agencia de tours (margen y perfil distinto) y un espacio cultural o teatro (constancia y público que no se pelea). Con esos cuatro perfiles cubres todo el catálogo.

### 24.6 Métricas de la etapa cartelera

Se revisan cada lunes, y solo estas:

| Métrica | Meta mes 1 | Meta mes 3 |
|---|---|---|
| Eventos en cartelera | 100 | 250 |
| Usuarios registrados | 500 | 3.000 |
| Visitas a fichas de evento por semana | 1.500 | 10.000 |
| Organizadores que reclaman su evento | 3 | 15 |
| Eventos vendidos dentro de Plann | 1 | 20 |
| GMV | Lo que salga | $3.000 |

Si al mes 3 la cartelera tiene tráfico pero ningún organizador quiere vender contigo, el problema no es la app: es la oferta o la confianza, y ahí hay que sentarse a hablar con cinco organizadores antes de programar una línea más.

---

## 25. Manejo del dinero y riesgo cambiario

Plann no es solo una app: durante unos días **tiene en la mano plata que no es suya**. Esta sección define qué se hace con ese dinero. Es la parte que arruina a las plataformas de tickets cuando sale mal.

### 25.1 El problema, con números

Vendes un ticket de $10. Lo cobras en bolívares a la tasa de hoy. Le pagas al organizador $9 dentro de diez días. Si el bolívar se devalúa 8 % en esos diez días, los bolívares que tienes guardados ya no compran $9: compran $8,28. Tu comisión de $1 desapareció y encima pusiste $0,28. **Vendiste, cumpliste, y perdiste plata.**

Tres decisiones evitan esto, y hay que tomarlas las tres.

### 25.2 Decisión 1 — Tasa de cobro

- El precio se fija y se muestra en **USD**. Siempre.
- El cobro en bolívares usa la **tasa Plann** = tasa BCV del día + **margen configurable**. Por defecto **3 %** [DECIDIR]. La app muestra: `≈ Bs 26.460 · tasa de hoy`.
- La tasa se congela al crear la orden y queda guardada en `orders.rate_used`; vale durante los 15 minutos de bloqueo.
- El margen se edita desde el panel de monetización (sección 21) y es lo primero que se sube cuando la brecha cambiaria se abre.

### 25.3 Decisión 2 — Barrido diario

**No se acumulan bolívares.** Todos los días, a una hora fija, lo recaudado en Bs se convierte a dólares (USDT, efectivo o cuenta en el exterior, lo que sea operativo ese mes) dejando solo lo necesario para gastos en Bs.

- Nunca dejar bolívares quietos más de **48 horas**.
- Cada barrido se registra en el admin: monto en Bs, tasa de conversión real obtenida, monto en USD resultante. Eso te dice si el margen del 3 % alcanza o no.
- Si la tasa real de conversión es peor que la tasa Plann de forma sostenida, el margen está mal calibrado.

### 25.4 Decisión 3 — En qué moneda se le paga al organizador

Regla por defecto, y la más sana: **se le paga en la misma moneda en que se cobró la venta.**

| Venta cobrada en | Pago al organizador |
|---|---|
| Bolívares (pago móvil, transferencia) | Bolívares, calculados con la tasa del **día de la venta** (`rate_used`) |
| USD (Zelle, Binance, tarjeta) | USD |

Así el riesgo cambiario no lo llevas tú ni se lo endosas de forma escondida al organizador: cada quien recibe lo que realmente entró. Esto se escribe en el contrato con organizadores y se muestra en su panel: «$9,00 · Bs 23.814 a tasa del 12 de sep».

Si algún organizador exige que le pagues en dólares una venta cobrada en bolívares, eso se cobra aparte como conversión, con el mismo margen.

### 25.5 Dinero de terceros: la regla que no se rompe

El saldo de los organizadores **no es ingreso de Plann**. Se maneja separado:

- **Cuenta operativa**: comisiones, fees, suscripciones, destacados. De ahí salen tus gastos y tu sueldo.
- **Cuenta de terceros**: el neto que les pertenece a los organizadores hasta que se les paga.
- El panel de admin muestra siempre, en la portada, la **posición de caja**: cuánto tienes en total, cuánto le debes a organizadores y embajadores, y cuánto es realmente tuyo. Si el segundo número supera al primero, estás técnicamente quebrado aunque el banco se vea lleno.
- **Nunca** se usa el dinero de los organizadores para gastos de Plann, ni «por unos días». Es la forma número uno en que estas plataformas mueren.
- Colchón de reembolsos: mantener siempre al menos el **5 % del GMV del último mes** disponible para devolver sin pedirle plata a nadie.

### 25.6 Operación bancaria

- Varias cuentas receptoras por si una se congela o llega al límite diario de pago móvil. Mínimo dos bancos distintos desde el inicio, rotando cuál se muestra en la app (ya está previsto en `receiving_accounts`).
- Los bancos ponen **límites diarios y mensuales** a pago móvil. Un evento grande puede toparlos en una noche: hay que conocerlos antes y tener alternativa lista.
- Cuenta jurídica con RIF para poder afiliar pago móvil comercial y pedir el API (sección 15).
- Zelle y Binance necesitan la entidad fuera de Venezuela.
- **Cierre de caja diario**: qué entró, qué se verificó, qué quedó pendiente, cuánto se barrió, tasa obtenida. Diez minutos al día, y es lo que te salva cuando algo no cuadra.
- El IGTF aplica a pagos en divisas: confírmalo con el contador antes de definir el precio final que ve el comprador.

### 25.7 Lo que no se hace, nunca

- Guardar bolívares esperando que la tasa mejore. Eso es especular con plata ajena.
- Prometer una tasa fija por más de 15 minutos.
- Pagarle a un organizador con la venta de otro para tapar un hueco.
- Gastar el float. Si necesitas capital, se pone de tu bolsillo y se registra como aporte, no se toma de la caja.
- Vender un evento de un organizador no verificado con liquidación inmediata.

---

## 26. Plan real: MVP en 4 semanas

El roadmap de la sección 13 es el destino. Esto es el primer paso, y reemplaza a la Fase 1 como objetivo inmediato. La Fase 1 completa es trabajo de meses para un equipo; intentarla de una te deja en el mes cuatro con medio producto y cero usuarios.

**Objetivo único de estas 4 semanas: vender el ticket de un evento real y validarlo en la puerta.** Un organizador, un evento, una ciudad. Nada más.

Equipo: tú + una persona de confianza. Ella se encarga de la cartelera y de verificar pagos; tú construyes.

### 26.1 Qué se construye y qué no

| Sí | No todavía |
|---|---|
| Registro con correo y Google | Apple Sign In (solo si sales en iOS), redes sociales |
| Lista de eventos + ficha de evento | Mapa, filtros avanzados, búsqueda con texto completo |
| Un solo tipo de ticket por evento | Varios tipos, cupones, early bird, mesas |
| Checkout con pago móvil y Zelle, referencia + captura | Binance, tarjeta, saldo, cuotas |
| Verificación **manual** desde una pantalla fea de admin | Conciliación automática, APIs bancarias |
| Ticket con QR firmado y código corto | Transferencia de tickets, PDF bonito, wallet |
| Escáner con validación en línea y lista offline descargable | Sincronización entre varios escáneres |
| Pantalla de asistentes y contador de check-in | Dashboard con gráficas |
| Pago al organizador calculado a mano con una consulta | Módulo de retiros con estados |
| Cartelera con eventos informativos | Reclamar evento automático (se hace a mano) |

Puntos, niveles, embajadores, destacados, suscripciones, reembolsos automáticos, reseñas, planes propios: **nada de eso existe todavía.** Está todo escrito en este documento para cuando toque, no para ahora.

### 26.2 Semana a semana

**Semana 1 — Cimientos.**
Monorepo, Supabase, Expo, Next.js. Tokens de la identidad visual. Migración inicial con solo las tablas que hacen falta: `users`, `organizers`, `events`, `ticket_types`, `orders`, `payments`, `tickets`, `receiving_accounts`, `exchange_rates`, `settings`, con RLS. Auth funcionando. Pantalla de lista y ficha de evento con datos de prueba.
*Al terminar la semana:* abres la app en tu teléfono y ves eventos reales de Barquisimeto cargados a mano.

**Semana 2 — Comprar.**
Checkout completo: crear orden, bloqueo de 15 minutos, mostrar datos de pago con botón copiar, monto en Bs con céntimos únicos, formulario de referencia y captura. Estados de la orden. Pantalla «verificando tu pago» en tiempo real. Emisión de tickets con QR firmado. Pantalla «Mis tickets» con QR que abre sin internet.
*Al terminar la semana:* te compras un ticket a ti mismo y te llega.

**Semana 3 — Cobrar y validar.** (Incluye ya los estados de error de la sección 30.1 y la reserva atómica de cupo de la 29.2: no son adornos, son el núcleo.)
Admin mínimo: lista de pagos por verificar con la captura, aprobar o rechazar en un clic, ver órdenes, ver tickets, cargar eventos, editar la tasa del día. Escáner en la app con pantalla de válido / usado / inválido, lista offline y búsqueda por nombre o código. Contador de check-in.
*Al terminar la semana:* haces un simulacro completo con cinco amigos, cobrando de verdad, y escaneas en la puerta de tu casa.

**Semana 4 — Evento real.**
Arreglar todo lo que se rompió en el simulacro. Textos, errores, estados vacíos. Publicar en Google Play (interno o beta abierta) y TestFlight. Cargar el evento del organizador aliado. Vender. Estar en la puerta el día del evento con el escáner, la lista impresa de respaldo y un teléfono cargado.
*Al terminar la semana:* tienes dinero en la cuenta, tickets validados y una lista larguísima de cosas que corregir. Esa lista vale más que este documento.

### 26.3 Protocolo del día del evento

No es opcional, se prepara antes:

- Lista de asistentes **impresa** ordenada por apellido, con código corto de cada ticket.
- Los tickets llevan un **código de 6 caracteres** que sirve para buscar a mano si el QR no abre.
- Dos teléfonos con el escáner, ambos cargados, y una batería externa.
- Modo offline probado **el día anterior**, no ese mismo día.
- Un número de WhatsApp atendido durante todo el evento para el que tenga problemas en la puerta.
- Regla de oro: **ante la duda, la persona entra.** Un colado cuesta menos que un cliente humillado en la puerta del evento de tu primer organizador.

### 26.4 Turnos de verificación de pagos

Con verificación manual, esto es un turno de trabajo real hasta que llegue la conciliación automática.

- Horario publicado en la app: por ejemplo de 8 a. m. a 12 a. m., con promesa de verificación en menos de 15 minutos.
- Ustedes dos se reparten el día. Fuera de horario, la app avisa antes de pagar: «verificamos entre las 8 a. m. y las 12 a. m.; tu ticket queda reservado».
- El día de un evento grande, las dos personas disponibles desde tres horas antes.
- Alarma en el admin cuando un pago lleva más de 10 minutos esperando.
- Esta es la principal razón para priorizar la conciliación automática apenas el MVP funcione: no escala con personas.

### 26.5 Cuándo pasar a la siguiente fase

No se construye nada nuevo hasta cumplir estas tres:

1. Un evento vendido de punta a punta, con check-in real.
2. Menos de 15 minutos promedio de verificación de pago durante ese evento.
3. El organizador dice que lo volvería a usar y acepta cobrar comisión la próxima vez.

Cumplidas las tres, se abre la Fase 1 completa de la sección 13 y se empieza por lo que más duele: la conciliación automática de pagos.

---

## 27. Canales de venta: puntos físicos y taquilla

La app no es el único mostrador. En Venezuela una parte grande del público paga en efectivo, no tiene cuenta en dólares o simplemente no le compra a una app que no conoce. Estos canales usan el mismo motor (orden, ticket, QR) y suman ventas sin cambiar nada del núcleo.

El tercer canal, los embajadores e influencers, ya está en la sección 23.

### 27.1 Puntos de venta físicos («Plann Punto»)

Bodegas, cyber, tiendas de celulares, agencias de lotería: negocios de barrio que venden tickets en efectivo.

**Cómo funciona.**
1. El comercio se registra como **Punto Plann** (rol nuevo, verificado por el admin) y **deposita un saldo prepago** a Plann, por ejemplo $100.
2. Llega un cliente, pide el ticket de un evento. El comercio lo busca en su pantalla de la app, pone el nombre, cédula y teléfono del cliente, y confirma.
3. El saldo del comercio baja por el precio del ticket menos su comisión. El ticket se emite al teléfono del cliente por WhatsApp y además se le entrega **impreso o escrito** el código corto de 6 caracteres, que sirve para entrar sin teléfono.
4. Cuando el saldo baja del mínimo, recarga.

**Números.** Comisión del punto: **$0,50 por ticket** o **4 %**, el que sea mayor [editable]. Sale del fee de servicio y de tu comisión, no del organizador. Es caro por ticket pero te trae a un cliente que de otra forma no existía, y ese cliente después se registra en la app.

**Reglas.**
- Prepago siempre. Nunca fiado: si el comercio no tiene saldo, no vende. Así el riesgo de cobranza es cero.
- El punto no maneja devoluciones ni reclamos: solo vende. Todo lo demás va a soporte de Plann.
- Cada venta queda con el punto que la hizo, para medir cuáles funcionan y cuáles no.
- Cierre semanal: el admin ve ventas, comisión ganada y saldo de cada punto.

**Dónde empezar.** Tres o cuatro puntos cerca de las zonas donde se hacen los eventos, no repartidos por toda la ciudad. Uno bueno vende más que diez tibios.

### 27.2 Modo taquilla (venta en la puerta)

Hoy la venta en la puerta se anota en una libreta y es donde más plata se pierde y se roba. Con el modo taquilla el organizador vende desde la misma app:

- Pantalla de venta rápida: tipo de ticket, cantidad, método (efectivo, pago móvil, punto de venta propio), nombre del comprador opcional.
- Emite el ticket, lo marca como check-in inmediato y lo suma al contador de aforo.
- Comisión de Plann sobre esas ventas: **reducida** [DECIDIR — por defecto la mitad de la comisión normal], porque tú no trajiste ese cliente; pero sigue contando en el sistema, que es lo que le da el control al organizador.
- Cierre de taquilla al final: cuánto se vendió en efectivo, cuánto en pago móvil, cuántos entraron. El organizador cuadra su caja en un minuto.
- Funciona offline y sincroniza después.

### 27.3 Venta asistida por WhatsApp

Para el comprador que escribe en vez de comprar. El equipo de Plann (o el organizador) le genera un **link de pago** con la orden ya armada: el cliente toca, paga y recibe su ticket. Sirve además para personas mayores y para compras de varias entradas con datos de cada asistente.

### 27.4 Comparación de canales

| Canal | Costo para Plann | Para quién | Fase |
|---|---|---|---|
| App directa | 0 | Público con banco y teléfono | MVP |
| Embajador / influencer | 30–45 % de tu comisión | Público de redes | Fase 2 |
| Promotor / RRPP del organizador | 2 pts de fee a favor tuyo | Vida nocturna | Fase 2 |
| Punto de venta físico | $0,50 o 4 % por ticket | Efectivo, sin banco, sin app | Fase 3 |
| Taquilla en la puerta | Comisión reducida | Decisión de último minuto | Fase 3 |
| Venta asistida | Tiempo del equipo | Mayores, compras grupales | Fase 2 |

Regla para no perder plata: **la suma de todos los descuentos y comisiones de canal nunca puede dejar la comisión neta de Plann por debajo del 3 %** en una venta. El sistema lo valida antes de aplicar el último descuento.

---

## 28. Requisitos de tiendas, privacidad y datos personales

Esto se prepara **antes** de subir la app, no cuando te la rechacen. Un rechazo de Apple cuesta entre tres y siete días de ida y vuelta, y siempre pasa la semana que tienes el evento encima.

### 28.1 Borrado de cuenta (obligatorio)

Google Play y Apple exigen que el usuario pueda borrar su cuenta **desde dentro de la app** y también desde una página web accesible sin iniciar sesión (`plann.app/borrar-cuenta`). Sin esto no te publican.

Qué pasa al borrar:

| Se borra | Se conserva y por qué |
|---|---|
| Nombre, foto, correo, teléfono, cédula | Órdenes pagadas y tickets emitidos, en forma **anonimizada** (obligación contable y fiscal, 5 años) |
| Favoritos, intereses, historial de búsqueda | Registro contable de comisiones, retiros y reembolsos |
| Reseñas (o se anonimizan, a elección del usuario) | Registro de auditoría de acciones administrativas |
| Tokens de notificaciones y dispositivos | |
| Documentos de KYC si es organizador sin obligaciones pendientes | Documentos de KYC de organizadores con dinero pendiente o disputas abiertas |

Reglas del flujo: aviso claro de qué se pierde, confirmación escribiendo la palabra BORRAR, **bloqueo si tiene tickets de eventos futuros o saldo pendiente** (primero se resuelve eso), ejecución en máximo 30 días con correo de confirmación, y ventana de 7 días para arrepentirse. Todo queda en `deletion_requests`.

### 28.2 Permisos y cómo se piden

Nunca al abrir la app. Cada permiso se pide en el momento exacto en que hace falta, con una pantalla previa que explica para qué:

| Permiso | Cuándo se pide | Texto |
|---|---|---|
| Cámara | Al tocar «Escanear» o «Subir captura» | «Para leer los códigos QR en la puerta de tu evento» |
| Ubicación (mientras se usa) | Al tocar «Cerca de ti» o el mapa | «Para mostrarte lo que hay cerca. Puedes elegir tu ciudad a mano» |
| Notificaciones | Después de la primera compra, no antes | «Para avisarte cuando tu ticket esté listo» |
| Fotos | Al subir la captura del pago | — |

Nunca ubicación en segundo plano, nunca contactos, nunca identificadores de publicidad. Cada permiso negado debe tener camino alternativo: sin cámara se escribe el código a mano, sin ubicación se elige la ciudad de una lista.

### 28.3 Formulario de seguridad de datos

Ambas tiendas piden declarar qué recolectas y para qué. Lo tuyo, declarado con honestidad:

- **Identidad**: nombre, correo, teléfono, cédula (solo cuando el organizador la exige o para verificación de organizador). Uso: funcionamiento de la app y prevención de fraude. No se comparte con terceros salvo el organizador del evento al que compraste.
- **Pagos**: referencia y captura del pago. Nunca se guardan datos de tarjeta; eso lo maneja la pasarela.
- **Ubicación aproximada**: solo para mostrar eventos cercanos. No se guarda historial.
- **Uso de la app**: análisis anónimo de producto y reportes de error.
- Nada se vende a terceros. Nada se usa para publicidad dirigida fuera de Plann.

### 28.4 Documentos que hay que tener publicados

En `plann.app`, accesibles sin cuenta y enlazados desde la app: términos y condiciones para compradores, términos para organizadores, política de privacidad, política de reembolsos, política de cookies de la web, y página de contacto con correo y WhatsApp reales. Redactados con un abogado en Venezuela antes de publicar; la sección 15 tiene lo que debe cubrir.

### 28.5 Clasificación por edad y contenido

- Si listas eventos 18+ (fiestas con alcohol, contenido adulto), la app sube de clasificación. Declara «acceso a contenido restringido por edad» y filtra por defecto ese contenido para cuentas sin edad confirmada.
- Pide **fecha de nacimiento** en el registro (sirve además para el bono de cumpleaños de los puntos) y bloquea la compra de eventos con `min_age` superior.
- Nunca vender tickets de eventos 18+ a cuentas de menores, ni mostrarlos en el inicio.

### 28.6 Retención y minimización de datos

- Cédula del asistente: solo se pide si el organizador la exige. Se muestra al organizador únicamente hasta **30 días después del evento**, y luego queda oculta salvo para el admin.
- Capturas de pago: se borran a los **12 meses**; la referencia y el monto se conservan porque son el respaldo contable.
- Documentos de KYC de organizadores: bucket privado, URLs firmadas de 5 minutos, borrado a los 5 años de cerrar la cuenta.
- Tarea programada mensual que ejecuta estas reglas sola. Nada se conserva «por si acaso».

### 28.7 Otros requisitos de tienda

- Cuenta de desarrollador a nombre de la empresa, con dirección verificable (Google exige verificación de identidad del desarrollador).
- Capturas de pantalla, ícono 1024×1024, descripción y palabras clave en español.
- **Apple**: si hay login con Google, es obligatorio ofrecer Sign in with Apple. Los tickets de eventos físicos están exentos del pago dentro de la app; la membresía Plann Black no lo está, por eso se vende solo en la web (sección 19.5) y no se menciona ni se enlaza desde iOS.
- Versión mínima forzada: pantalla de «actualiza para continuar» cuando una versión vieja ya no sea segura para cobrar.
- Cuenta de prueba con datos de acceso para el revisor, con un evento de ejemplo comprable sin pagar de verdad. Sin esto, rechazo casi seguro en una app de pagos.

---

## 29. Venta a alta demanda y recuperación de cuenta

Dos cosas que solo se notan cuando ya es tarde: vender más entradas de las que existen, y que alguien pierda el acceso a la cuenta donde están sus tickets.

### 29.1 El problema de la sobreventa

Salen 500 entradas de un artista conocido. A las 8:00 p. m. en punto, 400 personas tocan «Comprar» en el mismo segundo. Si cada una lee «quedan 500», resta uno y guarda, terminas vendiendo 520 entradas de 500. Eso no lo arregla un `if` en la app: **el cupo se descuenta en la base de datos, de forma atómica, o no se descuenta.**

### 29.2 Cómo se resuelve

**Reserva atómica en una sola operación.** El descuento del inventario y la creación de la orden ocurren dentro de una función SQL con bloqueo de fila:

```sql
-- dentro de una transacción, en la Edge Function create-order
update ticket_types
   set reserved = reserved + :cantidad
 where id = :ticket_type_id
   and quantity - sold - reserved >= :cantidad
returning *;
-- si no devuelve fila: no hay cupo, se rechaza la orden
```

Nunca se lee el cupo y después se escribe: se escribe con la condición adentro. Si la condición falla, la orden no nace y el usuario ve «se agotó mientras pagabas» con una salida digna (lista de espera, otro tipo de ticket, otra fecha).

**Tres contadores, no uno.** `quantity` (total), `sold` (pagado) y `reserved` (bloqueado con orden pendiente). Disponible = `quantity − sold − reserved`. Al pagarse, `reserved` baja y `sold` sube; al expirar la orden, `reserved` baja y nada más.

**Expiración confiable.** Un cron cada 60 segundos libera las órdenes vencidas. Si esa tarea se cae, el inventario se congela: hay que monitorearla y alertar si no corre.

**Idempotencia.** Con mala señal la gente toca «Comprar» tres veces. Cada intento lleva una `idempotency_key`: el segundo y el tercero devuelven la misma orden, no crean tres.

**Un límite por persona.** Máximo de tickets por orden y por usuario por evento, validado en el servidor, no en la app. Es lo único que frena a los revendedores el día de una venta grande.

**Pruebas antes del evento.** Antes de la primera venta grande hay que simular 300 compras simultáneas contra el entorno de pruebas y confirmar que el inventario cierra exacto. Si no se probó, va a fallar.

### 29.3 Sala de espera (fase 3)

Para ventas que se saben grandes, el organizador activa la sala de espera:

- Antes de la hora, la gente entra a una pantalla que dice «la venta abre en 4:32». Al abrir, se le asigna un **turno aleatorio**, no por orden de llegada, para que no premie a quien tiene mejor internet.
- Se deja pasar a compradores por tandas (por ejemplo 50 cada 30 segundos), cada uno con 8 minutos para completar la compra.
- La pantalla muestra siempre la posición: «Eres el 340 de 1.200. Tiempo estimado: 6 minutos». Nada peor que esperar sin saber.
- Los niveles Élite y Black entran en la primera tanda: es uno de los beneficios más valiosos de la escalera (sección 19.3).
- Se implementa con una tabla de turnos y realtime, sin necesidad de infraestructura aparte.

### 29.4 Cuando igual se vende de más

Pasa. Si ocurre, la política es fija y se cumple sin discutir: se honran **todos** los tickets vendidos, se le paga al organizador lo que corresponda, y Plann asume el costo de la diferencia (entradas adicionales negociadas con el organizador, o reembolso del 200 % a quienes acepten no ir). La culpa es del sistema, nunca del comprador. Esto se escribe en los términos.

### 29.5 Recuperación de cuenta

Un ticket es dinero. Si alguien pierde el acceso a su cuenta, perdió su entrada, y esa persona no vuelve nunca.

**Casos que hay que cubrir:** cambió de teléfono, perdió el acceso al correo, se registró con Google y ya no entra a esa cuenta, escribió mal el correo al registrarse, le robaron el teléfono.

**Flujo de recuperación:**

1. En el login, «No puedo entrar a mi cuenta».
2. Se le pide lo que solo el dueño sabe: teléfono usado, **cédula**, y datos de una compra (evento, fecha aproximada, banco y referencia del pago o el código corto del ticket).
3. El sistema busca coincidencias. Con **dos o más datos verificados** que casen con una orden pagada, se genera un ticket de soporte con toda la evidencia ya cargada.
4. El equipo revisa y, si cuadra, cambia el correo de la cuenta y envía un enlace de acceso al nuevo. Cambio registrado en la auditoría.
5. Bloqueo de seguridad: después de un cambio de correo, no se puede retirar saldo ni transferir tickets durante **48 horas**, y se avisa al correo anterior.

**Prevención, que es mejor:**
- Pedir el teléfono en la primera compra y verificarlo con un código. Un teléfono verificado resuelve el 90 % de estos casos solo.
- Mandar el ticket **también por WhatsApp y por correo**, con su código corto de 6 caracteres. Aunque pierda la cuenta, tiene el código, y con el código entra al evento.
- En la puerta siempre se puede buscar por cédula o nombre: el acceso al evento nunca depende de que la app funcione.

---

## 30. Errores, estados vacíos, gama baja y accesibilidad

Esta es la parte que nadie escribe y que se lleva un tercio del trabajo real. En una app que cobra dinero, lo que pasa cuando algo falla es lo que decide si la gente vuelve.

### 30.1 Catálogo de estados de error

Cada uno con su pantalla, su texto y su salida. Nunca un mensaje técnico, nunca un callejón sin salida: **siempre un botón que haga algo**.

| Situación | Qué se le dice | Salida |
|---|---|---|
| Sin conexión | «No hay internet. Tus tickets siguen aquí» | Botón reintentar · Mis tickets funciona igual |
| Se cayó el servidor | «Estamos con problemas. Ya lo estamos viendo» | Reintentar · WhatsApp de soporte |
| Se agotó mientras pagabas | «Se agotaron mientras completabas el pago. No te cobramos» | Lista de espera · otro tipo de ticket · otra fecha |
| Expiró el bloqueo de 15 min | «Tu reserva expiró y liberamos los puestos» | Volver a intentar con un toque |
| Referencia de pago rechazada | «No encontramos ese pago. Revisa la referencia» + motivo exacto | Corregir referencia (una vez) · escribir a soporte |
| Pago por un monto distinto | «Recibimos Bs X y esperábamos Bs Y» | Pagar la diferencia · reembolso |
| Evento cancelado por el organizador | «El organizador canceló. Te devolvemos todo» | Ver estado del reembolso |
| QR inválido en la puerta | «Este ticket no es válido» con el motivo | Buscar por cédula · llamar al soporte de Plann |
| Ticket ya usado | «Ya se usó a las 8:42 p. m.» | Buscar por nombre · decisión del staff |
| Cámara sin permiso | «Necesitamos la cámara para escanear» | Abrir ajustes · escribir el código a mano |
| Sesión vencida | «Vuelve a entrar» | Login con el correo ya escrito |
| Versión vieja de la app | «Actualiza para seguir comprando» | Ir a la tienda |
| Fuera del horario de verificación | «Verificamos entre 8 a. m. y 12 a. m. Tu ticket queda reservado» | Pagar igual · avisar cuando esté listo |

Regla de tono: se dice qué pasó, si hay dinero de por medio se aclara de inmediato **si se cobró o no**, y se ofrece una salida. Sin signos de exclamación, sin culpar al usuario, sin códigos de error a la vista (van en el reporte a Sentry, no en pantalla).

### 30.2 Estados vacíos

Cada lista vacía es una oportunidad, no un hueco:

- **Mis tickets vacío**: «Todavía no tienes tickets» + los 3 planes más populares de tu ciudad esta semana.
- **Favoritos vacío**: explicación de para qué sirve + botón explorar.
- **Búsqueda sin resultados**: «No encontramos "X"» + sugerencias cercanas, categorías y eventos del fin de semana. Nunca una pantalla en blanco.
- **Ciudad sin eventos**: «Todavía no hay planes en Y» + avísame cuando haya + ver Barquisimeto.
- **Organizador sin eventos**: botón grande de crear el primero, con la plantilla de ejemplo.
- **Panel del organizador sin ventas**: «Aún no hay ventas» + los tres consejos que más funcionan (compartir el link, activar un promotor, publicar con anticipación).
- **Carga**: esqueletos de las tarjetas con el vidrio de la identidad, nunca un spinner solo en el centro.

### 30.3 Teléfonos de gama baja y poca data

Buena parte de tu público tiene un Android de 2 GB de RAM y un plan de datos apretado. Reglas duras:

- **Probar en un teléfono barato de verdad** desde la semana 2, no en el tuyo. Si no corre ahí, no corre.
- El blur del vidrio es caro: usar `expo-blur` solo en barras y hojas, no en cada tarjeta de una lista. En equipos lentos, degradar a un fondo sólido semitransparente (detección por rendimiento o ajuste manual en Perfil).
- Imágenes servidas desde Supabase Storage con transformación: **WebP, ancho máximo 800 px para tarjetas**, miniaturas de 200 px, carga diferida y placeholder borroso. Nunca servir la foto original de 4 MB que subió el organizador.
- Comprimir la imagen **antes de subirla** desde la app del organizador.
- APK liviano: sin librerías grandes para animaciones decorativas, fuentes solo con los pesos que se usan.
- **Modo ahorro de datos** en Perfil: menos imágenes, sin autoplay de video.
- Todo tiene que servir en 3G: la lista de eventos debe responder en menos de 2 segundos con conexión mala, cacheando la última respuesta.
- La pantalla de Mis tickets funciona **100 % sin internet**.

### 30.4 Accesibilidad y legibilidad

El sistema visual de la identidad se ve bien en una pantalla buena, en interiores y con 25 años. Hay que ajustarlo para el mundo real:

- **Contraste mínimo 4,5:1** para texto normal y 3:1 para títulos grandes. En la práctica: `--text-3` (56 %) y `--text-4` (46 %) no cumplen para leer datos importantes. Los metadatos que importan (fecha, hora, precio, lugar, código del ticket) suben a **74 % o más**. Las opacidades bajas quedan solo para adornos.
- Respetar el **tamaño de texto del sistema** hasta 200 %, sin que se rompan las tarjetas. Nada de textos con altura fija.
- Todo lo tocable con **44 px mínimo**, ya está en la identidad; hay que verificarlo en los íconos pequeños de la tab bar y los chevrons.
- **Etiquetas para lectores de pantalla** en todos los botones de solo ícono (corazón, compartir, cerrar, escanear).
- Nunca comunicar algo **solo con color**: un ticket válido dice «Válido», no se muestra solo en verde; un chip seleccionado además del rosa lleva peso de fuente distinto.
- El QR y el código corto, siempre juntos: quien no puede escanear, lee.
- Probarlo al sol. La pantalla de Mis tickets sube el brillo automáticamente al abrir un ticket.

### 30.5 Búsqueda que perdona

La gente escribe sin acentos y con errores: «cubiro», «yacambu», «regeton», «obelisko».

- Normalizar acentos y mayúsculas en el índice y en la consulta.
- Búsqueda difusa con `pg_trgm` en Postgres: tolera una o dos letras cambiadas.
- Sinónimos y apodos locales configurables desde el admin: «el Obelisco», «el Antonio Herrera», «el estadio», «la feria».
- Buscar también dentro de nombres de organizadores y lugares, no solo títulos.
- Si no hay resultados, sugerir: «¿Quisiste decir Cubiro?».

### 30.6 Qué hay que monitorear

- Sentry para errores, con alerta al WhatsApp del equipo si algo falla en checkout o en el escáner.
- Alarmas propias: pagos sin verificar por más de 10 minutos, tarea de expiración de órdenes caída, tasa del día sin actualizar, caída en la tasa de conversión del checkout.
- Un tablero simple con: órdenes creadas vs. pagadas hoy, tiempo medio de verificación, errores por pantalla. Se revisa cada mañana en dos minutos.
