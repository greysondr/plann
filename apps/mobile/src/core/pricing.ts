// Reglas de dinero (sección 2.1 y 25.2 del documento maestro).
// Nunca se leen ni se calculan estos valores solo en la pantalla: viven aquí para
// que móvil, web y funciones del servidor usen exactamente la misma cuenta.
import type { OrganizerPlan } from "./types";

export const SERVICE_FEE_MIN_CENTS = 50; // $0,50
export const SERVICE_FEE_PCT = 0.03; // 3 %
export const BCV_MARGIN_PCT_DEFAULT = 0.03; // tasa Plann = BCV + 3 % (sección 25.2)

export const COMMISSION_BY_PLAN: Record<OrganizerPlan, number> = {
  basico: 0.12,
  pro: 0.08,
  business: 0.06,
};

/**
 * Fee de servicio de la orden completa: el mayor entre $0,50 y 3 % del
 * subtotal (sección 2.1). Un solo mínimo por orden, no por ticket — así lo
 * calcula create_order() en Postgres (packages/db), que es quien de verdad
 * cobra; este helper solo sirve para el resumen que se muestra ANTES de
 * crear la orden.
 */
export function serviceFeeForSubtotalCents(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return Math.max(SERVICE_FEE_MIN_CENTS, Math.round(subtotalCents * SERVICE_FEE_PCT));
}

export interface OrderTotals {
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  commissionCents: number;
  organizerNetCents: number;
  totalBs: number;
}

export function calculatePlannRate(rateBcv: number, marginPct: number = BCV_MARGIN_PCT_DEFAULT): number {
  return Math.round(rateBcv * (1 + marginPct) * 100) / 100;
}

export function calculateOrderTotals(params: {
  unitPriceCents: number;
  quantity: number;
  commissionRate: number;
  rateUsed: number; // tasa Plann ya calculada, congelada para la orden
  discountCents?: number; // cupón: lo absorbe el organizador; fee y comisión van sobre lo rebajado
}): OrderTotals {
  const { unitPriceCents, quantity, commissionRate, rateUsed } = params;

  const gross = unitPriceCents * quantity;
  const discount = Math.min(Math.max(params.discountCents ?? 0, 0), gross);
  if (unitPriceCents <= 0 || gross - discount <= 0) {
    return { subtotalCents: 0, serviceFeeCents: 0, totalCents: 0, commissionCents: 0, organizerNetCents: 0, totalBs: 0 };
  }

  const subtotalCents = gross - discount;
  const serviceFeeCents = serviceFeeForSubtotalCents(subtotalCents);
  const totalCents = subtotalCents + serviceFeeCents;
  const commissionCents = Math.round(subtotalCents * commissionRate);
  const organizerNetCents = subtotalCents - commissionCents;
  const totalBs = Math.round(((totalCents / 100) * rateUsed) * 100) / 100;

  return { subtotalCents, serviceFeeCents, totalCents, commissionCents, organizerNetCents, totalBs };
}

export function formatUsd(cents: number): string {
  const value = cents / 100;
  return `$${value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatBs(bs: number): string {
  return `Bs ${bs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
