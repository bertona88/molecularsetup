//! Deterministic reduced-unit molecular teaching engine, ABI/model 3/3.
//!
//! Rust owns atom collisions, explicit bond state, excitation, temperature,
//! grabs, piston motion, event persistence, and energy bookkeeping. The public
//! dependency-free C/Wasm surface is documented in `ENGINE_ABI.md`.

mod model;
mod world;

use std::sync::{Mutex, MutexGuard};

pub use model::{ABI_VERSION, FIXED_DT, MAX_ATOMS, MODEL_VERSION};
use world::World;

static WORLD: Mutex<Option<World>> = Mutex::new(None);

fn locked_world() -> MutexGuard<'static, Option<World>> {
    match WORLD.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    }
}

fn with_world<R>(operation: impl FnOnce(&mut World) -> R) -> R {
    let mut guard = locked_world();
    let world = guard.get_or_insert_with(|| World::new(1));
    operation(world)
}

#[no_mangle]
pub extern "C" fn ms_model_version() -> u32 { MODEL_VERSION }

#[no_mangle]
pub extern "C" fn ms_abi_version() -> u32 { ABI_VERSION }

#[no_mangle]
pub extern "C" fn ms_reset(seed: u32) {
    let mut guard = locked_world();
    *guard = Some(World::new(seed));
}

#[no_mangle]
pub extern "C" fn ms_load_experiment(experiment: u32) -> u32 {
    with_world(|world| world.load_experiment(experiment))
}

#[no_mangle]
pub extern "C" fn ms_set_playing(value: u32) {
    with_world(|world| world.set_playing(value != 0));
}

#[no_mangle]
pub extern "C" fn ms_set_temperature(value: f64) {
    with_world(|world| world.set_temperature(value));
}

#[no_mangle]
pub extern "C" fn ms_spawn_ingredient(
    ingredient: u32,
    count: u32,
    x: f64,
    y: f64,
) -> u32 {
    with_world(|world| world.spawn_ingredient(ingredient, count, x, y))
}

#[no_mangle]
pub extern "C" fn ms_apply_spark(x: f64, y: f64, energy: f64, radius: f64) -> u32 {
    with_world(|world| world.apply_spark(x, y, energy, radius))
}

#[no_mangle]
pub extern "C" fn ms_grab_atom(atom_id: u32, x: f64, y: f64) -> u32 {
    with_world(|world| world.grab_atom(atom_id, x, y))
}

#[no_mangle]
pub extern "C" fn ms_drag_atom(atom_id: u32, x: f64, y: f64) -> u32 {
    with_world(|world| world.drag_atom(atom_id, x, y))
}

#[no_mangle]
pub extern "C" fn ms_release_atom(atom_id: u32) -> u32 {
    with_world(|world| world.release_atom(atom_id))
}

#[no_mangle]
pub extern "C" fn ms_set_piston_target(coordinate: f64) -> u32 {
    with_world(|world| world.set_piston_target(coordinate))
}

#[no_mangle]
pub extern "C" fn ms_advance(real_delta_ms: f64) -> u32 {
    with_world(|world| world.advance(real_delta_ms))
}

#[no_mangle]
pub extern "C" fn ms_step_fixed(count: u32) -> u32 {
    with_world(|world| world.step_fixed(count))
}

macro_rules! f32_view {
    ($ptr_name:ident, $len_name:ident, $stride_name:ident, $ptr:ident, $len:ident, $stride:expr) => {
        #[no_mangle]
        pub extern "C" fn $ptr_name() -> *const f32 { with_world(|world| world.$ptr()) }
        #[no_mangle]
        pub extern "C" fn $len_name() -> u32 { with_world(|world| world.$len() as u32) }
        #[no_mangle]
        pub extern "C" fn $stride_name() -> u32 { $stride }
    };
}

f32_view!(ms_atoms_ptr, ms_atoms_len, ms_atoms_stride, atoms_ptr, atoms_len, 16);
f32_view!(ms_bonds_ptr, ms_bonds_len, ms_bonds_stride, bonds_ptr, bonds_len, 10);
f32_view!(ms_walls_ptr, ms_walls_len, ms_walls_stride, walls_ptr, walls_len, 10);
f32_view!(ms_events_ptr, ms_events_len, ms_events_stride, events_ptr, events_len, 10);

#[no_mangle]
pub extern "C" fn ms_stats_ptr() -> *const f64 { with_world(|world| world.stats_ptr()) }

#[no_mangle]
pub extern "C" fn ms_stats_len() -> u32 { with_world(|world| world.stats_len() as u32) }

#[no_mangle]
pub extern "C" fn ms_stats_stride() -> u32 { 28 }

#[cfg(test)]
mod lj_validation;

#[cfg(test)]
mod tests;
