/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['../.eslintrc.cjs'],
  env: {
    node: true,
    es2022: true,
  },
  globals: {
    NodeJS: 'readonly',
  },
  rules: {
    'no-console': 'error', // Force use of logger instead of console.log
    'no-process-exit': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};