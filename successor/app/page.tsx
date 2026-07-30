"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

type ElementKey = "H" | "C" | "N" | "O" | "Na" | "Cl";

type ElementModel = {
  color: string;
  rim: string;
  mass: number;
  radius: number;
  covalentRadius: number;
  valence: number;
  charge: number;
  affinity: number;
};

type AtomSeed = {
  element: ElementKey;
  x: number;
  y: number;
  charge?: number;
};

type Species = {
  id: string;
  formula: string;
  name: string;
  atoms: AtomSeed[];
  bonds: [number, number][];
  defaultQuantity: number;
};

type Atom = {
  id: number;
  element: ElementKey;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  charge: number;
  age: number;
  containerId: number | null;
  bonded: Set<number>;
};

type Bond = {
  id: number;
  a: number;
  b: number;
  rest: number;
  energy: number;
  order: number;
  previousOrder: number;
  age: number;
  strain: number;
};

type Boundary = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  impact: number;
  selected: boolean;
};

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

type SpawnJob = {
  species: Species;
  remaining: number;
  total: number;
  placed: number;
  x: number;
  y: number;
  seedAngle: number;
};

type BoundaryDraft = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type BoundaryEdge = "left" | "right" | "top" | "bottom";

type CanvasGesture =
  | {
      type: "pan";
      pointerId: number;
      lastX: number;
      lastY: number;
    }
  | {
      type: "boundary";
      pointerId: number;
      startX: number;
      startY: number;
    }
  | {
      type: "resize";
      pointerId: number;
      boundaryId: number;
      edge: BoundaryEdge;
    };

type DragGhost = {
  species: Species;
  quantity: number;
  x: number;
  y: number;
  active: boolean;
};

type PinchGesture = {
  startDistance: number;
  startZoom: number;
  anchorX: number;
  anchorY: number;
};

const ELEMENTS: Record<ElementKey, ElementModel> = {
  H: {
    color: "#F7F2E8",
    rim: "#B8CAD8",
    mass: 1,
    radius: 7,
    covalentRadius: 8,
    valence: 1,
    charge: 0,
    affinity: 1,
  },
  C: {
    color: "#3F536B",
    rim: "#9DB3C7",
    mass: 12,
    radius: 11,
    covalentRadius: 11,
    valence: 4,
    charge: 0,
    affinity: 1.65,
  },
  N: {
    color: "#6D7DFF",
    rim: "#ABB5FF",
    mass: 14,
    radius: 10.5,
    covalentRadius: 10,
    valence: 3,
    charge: 0,
    affinity: 1.45,
  },
  O: {
    color: "#FF626B",
    rim: "#FFB1B5",
    mass: 16,
    radius: 10,
    covalentRadius: 9,
    valence: 2,
    charge: 0,
    affinity: 1.55,
  },
  Na: {
    color: "#AE78FF",
    rim: "#D9C2FF",
    mass: 23,
    radius: 13,
    covalentRadius: 12,
    valence: 1,
    charge: 1,
    affinity: 0.75,
  },
  Cl: {
    color: "#63DE8A",
    rim: "#B7F4CA",
    mass: 35.5,
    radius: 14,
    covalentRadius: 12,
    valence: 1,
    charge: -1,
    affinity: 1.15,
  },
};

const SPECIES: Species[] = [
  {
    id: "water",
    formula: "H₂O",
    name: "Water",
    atoms: [
      { element: "O", x: 0, y: 0, charge: -0.66 },
      { element: "H", x: -13, y: 11, charge: 0.33 },
      { element: "H", x: 13, y: 11, charge: 0.33 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
    defaultQuantity: 18,
  },
  {
    id: "hydrogen",
    formula: "H₂",
    name: "Hydrogen",
    atoms: [
      { element: "H", x: -8, y: 0 },
      { element: "H", x: 8, y: 0 },
    ],
    bonds: [[0, 1]],
    defaultQuantity: 24,
  },
  {
    id: "oxygen",
    formula: "O₂",
    name: "Oxygen",
    atoms: [
      { element: "O", x: -10, y: 0 },
      { element: "O", x: 10, y: 0 },
    ],
    bonds: [[0, 1]],
    defaultQuantity: 12,
  },
  {
    id: "methane",
    formula: "CH₄",
    name: "Methane",
    atoms: [
      { element: "C", x: 0, y: 0 },
      { element: "H", x: -17, y: 0 },
      { element: "H", x: 17, y: 0 },
      { element: "H", x: 0, y: -17 },
      { element: "H", x: 0, y: 17 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
    defaultQuantity: 6,
  },
  {
    id: "ammonia",
    formula: "NH₃",
    name: "Ammonia",
    atoms: [
      { element: "N", x: 0, y: 0, charge: -0.45 },
      { element: "H", x: -15, y: 8, charge: 0.15 },
      { element: "H", x: 15, y: 8, charge: 0.15 },
      { element: "H", x: 0, y: -16, charge: 0.15 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    defaultQuantity: 8,
  },
  {
    id: "carbon-dioxide",
    formula: "CO₂",
    name: "Carbon dioxide",
    atoms: [
      { element: "C", x: 0, y: 0, charge: 0.5 },
      { element: "O", x: -19, y: 0, charge: -0.25 },
      { element: "O", x: 19, y: 0, charge: -0.25 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
    defaultQuantity: 10,
  },
  {
    id: "sodium",
    formula: "Na⁺",
    name: "Sodium ion",
    atoms: [{ element: "Na", x: 0, y: 0, charge: 1 }],
    bonds: [],
    defaultQuantity: 16,
  },
  {
    id: "chloride",
    formula: "Cl⁻",
    name: "Chloride ion",
    atoms: [{ element: "Cl", x: 0, y: 0, charge: -1 }],
    bonds: [],
    defaultQuantity: 16,
  },
];

const MAX_ATOMS = 18_000;
const FIXED_STEP = 1 / 120;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const quantityFromSlider = (value: number) =>
  clamp(Math.round(10 ** ((value / 1000) * 3)), 1, 1000);

const sliderFromQuantity = (quantity: number) =>
  (Math.log10(clamp(quantity, 1, 1000)) / 3) * 1000;

const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x2 - x1, y2 - y1);

const roundedRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
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
};

const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

class MolecularWorld {
  atoms: Atom[] = [];
  bonds: Bond[] = [];
  boundaries: Boundary[] = [];
  spawnQueue: SpawnJob[] = [];
  camera: Camera = { x: 0, y: 0, zoom: 1 };
  temperature = 0.36;
  playing = true;
  viewportWidth = 1000;
  viewportHeight = 700;
  private nextAtomId = 1;
  private nextBondId = 1;
  private nextBoundaryId = 1;
  private random = createRandom(0x4d4f4c45);
  private gaussianSpare: number | null = null;
  private bondLookup = new Set<string>();

  setViewport(width: number, height: number) {
    this.viewportWidth = width;
    this.viewportHeight = height;
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
        (worldX - this.camera.x) * this.camera.zoom + this.viewportWidth / 2,
      y:
        (worldY - this.camera.y) * this.camera.zoom + this.viewportHeight / 2,
    };
  }

  setTemperature(value: number) {
    this.temperature = clamp(value, 0, 1);
  }

  enqueueSpawn(species: Species, count: number, x: number, y: number) {
    this.spawnQueue.push({
      species,
      remaining: count,
      total: count,
      placed: 0,
      x,
      y,
      seedAngle: this.random() * Math.PI * 2,
    });
  }

  flushSpawnQueue() {
    let frameBudget = this.atoms.length > 7_000 ? 90 : 220;
    while (frameBudget > 0 && this.spawnQueue.length > 0) {
      const job = this.spawnQueue[0];
      if (this.atoms.length + job.species.atoms.length > MAX_ATOMS) {
        this.spawnQueue.shift();
        continue;
      }

      const moleculeArea = job.species.atoms.length * 360;
      const diskRadius = Math.max(
        18,
        Math.sqrt((job.total * moleculeArea) / (Math.PI * 0.24)),
      );
      const normalized = Math.sqrt((job.placed + 0.5) / Math.max(1, job.total));
      const angle = job.seedAngle + job.placed * GOLDEN_ANGLE;
      const jitter = 0.78 + this.random() * 0.22;
      const centerX = job.x + Math.cos(angle) * diskRadius * normalized * jitter;
      const centerY = job.y + Math.sin(angle) * diskRadius * normalized * jitter;
      this.addMolecule(job.species, centerX, centerY, this.random() * Math.PI * 2);

      job.placed += 1;
      job.remaining -= 1;
      frameBudget -= 1;
      if (job.remaining <= 0) {
        this.spawnQueue.shift();
      }
    }
  }

  private normalRandom() {
    if (this.gaussianSpare !== null) {
      const value = this.gaussianSpare;
      this.gaussianSpare = null;
      return value;
    }
    const u = Math.max(1e-8, this.random());
    const v = this.random();
    const magnitude = Math.sqrt(-2 * Math.log(u));
    this.gaussianSpare = magnitude * Math.sin(Math.PI * 2 * v);
    return magnitude * Math.cos(Math.PI * 2 * v);
  }

  private thermalSpeed(mass: number) {
    const reducedTemperature = 0.025 * 58 ** this.temperature;
    return 24 * Math.sqrt(reducedTemperature / Math.sqrt(mass));
  }

  private addMolecule(
    species: Species,
    centerX: number,
    centerY: number,
    rotation: number,
  ) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const indices: number[] = [];
    const container = this.boundaries.find(
      (boundary) =>
        centerX > boundary.x &&
        centerX < boundary.x + boundary.width &&
        centerY > boundary.y &&
        centerY < boundary.y + boundary.height,
    );

    for (const seed of species.atoms) {
      const model = ELEMENTS[seed.element];
      const x = centerX + seed.x * cos - seed.y * sin;
      const y = centerY + seed.x * sin + seed.y * cos;
      const speed = this.thermalSpeed(model.mass);
      const atom: Atom = {
        id: this.nextAtomId++,
        element: seed.element,
        x,
        y,
        previousX: x,
        previousY: y,
        vx: this.normalRandom() * speed,
        vy: this.normalRandom() * speed,
        fx: 0,
        fy: 0,
        charge: seed.charge ?? model.charge,
        age: 0,
        containerId: container?.id ?? null,
        bonded: new Set(),
      };
      indices.push(this.atoms.length);
      this.atoms.push(atom);
    }

    for (const [localA, localB] of species.bonds) {
      this.addBond(indices[localA], indices[localB], true);
    }
  }

  private pairKey(a: number, b: number) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  private addBond(aIndex: number, bIndex: number, seeded = false) {
    const a = this.atoms[aIndex];
    const b = this.atoms[bIndex];
    if (!a || !b || a.bonded.has(b.id)) return;
    const modelA = ELEMENTS[a.element];
    const modelB = ELEMENTS[b.element];
    const rest = seeded
      ? distance(a.x, a.y, b.x, b.y)
      : (modelA.covalentRadius + modelB.covalentRadius) * 0.94;
    const energy = Math.sqrt(modelA.affinity * modelB.affinity);
    const bond: Bond = {
      id: this.nextBondId++,
      a: aIndex,
      b: bIndex,
      rest,
      energy,
      order: seeded ? 1 : 0.36,
      previousOrder: seeded ? 1 : 0,
      age: 0,
      strain: 0,
    };
    this.bonds.push(bond);
    a.bonded.add(b.id);
    b.bonded.add(a.id);
    this.bondLookup.add(this.pairKey(a.id, b.id));
  }

  private removeBond(index: number) {
    const bond = this.bonds[index];
    const a = this.atoms[bond.a];
    const b = this.atoms[bond.b];
    if (a && b) {
      a.bonded.delete(b.id);
      b.bonded.delete(a.id);
      this.bondLookup.delete(this.pairKey(a.id, b.id));
    }
    this.bonds.splice(index, 1);
  }

  private canBond(a: Atom, b: Atom) {
    const modelA = ELEMENTS[a.element];
    const modelB = ELEMENTS[b.element];
    return (
      a.bonded.size < modelA.valence &&
      b.bonded.size < modelB.valence &&
      !this.bondLookup.has(this.pairKey(a.id, b.id))
    );
  }

  private computeForces() {
    for (const atom of this.atoms) {
      atom.fx = 0;
      atom.fy = 0;
    }

    const cellSize = 48;
    const grid = new Map<string, number[]>();
    for (let index = 0; index < this.atoms.length; index += 1) {
      const atom = this.atoms[index];
      const cellX = Math.floor(atom.x / cellSize);
      const cellY = Math.floor(atom.y / cellSize);
      const key = `${cellX},${cellY}`;
      const bucket = grid.get(key);
      if (bucket) bucket.push(index);
      else grid.set(key, [index]);
    }

    const candidates: [number, number][] = [];
    for (let aIndex = 0; aIndex < this.atoms.length; aIndex += 1) {
      const a = this.atoms[aIndex];
      const modelA = ELEMENTS[a.element];
      const cellX = Math.floor(a.x / cellSize);
      const cellY = Math.floor(a.y / cellSize);

      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          const bucket = grid.get(`${cellX + offsetX},${cellY + offsetY}`);
          if (!bucket) continue;
          for (const bIndex of bucket) {
            if (bIndex <= aIndex) continue;
            const b = this.atoms[bIndex];
            const modelB = ELEMENTS[b.element];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distanceSquared = dx * dx + dy * dy;
            const cutoff = Math.min(
              47,
              (modelA.radius + modelB.radius) * 2.35,
            );
            if (distanceSquared <= 0.0001 || distanceSquared > cutoff * cutoff) {
              continue;
            }

            const separation = Math.sqrt(distanceSquared);
            const nx = dx / separation;
            const ny = dy / separation;
            const minimum = (modelA.radius + modelB.radius) * 0.92;
            const warmup = Math.min(1, a.age / 0.24, b.age / 0.24);
            let pairForce = 0;

            if (separation < minimum) {
              const overlap = minimum - separation;
              pairForce -= Math.min(260, overlap * 34) * warmup;
            } else if (!a.bonded.has(b.id)) {
              const reach = cutoff - minimum;
              const normalized = clamp((separation - minimum) / reach, 0, 1);
              pairForce += Math.sin(normalized * Math.PI) * 1.4 * warmup;
            }

            if (a.charge !== 0 && b.charge !== 0) {
              const screened = -a.charge * b.charge * 1250;
              pairForce +=
                (screened / (distanceSquared + 150)) *
                Math.exp(-separation / 110) *
                warmup;
            }

            a.fx += nx * pairForce;
            a.fy += ny * pairForce;
            b.fx -= nx * pairForce;
            b.fy -= ny * pairForce;

            const capture =
              (modelA.covalentRadius + modelB.covalentRadius) * 1.16;
            if (
              separation < capture &&
              this.canBond(a, b) &&
              candidates.length < 96
            ) {
              const relativeSpeed = Math.hypot(a.vx - b.vx, a.vy - b.vy);
              const captureSpeed =
                76 * Math.sqrt(modelA.affinity * modelB.affinity);
              if (relativeSpeed < captureSpeed) {
                candidates.push([aIndex, bIndex]);
              }
            }
          }
        }
      }
    }

    for (const bond of this.bonds) {
      const a = this.atoms[bond.a];
      const b = this.atoms[bond.b];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const separation = Math.max(0.001, Math.hypot(dx, dy));
      const stretch = separation - bond.rest;
      const normalizedStretch = Math.abs(stretch) / Math.max(1, bond.rest);
      const spring = clamp(stretch * (18 + bond.energy * 18), -240, 240);
      const nx = dx / separation;
      const ny = dy / separation;
      a.fx += nx * spring;
      a.fy += ny * spring;
      b.fx -= nx * spring;
      b.fy -= ny * spring;
      bond.previousOrder = bond.order;
      bond.order = clamp(
        1 - normalizedStretch / (0.82 + bond.energy * 0.1),
        0,
        1,
      );
      bond.strain = normalizedStretch;
    }

    for (const [aIndex, bIndex] of candidates) {
      const a = this.atoms[aIndex];
      const b = this.atoms[bIndex];
      if (a && b && this.canBond(a, b)) this.addBond(aIndex, bIndex);
    }
  }

  private applyBoundaries(atom: Atom) {
    if (atom.containerId === null) return;
    const boundary = this.boundaries.find(
      (candidate) => candidate.id === atom.containerId,
    );
    if (!boundary) {
      atom.containerId = null;
      return;
    }

    const radius = ELEMENTS[atom.element].radius;
    const left = boundary.x + radius;
    const right = boundary.x + boundary.width - radius;
    const top = boundary.y + radius;
    const bottom = boundary.y + boundary.height - radius;
    let impulse = 0;

    if (atom.x < left) {
      impulse += Math.abs(atom.vx);
      atom.x = left;
      atom.vx = Math.abs(atom.vx) * 0.42;
    } else if (atom.x > right) {
      impulse += Math.abs(atom.vx);
      atom.x = right;
      atom.vx = -Math.abs(atom.vx) * 0.42;
    }

    if (atom.y < top) {
      impulse += Math.abs(atom.vy);
      atom.y = top;
      atom.vy = Math.abs(atom.vy) * 0.42;
    } else if (atom.y > bottom) {
      impulse += Math.abs(atom.vy);
      atom.y = bottom;
      atom.vy = -Math.abs(atom.vy) * 0.42;
    }

    if (impulse > 0) {
      boundary.impact = Math.min(1, boundary.impact + impulse / 240);
    }
  }

  step(dt: number) {
    if (!this.playing) return;
    this.computeForces();
    const thermostat = 1 - Math.exp(-1.4 * dt);

    for (const atom of this.atoms) {
      const model = ELEMENTS[atom.element];
      atom.previousX = atom.x;
      atom.previousY = atom.y;
      atom.vx += (atom.fx / Math.sqrt(model.mass)) * dt * 11;
      atom.vy += (atom.fy / Math.sqrt(model.mass)) * dt * 11;

      const targetSpeed = this.thermalSpeed(model.mass);
      atom.vx +=
        (this.normalRandom() * targetSpeed - atom.vx) * thermostat * 0.28;
      atom.vy +=
        (this.normalRandom() * targetSpeed - atom.vy) * thermostat * 0.28;

      const speed = Math.hypot(atom.vx, atom.vy);
      if (speed > 280) {
        const scale = 280 / speed;
        atom.vx *= scale;
        atom.vy *= scale;
      }

      atom.x += atom.vx * dt;
      atom.y += atom.vy * dt;
      atom.age += dt;
      this.applyBoundaries(atom);
    }

    for (let index = this.bonds.length - 1; index >= 0; index -= 1) {
      const bond = this.bonds[index];
      bond.age += dt;
      const breakStretch = 1.7 + bond.energy * 0.24;
      if (
        bond.age > 0.22 &&
        (bond.strain > breakStretch || bond.order < 0.035)
      ) {
        this.removeBond(index);
      }
    }

    for (const boundary of this.boundaries) {
      boundary.impact *= 0.91;
    }
  }

  addBoundary(draft: BoundaryDraft) {
    const x = Math.min(draft.startX, draft.endX);
    const y = Math.min(draft.startY, draft.endY);
    const width = Math.abs(draft.endX - draft.startX);
    const height = Math.abs(draft.endY - draft.startY);
    if (width < 96 / this.camera.zoom || height < 96 / this.camera.zoom) {
      return null;
    }
    for (const boundary of this.boundaries) boundary.selected = false;
    const boundary: Boundary = {
      id: this.nextBoundaryId++,
      x,
      y,
      width,
      height,
      impact: 0,
      selected: true,
    };
    this.boundaries.push(boundary);
    for (const atom of this.atoms) {
      if (
        atom.containerId === null &&
        atom.x > x &&
        atom.x < x + width &&
        atom.y > y &&
        atom.y < y + height
      ) {
        atom.containerId = boundary.id;
      }
    }
    return boundary;
  }

  selectBoundaryAt(worldX: number, worldY: number) {
    const tolerance = 18 / this.camera.zoom;
    let hit: { boundary: Boundary; edge: BoundaryEdge } | null = null;

    for (let index = this.boundaries.length - 1; index >= 0; index -= 1) {
      const boundary = this.boundaries[index];
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
      const edge = candidates[0];
      const edgeEligible =
        (edge[0] === "left" || edge[0] === "right"
          ? withinVertical
          : withinHorizontal) && edge[1] <= tolerance;
      if (edgeEligible) {
        hit = { boundary, edge: edge[0] };
        break;
      }
    }

    for (const boundary of this.boundaries) {
      boundary.selected = boundary.id === hit?.boundary.id;
    }
    return hit;
  }

  resizeBoundary(
    boundaryId: number,
    edge: BoundaryEdge,
    worldX: number,
    worldY: number,
  ) {
    const boundary = this.boundaries.find(
      (candidate) => candidate.id === boundaryId,
    );
    if (!boundary) return;
    const minimum = 96 / this.camera.zoom;
    if (edge === "left") {
      const next = Math.min(worldX, boundary.x + boundary.width - minimum);
      boundary.width += boundary.x - next;
      boundary.x = next;
    } else if (edge === "right") {
      boundary.width = Math.max(minimum, worldX - boundary.x);
    } else if (edge === "top") {
      const next = Math.min(worldY, boundary.y + boundary.height - minimum);
      boundary.height += boundary.y - next;
      boundary.y = next;
    } else {
      boundary.height = Math.max(minimum, worldY - boundary.y);
    }

    for (const atom of this.atoms) {
      if (atom.containerId !== boundary.id) continue;
      const radius = ELEMENTS[atom.element].radius;
      atom.x = clamp(
        atom.x,
        boundary.x + radius,
        boundary.x + boundary.width - radius,
      );
      atom.y = clamp(
        atom.y,
        boundary.y + radius,
        boundary.y + boundary.height - radius,
      );
      atom.previousX = atom.x;
      atom.previousY = atom.y;
    }
  }

  removeSelectedBoundary() {
    const selected = this.boundaries.find((boundary) => boundary.selected);
    if (!selected) return;
    for (const atom of this.atoms) {
      if (atom.containerId === selected.id) atom.containerId = null;
    }
    this.boundaries = this.boundaries.filter(
      (boundary) => boundary.id !== selected.id,
    );
  }

  reset() {
    this.atoms = [];
    this.bonds = [];
    this.boundaries = [];
    this.spawnQueue = [];
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.temperature = 0.36;
    this.playing = true;
    this.nextAtomId = 1;
    this.nextBondId = 1;
    this.nextBoundaryId = 1;
    this.random = createRandom(0x4d4f4c45);
    this.gaussianSpare = null;
    this.bondLookup.clear();
  }

  render(
    context: CanvasRenderingContext2D,
    reducedMotion: boolean,
    draft: BoundaryDraft | null,
  ) {
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    context.clearRect(0, 0, width, height);

    const gridSize = 42 * this.camera.zoom;
    if (gridSize > 13) {
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

    context.lineCap = "round";
    for (const bond of this.bonds) {
      const a = this.atoms[bond.a];
      const b = this.atoms[bond.b];
      if (!a || !b || bond.order < 0.06) continue;
      const start = this.worldToScreen(a.x, a.y);
      const end = this.worldToScreen(b.x, b.y);
      if (
        Math.max(start.x, end.x) < -40 ||
        Math.min(start.x, end.x) > width + 40 ||
        Math.max(start.y, end.y) < -40 ||
        Math.min(start.y, end.y) > height + 40
      ) {
        continue;
      }
      const strained = clamp(bond.strain / 0.75, 0, 1);
      const red = Math.round(124 + strained * 131);
      const green = Math.round(204 - strained * 94);
      const blue = Math.round(218 - strained * 80);
      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${0.26 + bond.order * 0.52})`;
      context.lineWidth = clamp(
        (2.4 + bond.order * 4.4) * this.camera.zoom,
        1.2,
        8,
      );
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();

      if (
        !reducedMotion &&
        bond.age < 0.2 &&
        bond.order - bond.previousOrder > 0.05
      ) {
        const progress = bond.age / 0.2;
        context.strokeStyle = `rgba(124, 235, 255, ${1 - progress})`;
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(
          (start.x + end.x) / 2,
          (start.y + end.y) / 2,
          7 + progress * 18,
          0,
          Math.PI * 2,
        );
        context.stroke();
      }
    }

    const detailedAtoms = this.atoms.length < 3_200;
    for (const atom of this.atoms) {
      const screen = this.worldToScreen(atom.x, atom.y);
      const model = ELEMENTS[atom.element];
      const radius = clamp(model.radius * this.camera.zoom, 2.2, 24);
      if (
        screen.x + radius < 0 ||
        screen.x - radius > width ||
        screen.y + radius < 0 ||
        screen.y - radius > height
      ) {
        continue;
      }

      context.fillStyle = model.rim;
      context.beginPath();
      context.arc(screen.x, screen.y, radius + 1.25, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = model.color;
      context.beginPath();
      context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      context.fill();

      if (detailedAtoms) {
        context.fillStyle =
          atom.element === "H"
            ? "rgba(255,255,255,.82)"
            : "rgba(255,255,255,.34)";
        context.beginPath();
        context.arc(
          screen.x - radius * 0.32,
          screen.y - radius * 0.34,
          Math.max(1.1, radius * 0.22),
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }

    for (const boundary of this.boundaries) {
      const screen = this.worldToScreen(boundary.x, boundary.y);
      const lineWidth = 4.5 + boundary.impact * 5;
      const glow = 0.36 + boundary.impact * 0.52;
      context.save();
      context.strokeStyle = boundary.selected
        ? "rgba(255, 199, 99, .96)"
        : `rgba(133, 226, 255, ${glow})`;
      context.lineWidth = lineWidth;
      context.shadowColor = boundary.selected
        ? "rgba(255, 185, 70, .68)"
        : "rgba(91, 211, 255, .7)";
      context.shadowBlur = 12 + boundary.impact * 22;
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

      if (boundary.selected) {
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

    if (draft) {
      const start = this.worldToScreen(draft.startX, draft.startY);
      const end = this.worldToScreen(draft.endX, draft.endY);
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const draftWidth = Math.abs(end.x - start.x);
      const draftHeight = Math.abs(end.y - start.y);
      context.save();
      context.setLineDash([9, 8]);
      context.strokeStyle = "rgba(255, 205, 112, .95)";
      context.lineWidth = 3;
      roundedRectPath(context, x, y, draftWidth, draftHeight, 16);
      context.stroke();
      context.restore();
    }
  }
}

function MoleculeThumbnail({ species }: { species: Species }) {
  const points = species.atoms.map((atom) => ({
    ...atom,
    x: atom.x * 1.25 + 45,
    y: atom.y * 1.25 + 34,
  }));
  return (
    <span className="molecule-thumbnail" aria-hidden="true">
      <svg viewBox="0 0 90 68" role="presentation">
        {species.bonds.map(([a, b], index) => (
          <line
            key={`${a}-${b}-${index}`}
            x1={points[a].x}
            y1={points[a].y}
            x2={points[b].x}
            y2={points[b].y}
            className="thumbnail-bond"
          />
        ))}
        {points.map((atom, index) => (
          <g key={`${atom.element}-${index}`}>
            <circle
              cx={atom.x}
              cy={atom.y}
              r={Math.max(7, ELEMENTS[atom.element].radius * 0.78)}
              fill={ELEMENTS[atom.element].rim}
            />
            <circle
              cx={atom.x}
              cy={atom.y}
              r={Math.max(5.8, ELEMENTS[atom.element].radius * 0.68)}
              fill={ELEMENTS[atom.element].color}
            />
            <circle
              cx={atom.x - 2.2}
              cy={atom.y - 2.4}
              r="1.8"
              fill="rgba(255,255,255,.55)"
            />
          </g>
        ))}
      </svg>
      <span className="molecule-formula">{species.formula}</span>
    </span>
  );
}

function SnowflakeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4.8l3 2 3-2M9 19.2l3-2 3 2M5.6 10.8l.2-3.6 3.2-1.6M18.4 13.2l-.2 3.6-3.2 1.6M5.6 13.2l.2 3.6L9 18.4M18.4 10.8l-.2-3.6L15 5.6" />
    </svg>
  );
}

function HeatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 20c-2.1-2.2 1.4-3.8 0-6.1C5.7 11.7 7.8 10 8.6 8M12 20c-2.2-2.4 1.6-4.2 0-6.8-1.5-2.5 1-4.5 1.9-6.7M17 20c-1.9-2 1.2-3.5 0-5.6-1-1.8.7-3.3 1.3-4.8" />
    </svg>
  );
}

function PausePlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {playing ? (
        <>
          <path d="M8 6v12" />
          <path d="M16 6v12" />
        </>
      ) : (
        <path d="m9 6 9 6-9 6Z" />
      )}
    </svg>
  );
}

function BoundaryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M15 7v10M12.5 9.5 15 7l2.5 2.5M12.5 14.5 15 17l2.5-2.5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.1 8.2A7 7 0 1 1 5 14" />
      <path d="M4 5v5h5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13" />
    </svg>
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<MolecularWorld | null>(null);
  const gestureRef = useRef<CanvasGesture | null>(null);
  const pinchRef = useRef<PinchGesture | null>(null);
  const activePointersRef = useRef(
    new Map<number, { clientX: number; clientY: number }>(),
  );
  const moleculeDragRef = useRef<DragGhost | null>(null);
  const draftRef = useRef<BoundaryDraft | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [temperature, setTemperature] = useState(36);
  const [boundaryMode, setBoundaryMode] = useState(false);
  const [hasSelectedBoundary, setHasSelectedBoundary] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [worldSummary, setWorldSummary] = useState(
    "Empty world. Simulation playing.",
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      SPECIES.map((species) => [species.id, species.defaultQuantity]),
    ),
  );

  if (worldRef.current === null) {
    worldRef.current = new MolecularWorld();
  }

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const updateSummary = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    const counts = new Map<ElementKey, number>();
    for (const atom of world.atoms) {
      counts.set(atom.element, (counts.get(atom.element) ?? 0) + 1);
    }
    const atomSummary =
      world.atoms.length === 0
        ? "Empty world"
        : `${world.atoms.length} atoms: ${Array.from(counts.entries())
            .map(([element, count]) => `${count} ${element}`)
            .join(", ")}`;
    setWorldSummary(
      `${atomSummary}. ${world.playing ? "Simulation playing" : "Simulation paused"}. ${world.boundaries.length} boundaries.`,
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      world.setViewport(rect.width, rect.height);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    let previous = performance.now();
    let accumulator = 0;
    let summaryClock = 0;
    const frame = (now: number) => {
      const elapsed = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      world.flushSpawnQueue();
      if (world.playing) {
        accumulator += elapsed;
        let steps = 0;
        while (accumulator >= FIXED_STEP && steps < 5) {
          world.step(FIXED_STEP);
          accumulator -= FIXED_STEP;
          steps += 1;
        }
        if (steps === 5) accumulator = 0;
      }
      world.render(context, reducedMotion, draftRef.current);
      summaryClock += elapsed;
      if (summaryClock > 0.7) {
        updateSummary();
        summaryClock = 0;
      }
      animationRef.current = requestAnimationFrame(frame);
    };
    animationRef.current = requestAnimationFrame(frame);

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [reducedMotion, updateSummary]);

  const spawnAt = useCallback(
    (species: Species, quantity: number, clientX?: number, clientY?: number) => {
      const canvas = canvasRef.current;
      const world = worldRef.current;
      if (!canvas || !world) return;
      const rect = canvas.getBoundingClientRect();
      const localX =
        clientX === undefined ? rect.width * 0.54 : clientX - rect.left;
      const localY =
        clientY === undefined ? rect.height * 0.5 : clientY - rect.top;
      const point = world.screenToWorld(localX, localY);
      world.enqueueSpawn(species, quantity, point.x, point.y);
      setWorldSummary(
        `Adding ${quantity} ${species.name} ${quantity === 1 ? "molecule" : "molecules"}.`,
      );
    },
    [],
  );

  const beginMoleculeDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    species: Species,
  ) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextGhost = {
      species,
      quantity: quantities[species.id],
      x: event.clientX,
      y: event.clientY,
      active: false,
    };
    moleculeDragRef.current = nextGhost;
    setDragGhost(nextGhost);
  };

  const moveMoleculeDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    species: Species,
  ) => {
    const current = moleculeDragRef.current;
    if (!current || current.species.id !== species.id) return;
    const moved = distance(current.x, current.y, event.clientX, event.clientY);
    const nextGhost = {
      ...current,
      x: event.clientX,
      y: event.clientY,
      active: current.active || moved > 7,
    };
    moleculeDragRef.current = nextGhost;
    setDragGhost(nextGhost);
  };

  const endMoleculeDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    species: Species,
  ) => {
    const ghost = moleculeDragRef.current;
    const canvas = canvasRef.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!canvas || !ghost || ghost.species.id !== species.id) {
      moleculeDragRef.current = null;
      setDragGhost(null);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const onCanvas =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (ghost.active && onCanvas) {
      spawnAt(species, ghost.quantity, event.clientX, event.clientY);
    } else if (!ghost.active) {
      spawnAt(species, ghost.quantity);
    }
    moleculeDragRef.current = null;
    setDragGhost(null);
  };

  const canvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return null;
    const rect = canvas.getBoundingClientRect();
    return world.screenToWorld(
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  };

  const handleCanvasPointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    const point = canvasPoint(event);
    if (!canvas || !world || !point) return;
    canvas.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (activePointersRef.current.size >= 2) {
      const pointers = Array.from(activePointersRef.current.values()).slice(0, 2);
      const rect = canvas.getBoundingClientRect();
      const centerX = (pointers[0].clientX + pointers[1].clientX) / 2 - rect.left;
      const centerY = (pointers[0].clientY + pointers[1].clientY) / 2 - rect.top;
      const anchor = world.screenToWorld(centerX, centerY);
      pinchRef.current = {
        startDistance: Math.max(
          1,
          distance(
            pointers[0].clientX,
            pointers[0].clientY,
            pointers[1].clientX,
            pointers[1].clientY,
          ),
        ),
        startZoom: world.camera.zoom,
        anchorX: anchor.x,
        anchorY: anchor.y,
      };
      draftRef.current = null;
      gestureRef.current = null;
      return;
    }

    if (boundaryMode) {
      draftRef.current = {
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
      };
      gestureRef.current = {
        type: "boundary",
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
      };
      return;
    }

    const boundaryHit = world.selectBoundaryAt(point.x, point.y);
    setHasSelectedBoundary(Boolean(boundaryHit));
    if (boundaryHit) {
      gestureRef.current = {
        type: "resize",
        pointerId: event.pointerId,
        boundaryId: boundaryHit.boundary.id,
        edge: boundaryHit.edge,
      };
      return;
    }

    gestureRef.current = {
      type: "pan",
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };
  };

  const handleCanvasPointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (pinchRef.current && activePointersRef.current.size >= 2) {
      const pointers = Array.from(activePointersRef.current.values()).slice(0, 2);
      const currentDistance = Math.max(
        1,
        distance(
          pointers[0].clientX,
          pointers[0].clientY,
          pointers[1].clientX,
          pointers[1].clientY,
        ),
      );
      const rect = canvas.getBoundingClientRect();
      const centerX = (pointers[0].clientX + pointers[1].clientX) / 2 - rect.left;
      const centerY = (pointers[0].clientY + pointers[1].clientY) / 2 - rect.top;
      world.camera.zoom = clamp(
        pinchRef.current.startZoom *
          (currentDistance / pinchRef.current.startDistance),
        0.35,
        4,
      );
      const after = world.screenToWorld(centerX, centerY);
      world.camera.x += pinchRef.current.anchorX - after.x;
      world.camera.y += pinchRef.current.anchorY - after.y;
      return;
    }

    const gesture = gestureRef.current;
    const point = canvasPoint(event);
    if (!gesture || gesture.pointerId !== event.pointerId || !point) {
      return;
    }

    if (gesture.type === "boundary") {
      draftRef.current = {
        startX: gesture.startX,
        startY: gesture.startY,
        endX: point.x,
        endY: point.y,
      };
    } else if (gesture.type === "resize") {
      world.resizeBoundary(
        gesture.boundaryId,
        gesture.edge,
        point.x,
        point.y,
      );
    } else {
      const deltaX = event.clientX - gesture.lastX;
      const deltaY = event.clientY - gesture.lastY;
      world.camera.x -= deltaX / world.camera.zoom;
      world.camera.y -= deltaY / world.camera.zoom;
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
    }
  };

  const finishCanvasGesture = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const world = worldRef.current;
    const gesture = gestureRef.current;
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (
      world &&
      gesture &&
      gesture.pointerId === event.pointerId &&
      gesture.type === "boundary" &&
      draftRef.current
    ) {
      const created = world.addBoundary(draftRef.current);
      setHasSelectedBoundary(Boolean(created));
      draftRef.current = null;
      setBoundaryMode(false);
    }
    if (gesture?.pointerId === event.pointerId) {
      gestureRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const before = world.screenToWorld(screenX, screenY);
    const nextZoom = clamp(
      world.camera.zoom * Math.exp(-event.deltaY * 0.0012),
      0.35,
      4,
    );
    world.camera.zoom = nextZoom;
    const after = world.screenToWorld(screenX, screenY);
    world.camera.x += before.x - after.x;
    world.camera.y += before.y - after.y;
  };

  const togglePlaying = () => {
    const world = worldRef.current;
    if (!world) return;
    world.playing = !world.playing;
    setPlaying(world.playing);
    updateSummary();
  };

  const changeTemperature = (value: number) => {
    setTemperature(value);
    worldRef.current?.setTemperature(value / 100);
  };

  const beginReset = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setResetting(true);
    resetTimerRef.current = setTimeout(() => {
      const world = worldRef.current;
      world?.reset();
      setPlaying(true);
      setTemperature(36);
      setBoundaryMode(false);
      setHasSelectedBoundary(false);
      setResetting(false);
      updateSummary();
    }, 720);
  };

  const cancelReset = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
    setResetting(false);
  };

  const removeBoundary = () => {
    worldRef.current?.removeSelectedBoundary();
    setHasSelectedBoundary(false);
    updateSummary();
  };

  return (
    <main className="lab-shell">
      <canvas
        ref={canvasRef}
        className={`molecular-canvas ${boundaryMode ? "is-drawing-boundary" : ""}`}
        aria-label="Molecular world canvas"
        role="application"
        tabIndex={0}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={finishCanvasGesture}
        onPointerCancel={finishCanvasGesture}
        onWheel={handleWheel}
        onKeyDown={(event) => {
          if (event.code === "Space") {
            event.preventDefault();
            togglePlaying();
          } else if (event.code === "Escape") {
            draftRef.current = null;
            gestureRef.current = null;
            setBoundaryMode(false);
          }
        }}
      />

      <aside className="molecule-tray" aria-label="Molecules">
        <div className="tray-scroll">
          {SPECIES.map((species) => {
            const quantity = quantities[species.id];
            return (
              <div className="molecule-card" key={species.id}>
                <button
                  type="button"
                  className="molecule-button"
                  aria-label={`Add ${quantity} ${species.name} ${quantity === 1 ? "molecule" : "molecules"}`}
                  onPointerDown={(event) => beginMoleculeDrag(event, species)}
                  onPointerMove={(event) => moveMoleculeDrag(event, species)}
                  onPointerUp={(event) => endMoleculeDrag(event, species)}
                  onPointerCancel={() => {
                    moleculeDragRef.current = null;
                    setDragGhost(null);
                  }}
                >
                  <MoleculeThumbnail species={species} />
                </button>
                <label className="quantity-control">
                  <span className="sr-only">
                    Number of {species.name} molecules
                  </span>
                  <span className="quantity-bubble" aria-hidden="true">
                    {quantity}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="1"
                    value={sliderFromQuantity(quantity)}
                    aria-valuemin={1}
                    aria-valuemax={1000}
                    aria-valuenow={quantity}
                    aria-valuetext={`${quantity} molecules`}
                    onChange={(event) => {
                      const next = quantityFromSlider(
                        Number(event.currentTarget.value),
                      );
                      setQuantities((current) => ({
                        ...current,
                        [species.id]: next,
                      }));
                    }}
                  />
                  <span className="quantity-scale" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="utility-dock" aria-label="Simulation controls">
        <button
          type="button"
          className={`icon-button boundary-button ${boundaryMode ? "is-active" : ""}`}
          aria-label={
            boundaryMode ? "Cancel boundary drawing" : "Draw pressure boundary"
          }
          aria-pressed={boundaryMode}
          onClick={() => {
            draftRef.current = null;
            gestureRef.current = null;
            setBoundaryMode((current) => !current);
          }}
        >
          <BoundaryIcon />
        </button>
        <button
          type="button"
          className="icon-button primary-control"
          aria-label={playing ? "Pause simulation" : "Play simulation"}
          onClick={togglePlaying}
        >
          <PausePlayIcon playing={playing} />
        </button>
        {hasSelectedBoundary && (
          <button
            type="button"
            className="icon-button delete-boundary"
            aria-label="Remove selected boundary"
            onClick={removeBoundary}
          >
            <TrashIcon />
          </button>
        )}
        <button
          type="button"
          className={`icon-button reset-button ${resetting ? "is-holding" : ""}`}
          aria-label="Hold to reset the world"
          onPointerDown={beginReset}
          onPointerUp={cancelReset}
          onPointerLeave={cancelReset}
          onPointerCancel={cancelReset}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") beginReset();
          }}
          onKeyUp={cancelReset}
        >
          <ResetIcon />
          <span className="reset-progress" aria-hidden="true" />
        </button>
      </div>

      <label
        className="temperature-control"
        style={
          {
            "--temperature-position": `${1 - temperature / 100}`,
          } as CSSProperties
        }
      >
        <span className="sr-only">Temperature</span>
        <span className="temperature-icon cold" aria-hidden="true">
          <SnowflakeIcon />
        </span>
        <span className="temperature-rail">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={temperature}
            aria-valuetext={`${temperature} percent heat`}
            onChange={(event) =>
              changeTemperature(Number(event.currentTarget.value))
            }
          />
        </span>
        <span className="temperature-icon hot" aria-hidden="true">
          <HeatIcon />
        </span>
      </label>

      {dragGhost && (
        <div
          className={`drag-ghost ${dragGhost.active ? "is-active" : ""}`}
          style={
            {
              "--ghost-x": `${dragGhost.x}px`,
              "--ghost-y": `${dragGhost.y}px`,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <MoleculeThumbnail species={dragGhost.species} />
          <span>{dragGhost.quantity}</span>
          <i />
          <i />
          <i />
          <i />
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {worldSummary}
      </div>
    </main>
  );
}
