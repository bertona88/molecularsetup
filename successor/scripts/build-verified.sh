#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "${script_dir}/.." && pwd)"

cd "${project_root}"

"${script_dir}/verify-engine.sh"
npm run typecheck
npx vite build
"${script_dir}/validate-artifact.sh"
