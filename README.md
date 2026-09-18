# Plann

App de tickets, reservas y planes turísticos — Barquisimeto / Lara, Venezuela.

Este repo sigue `PLANN-PROYECTO.md` (qué construir) y `PLANN-IDENTIDAD-VISUAL.md` (cómo se ve).
Reglas de trabajo para quien toque este código (incluido Claude Code) están en `CLAUDE.md`.

## Estado actual

**MVP comprador con datos simulados** (sección 26 del documento maestro), sin Supabase
todavía. Ver la decisión completa en `docs/decisiones/2026-09-16-mvp-datos-simulados.md`.

Lo que ya funciona en `apps/mobile`:

- Inicio con categorías, destacados, tours y la "Cartelera" (eventos informativos que
  todavía no se venden en Plann).
- Buscar con filtros por categoría y texto.
- Ficha de evento con selector de tickets y cantidad.
- Checkout completo: resumen → método de pago (Pago móvil / Transferencia / Zelle) →
  datos de pago con botón copiar → referencia → "Verificando tu pago" (simulado) →
  ticket emitido con QR firmado y código corto.
- Mis tickets (Próximos / Pasados / Pendientes de pago), con QR que funciona sin
  internet (los tickets se guardan en el dispositivo).
- Modo organizador: lista de eventos propios, asistentes y un escáner (cámara QR +
  búsqueda manual por código) con pantalla de Válido / Ya usado / Inválido.

Todo el dinero (fee de servicio, comisión por plan, totales en Bs) se calcula en
`apps/mobile/src/core/pricing.ts`, con sus tests en el mismo directorio — nunca en la
pantalla directamente, para que sea directo de mover a un backend real.

## Cómo correr la app

Requisitos: Node 20+, un simulador de iOS (Xcode) o el navegador.

```bash
cd apps/mobile
npm install

# Simulador de iOS (recomendado, es lo que se usó para probar la identidad visual)
npm run ios

# o en el navegador, más rápido para iterar
npm run web
```

Los datos de eventos, organizadores y tasa de cambio son de prueba
(`apps/mobile/src/mock/data.ts`). El estado de compra (órdenes y tickets) se guarda en
el dispositivo con `AsyncStorage`, así que persiste entre reinicios de la app.

## Correr los tests del núcleo de negocio

```bash
cd apps/mobile
npm test
```

## Qué falta para que sea real (no está en el MVP actual)

Ninguno de estos pasos se puede automatizar sin que Grey cree las cuentas y comparta
las credenciales:

1. **Backend real**: crear un proyecto de Supabase, correr la migración inicial
   (`supabase/migrations`, ver más abajo) y reemplazar `apps/mobile/src/mock` y
   `apps/mobile/src/context/AppStore.tsx` por llamadas reales (Auth, Postgres, Edge
   Functions).
2. **Pagos**: cuentas bancarias jurídicas (Pago móvil comercial) y Zelle/Binance con
   una entidad fuera de Venezuela (sección 15 del documento maestro).
3. **Web admin** (`admin.plann.app`) para la cola de verificación de pagos, en vez de
   la aprobación automática simulada que usa hoy la app.
4. **Fuente Newake**: la que está en `assets/fonts/NewakeFont-Demo.otf` es la versión
   demo. Hay que comprar la licencia comercial antes de publicar en las tiendas.
5. **Publicar en tiendas**: cuentas de Google Play y Apple Developer a nombre de la
   empresa, ícono/splash definitivos y los requisitos de la sección 28 (borrado de
   cuenta, formulario de privacidad, cuenta de prueba para el revisor).

## Estructura

```
plann/
├── PLANN-PROYECTO.md            fuente de verdad del negocio
├── PLANN-IDENTIDAD-VISUAL.md    sistema de diseño
├── CLAUDE.md                    reglas para trabajar en este repo
├── assets/                      logo y fuente Newake
├── apps/
│   └── mobile/                  Expo Router — la app del comprador y del organizador
│       └── src/
│           ├── theme/           tokens de la identidad visual
│           ├── components/      vidrio, tickets, chips, íconos
│           ├── core/            precios, comisiones, máquinas de estado (con tests)
│           ├── mock/            eventos y organizadores de prueba
│           └── context/         estado de la app (órdenes, tickets, favoritos)
├── supabase/
│   └── migrations/              borrador de la migración inicial (todavía sin aplicar)
└── docs/decisiones/              una nota por cada [DECIDIR] que se resolvió con el valor por defecto
```
