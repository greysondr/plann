import { test } from "node:test";
import assert from "node:assert/strict";
import { getTierForPoints, getNextTier, pointsForPurchase } from "./loyalty";

test("0 puntos es Explorador, el nivel base", () => {
  assert.equal(getTierForPoints(0).key, "explorador");
});

test("umbrales exactos de la escalera (sección 19.3)", () => {
  assert.equal(getTierForPoints(299).key, "explorador");
  assert.equal(getTierForPoints(300).key, "frecuente");
  assert.equal(getTierForPoints(999).key, "frecuente");
  assert.equal(getTierForPoints(1000).key, "insider");
  assert.equal(getTierForPoints(2999).key, "insider");
  assert.equal(getTierForPoints(3000).key, "elite");
  assert.equal(getTierForPoints(7999).key, "elite");
  assert.equal(getTierForPoints(8000).key, "black");
});

test("el siguiente nivel después de Black es null (es el tope)", () => {
  assert.equal(getNextTier(8000), null);
});

test("un ticket de $15 da 15 puntos (1 punto por dólar del precio)", () => {
  assert.equal(pointsForPurchase(1500), 15);
});
