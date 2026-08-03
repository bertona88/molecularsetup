# Browser adapter integration

`molecular-world.ts` is the only simulation backend used by the successor. It
loads `./engine/molecularsetup_engine.wasm`, requires a zero-import module and
ABI/model `2/2`, validates every packed pointer/length/stride, and has no
JavaScript dynamics or fallback.

## Ownership

- Rust/Wasm owns atom collision, bond state/forces, activation, excitation,
  temperature noise, angular preference, grab spring, piston motion, wall
  impulse/load, events, statistics, and energy ledgers.
- The adapter owns semantic command queuing during load, typed-array
  reacquisition, view validation, hit testing, camera transforms, summaries,
  and Canvas2D presentation.
- `App.tsx` owns pointer/keyboard gestures and controls. It may call only
  semantic adapter methods.

## Mutation rule

Every raw command invalidates all previous pointers and typed arrays. Adapter
`mutate()` performs exactly one raw call and then `refreshViews()` reacquires
atoms, bonds, walls, events, and stats. No caller retains a view across a
command. A length/stride mismatch, out-of-memory pointer, non-finite statistics,
count disagreement, missing four-wall container, or wrong version becomes a
fatal engine error.

## Load failure

Construction is SSR-safe and performs no I/O. `initialize()` runs from a client
effect. Semantic commands issued while loading queue in order. If fetch,
compile, import validation, export validation, version validation, or runtime
view validation fails:

- the adapter clears engine and packed views;
- queued commands are discarded;
- status becomes `error`;
- all command-producing controls become disabled;
- the app shows an alert and the canvas remains inert.

Do not add an approximate animation or TypeScript fallback to the failure path.

## Rendering order

The Canvas2D renderer draws:

1. calm field and container interior;
2. persistent spark/collision/bond/energy/wall traces;
3. spring grab tether;
4. atoms and excitation halos;
5. explicit bonds above atoms, with order and state styling;
6. wall glow/flex and piston handle.

Reduced motion removes decorative state wobble and repeated CSS pulses but does
not remove model motion, excitation, bond state, traces, piston response, or
outcomes.

The calm field is cached until viewport/camera state changes, and atom artwork
is cached by element, zoom radius, grabbed state, pixel ratio, and one of eight
ordered excitation-glow levels. Stable bonds avoid dynamic blur. State-changing
event traces are never presentation-thinned; only repetitive collision/wall
rings are end-aligned sampled above the crowded-world budget. `App.tsx` may
adapt Canvas backing resolution and passive redraw cadence from measured render
cost, but active pointer interaction stays full-cadence and every Rust fixed
step still executes.

## Presentation-only catalog

`molecular-catalog.ts` freezes ingredient ids `H=0`, `O=1`, `H2=2`, `O2=3`,
`H2O=4` and element ids `H=0`, `O=1`. Thumbnail geometry/color is presentation
metadata. Engine templates and all later connectivity remain Rust-owned.
