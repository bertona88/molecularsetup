# MolecularSetup engine ABI

## Scope

This crate is a deterministic, reduced-unit, two-dimensional teaching model.
It is not predictive chemistry. It has no product or reaction table. Starting
species provide only atom elements, positions, and fixed initial charges;
continuous model state determines forces and the bond/event views.

The ABI is dependency-free C/Wasm. A `wasm32-unknown-unknown` release must
export its linear `memory` and have zero imports. All numerical commands mutate
one module-global world. Call `ms_reset(seed)` before replaying a recipe.

## Commands

All integers are unsigned 32-bit values and all scalar coordinates are `f64`.

| Export | Result |
|---|---|
| `ms_reset(seed)` | Clear all state and restore defaults using `seed`. |
| `ms_set_playing(0_or_1)` | Pause or resume integration. |
| `ms_set_temperature(u)` | Clamp the thermal control to `[0, 1]`. |
| `ms_set_thermostat_gamma(gamma)` | Set Langevin friction; `0` selects NVE-like integration. |
| `ms_spawn(species, count, x, y)` | Queue up to `count` whole molecules and return the accepted molecule count. |
| `ms_flush_spawns(limit)` | Materialize at most `limit` queued whole molecules; return the number materialized. |
| `ms_advance(real_delta_ms)` | Accumulate wall time, execute at most five fixed `1/120` steps, and return the step count. |
| `ms_step_fixed(count)` | Execute exactly `count` fixed steps (diagnostics/replay) and return the step count. |
| `ms_create_boundary(x, y, width, height)` | Create a rectangle and return its nonzero id, or `0` if invalid. |
| `ms_move_boundary_edge(id, edge, coordinate)` | Move edge `0=left, 1=right, 2=top, 3=bottom`; return `1` on success. |
| `ms_remove_boundary(id)` | Remove a rectangle; return `1` on success. |

Species ids are stable for ABI version 1: `0 H2O`, `1 H2`, `2 O2`, `3 CH4`,
`4 NH3`, `5 CO2`, `6 Na+`, `7 Cl-`. Quantity always means complete molecules.
The atom capacity is 18,000; `ms_spawn` truncates only at a whole-molecule
boundary after accounting for already queued atoms.

Moving a wall constrains assigned atoms immediately even while paused. The
change in mechanical energy caused by that instantaneous edit is added to the
boundary-work ledger. It is a bookkeeping convention, not a calibrated piston.

## Views

Each view has `ms_<name>_ptr()`, `ms_<name>_len()`, and
`ms_<name>_stride()` exports. `len` is the number of `f32` or `f64` scalar
values, not the record count. Read only complete records. Every command may
grow Wasm memory or replace a vector and therefore invalidates all previous
JavaScript `TypedArray` objects and pointers. Recreate views after every
mutating call; never retain a pointer across a command.

### Atoms (`f32`, stride 16)

| Field | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Meaning | id | element | x | y | previous x | previous y | vx | vy |

| Field | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Meaning | fx | fy | charge | radius | coordination | boundary id | age | flags |

Element ids: `0 H`, `1 C`, `2 N`, `3 O`, `4 Na`, `5 Cl`. Boundary id `0`
means uncontained. Atom indices are append-only until reset.

### Bonds (`f32`, stride 6)

`atom index A, atom index B, continuous order, fractional strain, Morse well
depth, flags`. Bonds are a derived display graph rebuilt from continuous bond
order and valence capacity. They never drive dynamics. Flags are reserved and
currently zero.

### Boundaries (`f32`, stride 11)

`id, x, y, width, height, impact, left load, right load, top load, bottom load,
assigned atom count`. Loads and impact are reduced qualitative values.

### Events (`f32`, stride 8)

`kind, atom index A, atom index B, x, y, magnitude, age, boundary id`.
Missing atom indices are `-1`. Kinds are `1 bond formed`, `2 bond broken`, and
`3 wall impact`. Events are short-lived observations of threshold crossings;
they never trigger or alter dynamics.

### Stats (`f64`, stride 21)

| Index | Meaning |
|---:|---|
| 0 | simulated time |
| 1 | fixed timestep |
| 2 | normalized temperature control |
| 3 | target reduced temperature |
| 4 | instantaneous kinetic temperature |
| 5 | kinetic energy |
| 6 | potential energy |
| 7 | mechanical energy |
| 8 | cumulative thermostat heat |
| 9 | cumulative boundary work |
| 10 | atom count |
| 11 | derived bond count |
| 12 | boundary count |
| 13 | pending molecule count |
| 14 | seed |
| 15 | completed fixed steps |
| 16 | playing (`0` or `1`) |
| 17 | atom capacity |
| 18 | rejected molecule count |
| 19 | model version (`1`) |
| 20 | ABI version (`1`) |

The exact Langevin Ornstein-Uhlenbeck update is
`v <- exp(-gamma*dt) v + sqrt((1-exp(-2*gamma*dt))*T/m) N(0,1)` per component.
Newtonian kicks use `F/m`. Heat index 8 records the kinetic-energy change in
that thermostat substep. With `gamma=0`, no thermostat noise or heat is added.

## Model boundary

The smooth energy contains short-range repulsion/dispersion, screened Coulomb,
Morse attraction, and a continuous over-coordination penalty. Fixed partial
charges do not redistribute as bonds change. The current core has no electronic
structure, charge equilibration, stereochemistry, out-of-plane motion, or
three-body angular energy. In particular, plausible motion or connectivity is
not evidence that a pathway, product, rate, or equilibrium is chemically
correct.
