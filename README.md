# MolecularSetup

## Chemistry-intuition successor

The active greenfield successor lives in [`successor/`](./successor). It is a
bonding-first teaching world built from a deterministic Rust/WebAssembly engine
and a touch-first React/Canvas2D shell.

ABI/model v2 intentionally replaces v1. The screen opens inside a populated
container with four modes—Make a bond, Break a bond, Ignite, Free play—and five
ingredients: H, O, H2, O2, H2O. Collision, activation, excitation, bond
formation/strain/breaking, energy traces, and finite-speed piston response are
visible causal events. There is no persistent numerical dashboard, inspector,
reaction table, product selector, or browser-side physics fallback.

Run the browser shell:

```sh
npm run successor:install
npm run successor:dev
```

Run the checked-in artifact/static gate:

```sh
npm run successor:test
```

Rust/Wasm rebuilds and heavyweight Chromium tests belong on `devbox-home` or
CI. See [`successor/README.md`](./successor/README.md).

The model is explicitly reduced, planar, pedagogical, and non-predictive. It
uses compressed H/O masses and versioned teaching parameters, with no
reactant-to-product lookup or water-production rule. Read
[`VISION.md`](./VISION.md),
[`MOLECULAR_MODEL_CONTRACT.md`](./MOLECULAR_MODEL_CONTRACT.md),
[`INTERFACE_CONTRACT.md`](./INTERFACE_CONTRACT.md),
[`CLAIMS_AND_VALIDATION.md`](./CLAIMS_AND_VALIDATION.md), and
[`ACCEPTANCE_TESTS.md`](./ACCEPTANCE_TESTS.md) before interpreting or extending
it.

## Preserved production prototype

The production snapshot associated with verified release
`20260726T002235Z-478235af2650` remains under `prototype/` as immutable,
reference-only prior art. It is not the architecture to extend. Current public
availability at https://molecularsetup.com/ is external state and must be
verified live.

No deployment, DNS change, or public replacement is implied by successor work.

## Setup Universe

MolecularSetup is one independently deployed Setup Universe workbench. Future
interoperability must use explicit versioned, unit-aware interfaces and preserve
ownership boundaries with OpticalSetup, QuantumSetup, and other setups.

No open-source license has been selected.
