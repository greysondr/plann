# Acceso más fácil a las herramientas del organizador

**Problema:** las herramientas estaban repartidas: una lista larga en «Más» (app) y 12 enlaces planos en la barra lateral (web), sin forma de buscar ni de ver qué requiere atención.

**App**
- `src/core/orgTools.ts`: registro único de herramientas con grupo, roles, sinónimos y `quick`. Lo usan el resumen y el menú Más (antes cada uno tenía su propia lista y sus propias reglas de rol). Con pruebas.
- Resumen: cuadrícula «Herramientas» (6 accesos según el rol) con insignias (notificaciones sin leer, ventas por confirmar) y «Ver todas».
- Más: agrupado (Eventos / Ventas y dinero / Crecimiento / Equipo y cuenta) y con buscador que ignora tildes y entiende sinónimos («dinero» → Retiros, «qr» → Escanear).
- Mis eventos: nuevo acceso «Ofertas» en cada evento.

**Web**
- Barra lateral agrupada (Gestión / Dinero / Crecimiento / Cuenta) con insignias de notificaciones y compras por confirmar; «Publicar evento» a un clic.
- Buscador global ⌘K / Ctrl+K (también desde el botón «Buscar…»): páginas y eventos, con teclado o clic, filtrado por rol.
- Dashboard: accesos rápidos según el rol.
- `src/lib/org/nav.ts` es la fuente única de la navegación web.

**Pendiente:** el menú de la app se probó por tipos y pruebas unitarias; no se recorrió en el simulador.
