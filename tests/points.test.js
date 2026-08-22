import { describe, it, expect, beforeEach } from 'vitest';
import { pointName, pointPlace } from '../src/points.js';
import { setLang } from '../src/i18n.js';

const кран = (over = {}) => ({ category: 'water_tap', name: 'Vabaduse väljak 6', ...over });
const туалет = (over = {}) => ({ category: 'public_toilet', name: 'Tammsaare park',
                                 name_en: 'Tammsaare park', name_ru: 'Парк Таммсааре', ...over });

describe('pointName', () => {
  beforeEach(() => { setLang('et'); });

  it('у крана имя одно на все языки — это адрес', () => {
    expect(pointName(кран())).toBe('Vabaduse väljak 6');
    setLang('ru');
    expect(pointName(кран())).toBe('Vabaduse väljak 6');
  });

  it('у туалета берётся название на языке интерфейса', () => {
    setLang('ru');
    expect(pointName(туалет())).toBe('Парк Таммсааре');
    setLang('en');
    expect(pointName(туалет())).toBe('Tammsaare park');
  });

  it('на эстонском берётся оригинальное имя, а не перевод', () => {
    setLang('et');
    expect(pointName(туалет({ name: 'Tammsaare park EE' }))).toBe('Tammsaare park EE');
  });

  // Источник заполняет переводы не у всех точек — цепочка запасных вариантов важнее
  // самих переводов: без неё в списке появляются пустые строки.
  it('нет перевода — откатывается на эстонское имя', () => {
    setLang('ru');
    expect(pointName(туалет({ name_ru: null }))).toBe('Tammsaare park');
    setLang('en');
    expect(pointName(туалет({ name_en: null }))).toBe('Tammsaare park');
  });

  it('нет вообще никакого имени — общая подпись, а не пустая строка', () => {
    setLang('ru');
    expect(pointName(туалет({ name: null, name_en: null, name_ru: null }))).toBe('Общественный туалет');
    setLang('en');
    expect(pointName(туалет({ name: null, name_en: null, name_ru: null }))).toBe('Public toilet');
  });

  it('пустая строка в переводе считается отсутствующей', () => {
    setLang('ru');
    expect(pointName(туалет({ name_ru: '' }))).toBe('Tammsaare park');
  });

  // Ранний выход для кранов легко выглядит лишним: у них нет полей перевода, и без него
  // результат тот же — пока имя есть. Но normalizeWater кладёт `(a.name || '').trim()`,
  // то есть кран без названия в GIS даёт пустую строку, и общая ветка подписала бы его
  // «Общественный туалет». Сейчас таких кранов в данных нет — тест держит границу
  // на случай, когда появятся.
  it('кран без имени не превращается в туалет', () => {
    setLang('ru');
    expect(pointName(кран({ name: '' }))).not.toBe('Общественный туалет');
    expect(pointName(кран({ name: null }))).not.toBe('Общественный туалет');
  });
});

describe('pointPlace', () => {
  it('микрорайон и район через запятую', () => {
    expect(pointPlace({ asum: 'Vanalinn', district: 'Kesklinn' })).toBe('Vanalinn, Kesklinn');
  });

  it('известен только район — без висящей запятой', () => {
    expect(pointPlace({ asum: null, district: 'Kesklinn' })).toBe('Kesklinn');
  });

  it('ничего не известно — пустая строка, а не разделитель', () => {
    expect(pointPlace({ asum: null, district: null })).toBe('');
  });
});
