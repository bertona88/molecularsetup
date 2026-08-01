import {
  ELEMENTS_BY_ENGINE_ID,
  type ElementKey,
  type EngineSpeciesId,
  type Species,
  type SpeciesKey,
  elementPresentation,
  speciesEngineId,
} from "./molecular-catalog";

export const ENGINE_WASM_URL = `${import.meta.env.BASE_URL}engine/molecularsetup_engine.wasm`;
export const ENGINE_ABI_VERSION = 1;
export const ENGINE_MODEL_VERSION = 1;
export const DEFAULT_WORLD_SEED = 0x4d4f4c45;

const ATOM_STRIDE = 16;
const BOND_STRIDE = 6;
const BOUNDARY_STRIDE = 11;
const EVENT_STRIDE = 8;
const STATS_STRIDE = 21;
const MAX_SPAWN_QUANTITY = 1_000;

const ATOM_ELEMENT = 1;
const ATOM_X = 2;
const ATOM_Y = 3;
const ATOM_RADIUS = 11;

const BOND_ATOM_A = 0;
const BOND_ATOM_B = 1;
const BOND_ORDER = 2;
const BOND_STRAIN = 3;

const BOUNDARY_ID = 0;
const BOUNDARY_X = 1;
const BOUNDARY_Y = 2;
const BOUNDARY_WIDTH = 3;
const BOUNDARY_HEIGHT = 4;
const BOUNDARY_IMPACT = 5;

const EVENT_KIND = 0;
const EVENT_X = 3;
const EVENT_Y = 4;
const EVENT_MAGNITUDE = 5;
const EVENT_AGE = 6;

const STAT_SIMULATED_TIME = 0;
const STAT_FIXED_TIMESTEP = 1;
const STAT_TEMPERATURE_CONTROL = 2;
const STAT_TARGET_TEMPERATURE = 3;
const STAT_KINETIC_TEMPERATURE = 4;
const STAT_KINETIC_ENERGY = 5;
const STAT_POTENTIAL_ENERGY = 6;
const STAT_MECHANICAL_ENERGY = 7;
const STAT_THERMOSTAT_HEAT = 8;
const STAT_BOUNDARY_WORK = 9;
const STAT_ATOM_COUNT = 10;
const STAT_BOND_COUNT = 11;
const STAT_BOUNDARY_COUNT = 12;
const STAT_PENDING_MOLECULE_COUNT = 13;
const STAT_SEED = 14;
const STAT_COMPLETED_STEPS = 15;
const STAT_PLAYING = 16;
const STAT_ATOM_CAPACITY = 17;
const STAT_REJECTED_MOLECULE_COUNT = 18;
const STAT_MODEL_VERSION = 19;
const STAT_ABI_VERSION = 20;

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
  ms_set_playing: (playing: number) => void;
  ms_set_temperature: (temperature: number) => void;
  ms_set_thermostat_gamma: (gamma: number) => void;
  ms_spawn: (
    species: number,
    count: number,
    x: number,
    y: number,
  ) => number;
  ms_flush_spawns: (limit: number) => number;
  ms_advance: (realDeltaMilliseconds: number) => number;
  ms_step_fixed: (count: number) => number;
  ms_create_boundary: (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => number;
  ms_move_boundary_edge: (
    id: number,
    edge: number,
    coordinate: number,
  ) => number;
  ms_remove_boundary: (id: number) => number;
  ms_atoms_ptr: () => number;
  ms_atoms_len: () => number;
  ms_atoms_stride: () => number;
  ms_bonds_ptr: () => number;
  ms_bonds_len: () => number;
  ms_bonds_stride: () => number;
  ms_boundaries_ptr: () => number;
  ms_boundaries_len: () => number;
  ms_boundaries_stride: () => number;
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
  "ms_atoms_ptr",
  "ms_atoms_len",
  "ms_atoms_stride",
  "ms_bonds_ptr",
  "ms_bonds_len",
  "ms_bonds_stride",
  "ms_boundaries_ptr",
  "ms_boundaries_len",
  "ms_boundaries_stride",
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

export type BoundaryDraft = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type BoundaryEdge = "left" | "right" | "top" | "bottom";

export type BoundaryPresentation = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  impact: number;
};

export type BoundaryHit = {
  boundary: BoundaryPresentation;
  edge: BoundaryEdge;
};

export type EngineStatistics = {
  simulatedTime: number;
  fixedTimestep: number;
  temperatureControl: number;
  targetTemperature: number;
  kineticTemperature: number;
  kineticEnergy: number;
  potentialEnergy: number;
  mechanicalEnergy: number;
  thermostatHeat: number;
  boundaryWork: number;
  atomCount: number;
  bondCount: number;
  boundaryCount: number;
  pendingMoleculeCount: number;
  seed: number;
  completedSteps: number;
  playing: boolean;
  atomCapacity: number;
  rejectedMoleculeCount: number;
  modelVersion: number;
  abiVersion: number;
};

export type MolecularWorldOptions = {
  wasmUrl?: string;
  seed?: number;
  fetcher?: typeof fetch;
};

type SemanticCommand =
  | { kind: "reset"; seed: number }
  | { kind: "set-playing"; playing: boolean }
  | { kind: "set-temperature"; temperature: number }
  | { kind: "set-thermostat-gamma"; gamma: number }
  | {
      kind: "spawn";
      species: EngineSpeciesId;
      count: number;
      x: number;
      y: number;
    }
  | {
      kind: "create-boundary";
      x: number;
      y: number;
      width: number;
      height: number;
      select: boolean;
    }
  | {
      kind: "move-boundary-edge";
      id: number;
      edge: number;
      coordinate: number;
    }
  | { kind: "remove-boundary"; id: number };

export class MolecularEngineError extends Error {
  readonly causeValue: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "MolecularEngineError";
    this.causeValue = cause;
  }
}

/**
 * Browser presentation adapter for the raw MolecularSetup Wasm ABI.
 *
 * Construction is SSR-safe and performs no I/O. Call initialize() from a
 * client effect. Semantic user commands issued before initialization completes
 * are replayed in order. Frame-time advance/flush calls are intentionally not
 * queued: loading time is not simulated time.
 */
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
  private boundariesView = EMPTY_F32;
  private eventsView = EMPTY_F32;
  private statsView = EMPTY_F64;
  private selectedBoundaryIdValue: number | null = null;
  private presentationTemperature = 0.36;
  private presentationPlaying = true;
  private presentationSeed: number;

  constructor(options: MolecularWorldOptions = {}) {
    this.wasmUrl = options.wasmUrl ?? ENGINE_WASM_URL;
    this.fetcher = options.fetcher;
    this.initialSeed = (options.seed ?? DEFAULT_WORLD_SEED) >>> 0;
    this.presentationSeed = this.initialSeed;
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

  set playing(value: boolean) {
    this.setPlaying(value);
  }

  get temperature(): number {
    return this.presentationTemperature;
  }

  get seed(): number {
    return this.presentationSeed;
  }

  get selectedBoundaryId(): number | null {
    return this.selectedBoundaryIdValue;
  }

  get hasSelectedBoundary(): boolean {
    return this.selectedBoundaryIdValue !== null;
  }

  get atomCount(): number {
    return this.atomsView.length / ATOM_STRIDE;
  }

  get bondCount(): number {
    return this.bondsView.length / BOND_STRIDE;
  }

  get boundaryCount(): number {
    return this.boundariesView.length / BOUNDARY_STRIDE;
  }

  get pendingMoleculeCount(): number {
    return this.statsValue(STAT_PENDING_MOLECULE_COUNT);
  }

  async initialize(): Promise<void> {
    if (this.statusValue === "ready") return;
    if (this.statusValue === "error") {
      throw (
        this.errorValue ?? new MolecularEngineError("Engine is unavailable.")
      );
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
        throw new MolecularEngineError(
          "No Fetch implementation is available to load the molecular engine.",
        );
      }

      const response = await fetcher(this.wasmUrl, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new MolecularEngineError(
          `Molecular engine request failed with HTTP ${response.status}.`,
        );
      }

      const bytes = await response.arrayBuffer();
      const wasmModule = await WebAssembly.compile(bytes);
      const imports = WebAssembly.Module.imports(wasmModule);
      if (imports.length !== 0) {
        const names = imports
          .map((entry) => `${entry.module}.${entry.name}`)
          .join(", ");
        throw new MolecularEngineError(
          `Molecular engine must have zero imports; found ${names}.`,
        );
      }

      const instance = await WebAssembly.instantiate(wasmModule, {});
      const engine = validateRawExports(instance.exports);
      const abiVersion = unsignedResult(
        engine.ms_abi_version(),
        "ms_abi_version",
      );
      const modelVersion = unsignedResult(
        engine.ms_model_version(),
        "ms_model_version",
      );
      if (abiVersion !== ENGINE_ABI_VERSION) {
        throw new MolecularEngineError(
          `Unsupported molecular engine ABI ${abiVersion}; expected ${ENGINE_ABI_VERSION}.`,
        );
      }
      if (modelVersion !== ENGINE_MODEL_VERSION) {
        throw new MolecularEngineError(
          `Unsupported molecular model ${modelVersion}; expected ${ENGINE_MODEL_VERSION}.`,
        );
      }

      this.engine = engine;
      this.mutate(() => engine.ms_reset(this.initialSeed));

      const queued = this.commands;
      this.commands = [];
      for (const command of queued) this.execute(command);

      this.statusValue = "ready";
    } catch (cause) {
      const error =
        cause instanceof MolecularEngineError
          ? cause
          : new MolecularEngineError(
              "The molecular engine could not be initialized.",
              cause,
            );
      this.engine = null;
      this.atomsView = EMPTY_F32;
      this.bondsView = EMPTY_F32;
      this.boundariesView = EMPTY_F32;
      this.eventsView = EMPTY_F32;
      this.statsView = EMPTY_F64;
      this.commands = [];
      this.statusValue = "error";
      this.errorValue = error;
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
      x:
        (screenX - this.viewportWidth / 2) / this.camera.zoom + this.camera.x,
      y:
        (screenY - this.viewportHeight / 2) / this.camera.zoom + this.camera.y,
    };
  }

  worldToScreen(worldX: number, worldY: number) {
    return {
      x:
        (worldX - this.camera.x) * this.camera.zoom +
        this.viewportWidth / 2,
      y:
        (worldY - this.camera.y) * this.camera.zoom +
        this.viewportHeight / 2,
    };
  }

  setTemperature(value: number): void {
    if (!finite(value)) throw new TypeError("Temperature must be finite.");
    const temperature = clamp(value, 0, 1);
    this.presentationTemperature = temperature;
    this.dispatch({ kind: "set-temperature", temperature });
  }

  setPlaying(value: boolean): void {
    const playing = Boolean(value);
    this.presentationPlaying = playing;
    this.dispatch({ kind: "set-playing", playing });
  }

  setThermostatGamma(value: number): void {
    if (!finite(value) || value < 0) {
      throw new RangeError("Thermostat gamma must be finite and nonnegative.");
    }
    this.dispatch({ kind: "set-thermostat-gamma", gamma: value });
  }

  enqueueSpawn(
    species: Species | SpeciesKey | EngineSpeciesId,
    count: number,
    x: number,
    y: number,
  ): void {
    if (!finite(x) || !finite(y)) {
      throw new TypeError("Spawn coordinates must be finite.");
    }
    if (!finite(count)) throw new TypeError("Spawn count must be finite.");
    const wholeCount = clamp(
      Math.trunc(count),
      0,
      MAX_SPAWN_QUANTITY,
    );
    if (wholeCount === 0) return;
    this.dispatch({
      kind: "spawn",
      species: speciesEngineId(species),
      count: wholeCount,
      x,
      y,
    });
  }

  spawn(
    species: Species | SpeciesKey | EngineSpeciesId,
    count: number,
    x: number,
    y: number,
  ): void {
    this.enqueueSpawn(species, count, x, y);
  }

  flushSpawnQueue(limit?: number): number {
    if (!this.isReady || !this.engine) return 0;
    const pending = this.statsValue(STAT_PENDING_MOLECULE_COUNT);
    if (pending <= 0) return 0;
    const frameBudget =
      limit === undefined
        ? this.atomCount > 7_000
          ? 90
          : 220
        : Math.max(0, Math.trunc(limit));
    if (frameBudget === 0) return 0;
    return this.mutate(() =>
      unsignedResult(
        this.requireEngine().ms_flush_spawns(frameBudget),
        "ms_flush_spawns",
      ),
    );
  }

  advance(realDeltaMilliseconds: number): number {
    if (!this.isReady || !this.engine) return 0;
    if (!finite(realDeltaMilliseconds) || realDeltaMilliseconds < 0) {
      throw new RangeError("Frame delta must be finite and nonnegative.");
    }
    return this.mutate(() =>
      unsignedResult(
        this.requireEngine().ms_advance(realDeltaMilliseconds),
        "ms_advance",
      ),
    );
  }

  stepFixed(count = 1): number {
    if (!this.isReady || !this.engine) return 0;
    const wholeCount = Math.max(0, Math.trunc(count));
    if (wholeCount === 0) return 0;
    return this.mutate(() =>
      unsignedResult(
        this.requireEngine().ms_step_fixed(wholeCount),
        "ms_step_fixed",
      ),
    );
  }

  addBoundary(draft: BoundaryDraft): boolean {
    const rectangle = this.normalizedBoundary(draft);
    if (!rectangle) return false;
    const result = this.dispatch({
      kind: "create-boundary",
      ...rectangle,
      select: true,
    });
    return result === undefined ? true : result > 0;
  }

  createBoundary(draft: BoundaryDraft): boolean {
    return this.addBoundary(draft);
  }

  selectBoundaryAt(worldX: number, worldY: number): BoundaryHit | null {
    if (!finite(worldX) || !finite(worldY)) return null;
    const tolerance = 18 / this.camera.zoom;
    let hit: BoundaryHit | null = null;

    for (
      let offset = this.boundariesView.length - BOUNDARY_STRIDE;
      offset >= 0;
      offset -= BOUNDARY_STRIDE
    ) {
      const boundary = boundaryAt(this.boundariesView, offset);
      if (!boundary) continue;
      const withinHorizontal =
        worldX >= boundary.x - tolerance &&
        worldX <= boundary.x + boundary.width + tolerance;
      const withinVertical =
        worldY >= boundary.y - tolerance &&
        worldY <= boundary.y + boundary.height + tolerance;
      const candidates: [BoundaryEdge, number][] = [
        ["left", Math.abs(worldX - boundary.x)],
        ["right", Math.abs(worldX - (boundary.x + boundary.width))],
        ["top", Math.abs(worldY - boundary.y)],
        ["bottom", Math.abs(worldY - (boundary.y + boundary.height))],
      ];
      candidates.sort((first, second) => first[1] - second[1]);
      const [edge, edgeDistance] = candidates[0];
      const eligible =
        (edge === "left" || edge === "right"
          ? withinVertical
          : withinHorizontal) && edgeDistance <= tolerance;
      if (eligible) {
        hit = { boundary, edge };
        break;
      }
    }

    this.selectedBoundaryIdValue = hit?.boundary.id ?? null;
    return hit;
  }

  clearBoundarySelection(): void {
    this.selectedBoundaryIdValue = null;
  }

  resizeBoundary(
    boundaryId: number,
    edge: BoundaryEdge,
    worldX: number,
    worldY: number,
  ): boolean {
    const boundary = this.findBoundary(boundaryId);
    if (!boundary) return false;
    const minimum = 96 / this.camera.zoom;
    let coordinate: number;
    if (edge === "left") {
      coordinate = Math.min(worldX, boundary.x + boundary.width - minimum);
    } else if (edge === "right") {
      coordinate = Math.max(worldX, boundary.x + minimum);
    } else if (edge === "top") {
      coordinate = Math.min(worldY, boundary.y + boundary.height - minimum);
    } else {
      coordinate = Math.max(worldY, boundary.y + minimum);
    }
    return this.moveBoundaryEdge(boundaryId, edge, coordinate);
  }

  moveBoundaryEdge(
    boundaryId: number,
    edge: BoundaryEdge,
    coordinate: number,
  ): boolean {
    if (!finite(coordinate)) return false;
    const edgeId = boundaryEdgeId(edge);
    const result = this.dispatch({
      kind: "move-boundary-edge",
      id: boundaryId >>> 0,
      edge: edgeId,
      coordinate,
    });
    return result === undefined ? true : result > 0;
  }

  removeBoundary(boundaryId: number): boolean {
    const normalizedId = boundaryId >>> 0;
    if (normalizedId === 0) return false;
    const result = this.dispatch({
      kind: "remove-boundary",
      id: normalizedId,
    });
    if (this.selectedBoundaryIdValue === normalizedId) {
      this.selectedBoundaryIdValue = null;
    }
    return result === undefined ? true : result > 0;
  }

  removeSelectedBoundary(): boolean {
    if (this.selectedBoundaryIdValue === null) return false;
    return this.removeBoundary(this.selectedBoundaryIdValue);
  }

  reset(seed = this.initialSeed): void {
    const normalizedSeed = seed >>> 0;
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.selectedBoundaryIdValue = null;
    this.presentationSeed = normalizedSeed;
    this.presentationTemperature = 0.36;
    this.presentationPlaying = true;
    if (!this.isReady) this.commands = [];
    this.dispatch({ kind: "reset", seed: normalizedSeed });
  }

  summary(): string {
    if (this.statusValue === "error") {
      return "Molecular engine unavailable. Simulation stopped.";
    }
    if (this.statusValue !== "ready") {
      return "Molecular engine loading. Empty world.";
    }

    const counts = new Map<ElementKey, number>();
    for (let offset = 0; offset < this.atomsView.length; offset += ATOM_STRIDE) {
      const element = elementPresentation(
        Math.trunc(this.atomsView[offset + ATOM_ELEMENT]),
      );
      if (!element) continue;
      counts.set(element.symbol, (counts.get(element.symbol) ?? 0) + 1);
    }
    const atomSummary =
      this.atomCount === 0
        ? "Empty world"
        : `${this.atomCount} atoms: ${Array.from(counts.entries())
            .map(([element, count]) => `${count} ${element}`)
            .join(", ")}`;
    const pending = this.pendingMoleculeCount;
    const pendingSummary =
      pending > 0 ? ` ${pending} molecules waiting to enter.` : "";
    return `${atomSummary}. ${
      this.playing ? "Simulation playing" : "Simulation paused"
    }. ${this.boundaryCount} boundaries.${pendingSummary}`;
  }

  statistics(): EngineStatistics | null {
    if (this.statsView.length !== STATS_STRIDE) return null;
    return {
      simulatedTime: this.statsView[STAT_SIMULATED_TIME],
      fixedTimestep: this.statsView[STAT_FIXED_TIMESTEP],
      temperatureControl: this.statsView[STAT_TEMPERATURE_CONTROL],
      targetTemperature: this.statsView[STAT_TARGET_TEMPERATURE],
      kineticTemperature: this.statsView[STAT_KINETIC_TEMPERATURE],
      kineticEnergy: this.statsView[STAT_KINETIC_ENERGY],
      potentialEnergy: this.statsView[STAT_POTENTIAL_ENERGY],
      mechanicalEnergy: this.statsView[STAT_MECHANICAL_ENERGY],
      thermostatHeat: this.statsView[STAT_THERMOSTAT_HEAT],
      boundaryWork: this.statsView[STAT_BOUNDARY_WORK],
      atomCount: this.statsView[STAT_ATOM_COUNT],
      bondCount: this.statsView[STAT_BOND_COUNT],
      boundaryCount: this.statsView[STAT_BOUNDARY_COUNT],
      pendingMoleculeCount: this.statsView[STAT_PENDING_MOLECULE_COUNT],
      seed: this.statsView[STAT_SEED],
      completedSteps: this.statsView[STAT_COMPLETED_STEPS],
      playing: this.statsView[STAT_PLAYING] !== 0,
      atomCapacity: this.statsView[STAT_ATOM_CAPACITY],
      rejectedMoleculeCount: this.statsView[STAT_REJECTED_MOLECULE_COUNT],
      modelVersion: this.statsView[STAT_MODEL_VERSION],
      abiVersion: this.statsView[STAT_ABI_VERSION],
    };
  }

  render(
    context: CanvasRenderingContext2D,
    reducedMotion: boolean,
    draft: BoundaryDraft | null,
  ): void {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    context.clearRect(0, 0, width, height);
    this.renderGrid(context, width, height);
    this.renderBonds(context, width, height);
    if (!reducedMotion) this.renderEvents(context, width, height);
    this.renderAtoms(context, width, height);
    this.renderBoundaries(context);
    if (draft) this.renderBoundaryDraft(context, draft);
  }

  private renderGrid(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const gridSize = 42 * this.camera.zoom;
    if (gridSize <= 13) return;
    const offsetX =
      ((-this.camera.x * this.camera.zoom + width / 2) % gridSize) - gridSize;
    const offsetY =
      ((-this.camera.y * this.camera.zoom + height / 2) % gridSize) - gridSize;
    context.fillStyle = "rgba(152, 210, 232, 0.075)";
    for (let x = offsetX; x < width + gridSize; x += gridSize) {
      for (let y = offsetY; y < height + gridSize; y += gridSize) {
        context.beginPath();
        context.arc(x, y, 1, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  private renderBonds(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    context.lineCap = "round";
    for (let offset = 0; offset < this.bondsView.length; offset += BOND_STRIDE) {
      const aIndex = Math.trunc(this.bondsView[offset + BOND_ATOM_A]);
      const bIndex = Math.trunc(this.bondsView[offset + BOND_ATOM_B]);
      const order = this.bondsView[offset + BOND_ORDER];
      const strain = this.bondsView[offset + BOND_STRAIN];
      if (
        order < 0.06 ||
        aIndex < 0 ||
        bIndex < 0 ||
        (aIndex + 1) * ATOM_STRIDE > this.atomsView.length ||
        (bIndex + 1) * ATOM_STRIDE > this.atomsView.length
      ) {
        continue;
      }
      const aOffset = aIndex * ATOM_STRIDE;
      const bOffset = bIndex * ATOM_STRIDE;
      const ax = this.atomsView[aOffset + ATOM_X];
      const ay = this.atomsView[aOffset + ATOM_Y];
      const bx = this.atomsView[bOffset + ATOM_X];
      const by = this.atomsView[bOffset + ATOM_Y];
      if (
        !finite(ax) ||
        !finite(ay) ||
        !finite(bx) ||
        !finite(by) ||
        !finite(order) ||
        !finite(strain)
      ) {
        continue;
      }
      const startX =
        (ax - this.camera.x) * this.camera.zoom + this.viewportWidth / 2;
      const startY =
        (ay - this.camera.y) * this.camera.zoom + this.viewportHeight / 2;
      const endX =
        (bx - this.camera.x) * this.camera.zoom + this.viewportWidth / 2;
      const endY =
        (by - this.camera.y) * this.camera.zoom + this.viewportHeight / 2;
      if (
        Math.max(startX, endX) < -40 ||
        Math.min(startX, endX) > width + 40 ||
        Math.max(startY, endY) < -40 ||
        Math.min(startY, endY) > height + 40
      ) {
        continue;
      }
      const strained = clamp(Math.abs(strain) / 0.75, 0, 1);
      const red = Math.round(124 + strained * 131);
      const green = Math.round(204 - strained * 94);
      const blue = Math.round(218 - strained * 80);
      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${
        0.26 + clamp(order, 0, 1) * 0.52
      })`;
      context.lineWidth = clamp(
        (2.4 + clamp(order, 0, 1) * 4.4) * this.camera.zoom,
        1.2,
        8,
      );
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();
    }
  }

  private renderEvents(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    for (let offset = 0; offset < this.eventsView.length; offset += EVENT_STRIDE) {
      const kind = Math.trunc(this.eventsView[offset + EVENT_KIND]);
      const worldX = this.eventsView[offset + EVENT_X];
      const worldY = this.eventsView[offset + EVENT_Y];
      const magnitude = this.eventsView[offset + EVENT_MAGNITUDE];
      const age = this.eventsView[offset + EVENT_AGE];
      if (
        kind < 1 ||
        kind > 3 ||
        !finite(worldX) ||
        !finite(worldY) ||
        !finite(magnitude) ||
        !finite(age) ||
        age < 0
      ) {
        continue;
      }
      const screen = this.worldToScreen(worldX, worldY);
      if (
        screen.x < -50 ||
        screen.x > width + 50 ||
        screen.y < -50 ||
        screen.y > height + 50
      ) {
        continue;
      }
      const lifetime = kind === 3 ? 0.16 : 0.24;
      const progress = clamp(age / lifetime, 0, 1);
      if (progress >= 1) continue;
      const strength = clamp(Math.sqrt(Math.max(0, magnitude)), 0.35, 2.2);
      context.save();
      context.strokeStyle =
        kind === 2
          ? `rgba(255, 128, 112, ${0.9 * (1 - progress)})`
          : kind === 3
            ? `rgba(133, 226, 255, ${0.68 * (1 - progress)})`
            : `rgba(124, 235, 255, ${1 - progress})`;
      context.lineWidth = kind === 3 ? 1.2 : 1.5;
      context.beginPath();
      context.arc(
        screen.x,
        screen.y,
        (7 + progress * (kind === 3 ? 12 : 18)) * strength,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.restore();
    }
  }

  private renderAtoms(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const detailedAtoms = this.atomCount < 3_200;
    for (let offset = 0; offset < this.atomsView.length; offset += ATOM_STRIDE) {
      const element = elementPresentation(
        Math.trunc(this.atomsView[offset + ATOM_ELEMENT]),
      );
      if (!element) continue;
      const worldX = this.atomsView[offset + ATOM_X];
      const worldY = this.atomsView[offset + ATOM_Y];
      const engineRadius = this.atomsView[offset + ATOM_RADIUS];
      if (
        !finite(worldX) ||
        !finite(worldY) ||
        !finite(engineRadius) ||
        engineRadius <= 0
      ) {
        continue;
      }
      const screenX =
        (worldX - this.camera.x) * this.camera.zoom + this.viewportWidth / 2;
      const screenY =
        (worldY - this.camera.y) * this.camera.zoom + this.viewportHeight / 2;
      const radius = clamp(
        element.radius * this.camera.zoom,
        2.2,
        24,
      );
      if (
        screenX + radius < 0 ||
        screenX - radius > width ||
        screenY + radius < 0 ||
        screenY - radius > height
      ) {
        continue;
      }

      context.fillStyle = element.rim;
      context.beginPath();
      context.arc(screenX, screenY, radius + 1.25, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = element.color;
      context.beginPath();
      context.arc(screenX, screenY, radius, 0, Math.PI * 2);
      context.fill();

      if (detailedAtoms) {
        context.fillStyle =
          element.symbol === "H"
            ? "rgba(255,255,255,.82)"
            : "rgba(255,255,255,.34)";
        context.beginPath();
        context.arc(
          screenX - radius * 0.32,
          screenY - radius * 0.34,
          Math.max(1.1, radius * 0.22),
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
  }

  private renderBoundaries(context: CanvasRenderingContext2D): void {
    for (
      let offset = 0;
      offset < this.boundariesView.length;
      offset += BOUNDARY_STRIDE
    ) {
      const boundary = boundaryAt(this.boundariesView, offset);
      if (!boundary) continue;
      const screen = this.worldToScreen(boundary.x, boundary.y);
      const impact = clamp(boundary.impact, 0, 1);
      const lineWidth = 4.5 + impact * 5;
      const glow = 0.36 + impact * 0.52;
      const selected = boundary.id === this.selectedBoundaryIdValue;
      context.save();
      context.strokeStyle = selected
        ? "rgba(255, 199, 99, .96)"
        : `rgba(133, 226, 255, ${glow})`;
      context.lineWidth = lineWidth;
      context.shadowColor = selected
        ? "rgba(255, 185, 70, .68)"
        : "rgba(91, 211, 255, .7)";
      context.shadowBlur = 12 + impact * 22;
      roundedRectPath(
        context,
        screen.x,
        screen.y,
        boundary.width * this.camera.zoom,
        boundary.height * this.camera.zoom,
        16 * this.camera.zoom,
      );
      context.stroke();
      context.restore();

      if (selected) {
        const x2 = screen.x + boundary.width * this.camera.zoom;
        const y2 = screen.y + boundary.height * this.camera.zoom;
        context.fillStyle = "#FFD071";
        for (const [x, y] of [
          [screen.x, screen.y + (y2 - screen.y) / 2],
          [x2, screen.y + (y2 - screen.y) / 2],
          [screen.x + (x2 - screen.x) / 2, screen.y],
          [screen.x + (x2 - screen.x) / 2, y2],
        ]) {
          context.beginPath();
          context.arc(x, y, 5.5, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }

  private renderBoundaryDraft(
    context: CanvasRenderingContext2D,
    draft: BoundaryDraft,
  ): void {
    const start = this.worldToScreen(draft.startX, draft.startY);
    const end = this.worldToScreen(draft.endX, draft.endY);
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    context.save();
    context.setLineDash([9, 8]);
    context.strokeStyle = "rgba(255, 205, 112, .95)";
    context.lineWidth = 3;
    roundedRectPath(context, x, y, width, height, 16);
    context.stroke();
    context.restore();
  }

  private normalizedBoundary(draft: BoundaryDraft) {
    const coordinates = [
      draft.startX,
      draft.startY,
      draft.endX,
      draft.endY,
    ];
    if (!coordinates.every(finite)) return null;
    const x = Math.min(draft.startX, draft.endX);
    const y = Math.min(draft.startY, draft.endY);
    const width = Math.abs(draft.endX - draft.startX);
    const height = Math.abs(draft.endY - draft.startY);
    const minimum = 96 / this.camera.zoom;
    if (width < minimum || height < minimum) return null;
    return { x, y, width, height };
  }

  private findBoundary(id: number): BoundaryPresentation | null {
    for (
      let offset = 0;
      offset < this.boundariesView.length;
      offset += BOUNDARY_STRIDE
    ) {
      if (Math.trunc(this.boundariesView[offset + BOUNDARY_ID]) !== id) continue;
      return boundaryAt(this.boundariesView, offset);
    }
    return null;
  }

  private dispatch(command: SemanticCommand): number | undefined {
    if (this.statusValue === "error") {
      throw this.errorValue ?? new MolecularEngineError("Engine is unavailable.");
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
      case "set-playing":
        this.mutate(() => engine.ms_set_playing(command.playing ? 1 : 0));
        return undefined;
      case "set-temperature":
        this.mutate(() => engine.ms_set_temperature(command.temperature));
        return undefined;
      case "set-thermostat-gamma":
        this.mutate(() => engine.ms_set_thermostat_gamma(command.gamma));
        return undefined;
      case "spawn":
        return this.mutate(() =>
          unsignedResult(
            engine.ms_spawn(
              command.species,
              command.count,
              command.x,
              command.y,
            ),
            "ms_spawn",
          ),
        );
      case "create-boundary": {
        const id = this.mutate(() =>
          unsignedResult(
            engine.ms_create_boundary(
              command.x,
              command.y,
              command.width,
              command.height,
            ),
            "ms_create_boundary",
          ),
        );
        if (command.select && id !== 0) this.selectedBoundaryIdValue = id;
        return id;
      }
      case "move-boundary-edge":
        return this.mutate(() =>
          unsignedResult(
            engine.ms_move_boundary_edge(
              command.id,
              command.edge,
              command.coordinate,
            ),
            "ms_move_boundary_edge",
          ),
        );
      case "remove-boundary":
        return this.mutate(() =>
          unsignedResult(
            engine.ms_remove_boundary(command.id),
            "ms_remove_boundary",
          ),
        );
    }
  }

  /** Refreshes every view immediately after one and only one raw mutation. */
  private mutate<T>(operation: () => T): T {
    try {
      const result = operation();
      this.refreshViews();
      return result;
    } catch (cause) {
      const error =
        cause instanceof MolecularEngineError
          ? cause
          : new MolecularEngineError(
              "The molecular engine returned invalid runtime state.",
              cause,
            );
      this.statusValue = "error";
      this.errorValue = error;
      this.atomsView = EMPTY_F32;
      this.bondsView = EMPTY_F32;
      this.boundariesView = EMPTY_F32;
      this.eventsView = EMPTY_F32;
      this.statsView = EMPTY_F64;
      this.selectedBoundaryIdValue = null;
      this.commands = [];
      throw error;
    }
  }

  private refreshViews(): void {
    const engine = this.requireEngine();
    const atoms = float32View(
      engine,
      "atoms",
      engine.ms_atoms_ptr,
      engine.ms_atoms_len,
      engine.ms_atoms_stride,
      ATOM_STRIDE,
    );
    const bonds = float32View(
      engine,
      "bonds",
      engine.ms_bonds_ptr,
      engine.ms_bonds_len,
      engine.ms_bonds_stride,
      BOND_STRIDE,
    );
    const boundaries = float32View(
      engine,
      "boundaries",
      engine.ms_boundaries_ptr,
      engine.ms_boundaries_len,
      engine.ms_boundaries_stride,
      BOUNDARY_STRIDE,
    );
    const events = float32View(
      engine,
      "events",
      engine.ms_events_ptr,
      engine.ms_events_len,
      engine.ms_events_stride,
      EVENT_STRIDE,
    );
    const stats = float64View(
      engine,
      "stats",
      engine.ms_stats_ptr,
      engine.ms_stats_len,
      engine.ms_stats_stride,
      STATS_STRIDE,
    );
    if (stats.length !== STATS_STRIDE) {
      throw new MolecularEngineError(
        `Stats view has ${stats.length} scalars; expected ${STATS_STRIDE}.`,
      );
    }
    if (!Array.from(stats).every(finite)) {
      throw new MolecularEngineError("Stats view contains a non-finite value.");
    }
    if (Math.trunc(stats[STAT_ABI_VERSION]) !== ENGINE_ABI_VERSION) {
      throw new MolecularEngineError(
        `Stats report ABI ${stats[STAT_ABI_VERSION]}; expected ${ENGINE_ABI_VERSION}.`,
      );
    }
    if (Math.trunc(stats[STAT_MODEL_VERSION]) !== ENGINE_MODEL_VERSION) {
      throw new MolecularEngineError(
        `Stats report model ${stats[STAT_MODEL_VERSION]}; expected ${ENGINE_MODEL_VERSION}.`,
      );
    }
    if (Math.trunc(stats[STAT_ATOM_COUNT]) !== atoms.length / ATOM_STRIDE) {
      throw new MolecularEngineError("Atom view length disagrees with stats.");
    }
    if (Math.trunc(stats[STAT_BOND_COUNT]) !== bonds.length / BOND_STRIDE) {
      throw new MolecularEngineError("Bond view length disagrees with stats.");
    }
    if (
      Math.trunc(stats[STAT_BOUNDARY_COUNT]) !==
      boundaries.length / BOUNDARY_STRIDE
    ) {
      throw new MolecularEngineError(
        "Boundary view length disagrees with stats.",
      );
    }

    this.atomsView = atoms;
    this.bondsView = bonds;
    this.boundariesView = boundaries;
    this.eventsView = events;
    this.statsView = stats;
    this.presentationTemperature = stats[STAT_TEMPERATURE_CONTROL];
    this.presentationPlaying = stats[STAT_PLAYING] !== 0;
    this.presentationSeed = stats[STAT_SEED] >>> 0;
    if (
      this.selectedBoundaryIdValue !== null &&
      !this.findBoundary(this.selectedBoundaryIdValue)
    ) {
      this.selectedBoundaryIdValue = null;
    }
  }

  private statsValue(index: number): number {
    return this.statsView.length === STATS_STRIDE ? this.statsView[index] : 0;
  }

  private requireEngine(): RawEngineExports {
    if (!this.engine) {
      throw new MolecularEngineError("Molecular engine is not initialized.");
    }
    return this.engine;
  }
}

function validateRawExports(exports: WebAssembly.Exports): RawEngineExports {
  const memory = exports.memory;
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new MolecularEngineError(
      "Molecular engine does not export linear memory as `memory`.",
    );
  }
  for (const name of REQUIRED_FUNCTION_EXPORTS) {
    if (typeof exports[name] !== "function") {
      throw new MolecularEngineError(
        `Molecular engine is missing function export \`${name}\`.`,
      );
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
    4,
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
    8,
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
  if (stride !== expectedStride) {
    throw new MolecularEngineError(
      `${name} stride ${stride} does not match ABI stride ${expectedStride}.`,
    );
  }
  if (length % stride !== 0) {
    throw new MolecularEngineError(
      `${name} length ${length} is not a multiple of stride ${stride}.`,
    );
  }
  if (pointer % bytesPerElement !== 0) {
    throw new MolecularEngineError(
      `${name} pointer ${pointer} is not ${bytesPerElement}-byte aligned.`,
    );
  }
  const byteLength = length * bytesPerElement;
  if (
    !Number.isSafeInteger(byteLength) ||
    pointer > engine.memory.buffer.byteLength ||
    byteLength > engine.memory.buffer.byteLength - pointer
  ) {
    throw new MolecularEngineError(
      `${name} view lies outside exported linear memory.`,
    );
  }
  return construct(engine.memory.buffer, pointer, length);
}

function unsignedResult(value: number | void, exportName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new MolecularEngineError(`${exportName} returned a non-integer.`);
  }
  return value >>> 0;
}

function boundaryAt(
  values: Float32Array,
  offset: number,
): BoundaryPresentation | null {
  const id = Math.trunc(values[offset + BOUNDARY_ID]);
  const x = values[offset + BOUNDARY_X];
  const y = values[offset + BOUNDARY_Y];
  const width = values[offset + BOUNDARY_WIDTH];
  const height = values[offset + BOUNDARY_HEIGHT];
  const impact = values[offset + BOUNDARY_IMPACT];
  if (
    id <= 0 ||
    ![x, y, width, height, impact].every(finite) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return { id, x, y, width, height, impact };
}

function boundaryEdgeId(edge: BoundaryEdge): number {
  switch (edge) {
    case "left":
      return 0;
    case "right":
      return 1;
    case "top":
      return 2;
    case "bottom":
      return 3;
  }
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

// Keep the catalog/ABI element cardinality relationship explicit at runtime.
if (ELEMENTS_BY_ENGINE_ID.length !== 6) {
  throw new Error("The presentation catalog does not match engine ABI v1.");
}
