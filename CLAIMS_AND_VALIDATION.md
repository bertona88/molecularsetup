# Claims and validation

## Exact status

The successor targets ABI/model `3/3`: a deterministic Rust engine compiled to
a zero-import WebAssembly module and presented by a static React/Canvas2D
application. It is a dimensionless, planar, reduced pedagogical model, not a
calibrated chemistry predictor.

Source implementation, checked-in Wasm, and manifest are one acceptance unit.
A source-only v3 change with a stale v2 artifact is not a valid candidate.

## Claims v3 may make

- The model explicitly represents H and O atoms and first-class bonds with
  forming, stable, stressed, and breaking states.
- H valence is limited to 1 and O valence to 2; H-H and O-H use order 1 and O-O
  uses order 2.
- Generic M sites have valence 2, generic X junctions have valence 3, and their
  declared M-M/M-X order-1 bonds support linear growth and junctions.
- Grow a chain begins with eight separate M2 monomers and reaches one connected
  16-site chain under the tested deterministic preset.
- Water, Polymers, and Everything are interface/model groupings; unsupported
  H/O-to-M/X and X-X pairs do not acquire invented bonds.
- Exact atom overlaps separate along a deterministic id-derived direction.
- Nonbonded collisions resolve overlap and exchange normal momentum.
- Free atoms can form permitted bonds after favorable activated encounters.
- Stable H2/O2 rearrangement requires sufficient excitation or mechanical
  strain at the tested Ignite setting.
- Spark is a spatially expanding, decaying excitation field rather than a
  product-selection command.
- H-O-H has an explicit planar angular preference.
- The right wall moves toward its target at finite speed; atom-wall impulse
  drives rolling internal load and visible wall response.
- Temperature endpoints differ by at least 5x in measured motion in the named
  native perceptual gate, and oxygen moves visibly at warm/hot settings.
- Formation, breaking, thermostat, grab, and wall energy exchanges are recorded
  in separate internal ledgers.
- No reactant-to-product lookup table, product graph, or special-case water
  rule selects outcomes.
- Identical seed, engine version, and semantic command sequence reproduce
  identical tested packed state.
- The browser consumes versioned packed arrays and does not calculate forces,
  mutate bonds, add thermal noise, or silently substitute another model.

## Claims v3 must not make

- that reduced distance, time, temperature, energy, load, or pressure equals an
  SI quantity;
- that the 1:4 H/O teaching mass ratio is physical;
- that a displayed pathway, topology, product distribution, rate, equilibrium,
  phase, or mechanism is chemically correct;
- that the Ignite outcome validates combustion chemistry;
- that the planar H-O-H preference establishes three-dimensional geometry,
  spectroscopy, or stereochemistry;
- that wall glow is a pressure measurement;
- that explicit valence and pair parameters constitute ReaxFF, quantum
  chemistry, or another validated reactive force field;
- that visual stability alone establishes numerical validity;
- that an ingredient template validates real behavior of that substance.
- that M or X is a chemical element, that M2 represents a named monomer, or
  that the polymer system predicts real conversion, molecular weight,
  branching, gelation, mechanics, processing, synthesis, or safety.

## Correctness layers

1. **Collision and topology invariants:** momentum exchange, exact-overlap
   separation, confinement, unique bond endpoints, and strict valence limits.
2. **Bond behavior:** finite formation, explicit states, strain/excitation
   hysteresis, breaking, H-O-H angular preference, and formation/breaking energy
   accounting.
3. **Activation and scenarios:** Make a bond, Break a bond, ten-second no-spark
   Ignite stability, one-second spark response, eight-second 75% oxygen
   H-O-H topology, 16-site generic chain growth, chain strain under dragging,
   and unscripted system-scoped Free play.
4. **Perceptual numerical gates:** warm/hot oxygen displacement, at least 5x
   endpoint motion difference, and piston response within 500 ms.
5. **Mechanical interaction:** spring grabbing, finite-speed piston, wall
   collision impulse, rolling load under compression, and finite adversarial
   state.
6. **Determinism and accounting:** fixed-step replay, seeded randomness,
   command guards, step cap, and finite internal ledgers.
7. **Wasm boundary:** zero imports, all v3 exports, exact strides, bounded packed
   views, mutation pointer invalidation, replay, invalid input, artifact hash,
   and ABI/model identity.
8. **Browser behavior:** populated first paint, atom drag, spark, temperature
   endpoints, piston drag, system switching, system-scoped experiences and
   ingredients, mobile layout, keyboard access,
   reduced motion, crowded-world adaptive presentation, causal-trace retention,
   and blocked/corrupt engine failure.
9. **Artifact reproducibility:** pinned locked Rust build, source SHA-256, Wasm
   SHA-256/size, byte-identical rebuild, packaged copy, and static entry.

## Independent numerical discipline fixture

The crate retains an isolated reduced-unit Lennard-Jones conformance fixture
covering shifted-force cutoff, periodic boundaries, velocity-Verlet drift and
convergence, and deterministic Langevin calibration. It protects numerical
method discipline only. It does not share the v3 bonding model and does not
validate any visible chemistry claim.

## Evidence boundaries

Native Rust/Wasm rebuilding and heavyweight Chromium tests run on
`devbox-home` or CI. Local TypeScript, lint, manifest-source, and static build
checks do not substitute for those gates. Deployment, hosted verification,
DNS, and public replacement remain separate and require explicit authorization
and live evidence.
