import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { t, getLang, setLang, LANGS, pointsCount } from './i18n.js';
import { icons, markerSvg, thumbSvg } from './icons.js';
import {
  state, loadCached, sync, computeStatus, withDistances, fmtDist, walkMinutes,
  getFavorites, toggleFavorite, submitReport, hasPendingReport,
  track, getTheme, setTheme, districts, origin
} from './data.js';

const app = document.getElementById('app');

const ui = {
  view: 'map',                 // map | list | saved | settings | detail
  detailId: null,
  detailFrom: 'map',
  selectedId: null,            // выбранная точка на карте
  quick: 'all',                // all | available | animals
  listSort: 'nearest',         // nearest | recent
  radius: null,                // null | 1000 | 2000 | 5000
  type: null,                  // null | outdoor | indoor
  favoritesOnly: false,
  search: '',
  loading: true,
  mapCenter: [59.437, 24.7536],
  mapZoom: 12
};

let map = null;
let markerLayer = null;

// ---------- фильтрация (FR-07) ----------
function filtered() {
  let pts = state.points.map(p => ({ ...p, status: computeStatus(p) }));
  const favs = getFavorites();
  if (ui.quick === 'available') pts = pts.filter(p => p.status === 'available');
  if (ui.quick === 'animals') pts = pts.filter(p => p.dog_bowl === true);
  if (ui.favoritesOnly) pts = pts.filter(p => favs.has(p.id));
  if (ui.type) pts = pts.filter(p => p.point_type === ui.type);
  pts = withDistances(pts);
  if (ui.radius && origin()) pts = pts.filter(p => p.dist != null && p.dist <= ui.radius);
  return pts;
}

function findPoint(id) {
  const p = state.points.find(x => x.id === id);
  return p ? { ...p, status: computeStatus(p), dist: origin() ? withDistances([p])[0].dist : null } : null;
}

// ---------- вспомогательные ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(getLang() === 'et' ? 'et-EE' : getLang() === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function statusBadge(p, short = true) {
  return `<span class="badge ${p.status}">${t(p.status === 'available' && short ? 'status_available_short' : 'status_' + p.status)}</span>`;
}

function routeUrl(p) {
  // FR-06: iOS/iPadOS -> Apple Maps, остальные -> Google Maps; пешком по умолчанию
  const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isApple
    ? `https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`;
}

// ---------- геолокация (FR-02) ----------
function requestGeo(interactive = false) {
  if (!('geolocation' in navigator)) { state.geoDenied = true; render(); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      state.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      state.geoDenied = false;
      if (map && interactive) map.setView([state.userPos.lat, state.userPos.lng], 14);
      render();
    },
    () => { state.geoDenied = true; render(); },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }
  );
}

// ---------- поиск (FR-03) ----------
let suggestTimer = null;
async function buildSuggestions(q, box) {
  const query = q.trim().toLowerCase();
  if (query.length < 2) { box.innerHTML = ''; box.hidden = true; return; }
  const dd = districts().filter(d => d.toLowerCase().includes(query));
  const pts = state.points.filter(p =>
    p.name.toLowerCase().includes(query) ||
    (p.district || '').toLowerCase().includes(query) ||
    (p.asum || '').toLowerCase().includes(query)).slice(0, 5);
  let html = '';
  if (dd.length) {
    html += `<div class="group-label">${t('search_districts')}</div>` +
      dd.map(d => `<button data-district="${esc(d)}">${esc(d)}</button>`).join('');
  }
  if (pts.length) {
    html += `<div class="group-label">${t('search_points')}</div>` +
      pts.map(p => `<button data-point="${p.id}">${esc(p.name)}${p.district ? ' · ' + esc(p.district) : ''}</button>`).join('');
  }
  // онлайн-геокодинг произвольного адреса (Nominatim, ограничено Таллином)
  if (navigator.onLine && !pts.length) {
    try {
      const r = await fetch(
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&bounded=1' +
        '&viewbox=24.45,59.52,25.05,59.32&accept-language=' + getLang() +
        '&q=' + encodeURIComponent(q + ', Tallinn'),
        { headers: { Accept: 'application/json' } });
      const geo = await r.json();
      if (geo.length) {
        html += `<div class="group-label">${t('search_addresses')}</div>` +
          geo.map(g => `<button data-lat="${g.lat}" data-lng="${g.lon}">${esc(g.display_name.split(',').slice(0, 2).join(','))}</button>`).join('');
      }
    } catch { /* офлайн/лимит — остаёмся с локальными результатами */ }
  }
  if (!html) html = `<div class="hint">${t('search_hint_invalid')}</div>`;
  box.innerHTML = html;
  box.hidden = false;

  box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    track('search', { q });
    if (b.dataset.point) {
      const p = findPoint(b.dataset.point);
      state.searchPos = { lat: p.lat, lng: p.lng, label: p.name };
      ui.selectedId = p.id;
      ui.mapCenter = [p.lat, p.lng]; ui.mapZoom = 15;
    } else if (b.dataset.district) {
      const dpts = state.points.filter(p => p.district === b.dataset.district);
      const lat = dpts.reduce((s, p) => s + p.lat, 0) / dpts.length;
      const lng = dpts.reduce((s, p) => s + p.lng, 0) / dpts.length;
      state.searchPos = { lat, lng, label: b.dataset.district };
      ui.mapCenter = [lat, lng]; ui.mapZoom = 13;
    } else {
      state.searchPos = { lat: +b.dataset.lat, lng: +b.dataset.lng, label: b.textContent };
      ui.mapCenter = [+b.dataset.lat, +b.dataset.lng]; ui.mapZoom = 15;
    }
    ui.search = '';
    render();
  }));
}

function searchBarHtml() {
  return `
  <div class="search-wrap">
    <div class="search-bar">
      ${icons.dropFill}
      <input id="search-input" type="text" enterkeyhint="search" placeholder="${t('search_placeholder')}" value="${esc(ui.search)}" aria-label="${t('search_placeholder')}" />
      <button class="filter-btn ${ui.radius || ui.type || ui.favoritesOnly ? 'on' : ''}" id="open-filters" aria-label="${t('filters_title')}">${icons.sliders}</button>
    </div>
    <div class="search-suggest" id="suggest" hidden></div>
  </div>`;
}

function wireSearch(rootEl) {
  const input = rootEl.querySelector('#search-input');
  const box = rootEl.querySelector('#suggest');
  if (!input) return;
  input.addEventListener('input', () => {
    ui.search = input.value;
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => buildSuggestions(input.value, box), 300);
  });
  rootEl.querySelector('#open-filters').addEventListener('click', openFilterSheet);
}

// ---------- чипсы ----------
function chipsHtml() {
  return `
  <div class="chips">
    <button class="chip ${ui.quick === 'all' ? 'on' : ''}" data-quick="all">${icons.dropFill.replace('width="22" height="22"', 'width="15" height="15"')} ${t('chip_all')}</button>
    <button class="chip ${ui.quick === 'available' ? 'on' : ''}" data-quick="available">${t('chip_available')}</button>
    <button class="chip ${ui.quick === 'animals' ? 'on' : ''}" data-quick="animals">${t('chip_animals')}</button>
    <button class="chip ${ui.favoritesOnly ? 'on' : ''}" id="chip-fav">${t('chip_favorites')}</button>
  </div>`;
}

function wireChips(rootEl) {
  rootEl.querySelectorAll('[data-quick]').forEach(b =>
    b.addEventListener('click', () => { ui.quick = b.dataset.quick; render(); }));
  const cf = rootEl.querySelector('#chip-fav');
  if (cf) cf.addEventListener('click', () => { ui.favoritesOnly = !ui.favoritesOnly; render(); });
}

// ---------- баннеры состояний ----------
function bannersHtml() {
  let html = '';
  if (!navigator.onLine) {
    html += `<div class="banner warn">${icons.alert} ${t('offline_banner', { date: fmtDate(state.cachedAt) })}</div>`;
  } else if (state.syncFailed) {
    html += `<div class="banner warn">${icons.alert} ${t('settings_sync_fail')}</div>`;
  }
  if (state.geoDenied && !state.searchPos) {
    html += `<div class="banner info">${icons.info} ${t('geo_denied')} <button id="banner-search">${t('geo_denied_action')}</button></div>`;
  }
  return html ? `<div class="banners">${html}</div>` : '';
}

function wireBanners(rootEl) {
  const b = rootEl.querySelector('#banner-search');
  if (b) b.addEventListener('click', () => rootEl.querySelector('#search-input')?.focus());
}

// ---------- нижняя навигация ----------
function navHtml() {
  const items = [
    ['map', 'nav_map', icons.map],
    ['list', 'nav_list', icons.list],
    ['saved', 'nav_saved', getFavorites().size ? icons.heartFill : icons.heart],
    ['settings', 'nav_settings', icons.gear]
  ];
  return `<nav class="bottom-nav">` + items.map(([v, key, ic]) =>
    `<button class="nav-btn ${ui.view === v ? 'on' : ''}" data-nav="${v}" aria-label="${t(key)}">
       <span class="pill">${ic}</span>${t(key)}
     </button>`).join('') + `</nav>`;
}

function wireNav(rootEl) {
  rootEl.querySelectorAll('[data-nav]').forEach(b =>
    b.addEventListener('click', () => { ui.view = b.dataset.nav; ui.detailId = null; render(); }));
}

function headerHtml() {
  return `
  <header class="app-header">
    <div class="brand">${icons.dropFill} ${t('app_name')}</div>
    <button class="lang-cycle" id="lang-cycle" aria-label="${t('settings_language')}">${icons.langs}</button>
  </header>`;
}

function wireHeader(rootEl) {
  const b = rootEl.querySelector('#lang-cycle');
  if (b) b.addEventListener('click', () => {
    const order = LANGS.map(l => l.code);
    setLang(order[(order.indexOf(getLang()) + 1) % order.length]);
    render();
  });
}

// ---------- карта (FR-04) ----------
function renderMapView() {
  const pts = filtered();
  const sel = ui.selectedId ? pts.find(p => p.id === ui.selectedId) : null;
  app.innerHTML = `
    <div class="view map-view no-scroll">
      <div id="map" role="application" aria-label="${t('nav_map')}"></div>
      ${searchBarHtml()}
      ${chipsHtml()}
      <div class="map-fabs">
        <button class="fab" id="fab-locate" aria-label="${t('locate_me')}">${icons.locate}</button>
      </div>
      ${bannersHtml()}
      ${sel ? mapCardHtml(sel) : ''}
    </div>
    ${navHtml()}`;

  wireNav(app); wireSearch(app); wireChips(app); wireBanners(app);
  app.querySelector('#fab-locate').addEventListener('click', () => requestGeo(true));

  if (sel) {
    app.querySelector('#map-card').addEventListener('click', () => openDetail(sel.id, 'map'));
    app.querySelector('#map-card .go').addEventListener('click', e => {
      e.stopPropagation();
      track('route_start', { point: sel.id });
      window.open(routeUrl(sel), '_blank');
    });
  }

  map = L.map('map', { zoomControl: false, attributionControl: true })
    .setView(ui.mapCenter, ui.mapZoom);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap, &copy; CARTO',
    maxZoom: 19
  }).addTo(map);
  map.on('moveend', () => { const c = map.getCenter(); ui.mapCenter = [c.lat, c.lng]; ui.mapZoom = map.getZoom(); });
  requestAnimationFrame(() => map && map.invalidateSize());
  setTimeout(() => map && map.invalidateSize(), 300);
  map.on('click', () => { if (ui.selectedId) { ui.selectedId = null; render(); } });

  markerLayer = L.layerGroup().addTo(map);
  pts.forEach(p => {
    const selected = p.id === ui.selectedId;
    const size = selected ? 44 : 32;
    const m = L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: 'wp-marker', html: markerSvg(p.status, selected), iconSize: [size, size], iconAnchor: [size / 2, size] }),
      keyboard: true, title: p.name
    });
    m.on('click', () => { ui.selectedId = p.id; render(); });
    m.addTo(markerLayer);
  });
  if (state.userPos) {
    L.circleMarker([state.userPos.lat, state.userPos.lng],
      { radius: 7, color: '#fff', weight: 2, fillColor: '#2d9cdb', fillOpacity: 1 }).addTo(map);
  }
}

function mapCardHtml(p) {
  return `
  <button class="map-card" id="map-card">
    ${thumbSvg()}
    <div class="info">
      ${statusBadge(p)}
      <div class="title">${esc(p.name)}</div>
      <div class="meta">${p.dist != null ? `${icons.walk.replace('width="22" height="22"', 'width="13" height="13"')} ${fmtDist(p.dist)} • ${t('walk_min', { n: walkMinutes(p.dist) })}` : esc(p.district || '')}</div>
    </div>
    <span class="go" aria-label="${t('detail_route')}">${icons.nav}</span>
  </button>`;
}

// ---------- список ----------
function renderListView() {
  let pts = filtered();
  if (ui.listSort === 'recent') pts = [...pts].sort((a, b) => b.source_object_id - a.source_object_id);
  const favs = getFavorites();

  let body;
  if (ui.loading) {
    body = `<div class="cards">` + '<div class="skeleton"></div>'.repeat(4) + `</div>`;
  } else if (!pts.length) {
    body = `<div class="state-box">
      <div class="icon">💧</div>
      <h3>${t('empty_title')}</h3><div>${t('empty_text')}</div>
      <button class="btn-secondary" id="reset-filters">${t('filters_reset')}</button>
    </div>`;
  } else {
    body = `<div class="cards">` + pts.map(p => `
      <button class="card" data-open="${p.id}">
        ${thumbSvg()}
        <div class="info">
          <div class="title">${esc(p.name)}</div>
          <div class="addr">${esc([p.asum, p.district].filter(Boolean).join(', ') || (p.code || ''))}</div>
          <div class="meta">
            ${p.dist != null ? `<span class="dist">${icons.walk.replace('width="22" height="22"', 'width="13" height="13"')} ${fmtDist(p.dist)}</span>` : ''}
            ${statusBadge(p)}
          </div>
        </div>
        <span class="heart ${favs.has(p.id) ? 'on' : ''}" data-fav="${p.id}" role="button" aria-label="${t('nav_saved')}">${favs.has(p.id) ? icons.heartFill : icons.heart}</span>
      </button>`).join('') + `</div>`;
  }

  app.innerHTML = `
    <div class="view">
      ${headerHtml()}
      ${searchBarHtml()}
      <div class="chips">
        <button class="chip ${ui.listSort === 'nearest' ? 'on' : ''}" data-sort="nearest">${icons.nav.replace('width="22" height="22"', 'width="14" height="14"')} ${t('chip_nearest')}</button>
        <button class="chip ${ui.listSort === 'recent' ? 'on' : ''}" data-sort="recent">${icons.clock.replace('width="22" height="22"', 'width="14" height="14"')} ${t('chip_recent')}</button>
        <button class="chip ${ui.quick === 'available' ? 'on' : ''}" data-quick-toggle="available">${t('chip_available')}</button>
      </div>
      <div class="section-head"><h2>${t('nav_list')}</h2><span class="count">${pointsCount(pts.length)}</span></div>
      ${bannersHtml()}
      ${body}
    </div>
    ${navHtml()}`;

  wireNav(app); wireSearch(app); wireHeader(app); wireBanners(app);
  app.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => { ui.listSort = b.dataset.sort; render(); }));
  app.querySelectorAll('[data-quick-toggle]').forEach(b => b.addEventListener('click', () => {
    ui.quick = ui.quick === b.dataset.quickToggle ? 'all' : b.dataset.quickToggle; render();
  }));
  wireCards(app);
  const rf = app.querySelector('#reset-filters');
  if (rf) rf.addEventListener('click', resetFilters);
}

function wireCards(rootEl) {
  rootEl.querySelectorAll('[data-fav]').forEach(h => h.addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(h.dataset.fav);
    render();
  }));
  rootEl.querySelectorAll('[data-open]').forEach(c =>
    c.addEventListener('click', () => openDetail(c.dataset.open, ui.view)));
}

function resetFilters() {
  ui.quick = 'all'; ui.radius = null; ui.type = null; ui.favoritesOnly = false;
  render();
}

// ---------- карточка точки (FR-05) ----------
function openDetail(id, from) {
  ui.detailFrom = from || ui.view;
  ui.detailId = id;
  ui.view = 'detail';
  track('point_open', { point: id });
  render();
}

function renderDetailView() {
  const p = findPoint(ui.detailId);
  if (!p) { ui.view = 'map'; render(); return; }
  const favs = getFavorites();
  const fav = favs.has(p.id);
  const reported = hasPendingReport(p.id);

  app.innerHTML = `
    <div class="view detail-view">
      <div class="hero">
        ${thumbSvg()}
        <button class="hero-btn back" id="detail-back" aria-label="${t('back')}">${icons.back}</button>
        <button class="hero-btn fav ${fav ? 'on' : ''}" id="detail-fav" aria-label="${t('nav_saved')}">${fav ? icons.heartFill : icons.heart}</button>
      </div>
      <div class="detail-body">
        <div class="detail-toprow">
          ${statusBadge(p, false)}
          <span class="detail-dist">${icons.pin.replace('width="22" height="22"', 'width="14" height="14"')} ${p.dist != null ? fmtDist(p.dist) : esc(p.district || '')}</span>
        </div>
        <h1 class="detail-title">${esc(p.name)}</h1>
        <button class="detail-addr" id="detail-map-link">${icons.pin.replace('width="22" height="22"', 'width="15" height="15"')} ${esc([p.asum, p.district || 'Tallinn'].filter(Boolean).join(', '))}</button>
        ${reported ? `<div class="banner warn" style="margin:0 0 12px">${icons.alert} ${t('status_note_reported')}</div>` : ''}
        <div class="desc-card">
          <div class="label">${t('detail_description')}</div>
          <div>${p.description ? esc(p.description) : t('detail_no_description')}</div>
        </div>
        <div class="attr-grid">
          <div class="attr">${icons.paw}<div>${t('detail_dog_bowl')}</div>
            <div class="val">${p.dog_bowl === true ? t('detail_yes') : p.dog_bowl === false ? t('detail_no') : t('detail_unknown')}</div></div>
          <div class="attr">${icons.bottle}<div>${t('detail_bottle')}</div>
            <div class="val">${p.bottle_refill ? t('detail_ok') : t('detail_unknown')}</div></div>
          <div class="attr">${icons.clock}<div>${t('detail_season')}</div>
            <div class="val" style="font-size:13.5px">${t('detail_season_value')}</div></div>
          <div class="attr">${icons.check}<div>${t('detail_verified')}</div>
            <div class="val" style="font-size:13.5px">${p.last_verified_at ? fmtDate(p.last_verified_at) : (p.code ? esc(p.code) : t('detail_unknown'))}</div></div>
        </div>
        <div class="mini-map" id="mini-map" aria-hidden="true"></div>
        <button class="report-link" id="open-report">${icons.alert.replace('width="22" height="22"', 'width="16" height="16"')} ${t('detail_report')}</button>
      </div>
      <div class="detail-cta">
        <button class="btn-primary" id="route-btn">${icons.nav} ${t('detail_route')}</button>
      </div>
    </div>`;

  app.querySelector('#detail-back').addEventListener('click', () => { ui.view = ui.detailFrom; ui.detailId = null; render(); });
  app.querySelector('#detail-fav').addEventListener('click', () => { toggleFavorite(p.id); render(); });
  app.querySelector('#detail-map-link').addEventListener('click', () => {
    ui.view = 'map'; ui.selectedId = p.id; ui.mapCenter = [p.lat, p.lng]; ui.mapZoom = 16; render();
  });
  app.querySelector('#route-btn').addEventListener('click', () => {
    track('route_start', { point: p.id });
    window.open(routeUrl(p), '_blank'); // FR-06: внешний deep link, состояние приложения сохраняется
  });
  app.querySelector('#open-report').addEventListener('click', () => openReportSheet(p));

  const mm = L.map('mini-map', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, attributionControl: false, tap: false })
    .setView([p.lat, p.lng], 15);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(mm);
  L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'wp-marker', html: markerSvg(p.status, true), iconSize: [44, 44], iconAnchor: [22, 44] }), interactive: false }).addTo(mm);
}

// ---------- избранное (FR-08) ----------
function renderSavedView() {
  const favs = getFavorites();
  const pts = withDistances(state.points.filter(p => favs.has(p.id)).map(p => ({ ...p, status: computeStatus(p) })));
  const body = pts.length
    ? `<div class="cards">` + pts.map(p => `
      <button class="card" data-open="${p.id}">
        ${thumbSvg()}
        <div class="info">
          <div class="title">${esc(p.name)}</div>
          <div class="addr">${esc([p.asum, p.district].filter(Boolean).join(', '))}</div>
          <div class="meta">${p.dist != null ? `<span class="dist">${fmtDist(p.dist)}</span>` : ''} ${statusBadge(p)}</div>
        </div>
        <span class="heart on" data-fav="${p.id}" role="button" aria-label="${t('nav_saved')}">${icons.heartFill}</span>
      </button>`).join('') + `</div>`
    : `<div class="state-box"><div class="icon">🤍</div><h3>${t('saved_empty_title')}</h3><div>${t('saved_empty_text')}</div></div>`;

  app.innerHTML = `
    <div class="view">
      ${headerHtml()}
      <div class="section-head"><h2>${t('saved_title')}</h2><span class="count">${pointsCount(pts.length)}</span></div>
      ${bannersHtml()}
      ${body}
    </div>
    ${navHtml()}`;
  wireNav(app); wireHeader(app); wireCards(app); wireBanners(app);
}

// ---------- настройки (FR-10, тема, синхронизация, о проекте) ----------
function renderSettingsView() {
  const lang = getLang();
  app.innerHTML = `
    <div class="view">
      ${headerHtml()}
      <div class="section-head"><h2>${t('settings_title')}</h2></div>

      <div class="settings-group">
        <div class="settings-row">${icons.globe}<span class="grow">${t('settings_language')}</span></div>
        <div class="lang-grid">
          ${LANGS.map(l => `
            <button class="lang-opt ${lang === l.code ? 'on' : ''}" data-lang="${l.code}">
              <span class="tag">${l.tag}</span><span class="name">${l.label}</span>
            </button>`).join('')}
        </div>
        <div class="settings-row">
          ${icons.moon}<span class="grow">${t('settings_dark')}</span>
          <label class="switch"><input type="checkbox" id="theme-toggle" ${getTheme() === 'dark' ? 'checked' : ''} /><span class="track"></span></label>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-row">
          ${icons.refresh}
          <span class="grow">${t('settings_data')}
            <span class="sub">${t('settings_last_sync')}: ${state.cachedAt ? fmtDate(state.cachedAt) : t('settings_sync_never')}</span>
            ${state.syncFailed ? `<span class="sub" style="color:var(--amber)">${t('settings_sync_fail')}</span>` : ''}
          </span>
          <button class="btn-secondary" id="sync-btn">${t('settings_sync_now')}</button>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-row">${icons.info}<span class="grow">${t('settings_about')}</span></div>
        <div class="settings-row"><p class="about-text">${t('settings_about_text')}</p></div>
        <div class="settings-row">${icons.check}<span class="grow">${t('settings_privacy')}<span class="sub">${t('settings_privacy_text')}</span></span></div>
      </div>
    </div>
    ${navHtml()}`;

  wireNav(app); wireHeader(app);
  app.querySelectorAll('[data-lang]').forEach(b =>
    b.addEventListener('click', () => { setLang(b.dataset.lang); render(); }));
  app.querySelector('#theme-toggle').addEventListener('change', e => {
    setTheme(e.target.checked ? 'dark' : 'light'); render();
  });
  app.querySelector('#sync-btn').addEventListener('click', async e => {
    e.target.textContent = '…';
    await sync();
    render();
  });
}

// ---------- фильтры (FR-07) ----------
function openFilterSheet() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const radiusOpts = [[null, t('filters_radius_any')], [1000, '≤ 1 км'], [2000, '≤ 2 км'], [5000, '≤ 5 км']];
  const typeOpts = [[null, t('chip_all')], ['outdoor', t('filters_type_outdoor')], ['indoor', t('filters_type_indoor')]];

  function count(tmpQuick, tmpRadius, tmpType, tmpFav) {
    const save = { q: ui.quick, r: ui.radius, t: ui.type, f: ui.favoritesOnly };
    Object.assign(ui, { quick: tmpQuick, radius: tmpRadius, type: tmpType, favoritesOnly: tmpFav });
    const n = filtered().length;
    Object.assign(ui, { quick: save.q, radius: save.r, type: save.t, favoritesOnly: save.f });
    return n;
  }

  let tmp = { quick: ui.quick, radius: ui.radius, type: ui.type, fav: ui.favoritesOnly };

  function draw() {
    overlay.innerHTML = `
      <div class="sheet" role="dialog" aria-label="${t('filters_title')}">
        <div class="grabber"></div>
        <h2>${t('filters_title')}</h2>
        <div class="filter-section">
          <div class="label">${t('chip_available')} / ${t('chip_animals')}</div>
          <div class="seg">
            <button class="chip ${tmp.quick === 'all' ? 'on' : ''}" data-q="all">${t('chip_all')}</button>
            <button class="chip ${tmp.quick === 'available' ? 'on' : ''}" data-q="available">${t('chip_available')}</button>
            <button class="chip ${tmp.quick === 'animals' ? 'on' : ''}" data-q="animals">${t('chip_animals')}</button>
            <button class="chip ${tmp.fav ? 'on' : ''}" data-f="1">${t('chip_favorites')}</button>
          </div>
        </div>
        <div class="filter-section">
          <div class="label">${t('filters_radius')}</div>
          <div class="seg">${radiusOpts.map(([v, l]) => `<button class="chip ${tmp.radius === v ? 'on' : ''}" data-r="${v ?? ''}">${l}</button>`).join('')}</div>
        </div>
        <div class="filter-section">
          <div class="label">${t('filters_type')}</div>
          <div class="seg">${typeOpts.map(([v, l]) => `<button class="chip ${tmp.type === v ? 'on' : ''}" data-t="${v ?? ''}">${l}</button>`).join('')}</div>
        </div>
        <div class="sheet-actions">
          <button class="btn-ghost" id="f-reset">${t('filters_reset')}</button>
          <button class="btn-primary" id="f-apply">${t('filters_apply', { n: count(tmp.quick, tmp.radius, tmp.type, tmp.fav) })}</button>
        </div>
      </div>`;
    overlay.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { tmp.quick = b.dataset.q; draw(); }));
    overlay.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { tmp.radius = b.dataset.r ? +b.dataset.r : null; draw(); }));
    overlay.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { tmp.type = b.dataset.t || null; draw(); }));
    overlay.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { tmp.fav = !tmp.fav; draw(); }));
    overlay.querySelector('#f-reset').addEventListener('click', () => {
      tmp = { quick: 'all', radius: null, type: null, fav: false }; draw();
    });
    overlay.querySelector('#f-apply').addEventListener('click', () => {
      ui.quick = tmp.quick; ui.radius = tmp.radius; ui.type = tmp.type; ui.favoritesOnly = tmp.fav;
      overlay.remove(); render();
    });
  }
  draw();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  app.appendChild(overlay);
}

// ---------- отчёт о проблеме (FR-09) ----------
function openReportSheet(p) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const cats = ['not_working', 'damage', 'no_access', 'wrong_point', 'other'];
  let cat = null, error = '';

  function draw(sent = false) {
    if (sent) {
      overlay.innerHTML = `
        <div class="sheet" role="dialog">
          <div class="grabber"></div>
          <div class="state-box" style="padding:24px 8px">
            <div class="icon">✅</div>
            <h3>${t('report_sent_title')}</h3><div>${t('report_sent_text')}</div>
            <button class="btn-secondary" id="r-done">${t('close')}</button>
          </div>
        </div>`;
      overlay.querySelector('#r-done').addEventListener('click', () => { overlay.remove(); render(); });
      return;
    }
    overlay.innerHTML = `
      <div class="sheet" role="dialog" aria-label="${t('report_title')}">
        <div class="grabber"></div>
        <h2>${t('report_title')}</h2>
        <div class="cat-list">
          ${cats.map(c => `<button class="cat-opt ${cat === c ? 'on' : ''}" data-c="${c}">${t('report_cat_' + c)}</button>`).join('')}
        </div>
        <div class="field">
          <label for="r-comment">${t('report_comment')}</label>
          <textarea id="r-comment" rows="3" placeholder="${t('report_comment_ph')}"></textarea>
        </div>
        <div class="field">
          <label for="r-contact">${t('report_contact')}</label>
          <input type="text" id="r-contact" placeholder="${t('report_contact_ph')}" />
        </div>
        <input type="text" class="hp" id="r-website" tabindex="-1" autocomplete="off" />
        <label class="consent-row"><input type="checkbox" id="r-consent" /> ${t('report_consent')}</label>
        ${error ? `<div class="form-error">${error}</div>` : ''}
        <div class="sheet-actions">
          <button class="btn-ghost" id="r-cancel">${t('report_cancel')}</button>
          <button class="btn-primary" id="r-send">${t('report_submit')}</button>
        </div>
      </div>`;
    overlay.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
      cat = b.dataset.c;
      overlay.querySelectorAll('.cat-opt').forEach(x => x.classList.toggle('on', x.dataset.c === cat));
    }));
    overlay.querySelector('#r-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#r-send').addEventListener('click', () => {
      const consent = overlay.querySelector('#r-consent').checked;
      const honeypot = overlay.querySelector('#r-website').value;
      if (honeypot) { overlay.remove(); return; } // бот
      if (!cat) { error = t('report_need_category'); draw(); return; }
      if (!consent) { error = t('report_need_consent'); draw(); return; }
      const res = submitReport({
        pointId: p.id, category: cat,
        comment: overlay.querySelector('#r-comment').value.trim(),
        contact: overlay.querySelector('#r-contact').value.trim()
      });
      if (!res.ok) { error = t('report_rate_limited'); draw(); return; }
      track('report_submit', { point: p.id, category: cat });
      draw(true);
    });
  }
  draw();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  app.appendChild(overlay);
}

// ---------- рендер ----------
function render() {
  if (map) { map.remove(); map = null; }
  switch (ui.view) {
    case 'map': renderMapView(); break;
    case 'list': renderListView(); break;
    case 'saved': renderSavedView(); break;
    case 'settings': renderSettingsView(); break;
    case 'detail': renderDetailView(); break;
  }
}

// ---------- запуск ----------
async function start() {
  setTheme(getTheme());
  document.documentElement.lang = getLang();
  track('app_open');
  loadCached();
  ui.loading = false;
  render();
  requestGeo();
  sync().then(ok => { if (ok || state.syncFailed) render(); });
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  if ('serviceWorker' in navigator && !location.hostname.includes('localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

start();
