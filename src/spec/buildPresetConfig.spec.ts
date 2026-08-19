import PATH from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  describe, expect, it,
} from 'vitest'

import {
  buildPresetConfig,
  loadNetworkPreset,
  loadRolePreset,
} from '../presets/index.ts'

const presetsDir = PATH.resolve(PATH.dirname(fileURLToPath(import.meta.url)), '../../presets')

describe('buildPresetConfig (sequence producer)', () => {
  it('merges network + role and injects mnemonic + rewardAddress', () => {
    const built = buildPresetConfig({
      network: 'sequence',
      role: 'producer',
      networkPreset: loadNetworkPreset('sequence', presetsDir),
      rolePreset: loadRolePreset('producer', presetsDir),
      secrets: {
        mnemonic: 'test test test test test test test test test test test junk',
        rewardAddress: '0x1111111111111111111111111111111111111111',
      },
    })

    expect(built.actors).toEqual(['producer'])
    expect(built.document.xl1.mnemonic).toBe('test test test test test test test test test test test junk')

    const xl1 = built.document.xl1
    const connections = xl1.connections as Record<string, { type?: string; url?: string }>
    expect(connections['default-rpc']?.url).toContain('beta.api.chain.xyo.network')
    expect(connections['default-evm-rpc']?.type).toBe('evm-rpc')

    const bindings = xl1.providerBindings as Record<string, { connection: string }>
    expect(bindings.MempoolRunner.connection).toBe('default-rpc')
    expect(bindings.BlockRunner.connection).toBe('memory')

    const actors = xl1.actors as { name: string; rewardAddress?: string }[]
    expect(actors[0]?.rewardAddress).toBe('0x1111111111111111111111111111111111111111')
  })

  it('allows rpc and chain overrides', () => {
    const built = buildPresetConfig({
      network: 'sequence',
      role: 'producer',
      networkPreset: loadNetworkPreset('sequence', presetsDir),
      rolePreset: loadRolePreset('producer', presetsDir),
      secrets: {
        mnemonic: 'test test test test test test test test test test test junk',
        rewardAddress: '0x2222222222222222222222222222222222222222',
        chainId: 'abc123',
        rpcUrl: 'http://custom-rpc.example/rpc',
        evmRpcUrl: 'http://custom-evm.example',
      },
    })
    const xl1 = built.document.xl1
    expect((xl1.chain as { id: string }).id).toBe('abc123')
    const connections = xl1.connections as Record<string, { url?: string }>
    expect(connections['default-rpc']?.url).toBe('http://custom-rpc.example/rpc')
    expect(connections['default-evm-rpc']?.url).toBe('http://custom-evm.example')
  })

  it('requires mnemonic and producer reward address', () => {
    expect(() => buildPresetConfig({
      network: 'sequence',
      role: 'producer',
      networkPreset: loadNetworkPreset('sequence', presetsDir),
      rolePreset: loadRolePreset('producer', presetsDir),
      secrets: { mnemonic: '', rewardAddress: '0x1' },
    })).toThrow(/XL1_MNEMONIC/)

    expect(() => buildPresetConfig({
      network: 'sequence',
      role: 'producer',
      networkPreset: loadNetworkPreset('sequence', presetsDir),
      rolePreset: loadRolePreset('producer', presetsDir),
      secrets: { mnemonic: 'test test test test test test test test test test test junk' },
    })).toThrow(/XL1_REWARD_ADDRESS/)
  })

  it('requires chain.id for mainnet when empty and not overridden', () => {
    expect(() => buildPresetConfig({
      network: 'mainnet',
      role: 'producer',
      networkPreset: loadNetworkPreset('mainnet', presetsDir),
      rolePreset: loadRolePreset('producer', presetsDir),
      secrets: {
        mnemonic: 'test test test test test test test test test test test junk',
        rewardAddress: '0x1111111111111111111111111111111111111111',
      },
    })).toThrow(/chain\.id/)
  })
})
