import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    },
  },
  {
    ignores: [
      '**/dist',
      '**/dist-test',
      '**/node_modules',
      'web/vite.config.js',
      'web/vite.config.d.ts',
    ],
  },
)
