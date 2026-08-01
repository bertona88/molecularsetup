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

## Implemented product slice

The successor in `successor/` now combines the established interaction design
with a compiled Rust/Wasm numerical core:

- empty 2D canvas;
- eight starting species;
- per-species quantities from 1 to 1000;
- tap or drag spawning;
- temperature-driven motion using a fluctuation-dissipation-consistent
  Langevin thermostat;
- one continuous, energy-derived reduced model for short-range interaction,
  dispersion, fixed-charge electrostatics, covalent attraction, and smooth
  over-coordination cost;
- state-derived bond order, bond formation, and bond breaking with no reaction
  or product table;
- drawable rectangular boundaries whose walls can be dragged as pistons;
- pan, wheel zoom, pinch zoom, pause, and hold-to-reset;
- deterministic model seed for replay and clean reset;
- a separately validated reduced-unit Lennard-Jones fixture that protects the
  numerical-method acceptance boundary without being presented as chemistry.

The visible model is deliberately pedagogical rather than predictive. Its
continuous energy is a coherent constrained world, but it is not a calibrated
reactive force field. Starting structures and fixed charges are presets; all
later connectivity is derived from state.

## Intended architecture

The production direction is:

- Rust owns particles, neighbor search, integration, constraints, thermal
  noise, model state, accounting, and derived events;
- a zero-import Wasm module provides a narrow, versioned packed-array interface
  to the browser;
- TypeScript owns gestures, accessibility, URL recipes, and backend selection;
- Canvas2D currently owns presentation; WebGPU remains a later scale path where
  measured device results justify it;
- the setup URL records ingredients, constraints, seed, and model version rather
  than every rendered frame.

The page contains no JavaScript force loop, thermostat, random dynamics, or
bond mutation fallback. If the Wasm engine cannot load or validate, the world
stays inert rather than silently changing models.
