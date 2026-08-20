import { deepMerge } from './deepMerge.ts'
import type {
  BuildPresetConfigInput,
  Xl1PresetRole,
  Xl1PresetSecrets,
} from './types.ts'

export interface BuiltPresetConfig {
  /** Actor names to pass to `xl1 start`. */
  readonly actors: readonly string[]
  /** Cosmiconfig document shape accepted by xl1 (`{ xl1: … }`). */
  readonly document: { readonly xl1: Record<string, unknown> }
}

/**
 * Merge network + role presets with operator secrets into an xl1 config document.
 *
 * Required operator inputs for producer: mnemonic + rewardAddress.
 * Optional: chainId, rpcUrl, evmRpcUrl.
 */
export function buildPresetConfig(input: BuildPresetConfigInput): BuiltPresetConfig {
  const merged = deepMerge(
    {},
    input.networkPreset,
    input.rolePreset,
  )

  applySecrets(merged, input.role, input.secrets)

  const actors = extractActorNames(merged)
  if (actors.length === 0) {
    throw new Error(`Preset role "${input.role}" produced no actors array`)
  }

  return {
    actors,
    document: { xl1: merged },
  }
}

function applySecrets(
  config: Record<string, unknown>,
  role: Xl1PresetRole,
  secrets: Xl1PresetSecrets,
): void {
  applyMnemonic(config, secrets.mnemonic)
  applyChainId(config, secrets.chainId)
  config.connections = applyConnectionOverrides(
    isPlainObject(config.connections) ? { ...config.connections } : {},
    secrets,
  )
  if (role === 'producer') {
    applyProducerRewardAddress(config, secrets.rewardAddress)
  }
}

function applyMnemonic(config: Record<string, unknown>, mnemonicRaw: string): void {
  const mnemonic = mnemonicRaw.trim()
  if (mnemonic.length === 0) {
    throw new Error('XL1_MNEMONIC is required when using network/role presets')
  }
  config.mnemonic = mnemonic
}

function applyChainId(config: Record<string, unknown>, chainIdRaw: string | undefined): void {
  const chainId = chainIdRaw?.trim()
  if (chainId !== undefined && chainId.length > 0) {
    const chain = isPlainObject(config.chain) ? { ...config.chain } : {}
    chain.id = chainId
    config.chain = chain
    return
  }
  if (isPlainObject(config.chain) && typeof config.chain.id === 'string' && config.chain.id.length === 0) {
    throw new Error(
      'Network preset has no chain.id — set XL1_CHAIN__ID. Read the live value with '
      + 'gateway.connection.viewer.block.chainId(); it is not the staking contract address '
      + 'and it changes when the chain forks.',
    )
  }
}

function applyConnectionOverrides(
  connections: Record<string, unknown>,
  secrets: Xl1PresetSecrets,
): Record<string, unknown> {
  const rpcUrl = secrets.rpcUrl?.trim()
  if (rpcUrl !== undefined && rpcUrl.length > 0) {
    const existing = isPlainObject(connections['default-rpc']) ? connections['default-rpc'] : {}
    connections['default-rpc'] = {
      protocol: 'http',
      type: 'rpc',
      ...existing,
      url: rpcUrl,
    }
  }
  const evmRpcUrl = secrets.evmRpcUrl?.trim()
  if (evmRpcUrl !== undefined && evmRpcUrl.length > 0) {
    const existing = isPlainObject(connections['default-evm-rpc']) ? connections['default-evm-rpc'] : {}
    connections['default-evm-rpc'] = {
      type: 'evm-rpc',
      ...existing,
      url: evmRpcUrl,
    }
  }
  return connections
}

function applyProducerRewardAddress(
  config: Record<string, unknown>,
  rewardAddressRaw: string | undefined,
): void {
  const rewardAddress = rewardAddressRaw?.trim()
  if (rewardAddress === undefined || rewardAddress.length === 0) {
    throw new Error('XL1_REWARD_ADDRESS is required for the producer role preset')
  }
  const rawActors = config.actors
  const actorList: unknown[] = Array.isArray(rawActors)
    ? rawActors.map((entry: unknown) => entry)
    : []
  config.actors = actorList.map((entry: unknown) => {
    if (!isPlainObject(entry) || entry.name !== 'producer') return entry
    return { ...entry, rewardAddress }
  })
}

function extractActorNames(config: Record<string, unknown>): string[] {
  if (!Array.isArray(config.actors)) return []
  return config.actors
    .filter(isPlainObject)
    .map(actor => actor.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
