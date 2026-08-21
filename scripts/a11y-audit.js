// Аудит доступности (axe-core) прямо в браузере, по фактически отрисованному DOM.
//
// Вставить в консоль на запущенном приложении:
//   const audit = await import('/scripts/a11y-audit.js'); await audit.run();
//
// Дополняет contrast-audit.js, а не заменяет: тот считает контраст по своим правилам и
// умеет разворачивать состояния, которых сейчас нет на экране; этот проверяет всё
// остальное — роли, доступные имена, ориентиры, метки полей.
//
// Обходит и шторки: половина находок первого прогона была именно в них, а на статичной
// странице их не видно вовсе.
//
// axe тянется с CDN и в бандл приложения не попадает — это инструмент разработки.
// Поэтому аудит работает только онлайн и только в dev-режиме.
const AXE_URL = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js';

const wait = ms => new Promise(r => setTimeout(r, ms));

async function loadAxe() {
  if (window.axe) return window.axe;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = AXE_URL;
    s.onload = res;
    s.onerror = () => rej(new Error('axe-core не загрузился (нужна сеть)'));
    document.head.appendChild(s);
  });
  return window.axe;
}

const scan = async () => (await window.axe.run(document, { resultTypes: ['violations'] }))
  .violations.map(v => ({
    правило: v.id,
    важность: v.impact,
    элементов: v.nodes.length,
    что: v.help,
    пример: v.nodes[0]?.html?.slice(0, 120)
  }));

// Шторки живут вне #view-root и не открываются сами — без этого шага axe их не увидит.
async function auditSheets(found) {
  const открыть = async (кнопка) => {
    document.querySelector(кнопка)?.click();
    await wait(400);
  };
  const закрыть = () => {
    document.querySelector('.overlay')?.remove();
    document.querySelector('#view-root')?.removeAttribute('inert');
    document.querySelector('#app')?.classList.remove('sheet-open');
  };

  document.querySelector('[data-nav="list"]')?.click();
  await wait(350);
  await открыть('#open-filters');
  found.push(...(await scan()).map(x => ({ ...x, view: 'шторка фильтров' })));
  закрыть();

  document.querySelector('.card-open')?.click();
  await wait(500);
  found.push(...(await scan()).map(x => ({ ...x, view: 'карточка точки' })));
  await открыть('#open-report');
  found.push(...(await scan()).map(x => ({ ...x, view: 'шторка отчёта' })));
  закрыть();
  history.back();
  await wait(350);
}

export async function run(opts = {}) {
  await loadAxe();
  const views = opts.views || ['map', 'list', 'saved', 'settings'];
  const found = [];
  for (const v of views) {
    document.querySelector(`[data-nav="${v}"]`)?.click();
    await wait(400);
    found.push(...(await scan()).map(x => ({ ...x, view: v })));
  }
  await auditSheets(found);

  const серьёзных = found.filter(x => ['critical', 'serious'].includes(x.важность)).length;
  console.log(`Нарушений: ${found.length} (критичных и серьёзных: ${серьёзных})`);
  if (found.length) console.table(found);
  return found;
}
