// Проверка решений fetch-обработчика service worker'а на мок-окружении.
//
//   npm run test:sw            # проверить текущий public/sw.js
//   node scripts/test-sw.mjs <путь>   # проверить конкретную версию файла
//
// Зачем отдельный скрипт: SW сознательно не регистрируется на localhost (см. main.js),
// поэтому в дев-режиме его поведение никак не увидеть, а ошибка в нём проявляется
// только на проде и только у части пользователей (офлайн, плохая связь, после деплоя).
// Тест исполняет настоящий public/sw.js с подставленными глобалами и проверяет,
// какой ответ воркер решает отдать в каждой ситуации.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(process.argv[2] || 'public/sw.js', 'utf8');

function makeEnv({ networkFails = false, networkStatus = 200, cacheContents = {} } = {}) {
  const store = new Map(Object.entries(cacheContents));
  const log = { put: [], fetched: [] };

  class FakeResponse {
    constructor(body, { status = 200, type = 'basic' } = {}) {
      this.body = body; this.status = status; this.ok = status >= 200 && status < 300; this.type = type;
    }
    clone() { return new FakeResponse(this.body, { status: this.status, type: this.type }); }
  }

  const cache = {
    match: async req => store.get(keyOf(req)),
    put: async (req, res) => { log.put.push(keyOf(req)); store.set(keyOf(req), res); },
    addAll: async () => {}
  };
  const keyOf = req => typeof req === 'string' ? req : req.url;

  const env = {
    location: { origin: 'https://example.test' },
    URL,
    RegExp,
    console,
    caches: {
      open: async () => cache,
      match: async req => store.get(keyOf(req)),
      keys: async () => [],
      delete: async () => true
    },
    fetch: async req => {
      log.fetched.push(keyOf(req));
      if (networkFails) throw new Error('offline');
      return new FakeResponse('NETWORK:' + keyOf(req), { status: networkStatus });
    },
    self: {
      listeners: {},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      skipWaiting: async () => {},
      clients: { claim: async () => {} }
    },
    FakeResponse
  };
  vm.createContext(env);
  vm.runInContext(src, env);
  return { env, log, store, FakeResponse, keyOf };
}

const results = [];
function check(name, actual, expected) {
  const pass = actual === expected;
  results.push({ name, actual, expected, pass });
}

async function runFetch(env, url, { mode = 'no-cors', method = 'GET' } = {}) {
  let responded;
  const event = {
    request: { url, method, mode },
    respondWith: p => { responded = p; }
  };
  env.self.listeners.fetch(event);
  if (responded === undefined) return 'PASSTHROUGH';
  try { return (await responded).body; } catch (e) { return 'THREW:' + e.message; }
}

// 1. Главный баг: офлайн, JS-ассета нет в кеше, НО оболочка в кеше есть ->
//    старый воркер отдавал HTML вместо JS, браузер падал с SyntaxError (белый экран)
{
  const t = makeEnv({ networkFails: true });
  const cache = await t.env.caches.open();
  await cache.put('./index.html', new t.FakeResponse('<!doctype html> SHELL'));
  const r = await runFetch(t.env, 'https://example.test/assets/index-CM8uz-3y.js');
  check('offline, uncached JS -> НЕ отдаёт HTML-оболочку', r, 'THREW:offline');
}

// 2. Офлайн-навигация всё ещё должна получать оболочку
{
  const { env, FakeResponse } = makeEnv({
    networkFails: true,
    cacheContents: { './index.html': null }
  });
  // положим оболочку правильным объектом
  const env2 = makeEnv({ networkFails: true });
  const cache = await env2.env.caches.open();
  await cache.put('./index.html', new env2.FakeResponse('SHELL'));
  const r = await runFetch(env2.env, 'https://example.test/', { mode: 'navigate' });
  check('offline, навигация -> отдаёт закешированную оболочку', r, 'SHELL');
}

// 3. Хешированный ассет берётся из кеша, не дожидаясь сети (cache-first)
{
  const t = makeEnv({ networkFails: false });
  const cache = await t.env.caches.open();
  await cache.put('https://example.test/assets/index-CM8uz-3y.js', new t.FakeResponse('CACHED_JS'));
  const r = await runFetch(t.env, 'https://example.test/assets/index-CM8uz-3y.js');
  check('хешированный JS -> cache-first', r, 'CACHED_JS');
  check('  и сеть при этом не дёргается', t.log.fetched.length, 0);
}

// 4. Ошибочные ответы не должны попадать в кеш
{
  const t = makeEnv({ networkStatus: 404 });
  await runFetch(t.env, 'https://example.test/data.json');
  check('ответ 404 -> не кешируется', t.log.put.length, 0);
}

// 5. Успешные ответы кешируются
{
  const t = makeEnv({ networkStatus: 200 });
  await runFetch(t.env, 'https://example.test/data.json');
  check('ответ 200 -> кешируется', t.log.put.length, 1);
}

// 6. Чужие origin и не-GET не перехватываются
{
  const t = makeEnv({});
  const cross = await runFetch(t.env, 'https://tile.example.com/1.png');
  check('чужой origin -> не перехватывается', cross, 'PASSTHROUGH');
  const post = await runFetch(t.env, 'https://example.test/x', { method: 'POST' });
  check('POST -> не перехватывается', post, 'PASSTHROUGH');
}

console.log('\n=== Результаты ===');
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}` + (r.pass ? '' : `  (получено: ${r.actual}, ожидалось: ${r.expected})`));
}
const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} прошло`);
process.exit(failed ? 1 : 0);
