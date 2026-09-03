/** Supported public network presets. */
export type Xl1PresetNetwork = 'sequence' | 'mainnet'

/** Supported role presets (federated shapes first). */
export type Xl1PresetRole = 'producer' | 'producer-rest'

export interface Xl1PresetSecrets {
  /** Optional override for chain.id (staking contract address). */
  readonly chainId?: string
  /** Optional override for default-evm-rpc URL. */
  readonly evmRpcUrl?: string
  /** Root mnemonic for BIP-32 derivation. */
  readonly mnemonic: string
  /** Producer block reward recipient (hex address). Required for producer roles. */
  readonly rewardAddress?: string
  /** Optional override for default-rpc URL. */
  readonly rpcUrl?: string
}

export interface BuildPresetConfigInput {
  readonly network: Xl1PresetNetwork
  readonly networkPreset: Record<string, unknown>
  readonly role: Xl1PresetRole
  readonly rolePreset: Record<string, unknown>
  readonly secrets: Xl1PresetSecrets
}

/** Known networks that ship presets. */
export const XL1_PRESET_NETWORKS = ['sequence', 'mainnet'] as const

/** Known roles that ship presets. */
export const XL1_PRESET_ROLES = ['producer', 'producer-rest'] as const

/** Actor names started for each role preset. */
export const XL1_PRESET_ROLE_ACTORS: Readonly<Record<Xl1PresetRole, readonly string[]>> = {
  producer: ['producer'],
  'producer-rest': ['producer'],
}

/** True when the preset starts the producer actor and requires XL1_REWARD_ADDRESS. */
export function isProducerPresetRole(role: Xl1PresetRole): boolean {
  return XL1_PRESET_ROLE_ACTORS[role].includes('producer')
}
