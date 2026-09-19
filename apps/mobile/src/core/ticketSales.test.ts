import { test } from "node:test";
import assert from "node:assert/strict";
import { dayEndIso, dayStartIso, defaultTicketType, isoToVeDay, saleState } from "./ticketSales";

const base = { quantity: 10, sold: 0, reserved: 0 };
const now = new Date("2026-09-20T15:00:00Z").getTime();

test("una entrada sin ventana está en venta mientras haya cupo", () => {
  assert.equal(saleState({ ...base }, now), "on_sale");
  assert.equal(saleState({ ...base, sold: 10 }, now), "sold_out");
});

test("la ventana de fechas manda sobre el cupo", () => {
  assert.equal(saleState({ ...base, salesStart: "2026-09-21T04:00:00Z" }, now), "upcoming");
  assert.equal(saleState({ ...base, salesEnd: "2026-09-20T14:00:00Z" }, now), "ended");
  assert.equal(saleState({ ...base, sold: 10, salesEnd: "2026-09-20T14:00:00Z" }, now), "ended");
});

test("se preselecciona la primera entrada en venta, y si no hay, la próxima en abrir", () => {
  const presale = { ...base, id: "pre", salesEnd: "2026-09-20T14:00:00Z" };
  const general = { ...base, id: "gen", salesStart: "2026-09-20T14:00:00Z" };
  assert.equal(defaultTicketType([presale, general], now)?.id, "gen");
  const later = { ...base, id: "later", salesStart: "2026-09-25T04:00:00Z" };
  const later2 = { ...base, id: "later2", salesStart: "2026-09-22T04:00:00Z" };
  assert.equal(defaultTicketType([later, later2], now)?.id, "later2");
});

test("los días se convierten a hora de Venezuela", () => {
  assert.equal(dayStartIso("2026-09-20"), "2026-09-20T04:00:00.000Z");
  assert.equal(dayEndIso("2026-09-20"), "2026-09-21T03:59:59.000Z");
  assert.equal(isoToVeDay("2026-09-21T03:59:59.000Z"), "2026-09-20");
});
