# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **single-package** repository publishing `@xyo-network/xl1-docker-images` — the operator distribution kit
for XYO Layer One nodes: one multi-role Docker image, network×role JSON presets, Compose recipes, env
examples, and the TypeScript entrypoint/preset helpers.

It was split out of the private `xyo-chain` monorepo so it can be public. It has **no dependency on that
monorepo**: the image installs the published `@xyo-network/xl1-cli` from npm at build time.

## Toolchain

pnpm + Node ≥ 24 (Volta-pinned to 24.14.1). All build/lint work goes through the `xy` CLI from
`@ariestools/toolchain`, run from the repo root:

- `pnpm xy build` — compile (tsup) + publint + deplint + lint
- `pnpm xy compile` — TypeScript compile only (emits `dist/node` per `xy.config.ts`)
- `pnpm xy lint` / `pnpm xy fix`
- `pnpm xy test` — Vitest

This is a **single-package** repo, so `vitest.config.ts` is hand-rolled (`src/**/spec/**/*.spec.ts`) rather
than using `@ariestools/vitest-config`, whose default include glob assumes a monorepo `packages/*` layout.

## Image

- `docker/Dockerfile` is the only Dockerfile. Build context is the **repo root** (`.dockerignore` lives there).
- It `npm install -g @xyo-network/xl1-cli@${XL1_CLI_VERSION}`, then COPYs `presets/` → `/opt/xl1/presets`
  and `dist/node` → `/opt/xl1/lib`.
- `scripts/build-image.sh` compiles first when `dist/node/entrypoint.mjs` is missing, then builds.
  Override with `TAG`, `XL1_CLI_VERSION`, `NODE_VERSION`, `PLATFORM`.
- `scripts/smoke-run.sh` verifies the image runs `xl1 --version` / `--help` via entrypoint passthrough.
- Scripts must stay bash-3.2 safe (macOS): expand possibly-empty arrays as `${ARR[@]+"${ARR[@]}"}`.

## Entrypoint contract

`src/entrypoint.ts` is the image ENTRYPOINT:

- With `XL1_NETWORK` **and** `XL1_ROLE` set → merges `presets/networks/<network>.json` over
  `presets/roles/<role>.json`, injects secrets, writes a generated config, and execs
  `xl1 -c <generated> start <actors…>`.
- With either unset → passes argv straight through to `xl1` (full CLI/env control).

Preserve both modes. Adding a role means adding `presets/roles/<role>.json` plus an entry in `src/roles.ts`.

## Style

ESM only; no semicolons, single quotes, 2-space indent, trailing commas. `const` over `let`; `interface`
over `type` for object shapes; named exports; explicit return types on exported functions. Default imports
for Node built-ins (`import PATH from 'node:path'`). No `enum`, no `any`, no `import * as X`, no imports
from barrel `index.ts` files. Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`).

## Versioning

The package is published to npm as **public**. Version currently tracks where it left the monorepo (5.1.0);
it now versions independently. Do not hand-edit the version field — `xy deploy*` manages bumps.
