import { describe, it, expect } from 'vitest';
import { applyFilters, withinRadius } from '../src/filters.js';

const кран = (over = {}) => ({ id: 'wp-1', category: 'water_tap', status: 'unknown',
                               point_type: 'outdoor', dog_bowl: null, ...over });
const туалет = (over = {}) => ({ id: 'wc-1', category: 'public_toilet', status: 'unknown',
                                 point_type: null, dog_bowl: null, ...over });

const ids = pts => pts.map(p => p.id);

describe('applyFilters', () => {
  const набор = [
    кран({ id: 'кран-улица' }),
    кран({ id: 'кран-крытый', point_type: 'indoor' }),
    кран({ id: 'кран-подтверждён', status: 'available' }),
    кран({ id: 'кран-с-миской', dog_bowl: true }),
    туалет({ id: 'туалет' })
  ];

  it('без фильтров возвращает всё как есть', () => {
    expect(applyFilters(набор)).toHaveLength(5);
  });

  it('категория отбирает только свой слой', () => {
    expect(ids(applyFilters(набор, { category: 'public_toilet' }))).toEqual(['туалет']);
    expect(applyFilters(набор, { category: 'water_tap' })).toHaveLength(4);
  });

  it('«доступно сейчас» показывает только подтверждённые', () => {
    expect(ids(applyFilters(набор, { quick: 'available' }))).toEqual(['кран-подтверждён']);
  });

  it('«для животных» требует именно true, а не «не null»', () => {
    // dog_bowl у большинства точек null — это «нет данных», а не «нет миски»,
    // и такие точки в фильтр попадать не должны
    expect(ids(applyFilters(набор, { quick: 'animals' }))).toEqual(['кран-с-миской']);
  });

  it('тип точки различает уличные и крытые', () => {
    expect(ids(applyFilters(набор, { point_type: 'indoor' }))).toEqual(['кран-крытый']);
  });

  it('туалеты не проходят фильтр по типу: источник его для них не знает', () => {
    const только = applyFilters(набор, { point_type: 'outdoor' });
    expect(только.every(p => p.category === 'water_tap')).toBe(true);
  });

  it('избранное отбирает по переданному набору', () => {
    const favs = new Set(['туалет', 'кран-улица']);
    expect(ids(applyFilters(набор, { favoritesOnly: true }, favs)).sort())
      .toEqual(['кран-улица', 'туалет']);
  });

  it('избранное без списка даёт пусто, а не всё подряд', () => {
    expect(applyFilters(набор, { favoritesOnly: true })).toHaveLength(0);
  });

  it('фильтры складываются, а не заменяют друг друга', () => {
    const favs = new Set(['кран-с-миской', 'туалет']);
    const r = applyFilters(набор, { category: 'water_tap', quick: 'animals', favoritesOnly: true }, favs);
    expect(ids(r)).toEqual(['кран-с-миской']);
  });

  it('несовместимая пара фильтров даёт пустой список, а не ошибку', () => {
    // туалетов с миской для собак не бывает: источник такого признака не знает
    expect(applyFilters(набор, { category: 'public_toilet', quick: 'animals' })).toHaveLength(0);
  });

  it('не мутирует исходный массив', () => {
    const копия = [...набор];
    applyFilters(набор, { category: 'water_tap' });
    expect(набор).toEqual(копия);
  });
});

describe('withinRadius', () => {
  const точки = [
    { id: 'близко', dist: 300 },
    { id: 'ровно', dist: 1000 },
    { id: 'далеко', dist: 2500 },
    { id: 'без-расстояния', dist: null }
  ];

  it('без радиуса ничего не отсекает', () => {
    expect(withinRadius(точки, null)).toHaveLength(4);
  });

  it('граница включительна: ровно 1000 м проходит фильтр «до 1 км»', () => {
    expect(ids(withinRadius(точки, 1000))).toEqual(['близко', 'ровно']);
  });

  it('точки без расстояния под ограничение не подходят', () => {
    // «ближе километра» про них ничего не утверждает — показывать нельзя
    expect(ids(withinRadius(точки, 5000))).not.toContain('без-расстояния');
  });

  it('радиус больше всех расстояний оставляет все измеренные точки', () => {
    expect(ids(withinRadius(точки, 10000))).toEqual(['близко', 'ровно', 'далеко']);
  });
});
