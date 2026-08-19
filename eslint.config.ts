import { fileURLToPath } from 'node:url'

import { recommendedConfig } from '@ariestools/eslint-config-flat'
import type { Linter } from 'eslint'
import { includeIgnoreFile } from 'eslint/config'

const config: Linter.Config[] = [
  globalThis.process.env.XY_LINT_GITIGNORE === 'false'
    ? { ignores: [] }
    : includeIgnoreFile(fileURLToPath(new URL('.gitignore', import.meta.url)), {
        gitignoreResolution: true,
        name: 'XY repository .gitignore',
      }),
  { ignores: ['build', '**/build/**', 'dist', '**/dist/**', 'node_modules/**', '**/node_modules/**', '**/*.md'] },
  ...recommendedConfig({ tier: 2, isTypeChecked: true }),
]

export default config
