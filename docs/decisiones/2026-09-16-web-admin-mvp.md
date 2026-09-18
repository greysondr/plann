# Web admin de Plann: alcance del MVP

**Contexto.** La sección 7 de `PLANN-PROYECTO.md` describe un admin completo de
Fase 1 (conciliación bancaria por API, disputas, planes propios, monetización
con simulador, comunicación masiva, feature flags de producción, etc.). Igual
que con el móvil (ver `mvp-datos-simulados.md`), no tiene sentido construir
todo eso antes de tener organizadores y compradores reales — se construyó el
subconjunto que ya sirve para operar el negocio y ver analíticas, con datos
simulados, en `apps/web`.

**Decisión.** Next.js 16 (App Router) + TypeScript + Tailwind v4, siguiendo la
sección 17 del documento maestro. Variante clara de la identidad visual
(crema/blanco/rosa, sin blur) porque así lo pide la sección 7. Gráficas con
`recharts`, íconos con `lucide-react`.

**Dataset.** Un solo módulo (`src/lib/mock-data.ts`) genera todo el negocio
simulado con un PRNG de semilla fija (mulberry32): 10 organizadores, 42
eventos, 160 compradores y ~60 días de órdenes con tendencia de crecimiento y
picos de fin de semana. Es independiente del `AsyncStorage` del móvil — no hay
backend compartido todavía, así que los números no coinciden entre ambas apps.
Cuando exista Supabase (sección 17, `packages/db`), este módulo se reemplaza
por queries reales sin tocar las pantallas.

**Bug encontrado y corregido durante la construcción:** los estados
transitorios de una orden (`en_verificacion`, `pendiente_pago`) se generaban
con la misma probabilidad para los 60 días de historial, así que la cola de
verificación del dashboard mostraba ~77 pagos "esperando" — incluyendo
órdenes de hace semanas, que en la vida real ya se habrían resuelto en
minutos. Se corrigió para que solo las órdenes de **hoy** puedan quedar en un
estado transitorio; los días anteriores solo terminan en pagada / rechazada /
expirada / cancelada.

**Incluido en este MVP** (secciones 7.1–7.7 y 7.11–7.12, resumidas):
- Dashboard con KPIs (GMV, ingresos por vía, conversión de checkout,
  compradores, organizadores, eventos, dinero en movimiento), gráficas y
  panel de alertas (pagos atrasados, reportes, retiros grandes, reembolsos
  altos, organizadores suspendidos).
- Pagos y conciliación: cola de verificación manual con aprobar/rechazar,
  tasa BCV con historial, cuentas receptoras.
- Retiros: solicitudes, pasivo con organizadores en tiempo real.
- Organizadores: lista filtrable + ficha (KYC, saldos, eventos, órdenes,
  notas, aprobar/rechazar/suspender).
- Eventos y moderación: cola de revisión + ficha con aprobar/pedir
  cambios/rechazar/pausar/cancelar/destacar.
- Usuarios: buscador CRM + ficha (historial, notas, bloquear).
- Soporte: bandeja de tickets (solo lectura por ahora).
- Reportes: CSV reales (ventas por periodo/organizador/evento, ingresos de
  Plann, pasivo, reembolsos).
- Auditoría: registro de acciones (solo lectura).
- Configuración: comisión por plan, feature flags, equipo — editable en la
  UI pero no persistente todavía (no hay backend).

**Deferido explícitamente a cuando haya backend real:**
- Autenticación de equipo + 2FA real (hoy es una sesión fija de "Grey").
- Conciliación automática por API bancaria / CSV, disputas y reembolsos con
  flujo propio, planes propios de Plann (operaciones), panel de monetización
  con simulador, comunicación masiva (push/correo/plantillas), feature flags
  que de verdad apaguen algo en el móvil.
- Persistencia de cualquier acción (aprobar, rechazar, notas, configuración):
  todo vive en estado de React durante la sesión del navegador.
