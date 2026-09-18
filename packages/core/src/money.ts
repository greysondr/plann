/**
 * Todos los montos se representan en centavos de USD (enteros), nunca en floats.
 * Fuente: PLANN-PROYECTO.md, sección 9 ("Todos los montos en centavos de USD").
 */

export type Cents = number;

export function usdToCents(usd: number): Cents {
  return Math.round(usd * 100);
}

export function centsToUsd(cents: Cents): number {
  return cents / 100;
}

/** Formatea centavos como "$10,50" (coma decimal, sección 7 de la identidad visual). */
export function formatUsd(cents: Cents): string {
  const usd = centsToUsd(cents).toFixed(2).replace(".", ",");
  return `$${usd}`;
}

/** Convierte centavos de USD a bolívares enteros a una tasa dada, sin decimales. */
export function centsToBs(cents: Cents, rateBcvPerUsd: number): number {
  return Math.round(centsToUsd(cents) * rateBcvPerUsd);
}

export function formatBs(bs: number): string {
  return `Bs ${bs.toLocaleString("es-VE")}`;
}
