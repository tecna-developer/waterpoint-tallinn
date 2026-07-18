import seed from './data/waterpoints.json';

// FR-01: живой источник — Tallinn GIS ArcGIS REST; сбой не стирает последнюю успешную копию.
const ARCGIS_URL =
  'https://gis.tallinn.ee/arcgis/rest/services/veebikaart/Veev6tukohad/FeatureServer/0/query' +
  '?where=1%3D1&outFields=*&outSR=4326&f=json';

const LS = {
  cache: 'wpt_cached_points',
  cachedAt: 'wpt_cached_at',
  favorites: 'wpt_favorite_ids',
  reports: 'wpt_reports',
  analytics: 'wpt_analytics',
  theme: 'wpt_theme'
};

// Сезон по умолчанию: Tallinna Vesi, май–октябрь (§5 ТЗ).
const SEASON = { from: { m: 5, d: 1 }, to: { m: 10, d: 31 } };

export const state = {
  points: [],
  cachedAt: null,
  syncFailed: false,
  userPos: null,      // {lat,lng} — только в памяти, не сохраняется (приватность)
  searchPos: null,    // {lat,lng,label}
  geoDenied: false
};

function normalize(features) {
  const byId = new Map(seed.points.map(p => [p.source_object_id, p]));
  return features.map(f => {
    const a = f.attributes, g = f.geometry;
    const known = byId.get(a.objectid) || {};
    return {
      source_object_id: a.objectid,
      code: (a.comments_r || '').trim() || known.code || null,
      name: (a.name || '').trim(),
      lat: g.y, lng: g.x,
      district: known.district || null,
      asum: known.asum || null
    };
  });
}

function decorate(raw) {
  // Overlay-поля рабочей БД (FR-01/FR-05). В прототипе honest-значения: unknown, а не выдумка.
  return raw.map(p => ({
    ...p,
    id: 'wp-' + p.source_object_id,
    point_type: 'outdoor',           // слой описывает уличные общественные краны
    dog_bowl: null,                  // нет данных в источнике -> «неизвестно»
    bottle_refill: true,             // кран позволяет наполнять бутылки
    seasonal_from: SEASON.from, seasonal_to: SEASON.to,
    admin_status: null,              // статус модератора (нет бэкенда в прототипе)
    status_reason: null,
    last_verified_at: null,
    description: null
  }));
}

export function loadCached() {
  try {
    const raw = localStorage.getItem(LS.cache);
    if (raw) {
      state.points = decorate(JSON.parse(raw));
      state.cachedAt = localStorage.getItem(LS.cachedAt);
      return;
    }
  } catch (e) { /* повреждённый кеш -> seed */ }
  state.points = decorate(seed.points);
  state.cachedAt = seed.fetched_at;
}

export async function sync() {
  try {
    const res = await fetch(ARCGIS_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('http ' + res.status);
    const json = await res.json();
    if (!json.features || !json.features.length) throw new Error('empty');
    const raw = normalize(json.features);
    localStorage.setItem(LS.cache, JSON.stringify(raw));
    const now = new Date().toISOString();
    localStorage.setItem(LS.cachedAt, now);
    state.points = decorate(raw);
    state.cachedAt = now;
    state.syncFailed = false;
    return true;
  } catch (e) {
    state.syncFailed = true;   // показываем последнюю успешную копию (FR-01)
    return false;
  }
}

// ---------- статусы (§5) ----------
export function inSeason(p, now = new Date()) {
  const m = now.getMonth() + 1, d = now.getDate();
  const after = m > p.seasonal_from.m || (m === p.seasonal_from.m && d >= p.seasonal_from.d);
  const before = m < p.seasonal_to.m || (m === p.seasonal_to.m && d <= p.seasonal_to.d);
  return after && before;
}

export function computeStatus(p) {
  if (p.admin_status === 'temporarily_unavailable') return 'temporarily_unavailable';
  if (!inSeason(p)) return 'seasonal_closed';
  if (hasPendingReport(p.id)) return 'reported_issue'; // предупреждение, не смена официального статуса
  return 'available';
}

// ---------- геометрия ----------
export function distanceM(a, b) {
  const R = 6371000, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function origin() { return state.userPos || state.searchPos || null; }

export function withDistances(points) {
  const o = origin();
  return points.map(p => ({ ...p, dist: o ? distanceM(o, p) : null }))
    .sort((a, b) => (a.dist ?? 1e12) - (b.dist ?? 1e12));
}

export function fmtDist(m) {
  if (m == null) return '—';
  return m < 1000 ? Math.round(m / 10) * 10 + ' м' : (m / 1000).toFixed(1) + ' км';
}
export function walkMinutes(m) { return Math.max(1, Math.round(m / 80)); }

// ---------- избранное (FR-08, только устройство) ----------
export function getFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem(LS.favorites) || '[]')); }
  catch { return new Set(); }
}
export function toggleFavorite(id) {
  const f = getFavorites();
  f.has(id) ? f.delete(id) : f.add(id);
  localStorage.setItem(LS.favorites, JSON.stringify([...f]));
  return f.has(id);
}

// ---------- отчёты (FR-09) ----------
export function getReports() {
  try { return JSON.parse(localStorage.getItem(LS.reports) || '[]'); }
  catch { return []; }
}
export function hasPendingReport(pointId) {
  return getReports().some(r => r.water_point_id === pointId && r.moderation_status === 'pending');
}
export function submitReport(r) {
  // антиспам: не более 3 отчётов за 10 минут с устройства
  const reports = getReports();
  const recent = reports.filter(x => Date.now() - new Date(x.created_at).getTime() < 10 * 60 * 1000);
  if (recent.length >= 3) return { ok: false, reason: 'rate_limited' };
  reports.push({
    id: 'r-' + Date.now(),
    water_point_id: r.pointId,
    category: r.category,
    comment: r.comment || null,
    contact: r.contact || null,
    consent: true,
    created_at: new Date().toISOString(),
    moderation_status: 'pending'
  });
  localStorage.setItem(LS.reports, JSON.stringify(reports));
  return { ok: true };
}

// ---------- приватная аналитика (FR-12): без геолокации ----------
export function track(event, props = {}) {
  try {
    const log = JSON.parse(localStorage.getItem(LS.analytics) || '[]');
    log.push({ event, ...props, ts: new Date().toISOString() });
    localStorage.setItem(LS.analytics, JSON.stringify(log.slice(-500)));
  } catch { /* ignore */ }
}

// ---------- тема ----------
export function getTheme() { return localStorage.getItem(LS.theme) || 'light'; }
export function setTheme(v) {
  localStorage.setItem(LS.theme, v);
  document.documentElement.dataset.theme = v;
}

export function districts() {
  return [...new Set(state.points.map(p => p.district).filter(Boolean))].sort();
}
