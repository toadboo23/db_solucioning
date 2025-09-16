import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  // Configuración base para todos los archivos
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Reglas base de JavaScript
      ...js.configs.recommended.rules,

      // Reglas de TypeScript
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
      '@typescript-eslint/no-var-requires': 'off',

      // Reglas de React
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react/prop-types': 'off', // Usamos TypeScript
      'react/react-in-jsx-scope': 'off', // No necesario con React 17+
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-array-index-key': 'warn',
      'react/no-unescaped-entities': 'warn',

      // Reglas de React Hooks
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Reglas de React Refresh (para desarrollo)
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Reglas generales de calidad
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'error',
      'no-unused-expressions': 'error',
      'no-duplicate-imports': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'eol-last': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'comma-spacing': ['error', { before: false, after: true }],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', 'always'],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'arrow-spacing': 'error',
      'no-trailing-spaces': 'error',
      'no-multi-spaces': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'max-len': ['warn', { code: 100, ignoreUrls: true, ignoreStrings: true }],
    },
  },

  // Configuración específica para archivos del servidor
  {
    files: ['server/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      'no-console': 'off', // Permitir console en el servidor
      '@typescript-eslint/no-var-requires': 'off',
    },
  },

  // Configuración específica para archivos de configuración
  {
    files: ['*.config.{js,ts}', 'vite.config.ts', 'tailwind.config.ts', 'drizzle.config.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },

  // Ignorar archivos específicos
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '*.min.js',
      '*.bundle.js',
    ],
  },
];
