import test from "node:test";
import assert from "node:assert/strict";
import { groupTools, searchTools, toolsFor } from "./orgTools";

test("cada rol solo ve sus herramientas", () => {
  const ids = (r: "owner" | "editor" | "finance") => toolsFor(r).map((t) => t.id);
  assert.ok(ids("owner").includes("equipo") && ids("owner").includes("retiros") && ids("owner").includes("crear"));
  assert.ok(!ids("editor").includes("retiros") && !ids("editor").includes("equipo") && ids("editor").includes("cupones"));
  assert.ok(!ids("finance").includes("crear") && !ids("finance").includes("cupones") && ids("finance").includes("reportes"));
  assert.deepEqual(toolsFor(null), []);
});

test("la búsqueda ignora tildes y mayúsculas y usa sinónimos", () => {
  const owner = toolsFor("owner");
  assert.deepEqual(searchTools(owner, "RESEÑAS").map((t) => t.id), ["resenas"]);
  assert.ok(searchTools(owner, "dinero").some((t) => t.id === "retiros"));
  assert.ok(searchTools(owner, "qr").some((t) => t.id === "escanear"));
  assert.equal(searchTools(owner, "xyz").length, 0);
});

test("agrupa en orden y omite grupos vacíos", () => {
  const groups = groupTools(toolsFor("finance")).map((g) => g.group);
  assert.deepEqual(groups, ["Eventos", "Ventas y dinero", "Crecimiento", "Equipo y cuenta"]);
  assert.equal(groupTools([]).length, 0);
});
