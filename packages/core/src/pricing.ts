import type { Cents } from "./money";

/**
 * Reglas de precio y comisión.
 * Fuente: PLANN-PROYECTO.md, secciones 2.1 y 16 (decisiones #1 y #2).
 * Estos son los valores por defecto [DECIDIR] — se leerán de `settings` en cuanto
 * exista el panel de monetización (sección 21). No hardcodear cambios aquí sin
 * dejar nota en docs/decisiones/.
 */
export const DEFAULT_COMMISSION_RATE_BASIC = 0.12;
export const DEFAULT_SERVICE_FEE_MIN_CENTS: Cents = 50;
export const DEFAULT_SERVICE_FEE_PCT = 0.03;

export interface OrderPricingInput {
  /** Precio unitario del tipo de ticket, en centavos. 0 = evento gratis. */
  unitPriceCents: Cents;
  quantity: number;
  commissionRate?: number;
  serviceFeeMinCents?: Cents;
  serviceFeePct?: number;
}

export interface OrderPricingResult {
  subtotalCents: Cents;
  serviceFeeCents: Cents;
  totalCents: Cents;
  commissionCents: Cents;
  organizerNetCents: Cents;
}

/**
 * Calcula el desglose de una orden. Eventos gratis (unitPriceCents = 0)
 * no generan comisión ni fee de servicio (sección 2.1, "Reglas").
 */
export function calculateOrderPricing(input: OrderPricingInput): OrderPricingResult {
  const {
    unitPriceCents,
    quantity,
    commissionRate = DEFAULT_COMMISSION_RATE_BASIC,
    serviceFeeMinCents = DEFAULT_SERVICE_FEE_MIN_CENTS,
    serviceFeePct = DEFAULT_SERVICE_FEE_PCT,
  } = input;

  if (quantity < 1 || !Number.isInteger(quantity)) {
    throw new Error("quantity debe ser un entero mayor o igual a 1");
  }
  if (unitPriceCents < 0) {
    throw new Error("unitPriceCents no puede ser negativo");
  }

  const subtotalCents = unitPriceCents * quantity;

  if (subtotalCents === 0) {
    return {
      subtotalCents: 0,
      serviceFeeCents: 0,
      totalCents: 0,
      commissionCents: 0,
      organizerNetCents: 0,
    };
  }

  const serviceFeeCents = Math.max(
    serviceFeeMinCents,
    Math.round(subtotalCents * serviceFeePct),
  );
  const commissionCents = Math.round(subtotalCents * commissionRate);
  const organizerNetCents = subtotalCents - commissionCents;
  const totalCents = subtotalCents + serviceFeeCents;

  return {
    subtotalCents,
    serviceFeeCents,
    totalCents,
    commissionCents,
    organizerNetCents,
  };
}
