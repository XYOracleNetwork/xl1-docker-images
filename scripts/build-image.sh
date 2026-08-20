#!/usr/bin/env bash
# Build the XL1 multi-role Docker image.
#
# The image installs the published @xyo-network/xl1-cli from npm, so no
# monorepo checkout is required — only this repository.
#
# Usage:
#   ./scripts/build-image.sh
#   XL1_CLI_VERSION=5.2.0 ./scripts/build-image.sh
#   TAG=xl1:dev ./scripts/build-image.sh
#   PLATFORM=linux/amd64 ./scripts/build-image.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

TAG="${TAG:-xl1:local}"
XL1_CLI_VERSION="${XL1_CLI_VERSION:-5.2.0}"
NODE_VERSION="${NODE_VERSION:-24.14.1}"
PLATFORM="${PLATFORM:-}"

# The image COPYs dist/ + presets/; ensure the entrypoint is compiled.
if [[ ! -f "${REPO_ROOT}/dist/node/entrypoint.mjs" ]]; then
  echo "Compiling @xyo-network/xl1-docker-images (entrypoint + metadata)…"
  (cd "${REPO_ROOT}" && pnpm xy compile)
fi

BUILD_ARGS=(
  --build-arg "NODE_VERSION=${NODE_VERSION}"
  --build-arg "XL1_CLI_VERSION=${XL1_CLI_VERSION}"
)

PLATFORM_ARGS=()
if [[ -n "${PLATFORM}" ]]; then
  PLATFORM_ARGS+=(--platform "${PLATFORM}")
fi

echo "Building image ${TAG} (cli@${XL1_CLI_VERSION}) from ${REPO_ROOT}"

docker build \
  -f "${REPO_ROOT}/docker/Dockerfile" \
  -t "${TAG}" \
  "${BUILD_ARGS[@]}" \
  ${PLATFORM_ARGS[@]+"${PLATFORM_ARGS[@]}"} \
  "${REPO_ROOT}"

echo "Built ${TAG}"
