import { describe, expect, it } from "vitest";
import { calculateOrderPricing } from "./pricing";

describe("calculateOrderPricing", () => {
  it("calcula el ejemplo de la sección 2.1: ticket de $10, comisión 10%, fee $0,50", () => {
    const result = calculateOrderPricing({
      unitPriceCents: 1000,
      quantity: 1,
      commissionRate: 0.1,
      serviceFeeMinCents: 50,
      serviceFeePct: 0.03,
    });
    expect(result.subtotalCents).toBe(1000);
    expect(result.serviceFeeCents).toBe(50); // max(50, 30) = 50
    expect(result.totalCents).toBe(1050);
    expect(result.commissionCents).toBe(100);
    expect(result.organizerNetCents).toBe(900);
  });

  it("usa el 3% cuando supera el mínimo fijo", () => {
    const result = calculateOrderPricing({
      unitPriceCents: 5000,
      quantity: 1,
      serviceFeeMinCents: 50,
      serviceFeePct: 0.03,
    });
    // 3% de 5000 = 150 > 50
    expect(result.serviceFeeCents).toBe(150);
  });

  it("multiplica por cantidad", () => {
    const result = calculateOrderPricing({
      unitPriceCents: 1000,
      quantity: 3,
      commissionRate: 0.12,
    });
    expect(result.subtotalCents).toBe(3000);
    expect(result.commissionCents).toBe(360);
    expect(result.organizerNetCents).toBe(2640);
  });

  it("eventos gratis no generan comisión ni fee (sección 2.1)", () => {
    const result = calculateOrderPricing({ unitPriceCents: 0, quantity: 2 });
    expect(result).toEqual({
      subtotalCents: 0,
      serviceFeeCents: 0,
      totalCents: 0,
      commissionCents: 0,
      organizerNetCents: 0,
    });
  });

  it("rechaza cantidad menor a 1", () => {
    expect(() => calculateOrderPricing({ unitPriceCents: 1000, quantity: 0 })).toThrow();
  });

  it("rechaza precio negativo", () => {
    expect(() => calculateOrderPricing({ unitPriceCents: -1, quantity: 1 })).toThrow();
  });
});
