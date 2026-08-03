import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedAbiVersion = 2;
const expectedModelVersion = 2;
const elementValence = [1, 2];
const ingredientAtomCounts = [1, 1, 2, 2, 3];
const viewDefinitions = {
  atoms: { ArrayType: Float32Array, stride: 16 },
  bonds: { ArrayType: Float32Array, stride: 10 },
  walls: { ArrayType: Float32Array, stride: 10 },
  events: { ArrayType: Float32Array, stride: 10 },
  stats: { ArrayType: Float64Array, stride: 28 },
};

const requiredFunctions = [
  "ms_model_version",
  "ms_abi_version",
  "ms_reset",
  "ms_load_experiment",
  "ms_set_playing",
  "ms_set_temperature",
  "ms_spawn_ingredient",
  "ms_apply_spark",
  "ms_grab_atom",
  "ms_drag_atom",
  "ms_release_atom",
  "ms_set_piston_target",
  "ms_advance",
  "ms_step_fixed",
  ...Object.keys(viewDefinitions).flatMap((name) => [
    `ms_${name}_ptr`,
    `ms_${name}_len`,
    `ms_${name}_stride`,
  ]),
];

function engineUrl() {
  return new URL(
    process.env.MOLECULARSETUP_ENGINE_WASM ??
      "../public/engine/molecularsetup_engine.wasm",
    import.meta.url,
  );
}

async function instantiateEngine() {
  const bytes = await readFile(engineUrl());
  const wasmModule = await WebAssembly.compile(bytes);
  assert.deepEqual(WebAssembly.Module.imports(wasmModule), [], "engine must have zero imports");
  const instance = await WebAssembly.instantiate(wasmModule, {});
  const api = instance.exports;
  assert.ok(api.memory instanceof WebAssembly.Memory, "memory export is required");
  for (const name of requiredFunctions) {
    assert.equal(typeof api[name], "function", `missing Wasm export ${name}`);
  }
  return api;
}

function assertIntegerInRange(value, minimum, maximum, label) {
  assert.ok(Number.isInteger(value), `${label} must be an integer; got ${value}`);
  assert.ok(
    value >= minimum && value <= maximum,
    `${label} must be in [${minimum}, ${maximum}]; got ${value}`,
  );
}

function readPackedView(api, name, definition) {
  const stride = api[`ms_${name}_stride`]();
  const length = api[`ms_${name}_len`]();
  const pointer = api[`ms_${name}_ptr`]();
  const { ArrayType, stride: expectedStride } = definition;
  const byteLength = length * ArrayType.BYTES_PER_ELEMENT;
  const memory = api.memory.buffer;
  assert.equal(stride, expectedStride, `${name} stride changed`);
  assertIntegerInRange(length, 0, 0xffff_ffff, `${name} scalar length`);
  assert.equal(length % stride, 0, `${name} has an incomplete record`);
  assertIntegerInRange(pointer, 0, memory.byteLength, `${name} pointer`);
  assert.equal(pointer % ArrayType.BYTES_PER_ELEMENT, 0, `${name} pointer is misaligned`);
  assert.ok(pointer + byteLength <= memory.byteLength, `${name} extends beyond memory`);
  const values = new ArrayType(memory, pointer, length).slice();
  values.forEach((value, index) => {
    assert.ok(Number.isFinite(value), `${name}[${index}] is not finite`);
  });
  return { count: length / stride, pointer, stride, values };
}

function readSnapshot(api) {
  const views = Object.fromEntries(
    Object.entries(viewDefinitions).map(([name, definition]) => [
      name,
      readPackedView(api, name, definition),
    ]),
  );
  const stats = views.stats.values;
  assert.equal(views.stats.count, 1);
  assert.equal(stats[13], views.atoms.count, "stats atom count disagrees with view");
  assert.equal(stats[14], views.bonds.count, "stats bond count disagrees with view");
  assert.equal(stats[15], views.events.count, "stats event count disagrees with view");
  assert.equal(stats[19], 18_000, "atom capacity changed");
  assert.equal(stats[22], expectedModelVersion, "stats model version changed");
  assert.equal(stats[23], expectedAbiVersion, "stats ABI version changed");

  for (let offset = 0; offset < views.atoms.values.length; offset += 16) {
    assertIntegerInRange(views.atoms.values[offset], 1, 0xffff_ffff, "atom id");
    const element = views.atoms.values[offset + 1];
    assertIntegerInRange(element, 0, 1, "element id");
    assert.ok(views.atoms.values[offset + 8] > 0, "atom radius must be positive");
    assert.ok(views.atoms.values[offset + 9] >= 0, "excitation cannot be negative");
    assertIntegerInRange(views.atoms.values[offset + 10], 0, 1, "grab state");
    assertIntegerInRange(
      views.atoms.values[offset + 11],
      0,
      elementValence[element],
      "used valence",
    );
  }

  for (let offset = 0; offset < views.bonds.values.length; offset += 10) {
    assertIntegerInRange(views.bonds.values[offset], 1, 0xffff_ffff, "bond id");
    const atomA = views.bonds.values[offset + 1];
    const atomB = views.bonds.values[offset + 2];
    assertIntegerInRange(atomA, 0, views.atoms.count - 1, "bond atom A");
    assertIntegerInRange(atomB, 0, views.atoms.count - 1, "bond atom B");
    assert.notEqual(atomA, atomB);
    assertIntegerInRange(views.bonds.values[offset + 3], 1, 2, "bond order");
    assertIntegerInRange(views.bonds.values[offset + 4], 0, 3, "bond state");
    assert.ok(
      views.bonds.values[offset + 5] >= 0 && views.bonds.values[offset + 5] <= 1,
      "bond progress must be normalized",
    );
    assert.ok(views.bonds.values[offset + 8] > 0, "rest length must be positive");
  }

  assert.equal(views.walls.count, 4, "one container must expose four walls");
  const wallEdges = [];
  for (let offset = 0; offset < views.walls.values.length; offset += 10) {
    assertIntegerInRange(views.walls.values[offset], 1, 4, "wall id");
    const edge = views.walls.values[offset + 1];
    assertIntegerInRange(edge, 0, 3, "wall edge");
    wallEdges.push(edge);
    assert.ok(views.walls.values[offset + 4] > views.walls.values[offset + 3]);
    assertIntegerInRange(views.walls.values[offset + 9], 0, 1, "movable wall flag");
    assert.equal(views.walls.values[offset + 9], edge === 1 ? 1 : 0);
  }
  assert.deepEqual(wallEdges.sort(), [0, 1, 2, 3]);

  for (let offset = 0; offset < views.events.values.length; offset += 10) {
    assertIntegerInRange(views.events.values[offset], 1, 8, "event kind");
    assert.ok(views.events.values[offset + 6] >= 0, "event age cannot be negative");
    assert.ok(views.events.values[offset + 7] >= 1.2, "event lifetime is too short");
  }
  return views;
}

function mutate(api, name, ...args) {
  const result = api[name](...args);
  return { result, views: readSnapshot(api) };
}

function serializableSnapshot(views) {
  return Object.fromEntries(
    Object.entries(views).map(([name, view]) => [name, [...view.values]]),
  );
}

test("real Wasm implements every ABI v2 command and packed view", async () => {
  const api = await instantiateEngine();
  assert.equal(api.ms_abi_version(), 2);
  assert.equal(api.ms_model_version(), 2);

  let state = mutate(api, "ms_reset", 0x1234_5678).views;
  assert.equal(state.atoms.count, 2, "reset must open the populated make-bond preset");
  assert.equal(state.walls.count, 4);
  assert.equal(state.stats.values[16], 0x1234_5678);

  for (const [experiment, atoms, bonds] of [
    [0, 2, 0],
    [1, 2, 1],
    [2, 24, 12],
    [3, 9, 4],
  ]) {
    const loaded = mutate(api, "ms_load_experiment", experiment);
    assert.equal(loaded.result, 1);
    assert.equal(loaded.views.atoms.count, atoms, `experiment ${experiment} atom count`);
    assert.equal(loaded.views.bonds.count, bonds, `experiment ${experiment} bond count`);
    assert.equal(loaded.views.stats.values[21], experiment);
  }

  state = mutate(api, "ms_set_playing", 0).views;
  assert.equal(state.stats.values[18], 0);
  const pausedTime = state.stats.values[0];
  assert.equal(mutate(api, "ms_advance", 1000).result, 0);
  assert.equal(readSnapshot(api).stats.values[0], pausedTime);
  mutate(api, "ms_set_playing", 1);
  state = mutate(api, "ms_set_temperature", 1).views;
  assert.equal(state.stats.values[2], 1);

  mutate(api, "ms_load_experiment", 0);
  let expectedAtoms = 2;
  for (let ingredient = 0; ingredient < ingredientAtomCounts.length; ingredient += 1) {
    const spawned = mutate(api, "ms_spawn_ingredient", ingredient, 1, -180 + ingredient * 90, 70);
    assert.equal(spawned.result, 1);
    expectedAtoms += ingredientAtomCounts[ingredient];
    assert.equal(spawned.views.atoms.count, expectedAtoms);
  }

  mutate(api, "ms_load_experiment", 2);
  const spark = mutate(api, "ms_apply_spark", 0, 0, 330, 420);
  assert.equal(spark.result, 1);
  assert.ok(spark.views.events.values.some((value, index) => index % 10 === 0 && value === 6));
  assert.equal(mutate(api, "ms_step_fixed", 120).result, 120);
  state = readSnapshot(api);
  assert.ok(state.stats.values[10] > 0, "spark did not enter the breaking-energy ledger");

  mutate(api, "ms_load_experiment", 1);
  state = readSnapshot(api);
  const atomId = state.atoms.values[0];
  assert.equal(mutate(api, "ms_grab_atom", atomId, -8, 0).result, 1);
  assert.equal(readSnapshot(api).atoms.values[10], 1);
  assert.equal(mutate(api, "ms_drag_atom", atomId, -120, 0).result, 1);
  assert.equal(mutate(api, "ms_release_atom", atomId).result, 1);
  assert.equal(readSnapshot(api).atoms.values[10], 0);

  const beforePiston = readSnapshot(api).walls.values.slice(10, 20);
  assert.equal(mutate(api, "ms_set_piston_target", 220).result, 1);
  const targeted = readSnapshot(api).walls.values.slice(10, 20);
  assert.equal(targeted[2], beforePiston[2], "piston teleported on target command");
  assert.equal(targeted[8], 220);
  mutate(api, "ms_step_fixed", 60);
  const moving = readSnapshot(api).walls.values.slice(10, 20);
  assert.ok(moving[2] < beforePiston[2]);
  assert.ok(moving[5] < 0);
});

test("packed pointers are reacquired after every mutation and replay is deterministic", async () => {
  const api = await instantiateEngine();
  mutate(api, "ms_reset", 55);
  mutate(api, "ms_load_experiment", 3);
  const oldLength = api.ms_atoms_len();
  const oldView = new Float32Array(api.memory.buffer, api.ms_atoms_ptr(), oldLength);
  assert.equal(mutate(api, "ms_spawn_ingredient", 4, 1_000, 0, 0).result, 1_000);
  const fresh = readPackedView(api, "atoms", viewDefinitions.atoms);
  assert.ok(fresh.values.length > oldLength);
  assert.notEqual(oldView.length, fresh.values.length, "stale atom view appeared to update in place");

  function deterministicRun() {
    mutate(api, "ms_reset", 0x0bad_c0de);
    mutate(api, "ms_load_experiment", 3);
    mutate(api, "ms_set_temperature", 0.57);
    assert.equal(mutate(api, "ms_spawn_ingredient", 0, 3, -40, 20).result, 3);
    assert.equal(mutate(api, "ms_spawn_ingredient", 1, 2, 45, -20).result, 2);
    assert.equal(mutate(api, "ms_apply_spark", 0, 0, 180, 190).result, 1);
    assert.equal(mutate(api, "ms_set_piston_target", 210).result, 1);
    assert.equal(mutate(api, "ms_step_fixed", 240).result, 240);
    return serializableSnapshot(readSnapshot(api));
  }
  assert.deepEqual(deterministicRun(), deterministicRun());
});

test("non-step commands preserve bond clocks and consume grab work once", async () => {
  const api = await instantiateEngine();
  mutate(api, "ms_reset", 0x4d41_4b45);
  mutate(api, "ms_load_experiment", 0);
  for (let step = 0; step < 240 && api.ms_bonds_len() === 0; step += 1) {
    mutate(api, "ms_step_fixed", 1);
  }
  mutate(api, "ms_set_playing", 0);
  const before = readSnapshot(api);
  assert.equal(before.bonds.count, 1, "reference pair did not begin forming");

  for (let insertion = 0; insertion < 40; insertion += 1) {
    assert.equal(mutate(api, "ms_spawn_ingredient", 0, 1, 200, 160).result, 1);
  }
  const after = readSnapshot(api);
  assert.equal(after.stats.values[0], before.stats.values[0], "simulated time advanced");
  assert.equal(after.stats.values[17], before.stats.values[17], "fixed-step count advanced");
  assert.equal(after.stats.values[9], before.stats.values[9], "formation release advanced");
  for (const [index, label] of [
    [4, "state"],
    [5, "progress"],
    [9, "age"],
  ]) {
    assert.equal(
      after.bonds.values[index],
      before.bonds.values[index],
      `an insertion command advanced bond ${label}`,
    );
  }

  mutate(api, "ms_load_experiment", 1);
  const atomId = readSnapshot(api).atoms.values[0];
  assert.equal(mutate(api, "ms_grab_atom", atomId, -8, 0).result, 1);
  assert.equal(mutate(api, "ms_drag_atom", atomId, -150, 0).result, 1);
  assert.equal(mutate(api, "ms_spawn_ingredient", 0, 1, 200, 160).views.stats.values[11], 0);
  mutate(api, "ms_step_fixed", 1);
  const accounted = readSnapshot(api).stats.values[11];
  assert.ok(accounted > 0, "pointer work was not recorded on the next fixed step");
  mutate(api, "ms_step_fixed", 1);
  assert.equal(readSnapshot(api).stats.values[11], accounted, "pointer work was counted twice");
});

test("real Wasm rejects invalid commands and corrupt modules fail closed", async () => {
  const api = await instantiateEngine();
  mutate(api, "ms_reset", 1);
  assert.equal(mutate(api, "ms_load_experiment", 99).result, 0);
  assert.equal(mutate(api, "ms_spawn_ingredient", 99, 4, 0, 0).result, 0);
  assert.equal(mutate(api, "ms_spawn_ingredient", 0, 4, Number.NaN, 0).result, 0);
  assert.equal(mutate(api, "ms_apply_spark", 0, 0, Number.POSITIVE_INFINITY, 80).result, 0);
  assert.equal(mutate(api, "ms_grab_atom", 0xffff_ffff, 0, 0).result, 0);
  assert.equal(mutate(api, "ms_set_piston_target", Number.NaN).result, 0);
  await assert.rejects(WebAssembly.compile(Uint8Array.from([0, 97, 115, 109, 1])));
});

test("checked-in artifact identity matches the ABI v2 manifest", async (context) => {
  if (process.env.MOLECULARSETUP_ENGINE_WASM) {
    context.skip("build smoke uses an unpublished target artifact");
    return;
  }
  const bytes = await readFile(engineUrl());
  const manifest = JSON.parse(
    await readFile(new URL("../public/engine/molecularsetup_engine.manifest.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.abiVersion, 2);
  assert.equal(manifest.modelVersion, 2);
  assert.equal(manifest.wasmBytes, bytes.length);
  assert.equal(manifest.wasmSha256, createHash("sha256").update(bytes).digest("hex"));
});
