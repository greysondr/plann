# Signo ⓘ de ayuda en organizador y admin

**Objetivo:** que cada función, indicador y sección explique para qué sirve sin salir de la pantalla.

- **Un solo glosario:** `apps/web/src/lib/help.ts` (texto por título o etiqueta, sin tildes ni mayúsculas). `scripts/sync-org-analytics.sh` lo copia a `apps/mobile/src/core/help.ts` (Metro no importa fuera de la app; no editar la copia).
- **Web:** `InfoTip` (pasar el mouse, foco de teclado o clic; se posiciona solo y no queda cortado por las tarjetas). `StatCard`, `CardHeader` y `PageHeader` lo muestran solos si el título está en el glosario; `help="..."` lo sobreescribe (para títulos repetidos con otro sentido, ej. «Ventas» de un evento) o `help={false}` lo oculta. También en campos clave (cupo, fechas de venta, oferta de última hora, evento comunitario) y `title` en los enlaces del menú.
- **App:** `InfoTip` (toca → ventana con la explicación) y `HelpTitle` para títulos de sección. Está en el encabezado de cada pantalla del organizador, en los indicadores (KPI), en las herramientas del resumen y en «Más».
- **Cobertura:** una prueba exige que toda herramienta del registro tenga explicación. Para la web, los títulos estáticos de `StatCard/CardHeader/PageHeader` están cubiertos (se comprobó con un script).
- **Para agregar uno nuevo:** añade la entrada en `help.ts` y corre el script de sincronización.

**Pendiente:** las ventanas de la app no se recorrieron en el simulador (compilan y pasan pruebas); encabezados de tablas y algunos campos de formularios de la app aún no tienen ⓘ.
