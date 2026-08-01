# MolecularSetup Rust/Wasm canvas successor

This directory contains the greenfield browser prototype described by the
repository contracts at the project root.

## What is implemented

- full-viewport 2D canvas;
- eight visual starting species;
- detented nonlinear quantity selection from 1 to 1000 molecules, with every
  integer available through native input and keyboard controls;
- tap and drag spawning with bounded per-frame insertion;
- a dependency-free Rust engine compiled to a zero-import WebAssembly module;
- fixed-step velocity-Verlet or BAOAB Langevin integration;
- continuous energy-derived pair forces and over-coordination cost;
- fixed charges and continuous state-derived bond order, with no reaction or
  product lookup table;
- drawable rectangular boundaries and draggable piston walls;
- temperature, pause, hold-to-reset, pan, wheel zoom, and pinch zoom;
- responsive touch-first tray and accessible control labels.

Rust owns particles, forces, randomness, integration, boundaries, accounting,
and derived bond/event views. `src/App.tsx` is a presentation and gesture shell;
`lib/molecular-world.ts` validates the ABI and consumes packed typed arrays. No
JavaScript physics fallback exists.

The application is completely static. Vite emits `dist/index.html`, browser
assets, and the checked-in Wasm module. There is no Worker, server-rendering
runtime, API route, database, object storage, or remote simulation service.

## Run

```sh
npm ci
npm run dev
```

## Validate

```sh
npm run lint
npm test
```

The verified Wasm artifact is checked in, so normal development and application
builds do not require Rust. Rebuilds use the repository-pinned Rust 1.74.0
toolchain and `wasm32-unknown-unknown` target, then run:

```sh
npm run test:engine:native
npm run engine:build
```

`npm test` verifies source/artifact consistency, builds the static application,
and tests the HTML entry, interaction contract, real Wasm ABI, deterministic
replay, and browser/engine architecture boundary.

## GitHub Pages

The repository workflow builds and tests pull requests. A push to `main` also
uploads `dist/` and deploys it through the protected `github-pages`
environment. Asset paths are relative, so the same artifact works at the
repository Pages path and later at `molecularsetup.com`.

GitHub Pages must use **GitHub Actions** as its publishing source. A custom
domain and DNS cutover are deliberately not encoded in this branch.

## Model status

This is a qualitative 2D pedagogical model, not predictive chemistry. Its
starting structures are atom/geometry/charge presets; later motion and
connectivity follow the continuous model without product recipes. Read
`../MOLECULAR_MODEL_CONTRACT.md`, `engine/ENGINE_ABI.md`, and
`../CLAIMS_AND_VALIDATION.md` before changing or presenting it.
