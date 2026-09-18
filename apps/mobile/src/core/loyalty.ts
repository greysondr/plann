// Escalera de niveles del comprador (sección 19.3). Umbrales por defecto de la
// sección 16, decisión #22: 0 · 300 · 1.000 · 3.000 · 8.000 puntos en 12 meses.
import type { LoyaltyTierKey } from "./types";

export const POINTS_PER_USD = 1; // 1 punto por cada $1 del precio (sin el fee)
export const FIRST_PURCHASE_BONUS = 50;

export interface LoyaltyTier {
  key: LoyaltyTierKey;
  name: string;
  threshold: number;
  serviceFeeDiscount: string;
  benefits: string[];
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    key: "explorador",
    name: "Explorador",
    threshold: 0,
    serviceFeeDiscount: "Completo",
    benefits: ["Acumulas puntos en cada compra"],
  },
  {
    key: "frecuente",
    name: "Frecuente",
    threshold: 300,
    serviceFeeDiscount: "−50 %",
    benefits: ["Fee de servicio a la mitad", "Preventa 6 h antes", "Sorteos exclusivos"],
  },
  {
    key: "insider",
    name: "Insider",
    threshold: 1000,
    serviceFeeDiscount: "Sin fee",
    benefits: ["Sin fee de servicio", "Preventa 24 h antes", "Algunos eventos exclusivos", "Cupón de $2 al mes"],
  },
  {
    key: "elite",
    name: "Élite",
    threshold: 3000,
    serviceFeeDiscount: "Sin fee",
    benefits: [
      "Sin fee de servicio",
      "Preventa 48 h antes",
      "2 puestos reservados en eventos que se agotan",
      "Todos los eventos exclusivos",
      "Upgrade gratis a VIP cuando haya cupo",
    ],
  },
  {
    key: "black",
    name: "Plann Black",
    threshold: 8000,
    serviceFeeDiscount: "Sin fee",
    benefits: [
      "Siempre reembolsable hasta 6 h antes",
      "4 puestos reservados",
      "Eventos privados por invitación",
      "Contacto personal de soporte",
    ],
  },
];

export function getTierForPoints(points: number): LoyaltyTier {
  let current = LOYALTY_TIERS[0];
  for (const tier of LOYALTY_TIERS) {
    if (points >= tier.threshold) current = tier;
  }
  return current;
}

export function getNextTier(points: number): LoyaltyTier | null {
  const current = getTierForPoints(points);
  const idx = LOYALTY_TIERS.findIndex((t) => t.key === current.key);
  return LOYALTY_TIERS[idx + 1] ?? null;
}

export function pointsForPurchase(subtotalCents: number): number {
  return Math.floor((subtotalCents / 100) * POINTS_PER_USD);
}
