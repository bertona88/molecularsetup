# MolecularSetup chemistry-intuition successor

This directory contains the static React/Canvas2D browser shell and the
deterministic Rust/WebAssembly bonding engine for ABI/model v4.

## Experience

- Water, Photopolymer, and Everything systems in a left rail;
- atom-built acrylic acid, ethylene glycol diacrylate, and hydrogen peroxide
  ingredients with local Light exposure;
- explicit forming, stable, stressed, and breaking bonds drawn above atoms;
- decaying local spark excitation and persistent causal event traces;
- spring atom grabbing, empty-canvas pan, wheel/pinch zoom;
- broad horizontal Cold/Warm/Hot control;
- one four-wall container with a finite-speed right piston;
- no numerical dashboard, inspector, product selector, lesson panel, or
  arbitrary boundary creation.

Rust owns dynamics, bonds, randomness, walls, events, and ledgers. TypeScript
validates packed Wasm views, handles gestures/accessibility/camera, and renders
Canvas2D. There is no JavaScript simulation fallback. Blocked, corrupt, or
wrong-version Wasm leaves an explicit inert world.

## Run local browser shell

```sh
npm ci
npm run dev
```

## Lightweight checks

```sh
npm run typecheck
npm run lint
npm run benchmark:engine
```

## Rust/Wasm and full checks

The checked-in Wasm lets normal static builds run without a Rust installation.
Rebuilding uses the pinned Rust toolchain and `wasm32-unknown-unknown`; perform
that and heavyweight browser testing on `devbox-home` or CI:

```sh
npm run test:engine:native
npm run engine:build
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

`engine:build` compiles locked/offline, runs the real-Wasm ABI test, publishes
the artifact and manifest, verifies source/artifact hashes, and requires zero
imports plus ABI/model `4/4`.

## Claim boundary

The model is dimensionless, planar, reduced, pedagogical, and non-predictive.
Its oxygen and carbon masses are deliberately compressed; its peroxide
cleavage, reactive-site transfer, and vinyl-consumption rules are reduced
teaching behavior; and its bond parameters are not a calibrated force field.
Read `../MOLECULAR_MODEL_CONTRACT.md`,
`engine/ENGINE_ABI.md`, `../CLAIMS_AND_VALIDATION.md`, and
`../ACCEPTANCE_TESTS.md` before changing or presenting behavior.

The application is static. Deployment, DNS, and production replacement are
outside this implementation candidate.
