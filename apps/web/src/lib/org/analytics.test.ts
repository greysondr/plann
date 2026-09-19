import { test } from "node:test";
import assert from "node:assert/strict";
import { attendance, buyerStats, cumulativeTickets, dailySeries, dayKey, deltaPct, funnel, totalsBetween, weekdayDistribution, type OrderRow } from "./analytics.ts";

const order = (over: Partial<OrderRow>): OrderRow => ({
  id: "o", user_id: "u1", event_id: "e1", ticket_type_id: "t1", quantity: 1, status: "paid",
  subtotal_cents: 1000, total_usd_cents: 1050, commission_cents: 120, organizer_net_cents: 880,
  currency_paid: "usd", created_at: "2026-09-10T15:00:00Z", paid_at: "2026-09-10T15:10:00Z", ...over,
});

test("los días se cuentan en hora de Venezuela", () => {
  // 01:30 UTC del día 11 sigue siendo la noche del día 10 en Caracas.
  assert.equal(dayKey("2026-09-11T01:30:00Z"), "2026-09-10");
  assert.equal(dayKey("2026-09-11T05:00:00Z"), "2026-09-11");
});

test("dailySeries rellena con ceros y solo suma órdenes pagadas", () => {
  const now = new Date("2026-09-12T18:00:00Z");
  const series = dailySeries(
    [order({}), order({ id: "b", status: "expired" }), order({ id: "c", quantity: 3, organizer_net_cents: 2640, paid_at: "2026-09-12T14:00:00Z" })],
    4,
    now
  );
  assert.equal(series.length, 4);
  assert.deepEqual(series.map((p) => p.date), ["2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12"]);
  assert.deepEqual(series.map((p) => p.tickets), [0, 1, 0, 3]);
  assert.equal(series[3].netCents, 2640);
});

test("totalsBetween respeta el rango [from, to)", () => {
  const orders = [order({}), order({ id: "b", paid_at: "2026-09-20T12:00:00Z" })];
  const t = totalsBetween(orders, new Date("2026-09-01T00:00:00Z"), new Date("2026-09-15T00:00:00Z"));
  assert.equal(t.orders, 1);
  assert.equal(t.netCents, 880);
});

test("deltaPct sin base devuelve null y cero contra cero es 0", () => {
  assert.equal(deltaPct(100, 0), null);
  assert.equal(deltaPct(0, 0), 0);
  assert.equal(deltaPct(150, 100), 0.5);
});

test("funnel: la conversión ignora los pedidos aún pendientes", () => {
  const f = funnel([order({}), order({ id: "b", status: "expired" }), order({ id: "c", status: "in_verification" }), order({ id: "d", status: "refund_pending" })]);
  assert.equal(f.paid, 1);
  assert.equal(f.pending, 1);
  assert.equal(f.refunded, 1);
  assert.ok(Math.abs(f.conversion - 1 / 3) < 1e-9);
});

test("weekdayDistribution empieza el lunes", () => {
  // 2026-09-14 es lunes.
  const d = weekdayDistribution([order({ paid_at: "2026-09-14T16:00:00Z", quantity: 2 })]);
  assert.equal(d[0].label, "Lun");
  assert.equal(d[0].tickets, 2);
});

test("buyerStats cuenta compradores recurrentes", () => {
  const s = buyerStats([order({}), order({ id: "b" }), order({ id: "c", user_id: "u2" })]);
  assert.equal(s.buyers, 2);
  assert.equal(s.repeatBuyers, 1);
  assert.equal(s.repeatRate, 0.5);
});

test("cumulativeTickets acumula día a día", () => {
  const c = cumulativeTickets([order({ quantity: 2 }), order({ id: "b", paid_at: "2026-09-12T15:00:00Z", quantity: 3 })], new Date("2026-09-12T20:00:00Z"));
  assert.deepEqual(c.map((p) => p.tickets), [2, 2, 5]);
});

test("attendance ignora tickets anulados", () => {
  const a = attendance([
    { id: "1", event_id: "e", ticket_type_id: "t", status: "used", checked_in_at: null },
    { id: "2", event_id: "e", ticket_type_id: "t", status: "valid", checked_in_at: null },
    { id: "3", event_id: "e", ticket_type_id: "t", status: "void", checked_in_at: null },
  ]);
  assert.equal(a.issued, 2);
  assert.equal(a.rate, 0.5);
});

import { monthlySummary } from "./analytics.ts";

test("monthlySummary agrupa por mes de Venezuela y ordena de más reciente a más antiguo", () => {
  const rows = monthlySummary([
    order({ paid_at: "2026-08-31T23:30:00Z" }), // 7:30 pm del 31 en Caracas: agosto
    order({ id: "b", paid_at: "2026-09-01T02:00:00Z" }), // 10 pm del 31 en Caracas: agosto
    order({ id: "c", paid_at: "2026-09-01T05:00:00Z" }), // 1 am del 1 en Caracas: septiembre
    order({ id: "d", status: "expired" }),
  ]);
  assert.deepEqual(rows.map((r) => [r.month, r.tickets]), [["2026-09", 1], ["2026-08", 2]]);
  assert.equal(rows[1].netCents, 1760);
  assert.equal(rows[1].commissionCents, 240);
});

import { checkinsByHour } from "./analytics.ts";

test("checkinsByHour no estira el eje cuando la fiesta cruza la medianoche", () => {
  const t = (iso: string) => ({ id: iso, event_id: "e", ticket_type_id: "t", status: "used", checked_in_at: iso });
  // 10:30 pm, 11:10 pm y 12:20 am en Caracas.
  const rows = checkinsByHour([t("2026-09-09T02:30:00Z"), t("2026-09-09T03:10:00Z"), t("2026-09-09T04:20:00Z")]);
  assert.deepEqual(rows.map((r) => r.label), ["10 pm", "11 pm", "12 am"]);
  assert.deepEqual(rows.map((r) => r.count), [1, 1, 1]);
});

test("las cortesías no cuentan como ventas ni en la conversión", () => {
  const comp = order({ id: "c", is_comp: true, subtotal_cents: 0, organizer_net_cents: 0 });
  const t = totalsBetween([order({}), comp], new Date("2026-09-01T00:00:00Z"), new Date("2026-09-30T00:00:00Z"));
  assert.equal(t.orders, 1);
  assert.equal(t.tickets, 1);
  assert.equal(funnel([order({}), comp]).total, 1);
  assert.equal(buyerStats([comp]).buyers, 0);
});
