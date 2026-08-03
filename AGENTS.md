# AGENTS.md

## Repository status

MolecularSetup is rebuilding its browser successor as a bonding-first chemistry
intuition world. The active implementation is `successor/`: a static
React/Canvas2D shell around a deterministic, zero-import Rust/WebAssembly
engine. ABI/model v3 is intentionally incompatible with v2.

Production release `20260726T002235Z-478235af2650` was verified at
https://molecularsetup.com/ on 2026-07-26. Current availability is external
state and must be checked live. Its source remains under `prototype/` as
immutable reference-only prior art. Do not edit, build new work inside, move,
or delete `prototype/` without explicit authorization.

## Active product boundary

The active v3 slice is a calm, full-canvas, two-dimensional teaching world
where collision, activation, bond formation, strain, breaking, energy release,
and compression are visually causal events.

- Three systems: Water, Polymers, and Everything.
- Water retains Make a bond, Break a bond, Ignite, and Free play with H, O, H2,
  O2, and H2O.
- Polymers uses generic M2 monomers and X junctions in Grow a chain, Stretch a
  chain, and Free play. Everything exposes both ingredient families.
- One persistent container with one finite-speed piston wall.
- Explicit first-class bonds with forming, stable, stressed, and breaking
  states.
- Local spark excitation, direct spring grabbing, horizontal semantic heat,
  pan, wheel zoom, and pinch zoom.
- No persistent numerical dashboard, inspector, reaction table, or scripted
  product selection. No lesson/explanation panel is in the current slice.

Perceptual causality is part of correctness. An event that exists only in an
internal counter but is not legible through motion, bond state, excitation,
event traces, or wall response does not satisfy the product contract.

## Scientific claim boundary

The engine is deterministic and scientifically structured, but deliberately
reduced, dimensionless, planar, pedagogical, and non-predictive.

- H and O have explicit integer valence capacities of 1 and 2.
- H-H order 1, O-O order 2, and O-H order 1 use versioned teaching
  parameters.
- Generic M and X model sites have valence capacities 2 and 3; M-M and M-X
  order-1 bonds use separate versioned teaching parameters. M/X are not
  chemical elements or a named polymer model.
- Oxygen uses four hydrogen masses rather than the physical ratio of about
  sixteen so oxygen movement remains visible.
- A three-body angular term prefers H-O-H geometry.
- Stable reactant bonds require excitation or sufficient mechanical strain to
  rearrange; free atoms may bond through favorable collisions.
- No reactant-to-product table, product graph, or water-production rule may be
  introduced.

Do not claim physical kelvin, pressure, time, energy, distance, rate,
equilibrium, mechanism, stereochemistry, or predictive reaction outcome.
Plausible topology is a teaching behavior inside this declared model, not a
real chemistry result.

## Engine and browser ownership

- Rust owns atom state, compressed masses, fixed stepping, seeded randomness,
  spatial neighbor search, hard collision response, bonds, angular forces,
  activation, excitation decay, grabbing, piston motion, wall impulse/load,
  events, statistics, and energy ledgers.
- Wasm exports one zero-import module with packed arrays and ABI/model 3/3.
  Every mutation invalidates prior pointers and typed-array views.
- TypeScript owns input gestures, camera transforms, accessibility, experiment
  selection, artifact validation, and Canvas2D presentation. It must not contain
  a physics, bond, reaction, or randomness fallback.
- If Wasm is blocked, corrupt, or version-skewed, the world remains inert and
  reports the failure.

## Required repository-visible contracts

Read and update these before changing claims or behavior:

- `VISION.md`
- `MOLECULAR_MODEL_CONTRACT.md`
- `INTERFACE_CONTRACT.md`
- `CLAIMS_AND_VALIDATION.md`
- `ACCEPTANCE_TESTS.md`
- `successor/engine/ENGINE_ABI.md`

`VALIDATION_REPORT.md` records what was actually run. Planned or CI-only tests
must not be reported as passing before evidence exists.

## Validation discipline

- Native tests cover collision momentum, deterministic overlap separation,
  valence, formation/breaking, angular preference, activation gating, energy
  accounting, deterministic replay, piston motion, confinement, wall load,
  perceptual motion gates, and all preset outcomes.
- Real-Wasm tests cover every command/view, zero imports, packed-view bounds,
  stale pointers, deterministic replay, artifact identity, and invalid input.
- Browser tests cover populated first paint, atom dragging, spark placement,
  temperature endpoints, piston gestures, keyboard access, mobile layout,
  reduced motion, and blocked/corrupt Wasm.
- Keep the independent Lennard-Jones numerical fixture as a numerical-method
  discipline check. It does not validate the visible chemistry model.
- Rebuild Rust/Wasm and run heavyweight browser tests on `devbox-home` or CI.
  Do not install a large toolchain on a Mac merely to satisfy this repository.
- The checked-in artifact and manifest must match engine sources by SHA-256,
  report 3/3, have zero imports, and reproduce byte-for-byte under the pinned
  toolchain.

## Setup Universe boundary

MolecularSetup owns molecular/material state and response. OpticalSetup owns
instrument propagation; QuantumSetup owns explicitly quantum evolution.
Future setup interoperability must use explicit versioned payloads with units
or declared dimensionless conventions, coordinate frame, timebase,
uncertainty, provenance, and source-of-truth ownership. Shared family naming is
not an interface.

## Working agreement

- Inspect worktree and remote state before edits; preserve unrelated and
  untracked user work, including `.sites-runtime/`.
- Keep changes in this repository and leave `prototype/` untouched.
- Do not deploy, change DNS, replace production, or alter external services as
  an incidental consequence of development.
- Treat a local source change with a stale Wasm artifact as incomplete, not as
  a passing candidate.
