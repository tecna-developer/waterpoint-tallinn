// Аудит контраста по WCAG 2.1 AA прямо в браузере, по фактически отрисованному DOM.
//
// Вставить в консоль на запущенном приложении:
//   const audit = await import('/scripts/contrast-audit.js'); await audit.run();
//
// Проверяет не список догадок, а каждый видимый текстовый узел: берёт вычисленный цвет,
// поднимается по дереву до первого непрозрачного фона и считает отношение яркостей.
// Порог: 4.5:1 для обычного текста, 3:1 для крупного (>=24px или >=18.66px полужирный).

const relLum = ([r, g, b]) => {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const parseRgb = s => {
  const n = String(s).match(/[\d.]+/g);
  return n ? n.slice(0, 3).map(Number) : null;
};

export const contrast = (fg, bg) => {
  const a = relLum(parseRgb(fg)), b = relLum(parseRgb(bg));
  return +(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2));
};

// Фактический фон под элементом. Полупрозрачные слои именно смешиваются с тем, что под
// ними, а не игнорируются: иначе плашка с rgba(...,.92) поверх тёмной карты считается
// «прозрачной», сравнение идёт со случайным нижним слоем и аудит выдаёт ложный провал.
const effectiveBg = el => {
  const layers = [];
  let e = el;
  while (e && e !== document.documentElement) {
    const rgba = String(getComputedStyle(e).backgroundColor).match(/[\d.]+/g);
    if (rgba) {
      const a = rgba.length < 4 ? 1 : Number(rgba[3]);
      if (a > 0) {
        layers.push({ rgb: rgba.slice(0, 3).map(Number), a });
        if (a >= 1) break;
      }
    }
    e = e.parentElement;
  }
  const base = String(getComputedStyle(document.body).backgroundColor).match(/[\d.]+/g);
  let out = base ? base.slice(0, 3).map(Number) : [255, 255, 255];
  // снизу вверх: каждый следующий слой накладывается на уже смешанный результат
  for (let i = layers.length - 1; i >= 0; i--) {
    const { rgb, a } = layers[i];
    out = out.map((v, k) => rgb[k] * a + v * (1 - a));
  }
  return `rgb(${out.map(Math.round).join(',')})`;
};

const visible = el => {
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

// Узлы с собственным текстом (не контейнеры, чей текст лежит в детях).
// Текст внутри <svg> пропускаем сознательно: под ним не CSS-фон, а нарисованная фигура,
// вывести её цвет из вычисленных стилей нельзя — аудит выдавал бы ложный провал на
// подписи «WC» внутри маркера (её контраст проверяется отдельно, к заливке маркера).
const textElements = root => [...root.querySelectorAll('*')].filter(el =>
  !el.closest('svg') &&
  [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0) && visible(el));

export function audit(root = document.body) {
  const seen = new Map();
  for (const el of textElements(root)) {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    const need = large ? 3 : 4.5;
    const bg = effectiveBg(el);
    const ratio = contrast(cs.color, bg);
    if (ratio >= need) continue;
    // группируем по «цвет на фоне при таком размере», иначе 174 карточки дадут 174 строки
    const key = `${cs.color}|${bg}|${Math.round(size)}|${cs.fontWeight}`;
    if (!seen.has(key)) {
      seen.set(key, {
        sample: el.textContent.trim().slice(0, 40),
        selector: el.className ? '.' + String(el.className).split(' ')[0] : el.tagName.toLowerCase(),
        color: cs.color, bg, px: size, weight: cs.fontWeight, ratio, need, count: 0
      });
    }
    seen.get(key).count++;
  }
  return [...seen.values()].sort((a, b) => a.ratio - b.ratio);
}

export async function run(opts = {}) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const views = opts.views || ['map', 'list', 'saved', 'settings'];
  const report = {};
  for (const theme of ['light', 'dark']) {
    document.documentElement.dataset.theme = theme;
    await wait(150);
    const found = [];
    for (const v of views) {
      document.querySelector(`[data-nav="${v}"]`)?.click();
      await wait(350);
      found.push(...audit().map(x => ({ ...x, view: v })));
    }
    report[theme] = found;
  }
  const total = report.light.length + report.dark.length;
  console.log(`Провалов AA: light ${report.light.length}, dark ${report.dark.length}`);
  return { ...report, total };
}
