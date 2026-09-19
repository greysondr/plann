import { test } from "node:test";
import assert from "node:assert/strict";
import { draftToTicket, validDrafts, type TicketDraft } from "./ticketDrafts";

const draft = (over: Partial<TicketDraft> = {}): TicketDraft => ({ key: "k", name: "General", price: "10", quantity: "50", ...over });

test("convierte precio en dólares a centavos", () => {
  assert.deepEqual(draftToTicket(draft({ price: "12,50" })), { name: "General", priceCents: 1250, quantity: 50, salesStart: null, salesEnd: null });
});

test("precio vacío significa gratis", () => {
  assert.equal(draftToTicket(draft({ price: "" }))?.priceCents, 0);
});

test("rechaza cupo cero, nombre corto o precio inválido", () => {
  assert.equal(draftToTicket(draft({ quantity: "0" })), null);
  assert.equal(draftToTicket(draft({ name: "A" })), null);
  assert.equal(draftToTicket(draft({ price: "abc" })), null);
  assert.equal(draftToTicket(draft({ price: "-5" })), null);
});

test("no acepta dos entradas con el mismo nombre", () => {
  assert.equal(validDrafts([draft({ key: "a" }), draft({ key: "b", name: "general" })]), null);
  assert.equal(validDrafts([draft({ key: "a" }), draft({ key: "b", name: "VIP", price: "40" })])?.length, 2);
});

test("exige al menos una entrada", () => {
  assert.equal(validDrafts([]), null);
});

test("convierte las fechas de venta a hora de Venezuela y exige cierre posterior a la apertura", () => {
  const ok = draftToTicket(draft({ startDay: "2026-09-20", endDay: "2026-09-25" }));
  assert.equal(ok?.salesStart, "2026-09-20T04:00:00.000Z");
  assert.equal(ok?.salesEnd, "2026-09-26T03:59:59.000Z");
  assert.equal(draftToTicket(draft({ startDay: "2026-09-25", endDay: "2026-09-20" })), null);
  assert.equal(draftToTicket(draft({ startDay: "2026-09-20", endDay: "2026-09-20" }))?.salesEnd, "2026-09-21T03:59:59.000Z");
  assert.equal(draftToTicket(draft())?.salesStart, null);
});
