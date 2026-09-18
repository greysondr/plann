# 2026-09-16 — Fotos reales, mapas, puntos/niveles, flujo de organizador

A pedido de Grey, se completaron varios pasos que la primera versión del MVP
se saltaba:

- **Fotos reales**: `EventImage` reemplaza el placeholder de rayas como
  primera opción, usando fotos de Unsplash por categoría (`src/mock/data.ts`,
  función `img()`). Si la URL falla, cae automáticamente al placeholder — no
  hay pantalla rota ni espacio en blanco. Antes de publicar en tiendas hay que
  cambiar estas URLs por las fotos reales de cada organizador.
- **Mapas**: cada evento tiene `lat`/`lng` (coordenadas aproximadas reales de
  los lugares de Lara). El botón "Ver en mapa" (en la ficha del evento y en
  cada tarjeta de lista) abre Google Maps con `Linking` — la app de Google
  Maps si está instalada, si no el navegador. No se agregó un mapa
  interactivo embebido (Mapbox, sección 5.3) porque necesita una API key y un
  módulo nativo nuevo; queda para cuando haya cuenta de Mapbox.
- **Puntos y niveles (sección 19)**: `src/core/loyalty.ts` calcula el nivel
  (Explorador → Frecuente → Insider → Élite → Plann Black) según los puntos
  acumulados. A diferencia de la Fase 1 real, en este prototipo los puntos se
  acreditan **al confirmarse el pago**, no 24 h después del evento — así se
  ven de inmediato en Perfil. El canje de puntos como descuento en el
  checkout todavía no está construido.
- **Historial de compras**: `app/perfil/historial.tsx`, lista todas las
  órdenes (pagadas, pendientes, rechazadas) con su estado.
- **Convertirse en organizador ya no es instantáneo**: antes, tocar "Modo
  organizador" llevaba directo al panel como si ya se fuera un organizador
  verificado. Ahora pasa por `app/organizador/activar.tsx` (sección 3.2 y
  8.3): pide nombre/cédula, muestra los 4 pasos de verificación, y simula la
  aprobación del admin (en la Fase 1 real la aprueba una persona en menos de
  24 h).
- **Recordar evento**: botón de campana en la ficha del evento
  (`toggleReminder` en `AppStore`). Por ahora es un recordatorio **dentro de
  la app** (estado guardado + confirmación), no una notificación push real
  del sistema operativo — eso necesita `expo-notifications`, permisos, y un
  rebuild nativo nuevo. Es el siguiente paso obvio si Grey lo pide.
- **Buscar ahora categoriza**: al entrar sin buscar nada, se ve un grid de
  categorías con cuántos planes tiene cada una; al elegir una categoría o
  escribir, se ven los resultados agrupados por categoría (sección 5.3).

Se subió la versión de `AsyncStorage` (`plann.mvp.v2`) porque el modelo de
datos cambió (puntos, recordatorios, estado de organizador); esto borra los
datos de prueba de la versión anterior la primera vez que se abre la app.
