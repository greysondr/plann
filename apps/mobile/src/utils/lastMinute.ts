import type { EventItem, TicketType } from "../core/types";

export function isLastMinuteActive(t: TicketType, event: Pick<EventItem, "startsAt" | "durationMinutes">, now: number = Date.now()): boolean {
  if (!t.lastMinutePct || !t.lastMinuteHours || t.priceCents === 0) return false;
  const start = new Date(event.startsAt).getTime();
  const end = start + event.durationMinutes * 60000;
  return now >= start - t.lastMinuteHours * 3600000 && now < end && t.quantity - t.sold - t.reserved > 0;
}

export function bestLastMinutePct(event: EventItem, now: number = Date.now()): number | null {
  const pcts = event.ticketTypes.filter((t) => isLastMinuteActive(t, event, now)).map((t) => t.lastMinutePct as number);
  return pcts.length ? Math.max(...pcts) : null;
}
