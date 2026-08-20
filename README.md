[![logo][]](https://xyo.network)

# @xyo-network/xl1-docker-images

[![npm][npm-badge]][npm-link]
[![license][license-badge]][license-link]

> Docker images, Compose recipes, **network/role presets**, and config examples for running **XYO Layer One** network nodes.

## What this is

A **distribution kit** for operators:

| Deliverable | Purpose |
|---|---|
| **One multi-role image** | Same binary for every actor; role selected by command or preset |
| **Network × role presets** | Sequence/mainnet producer shapes baked in — minimal operator config |
| **Dockerfile** | Installs the published `@xyo-network/xl1-cli` from npm |
| **Compose + env examples** | Local stacks and full manual config when presets do not apply |
| **TS helpers** | Image refs, role catalog, `buildPresetConfig` |

The image is built entirely from **published npm artifacts** — no XL1 monorepo checkout required.

## Operator surface (preset mode)

For a **federated producer** (JsonRpc mempool + memory `BlockRunner`, no local-store):

| Variable | Required | Notes |
|---|---|---|
| `XL1_NETWORK` | yes | `sequence` or `mainnet` |
| `XL1_ROLE` | yes | `producer` (more roles later) |
| `XL1_MNEMONIC` | yes | Root wallet phrase |
| `XL1_REWARD_ADDRESS` | producer | Block reward recipient |
| `XL1_CHAIN__ID` | mainnet* | Staking contract address (*sequence has a default) |
| `XL1_RPC_URL` | no | Override public API RPC |
| `XL1_EVM_RPC_URL` | no | Override public EVM RPC |

```bash
docker run --rm \
  -e XL1_NETWORK=sequence \
  -e XL1_ROLE=producer \
  -e XL1_MNEMONIC='…' \
  -e XL1_REWARD_ADDRESS=0x… \
  xl1:local
```

Or:

```bash
cp examples/env/sequence-producer.env.example sequence-producer.env
# edit mnemonic + reward address
docker run --rm --env-file sequence-producer.env xl1:local
```

When **`XL1_NETWORK` and `XL1_ROLE` are unset**, the entrypoint passes through to `xl1` (full CLI / env config).

> Producing blocks additionally requires the producer's address to be on the network's allowed producer
> list. An unlisted node still runs healthy and submits candidates — they are simply never accepted, and
> `Published block: …` in the log means "candidate submitted", not accepted.

## Image

| | |
|---|---|
| **Registry (planned)** | `ghcr.io/xyoraclenetwork/xl1` |
| **Tags** | `<semver>`, `<semver>-<gitsha>`, `latest` |
| **Entrypoint** | preset merger → `xl1 -c <generated> start <actors…>` |
| **Passthrough** | `docker run … xl1:local start api` (no network/role env) |

Presets live under `presets/`:

```text
presets/
  networks/sequence.json   # public RPC, EVM, REST CDN URLs
  networks/mainnet.json
  roles/producer.json      # federated producer bindings (rpc + memory BlockRunner)
```

## Quick start (local build)

```bash
git clone https://github.com/XYOracleNetwork/xl1-docker-images.git
cd xl1-docker-images
pnpm install

./scripts/build-image.sh          # compiles the entrypoint if needed, builds the image
./scripts/smoke-run.sh            # xl1 --version / --help via passthrough

# Sequence producer (fill secrets first)
cp examples/env/sequence-producer.env.example sequence-producer.env
docker run --rm --env-file sequence-producer.env xl1:local
```

Pin a specific CLI release:

```bash
XL1_CLI_VERSION=5.2.0 TAG=xl1:5.2.0 ./scripts/build-image.sh
```

## Manual (non-preset) config

Still supported — omit `XL1_NETWORK`/`XL1_ROLE` and pass CLI args / full env files under `examples/env/`.

```bash
docker run --rm --env-file examples/env/api.env.example \
  -p 8080:8080 -p 9099:9099 \
  xl1:local start api
```

A federated producer **does not need** `local-store` (LMDB): it submits via JsonRpc mempool and keeps `BlockRunner` on `memory`. Authority roles (finalizer, co-located API) still need a real store — use full env/config, not the producer preset.

> **Manual mode cannot join a public network.** `providerBindings` has no environment representation
> (`XL1_PROVIDER_BINDINGS__BLOCK_VIEWER__…` camel-cases the moniker to `blockViewer`, matching no
> provider), so an env-only producer binds every viewer to its local store and extends a chain of its
> own — even with `XL1_CHAIN__ID` and a public `default-rpc` set. Use preset mode, or a mounted config
> file. The env examples under `examples/env/` are local-stack shapes.

## Compose

```bash
export XL1_IMAGE=xl1:local

# passthrough: full manual config
docker compose -f compose/node.yml up

# preset: federated Sequence producer
XL1_PRESET_ENV_FILE=../sequence-producer.env \
  docker compose -f compose/node.yml --profile preset up -d preset

# self-contained local chain (api + producer + finalizer)
docker compose -f compose/local-stack.yml --profile core up -d
```

## TypeScript

```ts
import {
  buildPresetConfig,
  loadNetworkPreset,
  loadRolePreset,
  xl1DockerImageRef,
} from '@xyo-network/xl1-docker-images'

const built = buildPresetConfig({
  network: 'sequence',
  role: 'producer',
  networkPreset: loadNetworkPreset('sequence'),
  rolePreset: loadRolePreset('producer'),
  secrets: {
    mnemonic: '…',
    rewardAddress: '0x…',
  },
})
// built.document → write as xyo.config.json; built.actors → ['producer']
```

## Development

```bash
pnpm install
pnpm xy build      # compile + publint + deplint + lint
pnpm xy test       # vitest
pnpm xy fix        # autofix lint
```

## Roadmap

- [x] Package scaffold + multi-role Dockerfile
- [x] Network/role presets + entrypoint (`sequence`/`mainnet` × `producer`)
- [x] Standalone public repository
- [ ] More role presets (validator, etc.) where federated shapes exist
- [ ] Publish mainnet `chain.id` into the network preset when stable
- [ ] CI publish to GHCR on release
- [ ] Optional convenience tags (`:sequence-producer`) = same digest + default `ENV`

## License

LGPL-3.0-only — see [LICENSE](./LICENSE).

[logo]: https://cdn.xy.company/img/brand/XYO_full_colored.png
[npm-badge]: https://img.shields.io/npm/v/@xyo-network/xl1-docker-images.svg
[npm-link]: https://www.npmjs.com/package/@xyo-network/xl1-docker-images
[license-badge]: https://img.shields.io/npm/l/@xyo-network/xl1-docker-images.svg
[license-link]: https://github.com/XYOracleNetwork/xl1-docker-images/blob/main/LICENSE
