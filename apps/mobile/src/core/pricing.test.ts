import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateOrderTotals, serviceFeeForSubtotalCents, COMMISSION_BY_PLAN } from "./pricing";

test("fee de servicio: el mayor entre $0,50 y 3% (ejemplo de la sección 2.1: ticket de $10)", () => {
  assert.equal(serviceFeeForSubtotalCents(1000), 50); // 3% de $10 = $0.30 < $0.50 -> gana el mínimo
});

test("fee de servicio sube a 3% cuando el subtotal es alto (ej. $30 -> 3% = $0.90 > $0.50)", () => {
  assert.equal(serviceFeeForSubtotalCents(3000), 90);
});

test("orden de un ticket de $10, comisión Básico 12%: comprador paga $10.50, organizador recibe $8.80", () => {
  const totals = calculateOrderTotals({
    unitPriceCents: 1000,
    quantity: 1,
    commissionRate: COMMISSION_BY_PLAN.basico,
    rateUsed: 36,
  });
  assert.equal(totals.subtotalCents, 1000);
  assert.equal(totals.serviceFeeCents, 50);
  assert.equal(totals.totalCents, 1050);
  assert.equal(totals.commissionCents, 120);
  assert.equal(totals.organizerNetCents, 880);
  assert.equal(totals.totalBs, 378);
});

test("evento gratuito: sin comisión ni fee (sección 2.1)", () => {
  const totals = calculateOrderTotals({ unitPriceCents: 0, quantity: 3, commissionRate: 0.12, rateUsed: 36 });
  assert.equal(totals.totalCents, 0);
  assert.equal(totals.commissionCents, 0);
});

test("el fee es un solo mínimo por orden, no por ticket (coincide con create_order() en Postgres)", () => {
  const totals = calculateOrderTotals({ unitPriceCents: 1000, quantity: 4, commissionRate: 0.12, rateUsed: 36 });
  assert.equal(totals.subtotalCents, 4000);
  assert.equal(totals.serviceFeeCents, 120); // 3% de $40 = $1.20 > $0.50
});
