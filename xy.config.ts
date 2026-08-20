import type { XyConfig } from '@ariestools/toolchain'

const config: XyConfig = {
  compile: {
    entryMode: 'custom',
    node: {
      src: {
        entry: [
          'index.ts',
          'entrypoint.ts',
          'childEnv.ts',
          'roles.ts',
          'presets/index.ts',
          'presets/buildPresetConfig.ts',
          'presets/deepMerge.ts',
          'presets/loadPresetFiles.ts',
          'presets/types.ts',
        ],
      },
    },
  },
}

export default config
