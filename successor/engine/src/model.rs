//! Fixed model parameters and small dependency-free numerical utilities.

pub const MODEL_VERSION: u32 = 1;
pub const ABI_VERSION: u32 = 1;
pub const FIXED_DT: f64 = 1.0 / 120.0;
pub const MAX_ATOMS: usize = 18_000;
pub const PAIR_CUTOFF: f64 = 47.0;
pub const SWITCH_START: f64 = 37.0;
pub const MAX_SPEED: f64 = 280.0;
pub const INSERTION_RAMP: f64 = 0.24;

#[derive(Clone, Copy, Debug)]
pub struct ElementParam {
    pub mass: f64,
    pub radius: f64,
    pub covalent_radius: f64,
    pub valence: f64,
    pub well: f64,
}

pub const ELEMENTS: [ElementParam; 6] = [
    ElementParam { mass: 1.0, radius: 7.0, covalent_radius: 8.0, valence: 1.0, well: 1.20 }, // H
    ElementParam { mass: 12.0, radius: 11.0, covalent_radius: 11.0, valence: 4.0, well: 1.55 }, // C
    ElementParam { mass: 14.0, radius: 10.5, covalent_radius: 10.0, valence: 3.0, well: 1.45 }, // N
    ElementParam { mass: 16.0, radius: 10.0, covalent_radius: 9.0, valence: 2.0, well: 1.60 }, // O
    ElementParam { mass: 23.0, radius: 13.0, covalent_radius: 12.0, valence: 1.0, well: 0.38 }, // Na
    ElementParam { mass: 35.5, radius: 14.0, covalent_radius: 12.0, valence: 1.0, well: 0.55 }, // Cl
];

#[derive(Clone, Copy, Debug)]
pub struct TemplateAtom {
    pub element: u8,
    pub x: f64,
    pub y: f64,
    pub charge: f64,
}

#[derive(Clone, Copy, Debug)]
pub struct SpeciesTemplate {
    pub atoms: &'static [TemplateAtom],
}

const H2O: [TemplateAtom; 3] = [
    TemplateAtom { element: 3, x: 0.0, y: 0.0, charge: -0.66 },
    TemplateAtom { element: 0, x: -13.0, y: 11.0, charge: 0.33 },
    TemplateAtom { element: 0, x: 13.0, y: 11.0, charge: 0.33 },
];
const H2: [TemplateAtom; 2] = [
    TemplateAtom { element: 0, x: -8.0, y: 0.0, charge: 0.0 },
    TemplateAtom { element: 0, x: 8.0, y: 0.0, charge: 0.0 },
];
const O2: [TemplateAtom; 2] = [
    TemplateAtom { element: 3, x: -10.0, y: 0.0, charge: 0.0 },
    TemplateAtom { element: 3, x: 10.0, y: 0.0, charge: 0.0 },
];
const CH4: [TemplateAtom; 5] = [
    TemplateAtom { element: 1, x: 0.0, y: 0.0, charge: -0.40 },
    TemplateAtom { element: 0, x: -17.0, y: 0.0, charge: 0.10 },
    TemplateAtom { element: 0, x: 17.0, y: 0.0, charge: 0.10 },
    TemplateAtom { element: 0, x: 0.0, y: -17.0, charge: 0.10 },
    TemplateAtom { element: 0, x: 0.0, y: 17.0, charge: 0.10 },
];
const NH3: [TemplateAtom; 4] = [
    TemplateAtom { element: 2, x: 0.0, y: 0.0, charge: -0.60 },
    TemplateAtom { element: 0, x: -15.0, y: 8.0, charge: 0.20 },
    TemplateAtom { element: 0, x: 15.0, y: 8.0, charge: 0.20 },
    TemplateAtom { element: 0, x: 0.0, y: -16.0, charge: 0.20 },
];
const CO2: [TemplateAtom; 3] = [
    TemplateAtom { element: 1, x: 0.0, y: 0.0, charge: 0.70 },
    TemplateAtom { element: 3, x: -19.0, y: 0.0, charge: -0.35 },
    TemplateAtom { element: 3, x: 19.0, y: 0.0, charge: -0.35 },
];
const NA: [TemplateAtom; 1] = [TemplateAtom { element: 4, x: 0.0, y: 0.0, charge: 1.0 }];
const CL: [TemplateAtom; 1] = [TemplateAtom { element: 5, x: 0.0, y: 0.0, charge: -1.0 }];

pub const SPECIES: [SpeciesTemplate; 8] = [
    SpeciesTemplate { atoms: &H2O }, SpeciesTemplate { atoms: &H2 },
    SpeciesTemplate { atoms: &O2 }, SpeciesTemplate { atoms: &CH4 },
    SpeciesTemplate { atoms: &NH3 }, SpeciesTemplate { atoms: &CO2 },
    SpeciesTemplate { atoms: &NA }, SpeciesTemplate { atoms: &CL },
];

#[derive(Clone, Debug)]
pub struct Rng {
    state: u64,
    spare: Option<f64>,
}

impl Rng {
    pub fn new(seed: u32) -> Self {
        let mut state = (seed as u64) ^ 0x9e37_79b9_7f4a_7c15;
        if state == 0 { state = 0xa076_1d64_78bd_642f; }
        Self { state, spare: None }
    }

    fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.state = x;
        x.wrapping_mul(0x2545_f491_4f6c_dd1d)
    }

    pub fn uniform(&mut self) -> f64 {
        ((self.next_u64() >> 11) as f64) * (1.0 / 9_007_199_254_740_992.0)
    }

    pub fn normal(&mut self) -> f64 {
        if let Some(z) = self.spare.take() { return z; }
        let u1 = self.uniform().max(f64::MIN_POSITIVE);
        let u2 = self.uniform();
        let radius = (-2.0 * u1.ln()).sqrt();
        let angle = core::f64::consts::TAU * u2;
        self.spare = Some(radius * angle.sin());
        radius * angle.cos()
    }
}

#[inline]
pub fn target_temperature(u: f64) -> f64 {
    0.025 * 58.0_f64.powf(u.clamp(0.0, 1.0))
}

#[inline]
pub fn insertion_weight(age: f64) -> f64 {
    let t = (age / INSERTION_RAMP).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

/// C2 switch equal to one at `SWITCH_START` and zero at `PAIR_CUTOFF`.
#[inline]
pub fn cutoff_switch(r: f64) -> (f64, f64) {
    if r <= SWITCH_START { return (1.0, 0.0); }
    if r >= PAIR_CUTOFF { return (0.0, 0.0); }
    let t = (r - SWITCH_START) / (PAIR_CUTOFF - SWITCH_START);
    let t2 = t * t;
    let t3 = t2 * t;
    let s = 1.0 - 10.0 * t3 + 15.0 * t3 * t - 6.0 * t3 * t2;
    let dsdt = -30.0 * t2 + 60.0 * t3 - 30.0 * t2 * t2;
    (s, dsdt / (PAIR_CUTOFF - SWITCH_START))
}
