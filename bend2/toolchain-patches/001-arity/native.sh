#!/usr/bin/env bash
set -euo pipefail

if (( $# != 2 )); then
  printf 'usage: native.sh <pinned-valid-C> <patched-valid-C>\n' >&2
  exit 2
fi

dir=$(mktemp -d /tmp/rift-arity-001.XXXXXX)
cp -- "$1" "$dir/pin.c"
cp -- "$2" "$dir/patch.c"
sha256sum "$dir/pin.c" "$dir/patch.c"
clang-18 -O0 -pthread "$dir/pin.c" -lm -o "$dir/pin"
clang-18 -O0 -pthread "$dir/patch.c" -lm -o "$dir/patch"
pin_out=$("$dir/pin")
patch_out=$("$dir/patch")
if [[ "$pin_out" != "$patch_out" ]]; then
  printf 'native output mismatch: pin=%q patch=%q\n' "$pin_out" "$patch_out" >&2
  exit 1
fi
printf 'native output=%q sha256=' "$pin_out"
printf '%s' "$pin_out" | sha256sum | cut -d' ' -f1
printf 'native exit=0 both; artifacts=%s\n' "$dir"
