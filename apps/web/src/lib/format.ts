export const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short" });

export const longDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-VE", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const pct = (value: number) => `${Math.round(value * 100)}%`;
