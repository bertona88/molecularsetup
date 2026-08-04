/** Presentation metadata for the multi-system ABI v4 catalog. */

export const ENGINE_INGREDIENT_ID = {
  hydrogenAtom: 0,
  oxygenAtom: 1,
  hydrogen: 2,
  oxygen: 3,
  water: 4,
  acrylicAcid: 5,
  diacrylate: 6,
  peroxide: 7,
} as const;

export const ENGINE_ELEMENT_ID = {
  H: 0,
  O: 1,
  C: 2,
} as const;

export type IngredientKey = keyof typeof ENGINE_INGREDIENT_ID;
export type ElementKey = keyof typeof ENGINE_ELEMENT_ID;
export type EngineIngredientId =
  (typeof ENGINE_INGREDIENT_ID)[IngredientKey];
export type EngineElementId = (typeof ENGINE_ELEMENT_ID)[ElementKey];

export type ElementPresentation = Readonly<{
  id: EngineElementId;
  symbol: ElementKey;
  color: string;
  rim: string;
  glow: string;
  radius: number;
}>;

export type ThumbnailAtom = Readonly<{
  element: ElementKey;
  x: number;
  y: number;
}>;

export type Ingredient = Readonly<{
  id: IngredientKey;
  engineId: EngineIngredientId;
  formula: string;
  name: string;
  atoms: readonly ThumbnailAtom[];
  bonds: readonly (readonly [number, number, 1 | 2])[];
}>;

export const ELEMENTS = {
  H: {
    id: ENGINE_ELEMENT_ID.H,
    symbol: "H",
    color: "#f4f1e8",
    rim: "#b9ccd8",
    glow: "rgba(211, 241, 255, .52)",
    radius: 7,
  },
  O: {
    id: ENGINE_ELEMENT_ID.O,
    symbol: "O",
    color: "#ff646d",
    rim: "#ffadb2",
    glow: "rgba(255, 102, 112, .48)",
    radius: 10,
  },
  C: {
    id: ENGINE_ELEMENT_ID.C,
    symbol: "C",
    color: "#6d7889",
    rim: "#bac5d4",
    glow: "rgba(158, 188, 232, .48)",
    radius: 9,
  },
} as const satisfies Record<ElementKey, ElementPresentation>;

export const ELEMENTS_BY_ENGINE_ID: readonly ElementPresentation[] = [
  ELEMENTS.H,
  ELEMENTS.O,
  ELEMENTS.C,
];

export const INGREDIENTS: readonly Ingredient[] = [
  {
    id: "hydrogenAtom",
    engineId: ENGINE_INGREDIENT_ID.hydrogenAtom,
    formula: "H",
    name: "Hydrogen atom",
    atoms: [{ element: "H", x: 0, y: 0 }],
    bonds: [],
  },
  {
    id: "oxygenAtom",
    engineId: ENGINE_INGREDIENT_ID.oxygenAtom,
    formula: "O",
    name: "Oxygen atom",
    atoms: [{ element: "O", x: 0, y: 0 }],
    bonds: [],
  },
  {
    id: "hydrogen",
    engineId: ENGINE_INGREDIENT_ID.hydrogen,
    formula: "H₂",
    name: "Hydrogen molecule",
    atoms: [
      { element: "H", x: -8, y: 0 },
      { element: "H", x: 8, y: 0 },
    ],
    bonds: [[0, 1, 1]],
  },
  {
    id: "oxygen",
    engineId: ENGINE_INGREDIENT_ID.oxygen,
    formula: "O₂",
    name: "Oxygen molecule",
    atoms: [
      { element: "O", x: -10, y: 0 },
      { element: "O", x: 10, y: 0 },
    ],
    bonds: [[0, 1, 2]],
  },
  {
    id: "water",
    engineId: ENGINE_INGREDIENT_ID.water,
    formula: "H₂O",
    name: "Water molecule",
    atoms: [
      { element: "O", x: 0, y: 0 },
      { element: "H", x: -13.45, y: 10.36 },
      { element: "H", x: 13.45, y: 10.36 },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
    ],
  },
  {
    id: "acrylicAcid",
    engineId: ENGINE_INGREDIENT_ID.acrylicAcid,
    formula: "C₃H₄O₂",
    name: "acrylic acid monomer",
    atoms: [
      { element: "C", x: -31, y: 0 },
      { element: "C", x: -15, y: 0 },
      { element: "C", x: 2, y: 0 },
      { element: "O", x: 4, y: -16 },
      { element: "O", x: 19, y: 5 },
      { element: "H", x: -41, y: -10 },
      { element: "H", x: -41, y: 10 },
      { element: "H", x: -15, y: 15 },
      { element: "H", x: 36, y: 5 },
    ],
    bonds: [
      [0, 1, 2], [0, 5, 1], [0, 6, 1], [1, 7, 1],
      [1, 2, 1], [2, 3, 2], [2, 4, 1], [4, 8, 1],
    ],
  },
  {
    id: "diacrylate",
    engineId: ENGINE_INGREDIENT_ID.diacrylate,
    formula: "C₈H₁₀O₄",
    name: "ethylene glycol diacrylate crosslinker",
    atoms: [
      { element: "C", x: -88, y: 0 }, { element: "C", x: -72, y: 0 },
      { element: "C", x: -56, y: 0 }, { element: "O", x: -56, y: -17 },
      { element: "O", x: -40, y: 0 }, { element: "C", x: -24, y: 0 },
      { element: "C", x: -8, y: 0 }, { element: "O", x: 8, y: 0 },
      { element: "C", x: 24, y: 0 }, { element: "O", x: 24, y: -17 },
      { element: "C", x: 40, y: 0 }, { element: "C", x: 56, y: 0 },
      { element: "H", x: -98, y: -10 }, { element: "H", x: -98, y: 10 },
      { element: "H", x: -72, y: 15 }, { element: "H", x: -24, y: -15 },
      { element: "H", x: -24, y: 15 }, { element: "H", x: -8, y: -15 },
      { element: "H", x: -8, y: 15 }, { element: "H", x: 40, y: 15 },
      { element: "H", x: 66, y: -10 }, { element: "H", x: 66, y: 10 },
    ],
    bonds: [
      [0, 1, 2], [0, 12, 1], [0, 13, 1], [1, 14, 1], [1, 2, 1],
      [2, 3, 2], [2, 4, 1], [4, 5, 1], [5, 15, 1], [5, 16, 1],
      [5, 6, 1], [6, 17, 1], [6, 18, 1], [6, 7, 1], [7, 8, 1],
      [8, 9, 2], [8, 10, 1], [10, 19, 1], [10, 11, 2],
      [11, 20, 1], [11, 21, 1],
    ],
  },
  {
    id: "peroxide",
    engineId: ENGINE_INGREDIENT_ID.peroxide,
    formula: "H₂O₂",
    name: "hydrogen peroxide photoinitiator",
    atoms: [
      { element: "H", x: -26, y: 0 },
      { element: "O", x: -9, y: 0 },
      { element: "O", x: 9, y: 0 },
      { element: "H", x: 26, y: 0 },
    ],
    bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1]],
  },
];

export const INGREDIENTS_BY_KEY = Object.fromEntries(
  INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]),
) as Record<IngredientKey, Ingredient>;

export function elementPresentation(
  engineId: number,
): ElementPresentation | undefined {
  return ELEMENTS_BY_ENGINE_ID[engineId];
}

export function ingredientEngineId(
  ingredient: Ingredient | IngredientKey | EngineIngredientId,
): EngineIngredientId {
  if (typeof ingredient === "number") {
    if (
      Number.isInteger(ingredient) &&
      ingredient >= 0 &&
      ingredient < INGREDIENTS.length
    ) {
      return ingredient as EngineIngredientId;
    }
    throw new RangeError(`Unknown engine ingredient id: ${ingredient}`);
  }
  if (typeof ingredient === "string") {
    const id = ENGINE_INGREDIENT_ID[ingredient];
    if (id !== undefined) return id;
    throw new RangeError(`Unknown ingredient key: ${ingredient}`);
  }
  return ingredient.engineId;
}

if (ELEMENTS_BY_ENGINE_ID.length !== 3) {
  throw new Error("The presentation catalog does not match engine ABI v4.");
}
