import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransitionOrder, canTransitionTicket } from "./orderStateMachine";

test("una orden pendiente puede pasar a verificación o expirar, nunca directo a pagada", () => {
  assert.equal(canTransitionOrder("pending_payment", "in_verification"), true);
  assert.equal(canTransitionOrder("pending_payment", "expired"), true);
  assert.equal(canTransitionOrder("pending_payment", "paid"), false);
});

test("una orden pagada es un estado terminal", () => {
  assert.equal(canTransitionOrder("paid", "expired"), false);
  assert.equal(canTransitionOrder("paid", "pending_payment"), false);
});

test("un pago rechazado permite corregir una vez, o cancelarse", () => {
  assert.equal(canTransitionOrder("rejected", "pending_payment"), true);
  assert.equal(canTransitionOrder("rejected", "cancelled"), true);
  assert.equal(canTransitionOrder("rejected", "paid"), false);
});

test("un ticket válido puede usarse o anularse, nunca al revés", () => {
  assert.equal(canTransitionTicket("valid", "used"), true);
  assert.equal(canTransitionTicket("used", "valid"), false);
});
