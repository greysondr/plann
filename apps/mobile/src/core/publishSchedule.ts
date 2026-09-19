export const PUBLISH_HOURS = [
  { label: "8:00 a.m.", hour: 8 },
  { label: "12:00 m.", hour: 12 },
  { label: "6:00 p.m.", hour: 18 },
];

export interface PublishSchedule {
  mode: "now" | "later";
  day: string; // YYYY-MM-DD (hora de Venezuela)
  hourIndex: number;
}

export function scheduleToIso(s: PublishSchedule): string | undefined {
  if (s.mode === "now" || !s.day) return undefined;
  const hh = String(PUBLISH_HOURS[s.hourIndex].hour).padStart(2, "0");
  return new Date(`${s.day}T${hh}:00:00-04:00`).toISOString();
}

export function isoToSchedule(iso?: string): PublishSchedule {
  if (!iso) return { mode: "now", day: "", hourIndex: 0 };
  const ve = new Date(new Date(iso).getTime() - 4 * 3600 * 1000);
  const idx = PUBLISH_HOURS.findIndex((h) => h.hour === ve.getUTCHours());
  return { mode: "later", day: ve.toISOString().slice(0, 10), hourIndex: idx >= 0 ? idx : 0 };
}
