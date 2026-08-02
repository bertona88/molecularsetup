import {
  type ElementKey,
  type EngineIngredientId,
  type Ingredient,
  type IngredientKey,
  elementPresentation,
  ingredientEngineId,
} from "./molecular-catalog";

export const ENGINE_WASM_URL = `${import.meta.env.BASE_URL}engine/molecularsetup_engine.wasm`;
export const ENGINE_ABI_VERSION = 2;
export const ENGINE_MODEL_VERSION = 2;
export const DEFAULT_WORLD_SEED = 0x4d4f4c45;

export const EXPERIMENT_ID = {
  makeBond: 0,
  breakBond: 1,
  ignite: 2,
  freePlay: 3,
} as const;

export type ExperimentKey = keyof typeof EXPERIMENT_ID;
export type EngineExperimentId = (typeof EXPERIMENT_ID)[ExperimentKey];

const ATOM_STRIDE = 16;
const BOND_STRIDE = 10;
const WALL_STRIDE = 10;
const EVENT_STRIDE = 10;
const STATS_STRIDE = 28;

const ATOM_ID = 0;
const ATOM_ELEMENT = 1;
const ATOM_X = 2;
const ATOM_Y = 3;
const ATOM_VX = 6;
const ATOM_VY = 7;
const ATOM_RADIUS = 8;
const ATOM_EXCITATION = 9;
const ATOM_GRABBED = 10;

const BOND_ID = 0;
const BOND_ATOM_A = 1;
const BOND_ATOM_B = 2;
const BOND_ORDER = 3;
const BOND_STATE = 4;
const BOND_PROGRESS = 5;
const BOND_STRAIN = 6;
const BOND_ENERGY = 7;

const BOND_FORMING = 0;
const BOND_STABLE = 1;
const BOND_STRESSED = 2;
const BOND_BREAKING = 3;

const WALL_ID = 0;
const WALL_EDGE = 1;
const WALL_POSITION = 2;
const WALL_START = 3;
const WALL_END = 4;
const WALL_VELOCITY = 5;
const WALL_LOAD = 6;
const WALL_IMPACT = 7;
const WALL_TARGET = 8;
const WALL_MOVABLE = 9;

const EVENT_KIND = 0;
const EVENT_X = 3;
const EVENT_Y = 4;
const EVENT_MAGNITUDE = 5;
const EVENT_AGE = 6;
const EVENT_LIFETIME = 7;
const EVENT_ENERGY = 8;

const EVENT_COLLISION = 1;
const EVENT_BOND_FORMING = 2;
const EVENT_BOND_FORMED = 3;
const EVENT_BOND_STRESSED = 4;
const EVENT_BOND_BROKEN = 5;
const EVENT_SPARK = 6;
const EVENT_WALL = 7;
const EVENT_ENERGY_PULSE = 8;

const STAT_SIMULATED_TIME = 0;
const STAT_FIXED_TIMESTEP = 1;
const STAT_TEMPERATURE_CONTROL = 2;
const STAT_TARGET_TEMPERATURE = 3;
const STAT_RMS_SPEED = 4;
const STAT_KINETIC_ENERGY = 5;
const STAT_POTENTIAL_ENERGY = 6;
const STAT_TOTAL_ENERGY = 7;
const STAT_THERMAL_EXCHANGE = 8;
const STAT_FORMATION_RELEASE = 9;
const STAT_BREAKING_ABSORPTION = 10;
const STAT_GRAB_WORK = 11;
const STAT_WALL_WORK = 12;
const STAT_ATOM_COUNT = 13;
const STAT_BOND_COUNT = 14;
const STAT_EVENT_COUNT = 15;
const STAT_SEED = 16;
const STAT_COMPLETED_STEPS = 17;
const STAT_PLAYING = 18;
const STAT_ATOM_CAPACITY = 19;
const STAT_REJECTED_INGREDIENTS = 20;
const STAT_EXPERIMENT = 21;
const STAT_MODEL_VERSION = 22;
const STAT_ABI_VERSION = 23;
const STAT_SPARK_COUNT = 24;
const STAT_COLLISION_COUNT = 25;
const STAT_PRESSURE = 26;
const STAT_LEDGER_TOTAL = 27;

const EMPTY_F32: Float32Array<ArrayBufferLike> = new Float32Array(0);
const EMPTY_F64: Float64Array<ArrayBufferLike> = new Float64Array(0);

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const finite = (value: number) => Number.isFinite(value);

type RawEngineExports = {
  memory: WebAssembly.Memory;
  ms_model_version: () => number;
  ms_abi_version: () => number;
  ms_reset: (seed: number) => void;
  ms_load_experiment: (experiment: number) => number;
  ms_set_playing: (playing: number) => void;
  ms_set_temperature: (temperature: number) => void;
  ms_spawn_ingredient: (
    ingredient: number,
    count: number,
    x: number,
    y: number,
  ) => number;
  ms_apply_spark: (
    x: number,
    y: number,
    energy: number,
    radius: number,
  ) => number;
  ms_grab_atom: (atomId: number, x: number, y: number) => number;
  ms_drag_atom: (atomId: number, x: number, y: number) => number;
  ms_release_atom: (atomId: number) => number;
  ms_set_piston_target: (coordinate: number) => number;
  ms_advance: (realDeltaMilliseconds: number) => number;
  ms_step_fixed: (count: number) => number;
  ms_atoms_ptr: () => number;
  ms_atoms_len: () => number;
  ms_atoms_stride: () => number;
  ms_bonds_ptr: () => number;
  ms_bonds_len: () => number;
  ms_bonds_stride: () => number;
  ms_walls_ptr: () => number;
  ms_walls_len: () => number;
  ms_walls_stride: () => number;
  ms_events_ptr: () => number;
  ms_events_len: () => number;
  ms_events_stride: () => number;
  ms_stats_ptr: () => number;
  ms_stats_len: () => number;
  ms_stats_stride: () => number;
};

const REQUIRED_FUNCTION_EXPORTS = [
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
  "ms_atoms_ptr",
  "ms_atoms_len",
  "ms_atoms_stride",
  "ms_bonds_ptr",
  "ms_bonds_len",
  "ms_bonds_stride",
  "ms_walls_ptr",
  "ms_walls_len",
  "ms_walls_stride",
  "ms_events_ptr",
  "ms_events_len",
  "ms_events_stride",
  "ms_stats_ptr",
  "ms_stats_len",
  "ms_stats_stride",
] as const;

export type EngineLoadStatus = "idle" | "loading" | "ready" | "error";

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export type AtomHit = {
  id: number;
  index: number;
  x: number;
  y: number;
  radius: number;
};

export type PistonHit = {
  id: number;
  edge: number;
  position: number;
  start: number;
  end: number;
};

export type EngineStatistics = {
  simulatedTime: number;
  fixedTimestep: number;
  temperatureControl: number;
  targetTemperature: number;
  rmsSpeed: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  thermalExchange: number;
  formationRelease: number;
  breakingAbsorption: number;
  grabWork: number;
  wallWork: number;
  atomCount: number;
  bondCount: number;
  eventCount: number;
  seed: number;
  completedSteps: number;
  playing: boolean;
  atomCapacity: number;
  rejectedIngredients: number;
  experiment: number;
  modelVersion: number;
  abiVersion: number;
  sparkCount: number;
  collisionCount: number;
  pressure: number;
  ledgerTotal: number;
};

export type MolecularWorldOptions = {
  wasmUrl?: string;
  seed?: number;
  experiment?: ExperimentKey;
  fetcher?: typeof fetch;
};

type SemanticCommand =
  | { kind: "reset"; seed: number }
  | { kind: "load-experiment"; experiment: EngineExperimentId }
  | { kind: "set-playing"; playing: boolean }
  | { kind: "set-temperature"; temperature: number }
  | {
      kind: "spawn";
      ingredient: EngineIngredientId;
      count: number;
      x: number;
      y: number;
    }
  | { kind: "spark"; x: number; y: number; energy: number; radius: number }
  | { kind: "grab"; atomId: number; x: number; y: number }
  | { kind: "drag"; atomId: number; x: number; y: number }
  | { kind: "release"; atomId: number }
  | { kind: "piston"; coordinate: number };

export class MolecularEngineError extends Error {
  readonly causeValue: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "MolecularEngineError";
    this.causeValue = cause;
  }
}

export class MolecularWorld {
  camera: Camera = { x: 0, y: 0, zoom: 1 };
  viewportWidth = 1_000;
  viewportHeight = 700;

  private readonly wasmUrl: string;
  private readonly fetcher?: typeof fetch;
  private readonly initialSeed: number;
  private engine: RawEngineExports | null = null;
  private initialization: Promise<void> | null = null;
  private statusValue: EngineLoadStatus = "idle";
  private errorValue: MolecularEngineError | null = null;
  private commands: SemanticCommand[] = [];
  private atomsView = EMPTY_F32;
  private bondsView = EMPTY_F32;
  private wallsView = EMPTY_F32;
  private eventsView = EMPTY_F32;
  private statsView = EMPTY_F64;
  private presentationPlaying = true;
  private presentationTemperature = 0;
  private presentationSeed: number;
  private presentationExperiment: ExperimentKey;
  private grabTarget: { atomId: number; x: number; y: number } | null = null;

  constructor(options: MolecularWorldOptions = {}) {
    this.wasmUrl = options.wasmUrl ?? ENGINE_WASM_URL;
    this.fetcher = options.fetcher;
    this.initialSeed = (options.seed ?? DEFAULT_WORLD_SEED) >>> 0;
    this.presentationSeed = this.initialSeed;
    this.presentationExperiment = options.experiment ?? "makeBond";
  }

  get status(): EngineLoadStatus {
    return this.statusValue;
  }

  get isReady(): boolean {
    return this.statusValue === "ready";
  }

  get loadError(): MolecularEngineError | null {
    return this.errorValue;
  }

  get playing(): boolean {
    return this.presentationPlaying;
  }

  get temperature(): number {
    return this.presentationTemperature;
  }

  get experiment(): ExperimentKey {
    return this.presentationExperiment;
  }

  get atomCount(): number {
    return this.atomsView.length / ATOM_STRIDE;
  }

  get bondCount(): number {
    return this.bondsView.length / BOND_STRIDE;
  }

  async initialize(): Promise<void> {
    if (this.statusValue === "ready") return;
    if (this.statusValue === "error") {
      throw this.errorValue ?? new MolecularEngineError("Engine unavailable.");
    }
    if (this.initialization) return this.initialization;
    this.statusValue = "loading";
    this.initialization = this.loadEngine();
    return this.initialization;
  }

  private async loadEngine(): Promise<void> {
    try {
      const fetcher = this.fetcher ?? globalThis.fetch?.bind(globalThis);
      if (!fetcher) {
        throw new MolecularEngineError("No Fetch implementation can load the molecular engine.");
      }
      const response = await fetcher(this.wasmUrl, { credentials: "same-origin" });
      if (!response.ok) {
        throw new MolecularEngineError(`Molecular engine request failed with HTTP ${response.status}.`);
      }
      const bytes = await response.arrayBuffer();
      const wasmModule = await WebAssembly.compile(bytes);
      const imports = WebAssembly.Module.imports(wasmModule);
      if (imports.length !== 0) {
        throw new MolecularEngineError(
          `Molecular engine must have zero imports; found ${imports
            .map((entry) => `${entry.module}.${entry.name}`)
            .join(", ")}.`,
        );
      }
      const instance = await WebAssembly.instantiate(wasmModule, {});
      const engine = validateRawExports(instance.exports);
      const abiVersion = unsignedResult(engine.ms_abi_version(), "ms_abi_version");
      const modelVersion = unsignedResult(engine.ms_model_version(), "ms_model_version");
      if (abiVersion !== ENGINE_ABI_VERSION || modelVersion !== ENGINE_MODEL_VERSION) {
        throw new MolecularEngineError(
          `Unsupported molecular engine ${abiVersion}/${modelVersion}; expected 2/2.`,
        );
      }

      this.engine = engine;
      this.mutate(() => engine.ms_reset(this.initialSeed));
      this.mutate(() =>
        unsignedResult(
          engine.ms_load_experiment(EXPERIMENT_ID[this.presentationExperiment]),
          "ms_load_experiment",
        ),
      );
      const queued = this.commands;
      this.commands = [];
      for (const command of queued) this.execute(command);
      this.statusValue = "ready";
    } catch (cause) {
      const error =
        cause instanceof MolecularEngineError
          ? cause
          : new MolecularEngineError("The molecular engine could not be initialized.", cause);
      this.fail(error);
      throw error;
    }
  }

  setViewport(width: number, height: number): void {
    if (!finite(width) || !finite(height)) return;
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
  }

  screenToWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - this.viewportWidth / 2) / this.camera.zoom + this.camera.x,
      y: (screenY - this.viewportHeight / 2) / this.camera.zoom + this.camera.y,
    };
  }

  worldToScreen(worldX: number, worldY: number) {
    return {
      x: (worldX - this.camera.x) * this.camera.zoom + this.viewportWidth / 2,
      y: (worldY - this.camera.y) * this.camera.zoom + this.viewportHeight / 2,
    };
  }

  loadExperiment(experiment: ExperimentKey): void {
    this.presentationExperiment = experiment;
    this.presentationPlaying = true;
    this.grabTarget = null;
    this.dispatch({ kind: "load-experiment", experiment: EXPERIMENT_ID[experiment] });
  }

  setPlaying(value: boolean): void {
    this.presentationPlaying = Boolean(value);
    this.dispatch({ kind: "set-playing", playing: this.presentationPlaying });
  }

  setTemperature(value: number): void {
    if (!finite(value)) throw new TypeError("Temperature must be finite.");
    this.presentationTemperature = clamp(value, 0, 1);
    this.dispatch({ kind: "set-temperature", temperature: this.presentationTemperature });
  }

  spawnIngredient(
    ingredient: Ingredient | IngredientKey | EngineIngredientId,
    x: number,
    y: number,
    count = 1,
  ): boolean {
    if (![x, y, count].every(finite)) throw new TypeError("Spawn input must be finite.");
    const wholeCount = clamp(Math.trunc(count), 0, 1_000);
    if (wholeCount === 0) return false;
    const result = this.dispatch({
      kind: "spawn",
      ingredient: ingredientEngineId(ingredient),
      count: wholeCount,
      x,
      y,
    });
    return result === undefined || result > 0;
  }

  applySpark(x: number, y: number, energy = 330, radius = 420): boolean {
    if (![x, y, energy, radius].every(finite)) {
      throw new TypeError("Spark input must be finite.");
    }
    const result = this.dispatch({ kind: "spark", x, y, energy, radius });
    return result === undefined || result > 0;
  }

  hitAtom(worldX: number, worldY: number): AtomHit | null {
    const tolerance = 8 / this.camera.zoom;
    for (
      let offset = this.atomsView.length - ATOM_STRIDE;
      offset >= 0;
      offset -= ATOM_STRIDE
    ) {
      const x = this.atomsView[offset + ATOM_X];
      const y = this.atomsView[offset + ATOM_Y];
      const radius = this.atomsView[offset + ATOM_RADIUS];
      const id = Math.trunc(this.atomsView[offset + ATOM_ID]);
      if (![x, y, radius].every(finite) || id <= 0) continue;
      if (Math.hypot(worldX - x, worldY - y) <= radius + tolerance) {
        return { id, index: offset / ATOM_STRIDE, x, y, radius };
      }
    }
    return null;
  }

  grabAtom(atomId: number, x: number, y: number): boolean {
    const normalizedId = atomId >>> 0;
    if (normalizedId === 0 || !finite(x) || !finite(y)) return false;
    this.grabTarget = { atomId: normalizedId, x, y };
    const result = this.dispatch({ kind: "grab", atomId: normalizedId, x, y });
    return result === undefined || result > 0;
  }

  dragAtom(atomId: number, x: number, y: number): boolean {
    const normalizedId = atomId >>> 0;
    if (!finite(x) || !finite(y)) return false;
    this.grabTarget = { atomId: normalizedId, x, y };
    const result = this.dispatch({ kind: "drag", atomId: normalizedId, x, y });
    return result === undefined || result > 0;
  }

  releaseAtom(atomId: number): boolean {
    const normalizedId = atomId >>> 0;
    this.grabTarget = null;
    const result = this.dispatch({ kind: "release", atomId: normalizedId });
    return result === undefined || result > 0;
  }

  hitPiston(worldX: number, worldY: number): PistonHit | null {
    const tolerance = 20 / this.camera.zoom;
    for (let offset = 0; offset < this.wallsView.length; offset += WALL_STRIDE) {
      const movable = this.wallsView[offset + WALL_MOVABLE] !== 0;
      const edge = Math.trunc(this.wallsView[offset + WALL_EDGE]);
      const position = this.wallsView[offset + WALL_POSITION];
      const start = this.wallsView[offset + WALL_START];
      const end = this.wallsView[offset + WALL_END];
      const id = Math.trunc(this.wallsView[offset + WALL_ID]);
      if (
        movable &&
        edge === 1 &&
        Math.abs(worldX - position) <= tolerance &&
        worldY >= start - tolerance &&
        worldY <= end + tolerance
      ) {
        return { id, edge, position, start, end };
      }
    }
    return null;
  }

  setPistonTarget(worldX: number): boolean {
    if (!finite(worldX)) return false;
    const result = this.dispatch({ kind: "piston", coordinate: worldX });
    return result === undefined || result > 0;
  }

  advance(realDeltaMilliseconds: number): number {
    if (!this.isReady || !this.engine) return 0;
    if (!finite(realDeltaMilliseconds) || realDeltaMilliseconds < 0) {
      throw new RangeError("Frame delta must be finite and nonnegative.");
    }
    return this.mutate(() =>
      unsignedResult(this.requireEngine().ms_advance(realDeltaMilliseconds), "ms_advance"),
    );
  }

  stepFixed(count = 1): number {
    if (!this.isReady || !this.engine) return 0;
    const wholeCount = Math.max(0, Math.trunc(count));
    if (wholeCount === 0) return 0;
    return this.mutate(() =>
      unsignedResult(this.requireEngine().ms_step_fixed(wholeCount), "ms_step_fixed"),
    );
  }

  reset(seed = this.initialSeed): void {
    const normalizedSeed = seed >>> 0;
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.presentationSeed = normalizedSeed;
    this.presentationPlaying = true;
    this.grabTarget = null;
    if (!this.isReady) this.commands = [];
    this.dispatch({ kind: "reset", seed: normalizedSeed });
    this.dispatch({
      kind: "load-experiment",
      experiment: EXPERIMENT_ID[this.presentationExperiment],
    });
  }

  summary(): string {
    if (this.statusValue === "error") {
      return "Molecular engine unavailable. The world is stopped.";
    }
    if (this.statusValue !== "ready") {
      return "Molecular engine loading.";
    }
    const counts = new Map<ElementKey, number>();
    let excited = 0;
    let grabbed = 0;
    for (let offset = 0; offset < this.atomsView.length; offset += ATOM_STRIDE) {
      const element = elementPresentation(Math.trunc(this.atomsView[offset + ATOM_ELEMENT]));
      if (element) counts.set(element.symbol, (counts.get(element.symbol) ?? 0) + 1);
      if (this.atomsView[offset + ATOM_EXCITATION] > 20) excited += 1;
      if (this.atomsView[offset + ATOM_GRABBED] !== 0) grabbed += 1;
    }
    const elements = Array.from(counts.entries())
      .map(([element, count]) => `${count} ${element}`)
      .join(", ");
    const states = [0, 0, 0, 0];
    for (let offset = 0; offset < this.bondsView.length; offset += BOND_STRIDE) {
      const state = Math.trunc(this.bondsView[offset + BOND_STATE]);
      if (state >= 0 && state < states.length) states[state] += 1;
    }
    return `${this.atomCount} atoms${elements ? `: ${elements}` : ""}. ${this.bondCount} bonds: ${states[0]} forming, ${states[1]} stable, ${states[2]} stressed, ${states[3]} breaking. ${excited} excited atoms.${grabbed > 0 ? ` ${grabbed} grabbed.` : ""} Simulation ${this.playing ? "playing" : "paused"}.`;
  }

  statistics(): EngineStatistics | null {
    if (this.statsView.length !== STATS_STRIDE) return null;
    return {
      simulatedTime: this.statsView[STAT_SIMULATED_TIME],
      fixedTimestep: this.statsView[STAT_FIXED_TIMESTEP],
      temperatureControl: this.statsView[STAT_TEMPERATURE_CONTROL],
      targetTemperature: this.statsView[STAT_TARGET_TEMPERATURE],
      rmsSpeed: this.statsView[STAT_RMS_SPEED],
      kineticEnergy: this.statsView[STAT_KINETIC_ENERGY],
      potentialEnergy: this.statsView[STAT_POTENTIAL_ENERGY],
      totalEnergy: this.statsView[STAT_TOTAL_ENERGY],
      thermalExchange: this.statsView[STAT_THERMAL_EXCHANGE],
      formationRelease: this.statsView[STAT_FORMATION_RELEASE],
      breakingAbsorption: this.statsView[STAT_BREAKING_ABSORPTION],
      grabWork: this.statsView[STAT_GRAB_WORK],
      wallWork: this.statsView[STAT_WALL_WORK],
      atomCount: this.statsView[STAT_ATOM_COUNT],
      bondCount: this.statsView[STAT_BOND_COUNT],
      eventCount: this.statsView[STAT_EVENT_COUNT],
      seed: this.statsView[STAT_SEED],
      completedSteps: this.statsView[STAT_COMPLETED_STEPS],
      playing: this.statsView[STAT_PLAYING] !== 0,
      atomCapacity: this.statsView[STAT_ATOM_CAPACITY],
      rejectedIngredients: this.statsView[STAT_REJECTED_INGREDIENTS],
      experiment: this.statsView[STAT_EXPERIMENT],
      modelVersion: this.statsView[STAT_MODEL_VERSION],
      abiVersion: this.statsView[STAT_ABI_VERSION],
      sparkCount: this.statsView[STAT_SPARK_COUNT],
      collisionCount: this.statsView[STAT_COLLISION_COUNT],
      pressure: this.statsView[STAT_PRESSURE],
      ledgerTotal: this.statsView[STAT_LEDGER_TOTAL],
    };
  }

  render(context: CanvasRenderingContext2D, reducedMotion: boolean): void {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    context.clearRect(0, 0, width, height);
    this.renderField(context, width, height);
    this.renderContainerInterior(context);
    if (this.statusValue === "ready") {
      this.renderEventTraces(context, reducedMotion);
      this.renderGrabTether(context);
      this.renderAtoms(context, width, height);
      this.renderBondsAboveAtoms(context, width, height, reducedMotion);
      this.renderWalls(context);
    }
  }

  private renderField(context: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = context.createRadialGradient(
      width * 0.52,
      height * 0.46,
      20,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.78,
    );
    gradient.addColorStop(0, "#102738");
    gradient.addColorStop(0.58, "#091a28");
    gradient.addColorStop(1, "#06121d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const spacing = 52 * this.camera.zoom;
    if (spacing < 18) return;
    const origin = this.worldToScreen(0, 0);
    context.save();
    context.strokeStyle = "rgba(151, 205, 224, .045)";
    context.lineWidth = 1;
    context.beginPath();
    for (let x = ((origin.x % spacing) + spacing) % spacing; x < width; x += spacing) {
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }
    for (let y = ((origin.y % spacing) + spacing) % spacing; y < height; y += spacing) {
      context.moveTo(0, y);
      context.lineTo(width, y);
    }
    context.stroke();
    context.restore();
  }

  private renderContainerInterior(context: CanvasRenderingContext2D): void {
    const bounds = this.containerScreenBounds();
    if (!bounds) return;
    const gradient = context.createLinearGradient(bounds.left, bounds.top, bounds.right, bounds.bottom);
    gradient.addColorStop(0, "rgba(21, 52, 67, .24)");
    gradient.addColorStop(1, "rgba(4, 18, 29, .12)");
    context.fillStyle = gradient;
    context.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  }

  private renderEventTraces(context: CanvasRenderingContext2D, reducedMotion: boolean): void {
    for (let offset = 0; offset < this.eventsView.length; offset += EVENT_STRIDE) {
      const kind = Math.trunc(this.eventsView[offset + EVENT_KIND]);
      const x = this.eventsView[offset + EVENT_X];
      const y = this.eventsView[offset + EVENT_Y];
      const magnitude = this.eventsView[offset + EVENT_MAGNITUDE];
      const age = this.eventsView[offset + EVENT_AGE];
      const lifetime = this.eventsView[offset + EVENT_LIFETIME];
      const energy = this.eventsView[offset + EVENT_ENERGY];
      if (![x, y, magnitude, age, lifetime, energy].every(finite) || lifetime <= 0) continue;
      const progress = clamp(age / lifetime, 0, 1);
      if (progress >= 1) continue;
      const screen = this.worldToScreen(x, y);
      const fade = 1 - progress;
      context.save();

      if (kind === EVENT_SPARK) {
        const radius = reducedMotion
          ? Math.min(magnitude, 86) * this.camera.zoom
          : magnitude * Math.min(1, progress * 2.25) * this.camera.zoom;
        context.strokeStyle = `rgba(255, 221, 119, ${0.82 * fade})`;
        context.shadowColor = "rgba(255, 189, 64, .9)";
        context.shadowBlur = 18;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
        context.stroke();
      } else if (kind === EVENT_COLLISION || kind === EVENT_WALL) {
        const size = 8 + (reducedMotion ? 8 : progress * 24) * clamp(Math.sqrt(Math.abs(magnitude)) / 4, 0.6, 2.2);
        context.strokeStyle = `rgba(143, 226, 255, ${0.52 * fade})`;
        context.lineWidth = 1.4;
        context.beginPath();
        context.arc(screen.x, screen.y, size, 0, Math.PI * 2);
        context.stroke();
      } else {
        const breaking = kind === EVENT_BOND_BROKEN || kind === EVENT_BOND_STRESSED;
        const formed = kind === EVENT_BOND_FORMED || kind === EVENT_BOND_FORMING;
        const pulse = 10 + (reducedMotion ? 7 : progress * (formed ? 36 : 28));
        context.strokeStyle = breaking
          ? `rgba(255, 132, 99, ${0.82 * fade})`
          : `rgba(114, 239, 224, ${0.78 * fade})`;
        context.shadowColor = breaking ? "rgba(255, 92, 74, .7)" : "rgba(83, 238, 222, .7)";
        context.shadowBlur = kind === EVENT_ENERGY_PULSE ? 18 : 9;
        context.lineWidth = kind === EVENT_ENERGY_PULSE ? 2.6 : 1.6;
        context.beginPath();
        context.arc(screen.x, screen.y, pulse, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
    }
  }

  private renderGrabTether(context: CanvasRenderingContext2D): void {
    if (!this.grabTarget) return;
    let atomOffset = -1;
    for (let offset = 0; offset < this.atomsView.length; offset += ATOM_STRIDE) {
      if (Math.trunc(this.atomsView[offset + ATOM_ID]) === this.grabTarget.atomId) {
        atomOffset = offset;
        break;
      }
    }
    if (atomOffset < 0) return;
    const atom = this.worldToScreen(
      this.atomsView[atomOffset + ATOM_X],
      this.atomsView[atomOffset + ATOM_Y],
    );
    const target = this.worldToScreen(this.grabTarget.x, this.grabTarget.y);
    context.save();
    context.setLineDash([5, 7]);
    context.strokeStyle = "rgba(255, 221, 132, .8)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(atom.x, atom.y);
    context.lineTo(target.x, target.y);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "rgba(255, 221, 132, .92)";
    context.beginPath();
    context.arc(target.x, target.y, 4.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private renderAtoms(context: CanvasRenderingContext2D, width: number, height: number): void {
    for (let offset = 0; offset < this.atomsView.length; offset += ATOM_STRIDE) {
      const element = elementPresentation(Math.trunc(this.atomsView[offset + ATOM_ELEMENT]));
      if (!element) continue;
      const x = this.atomsView[offset + ATOM_X];
      const y = this.atomsView[offset + ATOM_Y];
      const excitation = this.atomsView[offset + ATOM_EXCITATION];
      const grabbed = this.atomsView[offset + ATOM_GRABBED] !== 0;
      const speed = Math.hypot(this.atomsView[offset + ATOM_VX], this.atomsView[offset + ATOM_VY]);
      if (![x, y, excitation, speed].every(finite)) continue;
      const screen = this.worldToScreen(x, y);
      const radius = clamp(element.radius * this.camera.zoom, 3, 24);
      if (
        screen.x + radius < 0 ||
        screen.x - radius > width ||
        screen.y + radius < 0 ||
        screen.y - radius > height
      ) {
        continue;
      }

      const excitationGlow = clamp(excitation / 180, 0, 1);
      if (excitationGlow > 0.015 || grabbed) {
        const halo = context.createRadialGradient(
          screen.x,
          screen.y,
          radius,
          screen.x,
          screen.y,
          radius * (2.2 + excitationGlow),
        );
        halo.addColorStop(0, grabbed ? "rgba(255, 221, 124, .5)" : element.glow);
        halo.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = halo;
        context.beginPath();
        context.arc(screen.x, screen.y, radius * (2.2 + excitationGlow), 0, Math.PI * 2);
        context.fill();
      }

      context.save();
      context.shadowColor = grabbed ? "rgba(255, 218, 120, .85)" : element.glow;
      context.shadowBlur = grabbed ? 14 : 4 + excitationGlow * 15;
      context.fillStyle = element.rim;
      context.beginPath();
      context.arc(screen.x, screen.y, radius + 1.35, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = element.color;
      context.beginPath();
      context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(255, 255, 255, .55)";
      context.beginPath();
      context.arc(screen.x - radius * 0.3, screen.y - radius * 0.34, Math.max(1.1, radius * 0.2), 0, Math.PI * 2);
      context.fill();
      if (speed > 40) {
        context.strokeStyle = `rgba(172, 226, 241, ${clamp((speed - 40) / 120, 0, 0.28)})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(screen.x, screen.y);
        context.lineTo(
          screen.x - this.atomsView[offset + ATOM_VX] * 0.08 * this.camera.zoom,
          screen.y - this.atomsView[offset + ATOM_VY] * 0.08 * this.camera.zoom,
        );
        context.stroke();
      }
      context.restore();
    }
  }

  private renderBondsAboveAtoms(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    reducedMotion: boolean,
  ): void {
    for (let offset = 0; offset < this.bondsView.length; offset += BOND_STRIDE) {
      const id = this.bondsView[offset + BOND_ID];
      const aIndex = Math.trunc(this.bondsView[offset + BOND_ATOM_A]);
      const bIndex = Math.trunc(this.bondsView[offset + BOND_ATOM_B]);
      const order = Math.trunc(this.bondsView[offset + BOND_ORDER]);
      const state = Math.trunc(this.bondsView[offset + BOND_STATE]);
      const progress = this.bondsView[offset + BOND_PROGRESS];
      const strain = this.bondsView[offset + BOND_STRAIN];
      const energy = this.bondsView[offset + BOND_ENERGY];
      if (
        ![id, progress, strain, energy].every(finite) ||
        aIndex < 0 ||
        bIndex < 0 ||
        (aIndex + 1) * ATOM_STRIDE > this.atomsView.length ||
        (bIndex + 1) * ATOM_STRIDE > this.atomsView.length
      ) {
        continue;
      }
      const aOffset = aIndex * ATOM_STRIDE;
      const bOffset = bIndex * ATOM_STRIDE;
      const start = this.worldToScreen(
        this.atomsView[aOffset + ATOM_X],
        this.atomsView[aOffset + ATOM_Y],
      );
      const end = this.worldToScreen(
        this.atomsView[bOffset + ATOM_X],
        this.atomsView[bOffset + ATOM_Y],
      );
      if (
        Math.max(start.x, end.x) < -30 ||
        Math.min(start.x, end.x) > width + 30 ||
        Math.max(start.y, end.y) < -30 ||
        Math.min(start.y, end.y) > height + 30
      ) {
        continue;
      }
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.01) continue;
      const nx = -dy / length;
      const ny = dx / length;
      const separation = order === 2 ? 2.4 : 0;
      const opacity = state === BOND_BREAKING ? clamp(progress, 0.08, 1) : 1;
      const strainLevel = clamp(Math.abs(strain) / 0.48, 0, 1);
      const color =
        state === BOND_FORMING
          ? `rgba(96, 236, 222, ${0.28 + 0.7 * progress})`
          : state === BOND_STRESSED
            ? `rgba(255, ${Math.round(202 - 70 * strainLevel)}, 96, ${0.92 * opacity})`
            : state === BOND_BREAKING
              ? `rgba(255, 112, 88, ${0.9 * opacity})`
              : `rgba(213, 239, 239, ${0.82 * opacity})`;
      context.save();
      context.strokeStyle = color;
      context.lineWidth = clamp((2.2 + order * 0.8) * this.camera.zoom, 1.5, 6.5);
      context.shadowColor =
        state === BOND_STRESSED || state === BOND_BREAKING
          ? "rgba(255, 104, 77, .75)"
          : "rgba(91, 234, 221, .62)";
      context.shadowBlur = state === BOND_STABLE ? 5 : 11;
      if (state === BOND_FORMING) context.setLineDash([3 + progress * 5, 7 - progress * 3]);
      if (state === BOND_BREAKING) context.setLineDash([8 * opacity, 7 + (1 - opacity) * 9]);
      if (state === BOND_STRESSED && !reducedMotion) {
        const wobble = Math.sin(id * 2.4 + performance.now() * 0.018) * 1.8 * strainLevel;
        this.strokeBondLine(context, start.x + nx * wobble, start.y + ny * wobble, end.x - nx * wobble, end.y - ny * wobble, order, separation, nx, ny);
      } else {
        this.strokeBondLine(context, start.x, start.y, end.x, end.y, order, separation, nx, ny);
      }
      context.restore();
    }
  }

  private strokeBondLine(
    context: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    order: number,
    separation: number,
    nx: number,
    ny: number,
  ): void {
    const lanes = order === 2 ? [-separation, separation] : [0];
    for (const lane of lanes) {
      context.beginPath();
      context.moveTo(x1 + nx * lane, y1 + ny * lane);
      context.lineTo(x2 + nx * lane, y2 + ny * lane);
      context.stroke();
    }
  }

  private renderWalls(context: CanvasRenderingContext2D): void {
    for (let offset = 0; offset < this.wallsView.length; offset += WALL_STRIDE) {
      const edge = Math.trunc(this.wallsView[offset + WALL_EDGE]);
      const position = this.wallsView[offset + WALL_POSITION];
      const start = this.wallsView[offset + WALL_START];
      const end = this.wallsView[offset + WALL_END];
      const velocity = this.wallsView[offset + WALL_VELOCITY];
      const load = this.wallsView[offset + WALL_LOAD];
      const impact = this.wallsView[offset + WALL_IMPACT];
      const target = this.wallsView[offset + WALL_TARGET];
      const movable = this.wallsView[offset + WALL_MOVABLE] !== 0;
      if (![position, start, end, velocity, load, impact, target].every(finite)) continue;
      const loadGlow = clamp(Math.log1p(Math.max(0, load)) / 9, 0, 1);
      const impactGlow = clamp(impact / 16, 0, 1);
      const response = Math.max(loadGlow, impactGlow);
      const from = edge < 2 ? this.worldToScreen(position, start) : this.worldToScreen(start, position);
      const to = edge < 2 ? this.worldToScreen(position, end) : this.worldToScreen(end, position);
      const flex = movable ? clamp(velocity / 150, -1, 1) * 4 : 0;

      context.save();
      context.strokeStyle = movable
        ? `rgba(255, 201, 112, ${0.66 + response * 0.32})`
        : `rgba(119, 213, 235, ${0.38 + response * 0.46})`;
      context.lineWidth = movable ? 6 + response * 5 : 4 + response * 4;
      context.shadowColor = movable ? "rgba(255, 181, 75, .75)" : "rgba(82, 208, 239, .68)";
      context.shadowBlur = 8 + response * 24;
      context.beginPath();
      context.moveTo(from.x, from.y);
      if (edge < 2) {
        context.quadraticCurveTo((from.x + to.x) / 2 + flex, (from.y + to.y) / 2, to.x, to.y);
      } else {
        context.quadraticCurveTo((from.x + to.x) / 2, (from.y + to.y) / 2 + flex, to.x, to.y);
      }
      context.stroke();

      if (movable) {
        const middleX = (from.x + to.x) / 2;
        const middleY = (from.y + to.y) / 2;
        context.fillStyle = "rgba(255, 213, 134, .96)";
        context.shadowBlur = 12;
        context.beginPath();
        context.roundRect(middleX - 6, middleY - 34, 12, 68, 6);
        context.fill();
        context.strokeStyle = "rgba(74, 49, 22, .72)";
        context.lineWidth = 1.5;
        for (const y of [-13, 0, 13]) {
          context.beginPath();
          context.moveTo(middleX - 2.5, middleY + y);
          context.lineTo(middleX + 2.5, middleY + y);
          context.stroke();
        }
      }
      context.restore();
    }
  }

  private containerScreenBounds() {
    let left: number | null = null;
    let right: number | null = null;
    let top: number | null = null;
    let bottom: number | null = null;
    for (let offset = 0; offset < this.wallsView.length; offset += WALL_STRIDE) {
      const edge = Math.trunc(this.wallsView[offset + WALL_EDGE]);
      const position = this.wallsView[offset + WALL_POSITION];
      if (edge === 0) left = position;
      else if (edge === 1) right = position;
      else if (edge === 2) top = position;
      else if (edge === 3) bottom = position;
    }
    if (left === null || right === null || top === null || bottom === null) return null;
    const first = this.worldToScreen(left, top);
    const second = this.worldToScreen(right, bottom);
    return { left: first.x, right: second.x, top: first.y, bottom: second.y };
  }

  private dispatch(command: SemanticCommand): number | undefined {
    if (this.statusValue === "error") {
      throw this.errorValue ?? new MolecularEngineError("Engine unavailable.");
    }
    if (!this.isReady || !this.engine) {
      if (command.kind === "reset") this.commands = [];
      this.commands.push(command);
      return undefined;
    }
    return this.execute(command);
  }

  private execute(command: SemanticCommand): number | undefined {
    const engine = this.requireEngine();
    switch (command.kind) {
      case "reset":
        this.mutate(() => engine.ms_reset(command.seed));
        return undefined;
      case "load-experiment":
        return this.mutate(() =>
          unsignedResult(engine.ms_load_experiment(command.experiment), "ms_load_experiment"),
        );
      case "set-playing":
        this.mutate(() => engine.ms_set_playing(command.playing ? 1 : 0));
        return undefined;
      case "set-temperature":
        this.mutate(() => engine.ms_set_temperature(command.temperature));
        return undefined;
      case "spawn":
        return this.mutate(() =>
          unsignedResult(
            engine.ms_spawn_ingredient(
              command.ingredient,
              command.count,
              command.x,
              command.y,
            ),
            "ms_spawn_ingredient",
          ),
        );
      case "spark":
        return this.mutate(() =>
          unsignedResult(
            engine.ms_apply_spark(command.x, command.y, command.energy, command.radius),
            "ms_apply_spark",
          ),
        );
      case "grab":
        return this.mutate(() =>
          unsignedResult(engine.ms_grab_atom(command.atomId, command.x, command.y), "ms_grab_atom"),
        );
      case "drag":
        return this.mutate(() =>
          unsignedResult(engine.ms_drag_atom(command.atomId, command.x, command.y), "ms_drag_atom"),
        );
      case "release":
        return this.mutate(() =>
          unsignedResult(engine.ms_release_atom(command.atomId), "ms_release_atom"),
        );
      case "piston":
        return this.mutate(() =>
          unsignedResult(engine.ms_set_piston_target(command.coordinate), "ms_set_piston_target"),
        );
    }
  }

  private mutate<T>(operation: () => T): T {
    try {
      const result = operation();
      this.refreshViews();
      return result;
    } catch (cause) {
      const error =
        cause instanceof MolecularEngineError
          ? cause
          : new MolecularEngineError("The molecular engine returned invalid runtime state.", cause);
      this.fail(error);
      throw error;
    }
  }

  private refreshViews(): void {
    const engine = this.requireEngine();
    const atoms = float32View(engine, "atoms", engine.ms_atoms_ptr, engine.ms_atoms_len, engine.ms_atoms_stride, ATOM_STRIDE);
    const bonds = float32View(engine, "bonds", engine.ms_bonds_ptr, engine.ms_bonds_len, engine.ms_bonds_stride, BOND_STRIDE);
    const walls = float32View(engine, "walls", engine.ms_walls_ptr, engine.ms_walls_len, engine.ms_walls_stride, WALL_STRIDE);
    const events = float32View(engine, "events", engine.ms_events_ptr, engine.ms_events_len, engine.ms_events_stride, EVENT_STRIDE);
    const stats = float64View(engine, "stats", engine.ms_stats_ptr, engine.ms_stats_len, engine.ms_stats_stride, STATS_STRIDE);
    if (stats.length !== STATS_STRIDE || !Array.from(stats).every(finite)) {
      throw new MolecularEngineError("Stats view is incomplete or non-finite.");
    }
    if (
      Math.trunc(stats[STAT_ABI_VERSION]) !== ENGINE_ABI_VERSION ||
      Math.trunc(stats[STAT_MODEL_VERSION]) !== ENGINE_MODEL_VERSION
    ) {
      throw new MolecularEngineError("Stats view does not report model/ABI 2/2.");
    }
    if (Math.trunc(stats[STAT_ATOM_COUNT]) !== atoms.length / ATOM_STRIDE) {
      throw new MolecularEngineError("Atom view length disagrees with stats.");
    }
    if (Math.trunc(stats[STAT_BOND_COUNT]) !== bonds.length / BOND_STRIDE) {
      throw new MolecularEngineError("Bond view length disagrees with stats.");
    }
    if (Math.trunc(stats[STAT_EVENT_COUNT]) !== events.length / EVENT_STRIDE) {
      throw new MolecularEngineError("Event view length disagrees with stats.");
    }
    if (walls.length / WALL_STRIDE !== 4) {
      throw new MolecularEngineError("ABI v2 requires one four-wall container.");
    }
    this.atomsView = atoms;
    this.bondsView = bonds;
    this.wallsView = walls;
    this.eventsView = events;
    this.statsView = stats;
    this.presentationTemperature = stats[STAT_TEMPERATURE_CONTROL];
    this.presentationPlaying = stats[STAT_PLAYING] !== 0;
    this.presentationSeed = stats[STAT_SEED] >>> 0;
    const experiment = Math.trunc(stats[STAT_EXPERIMENT]);
    const key = (Object.keys(EXPERIMENT_ID) as ExperimentKey[]).find(
      (candidate) => EXPERIMENT_ID[candidate] === experiment,
    );
    if (key) this.presentationExperiment = key;
  }

  private fail(error: MolecularEngineError): void {
    this.engine = null;
    this.atomsView = EMPTY_F32;
    this.bondsView = EMPTY_F32;
    this.wallsView = EMPTY_F32;
    this.eventsView = EMPTY_F32;
    this.statsView = EMPTY_F64;
    this.commands = [];
    this.grabTarget = null;
    this.statusValue = "error";
    this.errorValue = error;
  }

  private requireEngine(): RawEngineExports {
    if (!this.engine) throw new MolecularEngineError("Molecular engine is not initialized.");
    return this.engine;
  }
}

function validateRawExports(exports: WebAssembly.Exports): RawEngineExports {
  const memory = exports.memory;
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new MolecularEngineError("Molecular engine does not export linear memory.");
  }
  for (const name of REQUIRED_FUNCTION_EXPORTS) {
    if (typeof exports[name] !== "function") {
      throw new MolecularEngineError(`Molecular engine is missing export \`${name}\`.`);
    }
  }
  return exports as unknown as RawEngineExports;
}

function float32View(
  engine: RawEngineExports,
  name: string,
  pointerExport: () => number,
  lengthExport: () => number,
  strideExport: () => number,
  expectedStride: number,
): Float32Array {
  return typedView(
    engine,
    name,
    pointerExport,
    lengthExport,
    strideExport,
    expectedStride,
    Float32Array.BYTES_PER_ELEMENT,
    (buffer, pointer, length) => new Float32Array(buffer, pointer, length),
  );
}

function float64View(
  engine: RawEngineExports,
  name: string,
  pointerExport: () => number,
  lengthExport: () => number,
  strideExport: () => number,
  expectedStride: number,
): Float64Array {
  return typedView(
    engine,
    name,
    pointerExport,
    lengthExport,
    strideExport,
    expectedStride,
    Float64Array.BYTES_PER_ELEMENT,
    (buffer, pointer, length) => new Float64Array(buffer, pointer, length),
  );
}

function typedView<T extends Float32Array | Float64Array>(
  engine: RawEngineExports,
  name: string,
  pointerExport: () => number,
  lengthExport: () => number,
  strideExport: () => number,
  expectedStride: number,
  bytesPerElement: number,
  construct: (buffer: ArrayBuffer, pointer: number, length: number) => T,
): T {
  const pointer = unsignedResult(pointerExport(), `ms_${name}_ptr`);
  const length = unsignedResult(lengthExport(), `ms_${name}_len`);
  const stride = unsignedResult(strideExport(), `ms_${name}_stride`);
  if (stride !== expectedStride || length % stride !== 0) {
    throw new MolecularEngineError(`${name} view violates its ABI v2 stride.`);
  }
  if (pointer % bytesPerElement !== 0) {
    throw new MolecularEngineError(`${name} pointer is misaligned.`);
  }
  const byteLength = length * bytesPerElement;
  if (
    !Number.isSafeInteger(byteLength) ||
    pointer > engine.memory.buffer.byteLength ||
    byteLength > engine.memory.buffer.byteLength - pointer
  ) {
    throw new MolecularEngineError(`${name} view lies outside exported memory.`);
  }
  return construct(engine.memory.buffer, pointer, length);
}

function unsignedResult(value: number | void, exportName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new MolecularEngineError(`${exportName} returned a non-integer.`);
  }
  return value >>> 0;
}
