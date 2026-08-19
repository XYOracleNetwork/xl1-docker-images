/**
 * Metadata for XL1 actor roles that can run in the multi-role Docker image.
 * Command shape: `xl1 start <cliName>` (or multiple actors).
 */
export interface Xl1DockerRole {
  /** BIP-32 accountPath suffix relative to m/44'/60'/0'/0 (default when unset). */
  readonly defaultAccountPath: string
  /** Optional HTTP port commonly published for this role (undefined if headless). */
  readonly defaultPort?: number
  /** Short operator-facing description. */
  readonly description: string
  /** Legacy CLI subcommand still accepted (deprecated in favor of `start`). */
  readonly legacyCommand: string
  /**
   * Actor name accepted by `xl1 start` and `XL1_ACTORS__n__NAME`.
   * Matches ActorDescriptor.name (camelCase for rewardRedemption).
   */
  readonly name: string
}

/** All installed actor roles shippable via the multi-role image. */
export const XL1_DOCKER_ROLES: readonly Xl1DockerRole[] = [
  {
    name: 'api',
    legacyCommand: 'api',
    defaultAccountPath: '3',
    defaultPort: 8080,
    description: 'JSON-RPC / REST API node for chain reads and writes',
  },
  {
    name: 'producer',
    legacyCommand: 'producer',
    defaultAccountPath: '0',
    defaultPort: 8081,
    description: 'Block producer (requires stake and connections to chain state)',
  },
  {
    name: 'finalizer',
    legacyCommand: 'finalizer',
    defaultAccountPath: '5',
    description: 'Selects and writes canonical finalizations; optional S3 publish',
  },
  {
    name: 'mempool',
    legacyCommand: 'mempool',
    defaultAccountPath: '4',
    defaultPort: 8084,
    description: 'Mempool prune timers; optional standalone mempool RPC',
  },
  {
    name: 'indexer',
    legacyCommand: 'indexer',
    defaultAccountPath: '6',
    description: 'Publishes derived index frames from finalized chain head',
  },
  {
    name: 'bridge',
    legacyCommand: 'bridge',
    defaultAccountPath: '1',
    description: 'Bridge to a backing EVM chain (often needs Redis)',
  },
  {
    name: 'validator',
    legacyCommand: 'validator',
    defaultAccountPath: '7',
    description: 'Step-level witness / validation duties',
  },
  {
    name: 'rewardRedemption',
    legacyCommand: 'reward-redemption-api',
    defaultAccountPath: '2',
    description: 'Reward redemption HTTP API',
  },
] as const

/** Actor names only, in catalog order. */
export const XL1_DOCKER_ROLE_NAMES: readonly string[] = XL1_DOCKER_ROLES.map(role => role.name)

/** Process-wide health port used by the CLI (all actors). */
export const XL1_DEFAULT_HEALTH_CHECK_PORT = 9099

export function getDockerRole(name: string): Xl1DockerRole | undefined {
  return XL1_DOCKER_ROLES.find(role => role.name === name || role.legacyCommand === name)
}
