# Molecular model contract

## Status and validity domain

The active backend is a dependency-free Rust core compiled to WebAssembly. ABI
and model versions are both `3`. It is a deterministic, reduced-unit,
two-dimensional, pedagogical bonding model. It is non-predictive chemistry.

The model contains no reaction lookup, product graph, desired-product term, or
rule of the form `reactants -> water`. Experiment and ingredient templates set
only initial atoms, positions, velocities, and explicit starting bonds. Every
later connectivity change uses the same collision, valence, activation,
formation, strain, and breaking rules.

## State

Each site stores a stable id, H/O element or generic M/X site id, current and previous position,
velocity, force, age, excitation, and finite-state flags. A single optional
grab record identifies an atom and a pointer target; the target acts through a
spring rather than a position edit.

Each bond is first-class model state with:

- stable id and atom indices;
- integer order;
- `forming`, `stable`, `stressed`, or `breaking` state;
- normalized progress;
- preferred length, fractional strain, energy, age, and stress clock.

Each of four container walls stores edge, position, span, velocity, rolling
load, recent impact, pointer target, and whether it is movable. The right wall
is the only piston.

Events persist for 1.2–2 seconds and identify collision, bond formation, bond
completion, stress, break, spark, wall impact, or energy release. Statistics
and energy ledgers are internal views, not persistent visual readouts. The live
event queue is a 4,096-record oldest-first ring; overflow removes only the
oldest trace record and does not change collision counters or model response.

## Systems, ingredients, valence, and pair parameters

ABI v3 ingredient ids are:

| Id | Ingredient | Initial bonds |
|---:|---|---|
| 0 | H | none |
| 1 | O | none |
| 2 | H2 | one stable H-H order-1 bond |
| 3 | O2 | one stable O-O order-2 bond |
| 4 | H2O | two stable O-H order-1 bonds |
| 5 | generic monomer M2 | one stable M-M order-1 bond; one free valence at each end |
| 6 | generic junction X | none; three available connections |

Hydrogen has valence capacity 1, oxygen 2, generic monomer site M 2, and generic
junction X 3. `M` and `X` are model-site symbols, not chemical elements. A bond reserves
its full integer order while forming, stable, stressed, or breaking, so no
transient state may overfill valence.

H-H, O-O, O-H, M-M, and M-X have versioned values for order, rest length, capture
distance, spring stiffness, damping, activation barrier, formation time,
dissociation energy, strain hysteresis, and excitation threshold. These are
teaching parameters, not fitted bond energies or a published reactive force
field.

Water experiments are ids 0–3: Make a bond, Break a bond, Ignite, and Free
play. Polymer experiments are ids 4–6: Grow a chain, Stretch a chain, and Free
play. Id 7 is the Everything sandbox. The system boundary is a grouping of
ingredients and starting conditions; the engine continues to apply pair-local
rules. H/O sites do not bond to M/X sites, and X-X has no declared pair rule.

## Coordinates, time, and mass

- Coordinate frame: +x right, +y down, strict plane.
- Fixed step: `1/120` reduced time units.
- Browser advance: at most five fixed steps per animation frame; full overrun
  ticks are discarded and the sub-tick remainder is retained.
- Only executed fixed steps advance atom/bond/event ages, bond lifecycle clocks,
  or pending pointer work. View-refreshing commands such as ingredient insertion
  do not advance a paused world.
- Atom capacity: 18,000; ingredient counts are truncated only at whole-template
  boundaries.
- Hydrogen mass: 1 reduced unit.
- Oxygen mass: 4 reduced units.
- Generic M site mass: 3 reduced units.
- Generic X junction mass: 5 reduced units.

The physical H:O mass ratio is about 1:16. The compressed 1:4 ratio is an
explicit nonphysical scaling chosen so oxygen moves visibly at warm and hot
settings while hydrogen still responds more readily.

No conversion to SI distance, time, temperature, energy, or pressure exists.

## Temperature and excitation

The semantic heat control `u` is clamped to `[0,1]` and maps to the reduced
thermostat target

`T(u) = 64 * 64^u`.

The corresponding RMS velocity span is eight-fold for a fixed mass. A
deterministic seeded Langevin update approaches that target and records kinetic
energy change in the thermostat ledger. The endpoint span is a perceptual gate,
not a thermodynamic calibration.

Spark energy is a separate, decaying per-atom excitation field. A spark creates
an expanding wave; an atom receives excitation when the wavefront reaches it,
with radial falloff. Excitation decays continuously. Sustained high heat also
raises excitation above the top part of the heat range.

Stable H2/O2 bonds do not rearrange at the Ignite preset's initial heat.
Sufficient excitation or mechanical strain moves a bond through stress and
breaking hysteresis. For free atoms with available valence, excitation above
the pair barrier can be converted into bounded inward encounter motion. That
steering conserves pair momentum, consumes excitation when it raises kinetic
energy, and never creates connectivity: a favorable collision must still occur
before a bond can begin forming.

## Atom collisions and exact overlaps

The engine uses a deterministic uniform spatial grid to enumerate nearby atom
pairs. Nonbonded overlapping atoms receive:

1. inverse-mass-weighted non-overlap correction;
2. a normal impulse with finite restitution;
3. equal and opposite momentum change;
4. a persistent collision event.

If centers coincide exactly, the normal is derived from the stable atom ids.
It is never `(0,0)`, so no coincident configuration can remain overlapped with
zero repulsive response.

## Bond formation, forces, and breaking

An eligible pair starts a finite-duration `forming` bond only when:

- the pair is H-H, O-O, O-H, M-M, or M-X;
- both atoms have sufficient remaining integer valence;
- the atoms collide or enter the contact shell while moving together;
- relative collision energy plus excitation clears the activation barrier.

Forming progress scales the damped spring force until completion. Completion
enters `stable`, records dissociation-scale energy in the formation ledger,
adds bounded local excitation, and emits bond and energy pulses.

A stable bond enters `stressed` above its strain-on or excitation threshold. It
returns to stable only below lower off-thresholds. Sustained or severe stress
enters `breaking`; progress and force then decay over finite time. Removal
records breaking absorption and a persistent break event. This hysteresis keeps
the bond state legible and prevents one-frame flicker. The just-broken atom pair
also has a three-reduced-second refractory interval before that same pair can
form again; all other eligible collision partners remain available. This is a
general anti-flicker rule, not a product-selection rule.

## H-O-H angular preference

For an oxygen with two active O-H bonds, a three-body term penalizes deviation
of `cos(theta)` from the declared 104.5-degree preference. Analytical gradients
apply equal-and-opposite forces to the two hydrogens and oxygen. The term is
planar and pedagogical; it is not a stereochemical or vibrational prediction.

## Grabbing and piston boundaries

The grab force is a damped spring from an atom to the latest pointer target.
Pointer motion contributes once to the signed external grab-work ledger on the
next fixed step. A dragged atom is still integrated, collides, remains confined,
and may strain its bonds.

The container begins at reduced bounds `[-320,320] x [-220,220]`. The right
wall moves toward its clamped target at no more than 150 reduced distance units
per second. Commands never set its position directly. Atom-wall collision uses
relative wall velocity, restitution, and penetration correction limited to the
current fixed step. Impulse drives rolling wall load, impact glow/flex, events,
and the wall-work ledger.

The displayed response is pressure intuition in a planar toy world, not a
pascal measurement or three-dimensional pressure estimate.

## Determinism and packed state

The random stream, spatial sort, candidate priority, command order, fixed steps,
bond ids, exact-overlap normals, and packed views are deterministic for the
same model version, seed, and command sequence. Cross-version replay is not
implied.

Every Wasm mutation may grow linear memory or replace a packed vector. All
previous pointers and JavaScript typed arrays are invalid after every command;
the adapter must reacquire every view immediately.

## Energy bookkeeping

Internal statistics separately expose:

- kinetic, explicit bond/angle potential, excitation-inclusive total;
- thermostat exchange;
- bond-formation release;
- bond-breaking absorption;
- grab work;
- wall work;
- their signed ledger combination.

The ledgers make interventions explicit; they do not establish global physical
energy conservation for this dissipative, thermostatted, interactive teaching
model.

## Nonclaims and omissions

The model omits electronic structure, charge, charge transfer, orbitals,
resonance, spin, tunneling, quantum behavior, three-dimensional geometry,
solvent, calibrated kinetics, entropy, real pressure, real temperature,
catalysis, and a published reactive parameter set. It cannot validate a real
pathway, product distribution, rate, equilibrium, phase, hazard, synthesis, or
mechanism. Its generic monomer and junction sites do not predict a real
polymerization pathway, conversion, molecular-weight distribution, branching
statistics, gel point, material property, processing condition, or safety.
