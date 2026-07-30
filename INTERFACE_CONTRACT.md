# Interface contract

## Human interface

The main route is a full-viewport canvas. Persistent controls are limited to:

- visual molecule cards;
- one quantity slider per card;
- boundary draw mode;
- play or pause;
- remove selected boundary;
- hold-to-reset;
- one temperature slider.

Formulae and quantity values are the only persistent visible text. Explanations,
graphs, inspectors, reaction tables, and property dashboards do not belong on
the default canvas.

## Gestures

| Gesture | Result |
|---|---|
| Tap a molecule | Spawn the selected quantity near the unobstructed center |
| Drag a molecule | Spawn the selected quantity at the drop point |
| Drag empty canvas | Pan |
| Mouse wheel | Zoom around the pointer |
| Two-finger pinch/drag | Zoom and pan around the gesture center |
| Select boundary tool, then drag | Create one rectangular boundary |
| Drag a selected wall | Move that wall as a piston |
| Hold reset for 720 ms | Clear atoms, bonds, queues, boundaries, camera, and heat |

Pointer cancellation must never spawn. The slider owns its pointer gesture. A
quantity always means molecules, not atoms.

## Simulation backend boundary

The browser shell should converge on this backend-neutral shape:

```ts
interface SimulationBackend {
  enqueue(command: SimulationCommand): void;
  advance(realDeltaMilliseconds: number): void;
  view(): SimulationView;
  reset(seed: number): void;
}
```

Commands:

- `spawn(speciesId, count, worldX, worldY)`;
- `setTemperature(normalizedValue)`;
- `createBoundary(rectangle)`;
- `moveBoundaryEdge(boundaryId, edge, worldCoordinate)`;
- `removeBoundary(boundaryId)`;
- `setPlaying(boolean)`;
- `reset(seed)`.

The view exposes stable typed-array or GPU-buffer data for atoms, current bonds,
boundaries, event pulses, counts, simulated time, seed, and model version.
Per-frame atom objects crossing the Wasm boundary are forbidden.

## Accessibility

- Every icon button has a descriptive accessible name.
- Every molecule card announces species and selected quantity.
- No accessibility node is created per simulated atom.
- One polite world summary reports play state, atom counts, and boundary count.
- Space toggles physics while the canvas is focused.
- Escape cancels boundary drawing.
- Reduced-motion mode removes decorative pulses and transitions, not model
  motion or outcomes.

## Shareable recipe

The eventual URL payload records commands and initial conditions rather than
mutable particle frames:

- schema and model versions;
- deterministic seed;
- species, quantities, spawn coordinates, and order;
- temperature changes;
- boundary geometry and edits;
- camera only when presentation state is intentionally shared.

Replay must reject unknown model versions rather than silently approximating
them with a different backend.
