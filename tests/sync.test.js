import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sync, loadCached, state } from '../src/data.js';

// Синхронизация — самое хрупкое место при смене данных: два независимых слоя ArcGIS,
// каждый со своей схемой полей, приводятся к одной модели точки. Проверяем и разбор,
// и то, ради чего слои разводили: сбой одного не должен стирать другой.

const ВОДА = 'Veev6tukohad';
const ТУАЛЕТЫ = 'avalikud_tualetid';

const ответВоды = (features) => ({ features });
const кранGIS = (over = {}) => ({
  attributes: { objectid: 101, name: 'Vabaduse väljak', comments_r: 'VP-01', ...over.attributes },
  geometry: { x: 24.7454, y: 59.4330, ...over.geometry }
});
const туалетGIS = (over = {}) => ({
  attributes: { objectid: 201, nimi: 'Tammsaare park', name_eng: 'Tammsaare park',
                name_rus: 'Парк Таммсааре', kihi_nimi: 'Olemasolev statsionaarne',
                t2htaeg: null, ...over.attributes },
  geometry: { x: 24.7500, y: 59.4360, ...over.geometry }
});

// Отдаём каждому слою свой ответ; null означает «слой недоступен».
function мокСети({ вода = [кранGIS()], туалеты = [туалетGIS()] } = {}) {
  global.fetch = vi.fn(async (url) => {
    const набор = String(url).includes(ВОДА) ? вода : туалеты;
    if (набор === null) throw new Error('network down');
    return { ok: true, json: async () => ответВоды(набор) };
  });
}

beforeEach(() => {
  localStorage.clear();
  state.layers = {};
  loadCached();          // как при старте приложения: сначала снапшоты
});
afterEach(() => { vi.restoreAllMocks(); });

describe('нормализация ответа GIS', () => {
  it('кран получает префикс wp- и координаты из geometry', async () => {
    мокСети();
    await sync();
    const кран = state.points.find(p => p.category === 'water_tap');
    expect(кран.id).toBe('wp-101');
    expect(кран.lat).toBeCloseTo(59.4330, 4);
    expect(кран.lng).toBeCloseTo(24.7454, 4);
    expect(кран.code).toBe('VP-01');
  });

  it('туалет получает префикс wc- и свою категорию', async () => {
    мокСети();
    await sync();
    const туалет = state.points.find(p => p.category === 'public_toilet');
    expect(туалет.id).toBe('wc-201');
    expect(туалет.toilet_kind).toBe('stationary');
  });

  it('id слоёв не сталкиваются при одинаковом objectid', async () => {
    мокСети({ вода: [кранGIS({ attributes: { objectid: 7 } })],
              туалеты: [туалетGIS({ attributes: { objectid: 7 } })] });
    await sync();
    const ids = state.points.map(p => p.id);
    expect(ids).toContain('wp-7');
    expect(ids).toContain('wc-7');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('записи без геометрии отбрасываются, а не превращаются в точки без координат', async () => {
    мокСети({ вода: [кранGIS(), { attributes: { objectid: 102 }, geometry: null }] });
    await sync();
    const краны = state.points.filter(p => p.category === 'water_tap');
    expect(краны).toHaveLength(1);
    expect(краны[0].id).toBe('wp-101');
  });

  it('у кранов проставляется сезон, у туалетов его нет', async () => {
    мокСети();
    await sync();
    const кран = state.points.find(p => p.category === 'water_tap');
    const туалет = state.points.find(p => p.category === 'public_toilet');
    expect(кран.seasonal_from).toEqual({ m: 5, d: 1 });
    expect(туалет.seasonal_from).toBeUndefined();
  });

  it('чего в источнике нет — остаётся null, а не выдумывается', async () => {
    мокСети();
    await sync();
    const туалет = state.points.find(p => p.category === 'public_toilet');
    expect(туалет.opening_hours).toBe(null);
    expect(туалет.is_free).toBe(null);
    expect(туалет.accessibility).toBe(null);
  });
});

describe('временные туалеты', () => {
  const вчера = new Date(Date.now() - 24 * 3600 * 1000).getTime();
  const завтра = new Date(Date.now() + 24 * 3600 * 1000).getTime();

  it('после даты демонтажа точка исчезает из выдачи', async () => {
    мокСети({ туалеты: [туалетGIS({ attributes: { objectid: 301, kihi_nimi: 'Ajutine olemasolev', t2htaeg: вчера } })] });
    await sync();
    expect(state.points.find(p => p.id === 'wc-301')).toBeUndefined();
  });

  it('до даты демонтажа точка показывается', async () => {
    мокСети({ туалеты: [туалетGIS({ attributes: { objectid: 302, kihi_nimi: 'Ajutine olemasolev', t2htaeg: завтра } })] });
    await sync();
    const p = state.points.find(x => x.id === 'wc-302');
    expect(p).toBeDefined();
    expect(p.toilet_kind).toBe('temporary');
  });
});

describe('частичный сбой синхронизации', () => {
  it('упавший слой не стирает успешный', async () => {
    мокСети({ вода: null });          // краны недоступны, туалеты отвечают
    const ок = await sync();
    expect(ок).toBe(false);
    expect(state.points.some(p => p.category === 'public_toilet')).toBe(true);
    // краны остаются из снапшота, а не пропадают с карты
    expect(state.points.some(p => p.category === 'water_tap')).toBe(true);
    expect(state.layers.water_tap.syncFailed).toBe(true);
    expect(state.layers.public_toilet.syncFailed).toBe(false);
  });

  it('пустой ответ считается сбоем, а не поводом очистить карту', async () => {
    мокСети({ вода: [] });
    await sync();
    expect(state.layers.water_tap.syncFailed).toBe(true);
    expect(state.points.some(p => p.category === 'water_tap')).toBe(true);
  });

  it('HTTP-ошибка обрабатывается как сбой слоя', async () => {
    global.fetch = vi.fn(async (url) => String(url).includes(ВОДА)
      ? { ok: false, status: 500, json: async () => ({}) }
      : { ok: true, json: async () => ответВоды([туалетGIS()]) });
    await sync();
    expect(state.layers.water_tap.syncFailed).toBe(true);
    expect(state.layers.public_toilet.syncFailed).toBe(false);
  });

  it('оба слоя отвечают — sync сообщает об успехе', async () => {
    мокСети();
    expect(await sync()).toBe(true);
    expect(state.syncFailed).toBe(false);
  });
});

describe('кеш', () => {
  it('успешная загрузка сохраняется для офлайна', async () => {
    мокСети();
    await sync();
    expect(localStorage.getItem('wpt_cached_points')).toBeTruthy();
    expect(localStorage.getItem('wpt_cached_toilets')).toBeTruthy();
  });

  it('переполненное хранилище не выбрасывает уже загруженные точки', async () => {
    мокСети();
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); };
    try {
      await sync();
      // данные показываем, хотя закешировать не смогли — пострадает лишь следующий офлайн
      expect(state.points.find(p => p.id === 'wp-101')).toBeDefined();
      expect(state.layers.water_tap.syncFailed).toBe(false);
    } finally {
      Storage.prototype.setItem = setItem;
    }
  });
});
