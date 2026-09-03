import PATH from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  describe, expect, it,
} from 'vitest'

import {
  buildPresetConfig,
  isProducerPresetRole,
  loadNetworkPreset,
  loadRolePreset,
  XL1_PRESET_ROLES,
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
    const connections = xl1.connections as Record<string, { baseUrl?: string; type?: string; url?: string }>
    expect(connections['default-rpc']?.url).toContain('beta.api.chain.xyo.network')
    expect(connections['default-evm-rpc']?.type).toBe('evm-rpc')
    expect(connections['rest-finalized']?.baseUrl).toBe('https://blocks.sequence.xyo.space')

    const bindings = xl1.providerBindings as Record<string, { connection: string }>
    expect(bindings.BlockViewer.connection).toBe('default-rpc')
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

  it.each(XL1_PRESET_ROLES)('%s requires mnemonic and producer reward address', (role) => {
    expect(isProducerPresetRole(role)).toBe(true)
    expect(() => buildPresetConfig({
      network: 'sequence',
      role,
      networkPreset: loadNetworkPreset('sequence', presetsDir),
      rolePreset: loadRolePreset(role, presetsDir),
      secrets: { mnemonic: '', rewardAddress: '0x1' },
    })).toThrow(/XL1_MNEMONIC/)

    expect(() => buildPresetConfig({
      network: 'sequence',
      role,
      networkPreset: loadNetworkPreset('sequence', presetsDir),
      rolePreset: loadRolePreset(role, presetsDir),
      secrets: { mnemonic: 'test test test test test test test test test test test junk' },
    })).toThrow(/XL1_REWARD_ADDRESS/)
  })

  it('merges producer-rest onto REST chain viewers and keeps mempool on rpc', () => {
    const built = buildPresetConfig({
      network: 'sequence',
      role: 'producer-rest',
      networkPreset: loadNetworkPreset('sequence', presetsDir),
      rolePreset: loadRolePreset('producer-rest', presetsDir),
      secrets: {
        mnemonic: 'test test test test test test test test test test test junk',
        rewardAddress: '0x1111111111111111111111111111111111111111',
      },
    })

    expect(built.actors).toEqual(['producer'])
    const bindings = built.document.xl1.providerBindings as Record<string, { connection: string }>
    expect(bindings.BlockViewer.connection).toBe('rest-finalized')
    expect(bindings.ChainStateViewer.connection).toBe('rest-chain-state')
    expect(bindings.FinalizationViewer.connection).toBe('rest-chain-state')
    expect(bindings.IndexViewer.connection).toBe('rest-index')
    expect(bindings.MempoolViewer.connection).toBe('default-rpc')
    expect(bindings.MempoolRunner.connection).toBe('default-rpc')
    expect(bindings.ChainContractViewer.connection).toBe('default-evm-rpc')
    expect(bindings.EvmChainViewer.connection).toBe('default-evm-rpc')
    expect(bindings.StakeTotalsViewer.connection).toBe('default-evm-rpc')
    expect(bindings.BlockRunner.connection).toBe('memory')
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

describe('preset shapes the xl1 CLI accepts', () => {
  // The CLI parses chain.id with HexZod (/^[0-9a-f]+$/) — checksummed or
  // 0x-prefixed values are rejected before any actor starts.
  it.each(['sequence', 'mainnet'] as const)('%s chain.id is bare lowercase hex', (network) => {
    const preset = loadNetworkPreset(network, presetsDir)
    const id = (preset.chain as { id: string }).id
    expect(id).toMatch(/^[0-9a-f]*$/)
  })

  it('builds a sequence chain.id the CLI hex check accepts', () => {
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
    expect((built.document.xl1.chain as { id: string }).id).toMatch(/^[0-9a-f]+$/)
  })

  // SimpleBlockRewardViewer declares connectionTypes ["none"], so any
  // `connection` on this binding makes provider resolution fail.
  it.each(XL1_PRESET_ROLES)('leaves BlockRewardViewer unbound in %s', (role) => {
    const preset = loadRolePreset(role, presetsDir)
    const bindings = preset.providerBindings as Record<string, unknown>
    expect(bindings.BlockRewardViewer).toBeUndefined()
  })

  it('binds producer chain reads to rpc', () => {
    const preset = loadRolePreset('producer', presetsDir)
    const bindings = preset.providerBindings as Record<string, { connection: string }>
    expect(bindings.BlockViewer.connection).toBe('default-rpc')
    expect(bindings.FinalizationViewer.connection).toBe('default-rpc')
    expect(bindings.AccountBalanceViewer.connection).toBe('default-rpc')
    expect(bindings.MempoolRunner.connection).toBe('default-rpc')
  })

  // SimpleAccountBalanceViewer / SimpleTimeSyncViewer are connectionless
  // (`["none"]`) and derive from REST BlockViewer / EvmChainViewer.
  it('leaves connectionless producer-rest viewers unbound', () => {
    const preset = loadRolePreset('producer-rest', presetsDir)
    const bindings = preset.providerBindings as Record<string, unknown>
    expect(bindings.AccountBalanceViewer).toBeUndefined()
    expect(bindings.TimeSyncViewer).toBeUndefined()
  })

  it('binds producer-rest chain reads to REST and mempool submit to rpc', () => {
    const preset = loadRolePreset('producer-rest', presetsDir)
    const bindings = preset.providerBindings as Record<string, { connection: string }>
    expect(bindings.BlockViewer.connection).toBe('rest-finalized')
    expect(bindings.ChainStateViewer.connection).toBe('rest-chain-state')
    expect(bindings.FinalizationViewer.connection).toBe('rest-chain-state')
    expect(bindings.IndexViewer.connection).toBe('rest-index')
    expect(bindings.MempoolViewer.connection).toBe('default-rpc')
    expect(bindings.MempoolRunner.connection).toBe('default-rpc')
  })
})
