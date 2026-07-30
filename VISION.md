# MolecularSetup vision

MolecularSetup is a touch-first, two-dimensional molecular world for building
chemical intuition through direct manipulation.

The default screen is the experiment. A learner drags starting molecules from a
visual tray, chooses a quantity from 1 to 1000, changes temperature, draws a
container, and watches the world move. Molecules should communicate through
motion, collision, attraction, repulsion, stretching bonds, breaking bonds,
forming bonds, and wall impacts. The main canvas does not grow into a dashboard.

The long-term product promise is:

> Choose the ingredients and constraints; let behavior emerge from one
> documented model; understand it by watching the behavior itself.

## Product principles

1. **The molecules are the interface.** Prefer motion, geometry, color, touch,
   and sound over prose, panels, charts, and inspectors.
2. **Parameterize interactions, not outcomes.** Starting molecule templates are
   permitted; product molecules and reaction recipes are not.
3. **Make constraints tangible.** Temperature changes motion. A wall becomes a
   piston when dragged. Pressure appears as impacts on a boundary.
4. **Keep claims narrower than the implementation.** A coherent toy universe
   can teach causality without claiming predictive chemistry.
5. **Design for replacement of the numerical core.** The browser interface must
   remain independent of the simulation backend so the reference model can be
   replaced by Rust/Wasm and GPU compute.

## First product slice

The successor in `successor/` is an interaction and reduced-model prototype:

- empty 2D canvas;
- eight starting species;
- per-species quantities from 1 to 1000;
- tap or drag spawning;
- temperature-driven stochastic motion;
- generic pair forces, partial charges, valence limits, dynamic bonds, and bond
  breaking;
- drawable rectangular boundaries whose walls can be dragged as pistons;
- pan, wheel zoom, pinch zoom, pause, and hold-to-reset;
- deterministic model seed for a clean reset.

It is deliberately not the repository's scientific acceptance slice. Before
this interaction model can make quantitative physical claims, the numerical
backend must pass the documented reduced-unit Lennard-Jones validation gate in
`ACCEPTANCE_TESTS.md`.

## Intended architecture

The production direction is:

- Rust owns particles, neighbor search, integration, constraints, and model
  state;
- Wasm provides a narrow typed-array interface to the browser;
- WebGPU owns high-volume force evaluation and instanced rendering where device
  support makes it advantageous;
- TypeScript owns gestures, accessibility, URL recipes, and backend selection;
- the setup URL records ingredients, constraints, seed, and model version rather
  than every rendered frame.

The current TypeScript backend is a playable reference implementation and a UI
contract fixture, not an architectural commitment.
