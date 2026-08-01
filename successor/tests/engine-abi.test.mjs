import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedAbiVersion = 1;
const expectedModelVersion = 1;
const expectedAtomCount = 21;
const speciesAtomCounts = [3, 2, 2, 5, 4, 3, 1, 1];
const viewDefinitions = {
  atoms: { ArrayType: Float32Array, stride: 16 },
  bonds: { ArrayType: Float32Array, stride: 6 },
  boundaries: { ArrayType: Float32Array, stride: 11 },
  events: { ArrayType: Float32Array, stride: 8 },
  stats: { ArrayType: Float64Array, stride: 21 },
};

const requiredFunctions = [
  "ms_model_version",
  "ms_abi_version",
  "ms_reset",
  "ms_set_playing",
  "ms_set_temperature",
  "ms_set_thermostat_gamma",
  "ms_spawn",
  "ms_flush_spawns",
  "ms_advance",
  "ms_step_fixed",
  "ms_create_boundary",
  "ms_move_boundary_edge",
  "ms_remove_boundary",
  ...Object.keys(viewDefinitions).flatMap((name) => [
    `ms_${name}_ptr`,
    `ms_${name}_len`,
    `ms_${name}_stride`,
  ]),
];

async function instantiateEngine() {
  const wasmUrl = new URL(
    process.env.MOLECULARSETUP_ENGINE_WASM ??
      "../public/engine/molecularsetup_engine.wasm",
    import.meta.url,
  );
  const bytes = await readFile(wasmUrl);
  const wasmModule = await WebAssembly.compile(bytes);
  assert.deepEqual(
    WebAssembly.Module.imports(wasmModule),
    [],
    "the browser engine must have zero imports",
  );
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
  // Commands may grow memory or replace vectors. Fetch memory, pointer, and
  // length again every time, then copy before another command can run.
  const stride = api[`ms_${name}_stride`]();
  const length = api[`ms_${name}_len`]();
  const pointer = api[`ms_${name}_ptr`]();
  const { ArrayType, stride: expectedStride } = definition;
  const byteLength = length * ArrayType.BYTES_PER_ELEMENT;
  const memory = api.memory.buffer;

  assert.equal(stride, expectedStride, `${name} stride changed`);
  assertIntegerInRange(length, 0, 0xffff_ffff, `${name} scalar length`);
  assert.equal(length % stride, 0, `${name} contains an incomplete record`);
  assertIntegerInRange(pointer, 0, memory.byteLength, `${name} pointer`);
  assert.equal(
    pointer % ArrayType.BYTES_PER_ELEMENT,
    0,
    `${name} pointer is misaligned`,
  );
  assert.ok(
    pointer + byteLength <= memory.byteLength,
    `${name} view extends beyond exported memory`,
  );

  const values = new ArrayType(memory, pointer, length).slice();
  for (let index = 0; index < values.length; index += 1) {
    assert.ok(Number.isFinite(values[index]), `${name}[${index}] is not finite`);
  }
  return { count: length / stride, stride, values };
}

function readSnapshot(api) {
  const views = Object.fromEntries(
    Object.entries(viewDefinitions).map(([name, definition]) => [
      name,
      readPackedView(api, name, definition),
    ]),
  );
  const atomCount = views.atoms.count;

  assert.equal(views.stats.count, 1, "stats must contain exactly one record");
  const stats = views.stats.values;
  assert.equal(stats[10], atomCount, "stats atom count disagrees with atom view");
  assert.equal(stats[11], views.bonds.count, "stats bond count disagrees with bond view");
  assert.equal(
    stats[12],
    views.boundaries.count,
    "stats boundary count disagrees with boundary view",
  );
  assert.equal(stats[17], 18_000, "atom capacity changed");
  assert.equal(stats[19], expectedModelVersion, "stats model version changed");
  assert.equal(stats[20], expectedAbiVersion, "stats ABI version changed");

  for (let offset = 0; offset < views.atoms.values.length; offset += 16) {
    assertIntegerInRange(views.atoms.values[offset], 0, 0xffff_ffff, "atom id");
    assertIntegerInRange(views.atoms.values[offset + 1], 0, 5, "element id");
    assert.ok(
      views.atoms.values[offset + 12] >= 0 &&
        views.atoms.values[offset + 12] <= 8,
      `atom coordination must be in [0, 8]; got ${views.atoms.values[offset + 12]}`,
    );
    assertIntegerInRange(
      views.atoms.values[offset + 13],
      0,
      0xffff_ffff,
      "atom boundary id",
    );
    assertIntegerInRange(views.atoms.values[offset + 15], 0, 0xffff, "atom flags");
  }

  for (let offset = 0; offset < views.bonds.values.length; offset += 6) {
    const atomA = views.bonds.values[offset];
    const atomB = views.bonds.values[offset + 1];
    assertIntegerInRange(atomA, 0, atomCount - 1, "bond atom A");
    assertIntegerInRange(atomB, 0, atomCount - 1, "bond atom B");
    assert.notEqual(atomA, atomB, "bond cannot connect an atom to itself");
    assert.ok(views.bonds.values[offset + 2] >= 0, "bond order cannot be negative");
    assert.equal(views.bonds.values[offset + 5], 0, "reserved bond flags must be zero");
  }

  for (let offset = 0; offset < views.boundaries.values.length; offset += 11) {
    assertIntegerInRange(
      views.boundaries.values[offset],
      1,
      0xffff_ffff,
      "boundary id",
    );
    assert.ok(views.boundaries.values[offset + 3] > 0, "boundary width must be positive");
    assert.ok(views.boundaries.values[offset + 4] > 0, "boundary height must be positive");
    assertIntegerInRange(
      views.boundaries.values[offset + 10],
      0,
      atomCount,
      "assigned atom count",
    );
  }

  for (let offset = 0; offset < views.events.values.length; offset += 8) {
    assertIntegerInRange(views.events.values[offset], 1, 3, "event kind");
    for (const fieldOffset of [1, 2]) {
      const atomIndex = views.events.values[offset + fieldOffset];
      if (atomIndex !== -1) {
        assertIntegerInRange(atomIndex, 0, atomCount - 1, "event atom index");
      }
    }
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

test("engine implements the frozen zero-import ABI and deterministic state views", async () => {
  const api = await instantiateEngine();
  assert.equal(api.ms_abi_version(), expectedAbiVersion);
  assert.equal(api.ms_model_version(), expectedModelVersion);

  let state = mutate(api, "ms_reset", 0x1234_5678).views;
  assert.equal(state.atoms.count, 0);
  assert.equal(state.bonds.count, 0);
  assert.equal(state.boundaries.count, 0);
  assert.equal(state.stats.values[14], 0x1234_5678);

  state = mutate(api, "ms_set_playing", 0).views;
  assert.equal(state.stats.values[16], 0, "engine did not pause");
  const pausedAdvance = mutate(api, "ms_advance", 1000);
  assert.equal(pausedAdvance.result, 0, "paused engine advanced fixed steps");
  assert.equal(pausedAdvance.views.stats.values[0], 0, "paused engine advanced time");

  let queuedAtoms = 0;
  for (let species = 0; species < speciesAtomCounts.length; species += 1) {
    const spawn = mutate(api, "ms_spawn", species, 1, -280 + species * 80, 0);
    assert.equal(spawn.result, 1, `species ${species} was not accepted`);
    queuedAtoms += speciesAtomCounts[species];
    assert.equal(spawn.views.stats.values[10], 0, "queued atoms materialized early");
    assert.equal(spawn.views.stats.values[13], species + 1, "pending molecule accounting drifted");
  }
  assert.equal(queuedAtoms, expectedAtomCount);

  const flush = mutate(api, "ms_flush_spawns", 100);
  assert.equal(flush.result, speciesAtomCounts.length);
  state = flush.views;
  assert.equal(state.atoms.count, expectedAtomCount);
  assert.equal(state.stats.values[13], 0);
  const settled = mutate(api, "ms_step_fixed", 32);
  assert.equal(settled.result, 32);
  state = settled.views;
  assert.ok(state.bonds.count > 0, "settled starting structures expose no derived bonds");

  const pausedTime = state.stats.values[0];
  const pausedSteps = state.stats.values[15];
  const created = mutate(api, "ms_create_boundary", -360, -100, 720, 200);
  assert.ok(created.result > 0, "valid boundary creation failed");
  const boundaryId = created.result;
  state = created.views;
  assert.equal(state.boundaries.count, 1);
  assert.equal(state.boundaries.values[10], expectedAtomCount);
  assert.equal(state.stats.values[0], pausedTime, "boundary creation advanced time while paused");
  assert.equal(state.stats.values[15], pausedSteps, "boundary creation ran a fixed step");

  const moved = mutate(api, "ms_move_boundary_edge", boundaryId, 1, 340);
  assert.equal(moved.result, 1, "moving the right boundary edge failed");
  state = moved.views;
  assert.equal(state.boundaries.values[1], -360);
  assert.equal(state.boundaries.values[3], 700);
  assert.equal(state.stats.values[0], pausedTime, "wall edit advanced time while paused");
  assert.equal(state.stats.values[15], pausedSteps, "wall edit ran a fixed step");

  const removed = mutate(api, "ms_remove_boundary", boundaryId);
  assert.equal(removed.result, 1, "boundary removal failed");
  state = removed.views;
  assert.equal(state.boundaries.count, 0);
  for (let offset = 13; offset < state.atoms.values.length; offset += 16) {
    assert.equal(state.atoms.values[offset], 0, "removed boundary remained assigned to an atom");
  }

  state = mutate(api, "ms_reset", 77).views;
  assert.equal(state.atoms.count, 0);
  assert.equal(state.bonds.count, 0);
  assert.equal(state.boundaries.count, 0);
  assert.equal(state.events.count, 0);
  assert.equal(state.stats.values[13], 0);
  assert.equal(state.stats.values[14], 77);

  function deterministicRun() {
    mutate(api, "ms_reset", 0x0bad_c0de);
    mutate(api, "ms_set_temperature", 0.42);
    mutate(api, "ms_set_thermostat_gamma", 1.5);
    assert.equal(mutate(api, "ms_spawn", 0, 2, -18, 0).result, 2);
    assert.equal(mutate(api, "ms_spawn", 1, 2, 18, 0).result, 2);
    assert.equal(mutate(api, "ms_flush_spawns", 10).result, 4);
    assert.ok(mutate(api, "ms_create_boundary", -90, -70, 180, 140).result > 0);
    assert.equal(mutate(api, "ms_step_fixed", 12).result, 12);
    return serializableSnapshot(readSnapshot(api));
  }

  assert.deepEqual(
    deterministicRun(),
    deterministicRun(),
    "identical seed and commands did not reproduce identical packed state",
  );
});
