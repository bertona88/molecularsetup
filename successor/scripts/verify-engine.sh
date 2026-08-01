#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "${script_dir}/.." && pwd)"
wasm_name="molecularsetup_engine.wasm"
public_wasm="${project_root}/public/engine/${wasm_name}"
public_manifest="${project_root}/public/engine/molecularsetup_engine.manifest.json"

case "${1:-}" in
  "")
    node "${script_dir}/engine-artifact.mjs" verify \
      "${public_wasm}" \
      "${public_manifest}"
    ;;
  --packaged)
    node "${script_dir}/engine-artifact.mjs" verify \
      "${public_wasm}" \
      "${public_manifest}" \
      "${project_root}/dist/engine/${wasm_name}" \
      "${project_root}/dist/engine/molecularsetup_engine.manifest.json"
    ;;
  *)
    echo "usage: scripts/verify-engine.sh [--packaged]" >&2
    exit 64
    ;;
esac
