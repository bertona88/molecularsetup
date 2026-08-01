import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const distUrl = new URL("../dist/", import.meta.url);
const appUrl = new URL("../src/App.tsx", import.meta.url);

test("builds a relative-path static GitHub Pages entry", async () => {
  const html = await readFile(new URL("index.html", distUrl), "utf8");
  const assets = await readdir(new URL("assets/", distUrl));

  assert.match(html, /<title>MolecularSetup — build chemistry by touch<\/title>/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /<script[^>]+src="\.\/assets\/[^"]+\.js"/);
  assert.match(html, /<link[^>]+href="\.\/favicon\.svg"/);
  assert.doesNotMatch(html, /codex-preview|_vinext|dist\/server/i);
  assert.ok(assets.some((asset) => asset.endsWith(".js")));
});

test("preserves the molecular canvas interaction contract", async () => {
  const source = await readFile(appUrl, "utf8");

  assert.match(source, /className={`molecular-canvas/);
  assert.match(source, /aria-label="Molecules"/);
  assert.match(source, /aria-label="Simulation controls"/);
  assert.match(source, /Draw pressure boundary/);
  assert.match(source, /Pause simulation/);
  assert.match(source, /Hold to reset the world/);
  assert.match(source, /aria-valuemax=\{1000\}/);
  assert.match(source, /H₂O|SPECIES/);
  assert.doesNotMatch(source, /dashboard|inspector|reaction recipe/i);
});
