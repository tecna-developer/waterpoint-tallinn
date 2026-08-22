// Кеш оболочки приложения (FR-08: офлайн-доступ к списку/карточкам; тайлы карт не кешируем)
// версию поднимаем при каждом релизе — иначе установленное PWA живёт на старой оболочке
// Поднимать при каждом релизе: имя кеша — единственное, что чистит `activate`, а файлы
// сборки меняют хеш в имени, и без смены версии прежний бандл остаётся в кеше навсегда.
// v6: сменились ключи кеша для навигаций (см. cacheKey) — прежние записи вида
// `index.html?p=<id>` стали мусором.
// v7: правки доступности изменили бандл (подписи кластеров, ориентиры, анимация шторки).
// v8: кластеры без анимации + гашение iOS-жеста масштабирования над картой.
// v9: touch-action: manipulation на кнопках — двойной тап больше не масштабирует страницу.
// v10: кнопка «Моё местоположение» показывает занятость и не принимает повторные нажатия.
// v11: двойной тап по карте приближает её на телефоне (своё распознавание жеста).
// v12: нижний слой над картой сведён в один поток — кнопки больше не уезжают под баннеры.
// v13: карта начинается под верхними панелями, точки в этой полосе больше не срезаются.
const CACHE = 'wpt-shell-v13';

// Список файлов оболочки подставляет vite-plugin-pwa на этапе сборки (strategies:
// 'injectManifest'). Раньше воркер вычитывал хеши регуляркой из самого index.html уже
// в браузере: это требовало сети прямо во время install и молча давало неполную
// оболочку, если разметка менялась или запрос срывался. Теперь список известен точно
// и включает не только бандл, но и иконки PWA с манифестом (globPatterns в vite.config.js) —
// раньше `public/icons/*` попадали в кеш только после первого обращения к ним.
// `|| []` — чтобы файл можно было исполнить как есть в scripts/test-sw.mjs, где
// подстановки не происходит; плагин заменяет сам токен self.__WB_MANIFEST.
const PRECACHE = (self.__WB_MANIFEST || []).map(e => (typeof e === 'string' ? e : e.url));

async function precacheShell() {
  const cache = await caches.open(CACHE);
  // по одному: один недоступный файл не должен отменить кеширование остальных,
  // как это делает cache.addAll()
  await Promise.all(
    ['./', ...PRECACHE].map(url => cache.add(url).catch(() => {}))
  );
}

// Ждём, а не self.skipWaiting(): пока пользователь не подтвердил обновление, страница
// продолжает работать со своей версией оболочки. Прежний безусловный skipWaiting менял
// воркер под уже запущенной страницей, которая успела загрузить чанки предыдущей сборки, —
// ровно тот случай «оболочка собрана из несовместимых версий», от которого в index.html
// стоит аварийный блок. Момент подмены теперь выбирает пользователь (см. SKIP_WAITING ниже).
self.addEventListener('install', e => { e.waitUntil(precacheShell()); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Приложение показывает баннер «доступна новая версия» и по нажатию присылает это
// сообщение — только тогда новый воркер становится активным, после чего страница
// перезагружается уже на согласованном наборе файлов.
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Файлы сборки Vite содержат хеш содержимого в имени (assets/index-CM8uz-3y.js), поэтому
// по одному URL всегда лежит одно и то же — их отдаём из кеша сразу, не дожидаясь сети.
// Раньше всё шло network-first: запуск установленного PWA на плохой связи ждал сеть даже
// с полностью закешированной оболочкой.
const isHashedAsset = url => /\/assets\/.*-[\w-]{8,}\.(js|css)$/.test(url.pathname);

// Ключ, под которым ответ лежит в кеше. Для навигаций — без query: по любому
// `?p=<id>` отдаётся одна и та же оболочка, а различает точки уже приложение на
// клиенте. Раньше ключом был полный URL, поэтому каждая расшаренная ссылка (FR-13)
// оседала отдельной копией index.html — при 174 точках это до 174 одинаковых
// оболочек, и на живом демо в кеш успел попасть даже разовый `index.html?_=<время>`.
// Возвращаем строку, а не Request: Cache API принимает и её, а совпадает она с ключом
// './' из precache — значит офлайновый deep link находит оболочку сразу, не доходя
// до фолбэка ниже.
function cacheKey(request) {
  if (request.mode !== 'navigate') return request;
  const url = new URL(request.url);
  return url.origin + url.pathname;
}

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
    const cached = await caches.match(cacheKey(request));
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
  await cache.put(cacheKey(request), res.clone());
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(isHashedAsset(url) ? cacheFirst(e.request) : networkFirst(e.request));
});
