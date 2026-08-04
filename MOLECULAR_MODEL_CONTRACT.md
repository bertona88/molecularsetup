# Molecular model contract

## Status and validity domain

The active backend is a dependency-free Rust core compiled to WebAssembly. ABI
and model versions are both `4`. It is a deterministic, reduced-unit,
two-dimensional, pedagogical bonding model. It is non-predictive chemistry.

The model contains no reaction lookup, product graph, desired-product term, or
rule of the form `reactants -> water`. Experiment and ingredient templates set
only initial atoms, positions, velocities, and explicit starting bonds. Every
later connectivity change uses the same collision, valence, activation,
formation, strain, and breaking rules.

## State

Each site stores a stable id, H/O/C element id, current and previous position,
velocity, force, age, excitation, and finite-state flags. Photopolymer flags
distinguish peroxide initiator oxygens, unconsumed vinyl carbons, and transient
reactive sites. A single optional
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

ABI v4 ingredient ids are:

| Id | Ingredient | Initial bonds |
|---:|---|---|
| 0 | H | none |
| 1 | O | none |
| 2 | H2 | one stable H-H order-1 bond |
| 3 | O2 | one stable O-O order-2 bond |
| 4 | H2O | two stable O-H order-1 bonds |
| 5 | acrylic acid, C3H4O2 | atom-built template with one vinyl C=C and one carbonyl C=O |
| 6 | ethylene glycol diacrylate, C8H10O4 | atom-built template with two vinyl C=C groups |
| 7 | hydrogen peroxide, H2O2 | atom-built H-O-O-H initiator template |

Hydrogen has valence capacity 1, oxygen 2, and carbon 4. A bond reserves its
full integer order while forming, stable, stressed, or breaking. A local
reactive-site addition atomically lowers one declared vinyl C=C from order 2
to order 1 before reserving the new order-1 bond, so transient state does not
overfill carbon valence.

H-H, O-O, O-H, C-C, C-H, and C-O bonds have versioned order-specific values
for rest length, capture distance, spring stiffness, damping, activation
barrier, formation time, dissociation energy, strain hysteresis, and excitation
threshold. These are teaching parameters, not fitted bond energies or a
published reactive force field.

Water experiments are ids 0–3: Make a bond, Break a bond, Ignite, and Free
play. Photopolymer experiments are ids 4–6: Expose resin, Stretch cured, and
Free play. Id 7 is the Everything sandbox. The system boundary is a grouping
of ingredients and starting conditions; the engine continues to apply local
element, bond-order, flag, collision, and valence rules.

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
- Carbon mass: 3 reduced units.

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

In the Photopolymer system the same local command is presented as Light. Only
the tagged peroxide O-O bond uses the low photo-cleavage threshold; other
template bonds do not break merely from that exposure. When the O-O bond
finishes breaking, its two oxygens become transient reactive sites. A reactive
O or C site may form one order-1 bond with a locally encountered vinyl carbon.
The planar radical-vinyl contact shell extends 14 reduced units beyond the
rendered atom radii and remains bounded by the pair capture distance; this
accounts explicitly for attached atoms screening the carbon center in two
dimensions. Starting that bond changes the vinyl C=C to C-C and transfers the
reactive flag to its partner carbon. Two reactive carbons may terminate by
forming one order-1 C-C bond and clearing both flags. Connectivity still
requires activation, inward relative motion, valence capacity, and a local
favorable encounter; exposure does not install a product graph.

Stable H2/O2 bonds do not rearrange at the Ignite preset's initial heat.
Sufficient excitation or mechanical strain moves a bond through stress and
breaking hysteresis. For free atoms with available valence, excitation above
the pair barrier can be converted into bounded inward encounter motion. That
steering conserves pair momentum, consumes excitation when it raises kinetic
energy, and never creates connectivity by itself: the pair must still collide
or reach its declared contact shell while moving inward before a bond can begin
forming.

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

- the pair is H-H, O-O, or O-H under the Water rules, or is a declared local
  reactive-site/vinyl or reactive-carbon termination pair;
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
mechanism. Its acrylic acid, ethylene glycol diacrylate, and hydrogen peroxide
templates state atom identity and initial topology only. They do not predict a
real polymerization pathway, conversion, molecular-weight distribution,
branching statistics, gel point, material property, processing condition,
exposure dose, wavelength response, formulation, hazard, or safety.
