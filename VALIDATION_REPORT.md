# Validation report

Date: 2026-08-02

Branch: `agent/chemistry-intuition-v2`

Base: `origin/main` at `d364a1ce75832ca5d6c7af1e4d2f16ef6ec798ae`

## Result

The local feature-branch candidate implements the intentionally breaking
chemistry-intuition ABI/model `2/2`. The Rust core, real Wasm module, adapter,
Canvas2D presentation, interaction shell, documentation, artifact verifier,
and automated gates agree on the v2 model. No commit, push, deployment, DNS
change, hosted checkpoint, or production replacement was performed.

`prototype/` remains unchanged. The repository contained no `.sites-runtime/`
directory, and none was created.

## Reproducible checks

| Check | Result |
|---|---|
| Remote/base identity | local branch starts at current fetched `origin/main` |
| Native Rust model and LJ fixture | 21 passed, 0 failed; doc tests 0 failed |
| Fresh release Wasm ABI smoke | 3 passed, 0 failed; pre-publish identity check intentionally skipped |
| Full verified application build and Node tests | 9 passed, 0 failed |
| TypeScript typecheck | passed |
| ESLint | passed |
| Static Vite build and packaged-artifact verification | passed |
| Clean-target Rust 1.74.0 locked/offline Wasm rebuild | byte-identical |
| Playwright test discovery | 6 Chromium tests found |

The native suite covers collision momentum, deterministic exact-overlap
separation, valence limits, finite formation and hysteretic breaking, H-O-H
angular preference, activation gating, separate formation/breaking ledgers,
deterministic replay, finite piston movement, confinement, rolling load under
compression, command guards, oxygen visibility, and the five-fold temperature
motion gate. The independent Lennard-Jones fixture remains green for its
cutoff, periodic drift, convergence, and thermostat checks.

The scenario gates pass for the reference seeds:

- Make a bond reaches stable H2 inside two seconds.
- Break a bond breaks H2 by high heat or spring dragging inside three seconds.
- Ignite keeps 8 H2 and 4 O2 unchanged for ten seconds without a spark.
- A spark records breaking absorption inside one second and gives at least 6
  of 8 oxygen atoms two active O-H bonds by eight seconds.

The checked-in real-Wasm test exercises every v2 command and packed view,
memory/view invalidation, deterministic replay, all experiment and ingredient
ids, invalid values, corrupt modules, zero imports, and artifact identity.

## Engine artifact

| Property | Value |
|---|---|
| Path | `successor/public/engine/molecularsetup_engine.wasm` |
| Size | 125,785 bytes |
| Wasm SHA-256 | `f4a62b609bd266251e4f598067e24759562fc54862fcf0483eb7204cd3d17a70` |
| Engine-source SHA-256 | `1e9912d9f554e067ecab2387a1462e2de97ee0f2a35c96698f23952ca6628780` |
| Imports | zero |
| ABI/model versions | 2 / 2 |

A rebuild from an empty Cargo target directory produced the same byte count
and SHA-256 before republishing. The manifest source digest covers Cargo inputs,
the ABI document, and all Rust sources.

## Static application artifact

The verified production build emits a relative `dist/index.html`, a 223.52 kB
browser JavaScript bundle, an 11.78 kB stylesheet, `.nojekyll`, and the exact
verified Wasm/manifest pair under `dist/engine/`. It emits no server or Worker
artifact.

## Browser-runner limitation

The six Playwright cases cover populated first paint, atom dragging, spark
placement, Cold/Hot endpoints, piston dragging, keyboard controls, mobile
layout, reduced motion, and blocked/corrupt Wasm. This sandbox could discover
the tests but could not execute a page: its proxy returned empty archives for
the official Playwright Chromium download, and a temporary npm-packaged
Chromium exited with `SIGTRAP` before launch. The Pages workflow installs the
official Playwright browser and runs this suite on GitHub CI.

The pinned Rust 1.74 `rustfmt` binary likewise crashes during sandbox stack
probing; the same sources compile and pass native and Wasm tests. Neither
runner failure indicates an application assertion failure.

## Remaining manual gates

- Cross-browser mouse, touch, and stylus interaction on named hardware.
- High-DPI bond layering and screen-reader verification.
- Frame/tick measurements on the target laptop and phone.
- The ten-minute hot, compressed stability session.
- Hosted checkpoint, live production verification, deployment, and DNS review.
