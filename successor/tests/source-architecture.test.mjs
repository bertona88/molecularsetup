import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../src/App.tsx", import.meta.url);
const catalogUrl = new URL("../lib/molecular-catalog.ts", import.meta.url);

test("static app remains a Wasm presentation shell with repaired pointer semantics", async () => {
  const source = await readFile(pageUrl, "utf8");

  assert.match(
    source,
    /import\s*\{[^}]*\bMolecularWorld\b[^}]*\}\s*from\s*["']@\/lib\/molecular-world["'];/s,
    "page must import the Wasm-backed MolecularWorld adapter",
  );
  assert.doesNotMatch(source, /\bclass\s+MolecularWorld\b/);
  assert.doesNotMatch(source, /\bcomputeForces\s*\(/);
  assert.doesNotMatch(source, /\b(?:addBond|removeBond)\s*\(/);
  assert.doesNotMatch(source, /\bMath\.random\s*\(/);
  assert.doesNotMatch(
    source,
    /\b(?:randomNormal|normalRandom|thermalNoise|thermostatNoise)\b/,
    "thermal randomness belongs in the Rust engine, not page.tsx",
  );

  assert.match(
    source,
    /onPointerCancel=\{\(event\)\s*=>\s*finishCanvasGesture\(event,\s*false\)\}/,
    "canvas pointer cancellation must never commit a gesture",
  );
  assert.match(
    source,
    /if\s*\(\s*!activePointersRef\.current\.has\(event\.pointerId\)\s*\)\s*return;/,
    "canvas pointer moves must ignore inactive pointer ids",
  );
  assert.match(
    source,
    /const\s+moved\s*=\s*distance\(\s*current\.startX,\s*current\.startY,\s*event\.clientX,\s*event\.clientY,?\s*\);/s,
    "molecule drag activation must be measured from its fixed start point",
  );
  assert.match(
    source,
    /if\s*\(activeWorld\.playing\)\s*\{\s*activeWorld\.advance\(elapsedMilliseconds\);\s*\}/s,
    "the animation loop must not enqueue advance commands while paused",
  );
  assert.match(
    source,
    /const\s+issueWorldCommand\s*=\s*useCallback\([\s\S]*?if\s*\(\s*!world\s*\|\|\s*world\.status\s*===\s*["']error["']\s*\)\s*return\s+undefined;/,
    "fatal engine errors must make command-producing handlers inert without blocking loading commands",
  );
});

test("presentation catalog preserves frozen ABI v1 species ids and order", async () => {
  const source = await readFile(catalogUrl, "utf8");
  const expected = [
    ["water", 0],
    ["hydrogen", 1],
    ["oxygen", 2],
    ["methane", 3],
    ["ammonia", 4],
    ["carbon-dioxide", 5],
    ["sodium", 6],
    ["chloride", 7],
  ];

  const idBlock = source.match(
    /export const ENGINE_SPECIES_ID\s*=\s*\{([\s\S]*?)\}\s*as const;/,
  );
  assert.ok(idBlock, "ENGINE_SPECIES_ID declaration is missing");
  const ids = [...idBlock[1].matchAll(/^\s*(?:"([^"]+)"|([A-Za-z][\w-]*)):\s*(\d+),?\s*$/gm)].map(
    ([, quoted, bare, value]) => [quoted ?? bare, Number(value)],
  );
  assert.deepEqual(ids, expected);

  const catalogBlock = source.match(
    /export const SPECIES:[^=]+\=\s*\[([\s\S]*?)^\];/m,
  );
  assert.ok(catalogBlock, "SPECIES catalog declaration is missing");
  const catalogKeys = [
    ...catalogBlock[1].matchAll(/^\s{4}id:\s*"([^"]+)",\s*$/gm),
  ].map((match) => match[1]);
  const engineKeys = [
    ...catalogBlock[1].matchAll(
      /^\s{4}engineId:\s*ENGINE_SPECIES_ID(?:\.([A-Za-z][\w-]*)|\["([^"]+)"\]),\s*$/gm,
    ),
  ].map(([, bare, quoted]) => bare ?? quoted);

  assert.deepEqual(catalogKeys, expected.map(([key]) => key));
  assert.deepEqual(engineKeys, expected.map(([key]) => key));
});
