import { defineConfig } from 'vitest/config';

// Отдельно от vite.config.js намеренно: там подключён vite-plugin-pwa, который при
// прогоне тестов только мешает — генерировать service worker незачем.
export default defineConfig({
  test: {
    // data.js импортирует i18n.js, а тот читает localStorage, navigator.languages и
    // document.documentElement уже при загрузке модуля. Без DOM-окружения импорт падает.
    environment: 'jsdom',
    include: ['tests/**/*.test.js']
  }
});
