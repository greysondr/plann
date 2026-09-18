# 2026-09-16 — Fondo claro por defecto: falta el tema oscuro de expo-router

Al probar la app en el simulador, toda la interfaz se veía con un velo claro
encima (colores lavados, bajo contraste) aunque los estilos de cada pantalla
eran correctos. Se aisló el problema quitando piezas una por una: el fondo
ambiental (`AmbientBackground`) se veía perfecto solo, pero apenas se montaba
el `<Stack>`/`<Tabs>` de expo-router, el velo aparecía.

**Causa.** expo-router usa React Navigation por dentro pero, desde el SDK 56,
bloquea importar `@react-navigation/native` directamente (lanza un error de
compilación explícito). Sin darle un tema, usa su tema claro por defecto
(`DefaultTheme`, fondo gris claro `rgb(242,242,242)`), pintado por debajo de
cada pantalla y de cada tab — invisible sobre tarjetas con fondo propio, pero
visible en cualquier zona traslúcida o sin fondo explícito.

**Solución.** Envolver el `<Stack>` en `app/_layout.tsx` con el `ThemeProvider`
que exporta el propio paquete `expo-router` (no `@react-navigation/native`),
con un tema oscuro cuyo `background`/`card`/`border` son `"transparent"` para
que se vea el `AmbientBackground` de la identidad:

```tsx
import { DarkTheme, Stack, ThemeProvider } from "expo-router";

const plannNavigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: "transparent", card: "transparent", border: "transparent", primary: color.pink },
};
```

Además, `(tabs)/_layout.tsx` necesita `screenOptions={{ sceneStyle: { backgroundColor: "transparent" } }}`
en el `<Tabs>` (la propiedad se llama `sceneStyle`, no `sceneContainerStyle`,
en esta versión de expo-router).

**Para la próxima vez:** si algo se ve "lavado" o con bajo contraste en
cualquier pantalla nueva que use `<Stack>`, `<Tabs>` o `<Drawer>` de
expo-router, revisar primero que herede este mismo tema.
