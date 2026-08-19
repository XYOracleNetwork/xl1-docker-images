import {
  describe, expect, it,
} from 'vitest'

// eslint-disable-next-line no-restricted-imports
import {
  getDockerRole,
  XL1_DOCKER_ROLE_NAMES,
  XL1_DOCKER_ROLES,
  xl1DockerImageRef,
  xl1DockerReleaseTag,
} from '../index.ts'

describe('XL1 docker roles', () => {
  it('lists the installed actor catalog', () => {
    expect(XL1_DOCKER_ROLE_NAMES).toEqual([
      'api',
      'producer',
      'finalizer',
      'mempool',
      'indexer',
      'bridge',
      'validator',
      'rewardRedemption',
    ])
  })

  it('resolves roles by name and legacy command', () => {
    expect(getDockerRole('api')?.defaultPort).toBe(8080)
    expect(getDockerRole('reward-redemption-api')?.name).toBe('rewardRedemption')
    expect(getDockerRole('missing')).toBeUndefined()
  })

  it('keeps unique default account paths', () => {
    const paths = XL1_DOCKER_ROLES.map(role => role.defaultAccountPath)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('image refs', () => {
  it('formats registry refs and release tags', () => {
    expect(xl1DockerImageRef('5.0.2')).toBe('ghcr.io/xyoraclenetwork/xl1:5.0.2')
    expect(xl1DockerReleaseTag('5.0.2')).toBe('5.0.2')
    expect(xl1DockerReleaseTag('5.0.2', 'abcdef123456')).toBe('5.0.2-abcdef1')
  })
})
