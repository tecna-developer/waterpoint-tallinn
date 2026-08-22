import { describe, it, expect, beforeEach } from 'vitest';
import { computeStatus, submitReport, clearReports } from '../src/data.js';

// computeStatus — цепочка приоритетов, и порядок в ней содержательный. Проверяем не
// только каждую ветку, но и что более сильный признак перебивает более слабый:
// именно перестановка условий ломает такую функцию молча.
const ЛЕТО = new Date(2026, 6, 15);      // июль, кран в сезоне
const ЗИМА = new Date(2026, 0, 15);      // январь, кран вне сезона

const кран = (over = {}) => ({
  id: 'wp-1', category: 'water_tap', admin_status: null,
  seasonal_from: { m: 5, d: 1 }, seasonal_to: { m: 10, d: 31 }, ...over
});
const туалет = (over = {}) => ({
  id: 'wc-1', category: 'public_toilet', admin_status: null, ...over
});

// computeStatus зовёт inSeason(p) без даты, то есть смотрит на «сейчас».
const вМоментВремени = (когда, fn) => {
  const RealDate = global.Date;
  global.Date = class extends RealDate {
    constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(когда); }
    static now() { return когда.getTime(); }
  };
  try { return fn(); } finally { global.Date = RealDate; }
};

beforeEach(() => { localStorage.clear(); });

describe('computeStatus', () => {
  it('в сезоне и без отметок — статус не подтверждён', () => {
    // GIS подтверждает наличие точки, но не её работоспособность
    expect(вМоментВремени(ЛЕТО, () => computeStatus(кран()))).toBe('unknown');
  });

  it('кран зимой — сезонно закрыт', () => {
    expect(вМоментВремени(ЗИМА, () => computeStatus(кран()))).toBe('seasonal_closed');
  });

  it('туалет зимой сезонно НЕ закрывается — сезон только про краны', () => {
    expect(вМоментВремени(ЗИМА, () => computeStatus(туалет()))).toBe('unknown');
  });

  it('отметка о проблеме на этом устройстве меняет статус', () => {
    submitReport({ pointId: 'wp-1', category: 'not_working', pointCategory: 'water_tap' });
    expect(вМоментВремени(ЛЕТО, () => computeStatus(кран()))).toBe('reported_issue');
  });

  it('отметка о другой точке на эту не влияет', () => {
    submitReport({ pointId: 'wp-999', category: 'not_working', pointCategory: 'water_tap' });
    expect(вМоментВремени(ЛЕТО, () => computeStatus(кран()))).toBe('unknown');
  });

  it('admin_status available подтверждает работу', () => {
    expect(вМоментВремени(ЛЕТО, () => computeStatus(кран({ admin_status: 'available' })))).toBe('available');
  });

  // --- приоритеты ---

  it('временно недоступна перебивает сезон', () => {
    const p = кран({ admin_status: 'temporarily_unavailable' });
    expect(вМоментВремени(ЗИМА, () => computeStatus(p))).toBe('temporarily_unavailable');
  });

  it('временно недоступна перебивает локальную отметку', () => {
    submitReport({ pointId: 'wp-1', category: 'not_working', pointCategory: 'water_tap' });
    const p = кран({ admin_status: 'temporarily_unavailable' });
    expect(вМоментВремени(ЛЕТО, () => computeStatus(p))).toBe('temporarily_unavailable');
  });

  it('сезон перебивает локальную отметку: зимой кран закрыт, а не «есть проблема»', () => {
    submitReport({ pointId: 'wp-1', category: 'not_working', pointCategory: 'water_tap' });
    expect(вМоментВремени(ЗИМА, () => computeStatus(кран()))).toBe('seasonal_closed');
  });

  it('локальная отметка перебивает admin_status available', () => {
    submitReport({ pointId: 'wp-1', category: 'not_working', pointCategory: 'water_tap' });
    const p = кран({ admin_status: 'available' });
    expect(вМоментВремени(ЛЕТО, () => computeStatus(p))).toBe('reported_issue');
  });
});

describe('отметки о проблемах', () => {
  it('больше трёх подряд не принимаются — защита localStorage', () => {
    const r = () => submitReport({ pointId: 'wp-1', category: 'other', pointCategory: 'water_tap' });
    expect(r().ok).toBe(true);
    expect(r().ok).toBe(true);
    expect(r().ok).toBe(true);
    const четвёртая = r();
    expect(четвёртая.ok).toBe(false);
    expect(четвёртая.reason).toBe('rate_limited');
  });

  it('очистка отметок возвращает статус к неподтверждённому', () => {
    submitReport({ pointId: 'wp-1', category: 'other', pointCategory: 'water_tap' });
    expect(вМоментВремени(ЛЕТО, () => computeStatus(кран()))).toBe('reported_issue');
    clearReports();
    expect(вМоментВремени(ЛЕТО, () => computeStatus(кран()))).toBe('unknown');
  });
});
