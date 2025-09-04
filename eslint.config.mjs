// ESLint v9 flat config in ESM format with backward-compat via FlatCompat
// Maps legacy .eslintrc-style options to flat config while preserving your rules

import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.config({
    extends: ['expo', 'prettier'],
    ignorePatterns: ['/dist/*'],
    plugins: ['prettier', 'simple-import-sort'],
    rules: {
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'lf',
          semi: true,
          trailingComma: 'none',
          singleQuote: true,
          printWidth: 80,
          tabWidth: 2,
          useTabs: false
        }
      ],
      'import/no-unresolved': 'off',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react$', '^react-native$'],
            ['^\u0000'],
            ['^@?\\w'],
            ['^@/'],
            [
              '^\\./(?=.*/)(?!/?$)',
              '^\\.(?!/?$)',
              '^\\./?$',
              '^\\.\\.(?!/?$)',
              '^\\.\\./?$',
              '^\\.\\./\\..*'
            ],
            ['^.+\\.s?css$'],
            ['^[./]']
          ]
        }
      ],
      'simple-import-sort/exports': 'error',
      'linebreak-style': ['error', 'unix']
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json'
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx']
        }
      }
    }
  })
];
