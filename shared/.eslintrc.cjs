/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['../.eslintrc.cjs'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    'no-console': 'error', // No console in shared package
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