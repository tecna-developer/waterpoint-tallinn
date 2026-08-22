import { describe, it, expect, beforeEach } from 'vitest';
import { matchLocal, MIN_QUERY, MAX_POINTS } from '../src/search.js';
import { setLang } from '../src/i18n.js';

const точки = [
  { id: 'wp-1', category: 'water_tap', name: 'Vabaduse väljak 6', district: 'Kesklinn', asum: 'Vanalinn' },
  { id: 'wp-2', category: 'water_tap', name: 'Kaarli pst 7', district: 'Kesklinn', asum: 'Vanalinn' },
  { id: 'wc-1', category: 'public_toilet', name: 'Tammsaare park', name_ru: 'Парк Таммсааре',
    name_en: 'Tammsaare park', district: 'Kesklinn', asum: 'Südalinn' },
  { id: 'wc-2', category: 'public_toilet', name: 'Balti jaama wc', name_ru: null, name_en: null,
    district: 'Põhja-Tallinn', asum: 'Kelmiküla' }
];
const районы = ['Kesklinn', 'Põhja-Tallinn', 'Kristiine'];
const ids = r => r.points.map(p => p.id);

describe('matchLocal', () => {
  beforeEach(() => { setLang('et'); });

  it('слишком короткий запрос подсказок не даёт', () => {
    const r = matchLocal('K', точки, районы);
    expect(r.points).toHaveLength(0);
    expect(r.districts).toHaveLength(0);
    expect(MIN_QUERY).toBe(2);
  });

  it('пустой запрос и пробелы не считаются запросом', () => {
    expect(matchLocal('', точки, районы).points).toHaveLength(0);
    expect(matchLocal('   ', точки, районы).points).toHaveLength(0);
  });

  it('находит район по части названия', () => {
    expect(matchLocal('kesk', точки, районы).districts).toEqual(['Kesklinn']);
  });

  it('находит точку по названию', () => {
    expect(ids(matchLocal('vabaduse', точки, районы))).toEqual(['wp-1']);
  });

  it('регистр не важен', () => {
    expect(ids(matchLocal('VABADUSE', точки, районы))).toEqual(['wp-1']);
    expect(ids(matchLocal('vAbAdUsE', точки, районы))).toEqual(['wp-1']);
  });

  it('пробелы по краям запроса отсекаются', () => {
    expect(ids(matchLocal('  vabaduse  ', точки, районы))).toEqual(['wp-1']);
  });

  // Человек может искать место и по району, и по микрорайону, не помня названия точки
  it('находит точки по названию района', () => {
    expect(ids(matchLocal('põhja', точки, районы))).toEqual(['wc-2']);
  });

  it('находит точки по микрорайону', () => {
    expect(ids(matchLocal('kelmi', точки, районы))).toEqual(['wc-2']);
  });

  it('ищет по имени на языке интерфейса', () => {
    setLang('ru');
    expect(ids(matchLocal('таммсааре', точки, районы))).toEqual(['wc-1']);
    // на эстонском русского названия в поиске нет
    setLang('et');
    expect(ids(matchLocal('таммсааре', точки, районы))).toHaveLength(0);
  });

  it('точка без перевода ищется по оригинальному имени на любом языке', () => {
    setLang('ru');
    expect(ids(matchLocal('balti', точки, районы))).toEqual(['wc-2']);
  });

  it('список точек ограничен, чтобы подсказки не превращались в простыню', () => {
    const много = Array.from({ length: 20 }, (_, i) => ({
      id: 'wp-' + i, category: 'water_tap', name: 'Kaarli ' + i, district: 'Kesklinn', asum: null
    }));
    expect(matchLocal('kaarli', много, районы).points).toHaveLength(MAX_POINTS);
    expect(MAX_POINTS).toBe(5);
  });

  it('районы не ограничиваются пятёркой — их всего десяток', () => {
    // «linn» входит и в «Tallinn», и в «linnaosa» — совпадают все четыре
    const r = matchLocal('linn', точки, ['Kesklinn', 'Põhja-Tallinn', 'Lasnamäe linnaosa', 'Mustamäe linnaosa']);
    expect(r.districts).toHaveLength(4);
  });

  it('ничего не найдено — пустые списки, а не ошибка', () => {
    const r = matchLocal('чегототакогонет', точки, районы);
    expect(r.points).toEqual([]);
    expect(r.districts).toEqual([]);
  });

  it('точки без района и микрорайона не ломают поиск', () => {
    const кривые = [{ id: 'x', category: 'water_tap', name: null, district: null, asum: null }];
    expect(() => matchLocal('test', кривые, [])).not.toThrow();
    expect(matchLocal('test', кривые, []).points).toEqual([]);
  });

  it('запрос возвращается нормализованным — на нём построена проверка длины в main.js', () => {
    expect(matchLocal('  KeSk  ', точки, районы).query).toBe('kesk');
  });
});
