import js from '@eslint/js'
import eslintPluginVue from 'eslint-plugin-vue'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import vueParser from 'vue-eslint-parser'

export default [
  // 1. 全局忽略
  {
    ignores: ['dist/**', 'node_modules/**', 'src-tauri/**', '*.config.js', '*.local', 'public']
  },

  // 2. 基础规则集
  js.configs.recommended,
  ...eslintPluginVue.configs['flat/recommended'],

  // 3. 核心语言与规则
  {
    files: ['**/*.{js,jsx,cjs,mjs,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      // Vue 规则
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',

      // JS 规则
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      // 允许 catch 块为空，但其他代码块仍要求非空
      'no-empty': ['error', { allowEmptyCatch: true }],
      // 允许下划线开头的变量，并忽略 catch 中的未使用的 error 参数
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none'
        }
      ],
      'no-undef': 'error'
    }
  },

  // 4. Prettier 整合
  eslintPluginPrettierRecommended
]
