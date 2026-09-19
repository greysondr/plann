import type { TicketType } from "./types";

export type SaleState = "on_sale" | "upcoming" | "ended" | "sold_out";

export function remaining(t: Pick<TicketType, "quantity" | "sold" | "reserved">): number {
  return Math.max(0, t.quantity - t.sold - t.reserved);
}

// Estado de una entrada para el comprador. La ventana de fechas manda sobre el cupo:
// una preventa vencida se muestra "Terminó" aunque le sobren entradas.
export function saleState(t: Pick<TicketType, "quantity" | "sold" | "reserved" | "salesStart" | "salesEnd">, now: number = Date.now()): SaleState {
  if (t.salesStart && new Date(t.salesStart).getTime() > now) return "upcoming";
  if (t.salesEnd && new Date(t.salesEnd).getTime() < now) return "ended";
  if (remaining(t) <= 0) return "sold_out";
  return "on_sale";
}

// Entrada que se preselecciona: la primera en venta; si ninguna, la próxima en abrir.
export function defaultTicketType<T extends Pick<TicketType, "quantity" | "sold" | "reserved" | "salesStart" | "salesEnd">>(types: T[], now: number = Date.now()): T | undefined {
  const onSale = types.find((t) => saleState(t, now) === "on_sale");
  if (onSale) return onSale;
  const upcoming = types
    .filter((t) => saleState(t, now) === "upcoming")
    .sort((a, b) => new Date(a.salesStart!).getTime() - new Date(b.salesStart!).getTime());
  return upcoming[0] ?? types[0];
}

// Días son de Venezuela (UTC-4): "2026-09-20" empieza a las 00:00 y termina a las 23:59:59 locales.
export function dayStartIso(day: string): string {
  return new Date(`${day}T00:00:00-04:00`).toISOString();
}
export function dayEndIso(day: string): string {
  return new Date(`${day}T23:59:59-04:00`).toISOString();
}
export function isoToVeDay(iso: string): string {
  return new Date(new Date(iso).getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}
