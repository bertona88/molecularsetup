#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
lock_path="$project_root/package-lock.json"
checksum_path="$project_root/package-lock.sha256"
lock_parts=("$project_root"/package-lock.parts/part-*)
expected_checksum="$(cut -d ' ' -f 1 "$checksum_path")"

if [[ ! -e "${lock_parts[0]}" ]]; then
  echo "Package lock parts are missing." >&2
  exit 1
fi

if [[ -f "$lock_path" ]]; then
  actual_checksum="$(sha256sum "$lock_path" | cut -d ' ' -f 1)"
  if [[ "$actual_checksum" == "$expected_checksum" ]]; then
    exit 0
  fi
fi

restored_path="$project_root/.package-lock.json.restore"
trap 'rm -f "$restored_path"' EXIT
cat "${lock_parts[@]}" | gzip -dc > "$restored_path"

actual_checksum="$(sha256sum "$restored_path" | cut -d ' ' -f 1)"
if [[ "$actual_checksum" != "$expected_checksum" ]]; then
  echo "Restored package lock checksum does not match." >&2
  exit 1
fi

mv "$restored_path" "$lock_path"
trap - EXIT
