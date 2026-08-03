# Validation report

## Current multi-system polymerization candidate

Date: 2026-08-03

Candidate: uncommitted `main` working tree based on
`24acc95bac4f4ad708f445c429ecc3f1692f7e40`

The candidate introduces ABI/model `3/3` and the Water, Polymers, and
Everything system boundary. Water retains the v2 experiences and ids. Polymers
adds generic two-ended M2 monomers, generic three-way X junctions, Grow a
chain, Stretch a chain, and Free play. Everything exposes both ingredient
families without inventing H/O-to-M/X or X-X bonds. The interface adds a
system rail and system-scoped experiences/ingredients; it does not add a lesson
or explanation panel.

Evidence recorded in this run:

| Check | Result |
|---|---|
| Native Rust model and LJ fixture on `devbox-home` | 24 passed, 0 failed; doc tests 0 failed |
| Fresh release Wasm ABI smoke | 4 passed, 0 failed; pre-publish identity check intentionally skipped |
| Full verified application build and Node tests | 10 passed, 0 failed |
| Playwright Chromium on `devbox-home` | 9 passed, 0 failed |
| TypeScript typecheck and ESLint | passed |
| Desktop and 390x844 visual browser QA | system/experience rails, polymer formation, system ingredients, and mobile controls remained legible; no browser warnings/errors |

The Grow a chain native gate begins with eight separate M2 monomers and forms
one connected 16-site/15-bond chain within 120 fixed steps. The browser gate
observes the same 15-bond outcome. The Stretch a chain native and browser gates
verify that a direct spring pull makes bond stress, breaking, or bond loss
visible. Polymer Free play accepts M2 and X, all site valences remain bounded,
and Everything contains both H/O and M/X families.

The rebuilt zero-import artifact is
`successor/public/engine/molecularsetup_engine.wasm`: 128,387 bytes, Wasm
SHA-256 `75c8140506f8c5ffd722b2a131bf60361e0db167ba0999f6cdec29a526322ee1`,
engine-source SHA-256
`309060faa1f4bcd5219f3289ce970cbd5f88eb49a897f6d4d9d89a8b1d6b668f`, and
manifest ABI/model `3/3`.

`prototype/` and the pre-existing root `.sites-runtime/` were not modified. No
commit, push, deployment, DNS change, hosted checkpoint, or production
replacement was performed. Public behavior remains whatever is currently
deployed and was not used as acceptance evidence for this local candidate.

## Prior performance candidate record

Date: 2026-08-03

Candidate: uncommitted `main` working tree based on
`2f3e2d3c2d1ca911d15ebeae9011dce2d253fbc8`

Remote base: `origin/main` at the same revision

## Result

The local performance candidate preserves chemistry-intuition ABI/model `2/2`
and exact packed-state replay while reducing crowded Canvas2D and engine cost.
It caches the static field and atom sprites, quantizes only presentation glow,
samples repetitive impact rings above a visual budget, removes stable-bond
blur, adapts Canvas backing resolution, bounds passive crowded redraw cadence,
reuses engine neighbor/angular scratch storage, and changes the bounded event
queue from shifting storage to constant-time FIFO eviction.

`prototype/` and the pre-existing untracked `.sites-runtime/` remain unchanged.
At the time these pre-release checks were recorded, no commit, push,
deployment, DNS change, hosted checkpoint, or production replacement had been
performed. Subsequent promotion evidence belongs to the final Git revision,
GitHub Actions run, and live-site verification rather than this candidate
report.

## Reproducible checks

| Check | Result |
|---|---|
| Remote/base identity | local `main` and local `origin/main` resolve to the same full SHA |
| Native Rust model and LJ fixture | 22 passed, 0 failed; doc tests 0 failed |
| Fresh release Wasm ABI smoke | 4 passed, 0 failed; pre-publish identity check intentionally skipped |
| Full verified application build and Node tests | 10 passed, 0 failed |
| TypeScript typecheck | passed |
| ESLint | passed |
| Static Vite build and packaged-artifact verification | passed |
| Clean-target Rust 1.74.0 locked/offline Wasm rebuild | byte-identical |
| Playwright Chromium | 7 passed, 0 failed, including crowded presentation |
| Old/new packed replay comparison | four normal/crowded scenarios bit-identical |
| Visual browser QA | crowded atoms/bonds and Ignite spark/excitation remained legible |

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

An independent old/new replay compared the packed atom, bond, wall, event, and
statistics bytes after mixed Free play, full Ignite spark, 309-atom crowding,
and a 909-atom/4,096-event overflow run. All four SHA-256 snapshots matched
exactly, including the overflow queue case.

## Performance evidence

The repeatable `npm run benchmark:engine` harness measures browser-style Wasm
advance plus packed-view refresh on this Mac. Median milliseconds per simulated
60 Hz frame were:

| Added H2O | Atoms | Before | After | Change |
|---:|---:|---:|---:|---:|
| 10 | 39 | 0.0302 ms | 0.0293 ms | 1.03x faster |
| 30 | 99 | 0.0922 ms | 0.0907 ms | 1.02x faster |
| 100 | 309 | 0.4135 ms | 0.3798 ms | 1.09x faster |
| 300 | 909 | 9.5136 ms | 6.0248 ms | 1.58x faster |

The controlled Chromium comparison used a 1280x720 viewport at device scale 2
and measured complete application animation callbacks over 2.4 seconds. With
ten H2O additions (32 total atoms), callback throughput rose from about 24/s to
60/s, p95 callback work fell from 3.1 ms to 1.0 ms, and backing ratio adapted
from 1.75 to 1.25. At 302 atoms, the final passive-crowd cadence produced about
45 callbacks/s versus 7/s before, with p95 work 6.6 ms versus 31.2 ms; raster
presentation is intentionally bounded to 30 Hz there while physics/input
continues on the animation loop. These are headless-devbox measurements, not a
claim about every device.

## Engine artifact

| Property | Value |
|---|---|
| Path | `successor/public/engine/molecularsetup_engine.wasm` |
| Size | 126,694 bytes |
| Wasm SHA-256 | `5f5e99cddea26d094a90302788711a511247c2fd9352711b24e2e04177687914` |
| Engine-source SHA-256 | `96fce46e7d05181eed4762e64b9a0b16c54755fe920b17839d07a5d58d352b23` |
| Imports | zero |
| ABI/model versions | 2 / 2 |

A rebuild from an empty Cargo target directory produced the same byte count
and SHA-256 before republishing. The manifest source digest covers Cargo inputs,
the ABI document, and all Rust sources.

## Static application artifact

The verified production build emits a relative `dist/index.html`, a 226.33 kB
browser JavaScript bundle, an 11.78 kB stylesheet, `.nojekyll`, and the exact
verified Wasm/manifest pair under `dist/engine/`. It emits no server or Worker
artifact.

## Formatting evidence boundary

Rust 1.74 `rustfmt` was installed on `devbox-home`, but `cargo fmt --check`
reported repository-wide formatting differences across the existing crate.
No bulk formatter rewrite was applied, and formatting is not reported as a
passing gate. Compilation, native tests, clean Wasm rebuild, ABI tests, and
packed replay all passed against the source in this candidate.

## Remaining manual gates at candidate validation time

- Cross-browser mouse, touch, and stylus interaction on named hardware.
- High-DPI bond layering and screen-reader verification.
- Frame/tick measurements on named target laptop and phone hardware.
- The ten-minute hot, compressed stability session.
- Hosted checkpoint, live production verification, deployment, and DNS review.
