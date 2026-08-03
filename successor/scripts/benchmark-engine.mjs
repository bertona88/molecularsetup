import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const artifact = new URL(
  process.argv[2] ?? "../public/engine/molecularsetup_engine.wasm",
  import.meta.url,
);
const bytes = await readFile(artifact);
const module = await WebAssembly.compile(bytes);
const instance = await WebAssembly.instantiate(module, {});
const engine = instance.exports;

function statistics() {
  return new Float64Array(
    engine.memory.buffer,
    engine.ms_stats_ptr(),
    engine.ms_stats_len(),
  ).slice();
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const results = [];
for (const waterMolecules of [0, 10, 30, 100, 300]) {
  engine.ms_reset(0x1234_5678);
  engine.ms_load_experiment(3);
  if (waterMolecules > 0) {
    engine.ms_spawn_ingredient(4, waterMolecules, 0, 0);
  }
  for (let frame = 0; frame < 30; frame += 1) engine.ms_advance(1_000 / 60);

  const samples = [];
  for (let repeat = 0; repeat < 3; repeat += 1) {
    const started = performance.now();
    for (let frame = 0; frame < 120; frame += 1) engine.ms_advance(1_000 / 60);
    samples.push(performance.now() - started);
  }
  const stats = statistics();
  results.push({
    waterMolecules,
    atoms: stats[13],
    bonds: stats[14],
    events: stats[15],
    millisecondsPerFrame: median(samples) / 120,
  });
}

console.table(results);
