use crate::model::{
    angle_preference_energy, ELEMENTS, ELEMENT_H, ELEMENT_O, EXPERIMENT_BREAK_BOND,
    EXPERIMENT_FREE_PLAY, EXPERIMENT_IGNITE, EXPERIMENT_MAKE_BOND, H_O_H_ANGLE_RADIANS,
};
use crate::world::World;
use crate::{ABI_VERSION, FIXED_DT, MAX_ATOMS, MODEL_VERSION};

fn assert_finite(world: &World) {
    for atom in &world.atoms {
        for value in [
            atom.x, atom.y, atom.vx, atom.vy, atom.fx, atom.fy, atom.excitation, atom.age,
        ] {
            assert!(value.is_finite(), "non-finite atom value: {value}");
        }
    }
    for bond in &world.bonds {
        for value in [bond.progress, bond.strain, bond.energy, bond.rest_length, bond.age] {
            assert!(value.is_finite(), "non-finite bond value: {value}");
        }
    }
    for wall in &world.walls {
        for value in [wall.position, wall.velocity, wall.load, wall.impact, wall.target] {
            assert!(value.is_finite(), "non-finite wall value: {value}");
        }
    }
    assert!(world.kinetic_energy().is_finite());
    assert!(world.potential_energy.is_finite());
}

fn rms_speed(world: &World) -> f64 {
    if world.atoms.is_empty() { return 0.0; }
    (world.atoms.iter().map(|atom| atom.vx * atom.vx + atom.vy * atom.vy).sum::<f64>()
        / world.atoms.len() as f64).sqrt()
}

fn oxygen_displacement(world: &World, initial: &[(u32, f64, f64)]) -> f64 {
    let mut sum = 0.0;
    let mut count = 0;
    for atom in world.atoms.iter().filter(|atom| atom.element == ELEMENT_O) {
        let (_, x, y) = initial.iter().find(|entry| entry.0 == atom.id).unwrap();
        sum += (atom.x - x).powi(2) + (atom.y - y).powi(2);
        count += 1;
    }
    if count == 0 { 0.0 } else { (sum / count as f64).sqrt() }
}

fn deterministic_snapshot(world: &World) -> Vec<u64> {
    let mut values = vec![
        world.simulated_time.to_bits(),
        world.temperature_u.to_bits(),
        world.completed_steps,
        world.spark_count,
        world.collision_count,
    ];
    for atom in &world.atoms {
        values.extend_from_slice(&[
            atom.id as u64,
            atom.element as u64,
            atom.x.to_bits(),
            atom.y.to_bits(),
            atom.vx.to_bits(),
            atom.vy.to_bits(),
            atom.excitation.to_bits(),
            atom.flags as u64,
        ]);
    }
    for bond in &world.bonds {
        values.extend_from_slice(&[
            bond.id as u64,
            bond.a as u64,
            bond.b as u64,
            bond.order as u64,
            bond.state as u64,
            bond.progress.to_bits(),
            bond.strain.to_bits(),
            bond.energy.to_bits(),
        ]);
    }
    for wall in &world.walls {
        values.extend_from_slice(&[
            wall.id as u64,
            wall.position.to_bits(),
            wall.velocity.to_bits(),
            wall.load.to_bits(),
            wall.target.to_bits(),
        ]);
    }
    values
}

#[test]
fn abi_v2_opens_in_a_populated_default_container() {
    let world = World::new(0x1234);
    assert_eq!(ABI_VERSION, 2);
    assert_eq!(MODEL_VERSION, 2);
    assert_eq!(world.experiment, EXPERIMENT_MAKE_BOND);
    assert_eq!(world.atoms.len(), 2);
    assert_eq!(world.walls.len(), 4);
    assert_eq!(MAX_ATOMS, 18_000);
    assert_eq!(FIXED_DT, 1.0 / 120.0);
    assert_finite(&world);
}

#[test]
fn atom_collision_exchanges_momentum_without_creating_or_destroying_it() {
    let mut world = World::new(9);
    world.atoms[0].x = -6.0;
    world.atoms[1].x = 6.0;
    world.atoms[0].y = 0.0;
    world.atoms[1].y = 0.0;
    world.atoms[0].vx = 26.0;
    world.atoms[1].vx = -11.0;
    world.atoms[0].vy = 3.0;
    world.atoms[1].vy = 3.0;
    let before = world.total_momentum();
    world.resolve_atom_collisions_and_form_bonds();
    let after = world.total_momentum();
    assert!((after.0 - before.0).abs() < 1.0e-10);
    assert!((after.1 - before.1).abs() < 1.0e-10);
    assert!(world.atoms[0].vx < world.atoms[1].vx, "normal momentum was not exchanged");
}

#[test]
fn exact_overlap_separates_along_a_deterministic_id_direction() {
    fn separated(seed: u32) -> (f64, f64, f64, f64) {
        let mut world = World::new(seed);
        for atom in &mut world.atoms { atom.x = 0.0; atom.y = 0.0; atom.vx = 0.0; atom.vy = 0.0; }
        world.resolve_atom_collisions_and_form_bonds();
        let distance = (world.atoms[1].x - world.atoms[0].x)
            .hypot(world.atoms[1].y - world.atoms[0].y);
        assert!(distance >= 14.0 - 1.0e-10);
        (world.atoms[0].x, world.atoms[0].y, world.atoms[1].x, world.atoms[1].y)
    }
    assert_eq!(separated(1), separated(999), "overlap direction must derive from ids, not RNG state");
}

#[test]
fn explicit_bonds_never_exceed_h_or_o_valence() {
    let mut world = World::new(0x51a1);
    world.load_experiment(EXPERIMENT_FREE_PLAY as u32);
    assert_eq!(world.spawn_ingredient(0, 24, 0.0, 0.0), 24);
    assert_eq!(world.spawn_ingredient(1, 12, 0.0, 0.0), 12);
    assert_eq!(world.apply_spark(0.0, 0.0, 400.0, 280.0), 1);
    world.step_fixed(720);
    let mut usage = vec![0_u8; world.atoms.len()];
    for bond in &world.bonds {
        usage[bond.a] += bond.order;
        usage[bond.b] += bond.order;
    }
    for (index, used) in usage.into_iter().enumerate() {
        assert!(used <= ELEMENTS[world.atoms[index].element as usize].valence);
    }
    assert_finite(&world);
}

#[test]
fn make_bond_preset_forms_stable_h2_inside_two_seconds() {
    let mut world = World::new(0x4d41_4b45);
    world.load_experiment(EXPERIMENT_MAKE_BOND as u32);
    world.step_fixed(240);
    assert_eq!(world.atoms.len(), 2);
    assert_eq!(
        world.bonds.len(),
        1,
        "positions={:?}, velocities={:?}, collisions={}",
        world.atoms.iter().map(|atom| (atom.x, atom.y)).collect::<Vec<_>>(),
        world.atoms.iter().map(|atom| (atom.vx, atom.vy)).collect::<Vec<_>>(),
        world.collision_count,
    );
    assert_eq!(world.bonds[0].order, 1);
    assert_eq!(world.bonds[0].state, crate::model::BOND_STABLE);
    assert!(world.ledger.formation_release > 0.0);
}

#[test]
fn hot_or_grabbed_h2_strains_and_breaks_inside_three_seconds() {
    let mut hot = World::new(5);
    hot.load_experiment(EXPERIMENT_BREAK_BOND as u32);
    hot.set_temperature(1.0);
    hot.step_fixed(360);
    assert!(hot.bonds.is_empty(), "sustained high heat did not break H2");
    assert!(hot.ledger.breaking_absorption > 0.0);

    let mut dragged = World::new(5);
    dragged.load_experiment(EXPERIMENT_BREAK_BOND as u32);
    let atom_id = dragged.atoms[0].id;
    assert_eq!(dragged.grab_atom(atom_id, dragged.atoms[0].x, dragged.atoms[0].y), 1);
    assert_eq!(dragged.drag_atom(atom_id, -150.0, 0.0), 1);
    dragged.step_fixed(360);
    assert!(
        dragged.bonds.is_empty(),
        "spring grab did not strain and break H2: bond={:?}, atoms={:?}, absorbed={}",
        dragged.bonds.first().map(|bond| (bond.state, bond.progress, bond.strain)),
        dragged.atoms.iter().map(|atom| (atom.x, atom.y, atom.vx, atom.vy)).collect::<Vec<_>>(),
        dragged.ledger.breaking_absorption,
    );
    assert!(dragged.ledger.grab_work > 0.0);
}

#[test]
fn angular_energy_prefers_the_declared_h_o_h_angle() {
    let preferred = angle_preference_energy(H_O_H_ANGLE_RADIANS);
    let linear = angle_preference_energy(core::f64::consts::PI);
    let acute = angle_preference_energy(60.0_f64.to_radians());
    assert!(preferred < 1.0e-20);
    assert!(preferred < linear);
    assert!(preferred < acute);
}

#[test]
fn ignition_is_activation_gated_for_ten_seconds() {
    let mut world = World::new(0x1a17_e);
    world.load_experiment(EXPERIMENT_IGNITE as u32);
    assert_eq!(world.element_count(ELEMENT_H), 16);
    assert_eq!(world.element_count(ELEMENT_O), 8);
    assert_eq!(world.bonds.len(), 12);
    world.step_fixed(1_200);
    assert_eq!(world.spark_count, 0);
    assert_eq!(world.water_like_oxygen_count(), 0);
    assert_eq!(world.bonds.len(), 12, "stable reactants rearranged without activation");
}

#[test]
fn spark_starts_rearrangement_and_yields_water_like_topology() {
    let mut world = World::new(0x1a17_e);
    world.load_experiment(EXPERIMENT_IGNITE as u32);
    assert_eq!(world.apply_spark(0.0, 0.0, 330.0, 420.0), 1);
    world.step_fixed(120);
    assert!(world.ledger.breaking_absorption > 0.0, "spark caused no rearrangement in one second");
    world.step_fixed(840);
    let water_like = world.water_like_oxygen_count();
    let oxygen_hydrogens: Vec<_> = (0..world.atoms.len())
        .filter(|&index| world.atoms[index].element == ELEMENT_O)
        .map(|oxygen| {
            let count = world.bonds.iter().filter(|bond| {
                let other = if bond.a == oxygen { Some(bond.b) }
                    else if bond.b == oxygen { Some(bond.a) } else { None };
                other.and_then(|index| world.atoms.get(index)).map(|atom| atom.element) == Some(ELEMENT_H)
            }).count();
            (oxygen, count, world.atoms[oxygen].x, world.atoms[oxygen].y)
        })
        .collect();
    assert!(
        water_like >= 6,
        "only {water_like}/8 oxygen atoms reached H-O-H topology: {oxygen_hydrogens:?}; bonds={}",
        world.bonds.len(),
    );
    assert!(world.ledger.formation_release > 0.0);
    assert_finite(&world);
}

#[test]
fn event_energy_ledger_records_formation_and_breaking_separately() {
    let mut world = World::new(77);
    world.load_experiment(EXPERIMENT_MAKE_BOND as u32);
    world.step_fixed(240);
    let released = world.ledger.formation_release;
    assert!(released > 0.0);
    world.set_temperature(1.0);
    world.step_fixed(360);
    assert!(world.ledger.breaking_absorption > 0.0);
    assert_eq!(world.ledger.formation_release, released);
}

#[test]
fn fixed_step_replay_is_bit_deterministic() {
    fn run() -> Vec<u64> {
        let mut world = World::new(0x0bad_c0de);
        world.load_experiment(EXPERIMENT_FREE_PLAY as u32);
        world.set_temperature(0.57);
        assert_eq!(world.spawn_ingredient(0, 3, -40.0, 20.0), 3);
        assert_eq!(world.spawn_ingredient(1, 2, 45.0, -20.0), 2);
        assert_eq!(world.apply_spark(0.0, 0.0, 180.0, 190.0), 1);
        assert_eq!(world.set_piston_target(210.0), 1);
        world.step_fixed(240);
        deterministic_snapshot(&world)
    }
    assert_eq!(run(), run());
}

#[test]
fn piston_moves_at_finite_speed_and_never_teleports_on_command() {
    let mut world = World::new(18);
    world.load_experiment(EXPERIMENT_FREE_PLAY as u32);
    let initial = world.walls.iter().find(|wall| wall.edge == 1).unwrap().position;
    assert_eq!(world.set_piston_target(40.0), 1);
    assert_eq!(world.walls.iter().find(|wall| wall.edge == 1).unwrap().position, initial);
    world.step_fixed(60);
    let piston = world.walls.iter().find(|wall| wall.edge == 1).unwrap();
    assert!(piston.position < initial);
    assert!(piston.position > 40.0);
    assert!(piston.velocity.abs() > 0.0);
}

#[test]
fn piston_confinement_and_rolling_load_rise_under_compression() {
    let mut world = World::new(26);
    world.load_experiment(EXPERIMENT_FREE_PLAY as u32);
    assert_eq!(world.spawn_ingredient(2, 28, 220.0, 0.0), 28);
    assert_eq!(world.set_piston_target(-80.0), 1);
    world.step_fixed(420);
    let (left, right, top, bottom) = world.container_bounds();
    for atom in &world.atoms {
        let radius = atom.param().radius;
        assert!(atom.x >= left + radius - 1.0e-8);
        assert!(atom.x <= right - radius + 1.0e-8);
        assert!(atom.y >= top + radius - 1.0e-8);
        assert!(atom.y <= bottom - radius + 1.0e-8);
    }
    let piston = world.walls.iter().find(|wall| wall.edge == 1).unwrap();
    assert!(piston.load > 0.0 || piston.impact > 0.0, "compression produced no wall response");
    assert!(world.ledger.wall_work > 0.0);
    assert_finite(&world);
}

#[test]
fn temperature_endpoints_differ_by_at_least_fivefold_in_motion() {
    let mut cold = World::new(0x7e4d);
    cold.load_experiment(EXPERIMENT_FREE_PLAY as u32);
    cold.set_temperature(0.0);
    cold.step_fixed(120);

    let mut hot = World::new(0x7e4d);
    hot.load_experiment(EXPERIMENT_FREE_PLAY as u32);
    hot.set_temperature(1.0);
    hot.step_fixed(120);

    let cold_motion = rms_speed(&cold);
    let hot_motion = rms_speed(&hot);
    assert!(hot_motion >= 5.0 * cold_motion, "cold={cold_motion}, hot={hot_motion}");
}

#[test]
fn oxygen_moves_visibly_at_warm_and_hot_settings_within_one_second() {
    let mut warm = World::new(0x0f0f);
    warm.load_experiment(EXPERIMENT_FREE_PLAY as u32);
    let initial: Vec<_> = warm.atoms.iter().filter(|atom| atom.element == ELEMENT_O)
        .map(|atom| (atom.id, atom.x, atom.y)).collect();
    warm.set_temperature(0.55);
    warm.step_fixed(120);
    let warm_distance = oxygen_displacement(&warm, &initial);

    let mut hot = World::new(0x0f0f);
    hot.load_experiment(EXPERIMENT_FREE_PLAY as u32);
    hot.set_temperature(1.0);
    hot.step_fixed(120);
    let hot_distance = oxygen_displacement(&hot, &initial);
    assert!(warm_distance >= 3.0, "warm oxygen displacement={warm_distance}");
    assert!(hot_distance > warm_distance, "warm={warm_distance}, hot={hot_distance}");
}

#[test]
fn piston_command_produces_visible_response_inside_half_a_second() {
    let mut world = World::new(0x5051);
    world.load_experiment(EXPERIMENT_FREE_PLAY as u32);
    let initial = world.walls.iter().find(|wall| wall.edge == 1).unwrap().position;
    world.set_piston_target(120.0);
    world.step_fixed(60);
    let piston = world.walls.iter().find(|wall| wall.edge == 1).unwrap();
    assert!(initial - piston.position >= 70.0);
    assert!(piston.velocity < 0.0);
}

#[test]
fn command_guards_and_advance_cap_preserve_finite_state() {
    let mut world = World::new(1);
    assert_eq!(world.load_experiment(99), 0);
    assert_eq!(world.spawn_ingredient(99, 2, 0.0, 0.0), 0);
    assert_eq!(world.spawn_ingredient(0, 2, f64::NAN, 0.0), 0);
    assert_eq!(world.apply_spark(0.0, 0.0, f64::INFINITY, 20.0), 0);
    assert_eq!(world.set_piston_target(f64::NEG_INFINITY), 0);
    assert_eq!(world.advance(10_000.0), 5);
    world.set_playing(false);
    assert_eq!(world.advance(1_000.0), 0);
    assert_finite(&world);
}
