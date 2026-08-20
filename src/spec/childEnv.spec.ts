import {
  describe, expect, it,
} from 'vitest'

import { childEnv, XL1_ENTRYPOINT_ENV_NAMES } from '../childEnv.ts'

describe('childEnv', () => {
  it('strips entrypoint-owned XL1_* names the CLI would reject as config keys', () => {
    const next = childEnv({
      XL1_CONFIG_OUT: '/tmp/generated.json',
      XL1_DATA_DIR: '/data',
      XL1_EVM_RPC_URL: 'https://evm.example',
      XL1_NETWORK: 'sequence',
      XL1_PRESETS_DIR: '/opt/xl1/presets',
      XL1_REWARD_ADDRESS: '0x1111111111111111111111111111111111111111',
      XL1_ROLE: 'producer',
      XL1_RPC_URL: 'https://rpc.example',
    })

    expect(Object.keys(next)).toEqual([])
  })

  it('passes through names the CLI understands', () => {
    const next = childEnv({
      PATH: '/usr/bin',
      XL1_ACTORS__0__REWARD_ADDRESS: '0x2222222222222222222222222222222222222222',
      XL1_CHAIN__ID: 'dd381fbb392c85160d8b0453e446757b12384046',
      XL1_CONNECTIONS__DEFAULT_RPC__URL: 'https://rpc.example',
      XL1_HEALTH_CHECK_PORT: '9099',
      XL1_MNEMONIC: 'test test test test test test test test test test test junk',
      XL1_NETWORK: 'sequence',
    })

    expect(next.XL1_NETWORK).toBeUndefined()
    expect(next.PATH).toBe('/usr/bin')
    expect(next.XL1_MNEMONIC).toBe('test test test test test test test test test test test junk')
    expect(next.XL1_CHAIN__ID).toBe('dd381fbb392c85160d8b0453e446757b12384046')
    expect(next.XL1_CONNECTIONS__DEFAULT_RPC__URL).toBe('https://rpc.example')
    expect(next.XL1_HEALTH_CHECK_PORT).toBe('9099')
    expect(next.XL1_ACTORS__0__REWARD_ADDRESS).toBe('0x2222222222222222222222222222222222222222')
  })

  it('leaves the source environment untouched', () => {
    const source = { XL1_NETWORK: 'sequence' }
    childEnv(source)
    expect(source.XL1_NETWORK).toBe('sequence')
  })

  it('never strips a name the CLI maps to a real config key', () => {
    // XL1_CHAIN__ID → chain.id and XL1_MNEMONIC → mnemonic are both valid.
    expect(XL1_ENTRYPOINT_ENV_NAMES).not.toContain('XL1_CHAIN__ID')
    expect(XL1_ENTRYPOINT_ENV_NAMES).not.toContain('XL1_MNEMONIC')
    expect(XL1_ENTRYPOINT_ENV_NAMES).not.toContain('XL1_HEALTH_CHECK_PORT')
  })
})
