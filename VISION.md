# MolecularSetup vision

MolecularSetup is a touch-first molecular world for learning chemistry through
cause and effect. The default screen is a populated experiment, not a blank
editor or a scientific dashboard.

The visual thesis is simple: when atoms collide, bonds begin to form; when a
bond stretches, its state becomes visibly uncertain; when activation arrives,
atoms become excited and connectivity can change; when a piston closes, the
wall moves, atoms collide with it, and its response grows. Causes and effects
remain on screen long enough to be connected.

## Product promise

> Touch the ingredients and constraints, then understand the reduced model by
> watching its atoms, bonds, energy, and walls respond.

The product is for curious teenagers and adults. It should feel calm enough to
observe closely and alive enough to invite another experiment.

## Product principles

1. **Bonding is the story.** Explicit bonds have forming, stable, stressed, and
   breaking states. They render above atoms and visibly carry progress, order,
   strain, and energy.
2. **The molecules are the interface.** Prefer direct manipulation, motion,
   geometry, glow, traces, and timing over panels and readouts.
3. **Show causal memory.** Collision, spark, bond, energy, and wall events last
   1.2–2 seconds in model state. The presentation always retains state-changing
   spark/bond/energy traces and may sample only repetitive impact rings in a
   crowded world. A local spark expands before nearby atoms become excited.
4. **Parameterize interactions, not products.** Ingredient templates may set
   initial atoms and bonds. No later product graph, reaction lookup, or
   water-production rule chooses outcomes.
5. **Make constraints tangible.** Cold/Warm/Hot changes motion within one
   second. An atom follows the pointer through a spring. A piston has finite
   speed and receives wall impulse rather than teleporting atoms.
6. **Keep claims narrower than the experience.** The world may be coherent and
   educational without pretending to predict laboratory chemistry.

## Version 2 experience

The persistent controls are deliberately small:

- experiments: **Make a bond**, **Break a bond**, **Ignite**, **Free play**;
- ingredients: **H**, **O**, **H2**, **O2**, **H2O**;
- a broad horizontal **Cold / Warm / Hot** control;
- a local **Spark** tool;
- play/pause and reset.

One tap or drag adds one ingredient. Holding streams additional ingredients.
Pointer-down on an atom grabs it with a spring; dragging empty canvas pans;
wheel and pinch zoom around the gesture. The right container wall is a piston
and moves toward a pointer target at finite speed.

There is no persistent numerical readout, property inspector, arbitrary
boundary creator, or product selector. A polite screen-reader summary reports
the otherwise visual world state without creating one accessibility node per
atom.

## Experiment outcomes

- **Make a bond:** two free H atoms approach, collide, and form a stable H2 bond
  within two seconds.
- **Break a bond:** one H2 bond can be stretched by spring dragging or broken by
  sustained high heat within three seconds.
- **Ignite:** 8 H2 and 4 O2 remain stable for ten seconds without activation. A
  spark begins rearrangement within one second and the reference seed gives at
  least 75% of oxygen atoms two stable O-H neighbors within eight seconds.
- **Free play:** all later behavior follows the same collision, activation,
  valence, bond, angle, heat, grab, and wall rules.

## Architecture

- Rust owns deterministic model state and fixed-step execution.
- A zero-import Wasm module exposes ABI/model 2/2 commands and packed views.
- TypeScript owns gestures, camera, accessibility, load failure, and backend
  validation.
- Canvas2D owns presentation. WebGPU and sound are intentionally out of scope.
- Canvas2D may cache visual sprites/backgrounds, bound repetitive impact rings,
  and adapt raster resolution or passive redraw cadence. Those presentation
  choices never change fixed stepping, packed state, or semantic interaction.
- Reproducible artifacts are checked against engine-source and Wasm SHA-256
  values.

The page contains no browser-side force loop, bond mutation, thermal noise, or
simulation fallback. A missing or invalid engine produces an explicit inert
world.
