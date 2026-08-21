import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist'
  },
  plugins: [
    VitePWA({
      // injectManifest, а не generateSW: воркер остаётся нашим (src/sw.js) со всеми
      // его решениями — фолбэк только для навигации, cache-first для хешированных
      // файлов, отказ кешировать ошибочные ответы. Плагин нужен ровно для одного:
      // подставить в него точный список файлов сборки вместо разбора index.html
      // регуляркой в браузере.
      // Что при этом всё-таки попадает в бандл: workbox-window (~2.3 КБ gzip) —
      // за ним стоит virtual:pwa-register, который отслеживает появление нового
      // воркера для баннера обновления. Модули кеширования Workbox не попадают:
      // весь рантайм кеша — свой, в src/sw.js.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: null,   // регистрируем сами — на localhost воркер намеренно не нужен
      manifest: false,        // manifest.webmanifest свой, лежит в public/
      injectManifest: {
        // png/svg/webmanifest — чтобы иконки PWA попадали в кеш на install, а не
        // подтягивались только после первого обращения
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // og.png под этот шаблон попадает, но в оболочке ему делать нечего: баннер
        // Open Graph читают краулеры соцсетей по прямой ссылке, само приложение не
        // запрашивает его никогда. При этом весит он больше всех остальных файлов
        // оболочки вместе взятых — то есть офлайн-установка ради него удваивалась.
        globIgnores: ['og.png']
      }
    })
  ]
});
