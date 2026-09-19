export const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short" });

export const longDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-VE", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const pct = (value: number) => `${Math.round(value * 100)}%`;

// Días de Venezuela (UTC-4): "2026-09-20" empieza a las 00:00 y termina a las 23:59:59 locales.
export const dayStartIso = (day: string) => new Date(`${day}T00:00:00-04:00`).toISOString();
export const dayEndIso = (day: string) => new Date(`${day}T23:59:59-04:00`).toISOString();
export const isoToVeDay = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10) : "");
