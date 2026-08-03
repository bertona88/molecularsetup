use crate::model::{
    angle_preference_energy, deterministic_direction, pair_param, target_temperature,
    ElementParam, PairParam, Rng, ABI_VERSION, BOND_BREAKING, BOND_FORMING, BOND_STABLE,
    BOND_STRESSED, ELEMENTS, ELEMENT_H, ELEMENT_O, EXPERIMENT_BREAK_BOND,
    EXPERIMENT_FREE_PLAY, EXPERIMENT_IGNITE, EXPERIMENT_MAKE_BOND, FIXED_DT,
    H_O_H_ANGLE_RADIANS, H_O_H_ANGLE_STIFFNESS, INGREDIENTS, MAX_ATOMS, MAX_SPEED,
    MODEL_VERSION, NEIGHBOR_CELL, WORLD_LIMIT,
};
use std::collections::VecDeque;

const ATOM_STRIDE: usize = 16;
const BOND_STRIDE: usize = 10;
const WALL_STRIDE: usize = 10;
const EVENT_STRIDE: usize = 10;
const STATS_STRIDE: usize = 28;
const EVENT_CAPACITY: usize = 4_096;
const CONTAINER_LEFT: f64 = -320.0;
const CONTAINER_RIGHT: f64 = 320.0;
const CONTAINER_TOP: f64 = -220.0;
const CONTAINER_BOTTOM: f64 = 220.0;
const MIN_CONTAINER_WIDTH: f64 = 150.0;
const PISTON_SPEED: f64 = 150.0;

pub const EVENT_COLLISION: u8 = 1;
pub const EVENT_BOND_FORMING: u8 = 2;
pub const EVENT_BOND_FORMED: u8 = 3;
pub const EVENT_BOND_STRESSED: u8 = 4;
pub const EVENT_BOND_BROKEN: u8 = 5;
pub const EVENT_SPARK: u8 = 6;
pub const EVENT_WALL: u8 = 7;
pub const EVENT_ENERGY: u8 = 8;

#[derive(Clone, Debug)]
pub struct Atom {
    pub id: u32,
    pub element: u8,
    pub x: f64,
    pub y: f64,
    pub previous_x: f64,
    pub previous_y: f64,
    pub vx: f64,
    pub vy: f64,
    pub fx: f64,
    pub fy: f64,
    pub excitation: f64,
    pub age: f64,
    pub flags: u32,
}

impl Atom {
    #[inline]
    pub fn param(&self) -> ElementParam { ELEMENTS[self.element as usize] }
}

#[derive(Clone, Debug)]
pub struct Bond {
    pub id: u32,
    pub a: usize,
    pub b: usize,
    pub order: u8,
    pub state: u8,
    pub progress: f64,
    pub strain: f64,
    pub energy: f64,
    pub rest_length: f64,
    pub age: f64,
    pub stress_clock: f64,
}

#[derive(Clone, Debug)]
pub struct Wall {
    pub id: u32,
    pub edge: u8,
    pub position: f64,
    pub start: f64,
    pub end: f64,
    pub velocity: f64,
    pub load: f64,
    pub impact: f64,
    pub target: f64,
    pub movable: bool,
}

#[derive(Clone, Debug)]
struct Event {
    kind: u8,
    a: i32,
    b: i32,
    x: f64,
    y: f64,
    magnitude: f64,
    age: f64,
    lifetime: f64,
    energy: f64,
    wall_id: u32,
}

#[derive(Clone, Debug)]
struct SparkWave {
    x: f64,
    y: f64,
    energy: f64,
    radius: f64,
    age: f64,
}

#[derive(Clone, Debug)]
struct Grab {
    atom: usize,
    target_x: f64,
    target_y: f64,
    previous_target_x: f64,
    previous_target_y: f64,
}

#[derive(Clone, Debug)]
struct RefractoryPair {
    a: usize,
    b: usize,
    remaining: f64,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct EnergyLedger {
    pub thermal_exchange: f64,
    pub formation_release: f64,
    pub breaking_absorption: f64,
    pub grab_work: f64,
    pub wall_work: f64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
struct CellEntry {
    cx: i32,
    cy: i32,
    index: usize,
}

#[derive(Clone, Copy, Debug)]
struct FormationCandidate {
    a: usize,
    b: usize,
    activation: f64,
    priority: f64,
}

#[derive(Clone, Copy, Debug)]
struct ActivatedEncounter {
    a: usize,
    b: usize,
    distance: f64,
    priority: f64,
    nx: f64,
    ny: f64,
}

#[derive(Debug)]
pub struct World {
    pub seed: u32,
    pub experiment: u8,
    pub playing: bool,
    pub temperature_u: f64,
    pub simulated_time: f64,
    pub completed_steps: u64,
    pub rejected_ingredients: u64,
    pub potential_energy: f64,
    pub ledger: EnergyLedger,
    pub spark_count: u64,
    pub collision_count: u64,
    accumulator: f64,
    next_atom_id: u32,
    next_bond_id: u32,
    rng: Rng,
    grab: Option<Grab>,
    refractory_pairs: Vec<RefractoryPair>,
    sparks: Vec<SparkWave>,
    events: VecDeque<Event>,
    pub atoms: Vec<Atom>,
    pub bonds: Vec<Bond>,
    pub walls: Vec<Wall>,
    cell_entry_scratch: Vec<CellEntry>,
    neighbor_pair_scratch: Vec<(usize, usize)>,
    angular_neighbor_scratch: Vec<[usize; 2]>,
    atom_view: Vec<f32>,
    bond_view: Vec<f32>,
    wall_view: Vec<f32>,
    event_view: Vec<f32>,
    stats_view: Vec<f64>,
}

impl World {
    pub fn new(seed: u32) -> Self {
        let mut world = Self {
            seed,
            experiment: EXPERIMENT_MAKE_BOND,
            playing: true,
            temperature_u: 0.34,
            simulated_time: 0.0,
            completed_steps: 0,
            rejected_ingredients: 0,
            potential_energy: 0.0,
            ledger: EnergyLedger::default(),
            spark_count: 0,
            collision_count: 0,
            accumulator: 0.0,
            next_atom_id: 1,
            next_bond_id: 1,
            rng: Rng::new(seed),
            grab: None,
            refractory_pairs: Vec::new(),
            sparks: Vec::new(),
            events: VecDeque::new(),
            atoms: Vec::new(),
            bonds: Vec::new(),
            walls: default_walls(),
            cell_entry_scratch: Vec::new(),
            neighbor_pair_scratch: Vec::new(),
            angular_neighbor_scratch: Vec::new(),
            atom_view: Vec::new(),
            bond_view: Vec::new(),
            wall_view: Vec::new(),
            event_view: Vec::new(),
            stats_view: vec![0.0; STATS_STRIDE],
        };
        world.load_experiment(EXPERIMENT_MAKE_BOND as u32);
        world
    }

    pub fn load_experiment(&mut self, experiment: u32) -> u32 {
        if experiment > EXPERIMENT_FREE_PLAY as u32 {
            self.refresh();
            return 0;
        }
        self.experiment = experiment as u8;
        self.playing = true;
        self.simulated_time = 0.0;
        self.completed_steps = 0;
        self.rejected_ingredients = 0;
        self.potential_energy = 0.0;
        self.ledger = EnergyLedger::default();
        self.spark_count = 0;
        self.collision_count = 0;
        self.accumulator = 0.0;
        self.next_atom_id = 1;
        self.next_bond_id = 1;
        self.rng = Rng::new(self.seed ^ experiment.wrapping_mul(0x9e37_79b9));
        self.grab = None;
        self.refractory_pairs.clear();
        self.sparks.clear();
        self.events.clear();
        self.atoms.clear();
        self.bonds.clear();
        self.walls = default_walls();

        match self.experiment {
            EXPERIMENT_MAKE_BOND => self.load_make_bond(),
            EXPERIMENT_BREAK_BOND => self.load_break_bond(),
            EXPERIMENT_IGNITE => self.load_ignite(),
            EXPERIMENT_FREE_PLAY => self.load_free_play(),
            _ => unreachable!(),
        }
        self.compute_forces_and_bond_states(false);
        self.refresh();
        1
    }

    fn load_make_bond(&mut self) {
        self.temperature_u = 0.0;
        self.push_atom(ELEMENT_H, -9.0, 0.0, 15.0, 0.0);
        self.push_atom(ELEMENT_H, 9.0, 0.0, -15.0, 0.0);
    }

    fn load_break_bond(&mut self) {
        self.temperature_u = 0.36;
        let a = self.push_atom(ELEMENT_H, -8.0, 0.0, 0.0, 0.0);
        let b = self.push_atom(ELEMENT_H, 8.0, 0.0, 0.0, 0.0);
        self.add_stable_bond(a, b);
    }

    fn load_ignite(&mut self) {
        self.temperature_u = 0.26;
        // Four identical local arrangements. Their initial stable bonds occupy
        // every valence; after excitation, the general break/collision/form
        // rules operate without a product graph or water-production rule.
        let cells = [(-145.0, -82.0), (70.0, -82.0), (-120.0, 88.0), (115.0, 88.0)];
        for (cx, cy) in cells {
            let o1 = self.push_atom(ELEMENT_O, cx - 10.0, cy, 0.0, 0.0);
            let o2 = self.push_atom(ELEMENT_O, cx + 10.0, cy, 0.0, 0.0);
            self.add_stable_bond(o1, o2);

            let h1 = self.push_atom(ELEMENT_H, cx - 8.0, cy - 24.0, 0.0, 0.0);
            let h2 = self.push_atom(ELEMENT_H, cx + 8.0, cy - 24.0, 0.0, 0.0);
            self.add_stable_bond(h1, h2);

            let h3 = self.push_atom(ELEMENT_H, cx - 8.0, cy + 24.0, 0.0, 0.0);
            let h4 = self.push_atom(ELEMENT_H, cx + 8.0, cy + 24.0, 0.0, 0.0);
            self.add_stable_bond(h3, h4);
        }
    }

    fn load_free_play(&mut self) {
        self.temperature_u = 0.38;
        self.spawn_template_at(4, -35.0, -8.0, -0.2, 0.0, 0.0);
        self.spawn_template_at(2, -112.0, 48.0, 0.35, 8.0, -3.0);
        self.spawn_template_at(3, 105.0, -40.0, -0.25, -4.0, 3.0);
        self.push_atom(ELEMENT_H, 82.0, 76.0, -10.0, -5.0);
        self.push_atom(ELEMENT_O, 135.0, 82.0, -7.0, -4.0);
    }

    fn push_atom(&mut self, element: u8, x: f64, y: f64, vx: f64, vy: f64) -> usize {
        let id = self.next_atom_id.max(1);
        self.next_atom_id = id.wrapping_add(1).max(1);
        let index = self.atoms.len();
        self.atoms.push(Atom {
            id,
            element,
            x,
            y,
            previous_x: x,
            previous_y: y,
            vx,
            vy,
            fx: 0.0,
            fy: 0.0,
            excitation: 0.0,
            age: 0.0,
            flags: 0,
        });
        index
    }

    fn add_stable_bond(&mut self, a: usize, b: usize) {
        let Some(param) = pair_param(self.atoms[a].element, self.atoms[b].element) else { return; };
        let id = self.next_bond_id.max(1);
        self.next_bond_id = id.wrapping_add(1).max(1);
        self.bonds.push(Bond {
            id,
            a: a.min(b),
            b: a.max(b),
            order: param.order,
            state: BOND_STABLE,
            progress: 1.0,
            strain: 0.0,
            energy: -param.dissociation_energy,
            rest_length: param.rest_length,
            age: 0.0,
            stress_clock: 0.0,
        });
    }

    fn spawn_template_at(
        &mut self,
        ingredient: usize,
        x: f64,
        y: f64,
        rotation: f64,
        drift_x: f64,
        drift_y: f64,
    ) {
        let template = INGREDIENTS[ingredient];
        let start = self.atoms.len();
        let (sin, cos) = rotation.sin_cos();
        for source in template.atoms {
            let dx = cos * source.x - sin * source.y;
            let dy = sin * source.x + cos * source.y;
            self.push_atom(source.element, x + dx, y + dy, drift_x, drift_y);
        }
        for bond in template.bonds {
            self.add_stable_bond(start + bond.a, start + bond.b);
        }
    }

    pub fn set_playing(&mut self, value: bool) {
        self.playing = value;
        self.refresh();
    }

    pub fn set_temperature(&mut self, value: f64) {
        if value.is_finite() { self.temperature_u = value.clamp(0.0, 1.0); }
        self.refresh();
    }

    pub fn spawn_ingredient(&mut self, ingredient: u32, count: u32, x: f64, y: f64) -> u32 {
        let Some(template) = INGREDIENTS.get(ingredient as usize) else {
            self.rejected_ingredients = self.rejected_ingredients.saturating_add(count as u64);
            self.refresh();
            return 0;
        };
        if !valid_coordinate(x) || !valid_coordinate(y) {
            self.rejected_ingredients = self.rejected_ingredients.saturating_add(count as u64);
            self.refresh();
            return 0;
        }
        let accepted = count.min((MAX_ATOMS.saturating_sub(self.atoms.len()) / template.atoms.len()) as u32);
        let (left, right, top, bottom) = self.container_bounds();
        for index in 0..accepted {
            let k = index as f64;
            let angle = k * 2.399_963_229_728_653 + self.rng.uniform() * 0.06;
            let radius = if index == 0 { 0.0 } else { 29.0 * k.sqrt() };
            let cx = (x + radius * angle.cos()).clamp(left + 26.0, right - 26.0);
            let cy = (y + radius * angle.sin()).clamp(top + 26.0, bottom - 26.0);
            let rotation = self.rng.uniform() * core::f64::consts::TAU;
            let temperature = target_temperature(self.temperature_u);
            let drift_x = self.rng.normal() * (temperature / 14.0).sqrt();
            let drift_y = self.rng.normal() * (temperature / 14.0).sqrt();
            self.spawn_template_at(ingredient as usize, cx, cy, rotation, drift_x, drift_y);
        }
        self.rejected_ingredients = self.rejected_ingredients.saturating_add((count - accepted) as u64);
        self.compute_forces_and_bond_states(false);
        self.refresh();
        accepted
    }

    pub fn apply_spark(&mut self, x: f64, y: f64, energy: f64, radius: f64) -> u32 {
        if !valid_coordinate(x) || !valid_coordinate(y) || !energy.is_finite() || !radius.is_finite()
            || energy <= 0.0 || radius <= 0.0
        {
            self.refresh();
            return 0;
        }
        let energy = energy.clamp(1.0, 600.0);
        let radius = radius.clamp(24.0, 800.0);
        self.sparks.push(SparkWave { x, y, energy, radius, age: 0.0 });
        self.spark_count = self.spark_count.saturating_add(1);
        self.push_event(Event {
            kind: EVENT_SPARK,
            a: -1,
            b: -1,
            x,
            y,
            magnitude: radius,
            age: 0.0,
            lifetime: 1.8,
            energy,
            wall_id: 0,
        });
        self.refresh();
        1
    }

    pub fn grab_atom(&mut self, atom_id: u32, x: f64, y: f64) -> u32 {
        if atom_id == 0 || !valid_coordinate(x) || !valid_coordinate(y) {
            self.refresh();
            return 0;
        }
        let Some(index) = self.atoms.iter().position(|atom| atom.id == atom_id) else {
            self.refresh();
            return 0;
        };
        self.grab = Some(Grab {
            atom: index,
            target_x: x,
            target_y: y,
            previous_target_x: x,
            previous_target_y: y,
        });
        self.refresh();
        1
    }

    pub fn drag_atom(&mut self, atom_id: u32, x: f64, y: f64) -> u32 {
        if !valid_coordinate(x) || !valid_coordinate(y) {
            self.refresh();
            return 0;
        }
        let Some(grab) = &mut self.grab else { self.refresh(); return 0; };
        if self.atoms.get(grab.atom).map(|atom| atom.id) != Some(atom_id) {
            self.refresh();
            return 0;
        }
        grab.target_x = x;
        grab.target_y = y;
        self.refresh();
        1
    }

    pub fn release_atom(&mut self, atom_id: u32) -> u32 {
        let matches = self.grab.as_ref()
            .and_then(|grab| self.atoms.get(grab.atom))
            .map(|atom| atom.id == atom_id)
            .unwrap_or(false);
        if matches {
            self.grab = None;
            self.refresh();
            1
        } else {
            self.refresh();
            0
        }
    }

    pub fn set_piston_target(&mut self, coordinate: f64) -> u32 {
        if !valid_coordinate(coordinate) {
            self.refresh();
            return 0;
        }
        let minimum = CONTAINER_LEFT + MIN_CONTAINER_WIDTH;
        let target = coordinate.clamp(minimum, CONTAINER_RIGHT);
        if let Some(wall) = self.walls.iter_mut().find(|wall| wall.edge == 1) {
            wall.target = target;
            self.refresh();
            1
        } else {
            self.refresh();
            0
        }
    }

    pub fn advance(&mut self, real_delta_ms: f64) -> u32 {
        if !self.playing || !real_delta_ms.is_finite() || real_delta_ms <= 0.0 {
            self.refresh();
            return 0;
        }
        self.accumulator += real_delta_ms * 0.001;
        if !self.accumulator.is_finite() { self.accumulator = 0.0; }
        let available = (self.accumulator / FIXED_DT).floor().max(0.0);
        let steps = available.min(5.0) as u32;
        self.accumulator %= FIXED_DT;
        if self.accumulator < 0.0 { self.accumulator = 0.0; }
        for _ in 0..steps { self.step_one(); }
        self.refresh();
        steps
    }

    pub fn step_fixed(&mut self, count: u32) -> u32 {
        for _ in 0..count { self.step_one(); }
        self.refresh();
        count
    }

    fn step_one(&mut self) {
        for atom in &mut self.atoms {
            atom.previous_x = atom.x;
            atom.previous_y = atom.y;
            atom.age += FIXED_DT;
        }
        for event in &mut self.events { event.age += FIXED_DT; }
        self.events.retain(|event| event.age <= event.lifetime);
        for pair in &mut self.refractory_pairs { pair.remaining -= FIXED_DT; }
        self.refractory_pairs.retain(|pair| pair.remaining > 0.0);
        let wall_decay = (-5.0 * FIXED_DT).exp();
        for wall in &mut self.walls {
            wall.load *= wall_decay;
            wall.impact *= wall_decay;
        }

        self.update_piston();
        self.update_sparks();
        self.apply_thermostat();
        self.compute_forces_and_bond_states(true);
        self.integrate_atoms();
        self.resolve_wall_collisions();
        self.resolve_atom_collisions_and_form_bonds();

        let excitation_decay = (-FIXED_DT / 2.25).exp();
        for atom in &mut self.atoms {
            atom.excitation *= excitation_decay;
            if !atom.excitation.is_finite() { atom.excitation = 0.0; atom.flags |= 1; }
            sanitize_atom(atom);
        }
        self.simulated_time += FIXED_DT;
        self.completed_steps = self.completed_steps.saturating_add(1);
    }

    fn update_piston(&mut self) {
        let Some(index) = self.walls.iter().position(|wall| wall.edge == 1) else { return; };
        let delta = self.walls[index].target - self.walls[index].position;
        let movement = delta.clamp(-PISTON_SPEED * FIXED_DT, PISTON_SPEED * FIXED_DT);
        self.walls[index].position += movement;
        self.walls[index].velocity = movement / FIXED_DT;
        let right = self.walls[index].position;
        for wall in &mut self.walls {
            if wall.edge == 2 || wall.edge == 3 { wall.end = right; }
        }
    }

    fn update_sparks(&mut self) {
        const WAVE_SPEED: f64 = 430.0;
        for wave in &mut self.sparks {
            let previous_radius = (WAVE_SPEED * wave.age).min(wave.radius);
            wave.age += FIXED_DT;
            let current_radius = (WAVE_SPEED * wave.age).min(wave.radius);
            if current_radius <= previous_radius { continue; }
            for atom in &mut self.atoms {
                let distance = (atom.x - wave.x).hypot(atom.y - wave.y);
                if distance + 1.0e-9 < previous_radius || distance > current_radius { continue; }
                let falloff = (1.0 - 0.48 * distance / wave.radius).clamp(0.45, 1.0);
                atom.excitation += wave.energy * falloff;
            }
        }
        self.sparks.retain(|wave| wave.age <= 1.8);
    }

    fn apply_thermostat(&mut self) {
        let before = self.kinetic_energy();
        let gamma = 3.8;
        let c = (-gamma * FIXED_DT).exp();
        let variance_factor = (1.0 - c * c).max(0.0);
        let temperature = target_temperature(self.temperature_u);
        let hot_level = ((self.temperature_u - 0.72) / 0.28).clamp(0.0, 1.0) * 190.0;
        let excitation_mix = 1.0 - (-2.8 * FIXED_DT).exp();
        for atom in &mut self.atoms {
            let sigma = (variance_factor * temperature / atom.param().mass).sqrt();
            atom.vx = c * atom.vx + sigma * self.rng.normal();
            atom.vy = c * atom.vy + sigma * self.rng.normal();
            if hot_level > atom.excitation {
                atom.excitation += (hot_level - atom.excitation) * excitation_mix;
            }
            sanitize_atom(atom);
        }
        let exchange = self.kinetic_energy() - before;
        if exchange.is_finite() { self.ledger.thermal_exchange += exchange; }
    }

    pub(crate) fn compute_forces_and_bond_states(&mut self, advance_lifecycle: bool) {
        for atom in &mut self.atoms { atom.fx = 0.0; atom.fy = 0.0; }
        self.potential_energy = 0.0;
        self.apply_grab_force(advance_lifecycle);

        let mut removals = Vec::new();
        let mut pending_events = Vec::new();
        for index in 0..self.bonds.len() {
            let (a_index, b_index) = (self.bonds[index].a, self.bonds[index].b);
            if a_index >= self.atoms.len() || b_index >= self.atoms.len() || a_index == b_index {
                removals.push(index);
                continue;
            }
            let Some(param) = pair_param(self.atoms[a_index].element, self.atoms[b_index].element) else {
                removals.push(index);
                continue;
            };
            let dx = self.atoms[b_index].x - self.atoms[a_index].x;
            let dy = self.atoms[b_index].y - self.atoms[a_index].y;
            let distance = dx.hypot(dy);
            let (nx, ny) = if distance > 1.0e-12 {
                (dx / distance, dy / distance)
            } else {
                deterministic_direction(self.atoms[a_index].id, self.atoms[b_index].id)
            };
            let radial_velocity = (self.atoms[b_index].vx - self.atoms[a_index].vx) * nx
                + (self.atoms[b_index].vy - self.atoms[a_index].vy) * ny;
            let strain = (distance - param.rest_length) / param.rest_length;
            let excitation = 0.5 * (self.atoms[a_index].excitation + self.atoms[b_index].excitation);
            let midpoint = (
                0.5 * (self.atoms[a_index].x + self.atoms[b_index].x),
                0.5 * (self.atoms[a_index].y + self.atoms[b_index].y),
            );
            let mut completed = false;
            let mut started_breaking = false;
            let mut broken = false;

            {
                let bond = &mut self.bonds[index];
                if advance_lifecycle { bond.age += FIXED_DT; }
                bond.strain = strain;
                if advance_lifecycle {
                    match bond.state {
                        BOND_FORMING => {
                            bond.progress = (bond.progress + FIXED_DT / param.formation_time).min(1.0);
                            if bond.progress >= 1.0 {
                                bond.state = BOND_STABLE;
                                bond.stress_clock = 0.0;
                                completed = true;
                            }
                        }
                        BOND_STABLE => {
                            if strain.abs() >= param.strain_on || excitation >= param.excitation_break {
                                bond.state = BOND_STRESSED;
                                bond.stress_clock = 0.0;
                                pending_events.push(Event {
                                    kind: EVENT_BOND_STRESSED,
                                    a: a_index as i32,
                                    b: b_index as i32,
                                    x: midpoint.0,
                                    y: midpoint.1,
                                    magnitude: strain.abs().max(excitation / param.excitation_break),
                                    age: 0.0,
                                    lifetime: 1.4,
                                    energy: excitation,
                                    wall_id: 0,
                                });
                            }
                        }
                        BOND_STRESSED => {
                            if strain.abs() < 0.62 * param.strain_on
                                && excitation < 0.68 * param.excitation_break
                            {
                                bond.state = BOND_STABLE;
                                bond.stress_clock = 0.0;
                            } else {
                                let severe = strain.abs() >= param.strain_break
                                    || excitation >= param.excitation_break;
                                bond.stress_clock += if severe { 2.4 * FIXED_DT } else { FIXED_DT };
                                if bond.stress_clock >= 0.22 {
                                    bond.state = BOND_BREAKING;
                                    bond.stress_clock = 0.0;
                                    started_breaking = true;
                                }
                            }
                        }
                        BOND_BREAKING => {
                            bond.progress = (bond.progress - FIXED_DT / 0.30).max(0.0);
                            if bond.progress <= 0.0 { broken = true; }
                        }
                        _ => { bond.state = BOND_BREAKING; }
                    }
                }
            }

            if completed {
                self.ledger.formation_release += param.dissociation_energy;
                self.atoms[a_index].excitation += 0.10 * param.dissociation_energy;
                self.atoms[b_index].excitation += 0.10 * param.dissociation_energy;
                pending_events.push(Event {
                    kind: EVENT_BOND_FORMED,
                    a: a_index as i32,
                    b: b_index as i32,
                    x: midpoint.0,
                    y: midpoint.1,
                    magnitude: param.order as f64,
                    age: 0.0,
                    lifetime: 1.8,
                    energy: param.dissociation_energy,
                    wall_id: 0,
                });
                pending_events.push(Event {
                    kind: EVENT_ENERGY,
                    a: a_index as i32,
                    b: b_index as i32,
                    x: midpoint.0,
                    y: midpoint.1,
                    magnitude: param.dissociation_energy,
                    age: 0.0,
                    lifetime: 1.6,
                    energy: param.dissociation_energy,
                    wall_id: 0,
                });
            }
            if started_breaking {
                pending_events.push(Event {
                    kind: EVENT_BOND_STRESSED,
                    a: a_index as i32,
                    b: b_index as i32,
                    x: midpoint.0,
                    y: midpoint.1,
                    magnitude: 1.5,
                    age: 0.0,
                    lifetime: 1.4,
                    energy: excitation,
                    wall_id: 0,
                });
            }
            if broken {
                self.ledger.breaking_absorption += param.dissociation_energy;
                self.atoms[a_index].excitation = (self.atoms[a_index].excitation - 0.5 * param.dissociation_energy).max(0.0);
                self.atoms[b_index].excitation = (self.atoms[b_index].excitation - 0.5 * param.dissociation_energy).max(0.0);
                pending_events.push(Event {
                    kind: EVENT_BOND_BROKEN,
                    a: a_index as i32,
                    b: b_index as i32,
                    x: midpoint.0,
                    y: midpoint.1,
                    magnitude: param.order as f64,
                    age: 0.0,
                    lifetime: 1.8,
                    energy: -param.dissociation_energy,
                    wall_id: 0,
                });
                self.refractory_pairs.push(RefractoryPair {
                    a: a_index.min(b_index),
                    b: a_index.max(b_index),
                    remaining: 3.0,
                });
                removals.push(index);
                continue;
            }

            let scale = self.bonds[index].progress.clamp(0.0, 1.0);
            let extension = distance - param.rest_length;
            let force = scale * (param.stiffness * extension + param.damping * radial_velocity);
            if force.is_finite() {
                self.atoms[a_index].fx += force * nx;
                self.atoms[a_index].fy += force * ny;
                self.atoms[b_index].fx -= force * nx;
                self.atoms[b_index].fy -= force * ny;
            }
            let energy = scale * (-param.dissociation_energy + 0.5 * param.stiffness * extension * extension);
            self.bonds[index].energy = if energy.is_finite() { energy } else { 0.0 };
            self.potential_energy += self.bonds[index].energy;
        }

        self.apply_angular_forces();
        removals.sort_unstable();
        removals.dedup();
        for index in removals.into_iter().rev() { self.bonds.remove(index); }
        for event in pending_events { self.push_event(event); }
    }

    fn apply_grab_force(&mut self, account_pointer_work: bool) {
        let Some(atom_index) = self.grab.as_ref().map(|grab| grab.atom) else { return; };
        if atom_index >= self.atoms.len() { self.grab = None; return; }
        let grab = self.grab.as_mut().expect("grab was checked above");
        let atom = &mut self.atoms[atom_index];
        let dx = grab.target_x - atom.x;
        let dy = grab.target_y - atom.y;
        let force_x = 76.0 * dx - 7.0 * atom.vx;
        let force_y = 76.0 * dy - 7.0 * atom.vy;
        atom.fx += force_x;
        atom.fy += force_y;
        if account_pointer_work {
            let target_dx = grab.target_x - grab.previous_target_x;
            let target_dy = grab.target_y - grab.previous_target_y;
            let work = force_x * target_dx + force_y * target_dy;
            if work.is_finite() { self.ledger.grab_work += work; }
            grab.previous_target_x = grab.target_x;
            grab.previous_target_y = grab.target_y;
        }
    }

    fn apply_angular_forces(&mut self) {
        let mut neighbors = core::mem::take(&mut self.angular_neighbor_scratch);
        neighbors.clear();
        neighbors.resize(self.atoms.len(), [usize::MAX; 2]);
        for bond in &self.bonds {
            if bond.state == BOND_BREAKING || bond.progress < 0.45 { continue; }
            let (oxygen, hydrogen) = if self.atoms.get(bond.a).map(|atom| atom.element) == Some(ELEMENT_O)
                && self.atoms.get(bond.b).map(|atom| atom.element) == Some(ELEMENT_H)
            {
                (bond.a, bond.b)
            } else if self.atoms.get(bond.b).map(|atom| atom.element) == Some(ELEMENT_O)
                && self.atoms.get(bond.a).map(|atom| atom.element) == Some(ELEMENT_H)
            {
                (bond.b, bond.a)
            } else {
                continue;
            };
            let pair = &mut neighbors[oxygen];
            if hydrogen < pair[0] {
                pair[1] = pair[0];
                pair[0] = hydrogen;
            } else if hydrogen != pair[0] && hydrogen < pair[1] {
                pair[1] = hydrogen;
            }
        }

        let target_cos = H_O_H_ANGLE_RADIANS.cos();
        for oxygen in 0..neighbors.len() {
            let [h1, h2] = neighbors[oxygen];
            if h2 == usize::MAX { continue; }
            let r1x = self.atoms[h1].x - self.atoms[oxygen].x;
            let r1y = self.atoms[h1].y - self.atoms[oxygen].y;
            let r2x = self.atoms[h2].x - self.atoms[oxygen].x;
            let r2y = self.atoms[h2].y - self.atoms[oxygen].y;
            let l1 = r1x.hypot(r1y);
            let l2 = r2x.hypot(r2y);
            if l1 <= 1.0e-9 || l2 <= 1.0e-9 { continue; }
            let cos_angle = ((r1x * r2x + r1y * r2y) / (l1 * l2)).clamp(-1.0, 1.0);
            let derivative = H_O_H_ANGLE_STIFFNESS * (cos_angle - target_cos);
            let dcos1x = r2x / (l1 * l2) - cos_angle * r1x / (l1 * l1);
            let dcos1y = r2y / (l1 * l2) - cos_angle * r1y / (l1 * l1);
            let dcos2x = r1x / (l1 * l2) - cos_angle * r2x / (l2 * l2);
            let dcos2y = r1y / (l1 * l2) - cos_angle * r2y / (l2 * l2);
            let f1x = -derivative * dcos1x;
            let f1y = -derivative * dcos1y;
            let f2x = -derivative * dcos2x;
            let f2y = -derivative * dcos2y;
            if [f1x, f1y, f2x, f2y].iter().all(|value| value.is_finite()) {
                self.atoms[h1].fx += f1x;
                self.atoms[h1].fy += f1y;
                self.atoms[h2].fx += f2x;
                self.atoms[h2].fy += f2y;
                self.atoms[oxygen].fx -= f1x + f2x;
                self.atoms[oxygen].fy -= f1y + f2y;
                self.potential_energy += angle_preference_energy(cos_angle.acos());
            }
        }
        neighbors.clear();
        self.angular_neighbor_scratch = neighbors;
    }

    fn integrate_atoms(&mut self) {
        for atom in &mut self.atoms {
            let inverse_mass = 1.0 / atom.param().mass;
            atom.vx += FIXED_DT * atom.fx * inverse_mass;
            atom.vy += FIXED_DT * atom.fy * inverse_mass;
            sanitize_atom(atom);
            atom.x += FIXED_DT * atom.vx;
            atom.y += FIXED_DT * atom.vy;
            if !atom.x.is_finite() || !atom.y.is_finite() {
                atom.x = atom.previous_x;
                atom.y = atom.previous_y;
                atom.vx = 0.0;
                atom.vy = 0.0;
                atom.flags |= 1;
            }
        }
    }

    fn resolve_wall_collisions(&mut self) {
        let (left, right, top, bottom) = self.container_bounds();
        let velocities = [
            self.wall_velocity(0), self.wall_velocity(1),
            self.wall_velocity(2), self.wall_velocity(3),
        ];
        let mut impacts = Vec::new();
        for index in 0..self.atoms.len() {
            let radius = self.atoms[index].param().radius;
            let mass = self.atoms[index].param().mass;
            let mut atom_impacts = Vec::new();
            {
                let atom = &mut self.atoms[index];
                if atom.x - radius < left {
                    atom.x = left + radius;
                    let relative = atom.vx - velocities[0];
                    if relative < 0.0 {
                        let impulse = mass * 1.86 * -relative;
                        atom.vx = velocities[0] - 0.86 * relative;
                        atom_impacts.push((0_u8, impulse));
                    }
                }
                if atom.x + radius > right {
                    atom.x = right - radius;
                    let relative = atom.vx - velocities[1];
                    if relative > 0.0 {
                        let impulse = mass * 1.86 * relative;
                        atom.vx = velocities[1] - 0.86 * relative;
                        atom_impacts.push((1_u8, impulse));
                    }
                }
                if atom.y - radius < top {
                    atom.y = top + radius;
                    let relative = atom.vy - velocities[2];
                    if relative < 0.0 {
                        let impulse = mass * 1.86 * -relative;
                        atom.vy = velocities[2] - 0.86 * relative;
                        atom_impacts.push((2_u8, impulse));
                    }
                }
                if atom.y + radius > bottom {
                    atom.y = bottom - radius;
                    let relative = atom.vy - velocities[3];
                    if relative > 0.0 {
                        let impulse = mass * 1.86 * relative;
                        atom.vy = velocities[3] - 0.86 * relative;
                        atom_impacts.push((3_u8, impulse));
                    }
                }
                sanitize_atom(atom);
            }
            let x = self.atoms[index].x;
            let y = self.atoms[index].y;
            for (edge, impulse) in atom_impacts { impacts.push((index, edge, impulse, x, y)); }
        }
        for (atom, edge, impulse, x, y) in impacts {
            if let Some(wall_index) = self.walls.iter().position(|wall| wall.edge == edge) {
                self.walls[wall_index].load += 0.08 * impulse / FIXED_DT;
                self.walls[wall_index].impact += 0.035 * impulse;
                self.ledger.wall_work += impulse * self.walls[wall_index].velocity.abs();
                self.push_event(Event {
                    kind: EVENT_WALL,
                    a: atom as i32,
                    b: -1,
                    x,
                    y,
                    magnitude: impulse,
                    age: 0.0,
                    lifetime: 1.2,
                    energy: 0.5 * impulse * impulse / self.atoms[atom].param().mass,
                    wall_id: self.walls[wall_index].id,
                });
            }
        }
    }

    pub(crate) fn resolve_atom_collisions_and_form_bonds(&mut self) {
        let mut pairs = self.neighbor_pairs();
        let mut bonded: Vec<(usize, usize)> = self.bonds.iter()
            .map(|bond| (bond.a.min(bond.b), bond.a.max(bond.b)))
            .collect();
        bonded.sort_unstable();
        let occupied_valence = self.valence_usage();
        let mut candidates = Vec::new();
        let mut encounters = Vec::new();
        let mut collision_events = Vec::new();

        for &(a_index, b_index) in &pairs {
            let key = (a_index.min(b_index), a_index.max(b_index));
            if bonded.binary_search(&key).is_ok() || self.is_refractory(a_index, b_index) { continue; }
            let Some(param) = pair_param(self.atoms[a_index].element, self.atoms[b_index].element) else { continue; };
            let dx = self.atoms[b_index].x - self.atoms[a_index].x;
            let dy = self.atoms[b_index].y - self.atoms[a_index].y;
            let distance = dx.hypot(dy);
            if !distance.is_finite() || distance > param.capture_distance { continue; }
            let (nx, ny) = if distance > 1.0e-12 {
                (dx / distance, dy / distance)
            } else {
                deterministic_direction(self.atoms[a_index].id, self.atoms[b_index].id)
            };
            let relative_normal = (self.atoms[b_index].vx - self.atoms[a_index].vx) * nx
                + (self.atoms[b_index].vy - self.atoms[a_index].vy) * ny;
            let closing = (-relative_normal).max(0.0);
            let mass_a = self.atoms[a_index].param().mass;
            let mass_b = self.atoms[b_index].param().mass;
            let reduced_mass = mass_a * mass_b / (mass_a + mass_b);
            let collision_energy = 0.5 * reduced_mass * closing * closing;
            let excitation = 0.5 * (self.atoms[a_index].excitation + self.atoms[b_index].excitation);
            let activation = collision_energy + excitation;
            let contact = self.atoms[a_index].param().radius + self.atoms[b_index].param().radius;
            let mut collided = false;

            if distance < contact {
                collided = true;
                let inverse_a = 1.0 / mass_a;
                let inverse_b = 1.0 / mass_b;
                let inverse_sum = inverse_a + inverse_b;
                let overlap = contact - distance;
                {
                    let (a, b) = two_atoms_mut(&mut self.atoms, a_index, b_index);
                    a.x -= nx * overlap * inverse_a / inverse_sum;
                    a.y -= ny * overlap * inverse_a / inverse_sum;
                    b.x += nx * overlap * inverse_b / inverse_sum;
                    b.y += ny * overlap * inverse_b / inverse_sum;
                    if relative_normal < 0.0 {
                        let impulse = -(1.0 + 0.90) * relative_normal / inverse_sum;
                        a.vx -= impulse * inverse_a * nx;
                        a.vy -= impulse * inverse_a * ny;
                        b.vx += impulse * inverse_b * nx;
                        b.vy += impulse * inverse_b * ny;
                        collision_events.push((
                            a_index,
                            b_index,
                            0.5 * (a.x + b.x),
                            0.5 * (a.y + b.y),
                            impulse,
                            collision_energy,
                        ));
                    }
                }
            }

            let close_encounter = distance <= contact + 1.5;
            let excitation_capture = excitation >= param.activation_barrier && distance <= param.capture_distance;
            let valence_available = occupied_valence[a_index].saturating_add(param.order)
                    <= self.atoms[a_index].param().valence
                && occupied_valence[b_index].saturating_add(param.order)
                    <= self.atoms[b_index].param().valence;
            if activation >= param.activation_barrier && closing > 0.05 && (collided || close_encounter)
            {
                let priority = activation + 2.0 * param.dissociation_energy / param.order as f64;
                candidates.push(FormationCandidate { a: a_index, b: b_index, activation, priority });
            } else if excitation_capture && valence_available && !close_encounter {
                let priority = 2.0 * param.dissociation_energy / param.order as f64 - distance;
                encounters.push(ActivatedEncounter {
                    a: a_index,
                    b: b_index,
                    distance,
                    priority,
                    nx,
                    ny,
                });
            }
        }
        pairs.clear();
        self.neighbor_pair_scratch = pairs;

        for (a, b, x, y, impulse, energy) in collision_events {
            self.collision_count = self.collision_count.saturating_add(1);
            self.push_event(Event {
                kind: EVENT_COLLISION,
                a: a as i32,
                b: b as i32,
                x,
                y,
                magnitude: impulse,
                age: 0.0,
                lifetime: 1.2,
                energy,
                wall_id: 0,
            });
        }

        encounters.sort_by(|first, second| {
            second.priority.total_cmp(&first.priority)
                .then_with(|| first.distance.total_cmp(&second.distance))
                .then_with(|| (first.a, first.b).cmp(&(second.a, second.b)))
        });
        let mut encounter_usage = occupied_valence.clone();
        for encounter in encounters {
            let Some(param) = pair_param(
                self.atoms[encounter.a].element,
                self.atoms[encounter.b].element,
            ) else {
                continue;
            };
            if encounter_usage[encounter.a].saturating_add(param.order)
                    > self.atoms[encounter.a].param().valence
                || encounter_usage[encounter.b].saturating_add(param.order)
                    > self.atoms[encounter.b].param().valence
            {
                continue;
            }
            encounter_usage[encounter.a] += param.order;
            encounter_usage[encounter.b] += param.order;
            self.steer_activated_encounter(encounter);
        }

        candidates.sort_by(|first, second| {
            second.priority.total_cmp(&first.priority)
                .then_with(|| second.activation.total_cmp(&first.activation))
                .then_with(|| (first.a, first.b).cmp(&(second.a, second.b)))
        });
        let mut usage = self.valence_usage();
        for candidate in candidates {
            if self.bond_between(candidate.a, candidate.b).is_some() { continue; }
            let Some(param) = pair_param(self.atoms[candidate.a].element, self.atoms[candidate.b].element) else { continue; };
            if usage[candidate.a].saturating_add(param.order) > self.atoms[candidate.a].param().valence
                || usage[candidate.b].saturating_add(param.order) > self.atoms[candidate.b].param().valence
            {
                continue;
            }
            usage[candidate.a] += param.order;
            usage[candidate.b] += param.order;
            self.start_forming_bond(candidate.a, candidate.b, param);
        }
    }

    /// Converts a bounded share of the pair's stored excitation into inward
    /// relative motion. Momentum is conserved and no bond is created here;
    /// formation still requires the atoms to reach a favorable collision.
    fn steer_activated_encounter(&mut self, encounter: ActivatedEncounter) {
        let mass_a = self.atoms[encounter.a].param().mass;
        let mass_b = self.atoms[encounter.b].param().mass;
        let inverse_a = 1.0 / mass_a;
        let inverse_b = 1.0 / mass_b;
        let inverse_sum = inverse_a + inverse_b;
        let reduced_mass = mass_a * mass_b / (mass_a + mass_b);
        let relative = (self.atoms[encounter.b].vx - self.atoms[encounter.a].vx) * encounter.nx
            + (self.atoms[encounter.b].vy - self.atoms[encounter.a].vy) * encounter.ny;
        if relative <= -38.0 {
            return;
        }

        let available = self.atoms[encounter.a].excitation + self.atoms[encounter.b].excitation;
        let usable = (0.90 * available).max(0.0);
        let target_speed = (relative * relative + 2.0 * usable / reduced_mass)
            .sqrt()
            .min(38.0);
        if !target_speed.is_finite() || target_speed <= 0.0 {
            return;
        }
        let target_relative = -target_speed;
        let impulse = (relative - target_relative) / inverse_sum;
        if !impulse.is_finite() || impulse <= 0.0 {
            return;
        }

        let before = 0.5 * mass_a
                * (self.atoms[encounter.a].vx * self.atoms[encounter.a].vx
                    + self.atoms[encounter.a].vy * self.atoms[encounter.a].vy)
            + 0.5 * mass_b
                * (self.atoms[encounter.b].vx * self.atoms[encounter.b].vx
                    + self.atoms[encounter.b].vy * self.atoms[encounter.b].vy);
        {
            let (a, b) = two_atoms_mut(&mut self.atoms, encounter.a, encounter.b);
            a.vx += impulse * inverse_a * encounter.nx;
            a.vy += impulse * inverse_a * encounter.ny;
            b.vx -= impulse * inverse_b * encounter.nx;
            b.vy -= impulse * inverse_b * encounter.ny;
        }
        let after = 0.5 * mass_a
                * (self.atoms[encounter.a].vx * self.atoms[encounter.a].vx
                    + self.atoms[encounter.a].vy * self.atoms[encounter.a].vy)
            + 0.5 * mass_b
                * (self.atoms[encounter.b].vx * self.atoms[encounter.b].vx
                    + self.atoms[encounter.b].vy * self.atoms[encounter.b].vy);
        let converted = (after - before).max(0.0).min(available);
        if converted > 0.0 && available > 0.0 {
            let a_share = self.atoms[encounter.a].excitation / available;
            self.atoms[encounter.a].excitation =
                (self.atoms[encounter.a].excitation - converted * a_share).max(0.0);
            self.atoms[encounter.b].excitation =
                (self.atoms[encounter.b].excitation - converted * (1.0 - a_share)).max(0.0);
        }
    }

    fn start_forming_bond(&mut self, a: usize, b: usize, param: PairParam) {
        let id = self.next_bond_id.max(1);
        self.next_bond_id = id.wrapping_add(1).max(1);
        let (a, b) = (a.min(b), a.max(b));
        let x = 0.5 * (self.atoms[a].x + self.atoms[b].x);
        let y = 0.5 * (self.atoms[a].y + self.atoms[b].y);
        self.bonds.push(Bond {
            id,
            a,
            b,
            order: param.order,
            state: BOND_FORMING,
            progress: 0.02,
            strain: 0.0,
            energy: 0.0,
            rest_length: param.rest_length,
            age: 0.0,
            stress_clock: 0.0,
        });
        self.push_event(Event {
            kind: EVENT_BOND_FORMING,
            a: a as i32,
            b: b as i32,
            x,
            y,
            magnitude: param.order as f64,
            age: 0.0,
            lifetime: 1.4,
            energy: 0.0,
            wall_id: 0,
        });
    }

    fn neighbor_pairs(&mut self) -> Vec<(usize, usize)> {
        let mut pairs = core::mem::take(&mut self.neighbor_pair_scratch);
        pairs.clear();
        if self.atoms.len() < 2 { return pairs; }
        let mut entries = core::mem::take(&mut self.cell_entry_scratch);
        entries.clear();
        if entries.capacity() < self.atoms.len() { entries.reserve(self.atoms.len()); }
        for (index, atom) in self.atoms.iter().enumerate() {
            entries.push(CellEntry {
                cx: cell_coordinate(atom.x),
                cy: cell_coordinate(atom.y),
                index,
            });
        }
        entries.sort_unstable();
        let estimated_pairs = self.atoms.len().saturating_mul(8);
        if pairs.capacity() < estimated_pairs { pairs.reserve(estimated_pairs); }
        for entry in &entries {
            for oy in -1..=1 {
                for ox in -1..=1 {
                    let cx = entry.cx.saturating_add(ox);
                    let cy = entry.cy.saturating_add(oy);
                    let start = entries.partition_point(|candidate| (candidate.cx, candidate.cy) < (cx, cy));
                    let end = entries.partition_point(|candidate| (candidate.cx, candidate.cy) <= (cx, cy));
                    for candidate in &entries[start..end] {
                        if candidate.index > entry.index { pairs.push((entry.index, candidate.index)); }
                    }
                }
            }
        }
        self.cell_entry_scratch = entries;
        pairs
    }

    fn valence_usage(&self) -> Vec<u8> {
        let mut usage = vec![0_u8; self.atoms.len()];
        for bond in &self.bonds {
            if bond.progress <= 0.0 || bond.a >= usage.len() || bond.b >= usage.len() { continue; }
            usage[bond.a] = usage[bond.a].saturating_add(bond.order);
            usage[bond.b] = usage[bond.b].saturating_add(bond.order);
        }
        usage
    }

    fn bond_between(&self, a: usize, b: usize) -> Option<usize> {
        let key = (a.min(b), a.max(b));
        self.bonds.iter().position(|bond| (bond.a.min(bond.b), bond.a.max(bond.b)) == key)
    }

    fn is_refractory(&self, a: usize, b: usize) -> bool {
        let key = (a.min(b), a.max(b));
        self.refractory_pairs.iter().any(|pair| (pair.a, pair.b) == key)
    }

    fn wall_velocity(&self, edge: u8) -> f64 {
        self.walls.iter().find(|wall| wall.edge == edge).map_or(0.0, |wall| wall.velocity)
    }

    pub(crate) fn container_bounds(&self) -> (f64, f64, f64, f64) {
        let left = self.walls.iter().find(|wall| wall.edge == 0).map_or(CONTAINER_LEFT, |wall| wall.position);
        let right = self.walls.iter().find(|wall| wall.edge == 1).map_or(CONTAINER_RIGHT, |wall| wall.position);
        let top = self.walls.iter().find(|wall| wall.edge == 2).map_or(CONTAINER_TOP, |wall| wall.position);
        let bottom = self.walls.iter().find(|wall| wall.edge == 3).map_or(CONTAINER_BOTTOM, |wall| wall.position);
        (left, right, top, bottom)
    }

    pub fn kinetic_energy(&self) -> f64 {
        self.atoms.iter().map(|atom| {
            0.5 * atom.param().mass * (atom.vx * atom.vx + atom.vy * atom.vy)
        }).sum()
    }

    #[cfg(test)]
    pub fn total_momentum(&self) -> (f64, f64) {
        self.atoms.iter().fold((0.0, 0.0), |(px, py), atom| {
            let mass = atom.param().mass;
            (px + mass * atom.vx, py + mass * atom.vy)
        })
    }

    #[cfg(test)]
    pub fn water_like_oxygen_count(&self) -> usize {
        (0..self.atoms.len()).filter(|&oxygen| {
            if self.atoms[oxygen].element != ELEMENT_O { return false; }
            let hydrogen_bonds = self.bonds.iter().filter(|bond| {
                if bond.state == BOND_BREAKING || bond.progress < 0.78 { return false; }
                let other = if bond.a == oxygen { Some(bond.b) }
                    else if bond.b == oxygen { Some(bond.a) } else { None };
                other.and_then(|index| self.atoms.get(index)).map(|atom| atom.element) == Some(ELEMENT_H)
            }).count();
            hydrogen_bonds == 2
        }).count()
    }

    #[cfg(test)]
    pub fn element_count(&self, element: u8) -> usize {
        self.atoms.iter().filter(|atom| atom.element == element).count()
    }

    fn push_event(&mut self, event: Event) {
        if self.events.len() >= EVENT_CAPACITY { self.events.pop_front(); }
        self.events.push_back(event);
    }

    pub fn refresh(&mut self) {
        self.pack_atom_view();
        self.pack_bond_view();
        self.pack_wall_view();
        self.pack_event_view();
        self.pack_stats_view();
    }

    fn pack_atom_view(&mut self) {
        let usage = self.valence_usage();
        let grabbed = self.grab.as_ref().map(|grab| grab.atom);
        self.atom_view.clear();
        self.atom_view.reserve(self.atoms.len() * ATOM_STRIDE);
        for (index, atom) in self.atoms.iter().enumerate() {
            let param = atom.param();
            let kinetic = 0.5 * param.mass * (atom.vx * atom.vx + atom.vy * atom.vy);
            self.atom_view.extend_from_slice(&[
                atom.id as f32,
                atom.element as f32,
                atom.x as f32,
                atom.y as f32,
                atom.previous_x as f32,
                atom.previous_y as f32,
                atom.vx as f32,
                atom.vy as f32,
                param.radius as f32,
                atom.excitation as f32,
                (grabbed == Some(index)) as u8 as f32,
                usage[index] as f32,
                atom.flags as f32,
                kinetic as f32,
                atom.age as f32,
                0.0,
            ]);
        }
    }

    fn pack_bond_view(&mut self) {
        self.bond_view.clear();
        self.bond_view.reserve(self.bonds.len() * BOND_STRIDE);
        for bond in &self.bonds {
            self.bond_view.extend_from_slice(&[
                bond.id as f32,
                bond.a as f32,
                bond.b as f32,
                bond.order as f32,
                bond.state as f32,
                bond.progress as f32,
                bond.strain as f32,
                bond.energy as f32,
                bond.rest_length as f32,
                bond.age as f32,
            ]);
        }
    }

    fn pack_wall_view(&mut self) {
        self.wall_view.clear();
        self.wall_view.reserve(self.walls.len() * WALL_STRIDE);
        for wall in &self.walls {
            self.wall_view.extend_from_slice(&[
                wall.id as f32,
                wall.edge as f32,
                wall.position as f32,
                wall.start as f32,
                wall.end as f32,
                wall.velocity as f32,
                wall.load as f32,
                wall.impact as f32,
                wall.target as f32,
                wall.movable as u8 as f32,
            ]);
        }
    }

    fn pack_event_view(&mut self) {
        self.event_view.clear();
        self.event_view.reserve(self.events.len() * EVENT_STRIDE);
        for event in &self.events {
            self.event_view.extend_from_slice(&[
                event.kind as f32,
                event.a as f32,
                event.b as f32,
                event.x as f32,
                event.y as f32,
                event.magnitude as f32,
                event.age as f32,
                event.lifetime as f32,
                event.energy as f32,
                event.wall_id as f32,
            ]);
        }
    }

    fn pack_stats_view(&mut self) {
        let kinetic = self.kinetic_energy();
        let excitation: f64 = self.atoms.iter().map(|atom| atom.excitation).sum();
        let rms_speed = if self.atoms.is_empty() { 0.0 } else {
            (self.atoms.iter().map(|atom| atom.vx * atom.vx + atom.vy * atom.vy).sum::<f64>()
                / self.atoms.len() as f64).sqrt()
        };
        let pressure = self.walls.iter().map(|wall| wall.load).sum::<f64>() / 4.0;
        let ledger_total = self.ledger.thermal_exchange + self.ledger.formation_release
            - self.ledger.breaking_absorption + self.ledger.grab_work + self.ledger.wall_work;
        self.stats_view.copy_from_slice(&[
            self.simulated_time,
            FIXED_DT,
            self.temperature_u,
            target_temperature(self.temperature_u),
            rms_speed,
            kinetic,
            self.potential_energy,
            kinetic + self.potential_energy + excitation,
            self.ledger.thermal_exchange,
            self.ledger.formation_release,
            self.ledger.breaking_absorption,
            self.ledger.grab_work,
            self.ledger.wall_work,
            self.atoms.len() as f64,
            self.bonds.len() as f64,
            self.events.len() as f64,
            self.seed as f64,
            self.completed_steps as f64,
            self.playing as u8 as f64,
            MAX_ATOMS as f64,
            self.rejected_ingredients as f64,
            self.experiment as f64,
            MODEL_VERSION as f64,
            ABI_VERSION as f64,
            self.spark_count as f64,
            self.collision_count as f64,
            pressure,
            ledger_total,
        ]);
    }

    pub fn atoms_ptr(&self) -> *const f32 { view_ptr(&self.atom_view) }
    pub fn atoms_len(&self) -> usize { self.atom_view.len() }
    pub fn bonds_ptr(&self) -> *const f32 { view_ptr(&self.bond_view) }
    pub fn bonds_len(&self) -> usize { self.bond_view.len() }
    pub fn walls_ptr(&self) -> *const f32 { view_ptr(&self.wall_view) }
    pub fn walls_len(&self) -> usize { self.wall_view.len() }
    pub fn events_ptr(&self) -> *const f32 { view_ptr(&self.event_view) }
    pub fn events_len(&self) -> usize { self.event_view.len() }
    pub fn stats_ptr(&self) -> *const f64 { self.stats_view.as_ptr() }
    pub fn stats_len(&self) -> usize { self.stats_view.len() }
}

fn default_walls() -> Vec<Wall> {
    vec![
        Wall { id: 1, edge: 0, position: CONTAINER_LEFT, start: CONTAINER_TOP, end: CONTAINER_BOTTOM, velocity: 0.0, load: 0.0, impact: 0.0, target: CONTAINER_LEFT, movable: false },
        Wall { id: 2, edge: 1, position: CONTAINER_RIGHT, start: CONTAINER_TOP, end: CONTAINER_BOTTOM, velocity: 0.0, load: 0.0, impact: 0.0, target: CONTAINER_RIGHT, movable: true },
        Wall { id: 3, edge: 2, position: CONTAINER_TOP, start: CONTAINER_LEFT, end: CONTAINER_RIGHT, velocity: 0.0, load: 0.0, impact: 0.0, target: CONTAINER_TOP, movable: false },
        Wall { id: 4, edge: 3, position: CONTAINER_BOTTOM, start: CONTAINER_LEFT, end: CONTAINER_RIGHT, velocity: 0.0, load: 0.0, impact: 0.0, target: CONTAINER_BOTTOM, movable: false },
    ]
}

#[inline]
fn valid_coordinate(value: f64) -> bool {
    value.is_finite() && value.abs() <= WORLD_LIMIT
}

#[inline]
fn cell_coordinate(value: f64) -> i32 {
    let cell = (value / NEIGHBOR_CELL).floor();
    if cell <= i32::MIN as f64 { i32::MIN }
    else if cell >= i32::MAX as f64 { i32::MAX }
    else { cell as i32 }
}

#[inline]
fn sanitize_atom(atom: &mut Atom) {
    if !atom.vx.is_finite() || !atom.vy.is_finite() {
        atom.vx = 0.0;
        atom.vy = 0.0;
        atom.flags |= 1;
        return;
    }
    let speed = atom.vx.hypot(atom.vy);
    if speed > MAX_SPEED {
        let scale = MAX_SPEED / speed;
        atom.vx *= scale;
        atom.vy *= scale;
        atom.flags |= 2;
    }
}

fn two_atoms_mut(atoms: &mut [Atom], a: usize, b: usize) -> (&mut Atom, &mut Atom) {
    debug_assert_ne!(a, b);
    if a < b {
        let (left, right) = atoms.split_at_mut(b);
        (&mut left[a], &mut right[0])
    } else {
        let (left, right) = atoms.split_at_mut(a);
        (&mut right[0], &mut left[b])
    }
}

#[inline]
fn view_ptr(values: &[f32]) -> *const f32 {
    if values.is_empty() { core::ptr::null() } else { values.as_ptr() }
}
