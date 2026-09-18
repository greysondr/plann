// Filtros de búsqueda (sección 5.3): fecha, precio, ciudad, cupo disponible.
import type { EventItem } from "../core/types";

export type DateFilter = "todos" | "hoy" | "manana" | "finde" | "fecha";
export type PriceFilter = "todos" | "gratis" | "menos10" | "10a30" | "mas30";

export function getMinPriceCents(event: EventItem): number | null {
  if (event.isFree) return 0;
  const prices = event.ticketTypes.map((t) => t.priceCents);
  if (!prices.length) return null; // evento informativo de la cartelera, sin tickets
  return Math.min(...prices);
}

export function getAvailability(event: EventItem): number {
  return event.ticketTypes.reduce((sum, t) => sum + Math.max(0, t.quantity - t.sold - t.reserved), 0);
}

export function matchesPriceFilter(event: EventItem, filter: PriceFilter): boolean {
  if (filter === "todos") return true;
  const min = getMinPriceCents(event);
  if (min === null) return false;
  switch (filter) {
    case "gratis":
      return min === 0;
    case "menos10":
      return min > 0 && min < 1000;
    case "10a30":
      return min >= 1000 && min <= 3000;
    case "mas30":
      return min > 3000;
    default:
      return true;
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** El próximo sábado y domingo: si hoy ya es fin de semana, es este mismo. */
function weekendRange(now: Date): { start: Date; end: Date } {
  const day = now.getDay(); // 0 = domingo, 6 = sábado
  const daysUntilSaturday = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
  const saturday = startOfDay(new Date(now.getTime() + daysUntilSaturday * 86400000));
  const sundayEnd = new Date(saturday.getTime() + 2 * 86400000); // fin del domingo (exclusivo)
  return { start: saturday, end: sundayEnd };
}

/** Formatea a "YYYY-MM-DD" en hora local, la misma clave que usa el calendario. */
export function toCalendarDateString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Convierte "YYYY-MM-DD" a un Date a medianoche local. A propósito NO se usa
 * `new Date("YYYY-MM-DD")`: el motor de JS interpreta ese formato como UTC, y
 * en husos horarios negativos (América) el día calculado queda un día antes.
 */
export function fromCalendarDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function matchesDateFilter(
  startsAtIso: string,
  filter: DateFilter,
  now: Date = new Date(),
  customDate: string | null = null
): boolean {
  if (filter === "todos") return true;
  const startsAt = new Date(startsAtIso);
  if (filter === "hoy") return isSameDay(startsAt, now);
  if (filter === "manana") return isSameDay(startsAt, new Date(now.getTime() + 86400000));
  if (filter === "finde") {
    const { start, end } = weekendRange(now);
    return startsAt >= start && startsAt < end;
  }
  if (filter === "fecha") {
    if (!customDate) return true;
    return toCalendarDateString(startsAt) === customDate;
  }
  return true;
}
