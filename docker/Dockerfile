# syntax=docker/dockerfile:1
#
# Public multi-role XL1 node image with network/role presets.
#
# Preset mode (recommended for federated producer):
#   docker run --rm \
#     -e XL1_NETWORK=sequence \
#     -e XL1_ROLE=producer \
#     -e XL1_MNEMONIC='…' \
#     -e XL1_REWARD_ADDRESS=0x… \
#     xl1:local
#
# Passthrough mode (full CLI control):
#   docker run --rm --env-file api.env xl1:local start api
#
# Build (from the repository root; compile first if dist/ is missing):
#   pnpm xy compile
#   docker build -f docker/Dockerfile --build-arg XL1_CLI_VERSION=5.0.2 -t xl1:local .
#
# Or just: ./scripts/build-image.sh

ARG NODE_VERSION=24.14.1

FROM node:${NODE_VERSION}-bookworm-slim

ARG XL1_CLI_VERSION=5.0.2

LABEL org.opencontainers.image.title="XL1 Node" \
  org.opencontainers.image.description="Multi-role XYO Layer One node with network/role presets" \
  org.opencontainers.image.source="https://github.com/XYOracleNetwork/xl1-docker-images" \
  org.opencontainers.image.vendor="XYO Network" \
  org.opencontainers.image.licenses="LGPL-3.0-only"

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g "@xyo-network/xl1-cli@${XL1_CLI_VERSION}" \
  && npm cache clean --force

# Preset entrypoint + JSON profiles (network × role)
COPY presets /opt/xl1/presets
COPY dist/node /opt/xl1/lib

ENV XL1_DATA_DIR=/data \
  XL1_HEALTH_CHECK_PORT=9099 \
  XL1_PRESETS_DIR=/opt/xl1/presets \
  NODE_ENV=production

RUN mkdir -p /data \
  && chown -R node:node /data /opt/xl1

WORKDIR /data
USER node

EXPOSE 8080 8081 8084 9099

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${XL1_HEALTH_CHECK_PORT}/livez" || exit 1

ENTRYPOINT ["node", "/opt/xl1/lib/entrypoint.mjs"]
# Empty CMD: preset mode uses XL1_NETWORK/XL1_ROLE; otherwise pass e.g. start api
CMD []
