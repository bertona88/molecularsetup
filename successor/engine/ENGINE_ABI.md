# MolecularSetup engine ABI v2

## Scope

This crate is a deterministic, reduced-unit, two-dimensional bonding teaching
model. It is non-predictive chemistry and has no reaction/product lookup. The
ABI is dependency-free C/Wasm: a `wasm32-unknown-unknown` release exports
linear `memory`, imports nothing, and owns one module-global world.

ABI v2 is intentionally incompatible with v1. Both `ms_abi_version()` and
`ms_model_version()` return `2`.

## Commands

Integers are unsigned 32-bit values. Coordinates, heat, energy, radius, frame
time, and piston target are `f64`.

| Export | Result |
|---|---|
| `ms_reset(seed)` | Recreate the seeded populated Make a bond world. |
| `ms_load_experiment(id)` | Load `0 Make`, `1 Break`, `2 Ignite`, or `3 Free play`; return `1`, else `0`. |
| `ms_set_playing(0_or_1)` | Pause/resume browser-time advance. |
| `ms_set_temperature(u)` | Clamp semantic heat to `[0,1]`. |
| `ms_spawn_ingredient(id,count,x,y)` | Insert whole ingredients and return accepted count. |
| `ms_apply_spark(x,y,energy,radius)` | Add an expanding excitation wave; return `1`, else `0`. |
| `ms_grab_atom(atom_id,x,y)` | Attach the spring grab; return `1`, else `0`. |
| `ms_drag_atom(atom_id,x,y)` | Move a matching grab target; return `1`, else `0`. |
| `ms_release_atom(atom_id)` | Release a matching grab; return `1`, else `0`. |
| `ms_set_piston_target(x)` | Clamp/set right-wall target without moving it immediately; return `1`, else `0`. |
| `ms_advance(real_delta_ms)` | Execute at most five accumulated fixed steps; return executed count. |
| `ms_step_fixed(count)` | Execute exactly `count` fixed steps for replay/tests. |

Ingredient ids are `0 H`, `1 O`, `2 H2`, `3 O2`, `4 H2O`. Count always means
whole templates and is limited by the 18,000-atom capacity.

Every command can grow memory or replace a packed vector. It invalidates every
previous pointer and JavaScript typed-array view. Reacquire all views after
every mutation, including setters and failures.

Only steps executed by `ms_advance` or `ms_step_fixed` advance model clocks,
bond lifecycle, or pending pointer work. Other commands may refresh packed
views but cannot progress a forming/breaking bond in a paused world. A changed
grab target contributes signed work at most once, on the next executed step.

## Packed views

Each view has `ms_<name>_ptr()`, `ms_<name>_len()`, and
`ms_<name>_stride()`. Length is scalar count, not record count. Empty `f32`
views may use pointer `0`; stats always contains one complete `f64` record.

### Atoms (`f32`, stride 16)

| Index | Meaning |
|---:|---|
| 0 | stable atom id |
| 1 | element (`0 H`, `1 O`) |
| 2–3 | x, y |
| 4–5 | previous x, y |
| 6–7 | vx, vy |
| 8 | radius |
| 9 | decaying excitation |
| 10 | grabbed (`0/1`) |
| 11 | reserved/used integer valence |
| 12 | finite-state flags |
| 13 | kinetic energy |
| 14 | age |
| 15 | reserved (`0`) |

### Bonds (`f32`, stride 10)

| Index | Meaning |
|---:|---|
| 0 | stable bond id |
| 1–2 | atom indices A, B |
| 3 | integer order (`1/2`) |
| 4 | state (`0 forming`, `1 stable`, `2 stressed`, `3 breaking`) |
| 5 | progress `[0,1]` |
| 6 | fractional strain |
| 7 | current explicit bond energy |
| 8 | rest length |
| 9 | age |

Bonds drive dynamics and reserve valence; they are not a derived display
threshold.

### Walls (`f32`, stride 10)

There are always four records in edge order `0 left`, `1 right`, `2 top`,
`3 bottom`.

| Index | Meaning |
|---:|---|
| 0 | wall id |
| 1 | edge |
| 2 | x for vertical wall, y for horizontal wall |
| 3–4 | span start, end on the orthogonal axis |
| 5 | wall velocity |
| 6 | rolling impulse load |
| 7 | recent impact response |
| 8 | target position |
| 9 | movable (`1` only for right piston) |

### Events (`f32`, stride 10)

| Index | Meaning |
|---:|---|
| 0 | kind |
| 1–2 | atom indices or `-1` |
| 3–4 | x, y |
| 5 | magnitude |
| 6 | age |
| 7 | lifetime |
| 8 | signed event energy |
| 9 | wall id or `0` |

Kinds: `1 collision`, `2 bond forming`, `3 bond formed`, `4 bond stressed`,
`5 bond broken`, `6 spark`, `7 wall impact`, `8 energy pulse`. Lifetimes are
1.2–2 seconds.

### Statistics and ledgers (`f64`, stride 28)

| Index | Meaning |
|---:|---|
| 0 | simulated time |
| 1 | fixed timestep |
| 2 | normalized heat control |
| 3 | reduced thermostat target |
| 4 | RMS atom speed |
| 5 | kinetic energy |
| 6 | explicit bond/angle potential energy |
| 7 | kinetic + potential + excitation |
| 8 | cumulative thermostat exchange |
| 9 | cumulative formation release |
| 10 | cumulative breaking absorption |
| 11 | cumulative grab work |
| 12 | cumulative wall work |
| 13 | atom count |
| 14 | bond count |
| 15 | live event count |
| 16 | seed |
| 17 | completed fixed steps |
| 18 | playing (`0/1`) |
| 19 | atom capacity |
| 20 | rejected ingredient count |
| 21 | experiment id |
| 22 | model version (`2`) |
| 23 | ABI version (`2`) |
| 24 | spark count |
| 25 | collision count |
| 26 | mean rolling wall load |
| 27 | signed ledger combination |

## Errors and guards

Unknown ids, missing atom/grab ids, non-finite coordinates, invalid spark
values, and invalid piston targets return `0` and preserve finite state.
Non-finite heat is ignored. Paused or invalid frame deltas execute zero steps.
Speed and coordinate guards prevent non-finite state but are outside any
conservative energy claim.

## Model boundary

The exact reduced rules, compressed H/O masses, collision response, valence,
pair parameters, activation, angular preference, excitation, thermostat,
piston, and ledgers are documented in `../../MOLECULAR_MODEL_CONTRACT.md`.
Packed chemistry-like topology is not evidence of a real pathway, product,
rate, equilibrium, temperature, pressure, or mechanism.
