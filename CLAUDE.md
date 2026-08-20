# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **single-package** repository publishing `@xyo-network/xl1-docker-images` — the operator distribution kit
for XYO Layer One nodes: one multi-role Docker image, network×role JSON presets, Compose recipes, env
examples, and the TypeScript entrypoint/preset helpers.

It was split out of the private `xyo-chain` monorepo so it *can* be made public later. **This GitHub
repository is private for now** and stays private until an intentional release — do not change its
visibility. It has **no dependency on that monorepo**: the image installs the published
`@xyo-network/xl1-cli` from npm at build time.

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

### The `XL1_` env namespace is shared with the CLI

`xl1` maps **every** `XL1_*` variable into its config document (`XL1_FOO__BAR` → `foo.bar`) and rejects
unrecognized root keys. So any operator-facing variable this entrypoint invents (`XL1_NETWORK`,
`XL1_ROLE`, `XL1_REWARD_ADDRESS`, `XL1_PRESETS_DIR`, …) collides with that namespace and kills the CLI
before any actor starts — in preset *and* passthrough mode. `src/childEnv.ts` strips them from the child
environment; **add every new entrypoint-owned variable to `XL1_ENTRYPOINT_ENV_NAMES`**, and never set one
in the Dockerfile `ENV` without doing so.

Valid CLI keys, by contrast, must use the CLI's own spelling: `XL1_LOG__LOG_LEVEL` (not `XL1_LOG_LEVEL`),
`XL1_CONNECTIONS__DEFAULT_EVM_RPC__CHAIN_ID` (there is no `evm` config root). `chain.id` is parsed with
`/^[0-9a-f]+$/` — bare lowercase hex, no `0x`, no checksum casing. `providerBindings` cannot be set from
env at all: monikers camelCase to `blockRunner`, which does not match `BlockRunner`.

### Known upstream defect: INSECURE GENESIS REWARD WALLET WARNING

Every run prints this, federated producers included. It is **not** cosmetic — the node really is
fabricating a genesis block, into its ephemeral memory archivist. Two independent defects in
`xyo-chain` (confirmed present in xl1-cli 5.0.2 **and** 5.1.1) cause it:

1. `shouldSkipLocalNodeBoot()` is documented as "true when the process config declares no store
   connection (rpc-only / federated)", but `connectionProfiles()` unconditionally injects a `memory`
   profile and `storeConnectionName()` accepts `memory` as a bindable store — so it returns `false`
   for *every* config, including one with no connections at all. Nothing else in the repo ever passes
   `skipLocalNode` explicitly, so the federated path is unreachable and there is no operator-side
   workaround.
2. `initFinalizationArchivistIfNeeded()` bootstraps a genesis whenever the local archivist is empty
   (`if (!possibleHead)`), ignoring `config.chain.id` — despite its own comment reading "if there is
   no configured chain ID and no head, create a new chain".

Setting `chain.genesisRewardAddress` would silence the warning but still fabricate the block, and no
published value exists for sequence/mainnet (upstream uses it only in test setups) — so do not invent
one. Leave it until upstream is fixed.

### Provider bindings

A role preset's `providerBindings` must match what the installed CLI actually offers. Providers declare
`connectionTypes`; binding a connection to a provider that declares `["none"]` fails with
`MissingCapabilityError`. `BlockRewardViewer` (SimpleBlockRewardViewer) is connectionless — leave it
unbound and let the closure resolve it.

## Style

ESM only; no semicolons, single quotes, 2-space indent, trailing commas. `const` over `let`; `interface`
over `type` for object shapes; named exports; explicit return types on exported functions. Default imports
for Node built-ins (`import PATH from 'node:path'`). No `enum`, no `any`, no `import * as X`, no imports
from barrel `index.ts` files. Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`).

## Versioning

The npm package `@xyo-network/xl1-docker-images` is already public at 5.1.0 (published from the monorepo),
so any publish from here must bump past it. Version currently tracks where it left the monorepo;
it now versions independently. Do not hand-edit the version field — `xy deploy*` manages bumps.
