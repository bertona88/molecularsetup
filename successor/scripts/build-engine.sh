#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "${script_dir}/.." && pwd)"
engine_root="${project_root}/engine"
cargo_bin="${CARGO_BIN:-cargo}"
target_dir="${CARGO_TARGET_DIR:-${engine_root}/target}"
wasm_target="wasm32-unknown-unknown"
wasm_name="molecularsetup_engine.wasm"
built_wasm="${target_dir}/${wasm_target}/release/${wasm_name}"
public_wasm="${project_root}/public/engine/${wasm_name}"
public_manifest="${project_root}/public/engine/molecularsetup_engine.manifest.json"

if ! command -v "${cargo_bin}" >/dev/null 2>&1; then
  echo "Rust is required only to rebuild the engine. Set CARGO_BIN or install Cargo." >&2
  exit 69
fi

if [[ ! -f "${engine_root}/Cargo.lock" ]]; then
  echo "Missing engine/Cargo.lock; refusing an unlocked engine build." >&2
  exit 66
fi

export CARGO_INCREMENTAL=0
export CARGO_TARGET_DIR="${target_dir}"
export SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-0}"

echo "Building locked, offline Rust/Wasm engine..."
"${cargo_bin}" build \
  --manifest-path "${engine_root}/Cargo.toml" \
  --target "${wasm_target}" \
  --release \
  --locked \
  --offline

if [[ ! -f "${built_wasm}" ]]; then
  echo "Cargo succeeded but did not produce ${built_wasm}." >&2
  exit 66
fi

echo "Running Node ABI smoke test against the newly built module..."
MOLECULARSETUP_ENGINE_WASM="${built_wasm}" \
  node --test "${project_root}/tests/engine-abi.test.mjs"

node "${script_dir}/engine-artifact.mjs" publish \
  "${built_wasm}" \
  "${public_wasm}" \
  "${public_manifest}"

"${script_dir}/verify-engine.sh"
echo "Built and verified public/engine/${wasm_name}."
