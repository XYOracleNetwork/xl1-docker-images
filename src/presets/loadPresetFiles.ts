import FS from 'node:fs'
import PATH from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Xl1PresetNetwork, Xl1PresetRole } from './types.ts'

export function defaultPresetsDir(fromModuleUrl: string = import.meta.url): string {
  // dist/node/presets/*.mjs → package root presets/
  // src/presets/*.ts (vitest) → package root presets/
  // Docker image: prefer XL1_PRESETS_DIR=/opt/xl1/presets
  const here = PATH.dirname(fileURLToPath(fromModuleUrl))
  const candidates = [
    process.env.XL1_PRESETS_DIR,
    PATH.resolve(here, '../../../presets'),
    PATH.resolve(here, '../../presets'),
    PATH.resolve(here, '../presets'),
    '/opt/xl1/presets',
  ].filter((p): p is string => typeof p === 'string' && p.length > 0)
  for (const candidate of candidates) {
    if (FS.existsSync(candidate)) return candidate
  }
  throw new Error(
    `Could not locate presets directory (tried: ${candidates.join(', ')}). Set XL1_PRESETS_DIR.`,
  )
}

export function loadNetworkPreset(
  network: Xl1PresetNetwork,
  presetsDir: string = defaultPresetsDir(),
): Record<string, unknown> {
  return readJson(PATH.join(presetsDir, 'networks', `${network}.json`))
}

export function loadRolePreset(
  role: Xl1PresetRole,
  presetsDir: string = defaultPresetsDir(),
): Record<string, unknown> {
  return readJson(PATH.join(presetsDir, 'roles', `${role}.json`))
}

function readJson(path: string): Record<string, unknown> {
  if (!FS.existsSync(path)) {
    throw new Error(`Preset file not found: ${path}`)
  }
  const raw = FS.readFileSync(path, 'utf8')
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Preset file must be a JSON object: ${path}`)
  }
  return parsed as Record<string, unknown>
}
