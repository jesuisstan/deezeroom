// https://docs.expo.dev/guides/using-eslint/

module.exports = {
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
          // React and react-native first
          ['^react$', '^react-native$'],
          // Side effect imports
          ['^\u0000'],
          // Packages
          ['^@?\w'],
          // Absolute imports with @ alias
          ['^@/'],
          // Relative imports
          [
            '^\./(?=.*/)(?!/?$)',
            '^\.(?!/?$)',
            '^\./?$',
            '^\.\.(?!/?$)',
            '^\.\./?$',
            '^\.\./\..*'
          ],
          // Style imports
          ['^.+\.s?css$']
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
};
