# Interface contract

## Human interface

The main route is a full-viewport Canvas2D molecular field that becomes
populated as soon as the verified engine loads. A side rail selects Water,
Photopolymer, or Everything. Persistent visible controls are limited to:

- the three-system rail;
- system-scoped experience buttons;
- the active system's ingredient buttons;
- Spark in Water, Light in Photopolymer, and Energy in Everything;
- play/pause and reset;
- one broad horizontal Cold / Warm / Hot control.

There is one default container. Its right wall is visibly a piston. The primary
experience has no arbitrary boundary drawing, numerical readout, chart,
inspector, property table, reaction recipe, product selector, or lesson panel.

Water exposes Make a bond, Break a bond, Ignite, and Free play with H, O, H2,
O2, and H2O. Photopolymer exposes Expose resin, Stretch cured, and Free play
with acrylic acid, ethylene glycol diacrylate, and hydrogen peroxide.
Everything exposes one Free play experience and all eight ingredients.

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
| Arm Spark/Light/Energy, then point on canvas | Create one local expanding activation wave |
| Drag gold piston wall | Set its target; wall approaches at finite speed |

A card pointer cancellation never adds an ingredient. A second active canvas
pointer cancels any atom grab and begins pinch. Pointer moves from inactive ids
are ignored. Holding adds one ingredient per stream tick; it never switches to
a hidden quantity batch.

## Keyboard

- Space toggles play/pause while the canvas is focused.
- `S` arms activation placement; `L` also arms Light in Photopolymer. Enter
  applies it at the camera center.
- Escape cancels activation placement and releases an active grab.
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
interface SimulationBackendV4 {
  reset(seed: number): void;
  loadExperiment(id: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7): void;
  setPlaying(value: boolean): void;
  setTemperature(normalized: number): void;
  spawnIngredient(id: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, count: number, x: number, y: number): number;
  applySpark(x: number, y: number, energy: number, radius: number): boolean;
  grabAtom(atomId: number, x: number, y: number): boolean;
  dragAtom(atomId: number, x: number, y: number): boolean;
  releaseAtom(atomId: number): boolean;
  setPistonTarget(x: number): boolean;
  advance(realDeltaMilliseconds: number): number;
  stepFixed(count: number): number;
}
```

The Wasm module is the only backend. It must report ABI/model `4/4`, export
memory, have zero imports, and expose packed atom, explicit-bond, wall, event,
and statistics views. Per-frame atom/bond objects do not cross the boundary.

Every command invalidates every previous pointer and typed array. The adapter
refreshes all views after exactly one raw mutation, validates lengths/strides,
and fails closed on missing exports, version skew, non-finite statistics, or
out-of-bounds pointers.

## Visual state mapping

| Model state | Required visible evidence |
|---|---|
| Collision | momentum change plus a fading impact ring; repetitive crowded impacts may be sampled |
| Excitation | atom halo plus the arriving spark wave |
| Bond forming | incomplete/dashed cyan connection and progress |
| Bond stable | calm continuous light connection; double lane for order 2 |
| Bond stressed | amber/red strain color, glow, and bounded wobble |
| Bond breaking | red segmented connection fading with progress |
| Formation energy | persistent outward energy pulse and changed motion/excitation |
| Piston load | finite wall motion, collision response, glow, and flex |

Bonds are drawn after atoms so state remains readable. Events remain in packed
model state for 1.2–2 seconds. The browser always presents spark, forming,
formed, stressed, breaking, and energy traces; under crowding it may bound and
sample only repetitive collision/wall rings while retaining exact collision
counts, momentum response, and wall load. Reduced motion removes decorative
animation/wobble but retains model motion, bond state, spark position, causal
traces, and outcomes.

Atom artwork and the static field may be cached. Excitation glow may use a
small ordered set of visual levels, and Canvas backing resolution or passive
redraw cadence may adapt when measured rendering exceeds the frame budget.
Direct pointer interaction remains full-cadence, and the Rust engine continues
every deterministic fixed step independently of presentation cadence.

## Accessibility

- Every control has a descriptive accessible name and visible focus.
- System and experience buttons expose pressed state.
- No accessibility node is created per atom.
- One polite summary reports H/O/C counts, bond-state counts, excited atoms,
  reactive sites, active grab state, and play state.
- Canvas instructions describe grab, pan, and piston interactions.
- Engine loading has status text. Blocked, corrupt, or wrong-version Wasm
  produces an alert, disables commands, and leaves the world inert.

## Responsive layout

Desktop keeps systems and ingredients in a narrow left rail, experiences at
the top, and heat/actions at the bottom. At mobile width, systems and
experiences become horizontal top switchers, ingredients become a bottom
horizontal tray, heat moves above it, and actions remain reachable. Canvas
gestures retain priority outside these controls.

## Shareable recipe boundary

A future URL recipe may record schema/model version, seed, experiment,
ingredient insertions, heat, sparks, piston targets, and camera state. It must
record commands and initial conditions rather than mutable particle frames and
must reject unknown model versions rather than approximate them.
