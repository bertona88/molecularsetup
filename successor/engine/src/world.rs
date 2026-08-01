use std::collections::VecDeque;

use crate::model::{
    cutoff_switch, insertion_weight, target_temperature, ElementParam, Rng, ABI_VERSION,
    ELEMENTS, FIXED_DT, MAX_ATOMS, MAX_SPEED, MODEL_VERSION, PAIR_CUTOFF, SPECIES,
};

const ATOM_STRIDE: usize = 16;
const BOND_STRIDE: usize = 6;
const BOUNDARY_STRIDE: usize = 11;
const EVENT_STRIDE: usize = 8;
const STATS_STRIDE: usize = 21;
const EVENT_LIFETIME: f64 = 0.72;
const MIN_BOUNDARY_SIZE: f64 = 1.0e-6;
const WORLD_LIMIT: f64 = 1.0e9;

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
    pub charge: f64,
    pub coordination: f64,
    pub boundary_id: u32,
    pub age: f64,
    pub flags: u32,
}

impl Atom {
    #[inline]
    pub fn param(&self) -> ElementParam { ELEMENTS[self.element as usize] }
}

#[derive(Clone, Debug)]
pub struct Boundary {
    pub id: u32,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub impact: f64,
    pub loads: [f64; 4],
}

impl Boundary {
    #[inline]
    fn contains(&self, x: f64, y: f64) -> bool {
        x >= self.x && x <= self.x + self.width && y >= self.y && y <= self.y + self.height
    }
}

#[derive(Clone, Debug)]
struct SpawnRequest {
    species: u8,
    remaining: u32,
    next: u32,
    x: f64,
    y: f64,
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
    boundary_id: u32,
}

#[derive(Clone, Debug)]
struct PairSample {
    i: usize,
    j: usize,
    ux: f64,
    uy: f64,
    base_energy: f64,
    base_derivative: f64,
    order: f64,
    order_derivative: f64,
    well: f64,
    strain: f64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd)]
struct CellEntry {
    cx: i32,
    cy: i32,
    index: usize,
}

#[derive(Clone, Debug)]
pub struct DerivedBond {
    pub a: usize,
    pub b: usize,
    pub order: f64,
    pub strain: f64,
    pub well: f64,
}

#[derive(Debug)]
pub struct World {
    pub seed: u32,
    pub playing: bool,
    pub temperature_u: f64,
    pub thermostat_gamma: f64,
    pub simulated_time: f64,
    pub completed_steps: u64,
    pub thermostat_heat: f64,
    pub boundary_work: f64,
    pub rejected_molecules: u64,
    pub potential_energy: f64,
    accumulator: f64,
    pending_atoms: usize,
    next_boundary_id: u32,
    rng: Rng,
    queue: VecDeque<SpawnRequest>,
    pub atoms: Vec<Atom>,
    pub boundaries: Vec<Boundary>,
    events: Vec<Event>,
    pub derived_bonds: Vec<DerivedBond>,
    previous_bonds: Vec<(usize, usize)>,
    atom_view: Vec<f32>,
    bond_view: Vec<f32>,
    boundary_view: Vec<f32>,
    event_view: Vec<f32>,
    stats_view: Vec<f64>,
}

impl World {
    pub fn new(seed: u32) -> Self {
        let mut world = Self {
            seed,
            playing: true,
            temperature_u: 0.36,
            thermostat_gamma: 1.5,
            simulated_time: 0.0,
            completed_steps: 0,
            thermostat_heat: 0.0,
            boundary_work: 0.0,
            rejected_molecules: 0,
            potential_energy: 0.0,
            accumulator: 0.0,
            pending_atoms: 0,
            next_boundary_id: 1,
            rng: Rng::new(seed),
            queue: VecDeque::new(),
            atoms: Vec::new(),
            boundaries: Vec::new(),
            events: Vec::new(),
            derived_bonds: Vec::new(),
            previous_bonds: Vec::new(),
            atom_view: Vec::new(),
            bond_view: Vec::new(),
            boundary_view: Vec::new(),
            event_view: Vec::new(),
            stats_view: vec![0.0; STATS_STRIDE],
        };
        world.refresh();
        world
    }

    #[inline]
    pub fn pending_molecules(&self) -> u64 {
        self.queue.iter().map(|request| request.remaining as u64).sum()
    }

    pub fn set_playing(&mut self, value: bool) { self.playing = value; self.refresh(); }

    pub fn set_temperature(&mut self, value: f64) {
        if value.is_finite() { self.temperature_u = value.clamp(0.0, 1.0); }
        self.refresh();
    }

    pub fn set_gamma(&mut self, value: f64) {
        if value.is_finite() { self.thermostat_gamma = value.max(0.0); }
        self.refresh();
    }

    pub fn enqueue_spawn(&mut self, species: u32, count: u32, x: f64, y: f64) -> u32 {
        let Some(template) = SPECIES.get(species as usize) else {
            self.rejected_molecules = self.rejected_molecules.saturating_add(count as u64);
            self.refresh();
            return 0;
        };
        if !valid_world_coordinate(x) || !valid_world_coordinate(y) {
            self.rejected_molecules = self.rejected_molecules.saturating_add(count as u64);
            self.refresh();
            return 0;
        }
        let atoms_per = template.atoms.len();
        let remaining_capacity = MAX_ATOMS.saturating_sub(self.atoms.len().saturating_add(self.pending_atoms));
        let accepted = count.min((remaining_capacity / atoms_per) as u32);
        if accepted != 0 {
            self.queue.push_back(SpawnRequest { species: species as u8, remaining: accepted, next: 0, x, y });
            self.pending_atoms += accepted as usize * atoms_per;
        }
        self.rejected_molecules = self.rejected_molecules.saturating_add((count - accepted) as u64);
        self.refresh();
        accepted
    }

    pub fn flush_spawns(&mut self, limit: u32) -> u32 {
        let mut made = 0;
        while made < limit {
            let Some(mut request) = self.queue.pop_front() else { break; };
            self.materialize_molecule(&request);
            let atom_count = SPECIES[request.species as usize].atoms.len();
            self.pending_atoms = self.pending_atoms.saturating_sub(atom_count);
            request.remaining -= 1;
            request.next += 1;
            made += 1;
            if request.remaining != 0 { self.queue.push_front(request); }
        }
        if made != 0 { self.compute_forces(); }
        self.refresh();
        made
    }

    fn materialize_molecule(&mut self, request: &SpawnRequest) {
        let template = SPECIES[request.species as usize];
        let k = request.next as f64;
        let angle = k * 2.399_963_229_728_653 + self.rng.uniform() * 0.08;
        let radius = if request.next == 0 { 0.0 } else { 34.0 * k.sqrt() };
        let center_x = (request.x + radius * angle.cos()).clamp(-WORLD_LIMIT + 32.0, WORLD_LIMIT - 32.0);
        let center_y = (request.y + radius * angle.sin()).clamp(-WORLD_LIMIT + 32.0, WORLD_LIMIT - 32.0);
        let rotation = self.rng.uniform() * core::f64::consts::TAU;
        let (sin_r, cos_r) = rotation.sin_cos();
        let boundary_id = self.boundaries.iter().find(|b| b.contains(center_x, center_y)).map_or(0, |b| b.id);
        let target_t = target_temperature(self.temperature_u);
        let drift_x = self.rng.normal() * (target_t / 8.0).sqrt();
        let drift_y = self.rng.normal() * (target_t / 8.0).sqrt();
        for source in template.atoms {
            let dx = cos_r * source.x - sin_r * source.y;
            let dy = sin_r * source.x + cos_r * source.y;
            let p = ELEMENTS[source.element as usize];
            let thermal = (target_t / p.mass).sqrt();
            let atom = Atom {
                id: (self.atoms.len() + 1) as u32,
                element: source.element,
                x: center_x + dx,
                y: center_y + dy,
                previous_x: center_x + dx,
                previous_y: center_y + dy,
                vx: drift_x + 0.15 * thermal * self.rng.normal(),
                vy: drift_y + 0.15 * thermal * self.rng.normal(),
                fx: 0.0,
                fy: 0.0,
                charge: source.charge,
                coordination: 0.0,
                boundary_id,
                age: 0.0,
                flags: 0,
            };
            self.atoms.push(atom);
        }
        // A molecule whose center is contained is wholly assigned and made valid.
        if boundary_id != 0 {
            let start = self.atoms.len() - template.atoms.len();
            for i in start..self.atoms.len() { self.constrain_atom(i, false); }
        }
    }

    fn pair_samples(&self) -> Vec<PairSample> {
        if self.atoms.len() < 2 { return Vec::new(); }
        let mut entries = Vec::with_capacity(self.atoms.len());
        for (index, atom) in self.atoms.iter().enumerate() {
            let cx = cell_coordinate(atom.x);
            let cy = cell_coordinate(atom.y);
            entries.push(CellEntry { cx, cy, index });
        }
        entries.sort_unstable();

        let mut pairs = Vec::with_capacity(self.atoms.len().saturating_mul(8));
        let cutoff2 = PAIR_CUTOFF * PAIR_CUTOFF;
        for entry in &entries {
            let a = &self.atoms[entry.index];
            for oy in -1..=1 {
                for ox in -1..=1 {
                    let cx = entry.cx.saturating_add(ox);
                    let cy = entry.cy.saturating_add(oy);
                    let start = entries.partition_point(|candidate| (candidate.cx, candidate.cy) < (cx, cy));
                    let end = entries.partition_point(|candidate| (candidate.cx, candidate.cy) <= (cx, cy));
                    for candidate in &entries[start..end] {
                        if candidate.index <= entry.index { continue; }
                        let b = &self.atoms[candidate.index];
                        let dx = b.x - a.x;
                        let dy = b.y - a.y;
                        let r2 = dx * dx + dy * dy;
                        if !r2.is_finite() || r2 >= cutoff2 { continue; }
                        let r = r2.sqrt();
                        let (ux, uy) = if r > 1.0e-14 { (dx / r, dy / r) } else { (0.0, 0.0) };
                        let weight = insertion_weight(a.age) * insertion_weight(b.age);
                        let (base_energy, base_derivative, order, order_derivative, well, strain) =
                            pair_model(a, b, r, weight);
                        pairs.push(PairSample {
                            i: entry.index,
                            j: candidate.index,
                            ux,
                            uy,
                            base_energy,
                            base_derivative,
                            order,
                            order_derivative,
                            well,
                            strain,
                        });
                    }
                }
            }
        }
        pairs
    }

    /// Rebuild analytical forces from the single continuous energy function.
    pub fn compute_forces(&mut self) -> f64 {
        for atom in &mut self.atoms {
            atom.fx = 0.0;
            atom.fy = 0.0;
            atom.coordination = 0.0;
        }
        let pairs = self.pair_samples();
        let mut potential = 0.0;
        for pair in &pairs {
            potential += pair.base_energy;
            self.atoms[pair.i].coordination += pair.order;
            self.atoms[pair.j].coordination += pair.order;
        }

        // U_over = k/2 * softplus(coordination - valence - margin)^2.
        // Its derivative is fed back through every continuous pair order.
        const K_OVER: f64 = 4.0;
        const SHARPNESS: f64 = 6.0;
        let mut coordination_gradient = vec![0.0; self.atoms.len()];
        for (i, atom) in self.atoms.iter().enumerate() {
            let z = atom.coordination - atom.param().valence - 0.15;
            let (soft, sigmoid) = softplus_and_sigmoid(z, SHARPNESS);
            potential += 0.5 * K_OVER * soft * soft;
            coordination_gradient[i] = K_OVER * soft * sigmoid;
        }

        for pair in pairs {
            let derivative = pair.base_derivative
                + (coordination_gradient[pair.i] + coordination_gradient[pair.j]) * pair.order_derivative;
            let fx = derivative * pair.ux;
            let fy = derivative * pair.uy;
            if fx.is_finite() && fy.is_finite() {
                self.atoms[pair.i].fx += fx;
                self.atoms[pair.i].fy += fy;
                self.atoms[pair.j].fx -= fx;
                self.atoms[pair.j].fy -= fy;
            }
        }
        self.potential_energy = if potential.is_finite() { potential } else { 0.0 };
        self.potential_energy
    }

    fn kick(&mut self, dt: f64) {
        for atom in &mut self.atoms {
            let inv_mass = 1.0 / atom.param().mass;
            atom.vx += dt * atom.fx * inv_mass;
            atom.vy += dt * atom.fy * inv_mass;
            sanitize_velocity(atom);
        }
    }

    fn drift(&mut self, dt: f64) {
        for i in 0..self.atoms.len() {
            {
                let atom = &mut self.atoms[i];
                atom.x += dt * atom.vx;
                atom.y += dt * atom.vy;
                if !atom.x.is_finite() || !atom.y.is_finite() {
                    atom.x = atom.previous_x;
                    atom.y = atom.previous_y;
                    atom.vx = 0.0;
                    atom.vy = 0.0;
                    atom.flags |= 1;
                }
            }
            self.constrain_atom(i, true);
        }
    }

    fn thermostat_ou(&mut self) {
        let gamma_dt = self.thermostat_gamma * FIXED_DT;
        if gamma_dt <= 0.0 { return; }
        let c = (-gamma_dt).exp();
        let variance_factor = (1.0 - (-2.0 * gamma_dt).exp()).max(0.0);
        let temperature = target_temperature(self.temperature_u);
        let before = self.kinetic_energy();
        for atom in &mut self.atoms {
            let sigma = (variance_factor * temperature / atom.param().mass).sqrt();
            atom.vx = c * atom.vx + sigma * self.rng.normal();
            atom.vy = c * atom.vy + sigma * self.rng.normal();
            sanitize_velocity(atom);
        }
        self.thermostat_heat += self.kinetic_energy() - before;
        if !self.thermostat_heat.is_finite() { self.thermostat_heat = 0.0; }
    }

    fn step_one(&mut self) {
        // Previous position is a full-tick snapshot, including for BAOAB's two A half-steps.
        for atom in &mut self.atoms {
            atom.previous_x = atom.x;
            atom.previous_y = atom.y;
        }
        for event in &mut self.events { event.age += FIXED_DT; }
        self.events.retain(|event| event.age <= EVENT_LIFETIME);
        let decay = (-5.0 * FIXED_DT).exp();
        for boundary in &mut self.boundaries {
            boundary.impact *= decay;
            for load in &mut boundary.loads { *load *= decay; }
        }

        if self.thermostat_gamma == 0.0 {
            // Velocity-Verlet: B(dt/2) A(dt) B(dt/2).
            self.kick(0.5 * FIXED_DT);
            self.drift(FIXED_DT);
            for atom in &mut self.atoms { atom.age += FIXED_DT; }
            self.compute_forces();
            self.kick(0.5 * FIXED_DT);
        } else {
            // BAOAB with the exact fluctuation-dissipation OU substep.
            self.kick(0.5 * FIXED_DT);
            self.drift(0.5 * FIXED_DT);
            self.thermostat_ou();
            self.drift(0.5 * FIXED_DT);
            for atom in &mut self.atoms { atom.age += FIXED_DT; }
            self.compute_forces();
            self.kick(0.5 * FIXED_DT);
        }
        self.simulated_time += FIXED_DT;
        self.completed_steps = self.completed_steps.saturating_add(1);
    }

    pub fn step_fixed(&mut self, count: u32) -> u32 {
        for _ in 0..count { self.step_one(); }
        self.refresh();
        count
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
        // Drop full overrun ticks and retain only the sub-tick fraction.
        self.accumulator %= FIXED_DT;
        if self.accumulator < 0.0 { self.accumulator = 0.0; }
        for _ in 0..steps { self.step_one(); }
        self.refresh();
        steps
    }

    pub fn kinetic_energy(&self) -> f64 {
        self.atoms.iter().map(|atom| {
            0.5 * atom.param().mass * (atom.vx * atom.vx + atom.vy * atom.vy)
        }).sum()
    }

    pub fn mechanical_energy(&self) -> f64 { self.kinetic_energy() + self.potential_energy }

    pub fn create_boundary(&mut self, x: f64, y: f64, width: f64, height: f64) -> u32 {
        if !valid_world_coordinate(x) || !valid_world_coordinate(y) || !width.is_finite() || !height.is_finite()
            || width < MIN_BOUNDARY_SIZE || height < MIN_BOUNDARY_SIZE
            || !valid_world_coordinate(x + width) || !valid_world_coordinate(y + height)
        {
            self.refresh();
            return 0;
        }
        let mut id = self.next_boundary_id.max(1);
        while self.boundaries.iter().any(|boundary| boundary.id == id) {
            id = id.wrapping_add(1).max(1);
        }
        self.next_boundary_id = id.wrapping_add(1).max(1);
        self.boundaries.push(Boundary { id, x, y, width, height, impact: 0.0, loads: [0.0; 4] });
        for atom in &mut self.atoms {
            if atom.boundary_id == 0 && x <= atom.x && atom.x <= x + width && y <= atom.y && atom.y <= y + height {
                atom.boundary_id = id;
            }
        }
        self.refresh();
        id
    }

    pub fn move_boundary_edge(&mut self, id: u32, edge: u32, coordinate: f64) -> u32 {
        if id == 0 || !valid_world_coordinate(coordinate) { self.refresh(); return 0; }
        let Some(index) = self.boundaries.iter().position(|boundary| boundary.id == id) else {
            self.refresh();
            return 0;
        };
        let required_diameter = self.atoms.iter()
            .filter(|atom| atom.boundary_id == id)
            .map(|atom| 2.0 * atom.param().radius)
            .fold(MIN_BOUNDARY_SIZE, f64::max);
        let valid = {
            let boundary = &self.boundaries[index];
            match edge {
                0 => coordinate <= boundary.x + boundary.width - required_diameter,
                1 => coordinate >= boundary.x + required_diameter,
                2 => coordinate <= boundary.y + boundary.height - required_diameter,
                3 => coordinate >= boundary.y + required_diameter,
                _ => false,
            }
        };
        if !valid { self.refresh(); return 0; }
        self.compute_forces();
        let before = self.mechanical_energy();
        {
            let boundary = &mut self.boundaries[index];
            match edge {
                0 => { let right = boundary.x + boundary.width; boundary.x = coordinate; boundary.width = right - coordinate; }
                1 => boundary.width = coordinate - boundary.x,
                2 => { let bottom = boundary.y + boundary.height; boundary.y = coordinate; boundary.height = bottom - coordinate; }
                3 => boundary.height = coordinate - boundary.y,
                _ => unreachable!(),
            }
        }
        for atom_index in 0..self.atoms.len() {
            if self.atoms[atom_index].boundary_id == id { self.constrain_atom(atom_index, false); }
        }
        self.compute_forces();
        let delta = self.mechanical_energy() - before;
        if delta.is_finite() { self.boundary_work += delta; }
        if !self.boundary_work.is_finite() { self.boundary_work = 0.0; }
        self.refresh();
        1
    }

    pub fn remove_boundary(&mut self, id: u32) -> u32 {
        let Some(index) = self.boundaries.iter().position(|boundary| boundary.id == id) else {
            self.refresh();
            return 0;
        };
        self.boundaries.remove(index);
        for atom in &mut self.atoms {
            if atom.boundary_id == id { atom.boundary_id = 0; }
        }
        self.refresh();
        1
    }

    fn constrain_atom(&mut self, atom_index: usize, record_impact: bool) {
        let boundary_id = self.atoms[atom_index].boundary_id;
        if boundary_id == 0 { return; }
        let Some(boundary_index) = self.boundaries.iter().position(|boundary| boundary.id == boundary_id) else {
            self.atoms[atom_index].boundary_id = 0;
            return;
        };
        let (bx, by, bw, bh) = {
            let b = &self.boundaries[boundary_index];
            (b.x, b.y, b.width, b.height)
        };
        let radius = self.atoms[atom_index].param().radius;
        let left = bx + radius;
        let right = bx + bw - radius;
        let top = by + radius;
        let bottom = by + bh - radius;
        let mass = self.atoms[atom_index].param().mass;
        let mut impulses = [0.0_f64; 4];
        let restitution = 0.86;
        {
            let atom = &mut self.atoms[atom_index];
            if left > right {
                atom.x = bx + 0.5 * bw;
                if record_impact { atom.vx = 0.0; }
            } else if atom.x < left {
                atom.x = left;
                if record_impact && atom.vx < 0.0 {
                    impulses[0] = mass * (1.0 + restitution) * -atom.vx;
                    atom.vx = -restitution * atom.vx;
                }
            } else if atom.x > right {
                atom.x = right;
                if record_impact && atom.vx > 0.0 {
                    impulses[1] = mass * (1.0 + restitution) * atom.vx;
                    atom.vx = -restitution * atom.vx;
                }
            }
            if top > bottom {
                atom.y = by + 0.5 * bh;
                if record_impact { atom.vy = 0.0; }
            } else if atom.y < top {
                atom.y = top;
                if record_impact && atom.vy < 0.0 {
                    impulses[2] = mass * (1.0 + restitution) * -atom.vy;
                    atom.vy = -restitution * atom.vy;
                }
            } else if atom.y > bottom {
                atom.y = bottom;
                if record_impact && atom.vy > 0.0 {
                    impulses[3] = mass * (1.0 + restitution) * atom.vy;
                    atom.vy = -restitution * atom.vy;
                }
            }
            sanitize_velocity(atom);
        }
        for (edge, impulse) in impulses.into_iter().enumerate() {
            if impulse <= 0.0 || !impulse.is_finite() { continue; }
            self.boundaries[boundary_index].loads[edge] += impulse / FIXED_DT;
            self.boundaries[boundary_index].impact += 0.04 * impulse;
            let atom = &self.atoms[atom_index];
            self.push_event(Event {
                kind: 3,
                a: atom_index as i32,
                b: -1,
                x: atom.x,
                y: atom.y,
                magnitude: impulse,
                age: 0.0,
                boundary_id,
            });
        }
    }

    fn push_event(&mut self, event: Event) {
        if self.events.len() >= 4096 { self.events.remove(0); }
        self.events.push(event);
    }

    fn rebuild_derived_bonds(&mut self) {
        let mut candidates: Vec<PairSample> = self.pair_samples().into_iter()
            .filter(|pair| pair.order > 0.20)
            .collect();
        candidates.sort_by(|a, b| {
            b.order.total_cmp(&a.order).then_with(|| (a.i, a.j).cmp(&(b.i, b.j)))
        });
        let mut used = vec![0.0_f64; self.atoms.len()];
        let mut derived = Vec::new();
        for pair in candidates {
            let cap_i = (self.atoms[pair.i].param().valence - used[pair.i]).max(0.0);
            let cap_j = (self.atoms[pair.j].param().valence - used[pair.j]).max(0.0);
            let order = pair.order.min(cap_i).min(cap_j);
            if order <= 0.05 { continue; }
            used[pair.i] += order;
            used[pair.j] += order;
            derived.push(DerivedBond { a: pair.i, b: pair.j, order, strain: pair.strain, well: pair.well });
        }
        derived.sort_by_key(|bond| (bond.a, bond.b));
        let current: Vec<(usize, usize)> = derived.iter().map(|bond| (bond.a, bond.b)).collect();
        let previous = self.previous_bonds.clone();
        for bond in &derived {
            if previous.binary_search(&(bond.a, bond.b)).is_err() {
                let (x, y) = {
                    let aa = &self.atoms[bond.a];
                    let bb = &self.atoms[bond.b];
                    (0.5 * (aa.x + bb.x), 0.5 * (aa.y + bb.y))
                };
                self.push_event(Event { kind: 1, a: bond.a as i32, b: bond.b as i32, x, y, magnitude: bond.order, age: 0.0, boundary_id: 0 });
            }
        }
        for &(a, b) in &previous {
            if current.binary_search(&(a, b)).is_err() && a < self.atoms.len() && b < self.atoms.len() {
                let aa = &self.atoms[a];
                let bb = &self.atoms[b];
                self.push_event(Event { kind: 2, a: a as i32, b: b as i32, x: 0.5 * (aa.x + bb.x), y: 0.5 * (aa.y + bb.y), magnitude: 1.0, age: 0.0, boundary_id: 0 });
            }
        }
        self.previous_bonds = current;
        self.derived_bonds = derived;
    }

    pub fn refresh(&mut self) {
        self.rebuild_derived_bonds();
        self.pack_atom_view();
        self.pack_bond_view();
        self.pack_boundary_view();
        self.pack_event_view();
        self.pack_stats_view();
    }

    fn pack_atom_view(&mut self) {
        self.atom_view.clear();
        self.atom_view.reserve(self.atoms.len() * ATOM_STRIDE);
        for atom in &self.atoms {
            let p = atom.param();
            self.atom_view.extend_from_slice(&[
                atom.id as f32, atom.element as f32, atom.x as f32, atom.y as f32,
                atom.previous_x as f32, atom.previous_y as f32, atom.vx as f32, atom.vy as f32,
                atom.fx as f32, atom.fy as f32, atom.charge as f32, p.radius as f32,
                atom.coordination as f32, atom.boundary_id as f32, atom.age as f32, atom.flags as f32,
            ]);
        }
    }

    fn pack_bond_view(&mut self) {
        self.bond_view.clear();
        self.bond_view.reserve(self.derived_bonds.len() * BOND_STRIDE);
        for bond in &self.derived_bonds {
            self.bond_view.extend_from_slice(&[
                bond.a as f32, bond.b as f32, bond.order as f32, bond.strain as f32, bond.well as f32, 0.0,
            ]);
        }
    }

    fn pack_boundary_view(&mut self) {
        self.boundary_view.clear();
        self.boundary_view.reserve(self.boundaries.len() * BOUNDARY_STRIDE);
        for boundary in &self.boundaries {
            let assigned = self.atoms.iter().filter(|atom| atom.boundary_id == boundary.id).count();
            self.boundary_view.extend_from_slice(&[
                boundary.id as f32, boundary.x as f32, boundary.y as f32, boundary.width as f32,
                boundary.height as f32, boundary.impact as f32, boundary.loads[0] as f32,
                boundary.loads[1] as f32, boundary.loads[2] as f32, boundary.loads[3] as f32,
                assigned as f32,
            ]);
        }
    }

    fn pack_event_view(&mut self) {
        self.event_view.clear();
        self.event_view.reserve(self.events.len() * EVENT_STRIDE);
        for event in &self.events {
            self.event_view.extend_from_slice(&[
                event.kind as f32, event.a as f32, event.b as f32, event.x as f32, event.y as f32,
                event.magnitude as f32, event.age as f32, event.boundary_id as f32,
            ]);
        }
    }

    fn pack_stats_view(&mut self) {
        let kinetic = self.kinetic_energy();
        let atom_count = self.atoms.len();
        let pending_molecules = self.pending_molecules();
        self.stats_view.copy_from_slice(&[
            self.simulated_time,
            FIXED_DT,
            self.temperature_u,
            target_temperature(self.temperature_u),
            if atom_count == 0 { 0.0 } else { kinetic / atom_count as f64 },
            kinetic,
            self.potential_energy,
            kinetic + self.potential_energy,
            self.thermostat_heat,
            self.boundary_work,
            atom_count as f64,
            self.derived_bonds.len() as f64,
            self.boundaries.len() as f64,
            pending_molecules as f64,
            self.seed as f64,
            self.completed_steps as f64,
            self.playing as u8 as f64,
            MAX_ATOMS as f64,
            self.rejected_molecules as f64,
            MODEL_VERSION as f64,
            ABI_VERSION as f64,
        ]);
    }

    pub fn atoms_ptr(&self) -> *const f32 { if self.atom_view.is_empty() { core::ptr::null() } else { self.atom_view.as_ptr() } }
    pub fn atoms_len(&self) -> usize { self.atom_view.len() }
    pub fn bonds_ptr(&self) -> *const f32 { if self.bond_view.is_empty() { core::ptr::null() } else { self.bond_view.as_ptr() } }
    pub fn bonds_len(&self) -> usize { self.bond_view.len() }
    pub fn boundaries_ptr(&self) -> *const f32 { if self.boundary_view.is_empty() { core::ptr::null() } else { self.boundary_view.as_ptr() } }
    pub fn boundaries_len(&self) -> usize { self.boundary_view.len() }
    pub fn events_ptr(&self) -> *const f32 { if self.event_view.is_empty() { core::ptr::null() } else { self.event_view.as_ptr() } }
    pub fn events_len(&self) -> usize { self.event_view.len() }
    pub fn stats_ptr(&self) -> *const f64 { self.stats_view.as_ptr() }
    pub fn stats_len(&self) -> usize { self.stats_view.len() }
}

#[inline]
fn cell_coordinate(value: f64) -> i32 {
    let cell = (value / PAIR_CUTOFF).floor();
    if cell <= i32::MIN as f64 { i32::MIN }
    else if cell >= i32::MAX as f64 { i32::MAX }
    else { cell as i32 }
}

#[inline]
fn valid_world_coordinate(value: f64) -> bool {
    value.is_finite() && value.abs() <= WORLD_LIMIT
}

#[inline]
fn softplus_and_sigmoid(z: f64, sharpness: f64) -> (f64, f64) {
    let x = sharpness * z;
    if x > 40.0 { (z, 1.0) }
    else if x < -40.0 { (x.exp() / sharpness, x.exp()) }
    else {
        let ex = x.exp();
        ((1.0 + ex).ln() / sharpness, ex / (1.0 + ex))
    }
}

#[inline]
fn sanitize_velocity(atom: &mut Atom) {
    if !atom.vx.is_finite() || !atom.vy.is_finite() {
        atom.vx = 0.0;
        atom.vy = 0.0;
        atom.flags |= 1;
        return;
    }
    let speed2 = atom.vx * atom.vx + atom.vy * atom.vy;
    // This documented emergency guard is inactive throughout the validated NVE domain.
    if speed2 > MAX_SPEED * MAX_SPEED {
        let scale = MAX_SPEED / speed2.sqrt();
        atom.vx *= scale;
        atom.vy *= scale;
        atom.flags |= 2;
    }
}

/// Returns pair energy, dU/dr, order, d(order)/dr, well depth, and strain.
fn pair_model(a: &Atom, b: &Atom, r: f64, insertion: f64) -> (f64, f64, f64, f64, f64, f64) {
    let pa = a.param();
    let pb = b.param();
    let r0 = pa.covalent_radius + pb.covalent_radius;
    // Effective distance makes every radial term differentiable at coincident coordinates.
    let effective = (r * r + 0.25).sqrt();
    let effective_gradient = if effective > 0.0 { r / effective } else { 0.0 };
    let well = (pa.well * pb.well).sqrt();

    let rho = 0.52 * r0;
    let exp_rep = (-(effective / rho).powi(2)).exp();
    let repulsion = 2.4 * well * exp_rep;
    let d_repulsion = repulsion * (-2.0 * effective / (rho * rho));

    let dispersion_scale = 1.45 * r0;
    let z = (effective / dispersion_scale).powi(6);
    let dispersion = -0.24 * well / (1.0 + z);
    let d_dispersion = 0.24 * well * 6.0 * z / (effective * (1.0 + z) * (1.0 + z));

    let alpha = 0.16;
    let morse_exp = (-alpha * (effective - r0)).exp();
    let morse = well * ((1.0 - morse_exp) * (1.0 - morse_exp) - 1.0);
    let d_morse = 2.0 * well * alpha * (1.0 - morse_exp) * morse_exp;

    let screened = (-0.055 * effective).exp() / effective;
    let coulomb = 18.0 * a.charge * b.charge * screened;
    let d_coulomb = coulomb * (-0.055 - 1.0 / effective);

    let raw = repulsion + dispersion + morse + coulomb;
    let raw_derivative_r = (d_repulsion + d_dispersion + d_morse + d_coulomb) * effective_gradient;
    let (switch, switch_derivative) = cutoff_switch(r);
    let energy = insertion * raw * switch;
    let derivative = insertion * (raw_derivative_r * switch + raw * switch_derivative);

    let amplitude = if pa.valence <= 1.0 || pb.valence <= 1.0 { 1.0 } else { 1.5 };
    let order_width = 0.30 * r0;
    let delta = effective - r0;
    let gaussian = (-(delta * delta) / (order_width * order_width)).exp();
    let raw_order = insertion * amplitude * gaussian;
    let raw_order_derivative = raw_order * (-2.0 * delta / (order_width * order_width)) * effective_gradient;
    let order = raw_order * switch;
    let order_derivative = raw_order_derivative * switch + raw_order * switch_derivative;
    (energy, derivative, order, order_derivative, well, (r - r0) / r0)
}
