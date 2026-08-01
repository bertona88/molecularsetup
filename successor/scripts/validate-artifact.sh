#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "${script_dir}/.." && pwd)"
index="${project_root}/dist/index.html"
nojekyll="${project_root}/dist/.nojekyll"

[[ -f "${index}" ]] || {
  echo "Missing static entry: dist/index.html" >&2
  exit 66
}
[[ -f "${nojekyll}" ]] || {
  echo "Missing GitHub Pages marker: dist/.nojekyll" >&2
  exit 66
}
compgen -G "${project_root}/dist/assets/*.js" >/dev/null || {
  echo "Missing bundled application JavaScript under dist/assets." >&2
  exit 66
}

"${script_dir}/verify-engine.sh" --packaged

echo "Validated static app: HTML, browser bundle, Pages marker, and verified engine artifact are present."
