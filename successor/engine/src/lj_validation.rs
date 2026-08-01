//! Independent reduced-unit Lennard-Jones conformance fixture.
//!
//! This native-test-only model deliberately shares no potential or integrator
//! implementation with the qualitative UI world. See `LJ_VALIDATION.md`.

const SIGMA: f64 = 1.0;
const EPSILON: f64 = 1.0;
const MASS: f64 = 1.0;
const CUTOFF: f64 = 2.5;
const BOX_LENGTH: f64 = 6.4;

#[derive(Clone, Debug)]
struct ValidationRng {
    state: u64,
    spare: Option<f64>,
}

impl ValidationRng {
    fn new(seed: u64) -> Self {
        Self {
            state: seed.max(1),
            spare: None,
        }
    }

    fn uniform(&mut self) -> f64 {
        let mut x = self.state;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.state = x;
        let bits = x.wrapping_mul(0x2545_f491_4f6c_dd1d);
        ((bits >> 11) as f64) * (1.0 / 9_007_199_254_740_992.0)
    }

    fn normal(&mut self) -> f64 {
        if let Some(value) = self.spare.take() {
            return value;
        }
        let radius = (-2.0 * self.uniform().max(f64::MIN_POSITIVE).ln()).sqrt();
        let angle = core::f64::consts::TAU * self.uniform();
        self.spare = Some(radius * angle.sin());
        radius * angle.cos()
    }
}

#[inline]
fn lj_unshifted(r: f64) -> (f64, f64) {
    let sr = SIGMA / r;
    let sr2 = sr * sr;
    let sr6 = sr2 * sr2 * sr2;
    let sr12 = sr6 * sr6;
    let energy = 4.0 * EPSILON * (sr12 - sr6);
    let derivative = 24.0 * EPSILON * (sr6 - 2.0 * sr12) / r;
    (energy, derivative)
}

/// Shifted-force LJ potential and its exact radial derivative.
#[inline]
fn lj_shifted_force(r: f64) -> (f64, f64) {
    if r >= CUTOFF {
        return (0.0, 0.0);
    }
    let (energy, derivative) = lj_unshifted(r);
    let (cutoff_energy, cutoff_derivative) = lj_unshifted(CUTOFF);
    (
        energy - cutoff_energy - (r - CUTOFF) * cutoff_derivative,
        derivative - cutoff_derivative,
    )
}

#[inline]
fn minimum_image(delta: f64) -> f64 {
    delta - BOX_LENGTH * (delta / BOX_LENGTH).round()
}

#[derive(Clone, Debug)]
struct LjSystem {
    position: Vec<[f64; 2]>,
    velocity: Vec<[f64; 2]>,
    force: Vec<[f64; 2]>,
    potential: f64,
    rng: ValidationRng,
}

impl LjSystem {
    fn lattice(seed: u64, temperature: f64) -> Self {
        let mut rng = ValidationRng::new(seed);
        let mut position = Vec::with_capacity(16);
        let mut velocity = Vec::with_capacity(16);
        for y in 0..4 {
            for x in 0..4 {
                position.push([
                    (x as f64 + 0.5) * BOX_LENGTH / 4.0,
                    (y as f64 + 0.5) * BOX_LENGTH / 4.0,
                ]);
                velocity.push([rng.normal(), rng.normal()]);
            }
        }
        let count = velocity.len() as f64;
        let mean_x = velocity.iter().map(|v| v[0]).sum::<f64>() / count;
        let mean_y = velocity.iter().map(|v| v[1]).sum::<f64>() / count;
        for velocity in &mut velocity {
            velocity[0] -= mean_x;
            velocity[1] -= mean_y;
        }
        let kinetic = velocity
            .iter()
            .map(|v| 0.5 * MASS * (v[0] * v[0] + v[1] * v[1]))
            .sum::<f64>();
        let desired = (count - 1.0) * temperature;
        let scale = (desired / kinetic).sqrt();
        for velocity in &mut velocity {
            velocity[0] *= scale;
            velocity[1] *= scale;
        }
        let mut system = Self {
            force: vec![[0.0; 2]; position.len()],
            position,
            velocity,
            potential: 0.0,
            rng,
        };
        system.compute_forces();
        system
    }

    fn compute_forces(&mut self) {
        self.force.fill([0.0; 2]);
        self.potential = 0.0;
        for i in 0..self.position.len() {
            for j in (i + 1)..self.position.len() {
                let dx = minimum_image(self.position[j][0] - self.position[i][0]);
                let dy = minimum_image(self.position[j][1] - self.position[i][1]);
                let r2 = dx * dx + dy * dy;
                if r2 >= CUTOFF * CUTOFF {
                    continue;
                }
                assert!(r2 > 1.0e-12, "LJ validation fixture overlapped");
                let r = r2.sqrt();
                let (energy, derivative) = lj_shifted_force(r);
                let fx = derivative * dx / r;
                let fy = derivative * dy / r;
                self.potential += energy;
                self.force[i][0] += fx;
                self.force[i][1] += fy;
                self.force[j][0] -= fx;
                self.force[j][1] -= fy;
            }
        }
    }

    fn kinetic(&self) -> f64 {
        self.velocity
            .iter()
            .map(|v| 0.5 * MASS * (v[0] * v[0] + v[1] * v[1]))
            .sum()
    }

    fn energy(&self) -> f64 {
        self.kinetic() + self.potential
    }

    fn velocity_verlet(&mut self, dt: f64) {
        for i in 0..self.position.len() {
            self.velocity[i][0] += 0.5 * dt * self.force[i][0] / MASS;
            self.velocity[i][1] += 0.5 * dt * self.force[i][1] / MASS;
            self.position[i][0] =
                (self.position[i][0] + dt * self.velocity[i][0]).rem_euclid(BOX_LENGTH);
            self.position[i][1] =
                (self.position[i][1] + dt * self.velocity[i][1]).rem_euclid(BOX_LENGTH);
        }
        self.compute_forces();
        for i in 0..self.position.len() {
            self.velocity[i][0] += 0.5 * dt * self.force[i][0] / MASS;
            self.velocity[i][1] += 0.5 * dt * self.force[i][1] / MASS;
        }
    }

    fn baoab(&mut self, dt: f64, gamma: f64, temperature: f64) {
        let c = (-gamma * dt).exp();
        let sigma = ((1.0 - c * c) * temperature / MASS).sqrt();
        for i in 0..self.position.len() {
            self.velocity[i][0] += 0.5 * dt * self.force[i][0] / MASS;
            self.velocity[i][1] += 0.5 * dt * self.force[i][1] / MASS;
            self.position[i][0] =
                (self.position[i][0] + 0.5 * dt * self.velocity[i][0]).rem_euclid(BOX_LENGTH);
            self.position[i][1] =
                (self.position[i][1] + 0.5 * dt * self.velocity[i][1]).rem_euclid(BOX_LENGTH);
            self.velocity[i][0] = c * self.velocity[i][0] + sigma * self.rng.normal();
            self.velocity[i][1] = c * self.velocity[i][1] + sigma * self.rng.normal();
            self.position[i][0] =
                (self.position[i][0] + 0.5 * dt * self.velocity[i][0]).rem_euclid(BOX_LENGTH);
            self.position[i][1] =
                (self.position[i][1] + 0.5 * dt * self.velocity[i][1]).rem_euclid(BOX_LENGTH);
        }
        self.compute_forces();
        for i in 0..self.position.len() {
            self.velocity[i][0] += 0.5 * dt * self.force[i][0] / MASS;
            self.velocity[i][1] += 0.5 * dt * self.force[i][1] / MASS;
        }
    }
}

fn periodic_rms(left: &LjSystem, right: &LjSystem) -> f64 {
    let sum = left
        .position
        .iter()
        .zip(&right.position)
        .map(|(a, b)| {
            let dx = minimum_image(a[0] - b[0]);
            let dy = minimum_image(a[1] - b[1]);
            dx * dx + dy * dy
        })
        .sum::<f64>();
    (sum / left.position.len() as f64).sqrt()
}

#[test]
fn shifted_force_cutoff_is_c1_continuous() {
    let (outside_energy, outside_derivative) = lj_shifted_force(CUTOFF);
    assert_eq!(outside_energy, 0.0);
    assert_eq!(outside_derivative, 0.0);
    let (inside_energy, inside_derivative) = lj_shifted_force(CUTOFF - 1.0e-6);
    assert!(inside_energy.abs() < 1.0e-11, "energy={inside_energy}");
    assert!(inside_derivative.abs() < 2.0e-7, "derivative={inside_derivative}");
}

#[test]
fn periodic_velocity_verlet_nve_drift_is_bounded() {
    let mut system = LjSystem::lattice(0x1a2b_3c4d, 0.15);
    let initial = system.energy();
    let scale = system.kinetic().abs() + system.potential.abs();
    let mut maximum = 0.0_f64;
    for _ in 0..20_000 {
        system.velocity_verlet(0.0025);
        maximum = maximum.max((system.energy() - initial).abs() / scale);
    }
    assert!(maximum < 1.0e-3, "maximum relative NVE drift={maximum}");
}

#[test]
fn velocity_verlet_shows_second_order_timestep_convergence() {
    let initial = LjSystem::lattice(0x55aa, 0.10);
    let mut coarse = initial.clone();
    let mut fine = initial.clone();
    let mut reference = initial;
    for _ in 0..125 {
        coarse.velocity_verlet(0.004);
    }
    for _ in 0..250 {
        fine.velocity_verlet(0.002);
    }
    for _ in 0..1_000 {
        reference.velocity_verlet(0.0005);
    }
    let coarse_error = periodic_rms(&coarse, &reference);
    let fine_error = periodic_rms(&fine, &reference);
    assert!(fine_error < 0.32 * coarse_error,
        "coarse RMS={coarse_error}, fine RMS={fine_error}");
    assert!(fine_error < 2.0e-5, "fine RMS={fine_error}");
}

#[test]
fn deterministic_baoab_samples_canonical_kinetic_temperature() {
    fn trajectory() -> (f64, Vec<[f64; 2]>) {
        let target = 0.70;
        let mut system = LjSystem::lattice(0xcafe_f00d, target);
        for _ in 0..10_000 {
            system.baoab(0.004, 1.5, target);
        }
        let mut temperature_sum = 0.0;
        let samples = 30_000;
        for _ in 0..samples {
            system.baoab(0.004, 1.5, target);
            temperature_sum += system.kinetic() / system.position.len() as f64;
        }
        (temperature_sum / samples as f64, system.position)
    }
    let (observed, positions) = trajectory();
    let (replayed, replay_positions) = trajectory();
    assert!((observed / 0.70 - 1.0).abs() < 0.06,
        "observed T={observed}, target T=0.70");
    assert_eq!(observed.to_bits(), replayed.to_bits());
    for (left, right) in positions.iter().zip(replay_positions) {
        assert_eq!(left[0].to_bits(), right[0].to_bits());
        assert_eq!(left[1].to_bits(), right[1].to_bits());
    }
}
