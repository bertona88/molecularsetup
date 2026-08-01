# MolecularSetup

## Greenfield molecular canvas

The greenfield successor lives in [`successor/`](./successor). It preserves the
nearly textless 2D molecular canvas while replacing browser-side heuristic
physics with a deterministic Rust/WebAssembly engine. It has visual starting
molecules, exact quantities from 1 to 1000, direct drop placement,
temperature-driven motion, continuous state-derived bonding and breaking, and
drawable piston boundaries.

Run it with:

```sh
npm run successor:install
npm run successor:dev
```

Validate the checked-in Wasm artifact and application with:

```sh
npm run successor:test
```

The visible reactive model is explicitly qualitative and pedagogical, not
predictive chemistry. No reaction or product table chooses its outcomes. Read
[`VISION.md`](./VISION.md),
[`MOLECULAR_MODEL_CONTRACT.md`](./MOLECULAR_MODEL_CONTRACT.md),
[`INTERFACE_CONTRACT.md`](./INTERFACE_CONTRACT.md),
[`CLAIMS_AND_VALIDATION.md`](./CLAIMS_AND_VALIDATION.md), and
[`ACCEPTANCE_TESTS.md`](./ACCEPTANCE_TESTS.md) before interpreting or extending
its behavior. The exact completed checks and remaining gates are recorded in
[`VALIDATION_REPORT.md`](./VALIDATION_REPORT.md).

---

> **Preliminary Setup Universe wrapper.** The current demo is temporary; the full simulator is expected to be redesigned and rebuilt substantially from scratch.

- **Live prototype:** https://molecularsetup.com/
- **Prototype release verified:** 2026-07-26 (`20260726T002235Z-478235af2650`); check the URL for current availability
- **Field:** Molecular and materials systems
- **Status:** Greenfield planning wrapper with a preserved prototype snapshot

## Vision

The intended MolecularSetup product is a molecular and materials workbench for structures, force fields, thermodynamic ensembles, reactions, transport, spectroscopy, and coarse-grained or atomistic simulation.

MolecularSetup is part of the **Setup Universe**: independently deployed scientific and systems workbenches intended to become interoperable. Over time, setups should be able to orchestrate or interface with one another through explicit, versioned, unit-aware ports without transferring ownership or copying private implementation state.

**First accepted end-to-end slice:** Build one reduced-unit Lennard–Jones box with a documented force field, ensemble, integrator, timestep, thermostat, and quantitative energy-drift validation.

**Model boundary:** MolecularSetup owns molecular/material state and response; OpticalSetup owns instrument propagation; QuantumSetup owns explicitly quantum evolution; downstream setups consume material properties through versioned ports.

**Claim gate:** The force-field validity domain, ensemble, integrator, timestep, and mapping to physical units must be explicit; no chemical identity, reaction, toxicity, or material-qualification claim is allowed by default.

## Important starting point

Read [AGENTS.md](./AGENTS.md) before planning or implementing work.

The present browser demo should not constrain the next architecture. Before substantial implementation, this repository expects `VISION.md`, `MOLECULAR_MODEL_CONTRACT.md`, `INTERFACE_CONTRACT.md`, `CLAIMS_AND_VALIDATION.md`, and `ACCEPTANCE_TESTS.md`.

## Prototype model boundary

The following describes only the current reference prototype, not the intended simulator.

**Exact current scope:** Particles follow classical reduced-unit dynamics with pairwise Lennard–Jones forces, periodic boundaries, and an optional weak Berendsen thermostat.

**Known limits:**

- The model is two-dimensional and uses reduced units rather than a specific molecule.
- The thermostat rescales velocities gently; it does not reproduce a full canonical ensemble.
- Pair forces are softened at very short range and truncated for real-time stability.

## Current prototype snapshot

`prototype/` preserves the exact shared browser-prototype source associated with production release `20260726T002235Z-478235af2650`. Its recorded deployed-source SHA-256 is `478235af26508aa70aa2af5f0196c9868b92ded1bed88106a9aa1a1cd86f8ba5`.

The snapshot contains all current Setup Universe demos because that release uses one shared, host-routed runtime. It is immutable, reference-only prior art: do not build the new architecture inside it. Moving, archiving, or removing it requires explicit user authorization after an accepted successor and preserved provenance.

To run the snapshot locally:

```sh
npm run prototype:test
npm run prototype:check
npm run prototype:serve
```

Then open http://127.0.0.1:4173/?setup=molecular.

These commands validate only the legacy prototype. The successor has its own
native numerical, real-Wasm, build, and interaction-contract suites.

## Setup Universe

[PicSetup](https://github.com/bertona88/picsetup) · [ElectricalSetup](https://github.com/bertona88/electricalsetup) · [BiologicalSetup](https://github.com/bertona88/biologicalsetup) · [GravitySetup](https://github.com/bertona88/gravitysetup) · [TwoPhotonLithography](https://github.com/bertona88/twophotonlithography) · [EgoSetup](https://github.com/bertona88/egosetup) · [QuantumSetup](https://github.com/bertona88/quantumsetup) · [NoeticSetup](https://github.com/bertona88/noeticsetup) · [ComputationSetup](https://github.com/bertona88/computationsetup) · [LogisticSetup](https://github.com/bertona88/logisticsetup)

OpticalSetup remains in [LucaGenchi/optics-sketch](https://github.com/LucaGenchi/optics-sketch).

## License

No open-source license has been selected yet.
