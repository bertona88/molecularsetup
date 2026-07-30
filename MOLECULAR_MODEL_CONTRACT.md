# Molecular model contract

## Status

The `successor/` backend is a qualitative, reduced-order, two-dimensional model
for interaction design and intuition testing. It is not a calibrated molecular
dynamics package and is not predictive chemistry.

## State

Each atom stores:

- 2D position and previous position;
- 2D velocity and force;
- element parameter key;
- reduced mass and display/collision radius;
- fixed partial or formal charge;
- preferred valence capacity;
- age since insertion;
- dynamic bond adjacency;
- optional containing boundary.

Each bond stores two atom indices, rest length, reduced bond affinity, continuous
display order, age, and current strain. Molecule identity is discarded after
spawn. Connected components are therefore consequences of the current bond
graph, not permanent product labels.

The initial catalog contains H, C, N, O, Na, and Cl parameters and templates for
H2O, H2, O2, CH4, NH3, CO2, Na+, and Cl-. Templates define starting geometry,
partial charges, and starting bonds only. They do not define reaction products.

## Coordinates and units

- Coordinate frame: right-handed screen plane, +x right, +y down.
- Distance: reduced display unit represented in CSS pixels at camera zoom 1.
- Time step: fixed `1/120` reduced seconds per integration tick.
- Temperature: normalized control `u` in `[0, 1]`.
- Target stochastic speed scale:
  `24 * sqrt((0.025 * 58^u) / sqrt(reduced_mass))`.
- Pressure, energy, temperature, distance, and time are not mapped to SI units.

Frame overruns reduce simulated progress. The integrator does not increase its
time step to catch up.

## Current governing rules

The reference backend evaluates nearby pairs with a uniform spatial grid.
Within the cutoff it applies:

1. a capped soft-overlap repulsion;
2. a weak smooth nonbond attraction;
3. softened, exponentially screened Coulomb attraction or repulsion for
   charged atoms;
4. spring forces for current bonds;
5. a Langevin-like stochastic velocity relaxation toward the temperature
   dependent speed scale.

Candidate bonds form only when:

- the atoms are within `1.16` times the sum of their covalent radii;
- both atoms have free valence capacity;
- the pair is not already bonded; and
- relative collision speed is below a pair-affinity capture threshold.

Bond formation has no product lookup. Bond order follows current stretch and is
used by both rendering and break detection. A bond is removed after its minimum
settling age when its stretch exceeds a pair-affinity limit or its order falls
near zero.

New atoms ramp into full pair interactions over approximately 0.24 reduced
seconds. This prevents a dense user drop from producing an unbounded impulse.
For every rendered frame, queued spawning inserts a bounded number of complete
molecules; a request for 1000 molecules is not translated into 1000 preview
objects or one blocking allocation.

## Boundaries

A boundary is an axis-aligned rounded rectangle in world coordinates. Atoms
inside when it is created, and atoms spawned inside later, are assigned to it.
Its walls clamp penetration and reflect normal velocity with reduced
restitution. Collision impulse drives wall glow. Dragging an edge changes only
that edge's normal coordinate and immediately displaces contained atoms to a
valid position, including while paused.

Boundary glow is qualitative. No pressure value is reported.

## Stability limits

- Atom capacity: 18,000.
- Pair cutoff: at most 47 reduced display units.
- Per-frame spawn budget: 220 molecules, reduced to 90 in dense worlds.
- Maximum particle speed: 280 reduced distance units per reduced second.
- Fixed-step work per rendered frame: at most five ticks.

These caps favor responsiveness and finite state. They are not calibrated
physical limits.

## Required replacement boundary

A Rust/Wasm or WebGPU backend may replace the reference model only if it
preserves the command and view semantics in `INTERFACE_CONTRACT.md`, deterministic
seeding, atom accounting, model-version reporting, and the claims gate. It does
not need to preserve qualitative outcomes of this heuristic backend.
