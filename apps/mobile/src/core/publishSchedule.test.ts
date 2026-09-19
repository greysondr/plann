import { test } from "node:test";
import assert from "node:assert/strict";
import { isoToSchedule, scheduleToIso } from "./publishSchedule";

test("publicar ahora no programa nada", () => {
  assert.equal(scheduleToIso({ mode: "now", day: "", hourIndex: 0 }), undefined);
  assert.equal(scheduleToIso({ mode: "later", day: "", hourIndex: 0 }), undefined);
});

test("la hora programada es hora de Venezuela y hace ida y vuelta", () => {
  const iso = scheduleToIso({ mode: "later", day: "2026-10-01", hourIndex: 2 });
  assert.equal(iso, "2026-10-01T22:00:00.000Z"); // 6:00 p.m. en Caracas
  assert.deepEqual(isoToSchedule(iso), { mode: "later", day: "2026-10-01", hourIndex: 2 });
});
