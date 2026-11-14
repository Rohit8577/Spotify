import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'mobile/**', 'reports/**', 'report/**', 'thesis/**', 'assets/**', 'public/css/**', 'testEmail.js', 'replace.cjs', 'tempCodeRunnerFile.js'] },
  js.configs.recommended,
  { languageOptions: { globals: globals.node }, rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }], 'no-empty': ['error', { allowEmptyCatch: true }] } },
  { files: ['public/JS/**/*.js'], languageOptions: { globals: { ...globals.browser, sess: 'readonly', io: 'readonly', signupEmail: 'readonly', verificationToken: 'readonly', google: 'writable', Chart: 'readonly' } } },
  { files: ['tests/*browser.test.js'], languageOptions: { globals: { ...globals.browser, ...globals.node, sess: 'readonly' } } },
];
