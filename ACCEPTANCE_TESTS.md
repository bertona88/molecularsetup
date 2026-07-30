# Acceptance tests

## Current successor gate

- Production build emits a valid worker and static asset bundle.
- Server-rendered HTML contains the molecular canvas, molecule tray, simulation
  controls, pressure-boundary action, play/pause, hold-to-reset, quantity
  maximum 1000, and all catalog formulae.
- No dashboard, inspector, or reaction-recipe language appears in the rendered
  experience.
- Lint and rendered-contract tests pass.
- A hosted checkpoint reaches a verified successful deployment.

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

## Scientific acceptance slice

Before interpreting any control quantitatively, add a backend test mode for a
reduced-unit Lennard-Jones box with:

- explicit potential and shifted-force cutoff;
- reduced mass, sigma, epsilon, box size, and periodic boundaries;
- documented integrator and time step;
- NVE energy-drift test over a named number of steps;
- thermostat relaxation test for the selected canonical ensemble;
- deterministic seed and reproducible fixture;
- density and temperature sweeps including degenerate cases;
- reported error tolerances and browser/device precision differences.

That validation is intentionally separate from visual appeal and browser smoke
testing.
