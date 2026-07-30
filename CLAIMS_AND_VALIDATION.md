# Claims and validation

## Claims this prototype may make

- It supports direct placement of up to 1000 copies of any one starting
  molecule in a single gesture while staying asynchronous.
- Higher heat control values produce a higher stochastic speed target.
- Attraction, repulsion, collisions, bond stretch, bond formation, bond
  breaking, and wall glow are computed from the current model state.
- Product connectivity is not selected from a reaction table.
- The same clean reset begins from the same deterministic seed.
- A fixed wall contains assigned atoms; moving the wall changes their available
  area and collision pattern.

## Claims this prototype must not make

- that its temperature, pressure, time, energy, or distance equals an SI
  quantity;
- that a displayed pathway, product, equilibrium, rate, or phase is chemically
  correct;
- that 2D geometry represents real molecular stereochemistry;
- that fixed charges model polarization, charge transfer, orbitals, resonance,
  aromaticity, excited states, radicals, spin, tunneling, or catalysis;
- that a qualitative wall glow measures pressure;
- that visual stability establishes numerical accuracy;
- that supporting a molecule template establishes a validated force field for
  it.

## Validation layers

1. **Interface contract:** rendered controls, quantities, input semantics,
   accessibility labels, responsive geometry.
2. **Accounting:** spawning preserves requested molecule and atom counts;
   resetting clears all state; bonds never reference missing atoms.
3. **Numerical stability:** no non-finite positions, velocities, or forces under
   normal and adversarial interaction sequences.
4. **Model validation:** a separately implemented reduced-unit Lennard-Jones box
   must demonstrate force continuity, energy drift, thermostat behavior, and
   reproducibility before quantitative physical claims.
5. **Performance:** measured frame and tick budgets at named atom counts and
   devices.
6. **Public acceptance:** a user explicitly accepts a successor before any
   production replacement or DNS change.

The checked-in successor currently completes the rendered contract build and
server-rendered interaction assertions. Agent-preview infrastructure was not
available in its build environment, so cross-browser gesture and long-duration
numerical validation remain open gates.
