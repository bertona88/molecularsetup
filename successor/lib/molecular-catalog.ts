/** Presentation metadata for the intentionally breaking ABI v2 catalog. */

export const ENGINE_INGREDIENT_ID = {
  hydrogenAtom: 0,
  oxygenAtom: 1,
  hydrogen: 2,
  oxygen: 3,
  water: 4,
} as const;

export const ENGINE_ELEMENT_ID = {
  H: 0,
  O: 1,
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
} as const satisfies Record<ElementKey, ElementPresentation>;

export const ELEMENTS_BY_ENGINE_ID: readonly ElementPresentation[] = [
  ELEMENTS.H,
  ELEMENTS.O,
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

if (ELEMENTS_BY_ENGINE_ID.length !== 2) {
  throw new Error("The presentation catalog does not match engine ABI v2.");
}
