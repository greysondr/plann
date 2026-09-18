import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesDateFilter, matchesPriceFilter, getMinPriceCents, getAvailability, toCalendarDateString, fromCalendarDateString } from "./eventFilters";
import type { EventItem } from "../core/types";

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "evt-1",
    organizerId: "org-1",
    title: "Evento de prueba",
    kind: "event",
    category: "Fiestas",
    city: "Barquisimeto",
    imageLabel: "",
    imageUrl: "",
    description: "",
    venueName: "",
    lat: 0,
    lng: 0,
    startsAt: new Date().toISOString(),
    durationMinutes: 60,
    refundPolicy: "none",
    ratingAvg: 0,
    ratingCount: 0,
    ticketTypes: [
      { id: "tt-1", eventId: "evt-1", name: "General", priceCents: 1500, quantity: 10, sold: 2, reserved: 1, minPerOrder: 1, maxPerOrder: 6 },
    ],
    ...overrides,
  };
}

test("un evento sin tickets (cartelera) no matchea ningún filtro de precio excepto 'todos'", () => {
  const curated = makeEvent({ ticketTypes: [] });
  assert.equal(getMinPriceCents(curated), null);
  assert.equal(matchesPriceFilter(curated, "todos"), true);
  assert.equal(matchesPriceFilter(curated, "gratis"), false);
});

test("filtro de precio por rangos", () => {
  const barato = makeEvent({ ticketTypes: [{ id: "t", eventId: "e", name: "G", priceCents: 500, quantity: 1, sold: 0, reserved: 0, minPerOrder: 1, maxPerOrder: 1 }] });
  const medio = makeEvent({ ticketTypes: [{ id: "t", eventId: "e", name: "G", priceCents: 2000, quantity: 1, sold: 0, reserved: 0, minPerOrder: 1, maxPerOrder: 1 }] });
  const caro = makeEvent({ ticketTypes: [{ id: "t", eventId: "e", name: "G", priceCents: 5000, quantity: 1, sold: 0, reserved: 0, minPerOrder: 1, maxPerOrder: 1 }] });
  assert.equal(matchesPriceFilter(barato, "menos10"), true);
  assert.equal(matchesPriceFilter(medio, "10a30"), true);
  assert.equal(matchesPriceFilter(caro, "mas30"), true);
  assert.equal(matchesPriceFilter(caro, "menos10"), false);
});

test("evento gratis (isFree) siempre matchea el filtro 'gratis'", () => {
  const gratis = makeEvent({ isFree: true, ticketTypes: [{ id: "t", eventId: "e", name: "G", priceCents: 0, quantity: 1, sold: 0, reserved: 0, minPerOrder: 1, maxPerOrder: 1 }] });
  assert.equal(matchesPriceFilter(gratis, "gratis"), true);
});

test("disponibilidad suma cupo libre de todos los tipos de ticket", () => {
  const event = makeEvent();
  assert.equal(getAvailability(event), 7); // 10 - 2 - 1
});

test("filtro de fecha: hoy y mañana", () => {
  const now = new Date("2026-09-16T12:00:00Z");
  const hoy = new Date("2026-09-16T20:00:00Z").toISOString();
  const manana = new Date("2026-09-17T20:00:00Z").toISOString();
  assert.equal(matchesDateFilter(hoy, "hoy", now), true);
  assert.equal(matchesDateFilter(hoy, "manana", now), false);
  assert.equal(matchesDateFilter(manana, "manana", now), true);
});

test("filtro de fecha: fin de semana toma el próximo sábado y domingo", () => {
  const miercoles = new Date("2026-09-16T12:00:00Z"); // miércoles
  const sabadoSiguiente = new Date("2026-09-19T21:00:00Z").toISOString();
  const domingoSiguiente = new Date("2026-09-20T15:00:00Z").toISOString();
  const lunesSiguiente = new Date("2026-09-21T09:00:00Z").toISOString();
  assert.equal(matchesDateFilter(sabadoSiguiente, "finde", miercoles), true);
  assert.equal(matchesDateFilter(domingoSiguiente, "finde", miercoles), true);
  assert.equal(matchesDateFilter(lunesSiguiente, "finde", miercoles), false);
});

test("filtro de fecha exacta del calendario compara solo el día, sin importar la hora", () => {
  const now = new Date(2026, 8, 16, 12, 0, 0);
  const eseDiaTemprano = new Date(2026, 8, 22, 0, 30, 0).toISOString();
  const eseDiaTarde = new Date(2026, 8, 22, 23, 0, 0).toISOString();
  const otroDia = new Date(2026, 8, 23, 2, 0, 0).toISOString();
  assert.equal(matchesDateFilter(eseDiaTemprano, "fecha", now, "2026-09-22"), true);
  assert.equal(matchesDateFilter(eseDiaTarde, "fecha", now, "2026-09-22"), true);
  assert.equal(matchesDateFilter(otroDia, "fecha", now, "2026-09-22"), false);
});

test("sin fecha elegida, el filtro 'fecha' no descarta nada", () => {
  const now = new Date("2026-09-16T12:00:00Z");
  assert.equal(matchesDateFilter(new Date().toISOString(), "fecha", now, null), true);
});

test("toCalendarDateString da el mismo formato que usa el calendario (YYYY-MM-DD)", () => {
  assert.equal(toCalendarDateString(new Date(2026, 0, 5, 15, 0, 0)), "2026-01-05");
});

test("fromCalendarDateString y toCalendarDateString son inversas, sin corrimiento de huso horario", () => {
  const s = "2026-12-31";
  assert.equal(toCalendarDateString(fromCalendarDateString(s)), s);
});
