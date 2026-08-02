import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appUrl = new URL("../src/App.tsx", import.meta.url);
const adapterUrl = new URL("../lib/molecular-world.ts", import.meta.url);
const catalogUrl = new URL("../lib/molecular-catalog.ts", import.meta.url);
const cssUrl = new URL("../src/globals.css", import.meta.url);

test("browser remains a fail-closed Wasm presentation and gesture shell", async () => {
  const [app, adapter] = await Promise.all([
    readFile(appUrl, "utf8"),
    readFile(adapterUrl, "utf8"),
  ]);

  assert.match(app, /import\s*\{[^}]*\bMolecularWorld\b[^}]*\}\s*from\s*["']@\/lib\/molecular-world["'];/s);
  assert.doesNotMatch(app, /\bclass\s+MolecularWorld\b/);
  assert.doesNotMatch(app, /\b(?:computeForces|addBond|removeBond|resolveCollision)\s*\(/);
  assert.doesNotMatch(app, /\bMath\.random\s*\(/);
  assert.doesNotMatch(app, /\b(?:randomNormal|thermalNoise|thermostatNoise)\b/);
  assert.doesNotMatch(adapter, /fallback|javascript physics/i);

  assert.match(app, /onPointerCancel=\{\(event\)\s*=>\s*finishIngredientDrag\(event,\s*ingredient,\s*false\)\}/);
  assert.match(app, /activePointersRef\.current\.has\(event\.pointerId\)/);
  assert.match(app, /world\.hitAtom\(point\.x,\s*point\.y\)/);
  assert.match(app, /activeWorld\.grabAtom\(atom\.id,\s*point\.x,\s*point\.y\)/);
  assert.match(app, /activeWorld\.dragAtom\(gesture\.atomId,\s*point\.x,\s*point\.y\)/);
  assert.match(app, /world\.releaseAtom\(gesture\.atomId\)/);
  assert.match(app, /world\.hitPiston\(point\.x,\s*point\.y\)/);
  assert.match(app, /activeWorld\.setPistonTarget\(point\.x\)/);
  assert.match(app, /activeWorld\.applySpark\(point\.x,\s*point\.y\)/);
  assert.match(app, /setInterval\(streamCurrentIngredient,\s*145\)/);
  assert.match(app, /if\s*\(world\.playing\)\s*issueWorldCommand/);

  assert.match(adapter, /ENGINE_ABI_VERSION\s*=\s*2/);
  assert.match(adapter, /ENGINE_MODEL_VERSION\s*=\s*2/);
  for (const command of [
    "ms_load_experiment",
    "ms_spawn_ingredient",
    "ms_apply_spark",
    "ms_grab_atom",
    "ms_drag_atom",
    "ms_release_atom",
    "ms_set_piston_target",
  ]) {
    assert.match(adapter, new RegExp(`"${command}"`), `adapter does not require ${command}`);
  }
  assert.match(adapter, /private\s+refreshViews\(\):\s*void/);
  assert.match(adapter, /this\.refreshViews\(\);/);
  assert.match(adapter, /statusValue\s*=\s*"error"/);
});

test("v2 catalog is exactly H, O, H2, O2, and H2O", async () => {
  const source = await readFile(catalogUrl, "utf8");
  const expected = [
    ["hydrogenAtom", 0],
    ["oxygenAtom", 1],
    ["hydrogen", 2],
    ["oxygen", 3],
    ["water", 4],
  ];
  const idBlock = source.match(/export const ENGINE_INGREDIENT_ID\s*=\s*\{([\s\S]*?)\}\s*as const;/);
  assert.ok(idBlock);
  const ids = [...idBlock[1].matchAll(/^\s*([A-Za-z][\w]*):\s*(\d+),?\s*$/gm)].map(
    ([, key, value]) => [key, Number(value)],
  );
  assert.deepEqual(ids, expected);
  const formulas = [...source.matchAll(/^\s{4}formula:\s*"([^"]+)",\s*$/gm)].map((match) => match[1]);
  assert.deepEqual(formulas, ["H", "O", "H₂", "O₂", "H₂O"]);
  assert.doesNotMatch(source, /methane|ammonia|carbon dioxide|sodium|chloride/i);
});

test("presentation encodes the horizontal semantic heat control and reduced motion", async () => {
  const [app, css] = await Promise.all([readFile(appUrl, "utf8"), readFile(cssUrl, "utf8")]);
  assert.match(app, /className="temperature-control"/);
  assert.match(app, />Cold</);
  assert.match(app, />Warm</);
  assert.match(app, />Hot</);
  assert.match(app, /aria-valuetext=\{temperature\s*<\s*34\s*\?\s*"Cold"/);
  assert.doesNotMatch(app, /quantity|aria-valuenow|temperature.*percent/i);
  assert.match(css, /\.temperature-control\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
