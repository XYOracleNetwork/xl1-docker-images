#!/usr/bin/env node
/**
 * Docker / local entrypoint:
 * - When XL1_NETWORK + XL1_ROLE are set, merge presets and run
 *   `xl1 -c <generated> start <actors…>`
 * - Otherwise pass through to `xl1` with the original argv.
 *
 * Operator surface (preset mode):
 *   XL1_NETWORK=sequence|mainnet
 *   XL1_ROLE=producer
 *   XL1_MNEMONIC=…
 *   XL1_REWARD_ADDRESS=…          (producer)
 * Optional:
 *   XL1_CHAIN__ID / XL1_CHAIN_ID
 *   XL1_RPC_URL
 *   XL1_EVM_RPC_URL
 *   XL1_PRESETS_DIR
 *   XL1_CONFIG_OUT (default /tmp/xl1-preset.xyo.config.json)
 */

import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import FS from 'node:fs'
import PATH from 'node:path'
import PROCESS from 'node:process'

import {
  buildPresetConfig,
  defaultPresetsDir,
  loadNetworkPreset,
  loadRolePreset,
  XL1_PRESET_NETWORKS,
  XL1_PRESET_ROLES,
  type Xl1PresetNetwork,
  type Xl1PresetRole,
  type Xl1PresetSecrets,
} from './presets/index.ts'

const PASSTHROUGH = PROCESS.argv.slice(2)
const MONOREPO_CLI = '/app/packages/cli/dist/cli-min.mjs'

async function main(): Promise<void> {
  const selection = resolvePresetSelection()
  if (selection === undefined) {
    await execXl1(PASSTHROUGH)
    return
  }
  await runPresetMode(selection.network, selection.role)
}

interface PresetSelection {
  readonly network: Xl1PresetNetwork
  readonly role: Xl1PresetRole
}

function resolvePresetSelection(): PresetSelection | undefined {
  const networkRaw = PROCESS.env.XL1_NETWORK?.trim()
  const roleRaw = PROCESS.env.XL1_ROLE?.trim()
  const hasNetwork = networkRaw !== undefined && networkRaw.length > 0
  const hasRole = roleRaw !== undefined && roleRaw.length > 0

  if (!hasNetwork && !hasRole) return undefined
  if (!hasNetwork || !hasRole || networkRaw === undefined || roleRaw === undefined) {
    fail('Preset mode requires both XL1_NETWORK and XL1_ROLE (or neither for CLI passthrough)')
  }
  if (!isPresetNetwork(networkRaw)) {
    fail(`Unknown XL1_NETWORK="${networkRaw}". Expected one of: ${XL1_PRESET_NETWORKS.join(', ')}`)
  }
  if (!isPresetRole(roleRaw)) {
    fail(`Unknown XL1_ROLE="${roleRaw}". Expected one of: ${XL1_PRESET_ROLES.join(', ')}`)
  }
  return { network: networkRaw, role: roleRaw }
}

async function runPresetMode(network: Xl1PresetNetwork, role: Xl1PresetRole): Promise<void> {
  const presetsDir = nonEmpty(PROCESS.env.XL1_PRESETS_DIR?.trim()) ?? defaultPresetsDir()
  const built = buildPresetConfig({
    network,
    networkPreset: loadNetworkPreset(network, presetsDir),
    role,
    rolePreset: loadRolePreset(role, presetsDir),
    secrets: readSecretsFromEnv(),
  })

  const outPath = nonEmpty(PROCESS.env.XL1_CONFIG_OUT?.trim())
    ?? PATH.join(nonEmpty(PROCESS.env.TMPDIR) ?? '/tmp', 'xl1-preset.xyo.config.json')
  FS.mkdirSync(PATH.dirname(outPath), { recursive: true })
  FS.writeFileSync(outPath, `${JSON.stringify(built.document, null, 2)}\n`, 'utf8')

  // Extra CLI args after entrypoint (e.g. docker run … -- --dump-providers) are appended.
  await execXl1(['-c', outPath, 'start', ...built.actors, ...PASSTHROUGH])
}

function readSecretsFromEnv(): Xl1PresetSecrets {
  return {
    chainId: firstEnv('XL1_CHAIN__ID', 'XL1_CHAIN_ID'),
    evmRpcUrl: firstEnv('XL1_EVM_RPC_URL', 'XL1_CONNECTIONS__DEFAULT_EVM_RPC__URL'),
    mnemonic: PROCESS.env.XL1_MNEMONIC?.trim() ?? '',
    rewardAddress: firstEnv('XL1_REWARD_ADDRESS', 'XL1_ACTORS__0__REWARD_ADDRESS'),
    rpcUrl: firstEnv('XL1_RPC_URL', 'XL1_CONNECTIONS__DEFAULT_RPC__URL'),
  }
}

function firstEnv(...names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = PROCESS.env[name]?.trim()
    if (value !== undefined && value.length > 0) return value
  }
  return undefined
}

function nonEmpty(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) return undefined
  return value
}

function isPresetNetwork(value: string): value is Xl1PresetNetwork {
  return (XL1_PRESET_NETWORKS as readonly string[]).includes(value)
}

function isPresetRole(value: string): value is Xl1PresetRole {
  return (XL1_PRESET_ROLES as readonly string[]).includes(value)
}

function fail(message: string): never {
  PROCESS.stderr.write(`[xl1-docker] ${message}\n`)
  PROCESS.exit(78)
}

function execXl1(args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('xl1', [...args], {
      env: PROCESS.env,
      stdio: 'inherit',
    })
    child.on('error', (err) => {
      if (tryMonorepoFallback(args, err, reject)) return
      reject(err)
    })
    bindChildExit(child, resolve)
  })
}

function tryMonorepoFallback(
  args: readonly string[],
  err: Error,
  reject: (reason: unknown) => void,
): boolean {
  if ((err as NodeJS.ErrnoException).code !== 'ENOENT' || !FS.existsSync(MONOREPO_CLI)) {
    return false
  }
  const nodeChild = spawn(PROCESS.execPath, [MONOREPO_CLI, ...args], {
    env: PROCESS.env,
    stdio: 'inherit',
  })
  nodeChild.on('error', reject)
  bindChildExit(nodeChild, noop)
  return true
}

function noop(): void {
  // Exit path already terminates the process when a signal is received.
}

function bindChildExit(child: ChildProcess, onSignalResolve: () => void): void {
  child.on('exit', (code, signal) => {
    if (signal) {
      PROCESS.kill(PROCESS.pid, signal)
      onSignalResolve()
      return
    }
    PROCESS.exit(code ?? 1)
  })
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  PROCESS.stderr.write(`[xl1-docker] ${message}\n`)
  PROCESS.exit(1)
})
