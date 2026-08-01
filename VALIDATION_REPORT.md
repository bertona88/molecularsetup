# Validation report

Date: 2026-08-01

Branch: `agent/rust-wasm-reactive-canvas`

Base: `agent/sites-emergent-canvas`

## Result

The Rust/Wasm engine, application integration, and packaged artifact pass their
current automated gates. No deployment or DNS change was performed.

## Reproducible checks

| Check | Result |
|---|---|
| Native Rust model and LJ fixture | 19 passed, 0 failed; doc tests 0 failed |
| Real compiled Wasm ABI smoke | 1 passed, 0 failed |
| Rendered application contract | 2 passed, 0 failed |
| Source architecture and gesture regressions | 2 passed, 0 failed |
| Full `npm test` without Rust on `PATH` | 5 passed, 0 failed |
| Lint | passed |
| Application build and packaged-artifact verification | passed |
| Clean-target locked/offline Wasm rebuild | passed; byte-identical hash |
| `git diff --check` | passed |

The native suite covers the analytical force gradient, Newton's third law,
cutoff continuity, deterministic replay, molecule/atom/charge accounting,
derived-view non-interference, thermostat statistics, conservative-domain
energy behavior and reversibility, paused wall work, wall loads/events,
adversarial compression, command guards, the five-tick cap, and a 5,000-atom
uniform-grid path.

The independent Lennard–Jones fixture covers shifted-force cutoff continuity,
20,000-step periodic NVE drift, second-order velocity-Verlet convergence, and
deterministic BAOAB temperature calibration. Its measured maximum normalized
NVE departure was `9.489e-4` against the declared `< 1e-3` gate. See
[`successor/engine/LJ_VALIDATION.md`](./successor/engine/LJ_VALIDATION.md) for
the complete model and tolerances.

## Engine artifact

| Property | Value |
|---|---|
| Path | `successor/public/engine/molecularsetup_engine.wasm` |
| Size | 76,485 bytes |
| Wasm SHA-256 | `c749f04e9b45b9eecb2de2dc476ba106daaa075d3574be711b4e8ca1983a4edb` |
| Engine-source SHA-256 | `ee99b8d7613874055d335f9f0e410aeabcf2674d80728a769dcd24ad22f00d68` |
| Imports | zero |
| ABI/model versions | 1 / 1 |

The build verifies that the public artifact, manifest, engine source, and
packaged application copy agree. A rebuild from an empty Cargo target directory
produced the same Wasm hash.

## Supplementary integration smoke

A direct adapter smoke used the real Wasm module to exercise queued pre-load
temperature, pause, spawn, and boundary commands; ABI/view validation; canvas
rendering; paused wall editing; resume/advance; removal; and reset. A separate
memory-growth run materialized 1,000 methane templates as 5,000 atoms in five
batches while refreshing packed views after every mutation.

## Open gates

- The visible reduced model is not calibrated or validated as predictive
  chemistry; apparent products, pathways, rates, equilibria, and phases remain
  nonclaims.
- Cross-browser mouse/touch/stylus gesture testing is not complete.
- Frame-rate targets have not been measured on named laptop and phone hardware.
- The ten-minute hot, compressed browser run remains open.
- No hosted checkpoint, public replacement, or DNS verification was attempted.
