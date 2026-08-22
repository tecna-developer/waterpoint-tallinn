// Отбор точек по фильтрам интерфейса.
//
// Вынесено из main.js отдельным модулем намеренно: там эта логика читала `ui`, `state`
// и localStorage напрямую, поэтому проверить её можно было только руками в браузере —
// а это ровно те правила, которые молча ломаются при следующей правке данных.
// Здесь нет ни DOM, ни глобального состояния: всё приходит аргументами.

// Радиус применяется отдельно и ПОСЛЕ расчёта расстояний — до него у точек ещё нет
// поля dist. Разделение не косметическое: порядок здесь содержательный.
export function applyFilters(points, filters = {}, favorites = new Set()) {
  const { category = 'all', quick = 'all', favoritesOnly = false, point_type = null } = filters;
  let pts = points;
  if (category !== 'all') pts = pts.filter(p => p.category === category);
  if (quick === 'available') pts = pts.filter(p => p.status === 'available');
  if (quick === 'animals') pts = pts.filter(p => p.dog_bowl === true);
  if (favoritesOnly) pts = pts.filter(p => favorites.has(p.id));
  // indoor/outdoor описывает только краны — источник по туалетам этого не различает
  if (point_type) pts = pts.filter(p => p.point_type === point_type);
  return pts;
}

// Точки без расстояния (нет точки отсчёта или битые координаты) под ограничение радиуса
// не подходят: «ближе 1 км» про них ничего не утверждает, и показывать их нельзя.
export function withinRadius(points, radius) {
  if (!radius) return points;
  return points.filter(p => p.dist != null && p.dist <= radius);
}
