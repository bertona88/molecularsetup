# Acceptance tests

## Automated successor gate

- The native Rust suite passes force-gradient, conservation/accounting,
  thermostat-statistics, deterministic-replay, finite-state, and scale-path
  checks.
- The independent reduced-unit Lennard-Jones fixture passes its documented
  shifted-force, timestep-convergence, NVE-drift, and Langevin-calibration
  tolerances.
- A locked offline `wasm32-unknown-unknown` release has zero imports, exports
  memory and every frozen ABI function, and matches its source/artifact
  manifest.
- The production build contains the exact verified Wasm module, a static HTML
  entry, browser bundle, and GitHub Pages marker, with no server artifact.
- The static source contract contains the molecular canvas, molecule tray,
  simulation controls, pressure-boundary action, play/pause, hold-to-reset,
  quantity maximum 1000, and the frozen species catalog.
- No dashboard, inspector, or reaction-recipe language appears in the rendered
  experience.
- Source regression tests reject browser-side forces, bonds, thermal randomness,
  and a JavaScript simulation fallback.
- Pointer cancellation, active-pointer tracking, fixed drag origins, paused
  stepping, exact species ids, and quantity endpoints are regression-tested.
- Lint, static-entry, interaction-contract, real-Wasm ABI, and architecture
  tests pass.

Deployment is deliberately not part of this gate. Hosting verification and
public replacement require separate authorization and evidence.

## Interaction matrix still required

Test mouse, touch, stylus, and keyboard where supported:

1. Spawn exactly 1 and 1000 of every species by tap and drag.
2. Cancel, leave the viewport, and introduce a second touch during a card drag;
   no accidental or duplicate spawn may occur.
3. Drag every quantity endpoint and verify quantity means complete molecules.
4. Pan and zoom before dropping; screen-to-world placement must remain correct.
5. Pinch during boundary mode; the camera gesture must not create a boundary.
6. Draw in every direction, reject sub-minimum rectangles, and move every wall.
7. Move a wall while paused; atoms must remain inside valid geometry.
8. Compress a hot 1000-molecule system; input must remain responsive and all
   state must stay finite.
9. Reset during queued spawning, boundary movement, pause, and tab restoration.
10. Repeat spawn/reset cycles and check for stale pointers, queues, listeners,
    bonds, and buffers.

Initial performance targets:

| Device class | Target |
|---|---:|
| Typical laptop | 3000 atoms at 45–60 rendered fps |
| Recent phone | 1500 atoms at 30 rendered fps |
| Single gesture | 1000 small molecules without a blocking frame |
| Stability | 10-minute hot, compressed run without non-finite state |

## Independent scientific acceptance slice

The engine crate includes a separate reduced-unit Lennard-Jones conformance
fixture with:

- explicit potential and shifted-force cutoff;
- reduced mass, sigma, epsilon, box size, and periodic boundaries;
- documented integrator and time step;
- NVE energy-drift test over a named number of steps;
- thermostat relaxation test for the selected canonical ensemble;
- deterministic seed and reproducible fixture;
- density and temperature sweeps including degenerate cases;
- reported error tolerances and precision assumptions.

That fixture validates the numerical-method discipline required by this
repository. It does not calibrate or validate the canvas's pedagogical reactive
energy, and it does not authorize chemical claims.

## Open browser and performance gate

The following must still be measured before a public replacement:

- mouse, touch, stylus, and keyboard interaction across current browsers;
- frame/tick timing on named laptop and phone hardware;
- a ten-minute hot, compressed stability run;
- recoverable behavior when the Wasm asset is blocked or corrupt;
- hosted artifact verification and explicit user acceptance.
