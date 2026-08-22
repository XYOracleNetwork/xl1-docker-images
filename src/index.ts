export {
  buildPresetConfig,
  type BuildPresetConfigInput,
  type BuiltPresetConfig,
  deepMerge,
  defaultPresetsDir,
  loadNetworkPreset,
  loadRolePreset,
  XL1_PRESET_NETWORKS,
  XL1_PRESET_ROLE_ACTORS,
  XL1_PRESET_ROLES,
  type Xl1PresetNetwork,
  type Xl1PresetRole,
  type Xl1PresetSecrets,
} from './presets/index.ts'
export {
  getDockerRole,
  XL1_DEFAULT_HEALTH_CHECK_PORT,
  XL1_DOCKER_ROLE_NAMES,
  XL1_DOCKER_ROLES,
  type Xl1DockerRole,
} from './roles.ts'

/** Public container registry host (GHCR). */
export const XL1_DOCKER_REGISTRY = 'ghcr.io'

/**
 * Image repository under GHCR.
 * Full reference example: `ghcr.io/xyoraclenetwork/xl1:5.2.2`
 */
export const XL1_DOCKER_IMAGE_REPOSITORY = 'xyoraclenetwork/xl1'

/** Registry + repository without tag. */
export const XL1_DOCKER_IMAGE = `${XL1_DOCKER_REGISTRY}/${XL1_DOCKER_IMAGE_REPOSITORY}`

/** npm package that the public image installs as the runtime. */
export const XL1_CLI_PACKAGE_NAME = '@xyo-network/xl1-cli'

/**
 * Build a full image reference for a given tag (semver, sha, or `latest`).
 */
export function xl1DockerImageRef(tag: string): string {
  return `${XL1_DOCKER_IMAGE}:${tag}`
}

/**
 * Build a release tag from package version and optional short git hash.
 * Examples: `5.2.2`, `5.2.2-a1b2c3d`
 */
export function xl1DockerReleaseTag(version: string, gitSha?: string): string {
  if (gitSha === undefined || gitSha.length === 0) return version
  const short = gitSha.slice(0, 7)
  return `${version}-${short}`
}
