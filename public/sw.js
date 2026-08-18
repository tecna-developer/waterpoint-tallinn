// Кеш оболочки приложения (FR-08: офлайн-доступ к списку/карточкам; тайлы карт не кешируем)
// версию поднимаем при каждом релизе — иначе установленное PWA живёт на старой оболочке
const CACHE = 'wpt-shell-v4';

// В кеш кладём не только HTML, но и файлы сборки, на которые он ссылается. Иначе
// оболочка неполна: при запуске PWA приходит свежий index.html с новыми хешами, а сам
// бандл ещё не разошёлся по CDN или запрос сорвался — скрипта нет, кеш пуст, экран белый.
// Хеши заранее неизвестны (их даёт Vite), поэтому вычитываем их из самого index.html.
async function precacheShell() {
  const cache = await caches.open(CACHE);
  await cache.addAll(['./', './index.html']);
  try {
    const html = await (await fetch('./index.html', { cache: 'reload' })).text();
    const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map(m => m[1]);
    // по одному: один недоступный файл не должен отменить кеширование остальных,
    // как это делает cache.addAll()
    await Promise.all(assets.map(a => cache.add(a).catch(() => {})));
  } catch { /* нет сети при установке — оболочка доберётся на первом онлайн-запуске */ }
}

self.addEventListener('install', e => {
  e.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Файлы сборки Vite содержат хеш содержимого в имени (assets/index-CM8uz-3y.js), поэтому
// по одному URL всегда лежит одно и то же — их отдаём из кеша сразу, не дожидаясь сети.
// Раньше всё шло network-first: запуск установленного PWA на плохой связи ждал сеть даже
// с полностью закешированной оболочкой.
const isHashedAsset = url => /\/assets\/.*-[\w-]{8,}\.(js|css)$/.test(url.pathname);

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  await putIfOk(request, res);
  return res;
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    await putIfOk(request, res);
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Навигацию (открытие приложения) уводим на оболочку — это и есть SPA-фолбэк.
    // Для всего остального возвращать index.html нельзя: раньше упавший запрос за
    // JS/CSS получал в ответ HTML, браузер пытался исполнить его как модуль и падал
    // с SyntaxError — вместо честной ошибки сети пользователь видел белый экран.
    if (request.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    throw err;
  }
}

// Ответы с ошибкой (404, 5xx) в кеш не кладём: иначе одна неудачная выдача
// закрепляется до следующей смены версии CACHE.
async function putIfOk(request, res) {
  if (!res || !res.ok || res.type === 'opaque') return;
  const cache = await caches.open(CACHE);
  await cache.put(request, res.clone());
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(isHashedAsset(url) ? cacheFirst(e.request) : networkFirst(e.request));
});
