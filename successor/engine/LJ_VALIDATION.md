# Independent Lennard–Jones validation fixture

This native-only fixture is the quantitative scientific acceptance slice. It
is intentionally independent of the qualitative reactive UI model and does not
expand the frozen C/Wasm ABI. Passing it does not calibrate or validate the UI
model as predictive chemistry.

## Defined model

- Dimensions: two, with a square periodic box of side `L = 6.4`.
- Particle count: 16 equal-mass particles on a deterministic `4 × 4` lattice.
- Reduced parameters: `m = 1`, `sigma = 1`, `epsilon = 1`.
- Cutoff: `r_c = 2.5 sigma`, using minimum-image displacements.
- Initial velocities: deterministic Gaussian values, zero center-of-mass
  velocity, rescaled to the named reduced temperature.

For `r < r_c`, the shifted-force potential is

```text
u(r)    = 4 epsilon [(sigma/r)^12 - (sigma/r)^6]
u_sf(r) = u(r) - u(r_c) - (r-r_c) u'(r_c)
```

For `r >= r_c`, both `u_sf` and its force are zero. This makes energy and force
continuous at the cutoff. NVE uses velocity-Verlet. Canonical validation uses
BAOAB and the exact Ornstein–Uhlenbeck update
`c = exp(-gamma dt)`, `sigma_v = sqrt((1-c^2) T/m)` independently per velocity
component.

## Checked tolerances

`cargo test` enforces all of the following in native `f64` arithmetic:

- at `r_c - 1e-6`, absolute shifted energy `< 1e-11` and absolute radial
  derivative `< 2e-7`;
- over 20,000 NVE steps at `dt = 0.0025`, maximum absolute energy departure
  divided by `|K_0| + |U_0|` is `< 1e-3`;
- at elapsed time `0.5`, the position RMS error for `dt = 0.002` is `< 0.32`
  times the `dt = 0.004` error against a `dt = 0.0005` reference, and is also
  `< 2e-5`;
- BAOAB at `dt = 0.004`, `gamma = 1.5`, and target `T = 0.70`, after 10,000
  burn-in steps and over 30,000 samples, has relative mean kinetic-temperature
  error `< 6%` and replays bit-for-bit from the same seed.

These are regression tolerances for this named fixture and toolchain, not
uncertainty bounds or mappings to SI units.
