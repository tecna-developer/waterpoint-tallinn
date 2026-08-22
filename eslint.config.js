import js from '@eslint/js';
import globals from 'globals';

// Цель — ловить ошибки, а не спорить о стиле: правил форматирования здесь намеренно нет.
// Отступы и кавычки в этом проекте уже единообразны, а спорные стилевые правила дали бы
// шум, в котором потерялись бы настоящие находки.
export default [
  { ignores: ['dist/**', 'node_modules/**', '.playwright-mcp/**'] },

  // Приложение: браузер, ES-модули.
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.browser
    },
    rules: {
      ...js.configs.recommended.rules,
      // Неиспользованное — главное, ради чего это ставилось: после выноса модулей из
      // main.js легко остаются висящие импорты, которых не видят ни сборка, ни тесты.
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_' }]
    }
  },

  // Service worker живёт в своём окружении: self, caches, clients.
  {
    files: ['src/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.browser } },
    rules: js.configs.recommended.rules
  },

  // Скрипты запускаются в Node, а contrast-audit.js — в браузере из консоли.
  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: js.configs.recommended.rules
  },

  // Тесты: Vitest даёт describe/it/expect, jsdom — браузерные глобалы.
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, describe: 'readonly', it: 'readonly',
                 expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', vi: 'readonly' }
    },
    rules: js.configs.recommended.rules
  },

  // Конфиги собираются Node'ом.
  {
    files: ['*.config.js'],
    languageOptions: { sourceType: 'module', globals: globals.node },
    rules: js.configs.recommended.rules
  }
];
