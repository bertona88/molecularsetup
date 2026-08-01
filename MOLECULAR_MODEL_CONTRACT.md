# Molecular model contract

## Status

The active backend is a dependency-free Rust core compiled to WebAssembly. It
is a deterministic, reduced-unit, two-dimensional reactive teaching model. It
is scientifically structured but not calibrated or predictive chemistry.

The model parameterizes atoms and continuous interactions. It contains no
reaction table, product graph, product molecule, or rule of the form
`reactant A + reactant B -> product C`.

## State and starting species

Every atom stores element, position, previous position, velocity, force, fixed
charge, continuous coordination, age, and optional container assignment. The
supported element parameters are H, C, N, O, Na, and Cl.

The starting catalog is H2O, H2, O2, CH4, NH3, CO2, Na+, and Cl-. A starting
template supplies only elements, planar geometry, and initial fixed charges.
It does not create permanent bonds. The force model immediately evaluates that
geometry in exactly the same way as any later configuration.

Rendered bonds are a derived observation of continuous bond order. The
display graph and its visual formation/breaking thresholds never feed back into
energy, forces, or trajectories.

## Coordinates and reduced units

- Coordinate frame: +x right and +y down in a strict plane.
- Distance, time, mass, charge, energy, and temperature are reduced model
  quantities, not SI values.
- Fixed step: `1/120` reduced time units.
- Temperature control `u` is clamped to `[0, 1]` and maps to the model target
  `0.025 * 58^u`.
- Maximum work per animation frame is five fixed steps. Full overrun ticks are
  discarded rather than increasing the timestep.
- Atom capacity is 18,000. A quantity always means complete molecules.

No physical-unit conversion is currently defined. The UI therefore shows heat
through motion and walls through impacts without printing kelvin, pascal,
seconds, or energy values.

## Continuous energy and forces

For the current planar configuration, the conservative part of the model is

`U = sum(U_pair(i,j)) + sum(U_overcoord(i))`.

Each pair term combines:

1. differentiable soft short-range repulsion;
2. damped dispersion-like attraction;
3. a Morse covalent well derived from the two element parameter records;
4. shielded, exponentially screened Coulomb interaction between fixed charges;
5. a C2 switching function whose energy and first derivative reach zero at
   the finite cutoff.

Continuous bond order is a smooth radial function. An atom's coordination is
the sum of its pair bond orders. A smooth over-coordination energy penalizes
exceeding the element's preferred planar valence; its derivative contributes
to every relevant pair force. Radicals and under-coordinated atoms are not
forbidden by an integer valence gate.

Forces are the analytical negative gradient of this one energy, and
acceleration uses `F / mass`. Element-pair parameters are model parameters, not
reaction recipes.

## Integration and thermostat

With thermostat friction set to zero, integration uses velocity Verlet. With
nonzero friction, it uses a BAOAB Langevin split. The Ornstein-Uhlenbeck step is

`v <- c*v + sqrt((1-c^2)*T/m)*N(0,1)`, where `c = exp(-gamma*dt)`.

That stochastic step satisfies the model's fluctuation-dissipation relation.
The engine separately records its kinetic-energy exchange. Spawning, insertion
warmup, wall edits, wall restitution, and emergency finite-state guards are not
conservative operations and are excluded from any NVE conservation claim.

The random stream, queue order, fixed steps, and packed state are deterministic
for the same engine version, seed, and command sequence. Cross-version or
future GPU replay is not implied.

## Spawning and responsiveness

A request for up to 1,000 molecules is queued in O(1) command work and
materialized later in bounded batches of whole molecules. Capacity accounting
includes queued atoms, so truncation cannot create a partial molecule.

New atoms ramp smoothly into pair interactions over a short insertion window.
This is an explicit stability intervention for direct manipulation, not a
physical deposition protocol. It makes the energy function time-dependent
during insertion.

## Boundaries

A boundary is a rectangular planar container. Atoms already inside when it is
created, and atoms later spawned inside, are assigned to it. Wall collisions
constrain penetration and reflect normal velocity with documented restitution.
Per-wall impulse drives the boundary glow and load view.

Moving a wall while paused immediately restores assigned atoms to valid
geometry. The resulting mechanical-energy difference is recorded as external
boundary work. This is an editing convention, not a calibrated piston or a
three-dimensional pressure measurement.

## Current limitations

The v1 potential deliberately omits:

- three-body angular energy and out-of-plane geometry;
- charge equilibration, polarization, charge transfer, and redox;
- orbitals, resonance, aromaticity, electronic excitation, spin, and quantum
  effects;
- a fitted reactive force-field parameter pack;
- physical reaction-time acceleration.

Fixed template charges remain on atoms after connectivity changes. Strict 2D
also makes tetrahedral methane and pyramidal ammonia physically impossible.
Those species remain visual planar ingredients, not stereochemical claims.

Consequently, plausible products, pathways, rates, equilibria, phases, or
catalytic behavior are not validated results. The accurate claim is only:

> No product or reaction table selects outcomes; displayed connectivity follows
> the versioned model state.

## Validation and evolution

Validation is layered: native energy/force and integration tests, real-Wasm ABI
and packed-state tests, browser interaction tests, named performance tests, and
separate public acceptance. A visual result cannot substitute for a numerical
gate.

A future calibrated tier should implement one published, versioned reactive
parameter pack without mixing domains, at a separately measured atom cap.
Relevant foundations include [Tersoff bond order](https://doi.org/10.1103/PhysRevB.37.6991),
[second-generation REBO](https://doi.org/10.1088/0953-8984/14/4/312),
[ReaxFF](https://doi.org/10.1021/jp004368u),
[QTPIE charge transfer](https://doi.org/10.1016/j.cplett.2007.02.065), and
[BAOAB Langevin integration](https://doi.org/10.1063/1.4802990).
