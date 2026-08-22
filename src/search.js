// Подбор подсказок среди уже загруженных точек и районов.
//
// Вынесено из buildSuggestions в main.js, где отбор был перемешан со сборкой HTML и
// сетевым запросом к Nominatim — то есть проверить правила поиска можно было только
// печатая в поле и глядя на выпадающий список.
// Здесь только локальные данные: онлайн-геокодинг произвольного адреса остаётся в
// main.js, он про сеть, а не про правила отбора.
import { pointName } from './points.js';

// Меньше двух символов — подсказок не показываем: по одной букве совпадёт половина
// города, и список перестаёт помогать.
export const MIN_QUERY = 2;
// Точек может совпасть много; список подсказок не должен превращаться в простыню.
export const MAX_POINTS = 5;

const содержит = (текст, запрос) => (текст || '').toLowerCase().includes(запрос);

export function matchLocal(запросСырой, points = [], districts = []) {
  const query = String(запросСырой ?? '').trim().toLowerCase();
  if (query.length < MIN_QUERY) return { query, districts: [], points: [] };
  return {
    query,
    districts: districts.filter(d => содержит(d, query)),
    // Ищем и по названию, и по району, и по микрорайону: человек одинаково может
    // набрать «Kesklinn» и «Vabaduse», а искать одно и то же место.
    points: points
      .filter(p => содержит(pointName(p), query) || содержит(p.district, query) || содержит(p.asum, query))
      .slice(0, MAX_POINTS)
  };
}
