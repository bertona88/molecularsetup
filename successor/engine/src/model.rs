//! Versioned parameters for the reduced, two-dimensional teaching world.
//!
//! These values are deliberately compressed and pedagogical. In particular,
//! oxygen uses four hydrogen masses instead of the physical ratio of roughly
//! sixteen. The smaller ratio keeps oxygen motion legible while retaining the
//! qualitative fact that hydrogen responds more readily.

pub const MODEL_VERSION: u32 = 4;
pub const ABI_VERSION: u32 = 4;
pub const FIXED_DT: f64 = 1.0 / 120.0;
pub const MAX_ATOMS: usize = 18_000;
pub const MAX_SPEED: f64 = 260.0;
pub const NEIGHBOR_CELL: f64 = 36.0;
pub const WORLD_LIMIT: f64 = 1.0e6;

pub const ELEMENT_H: u8 = 0;
pub const ELEMENT_O: u8 = 1;
pub const ELEMENT_C: u8 = 2;

pub const ATOM_FLAG_NUMERIC_GUARD: u32 = 1 << 0;
pub const ATOM_FLAG_SPEED_CLAMP: u32 = 1 << 1;
pub const ATOM_FLAG_PHOTOINITIATOR: u32 = 1 << 2;
pub const ATOM_FLAG_RADICAL: u32 = 1 << 3;
pub const ATOM_FLAG_VINYL: u32 = 1 << 4;

pub const BOND_FORMING: u8 = 0;
pub const BOND_STABLE: u8 = 1;
pub const BOND_STRESSED: u8 = 2;
pub const BOND_BREAKING: u8 = 3;

pub const EXPERIMENT_MAKE_BOND: u8 = 0;
pub const EXPERIMENT_BREAK_BOND: u8 = 1;
pub const EXPERIMENT_IGNITE: u8 = 2;
pub const EXPERIMENT_FREE_PLAY: u8 = 3;
pub const EXPERIMENT_EXPOSE_RESIN: u8 = 4;
pub const EXPERIMENT_STRETCH_CURED: u8 = 5;
pub const EXPERIMENT_PHOTOPOLYMER_FREE_PLAY: u8 = 6;
pub const EXPERIMENT_EVERYTHING: u8 = 7;

#[derive(Clone, Copy, Debug)]
pub struct ElementParam {
    pub mass: f64,
    pub radius: f64,
    pub valence: u8,
}

pub const ELEMENTS: [ElementParam; 3] = [
    ElementParam { mass: 1.0, radius: 7.0, valence: 1 }, // H
    ElementParam { mass: 4.0, radius: 10.0, valence: 2 }, // O (compressed from the physical mass ratio)
    ElementParam { mass: 3.0, radius: 9.0, valence: 4 }, // carbon (compressed teaching mass)
];

#[derive(Clone, Copy, Debug)]
pub struct PairParam {
    pub order: u8,
    pub rest_length: f64,
    pub capture_distance: f64,
    pub stiffness: f64,
    pub damping: f64,
    pub activation_barrier: f64,
    pub formation_time: f64,
    pub dissociation_energy: f64,
    pub strain_on: f64,
    pub strain_break: f64,
    pub excitation_break: f64,
}

pub const H_H: PairParam = PairParam {
    order: 1,
    rest_length: 16.0,
    capture_distance: 20.0,
    stiffness: 72.0,
    damping: 4.8,
    activation_barrier: 34.0,
    formation_time: 0.30,
    dissociation_energy: 92.0,
    strain_on: 0.25,
    strain_break: 0.48,
    excitation_break: 96.0,
};

pub const O_O: PairParam = PairParam {
    order: 2,
    rest_length: 20.0,
    capture_distance: 25.0,
    stiffness: 112.0,
    damping: 7.2,
    activation_barrier: 92.0,
    formation_time: 0.46,
    dissociation_energy: 136.0,
    strain_on: 0.20,
    strain_break: 0.38,
    excitation_break: 126.0,
};

pub const O_H: PairParam = PairParam {
    order: 1,
    rest_length: 17.0,
    capture_distance: 31.0,
    stiffness: 96.0,
    damping: 5.8,
    activation_barrier: 36.0,
    formation_time: 0.34,
    dissociation_energy: 118.0,
    strain_on: 0.24,
    strain_break: 0.44,
    excitation_break: 154.0,
};

pub const O_O_SINGLE: PairParam = PairParam {
    order: 1,
    rest_length: 18.0,
    capture_distance: 24.0,
    stiffness: 74.0,
    damping: 5.0,
    activation_barrier: 60.0,
    formation_time: 0.30,
    dissociation_energy: 72.0,
    strain_on: 0.22,
    strain_break: 0.42,
    excitation_break: 88.0,
};

pub const C_C_SINGLE: PairParam = PairParam {
    order: 1,
    rest_length: 17.0,
    capture_distance: 32.0,
    stiffness: 102.0,
    damping: 6.4,
    activation_barrier: 12.0,
    formation_time: 0.30,
    dissociation_energy: 132.0,
    strain_on: 0.23,
    strain_break: 0.50,
    excitation_break: 1_200.0,
};

pub const C_C_DOUBLE: PairParam = PairParam {
    order: 2,
    rest_length: 16.0,
    capture_distance: 22.0,
    stiffness: 138.0,
    damping: 7.0,
    activation_barrier: 160.0,
    formation_time: 0.42,
    dissociation_energy: 176.0,
    strain_on: 0.20,
    strain_break: 0.40,
    excitation_break: 1_200.0,
};

pub const C_H: PairParam = PairParam {
    order: 1,
    rest_length: 15.0,
    capture_distance: 20.0,
    stiffness: 96.0,
    damping: 5.8,
    activation_barrier: 120.0,
    formation_time: 0.34,
    dissociation_energy: 118.0,
    strain_on: 0.24,
    strain_break: 0.48,
    excitation_break: 1_200.0,
};

pub const C_O_SINGLE: PairParam = PairParam {
    order: 1,
    rest_length: 17.0,
    capture_distance: 40.0,
    stiffness: 108.0,
    damping: 6.4,
    activation_barrier: 12.0,
    formation_time: 0.32,
    dissociation_energy: 138.0,
    strain_on: 0.22,
    strain_break: 0.46,
    excitation_break: 1_200.0,
};

pub const C_O_DOUBLE: PairParam = PairParam {
    order: 2,
    rest_length: 16.0,
    capture_distance: 22.0,
    stiffness: 146.0,
    damping: 7.2,
    activation_barrier: 180.0,
    formation_time: 0.44,
    dissociation_energy: 184.0,
    strain_on: 0.19,
    strain_break: 0.38,
    excitation_break: 1_200.0,
};

#[inline]
pub fn pair_param(a: u8, b: u8) -> Option<PairParam> {
    match (a, b) {
        (ELEMENT_H, ELEMENT_H) => Some(H_H),
        (ELEMENT_O, ELEMENT_O) => Some(O_O),
        (ELEMENT_H, ELEMENT_O) | (ELEMENT_O, ELEMENT_H) => Some(O_H),
        (ELEMENT_C, ELEMENT_C) => Some(C_C_SINGLE),
        (ELEMENT_C, ELEMENT_O) | (ELEMENT_O, ELEMENT_C) => Some(C_O_SINGLE),
        _ => None,
    }
}

#[inline]
pub fn bond_param(a: u8, b: u8, order: u8) -> Option<PairParam> {
    match (a, b, order) {
        (ELEMENT_H, ELEMENT_H, 1) => Some(H_H),
        (ELEMENT_O, ELEMENT_O, 1) => Some(O_O_SINGLE),
        (ELEMENT_O, ELEMENT_O, 2) => Some(O_O),
        (ELEMENT_H, ELEMENT_O, 1) | (ELEMENT_O, ELEMENT_H, 1) => Some(O_H),
        (ELEMENT_C, ELEMENT_C, 1) => Some(C_C_SINGLE),
        (ELEMENT_C, ELEMENT_C, 2) => Some(C_C_DOUBLE),
        (ELEMENT_C, ELEMENT_H, 1) | (ELEMENT_H, ELEMENT_C, 1) => Some(C_H),
        (ELEMENT_C, ELEMENT_O, 1) | (ELEMENT_O, ELEMENT_C, 1) => Some(C_O_SINGLE),
        (ELEMENT_C, ELEMENT_O, 2) | (ELEMENT_O, ELEMENT_C, 2) => Some(C_O_DOUBLE),
        _ => None,
    }
}

pub const H_O_H_ANGLE_RADIANS: f64 = 104.5 * core::f64::consts::PI / 180.0;
pub const H_O_H_ANGLE_STIFFNESS: f64 = 210.0;

#[inline]
pub fn angle_preference_energy(angle_radians: f64) -> f64 {
    let delta = angle_radians.cos() - H_O_H_ANGLE_RADIANS.cos();
    0.5 * H_O_H_ANGLE_STIFFNESS * delta * delta
}

/// Temperature is a visual motion control, not kelvin. The eight-fold RMS
/// speed span makes both endpoints perceptibly different inside one second.
#[inline]
pub fn target_temperature(u: f64) -> f64 {
    64.0 * 64.0_f64.powf(u.clamp(0.0, 1.0))
}

#[derive(Clone, Copy, Debug)]
pub struct TemplateAtom {
    pub element: u8,
    pub x: f64,
    pub y: f64,
    pub flags: u32,
}

#[derive(Clone, Copy, Debug)]
pub struct TemplateBond {
    pub a: usize,
    pub b: usize,
    pub order: u8,
}

#[derive(Clone, Copy, Debug)]
pub struct IngredientTemplate {
    pub atoms: &'static [TemplateAtom],
    pub bonds: &'static [TemplateBond],
}

const H_ATOMS: [TemplateAtom; 1] = [TemplateAtom { element: ELEMENT_H, x: 0.0, y: 0.0, flags: 0 }];
const O_ATOMS: [TemplateAtom; 1] = [TemplateAtom { element: ELEMENT_O, x: 0.0, y: 0.0, flags: 0 }];
const H2_ATOMS: [TemplateAtom; 2] = [
    TemplateAtom { element: ELEMENT_H, x: -8.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: 8.0, y: 0.0, flags: 0 },
];
const O2_ATOMS: [TemplateAtom; 2] = [
    TemplateAtom { element: ELEMENT_O, x: -10.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_O, x: 10.0, y: 0.0, flags: 0 },
];
const H2O_ATOMS: [TemplateAtom; 3] = [
    TemplateAtom { element: ELEMENT_O, x: 0.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: -13.45, y: 10.36, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: 13.45, y: 10.36, flags: 0 },
];
const ACRYLIC_ACID_ATOMS: [TemplateAtom; 9] = [
    TemplateAtom { element: ELEMENT_C, x: -31.0, y: 0.0, flags: ATOM_FLAG_VINYL },
    TemplateAtom { element: ELEMENT_C, x: -15.0, y: 0.0, flags: ATOM_FLAG_VINYL },
    TemplateAtom { element: ELEMENT_C, x: 2.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_O, x: 4.0, y: -16.0, flags: 0 },
    TemplateAtom { element: ELEMENT_O, x: 19.0, y: 5.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: -41.0, y: -10.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: -41.0, y: 10.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: -15.0, y: 15.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: 36.0, y: 5.0, flags: 0 },
];
const DIACRYLATE_ATOMS: [TemplateAtom; 22] = [
    TemplateAtom { element: ELEMENT_C, x: -88.0, y: 0.0, flags: ATOM_FLAG_VINYL },
    TemplateAtom { element: ELEMENT_C, x: -72.0, y: 0.0, flags: ATOM_FLAG_VINYL },
    TemplateAtom { element: ELEMENT_C, x: -56.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_O, x: -56.0, y: -17.0, flags: 0 },
    TemplateAtom { element: ELEMENT_O, x: -40.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_C, x: -24.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_C, x: -8.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_O, x: 8.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_C, x: 24.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_O, x: 24.0, y: -17.0, flags: 0 },
    TemplateAtom { element: ELEMENT_C, x: 40.0, y: 0.0, flags: ATOM_FLAG_VINYL },
    TemplateAtom { element: ELEMENT_C, x: 56.0, y: 0.0, flags: ATOM_FLAG_VINYL },
    TemplateAtom { element: ELEMENT_H, x: -98.0, y: -10.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: -98.0, y: 10.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: -72.0, y: 15.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: -24.0, y: -15.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: -24.0, y: 15.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: -8.0, y: -15.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: -8.0, y: 15.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: 40.0, y: 15.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: 66.0, y: -10.0, flags: 0 },
    TemplateAtom { element: ELEMENT_H, x: 66.0, y: 10.0, flags: 0 },
];
const PEROXIDE_ATOMS: [TemplateAtom; 4] = [
    TemplateAtom { element: ELEMENT_H, x: -26.0, y: 0.0, flags: 0 },
    TemplateAtom { element: ELEMENT_O, x: -9.0, y: 0.0, flags: ATOM_FLAG_PHOTOINITIATOR },
    TemplateAtom { element: ELEMENT_O, x: 9.0, y: 0.0, flags: ATOM_FLAG_PHOTOINITIATOR },
    TemplateAtom { element: ELEMENT_H, x: 26.0, y: 0.0, flags: 0 },
];

const NO_BONDS: [TemplateBond; 0] = [];
const DIATOMIC_BOND: [TemplateBond; 1] = [TemplateBond { a: 0, b: 1, order: 1 }];
const OXYGEN_BOND: [TemplateBond; 1] = [TemplateBond { a: 0, b: 1, order: 2 }];
const WATER_BONDS: [TemplateBond; 2] = [
    TemplateBond { a: 0, b: 1, order: 1 },
    TemplateBond { a: 0, b: 2, order: 1 },
];
const ACRYLIC_ACID_BONDS: [TemplateBond; 8] = [
    TemplateBond { a: 0, b: 1, order: 2 },
    TemplateBond { a: 0, b: 5, order: 1 },
    TemplateBond { a: 0, b: 6, order: 1 },
    TemplateBond { a: 1, b: 7, order: 1 },
    TemplateBond { a: 1, b: 2, order: 1 },
    TemplateBond { a: 2, b: 3, order: 2 },
    TemplateBond { a: 2, b: 4, order: 1 },
    TemplateBond { a: 4, b: 8, order: 1 },
];
const DIACRYLATE_BONDS: [TemplateBond; 21] = [
    TemplateBond { a: 0, b: 1, order: 2 },
    TemplateBond { a: 0, b: 12, order: 1 },
    TemplateBond { a: 0, b: 13, order: 1 },
    TemplateBond { a: 1, b: 14, order: 1 },
    TemplateBond { a: 1, b: 2, order: 1 },
    TemplateBond { a: 2, b: 3, order: 2 },
    TemplateBond { a: 2, b: 4, order: 1 },
    TemplateBond { a: 4, b: 5, order: 1 },
    TemplateBond { a: 5, b: 15, order: 1 },
    TemplateBond { a: 5, b: 16, order: 1 },
    TemplateBond { a: 5, b: 6, order: 1 },
    TemplateBond { a: 6, b: 17, order: 1 },
    TemplateBond { a: 6, b: 18, order: 1 },
    TemplateBond { a: 6, b: 7, order: 1 },
    TemplateBond { a: 7, b: 8, order: 1 },
    TemplateBond { a: 8, b: 9, order: 2 },
    TemplateBond { a: 8, b: 10, order: 1 },
    TemplateBond { a: 10, b: 19, order: 1 },
    TemplateBond { a: 10, b: 11, order: 2 },
    TemplateBond { a: 11, b: 20, order: 1 },
    TemplateBond { a: 11, b: 21, order: 1 },
];
const PEROXIDE_BONDS: [TemplateBond; 3] = [
    TemplateBond { a: 0, b: 1, order: 1 },
    TemplateBond { a: 1, b: 2, order: 1 },
    TemplateBond { a: 2, b: 3, order: 1 },
];

/// ABI v4 ingredient ids: 0 H, 1 O, 2 H2, 3 O2, 4 H2O,
/// 5 acrylic acid, 6 ethylene glycol diacrylate, 7 hydrogen peroxide.
pub const INGREDIENTS: [IngredientTemplate; 8] = [
    IngredientTemplate { atoms: &H_ATOMS, bonds: &NO_BONDS },
    IngredientTemplate { atoms: &O_ATOMS, bonds: &NO_BONDS },
    IngredientTemplate { atoms: &H2_ATOMS, bonds: &DIATOMIC_BOND },
    IngredientTemplate { atoms: &O2_ATOMS, bonds: &OXYGEN_BOND },
    IngredientTemplate { atoms: &H2O_ATOMS, bonds: &WATER_BONDS },
    IngredientTemplate { atoms: &ACRYLIC_ACID_ATOMS, bonds: &ACRYLIC_ACID_BONDS },
    IngredientTemplate { atoms: &DIACRYLATE_ATOMS, bonds: &DIACRYLATE_BONDS },
    IngredientTemplate { atoms: &PEROXIDE_ATOMS, bonds: &PEROXIDE_BONDS },
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

/// Exact overlaps use a stable, id-derived normal so repulsion never vanishes.
#[inline]
pub fn deterministic_direction(a: u32, b: u32) -> (f64, f64) {
    let low = a.min(b) as u64;
    let high = a.max(b) as u64;
    let mut bits = low.wrapping_mul(0x9e37_79b9).wrapping_add(high ^ 0x85eb_ca6b);
    bits ^= bits >> 16;
    bits = bits.wrapping_mul(0x7feb_352d);
    bits ^= bits >> 15;
    let fraction = (bits as u32 as f64) / (u32::MAX as f64 + 1.0);
    let angle = core::f64::consts::TAU * fraction;
    let (sin, cos) = angle.sin_cos();
    if a <= b { (cos, sin) } else { (-cos, -sin) }
}
