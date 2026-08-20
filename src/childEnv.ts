/**
 * The `xl1` CLI maps *every* `XL1_*` environment variable into its config
 * document (`XL1_FOO__BAR` → `foo.bar`) and rejects unrecognized root keys.
 *
 * This entrypoint owns several `XL1_*` names of its own (preset selection,
 * secrets that get folded into the generated config, entrypoint-only paths).
 * Left in the child environment they surface as
 * `Unrecognized keys: "network", "role", "rewardAddress", …` and the CLI exits
 * before starting any actor — in preset *and* passthrough mode.
 *
 * They are therefore stripped before `xl1` is spawned. Names that the CLI does
 * understand (`XL1_MNEMONIC`, `XL1_CHAIN__ID`, `XL1_HEALTH_CHECK_PORT`,
 * `XL1_CONNECTIONS__*`, `XL1_ACTORS__*`, …) are passed through untouched.
 */
export const XL1_ENTRYPOINT_ENV_NAMES: readonly string[] = [
  // Preset selection
  'XL1_NETWORK',
  'XL1_ROLE',
  // Secrets / overrides folded into the generated config
  'XL1_CHAIN_ID',
  'XL1_EVM_RPC_URL',
  'XL1_REWARD_ADDRESS',
  'XL1_RPC_URL',
  // Entrypoint-only paths
  'XL1_CONFIG_OUT',
  'XL1_DATA_DIR',
  'XL1_PRESETS_DIR',
] as const

/** Copy of `env` with every entrypoint-owned `XL1_*` name removed. */
export function childEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next = { ...env }
  for (const name of XL1_ENTRYPOINT_ENV_NAMES) {
    delete next[name]
  }
  return next
}
