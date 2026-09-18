import { describe, expect, it } from "vitest";
import {
  canTransitionOrder,
  canTransitionPayment,
  canTransitionTicket,
} from "./state-machines";

describe("canTransitionOrder", () => {
  it("permite el flujo feliz de compra (sección 8.1)", () => {
    expect(canTransitionOrder("pending_payment", "in_verification")).toBe(true);
    expect(canTransitionOrder("in_verification", "paid")).toBe(true);
  });

  it("permite expirar una orden pendiente (bloqueo de 15 minutos)", () => {
    expect(canTransitionOrder("pending_payment", "expired")).toBe(true);
  });

  it("no permite saltar directo de pending_payment a paid", () => {
    expect(canTransitionOrder("pending_payment", "paid")).toBe(false);
  });

  it("un estado terminal no tiene salidas", () => {
    expect(canTransitionOrder("expired", "paid")).toBe(false);
    expect(canTransitionOrder("refunded", "paid")).toBe(false);
  });

  it("permite reembolso parcial a reembolso total", () => {
    expect(canTransitionOrder("partially_refunded", "refunded")).toBe(true);
  });
});

describe("canTransitionTicket", () => {
  it("permite check-in de un ticket válido (sección 8.2)", () => {
    expect(canTransitionTicket("valid", "used")).toBe(true);
  });

  it("no permite reusar un ticket ya usado", () => {
    expect(canTransitionTicket("used", "used")).toBe(false);
  });

  it("un ticket reembolsado no puede volver a válido", () => {
    expect(canTransitionTicket("refunded", "valid")).toBe(false);
  });
});

describe("canTransitionPayment", () => {
  it("permite reintentar tras un rechazo (sección 4.2, corregir referencia)", () => {
    expect(canTransitionPayment("rejected", "submitted")).toBe(true);
  });

  it("un pago aprobado es terminal", () => {
    expect(canTransitionPayment("approved", "rejected")).toBe(false);
  });
});
