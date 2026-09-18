# Plann — instrucciones para Claude Code

Lee PLANN-PROYECTO.md (qué construir) y PLANN-IDENTIDAD-VISUAL.md (cómo se ve) antes de tocar código.

Reglas:
- Toda lógica de dinero (totales, comisiones, saldos, emisión de tickets, estados de orden) va en `packages/core`, nunca solo en la app.
- Cálculos compartidos y validaciones viven en `packages/core` y se importan desde mobile, web y functions.
- Montos en centavos de USD (integer). Bs solo para mostrar, con la tasa guardada en la orden.
- Sigue la identidad visual exactamente: un solo acento (#E9417F), Manrope para UI, Newake solo en el logo, sin emoji en la interfaz, sin verdes/azules de éxito.
- Copy en español de Venezuela, tuteo, sin signos de exclamación.
- Antes de implementar algo marcado [DECIDIR], usa el valor por defecto y anótalo en docs/decisiones/.
- Trabaja por fases (sección 13 y 26 de PLANN-PROYECTO.md). Estado actual: MVP comprador con datos simulados (sin Supabase todavía).
- Cada función de packages/core lleva tests.
