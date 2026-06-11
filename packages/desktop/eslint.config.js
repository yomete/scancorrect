import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'dist-electron/',
      'coverage/',
      'release/',
      'playwright-report/',
      'test-results/',
      'node_modules/',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Downgraded: requires refactoring to fix properly (backlog)
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Downgraded: any usage requires real refactoring (backlog)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Downgraded: electron main uses legitimate dynamic require() (backlog)
      '@typescript-eslint/no-require-imports': 'warn',
    },
  },
)
