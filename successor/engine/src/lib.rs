//! Deterministic reduced-unit two-dimensional molecular teaching engine.
//!
//! Dynamics come from one continuous energy; bonds and events are observations
//! only. The public surface is the dependency-free C/Wasm ABI frozen in
//! `ENGINE_ABI.md`.

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
pub extern "C" fn ms_set_playing(value: u32) { with_world(|world| world.set_playing(value != 0)); }

#[no_mangle]
pub extern "C" fn ms_set_temperature(value: f64) { with_world(|world| world.set_temperature(value)); }

#[no_mangle]
pub extern "C" fn ms_set_thermostat_gamma(value: f64) { with_world(|world| world.set_gamma(value)); }

#[no_mangle]
pub extern "C" fn ms_spawn(species: u32, count: u32, x: f64, y: f64) -> u32 {
    with_world(|world| world.enqueue_spawn(species, count, x, y))
}

#[no_mangle]
pub extern "C" fn ms_flush_spawns(limit: u32) -> u32 {
    with_world(|world| world.flush_spawns(limit))
}

#[no_mangle]
pub extern "C" fn ms_advance(real_delta_ms: f64) -> u32 {
    with_world(|world| world.advance(real_delta_ms))
}

#[no_mangle]
pub extern "C" fn ms_step_fixed(count: u32) -> u32 {
    with_world(|world| world.step_fixed(count))
}

#[no_mangle]
pub extern "C" fn ms_create_boundary(x: f64, y: f64, width: f64, height: f64) -> u32 {
    with_world(|world| world.create_boundary(x, y, width, height))
}

#[no_mangle]
pub extern "C" fn ms_move_boundary_edge(id: u32, edge: u32, coordinate: f64) -> u32 {
    with_world(|world| world.move_boundary_edge(id, edge, coordinate))
}

#[no_mangle]
pub extern "C" fn ms_remove_boundary(id: u32) -> u32 {
    with_world(|world| world.remove_boundary(id))
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
f32_view!(ms_bonds_ptr, ms_bonds_len, ms_bonds_stride, bonds_ptr, bonds_len, 6);
f32_view!(ms_boundaries_ptr, ms_boundaries_len, ms_boundaries_stride, boundaries_ptr, boundaries_len, 11);
f32_view!(ms_events_ptr, ms_events_len, ms_events_stride, events_ptr, events_len, 8);

#[no_mangle]
pub extern "C" fn ms_stats_ptr() -> *const f64 { with_world(|world| world.stats_ptr()) }

#[no_mangle]
pub extern "C" fn ms_stats_len() -> u32 { with_world(|world| world.stats_len() as u32) }

#[no_mangle]
pub extern "C" fn ms_stats_stride() -> u32 { 21 }

#[cfg(test)]
mod lj_validation;

#[cfg(test)]
mod tests;
