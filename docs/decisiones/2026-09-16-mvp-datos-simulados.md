# 2026-09-16 — Arranque con datos simulados, sin Supabase todavía

No existe aún un proyecto de Supabase (ni cuentas de Stripe/Binance/bancos). Se decide
construir primero la app móvil (Expo) del comprador siguiendo la sección 26 del
documento maestro (MVP en 4 semanas), con datos de prueba locales en
`apps/mobile/src/mock`, y la lógica de precios/comisiones ya separada en
`packages/core` para que sea directa de conectar a Supabase apenas exista el proyecto
real. Nada de esto toca pagos reales: el checkout simula la verificación manual del
pago (pantalla "Verificando tu pago") sin cobrar dinero de verdad.

Pendiente cuando Grey cree el proyecto de Supabase: mover la migración inicial
(tablas de la sección 9/26.2) a `supabase/migrations`, generar tipos en
`packages/db`, y reemplazar `apps/mobile/src/mock` por llamadas reales.
