# Interface contract

## Human interface

The main route is a full-viewport Canvas2D molecular field that becomes
populated as soon as the verified engine loads. Persistent visible controls are
limited to:

- four experiment modes: Make a bond, Break a bond, Ignite, Free play;
- five ingredient buttons: H, O, H2, O2, H2O;
- Spark;
- play/pause and reset;
- one broad horizontal Cold / Warm / Hot control.

There is one default container. Its right wall is visibly a piston. The primary
experience has no arbitrary boundary drawing, numerical readout, chart,
inspector, property table, reaction recipe, or product selector.

## Gestures

| Gesture | Result |
|---|---|
| Tap ingredient | Add one copy near the unobstructed center |
| Drag ingredient to canvas | Add one copy at the drop point |
| Hold ingredient | Stream additional whole copies at a bounded cadence |
| Pointer-down on atom | Attach a spring grab to that atom |
| Drag grabbed atom | Move the spring target; never set atom position directly |
| Release/cancel atom drag | Remove the spring grab |
| Drag empty canvas | Pan |
| Wheel | Zoom around pointer |
| Two-finger pinch/drag | Zoom and pan around gesture center |
| Arm Spark, then point on canvas | Create one local expanding activation wave |
| Drag gold piston wall | Set its target; wall approaches at finite speed |

A card pointer cancellation never adds an ingredient. A second active canvas
pointer cancels any atom grab and begins pinch. Pointer moves from inactive ids
are ignored. Holding adds one ingredient per stream tick; it never switches to
a hidden quantity batch.

## Keyboard

- Space toggles play/pause while the canvas is focused.
- `S` arms spark placement; Enter applies it at the camera center.
- Escape cancels spark and releases an active grab.
- Arrow keys pan the focused canvas.
- Native button and range keyboard behavior remains available.
- Keyboard activation of an ingredient adds exactly one copy.

## Semantic heat

The heat input is horizontal and labels its whole domain Cold, Warm, and Hot.
Its screen-reader value is categorical rather than a printed percentage or
physical unit. Both visual endpoints must produce measurably different motion
inside one second; the engine acceptance ratio is at least 5x.

## Simulation backend boundary

The browser adapter provides semantic operations equivalent to:

```ts
interface SimulationBackendV2 {
  reset(seed: number): void;
  loadExperiment(id: 0 | 1 | 2 | 3): void;
  setPlaying(value: boolean): void;
  setTemperature(normalized: number): void;
  spawnIngredient(id: 0 | 1 | 2 | 3 | 4, count: number, x: number, y: number): number;
  applySpark(x: number, y: number, energy: number, radius: number): boolean;
  grabAtom(atomId: number, x: number, y: number): boolean;
  dragAtom(atomId: number, x: number, y: number): boolean;
  releaseAtom(atomId: number): boolean;
  setPistonTarget(x: number): boolean;
  advance(realDeltaMilliseconds: number): number;
  stepFixed(count: number): number;
}
```

The Wasm module is the only backend. It must report ABI/model `2/2`, export
memory, have zero imports, and expose packed atom, explicit-bond, wall, event,
and statistics views. Per-frame atom/bond objects do not cross the boundary.

Every command invalidates every previous pointer and typed array. The adapter
refreshes all views after exactly one raw mutation, validates lengths/strides,
and fails closed on missing exports, version skew, non-finite statistics, or
out-of-bounds pointers.

## Visual state mapping

| Model state | Required visible evidence |
|---|---|
| Collision | momentum change plus a fading impact ring |
| Excitation | atom halo plus the arriving spark wave |
| Bond forming | incomplete/dashed cyan connection and progress |
| Bond stable | calm continuous light connection; double lane for order 2 |
| Bond stressed | amber/red strain color, glow, and bounded wobble |
| Bond breaking | red segmented connection fading with progress |
| Formation energy | persistent outward energy pulse and changed motion/excitation |
| Piston load | finite wall motion, collision response, glow, and flex |

Bonds are drawn after atoms so state remains readable. Event traces remain for
1.2–2 seconds. Reduced motion removes decorative animation/wobble but retains
model motion, bond state, spark position, event traces, and outcomes.

## Accessibility

- Every control has a descriptive accessible name and visible focus.
- Experiment buttons expose pressed state.
- No accessibility node is created per atom.
- One polite summary reports H/O counts, bond-state counts, excited atoms,
  active grab state, and play state.
- Canvas instructions describe grab, pan, and piston interactions.
- Engine loading has status text. Blocked, corrupt, or wrong-version Wasm
  produces an alert, disables commands, and leaves the world inert.

## Responsive layout

Desktop keeps ingredients on a narrow side rail, experiments at the top, and
heat/actions at the bottom. At mobile width, ingredients become a bottom
horizontal tray, heat moves above it, and actions remain reachable without
covering the experiment switcher. Canvas gestures retain priority outside
these controls.

## Shareable recipe boundary

A future URL recipe may record schema/model version, seed, experiment,
ingredient insertions, heat, sparks, piston targets, and camera state. It must
record commands and initial conditions rather than mutable particle frames and
must reject unknown model versions rather than approximate them.
