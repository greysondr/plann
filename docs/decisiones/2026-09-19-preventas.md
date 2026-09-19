# Preventas: ventana de venta por tipo de entrada

Migración: `20260919020000_presale_windows.sql`. Usa las columnas `ticket_types.sales_start` y
`sales_end`, que existían pero nadie leía.

- `create_order` rechaza con `sales_not_started` / `sales_ended`. La regla vive en Postgres:
  esconder el botón en la app no basta.
- Constraint `ticket_sales_window_valid`: el cierre debe ser posterior a la apertura.
- Una preventa "pasa" a general solo con fechas: la Preventa cierra el día X y la General abre el
  día X. No hay una automatización aparte; las dos ventanas lo hacen solas.
- La ventana manda sobre el cupo: una preventa vencida se ve "Terminó" aunque sobren entradas
  (`saleState` en `apps/mobile/src/core/ticketSales.ts`, con pruebas).
- Las fechas son días de **Venezuela (UTC-4)**: "20 sep" abre a las 00:00 y cierra a las 23:59:59.
- El comprador ve "Abre el ..." / "Hasta el ..." / "Terminó" / "Agotado", y se preselecciona la
  primera entrada en venta (o la próxima en abrir).
- Las cortesías (`issue_comp_tickets`) ignoran la ventana a propósito: el organizador puede
  invitar a alguien a una entrada que todavía no vende.

Se edita en app y web, al crear el evento, al agregar una entrada y en cada entrada existente.
