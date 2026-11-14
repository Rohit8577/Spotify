const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', '.expo/**', 'node_modules/**'] },
  // Loading indicators and timestamps in async UI handlers are advisory compiler
  // diagnostics here; hook ordering and JavaScript correctness stay errors.
  { rules: { 'react-hooks/set-state-in-effect': 'warn', 'react-hooks/purity': 'warn' } },
]);
