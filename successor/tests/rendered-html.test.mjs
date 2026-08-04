import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const distUrl = new URL("../dist/", import.meta.url);
const appUrl = new URL("../src/App.tsx", import.meta.url);

test("builds a relative-path static entry", async () => {
  const html = await readFile(new URL("index.html", distUrl), "utf8");
  const assets = await readdir(new URL("assets/", distUrl));
  assert.match(html, /<title>MolecularSetup — build chemistry by touch<\/title>/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /<script[^>]+src="\.\/assets\/[^"]+\.js"/);
  assert.match(html, /<link[^>]+href="\.\/favicon\.svg"/);
  assert.doesNotMatch(html, /codex-preview|_vinext|dist\/server/i);
  assert.ok(assets.some((asset) => asset.endsWith(".js")));
});

test("source presents water, polymer, and everything systems without a lesson panel", async () => {
  const source = await readFile(appUrl, "utf8");
  for (const label of [
    "Make a bond",
    "Break a bond",
    "Ignite",
    "Free play",
    "Spark",
    "Cold",
    "Warm",
    "Hot",
    "Drag piston",
    "Water",
    "Photopolymer",
    "Everything",
    "Expose resin",
    "Stretch cured",
    "Light",
  ]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /className={`molecular-canvas/);
  assert.match(source, /aria-label="Systems"/);
  assert.match(source, /activeSystem\.label} ingredients/);
  assert.match(source, /aria-label="Simulation controls"/);
  assert.match(source, /Hold to add a stream/);
  assert.match(source, /Reset this experience/);
  assert.match(source, /world is stopped/i);
  assert.doesNotMatch(source, /dashboard|inspector|reaction recipe|quantity slider/i);
  assert.doesNotMatch(source, /aria-valuenow|kelvin|pascal/i);
});
