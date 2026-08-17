import waterSeed from './data/waterpoints.json';
import toiletSeed from './data/toilets.json';

// FR-01/FR-14: два живых слоя Tallinn GIS. Сбой одного не стирает последнюю успешную
// копию другого — каждый слой кешируется и синхронизируется независимо.
const WATER_URL =
  'https://gis.tallinn.ee/arcgis/rest/services/veebikaart/Veev6tukohad/FeatureServer/0/query' +
  '?where=1%3D1&outFields=*&outSR=4326&f=json';
const TOILET_URL =
  'https://gis.tallinn.ee/arcgis/rest/services/veebikaart/avalikud_tualetid/FeatureServer/0/query' +
  '?where=1%3D1&outFields=*&outSR=4326&f=json';

const LS = {
  favorites: 'wpt_favorite_ids',
  reports: 'wpt_reports',
  analytics: 'wpt_analytics',
  theme: 'wpt_theme',
  onboarded: 'wpt_onboarded'
};

// Сезон по умолчанию: Tallinna Vesi, май–октябрь (§5 ТЗ). Только для кранов.
const SEASON = { from: { m: 5, d: 1 }, to: { m: 10, d: 31 } };

export const CATEGORIES = ['water_tap', 'public_toilet'];

export const state = {
  points: [],
  cachedAt: null,      // самая старая из дат слоёв — «данные не свежее, чем…»
  syncFailed: false,   // хотя бы один слой не ответил
  layers: {},          // category -> { cachedAt, syncFailed }
  userPos: null,       // {lat,lng} — только в памяти, не сохраняется (приватность)
  searchPos: null,     // {lat,lng,label}
  geoDenied: false
};

// ---------- нормализация живого ответа ArcGIS ----------
function normalizeWater(features) {
  const byId = new Map(waterSeed.points.map(p => [p.source_object_id, p]));
  return features
    .filter(f => f.geometry && typeof f.geometry.x === 'number')
    .map(f => {
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

function normalizeToilets(features) {
  // Районы считаются point-in-polygon оффлайн (см. снапшот), поэтому у живых точек
  // берём их из снапшота по objectid; для новых точек район остаётся неизвестен.
  const byId = new Map(toiletSeed.points.map(p => [p.source_object_id, p]));
  const KIND = { 'Olemasolev statsionaarne': 'stationary', 'Ajutine olemasolev': 'temporary' };
  return features
    .filter(f => f.geometry && typeof f.geometry.x === 'number')
    .map(f => {
      const a = f.attributes, g = f.geometry;
      const known = byId.get(a.objectid) || {};
      return {
        source_object_id: a.objectid,
        name: (a.nimi || '').trim() || null,
        name_en: (a.name_eng || '').trim() || null,
        name_ru: (a.name_rus || '').trim() || null,
        lat: g.y, lng: g.x,
        district: known.district || null,
        asum: known.asum || null,
        toilet_kind: KIND[a.kihi_nimi] || 'unknown',
        available_until: a.t2htaeg ? new Date(a.t2htaeg).toISOString() : null
      };
    });
}

// ---------- overlay-поля рабочей БД (§6.2) ----------
// Честные null там, где источник молчит: интерфейс покажет «нет данных», а не догадку.
function decorateWater(raw, cachedAt, sourceUrl) {
  return raw.map(p => ({
    ...p,
    id: 'wp-' + p.source_object_id,
    category: 'water_tap',
    point_type: 'outdoor',           // слой описывает уличные общественные краны
    dog_bowl: null,
    bottle_refill: true,
    seasonal_from: SEASON.from, seasonal_to: SEASON.to,
    admin_status: null,              // статус модератора (нет бэкенда в прототипе)
    status_reason: null,
    source_url: sourceUrl,
    last_verified_at: cachedAt,
    description: null
  }));
}

function decorateToilets(raw, cachedAt, sourceUrl) {
  const now = Date.now();
  return raw
    // Временный туалет после даты демонтажа физически убран — не показываем его вовсе,
    // это честнее, чем вести человека к исчезнувшей точке (§6.3, «больше не существует»).
    .filter(p => !(p.available_until && new Date(p.available_until).getTime() < now))
    .map(p => ({
      ...p,
      id: 'wc-' + p.source_object_id,
      category: 'public_toilet',
      point_type: null,                // indoor/outdoor источник не различает
      opening_hours: null,             // §6.3: данных в источнике нет
      is_free: null,
      accessibility: null,
      baby_changing: null,
      operator: null,
      admin_status: null,
      status_reason: null,
      source_url: sourceUrl,
      last_verified_at: cachedAt,
      description: null
    }));
}

const LAYERS = [
  {
    category: 'water_tap',
    url: WATER_URL,
    // ключи кеша сохранены прежними — у существующих пользователей кран-кеш переживёт обновление
    cacheKey: 'wpt_cached_points',
    atKey: 'wpt_cached_at',
    seed: waterSeed,
    sourceUrl: 'https://gis.tallinn.ee/arcgis/rest/services/veebikaart/Veev6tukohad/FeatureServer/0',
    normalize: normalizeWater,
    decorate: decorateWater
  },
  {
    category: 'public_toilet',
    url: TOILET_URL,
    cacheKey: 'wpt_cached_toilets',
    atKey: 'wpt_cached_toilets_at',
    seed: toiletSeed,
    sourceUrl: 'https://gis.tallinn.ee/arcgis/rest/services/veebikaart/avalikud_tualetid/FeatureServer/0',
    normalize: normalizeToilets,
    decorate: decorateToilets
  }
];

const layerPoints = {};   // category -> декорированные точки

function publish() {
  state.points = LAYERS.flatMap(l => layerPoints[l.category] || []);
  const dates = LAYERS.map(l => state.layers[l.category]?.cachedAt).filter(Boolean);
  state.cachedAt = dates.length ? dates.sort()[0] : null;
  state.syncFailed = LAYERS.some(l => state.layers[l.category]?.syncFailed);
}

function setLayer(layer, raw, cachedAt, syncFailed) {
  layerPoints[layer.category] = layer.decorate(raw, cachedAt, layer.sourceUrl);
  state.layers[layer.category] = { cachedAt, syncFailed };
  publish();
}

export function loadCached() {
  for (const layer of LAYERS) {
    let raw = null, at = null;
    try {
      const stored = localStorage.getItem(layer.cacheKey);
      if (stored) { raw = JSON.parse(stored); at = localStorage.getItem(layer.atKey); }
    } catch (e) { /* повреждённый кеш -> seed */ }
    if (!raw) { raw = layer.seed.points; at = layer.seed.fetched_at; }
    setLayer(layer, raw, at, false);
  }
}

async function syncLayer(layer) {
  try {
    const res = await fetch(layer.url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('http ' + res.status);
    const json = await res.json();
    if (!json.features || !json.features.length) throw new Error('empty');
    const raw = layer.normalize(json.features);
    if (!raw.length) throw new Error('empty after normalize');
    const now = new Date().toISOString();
    localStorage.setItem(layer.cacheKey, JSON.stringify(raw));
    localStorage.setItem(layer.atKey, now);
    setLayer(layer, raw, now, false);
    return true;
  } catch (e) {
    // показываем последнюю успешную копию именно этого слоя (FR-01)
    state.layers[layer.category] = { ...state.layers[layer.category], syncFailed: true };
    publish();
    return false;
  }
}

export async function sync() {
  const results = await Promise.allSettled(LAYERS.map(syncLayer));
  return results.every(r => r.status === 'fulfilled' && r.value === true);
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
  // сезонность — свойство уличных кранов, к туалетам не применяется
  if (p.category === 'water_tap' && !inSeason(p)) return 'seasonal_closed';
  if (hasLocalReport(p.id)) return 'reported_issue'; // локальная отметка только на этом устройстве
  if (p.admin_status === 'available') return 'available';
  // GIS подтверждает наличие точки в реестре, но не её текущую работоспособность.
  return 'unknown';
}

export function seasonalWarningActive() {
  const tap = state.points.find(p => p.category === 'water_tap');
  return tap ? !inSeason(tap) : false;
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

// ---------- отчёты (FR-09, FR-17) ----------
export function getReports() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS.reports) || '[]');
    let changed = false;
    const reports = stored.map(r => {
      const moderationStatus = r.moderation_status === 'pending' ? 'local_demo' : r.moderation_status;
      if (r.contact != null || r.consent !== false || moderationStatus !== r.moderation_status) changed = true;
      return { ...r, contact: null, consent: false, moderation_status: moderationStatus };
    });
    // Старые записи могли содержать контакт и обещание модерации — удаляем их локально.
    if (changed) localStorage.setItem(LS.reports, JSON.stringify(reports));
    return reports;
  }
  catch { return []; }
}
// water_point_id — имя поля до появления слоя туалетов; читаем оба, чтобы отчёты,
// уже лежащие на устройстве, не потерялись
const reportPointId = r => r.point_id || r.water_point_id;

export function hasLocalReport(pointId) {
  return getReports().some(r => reportPointId(r) === pointId &&
    (r.moderation_status === 'local_demo' || r.moderation_status === 'pending'));
}
export function submitReport(r) {
  // Демо-режим: отметки остаются только на устройстве. Ограничение защищает
  // localStorage от случайной серии повторных сохранений.
  const reports = getReports();
  const recent = reports.filter(x => Date.now() - new Date(x.created_at).getTime() < 10 * 60 * 1000);
  if (recent.length >= 3) return { ok: false, reason: 'rate_limited' };
  reports.push({
    id: 'r-' + Date.now(),
    point_id: r.pointId,
    category: r.category,
    point_category: r.pointCategory,
    comment: r.comment || null,
    contact: null,
    consent: false,
    created_at: new Date().toISOString(),
    moderation_status: 'local_demo'
  });
  localStorage.setItem(LS.reports, JSON.stringify(reports));
  return { ok: true };
}

export function clearReports() {
  const count = getReports().length;
  localStorage.removeItem(LS.reports);
  return count;
}

// ---------- приватная аналитика: без геолокации ----------
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

// ---------- онбординг (FR-01) ----------
export function isOnboarded() { return localStorage.getItem(LS.onboarded) === '1'; }
export function setOnboarded() { localStorage.setItem(LS.onboarded, '1'); }

export function districts() {
  return [...new Set(state.points.map(p => p.district).filter(Boolean))].sort();
}
