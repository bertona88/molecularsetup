/**
 * Stable numeric ids shared with the frozen engine ABI.
 *
 * This module contains presentation metadata only. Initial atom coordinates are
 * used to draw tray thumbnails; they are not spawn templates or physics input.
 */

export const ENGINE_SPECIES_ID = {
  water: 0,
  hydrogen: 1,
  oxygen: 2,
  methane: 3,
  ammonia: 4,
  "carbon-dioxide": 5,
  sodium: 6,
  chloride: 7,
} as const;

export const ENGINE_ELEMENT_ID = {
  H: 0,
  C: 1,
  N: 2,
  O: 3,
  Na: 4,
  Cl: 5,
} as const;

export type SpeciesKey = keyof typeof ENGINE_SPECIES_ID;
export type ElementKey = keyof typeof ENGINE_ELEMENT_ID;
export type EngineSpeciesId = (typeof ENGINE_SPECIES_ID)[SpeciesKey];
export type EngineElementId = (typeof ENGINE_ELEMENT_ID)[ElementKey];

export type ElementPresentation = Readonly<{
  id: EngineElementId;
  symbol: ElementKey;
  color: string;
  rim: string;
  radius: number;
}>;

export type ThumbnailAtom = Readonly<{
  element: ElementKey;
  x: number;
  y: number;
}>;

export type Species = Readonly<{
  id: SpeciesKey;
  engineId: EngineSpeciesId;
  formula: string;
  name: string;
  atoms: readonly ThumbnailAtom[];
  bonds: readonly (readonly [number, number])[];
  defaultQuantity: number;
}>;

export const ELEMENTS = {
  H: {
    id: ENGINE_ELEMENT_ID.H,
    symbol: "H",
    color: "#F7F2E8",
    rim: "#B8CAD8",
    radius: 7,
  },
  C: {
    id: ENGINE_ELEMENT_ID.C,
    symbol: "C",
    color: "#3F536B",
    rim: "#9DB3C7",
    radius: 11,
  },
  N: {
    id: ENGINE_ELEMENT_ID.N,
    symbol: "N",
    color: "#6D7DFF",
    rim: "#ABB5FF",
    radius: 10.5,
  },
  O: {
    id: ENGINE_ELEMENT_ID.O,
    symbol: "O",
    color: "#FF626B",
    rim: "#FFB1B5",
    radius: 10,
  },
  Na: {
    id: ENGINE_ELEMENT_ID.Na,
    symbol: "Na",
    color: "#AE78FF",
    rim: "#D9C2FF",
    radius: 13,
  },
  Cl: {
    id: ENGINE_ELEMENT_ID.Cl,
    symbol: "Cl",
    color: "#63DE8A",
    rim: "#B7F4CA",
    radius: 14,
  },
} as const satisfies Record<ElementKey, ElementPresentation>;

export const ELEMENTS_BY_ENGINE_ID: readonly ElementPresentation[] = [
  ELEMENTS.H,
  ELEMENTS.C,
  ELEMENTS.N,
  ELEMENTS.O,
  ELEMENTS.Na,
  ELEMENTS.Cl,
];

export const SPECIES: readonly Species[] = [
  {
    id: "water",
    engineId: ENGINE_SPECIES_ID.water,
    formula: "H₂O",
    name: "Water",
    atoms: [
      { element: "O", x: 0, y: 0 },
      { element: "H", x: -13, y: 11 },
      { element: "H", x: 13, y: 11 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
    defaultQuantity: 18,
  },
  {
    id: "hydrogen",
    engineId: ENGINE_SPECIES_ID.hydrogen,
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
    engineId: ENGINE_SPECIES_ID.oxygen,
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
    engineId: ENGINE_SPECIES_ID.methane,
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
    engineId: ENGINE_SPECIES_ID.ammonia,
    formula: "NH₃",
    name: "Ammonia",
    atoms: [
      { element: "N", x: 0, y: 0 },
      { element: "H", x: -15, y: 8 },
      { element: "H", x: 15, y: 8 },
      { element: "H", x: 0, y: -16 },
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
    engineId: ENGINE_SPECIES_ID["carbon-dioxide"],
    formula: "CO₂",
    name: "Carbon dioxide",
    atoms: [
      { element: "C", x: 0, y: 0 },
      { element: "O", x: -19, y: 0 },
      { element: "O", x: 19, y: 0 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
    defaultQuantity: 10,
  },
  {
    id: "sodium",
    engineId: ENGINE_SPECIES_ID.sodium,
    formula: "Na⁺",
    name: "Sodium ion",
    atoms: [{ element: "Na", x: 0, y: 0 }],
    bonds: [],
    defaultQuantity: 16,
  },
  {
    id: "chloride",
    engineId: ENGINE_SPECIES_ID.chloride,
    formula: "Cl⁻",
    name: "Chloride ion",
    atoms: [{ element: "Cl", x: 0, y: 0 }],
    bonds: [],
    defaultQuantity: 16,
  },
];

export const SPECIES_BY_KEY = Object.fromEntries(
  SPECIES.map((species) => [species.id, species]),
) as Record<SpeciesKey, Species>;

export function elementPresentation(
  engineId: number,
): ElementPresentation | undefined {
  return ELEMENTS_BY_ENGINE_ID[engineId];
}

export function speciesEngineId(
  species: Species | SpeciesKey | EngineSpeciesId,
): EngineSpeciesId {
  if (typeof species === "number") {
    if (Number.isInteger(species) && species >= 0 && species < SPECIES.length) {
      return species as EngineSpeciesId;
    }
    throw new RangeError(`Unknown engine species id: ${species}`);
  }
  if (typeof species === "string") {
    const id = ENGINE_SPECIES_ID[species];
    if (id !== undefined) return id;
    throw new RangeError(`Unknown species key: ${species}`);
  }
  return species.engineId;
}
