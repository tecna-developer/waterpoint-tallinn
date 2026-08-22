import { describe, it, expect, beforeEach } from 'vitest';
import { distanceM, withDistances, fmtDist, walkMinutes, state } from '../src/data.js';
import { setLang } from '../src/i18n.js';

// Реальные ориентиры Таллина: расстояние между ними легко перепроверить по карте,
// в отличие от синтетических координат, где ошибка в формуле незаметна.
const РАТУША = { lat: 59.4372, lng: 24.7454 };
const ВОКЗАЛ = { lat: 59.4400, lng: 24.7376 };   // ~600 м на северо-запад

describe('distanceM', () => {
  it('расстояние до самой себя — ноль', () => {
    expect(distanceM(РАТУША, РАТУША)).toBe(0);
  });

  it('между ратушей и вокзалом около 600 м', () => {
    const d = distanceM(РАТУША, ВОКЗАЛ);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(700);
  });

  it('симметрично: от A до B столько же, сколько от B до A', () => {
    expect(distanceM(РАТУША, ВОКЗАЛ)).toBeCloseTo(distanceM(ВОКЗАЛ, РАТУША), 6);
  });

  it('градус широты — примерно 111 км', () => {
    const d = distanceM({ lat: 59, lng: 24 }, { lat: 60, lng: 24 });
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });
});

describe('withDistances', () => {
  beforeEach(() => { state.activeOrigin = null; });

  it('без точки отсчёта расстояний нет', () => {
    const r = withDistances([{ id: 'a', ...РАТУША }]);
    expect(r[0].dist).toBe(null);
  });

  it('сортирует по возрастанию расстояния от точки отсчёта', () => {
    state.activeOrigin = { kind: 'gps', ...РАТУША };
    const r = withDistances([
      { id: 'далеко', lat: 59.50, lng: 24.90 },
      { id: 'рядом', ...РАТУША },
      { id: 'средне', ...ВОКЗАЛ }
    ]);
    expect(r.map(p => p.id)).toEqual(['рядом', 'средне', 'далеко']);
  });

  it('не мутирует исходный массив', () => {
    state.activeOrigin = { kind: 'gps', ...РАТУША };
    const исходные = [{ id: 'b', ...ВОКЗАЛ }, { id: 'a', ...РАТУША }];
    withDistances(исходные);
    expect(исходные.map(p => p.id)).toEqual(['b', 'a']);
    expect(исходные[0].dist).toBeUndefined();
  });

  it('точки без расстояния уходят в конец, а не в начало', () => {
    state.activeOrigin = { kind: 'gps', ...РАТУША };
    const r = withDistances([{ id: 'без', lat: NaN, lng: NaN }, { id: 'с', ...ВОКЗАЛ }]);
    expect(r[0].id).toBe('с');
  });
});

describe('fmtDist', () => {
  beforeEach(() => { setLang('ru'); });

  it('нет расстояния — прочерк, а не ноль и не пустая строка', () => {
    expect(fmtDist(null)).toBe('—');
  });

  it('метры округляются до десятков', () => {
    expect(fmtDist(123)).toBe('120 м');
    expect(fmtDist(126)).toBe('130 м');
  });

  it('от километра переходит на км с одним знаком', () => {
    expect(fmtDist(1000)).toBe('1,0 км');
    expect(fmtDist(2450)).toBe('2,5 км');
  });

  // Единицы шли захардкоженными по-русски и лезли на EN/ET экраны — это уже чинили,
  // тест закрепляет, что они идут через словарь.
  it('единицы измерения переводятся', () => {
    setLang('en');
    expect(fmtDist(500)).toBe('500 m');
    expect(fmtDist(1500)).toBe('1.5 km');
    setLang('et');
    expect(fmtDist(500)).toBe('500 m');
  });
});

describe('walkMinutes', () => {
  it('очень близко — всё равно минута, а не ноль', () => {
    expect(walkMinutes(5)).toBe(1);
    expect(walkMinutes(0)).toBe(1);
  });

  it('около 80 м в минуту', () => {
    expect(walkMinutes(800)).toBe(10);
    expect(walkMinutes(160)).toBe(2);
  });
});
