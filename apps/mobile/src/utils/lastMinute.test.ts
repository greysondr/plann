import test from "node:test";
import assert from "node:assert/strict";
import { bestLastMinutePct, isLastMinuteActive } from "./lastMinute";
import type { EventItem, TicketType } from "../core/types";

const tt = (over: Partial<TicketType> = {}): TicketType => ({
  id: "t", eventId: "e", name: "General", priceCents: 1000, quantity: 10, sold: 0, reserved: 0, minPerOrder: 1, maxPerOrder: 6,
  lastMinutePct: 20, lastMinuteHours: 24, ...over,
});
const start = Date.parse("2026-10-01T20:00:00Z");
const ev = { startsAt: new Date(start).toISOString(), durationMinutes: 120 };

test("se activa dentro de la ventana previa al evento", () => {
  assert.equal(isLastMinuteActive(tt(), ev, start - 23 * 3600000), true);
  assert.equal(isLastMinuteActive(tt(), ev, start - 25 * 3600000), false);
});
test("no aplica después de terminar, sin cupo ni en entradas gratis", () => {
  assert.equal(isLastMinuteActive(tt(), ev, start + 3 * 3600000), false);
  assert.equal(isLastMinuteActive(tt({ sold: 10 }), ev, start - 3600000), false);
  assert.equal(isLastMinuteActive(tt({ priceCents: 0 }), ev, start - 3600000), false);
});
test("bestLastMinutePct devuelve el mayor descuento activo", () => {
  const event = { ...ev, ticketTypes: [tt({ lastMinutePct: 10 }), tt({ id: "b", lastMinutePct: 30 })] } as unknown as EventItem;
  assert.equal(bestLastMinutePct(event, start - 3600000), 30);
  assert.equal(bestLastMinutePct(event, start - 48 * 3600000), null);
});
