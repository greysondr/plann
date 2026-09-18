# 2026-09-16 — Filtros de búsqueda (sección 5.3)

Se agregó una hoja de filtros completa en Buscar, además de los chips de
categoría que ya existían: **fecha** (hoy, mañana, este fin de semana),
**precio** (gratis, menos de $10, $10–$30, más de $30), **ciudad** y **solo
con cupo disponible**. La lógica pura vive en `src/utils/eventFilters.ts`
(con tests) para que sea fácil de mover a una consulta real de Supabase más
adelante.

**Bug real encontrado y arreglado:** el primer intento usó el componente
`<Modal>` de React Native para la hoja de filtros. Ningún toque dentro del
modal funcionaba (los chips, el checkbox, nada respondía), aunque el modal se
veía y se abría bien. Se cambió por una superposición normal dentro del
árbol de vistas (`position: "absolute"` + `zIndex`, igual que la pantalla de
resultado del escáner en `organizador/escanear.tsx`), y los toques
empezaron a funcionar de inmediato. **Lección: en este proyecto, evitar
`<Modal>` de React Native para hojas/diálogos — usar una superposición
absoluta dentro de la pantalla en su lugar.**

Efecto secundario de ese cambio: la barra de tabs (que vive fuera del árbol
de la pantalla, en `(tabs)/_layout.tsx`) queda por encima de cualquier
superposición que arme una pantalla individual. Se resolvió dándole a la
hoja un `marginBottom` igual a la altura aproximada de la barra de tabs, para
que el botón principal nunca quede tapado. Si se agrega otra hoja/overlay en
una pantalla dentro de `(tabs)`, hay que repetir este ajuste o mover el
overlay a un nivel más alto en el árbol (el `Stack` raíz).
