# MolecularSetup canvas successor

This directory contains the greenfield browser prototype described by the
repository contracts at the project root.

## What is implemented

- full-viewport 2D canvas;
- eight visual starting species;
- logarithmic quantity selection from 1 to 1000 molecules;
- tap and drag spawning with bounded per-frame insertion;
- fixed-step stochastic particle motion;
- state-derived pair forces, charges, valence limits, bonds, and breaks;
- drawable rectangular boundaries and draggable piston walls;
- temperature, pause, hold-to-reset, pan, wheel zoom, and pinch zoom;
- responsive touch-first tray and accessible control labels.

The reference numerical backend is embedded in `app/page.tsx` for this vertical
slice. It is intentionally isolated behind browser interaction semantics that
can be moved to a Rust/Wasm backend without preserving this heuristic model's
outcomes.

## Run

```sh
npm install
npm run dev
```

## Validate

```sh
npm run lint
npm test
```

`npm test` builds the Cloudflare Worker-compatible artifact and checks the
server-rendered interaction contract.

## Model status

This is a qualitative 2D pedagogical model, not predictive chemistry. Read
`../MOLECULAR_MODEL_CONTRACT.md` and `../CLAIMS_AND_VALIDATION.md` before
changing model behavior or presenting results.
