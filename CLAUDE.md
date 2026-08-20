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

### `chain.id` is the live chain id, not the staking contract address

A network preset's `chain.id` must be the **current chain id of the running chain**, bare lowercase hex
(the CLI parses it with `/^[0-9a-f]+$/`). Read it from a running network:

```ts
const gw = await new GatewayBuilder().name('probe')
  .rpcUrl(`${net.url}/rpc`).dataLakeEndpoint(NetworkDataLakeUrls[net.id]).build()
await gw.connection.viewer.block.chainId()   // sequence: 4b43a753c8024c0e5000e8ac948ac0063ac624bc
```

Despite the CLI's own config description ("Should be the staking contract address for contract-backed
chains") and upstream's `.example.env`, the Sepolia staking contract address
`dd381fbb392c85160d8b0453e446757b12384046` is **not** sequence's chain id — a chain keeps its ledger but
takes a new id when it forks. A wrong value makes every produced block fail validation with
`BlockValidationError: Invalid chain id`. Re-verify after any announced fork; a pinned preset value is
perishable.

On xl1-cli ≤ 5.1.1 this failed **silently**: the node fabricated an in-memory genesis stamped with the
configured (wrong) id, then validated its own blocks against that fake chain and reported
`Published block: …` for blocks the network would reject. Requires 5.2.0+ to fail loudly.

### Producing on sequence requires an allowlisted address

Correct config is necessary but not sufficient. The network only accepts blocks from producers on its
allowed list, so a correctly configured node with an unlisted address runs healthy, tracks the head,
builds candidates, submits them — and never lands one. Verified with a throwaway wallet: candidates at
562214/562215/562218/562220 were all superseded by other creators, the reward address balance stayed
`0n`, and every block in 562210–562240 came from one of three allowlisted addresses.

`Published block: …` in the producer log means "candidate submitted to the mempool", **not** accepted.
Acceptance is only provable from the chain: compare `viewer.block.blockByNumber(n)[0]._hash` against the
hash the producer logged, or watch the reward address balance.

### Requires xl1-cli 5.2.0+

Earlier releases print `INSECURE GENESIS REWARD WALLET WARNING` on every run, federated producers
included, and it is not cosmetic — the node really does fabricate a genesis block into its ephemeral
memory archivist. `shouldSkipLocalNodeBoot()` was documented as "true when the process config declares
no store connection (rpc-only / federated)", but `connectionProfiles()` injects a `memory` profile and
`storeConnectionName()` accepted `memory` as a bindable store, so it returned `false` for every config
and the federated path was unreachable. 5.2.0 routes it through `localChainStoreConnectionName()`, which
reads `config.connections` directly and counts only persistent (lmdb/mongo) stores. Do not downgrade the
`XL1_CLI_VERSION` default below 5.2.0.

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
