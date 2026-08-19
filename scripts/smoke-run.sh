#!/usr/bin/env bash
# Lightweight smoke: image runs xl1 --help / --version via entrypoint passthrough
# (no XL1_NETWORK / XL1_ROLE → forwards argv to xl1).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

TAG="${TAG:-xl1:local}"

if ! docker image inspect "${TAG}" >/dev/null 2>&1; then
  echo "Image ${TAG} not found; building…"
  "${REPO_ROOT}/scripts/build-image.sh"
fi

echo "==> xl1 --version (passthrough)"
docker run --rm --entrypoint xl1 "${TAG}" --version 2>/dev/null \
  || docker run --rm -e XL1_NETWORK= -e XL1_ROLE= "${TAG}" --version

echo "==> entrypoint → xl1 --help"
docker run --rm "${TAG}" --help | head -n 40

echo "Smoke OK (${TAG})"
