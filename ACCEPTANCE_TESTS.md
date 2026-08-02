# Acceptance tests

## Native Rust gate

- ABI/model constants are exactly `2/2`; reset opens the populated Make a bond
  preset inside a four-wall container.
- A nonbonded atom collision conserves total linear momentum within the named
  tolerance and changes normal velocities.
- Two exactly coincident atoms separate to their contact distance along the
  same id-derived direction for different RNG seeds.
- No atom exceeds H valence 1 or O valence 2 during a crowded, sparked run.
- The Make a bond reference seed produces one stable H-H order-1 bond within
  240 fixed steps (two seconds).
- High heat and spring dragging each break the Break a bond H2 within 360 fixed
  steps (three seconds).
- H-O-H angular energy is lower at 104.5 degrees than at linear or acute
  comparison geometry.
- Ignite begins with 16 H, 8 O, and 12 stable reactant bonds; after 1,200 fixed
  steps without spark it still has no H-O-H oxygen topology or rearrangement.
- A reference spark causes breaking energy inside 120 fixed steps and at least
  6 of 8 oxygen atoms acquire two active O-H bonds by 960 fixed steps.
- Formation release and breaking absorption populate separate ledgers.
- Identical seed and semantic commands reproduce bit-identical tested state.
- A piston target command does not change position immediately; motion is
  finite and visible within 60 fixed steps (500 ms).
- Compression retains every atom inside the current bounds, produces right
  wall load/impact and positive wall work, and remains finite.
- Hot RMS motion is at least five times cold motion after one second.
- Oxygen displacement is visible at Warm and larger at Hot after one second.
- Invalid experiments, ingredients, non-finite sparks/targets, and oversized
  frame deltas fail safely; browser advance remains capped at five steps.
- The independent Lennard-Jones fixture continues to pass its documented
  cutoff, periodic, drift, convergence, and thermostat tolerances.

## Real-Wasm gate

- The release module has zero imports and exports memory plus every v2 command:
  reset, load experiment, play/pause, temperature, spawn ingredient, spark,
  grab, drag, release, piston target, frame advance, and exact fixed stepping.
- Atom stride 16 exposes id, H/O, position/history, velocity, radius,
  excitation, grab, valence, flags, kinetic energy, and age.
- Bond stride 10 exposes stable id, endpoints, order, state, progress, strain,
  energy, rest length, and age.
- Four wall stride-10 records expose edge, position/span, velocity, rolling
  load, impact, target, and the single movable flag.
- Event stride 10 exposes kinds 1–8, endpoints, location, magnitude, age,
  1.2–2 second lifetime, event energy, and wall id.
- Statistics stride 28 agrees with view counts and reports model/ABI `2/2`.
- Every experiment and ingredient id has the exact documented atom/bond count.
- Spark, atom grab/drag/release, and piston targeting mutate their packed views
  as documented.
- A retained pre-mutation typed array does not become the fresh state; all
  pointers/views are reacquired after commands and memory growth.
- Identical commands replay to identical packed atom, bond, wall, event, and
  statistics arrays.
- Invalid ids and non-finite values return failure without corrupting views;
  corrupt Wasm cannot compile.
- The public bytes match manifest SHA-256/size and manifest ABI/model `2/2`.

## Static and browser application gate

- TypeScript typecheck and lint pass without a JavaScript physics, bond,
  thermal-randomness, reaction, or fallback implementation.
- The v2 catalog is exactly H, O, H2, O2, H2O in numeric id order `0..4`.
- The static page presents four modes, one-at-a-time ingredients, hold stream,
  Spark, play/pause, reset, piston cue, and a horizontal Cold/Warm/Hot control.
- It contains no quantity slider, dashboard, inspector, persistent numerical
  readout, reaction recipe, kelvin, or pascal label.
- A Chromium run waits for populated first paint and verifies all four modes.
- Pointer dragging at the reference H position exercises the atom-grab path.
- Ignite spark placement arms, commits locally, disarms, and produces excited
  or breaking summary state.
- Temperature endpoint input reports Cold and Hot semantic values.
- Piston pointer dragging executes without engine failure.
- Space toggles play/pause; `S`/Escape arm/cancel Spark; keyboard ingredient
  activation adds exactly one atom.
- At 390x844 the ingredient tray and heat control remain within the viewport.
- Reduced-motion media preference is observed without removing causal controls.
- Blocked and corrupt Wasm each display an alert, disable commands, and leave an
  inert world.

## Artifact and packaging gate

- Rust uses the pinned toolchain and locked offline dependency graph.
- `engine-artifact.mjs` hashes Cargo inputs, ABI documentation, and all Rust
  sources; manifest source SHA-256 matches.
- A clean Wasm rebuild is byte-identical to the checked-in artifact.
- Static Vite output contains a relative HTML entry, browser assets, favicon,
  verified Wasm and matching manifest, and `.nojekyll`; it contains no server
  or Worker artifact.
- Packaged Wasm bytes and manifest equal the public verified copies.

## Manual interaction matrix before public replacement

1. Test tap, drag, hold stream, cancellation, and secondary touch for all five
   ingredients with mouse, touch, and stylus where supported.
2. Grab each element and bonded atom; drag slowly, quickly, across a wall, and
   while a second pointer begins pinch.
3. Place sparks at center, edge, outside a cluster, and during piston motion;
   verify the wavefront precedes excitation.
4. Sweep Cold to Hot and back while watching both H and O within one second.
5. Pinch and pan before spawning, sparking, grabbing, and piston dragging;
   verify screen-to-world placement.
6. Compress cold, hot, sparse, and crowded worlds; verify finite wall motion,
   confinement, impact response, and input responsiveness.
7. Reset and switch experiments during spark, grab, piston motion, pause, and
   stream insertion; check for stale pointers, timers, captures, and events.
8. Verify bond layering and every state on standard and high-DPI displays.
9. Verify focus order, visible focus, screen-reader summary, and categorical
   heat values.
10. Run a ten-minute hot compressed stability session on named laptop and phone
    hardware and record frame/tick timing.

Deployment, DNS change, hosted checkpoint, and public acceptance are not part
of this implementation gate.
