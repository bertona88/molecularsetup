use super::*;
use crate::model::{target_temperature, ELEMENTS, PAIR_CUTOFF, SPECIES};
use crate::world::World;

fn spawn_world(seed: u32, species: u32, count: u32) -> World {
    let mut world = World::new(seed);
    assert_eq!(world.enqueue_spawn(species, count, 0.0, 0.0), count);
    assert_eq!(world.flush_spawns(count), count);
    for atom in &mut world.atoms { atom.age = 1.0; }
    world.compute_forces();
    world.refresh();
    world
}

fn assert_finite(world: &World) {
    assert!(world.simulated_time.is_finite());
    assert!(world.thermostat_heat.is_finite());
    assert!(world.boundary_work.is_finite());
    assert!(world.potential_energy.is_finite());
    for atom in &world.atoms {
        for value in [atom.x, atom.y, atom.previous_x, atom.previous_y, atom.vx, atom.vy, atom.fx, atom.fy, atom.charge, atom.coordination, atom.age] {
            assert!(value.is_finite(), "non-finite atom {} value {value}", atom.id);
        }
    }
    for boundary in &world.boundaries {
        for value in [boundary.x, boundary.y, boundary.width, boundary.height, boundary.impact,
            boundary.loads[0], boundary.loads[1], boundary.loads[2], boundary.loads[3]] {
            assert!(value.is_finite(), "non-finite boundary value {value}");
        }
    }
}

#[test]
fn versions_defaults_and_packed_strides_are_frozen() {
    assert_eq!(ms_model_version(), 1);
    assert_eq!(ms_abi_version(), 1);
    assert_eq!(ms_atoms_stride(), 16);
    assert_eq!(ms_bonds_stride(), 6);
    assert_eq!(ms_boundaries_stride(), 11);
    assert_eq!(ms_events_stride(), 8);
    assert_eq!(ms_stats_stride(), 21);

    let world = World::new(41);
    assert_eq!(world.atoms_len(), 0);
    assert!(world.atoms_ptr().is_null());
    assert_eq!(world.stats_len(), 21);
    let stats = unsafe { std::slice::from_raw_parts(world.stats_ptr(), world.stats_len()) };
    assert_eq!(stats[1], FIXED_DT);
    assert_eq!(stats[2], 0.36);
    assert_eq!(stats[14], 41.0);
    assert_eq!(stats[17], MAX_ATOMS as f64);
    assert_eq!(stats[19], 1.0);
    assert_eq!(stats[20], 1.0);
}

#[test]
fn analytical_force_matches_full_energy_gradient() {
    // Two coincident H2 templates exercise pair terms and over-coordination together.
    let mut world = World::new(7);
    assert_eq!(world.enqueue_spawn(1, 1, 0.0, 0.0), 1);
    assert_eq!(world.enqueue_spawn(1, 1, 2.0, 1.0), 1);
    assert_eq!(world.flush_spawns(2), 2);
    for atom in &mut world.atoms { atom.age = 1.0; atom.vx = 0.0; atom.vy = 0.0; }
    world.compute_forces();
    let x = world.atoms[0].x;
    let analytical = -world.atoms[0].fx; // dU/dx = -Fx
    let h = 1.0e-5;
    world.atoms[0].x = x + h;
    let plus = world.compute_forces();
    world.atoms[0].x = x - h;
    let minus = world.compute_forces();
    world.atoms[0].x = x;
    world.compute_forces();
    let numerical = (plus - minus) / (2.0 * h);
    let scale = analytical.abs().max(numerical.abs()).max(1.0);
    assert!((analytical - numerical).abs() / scale < 2.0e-7,
        "analytical={analytical} numerical={numerical}");
}

#[test]
fn every_pair_force_obeys_newtons_third_law() {
    let mut world = spawn_world(99, 3, 3);
    world.compute_forces();
    let sum_fx: f64 = world.atoms.iter().map(|atom| atom.fx).sum();
    let sum_fy: f64 = world.atoms.iter().map(|atom| atom.fy).sum();
    let force_scale: f64 = world.atoms.iter().map(|atom| atom.fx.abs() + atom.fy.abs()).sum();
    assert!(sum_fx.abs() <= 1.0e-12 * force_scale.max(1.0));
    assert!(sum_fy.abs() <= 1.0e-12 * force_scale.max(1.0));
}

#[test]
fn energy_and_force_are_continuous_at_pair_cutoff() {
    let mut world = World::new(12);
    world.enqueue_spawn(6, 1, 0.0, 0.0);
    world.enqueue_spawn(6, 1, PAIR_CUTOFF + 1.0, 0.0);
    world.flush_spawns(2);
    for atom in &mut world.atoms { atom.age = 1.0; atom.vx = 0.0; atom.vy = 0.0; }
    world.atoms[0].x = 0.0;
    world.atoms[0].y = 0.0;
    world.atoms[1].y = 0.0;
    world.atoms[1].x = PAIR_CUTOFF + 1.0e-4;
    let outside = world.compute_forces();
    assert_eq!(world.atoms[0].fx, 0.0);
    world.atoms[1].x = PAIR_CUTOFF - 1.0e-4;
    let inside = world.compute_forces();
    assert!((inside - outside).abs() < 1.0e-10, "cutoff energy jump={}", inside - outside);
    assert!(world.atoms[0].fx.abs() < 1.0e-8, "cutoff force={}", world.atoms[0].fx);
}

#[test]
fn replay_is_bitwise_deterministic() {
    fn run() -> World {
        let mut world = World::new(0x51a7_c0de);
        world.set_temperature(0.73);
        world.set_gamma(2.25);
        world.enqueue_spawn(0, 24, -30.0, 15.0);
        world.flush_spawns(7);
        world.flush_spawns(100);
        world.step_fixed(240);
        world
    }
    let a = run();
    let b = run();
    assert_eq!(a.completed_steps, b.completed_steps);
    assert_eq!(a.atoms.len(), b.atoms.len());
    for (left, right) in a.atoms.iter().zip(&b.atoms) {
        for (x, y) in [(left.x, right.x), (left.y, right.y), (left.vx, right.vx),
            (left.vy, right.vy), (left.fx, right.fx), (left.fy, right.fy)] {
            assert_eq!(x.to_bits(), y.to_bits());
        }
    }
    assert_eq!(a.thermostat_heat.to_bits(), b.thermostat_heat.to_bits());
    assert_eq!(a.potential_energy.to_bits(), b.potential_energy.to_bits());
}

#[test]
fn complete_molecule_capacity_atom_and_charge_accounting() {
    let expected_atoms = [3_usize, 2, 2, 5, 4, 3, 1, 1];
    let expected_charge = [0.0_f64, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, -1.0];
    let mut world = World::new(4);
    for species in 0..8_u32 {
        assert_eq!(SPECIES[species as usize].atoms.len(), expected_atoms[species as usize]);
        assert_eq!(world.enqueue_spawn(species, 1, species as f64 * 200.0, 0.0), 1);
    }
    assert_eq!(world.pending_molecules(), 8);
    assert_eq!(world.flush_spawns(8), 8);
    assert_eq!(world.atoms.len(), expected_atoms.iter().sum());
    assert_eq!(world.atoms.first().unwrap().id, 1);
    assert_eq!(world.atoms.last().unwrap().id as usize, world.atoms.len());
    let mut offset = 0;
    for species in 0..8 {
        let end = offset + expected_atoms[species];
        let charge: f64 = world.atoms[offset..end].iter().map(|atom| atom.charge).sum();
        assert!((charge - expected_charge[species]).abs() < 1.0e-12);
        offset = end;
    }

    let mut capacity = World::new(5);
    let accepted = capacity.enqueue_spawn(3, u32::MAX, 0.0, 0.0);
    assert_eq!(accepted as usize, MAX_ATOMS / 5);
    assert_eq!(capacity.pending_molecules(), accepted as u64);
    assert_eq!(capacity.enqueue_spawn(0, 1, 0.0, 0.0), 0);
    assert_eq!(capacity.atoms.len(), 0, "enqueue must not materialize partial state");
}

#[test]
fn derived_bond_graph_never_drives_forces() {
    let mut world = spawn_world(123, 4, 2);
    world.compute_forces();
    world.refresh();
    assert!(!world.derived_bonds.is_empty());
    let forces: Vec<(u64, u64)> = world.atoms.iter()
        .map(|atom| (atom.fx.to_bits(), atom.fy.to_bits())).collect();
    world.derived_bonds.clear();
    world.compute_forces();
    let rebuilt_forces: Vec<(u64, u64)> = world.atoms.iter()
        .map(|atom| (atom.fx.to_bits(), atom.fy.to_bits())).collect();
    assert_eq!(forces, rebuilt_forces);
    world.refresh();
    assert!(!world.derived_bonds.is_empty());
}

#[test]
fn exact_ou_thermostat_samples_requested_temperature() {
    let mut world = spawn_world(0x7777, 6, 1);
    world.temperature_u = 0.58;
    world.thermostat_gamma = 7.0;
    world.atoms[0].vx = 0.0;
    world.atoms[0].vy = 0.0;
    world.compute_forces();
    world.step_fixed(2_000);
    let mut sum = 0.0;
    let samples = 24_000;
    for _ in 0..samples {
        world.step_fixed(1);
        sum += world.kinetic_energy(); // In 2D, E[K] per atom equals T.
    }
    let observed = sum / samples as f64;
    let target = target_temperature(world.temperature_u);
    assert!((observed / target - 1.0).abs() < 0.10,
        "OU temperature observed={observed} target={target}");
    assert!(world.thermostat_heat.is_finite());
}

#[test]
fn velocity_verlet_has_bounded_nve_drift_and_is_time_reversible() {
    let mut world = spawn_world(333, 1, 1);
    world.thermostat_gamma = 0.0;
    for atom in &mut world.atoms { atom.vx = 0.0; atom.vy = 0.0; atom.age = 1.0; }
    world.compute_forces();
    let initial_state: Vec<(f64, f64, f64, f64)> = world.atoms.iter()
        .map(|a| (a.x, a.y, a.vx, a.vy)).collect();
    let initial_energy = world.mechanical_energy();
    world.step_fixed(4_000);
    let final_energy = world.mechanical_energy();
    let relative_drift = (final_energy - initial_energy).abs() / initial_energy.abs().max(1.0);
    assert!(relative_drift < 2.0e-5, "NVE relative drift={relative_drift}");

    for atom in &mut world.atoms { atom.vx = -atom.vx; atom.vy = -atom.vy; }
    world.step_fixed(4_000);
    for (atom, initial) in world.atoms.iter().zip(initial_state) {
        assert!((atom.x - initial.0).abs() < 2.0e-8);
        assert!((atom.y - initial.1).abs() < 2.0e-8);
        assert!((atom.vx + initial.2).abs() < 2.0e-8);
        assert!((atom.vy + initial.3).abs() < 2.0e-8);
    }
}

#[test]
fn paused_piston_edits_constrain_atoms_and_book_work() {
    let mut world = spawn_world(18, 0, 4);
    let id = world.create_boundary(-180.0, -180.0, 360.0, 360.0);
    assert_ne!(id, 0);
    world.set_playing(false);
    let time = world.simulated_time;
    assert_eq!(world.move_boundary_edge(id, 0, -20.0), 1);
    assert_eq!(world.advance(1000.0), 0);
    assert_eq!(world.simulated_time, time);
    let boundary = world.boundaries.iter().find(|boundary| boundary.id == id).unwrap();
    for atom in world.atoms.iter().filter(|atom| atom.boundary_id == id) {
        let radius = ELEMENTS[atom.element as usize].radius;
        assert!(atom.x >= boundary.x + radius - 1.0e-12);
        assert!(atom.x <= boundary.x + boundary.width - radius + 1.0e-12);
        assert!(atom.y >= boundary.y + radius - 1.0e-12);
        assert!(atom.y <= boundary.y + boundary.height - radius + 1.0e-12);
    }
    assert!(world.boundary_work.is_finite());
    assert_finite(&world);
}

#[test]
fn wall_impacts_populate_load_and_event_views() {
    let mut world = spawn_world(26, 6, 1);
    let id = world.create_boundary(-40.0, -40.0, 80.0, 80.0);
    world.thermostat_gamma = 0.0;
    world.atoms[0].x = -26.9;
    world.atoms[0].vx = -80.0;
    world.compute_forces();
    world.step_fixed(1);
    let boundary = world.boundaries.iter().find(|boundary| boundary.id == id).unwrap();
    assert!(boundary.impact > 0.0);
    assert!(boundary.loads[0] > 0.0);
    assert!(world.events_len() >= 8);
}

#[test]
fn hot_compressed_world_stays_finite() {
    let mut world = World::new(0xbeef);
    let id = world.create_boundary(-500.0, -500.0, 1_000.0, 1_000.0);
    world.set_temperature(1.0);
    world.set_gamma(9.0);
    assert_eq!(world.enqueue_spawn(0, 100, 0.0, 0.0), 100);
    world.flush_spawns(100);
    assert_eq!(world.move_boundary_edge(id, 0, -120.0), 1);
    assert_eq!(world.move_boundary_edge(id, 1, 120.0), 1);
    assert_eq!(world.move_boundary_edge(id, 2, -120.0), 1);
    assert_eq!(world.move_boundary_edge(id, 3, 120.0), 1);
    world.step_fixed(1_000);
    assert_eq!(world.atoms.len(), 300);
    assert_finite(&world);
}

#[test]
fn uniform_grid_executes_five_thousand_particle_path() {
    let mut world = World::new(0x5000);
    assert_eq!(world.enqueue_spawn(6, 5_000, 0.0, 0.0), 5_000);
    assert_eq!(world.flush_spawns(5_000), 5_000);
    assert_eq!(world.atoms.len(), 5_000);
    world.set_gamma(0.0);
    assert_eq!(world.step_fixed(1), 1);
    assert_finite(&world);
}

#[test]
fn command_guards_reject_non_finite_or_unrepresentable_input() {
    let mut world = World::new(1);
    assert_eq!(world.enqueue_spawn(0, 10, f64::NAN, 0.0), 0);
    assert_eq!(world.enqueue_spawn(0, 10, 1.0e100, 0.0), 0);
    assert_eq!(world.create_boundary(0.0, 0.0, f64::INFINITY, 10.0), 0);
    world.set_temperature(f64::NAN);
    world.set_gamma(f64::NEG_INFINITY);
    assert_eq!(world.temperature_u, 0.36);
    assert_eq!(world.thermostat_gamma, 1.5);
    assert_eq!(world.advance(f64::INFINITY), 0);
    assert_finite(&world);
}

#[test]
fn advance_caps_work_at_five_ticks_and_pause_drops_wall_time() {
    let mut world = World::new(6);
    assert_eq!(world.advance(10_000.0), 5);
    assert_eq!(world.completed_steps, 5);
    world.set_playing(false);
    assert_eq!(world.advance(10_000.0), 0);
    world.set_playing(true);
    assert_eq!(world.advance(FIXED_DT * 1_000.0), 1);
}
