# Claims and validation

## Exact model status

The visible canvas runs a deterministic Rust engine compiled to a zero-import
WebAssembly module. It is a dimensionless, planar, pedagogical reactive model.
It is more disciplined than an animation heuristic, but it is not a calibrated
chemistry predictor.

## Claims this prototype may make

- A gesture may request 1–1000 complete copies of a starting species; spawning
  is queued in whole molecules and bounded by an 18,000-atom capacity.
- Higher heat-control values set a higher reduced-temperature target and change
  motion through a Langevin thermostat satisfying fluctuation-dissipation for
  the declared model.
- Forces are analytical derivatives of one documented continuous energy.
- Attraction, repulsion, collision, continuous bond order, derived bond
  appearance/breaking, and wall impacts are computed from current state.
- No reaction table or target-product rule selects connectivity or outcomes.
- Identical seed and semantic command sequence reproduce identical packed
  engine state on the tested runtime.
- A fixed rectangle contains atoms assigned to it. Moving a wall changes the
  available area immediately and records a reduced boundary-work ledger.
- The browser consumes versioned packed arrays from Rust/Wasm; it does not
  calculate forces, choose bonds, or add thermal randomness.

## Claims this prototype must not make

- that its temperature, pressure, time, energy, or distance equals an SI
  quantity;
- that a displayed pathway, product, equilibrium, rate, or phase is chemically
  correct;
- that an apparent reaction is evidence of a real-world reaction mechanism;
- that 2D geometry represents real molecular stereochemistry;
- that fixed charges model polarization, charge transfer, orbitals, resonance,
  aromaticity, excited states, radicals, spin, tunneling, or catalysis;
- that a qualitative wall glow measures pressure;
- that fixed-charge pair terms plus an over-coordination penalty constitute
  ReaxFF, quantum chemistry, or a validated reactive force field;
- that visual stability establishes numerical accuracy;
- that supporting a molecule template establishes a validated force field for
  it.

## Validation layers

1. **Model invariants:** analytical-force/finite-difference agreement, Newton's
   third law, cutoff smoothness, deterministic replay, and derived-view
   non-interference.
2. **Integrator behavior:** NVE-like energy behavior and reversibility in the
   declared conservative domain; Langevin Ornstein–Uhlenbeck statistics at
   named seeds and tolerances.
3. **Accounting and guards:** whole-molecule capacity, charge accounting,
   boundary work, impacts, tick caps, invalid inputs, and finite adversarial
   compression.
4. **Independent numerical acceptance:** a reduced-unit Lennard-Jones fixture
   validates shifted-force evaluation, periodic boundaries, velocity-Verlet
   drift/convergence, and deterministic thermostat calibration. It does not
   validate the visible chemistry model.
5. **Wasm boundary:** zero imports, exported memory, frozen ABI/model versions,
   packed-view validity, capacity, pause semantics, and deterministic command
   replay are tested against the real compiled artifact.
6. **Presentation contract:** build, rendered controls, exact species ids,
   pointer-cancel behavior, slider semantics, and absence of browser-side
   dynamics are regression-tested.
7. **Performance and public acceptance:** named-device browser measurements,
   long-duration runs, deployment, and explicit replacement approval remain
   separate gates.

The current automated suite exercises native Rust, the real Wasm artifact, and
the built application. Cross-browser gesture testing, named-device frame-rate
measurements, and a long-duration hot/compressed run remain open; no deployment
or DNS change is part of this branch.
