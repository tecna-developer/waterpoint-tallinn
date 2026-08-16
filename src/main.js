import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { t, getLang, setLang, LANGS, pointsCount } from './i18n.js';
import { icons, markerSvg, thumbSvg } from './icons.js';
import {
  state, loadCached, sync, computeStatus, withDistances, fmtDist, walkMinutes,
  getFavorites, toggleFavorite, submitReport, hasPendingReport, seasonalWarningActive,
  track, getTheme, setTheme, districts, origin, isOnboarded, setOnboarded
} from './data.js';

const app = document.getElementById('app');

const ui = {
  view: 'map',                 // onboarding | map | list | saved | settings | detail
  detailId: null,
  detailFrom: 'map',
  selectedId: null,            // выбранная точка на карте
  category: 'all',             // FR-16: all | water_tap | public_toilet
  quick: 'all',                // all | available | animals
  listSort: 'nearest',         // nearest | recent
  radius: null,                // null | 1000 | 2000 | 5000
  point_type: null,            // null | outdoor | indoor (только для кранов)
  favoritesOnly: false,
  search: '',
  loading: true,
  legendOpen: false,
  pickMode: false,             // FR-01: ручной выбор точки отсчёта на карте
  toast: null,
  mapCenter: [59.437, 24.7536],
  mapZoom: 12
};

let map = null;
let mapEl = null;              // контейнер карты переживает ререндеры (см. mountMap)
let markerLayer = null;
let userMarker = null;
let markerSig = null;          // подпись набора маркеров — не перерисовываем без нужды

// ---------- фильтрация (FR-08, FR-16) ----------
function filtered() {
  let pts = state.points.map(p => ({ ...p, status: computeStatus(p) }));
  const favs = getFavorites();
  if (ui.category !== 'all') pts = pts.filter(p => p.category === ui.category);
  if (ui.quick === 'available') pts = pts.filter(p => p.status === 'available');
  if (ui.quick === 'animals') pts = pts.filter(p => p.dog_bowl === true);
  if (ui.favoritesOnly) pts = pts.filter(p => favs.has(p.id));
  // indoor/outdoor описывает только краны — источник по туалетам этого не различает
  if (ui.point_type) pts = pts.filter(p => p.point_type === ui.point_type);
  pts = withDistances(pts);
  if (ui.radius && origin()) pts = pts.filter(p => p.dist != null && p.dist <= ui.radius);
  return pts;
}

function findPoint(id) {
  const p = state.points.find(x => x.id === id);
  return p ? { ...p, status: computeStatus(p), dist: origin() ? withDistances([p])[0].dist : null } : null;
}

// В источнике есть локализованные названия туалетов; у части точек имени нет вовсе.
function pointName(p) {
  if (p.category !== 'public_toilet') return p.name;
  const lang = getLang();
  const localized = lang === 'en' ? p.name_en : lang === 'ru' ? p.name_ru : null;
  return localized || p.name || t('toilet_unnamed');
}

function pointPlace(p) {
  return [p.asum, p.district].filter(Boolean).join(', ');
}

// Показывать чип имеет смысл, только если в данных есть хоть одна такая точка.
function hasAny(predicate) { return state.points.some(predicate); }

// ---------- вспомогательные ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const locale = () => getLang() === 'et' ? 'et-EE' : getLang() === 'en' ? 'en-GB' : 'ru-RU';

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function fmtDay(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }); }
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

function shareUrl(p) {
  return location.origin + location.pathname + '?p=' + encodeURIComponent(p.id);
}

// FR-13: системный шеринг, где он есть; иначе — копирование ссылки
async function sharePoint(p) {
  const url = shareUrl(p);
  track('share_point', { point: p.id });
  const data = { title: pointName(p), text: pointName(p), url };
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(url);
    showToast(t('share_copied'));
  } catch { /* пользователь отменил шеринг или буфер недоступен */ }
}

function showToast(text) {
  ui.toast = text;
  render();
  setTimeout(() => { if (ui.toast === text) { ui.toast = null; render(); } }, 2600);
}

function toastHtml() {
  return ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : '';
}

// ---------- геолокация (FR-01) ----------
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

// ---------- поиск (FR-07) ----------
let suggestTimer = null;
async function buildSuggestions(q, box) {
  const query = q.trim().toLowerCase();
  if (query.length < 2) { box.innerHTML = ''; box.hidden = true; return; }
  const dd = districts().filter(d => d.toLowerCase().includes(query));
  const pts = state.points.filter(p =>
    (pointName(p) || '').toLowerCase().includes(query) ||
    (p.district || '').toLowerCase().includes(query) ||
    (p.asum || '').toLowerCase().includes(query)).slice(0, 5);
  let html = '';
  if (dd.length) {
    html += `<div class="group-label">${t('search_districts')}</div>` +
      dd.map(d => `<button data-district="${esc(d)}">${esc(d)}</button>`).join('');
  }
  if (pts.length) {
    html += `<div class="group-label">${t('search_points')}</div>` +
      pts.map(p => `<button data-point="${p.id}">${esc(pointName(p))}${p.district ? ' · ' + esc(p.district) : ''}</button>`).join('');
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
      state.searchPos = { lat: p.lat, lng: p.lng, label: pointName(p) };
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
      ${icons.search}
      <input id="search-input" type="text" enterkeyhint="search" placeholder="${t('search_placeholder')}" value="${esc(ui.search)}" aria-label="${t('search_placeholder')}" />
      <button class="filter-btn ${ui.radius || ui.point_type || ui.favoritesOnly ? 'on' : ''}" id="open-filters" aria-label="${t('filters_title')}">${icons.sliders}</button>
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

// ---------- переключатель категории (FR-16) ----------
function categorySegHtml() {
  const opts = [['all', 'cat_all'], ['water_tap', 'cat_water_tap'], ['public_toilet', 'cat_public_toilet']];
  return `<div class="cat-seg" role="tablist" aria-label="${t('filters_category')}">` +
    opts.map(([v, key]) => `
      <button class="seg-opt ${ui.category === v ? 'on' : ''}" data-cat="${v}" role="tab" aria-selected="${ui.category === v}">
        ${v === 'water_tap' ? icons.dropFill.replace('width="22" height="22"', 'width="14" height="14"') : ''}
        ${v === 'public_toilet' ? icons.wc.replace('width="22" height="22"', 'width="14" height="14"') : ''}
        ${t(key)}
      </button>`).join('') + `</div>`;
}

function wireCategorySeg(rootEl) {
  rootEl.querySelectorAll('[data-cat]').forEach(b =>
    b.addEventListener('click', () => {
      ui.category = b.dataset.cat;
      track('category_filter', { category: ui.category });
      render();
    }));
}

// ---------- чипсы ----------
function chipsHtml() {
  // «для животных» и indoor скрыты, пока источник не даёт таких признаков
  const showAnimals = hasAny(p => p.dog_bowl === true);
  return `
  <div class="chips">
    <button class="chip ${ui.quick === 'all' ? 'on' : ''}" data-quick="all">${t('chip_all')}</button>
    <button class="chip ${ui.quick === 'available' ? 'on' : ''}" data-quick="available">${t('chip_available')}</button>
    ${showAnimals ? `<button class="chip ${ui.quick === 'animals' ? 'on' : ''}" data-quick="animals">${t('chip_animals')}</button>` : ''}
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
  // §7.2: сезонное предупреждение по наружным кранам
  if (seasonalWarningActive() && ui.category !== 'public_toilet') {
    html += `<div class="banner info">${icons.clock} ${t('season_warning')}</div>`;
  }
  if (ui.pickMode) {
    html += `<div class="banner info">${icons.pin} ${t('pick_hint')}</div>`;
  } else if (state.geoDenied && !state.searchPos) {
    html += `<div class="banner info">${icons.info} ${t('geo_denied')}
      <button id="banner-pick">${t('geo_denied_action')}</button></div>`;
  }
  return html ? `<div class="banners">${html}</div>` : '';
}

function wireBanners(rootEl) {
  const b = rootEl.querySelector('#banner-pick');
  if (!b) return;
  b.addEventListener('click', () => {
    // на карте предлагаем поставить точку пальцем, в списке — искать текстом
    if (ui.view === 'map') { ui.pickMode = true; render(); }
    else rootEl.querySelector('#search-input')?.focus();
  });
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

// ---------- онбординг (FR-01, §7.1) ----------
function renderOnboarding() {
  const lang = getLang();
  app.innerHTML = `
    <div class="view onboarding">
      <div class="onb-art">${icons.dropFill}${icons.wc}</div>
      <h1>${t('onb_title')}</h1>
      <p class="onb-text">${t('onb_text')}</p>

      <div class="onb-block">
        <div class="label">${t('onb_lang')}</div>
        <div class="lang-grid">
          ${LANGS.map(l => `
            <button class="lang-opt ${lang === l.code ? 'on' : ''}" data-lang="${l.code}">
              <span class="tag">${l.tag}</span><span class="name">${l.label}</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="onb-block geo">
        <div class="onb-geo">${icons.pin}<p>${t('onb_geo')}</p></div>
      </div>

      <div class="onb-actions">
        <button class="btn-primary" id="onb-allow">${icons.locate} ${t('onb_allow')}</button>
        <button class="btn-ghost" id="onb-skip">${t('onb_skip')}</button>
      </div>
    </div>`;

  app.querySelectorAll('[data-lang]').forEach(b =>
    b.addEventListener('click', () => { setLang(b.dataset.lang); render(); }));

  const finish = allow => {
    setOnboarded();
    ui.view = 'map';
    track('onboarding_done', { geo: allow });
    if (allow) { render(); requestGeo(true); }   // системный запрос — только после объяснения
    else { ui.pickMode = true; render(); }
  };
  app.querySelector('#onb-allow').addEventListener('click', () => finish(true));
  app.querySelector('#onb-skip').addEventListener('click', () => finish(false));
}

// ---------- карта (FR-03, FR-14) ----------
// Контейнер карты живёт вне цикла ререндера: Leaflet-инстанс не пересоздаётся,
// иначе на 170+ точках каждое переключение фильтра дёргает всю карту (§8).
function mountMap(slot) {
  if (!mapEl) {
    mapEl = document.createElement('div');
    mapEl.id = 'map';
    mapEl.setAttribute('role', 'application');
  }
  mapEl.setAttribute('aria-label', t('nav_map'));
  slot.appendChild(mapEl);

  if (!map) {
    map = L.map(mapEl, { zoomControl: false, attributionControl: true })
      .setView(ui.mapCenter, ui.mapZoom);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap, &copy; CARTO',
      maxZoom: 19
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    map.on('moveend', () => { const c = map.getCenter(); ui.mapCenter = [c.lat, c.lng]; ui.mapZoom = map.getZoom(); });
    map.on('click', e => {
      if (ui.pickMode) {
        // FR-01: геолокация недоступна — точку отсчёта ставит сам пользователь
        state.searchPos = { lat: e.latlng.lat, lng: e.latlng.lng, label: t('pick_map_point') };
        ui.pickMode = false;
        showToast(t('pick_done'));
        return;
      }
      if (ui.selectedId) { ui.selectedId = null; render(); }
    });
  } else {
    map.setView(ui.mapCenter, ui.mapZoom, { animate: false });
  }
  mapEl.classList.toggle('picking', ui.pickMode);
  requestAnimationFrame(() => map && map.invalidateSize());
  setTimeout(() => map && map.invalidateSize(), 200);
}

function syncMarkers(pts) {
  const sig = ui.selectedId + '|' + pts.map(p => p.id + p.status).join(',');
  if (sig !== markerSig) {
    markerSig = sig;
    markerLayer.clearLayers();
    pts.forEach(p => {
      const selected = p.id === ui.selectedId;
      const size = selected ? 44 : 32;
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: 'wp-marker',
          html: markerSvg(p.category, p.status, selected),
          iconSize: [size, size], iconAnchor: [size / 2, size]
        }),
        keyboard: true,
        title: `${pointName(p)} — ${t('cat_' + p.category)}`
      });
      m.on('click', () => { ui.selectedId = p.id; render(); });
      m.addTo(markerLayer);
    });
  }
  if (userMarker) { userMarker.remove(); userMarker = null; }
  if (state.userPos) {
    userMarker = L.circleMarker([state.userPos.lat, state.userPos.lng],
      { radius: 7, color: '#fff', weight: 2, fillColor: '#2d9cdb', fillOpacity: 1 }).addTo(map);
  }
}

function renderMapView() {
  const pts = filtered();
  const sel = ui.selectedId ? pts.find(p => p.id === ui.selectedId) : null;
  app.innerHTML = `
    <div class="view map-view no-scroll">
      <div id="map-slot"></div>
      ${searchBarHtml()}
      <div class="map-controls">
        ${categorySegHtml()}
        ${chipsHtml()}
      </div>
      <div class="map-fabs">
        <button class="fab ${ui.legendOpen ? 'on' : ''}" id="fab-legend" aria-label="${t('legend_show')}" aria-expanded="${ui.legendOpen}">${icons.layers}</button>
        <button class="fab" id="fab-locate" aria-label="${t('locate_me')}">${icons.locate}</button>
      </div>
      ${ui.legendOpen ? legendHtml() : ''}
      ${bannersHtml()}
      ${sel ? mapCardHtml(sel) : ''}
      ${toastHtml()}
    </div>
    ${navHtml()}`;

  wireNav(app); wireSearch(app); wireChips(app); wireBanners(app); wireCategorySeg(app);
  app.querySelector('#fab-locate').addEventListener('click', () => requestGeo(true));
  const toggleLegend = () => { ui.legendOpen = !ui.legendOpen; render(); };
  app.querySelector('#fab-legend').addEventListener('click', toggleLegend);
  app.querySelector('#legend-close')?.addEventListener('click', toggleLegend);

  if (sel) {
    app.querySelector('#map-card').addEventListener('click', () => openDetail(sel.id, 'map'));
    app.querySelector('#map-card .go').addEventListener('click', e => {
      e.stopPropagation();
      track('route_start', { point: sel.id, category: sel.category });
      window.open(routeUrl(sel), '_blank');
    });
  }

  mountMap(app.querySelector('#map-slot'));
  syncMarkers(pts);
}

// §7.1/§7.2: легенда обязана явно различать «Вода» и «Туалеты»
function legendHtml() {
  const swatch = html => `<span class="swatch">${html}</span>`;
  const statuses = ['available', 'seasonal_closed', 'reported_issue', 'temporarily_unavailable'];
  return `
  <div class="legend" role="region" aria-label="${t('legend_title')}">
    <div class="legend-head">${t('legend_title')}<button id="legend-close" aria-label="${t('close')}">${icons.close}</button></div>
    <div class="legend-label">${t('legend_layers')}</div>
    <div class="legend-row">${swatch(markerSvg('water_tap', 'available', false))}${t('cat_water_tap')}</div>
    <div class="legend-row">${swatch(markerSvg('public_toilet', 'available', false))}${t('cat_public_toilet')}</div>
    <div class="legend-label">${t('legend_statuses')}</div>
    ${statuses.map(s => `<div class="legend-row">
        ${swatch(markerSvg('water_tap', s, false))}${t('status_' + s)}
      </div>`).join('')}
  </div>`;
}

function mapCardHtml(p) {
  return `
  <button class="map-card" id="map-card">
    ${thumbSvg(p.category)}
    <div class="info">
      ${statusBadge(p)}
      <div class="title">${esc(pointName(p))}</div>
      <div class="meta">${p.dist != null ? `${icons.walk.replace('width="22" height="22"', 'width="13" height="13"')} ${fmtDist(p.dist)} • ${t('walk_min', { n: walkMinutes(p.dist) })}` : esc(p.district || '')}</div>
    </div>
    <span class="go" aria-label="${t('detail_route')}">${icons.nav}</span>
  </button>`;
}

// ---------- список (FR-04) ----------
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
        ${thumbSvg(p.category)}
        <div class="info">
          <div class="title">${esc(pointName(p))}</div>
          <div class="addr">${esc(pointPlace(p) || p.code || '')}</div>
          <div class="meta">
            ${p.dist != null ? `<span class="dist">${icons.walk.replace('width="22" height="22"', 'width="13" height="13"')} ${fmtDist(p.dist)}</span>` : ''}
            ${statusBadge(p)}
            <span class="cat-tag ${p.category}">${t('cat_' + p.category)}</span>
          </div>
        </div>
        <span class="heart ${favs.has(p.id) ? 'on' : ''}" data-fav="${p.id}" role="button" aria-label="${t('nav_saved')}">${favs.has(p.id) ? icons.heartFill : icons.heart}</span>
      </button>`).join('') + `</div>`;
  }

  app.innerHTML = `
    <div class="view">
      ${headerHtml()}
      ${searchBarHtml()}
      ${categorySegHtml()}
      <div class="chips">
        <button class="chip ${ui.listSort === 'nearest' ? 'on' : ''}" data-sort="nearest">${icons.nav.replace('width="22" height="22"', 'width="14" height="14"')} ${t('chip_nearest')}</button>
        <button class="chip ${ui.listSort === 'recent' ? 'on' : ''}" data-sort="recent">${icons.clock.replace('width="22" height="22"', 'width="14" height="14"')} ${t('chip_recent')}</button>
        <button class="chip ${ui.quick === 'available' ? 'on' : ''}" data-quick-toggle="available">${t('chip_available')}</button>
      </div>
      <div class="section-head"><h2>${t('nav_list')}</h2><span class="count">${pointsCount(pts.length)}</span></div>
      ${bannersHtml()}
      ${body}
      ${toastHtml()}
    </div>
    ${navHtml()}`;

  wireNav(app); wireSearch(app); wireHeader(app); wireBanners(app); wireCategorySeg(app);
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
  ui.quick = 'all'; ui.radius = null; ui.point_type = null; ui.favoritesOnly = false;
  ui.category = 'all';
  render();
}

// ---------- карточка точки (FR-05, FR-15) ----------
function openDetail(id, from) {
  ui.detailFrom = from || ui.view;
  ui.detailId = id;
  ui.view = 'detail';
  const p = state.points.find(x => x.id === id);
  track('point_open', { point: id, category: p?.category });
  render();
}

function attr(icon, label, value, small = false) {
  return `<div class="attr">${icon}<div>${label}</div>
    <div class="val${small ? ' small' : ''}">${value}</div></div>`;
}

// §6.3: неизвестное поле показываем как «нет данных», а не прячем и не выдумываем
const orNoData = v => v == null || v === '' ? `<span class="nodata">${t('no_data_short')}</span>` : esc(v);

function toiletAttrsHtml(p) {
  const kind = p.toilet_kind === 'stationary' ? t('toilet_kind_stationary')
    : p.toilet_kind === 'temporary' ? t('toilet_kind_temporary')
      : t('detail_unknown');
  const kindValue = p.toilet_kind === 'temporary' && p.available_until
    ? `${kind}, ${t('toilet_until', { date: fmtDay(p.available_until) })}`
    : kind;
  return `
    <div class="attr-grid">
      ${attr(icons.toiletKind, t('toilet_kind'), esc(kindValue), true)}
      ${attr(icons.clock, t('toilet_hours'), orNoData(p.opening_hours), true)}
      ${attr(icons.euro, t('toilet_fee'), p.is_free == null ? `<span class="nodata">${t('no_data_short')}</span>` : (p.is_free ? t('toilet_free') : t('toilet_paid')), true)}
      ${attr(icons.accessible, t('toilet_accessibility'), orNoData(p.accessibility), true)}
    </div>
    <div class="nodata-note">${icons.info.replace('width="22" height="22"', 'width="15" height="15"')} ${t('no_data')}</div>`;
}

function waterAttrsHtml(p) {
  return `
    <div class="attr-grid">
      ${attr(icons.paw, t('detail_dog_bowl'), p.dog_bowl === true ? t('detail_yes') : p.dog_bowl === false ? t('detail_no') : `<span class="nodata">${t('no_data_short')}</span>`)}
      ${attr(icons.bottle, t('detail_bottle'), p.bottle_refill ? t('detail_ok') : t('detail_unknown'))}
      ${attr(icons.clock, t('detail_season'), t('detail_season_value'), true)}
      ${attr(icons.check, t('detail_source_code'), p.code ? esc(p.code) : `<span class="nodata">${t('no_data_short')}</span>`, true)}
    </div>
    <div class="eco-card">${icons.leaf}<div><strong>${t('eco_title')}</strong><span>${t('eco_text')}</span></div></div>`;
}

function renderDetailView() {
  const p = findPoint(ui.detailId);
  if (!p) { ui.view = 'map'; render(); return; }
  const isToilet = p.category === 'public_toilet';
  const favs = getFavorites();
  const fav = favs.has(p.id);
  const reported = hasPendingReport(p.id);
  const temporaryNote = isToilet && p.toilet_kind === 'temporary' && p.available_until;

  app.innerHTML = `
    <div class="view detail-view">
      <div class="hero ${isToilet ? 'wc' : ''}">
        ${thumbSvg(p.category)}
        <button class="hero-btn back" id="detail-back" aria-label="${t('back')}">${icons.back}</button>
        <button class="hero-btn fav ${fav ? 'on' : ''}" id="detail-fav" aria-label="${t('nav_saved')}">${fav ? icons.heartFill : icons.heart}</button>
      </div>
      <div class="detail-body">
        <div class="detail-toprow">
          ${statusBadge(p, false)}
          <span class="cat-tag ${p.category}">${t('cat_' + p.category)}</span>
          <span class="detail-dist">${icons.pin.replace('width="22" height="22"', 'width="14" height="14"')} ${p.dist != null ? fmtDist(p.dist) : esc(p.district || '')}</span>
        </div>
        <h1 class="detail-title">${esc(pointName(p))}</h1>
        <button class="detail-addr" id="detail-map-link">${icons.pin.replace('width="22" height="22"', 'width="15" height="15"')} ${esc(pointPlace(p) || 'Tallinn')}</button>
        ${reported ? `<div class="banner warn" style="margin:0 0 12px">${icons.alert} ${t('status_note_reported')}</div>` : ''}
        ${temporaryNote ? `<div class="banner info" style="margin:0 0 12px">${icons.clock} ${t('toilet_temporary_note', { date: fmtDay(p.available_until) })}</div>` : ''}
        ${!isToilet && seasonalWarningActive() ? `<div class="banner info" style="margin:0 0 12px">${icons.clock} ${t('season_warning')}</div>` : ''}
        <div class="desc-card">
          <div class="label">${t('detail_description')}</div>
          <div>${p.description ? esc(p.description) : t('detail_no_description')}</div>
        </div>
        ${isToilet ? toiletAttrsHtml(p) : waterAttrsHtml(p)}
        <div class="source-card">
          <div class="label">${t('detail_source')}</div>
          <button class="source-link" id="source-link">${icons.info.replace('width="22" height="22"', 'width="15" height="15"')} ${t(isToilet ? 'detail_source_toilet' : 'detail_source_water')}</button>
          <div class="verified">${t('detail_verified')}: ${p.last_verified_at ? fmtDate(p.last_verified_at) : t('no_data_short')}</div>
        </div>
        <div class="mini-map" id="mini-map" aria-hidden="true"></div>
        <div class="detail-links">
          <button class="report-link" id="open-report">${icons.alert.replace('width="22" height="22"', 'width="16" height="16"')} ${t('detail_report')}</button>
          <button class="report-link" id="share-btn">${icons.share.replace('width="22" height="22"', 'width="16" height="16"')} ${t('share_point')}</button>
        </div>
      </div>
      <div class="detail-cta">
        <button class="btn-primary" id="route-btn">${icons.nav} ${t('detail_route')}</button>
      </div>
      ${toastHtml()}
    </div>`;

  app.querySelector('#detail-back').addEventListener('click', () => { ui.view = ui.detailFrom; ui.detailId = null; render(); });
  app.querySelector('#detail-fav').addEventListener('click', () => { toggleFavorite(p.id); render(); });
  app.querySelector('#detail-map-link').addEventListener('click', () => {
    ui.view = 'map'; ui.selectedId = p.id; ui.mapCenter = [p.lat, p.lng]; ui.mapZoom = 16; render();
  });
  app.querySelector('#route-btn').addEventListener('click', () => {
    track('route_start', { point: p.id, category: p.category });
    window.open(routeUrl(p), '_blank'); // FR-06: внешний deep link, состояние приложения сохраняется
  });
  app.querySelector('#source-link').addEventListener('click', () => window.open(p.source_url, '_blank'));
  app.querySelector('#share-btn').addEventListener('click', () => sharePoint(p));
  app.querySelector('#open-report').addEventListener('click', () => openReportSheet(p));

  const mm = L.map('mini-map', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, attributionControl: false, tap: false })
    .setView([p.lat, p.lng], 15);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(mm);
  L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'wp-marker', html: markerSvg(p.category, p.status, true), iconSize: [44, 44], iconAnchor: [22, 44] }), interactive: false }).addTo(mm);
}

// ---------- избранное ----------
function renderSavedView() {
  const favs = getFavorites();
  const pts = withDistances(state.points.filter(p => favs.has(p.id)).map(p => ({ ...p, status: computeStatus(p) })));
  const body = pts.length
    ? `<div class="cards">` + pts.map(p => `
      <button class="card" data-open="${p.id}">
        ${thumbSvg(p.category)}
        <div class="info">
          <div class="title">${esc(pointName(p))}</div>
          <div class="addr">${esc(pointPlace(p))}</div>
          <div class="meta">${p.dist != null ? `<span class="dist">${fmtDist(p.dist)}</span>` : ''} ${statusBadge(p)}
            <span class="cat-tag ${p.category}">${t('cat_' + p.category)}</span></div>
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
      ${toastHtml()}
    </div>
    ${navHtml()}`;
  wireNav(app); wireHeader(app); wireCards(app); wireBanners(app);
}

// ---------- настройки (тема, синхронизация, о проекте, эко-блок) ----------
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

      <div class="eco-card standalone">${icons.leaf}<div><strong>${t('eco_title')}</strong><span>${t('eco_text')}</span></div></div>

      <div class="settings-group">
        <div class="settings-row">${icons.info}<span class="grow">${t('settings_about')}</span></div>
        <div class="settings-row"><p class="about-text">${t('settings_about_text')}</p></div>
        <div class="settings-row">${icons.check}<span class="grow">${t('settings_privacy')}<span class="sub">${t('settings_privacy_text')}</span></span></div>
      </div>
      ${toastHtml()}
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

// ---------- фильтры (FR-08) ----------
function openFilterSheet() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const radiusOpts = [[null, t('filters_radius_any')], [1000, '≤ 1 км'], [2000, '≤ 2 км'], [5000, '≤ 5 км']];
  const typeOpts = [[null, t('chip_all')], ['outdoor', t('filters_type_outdoor')], ['indoor', t('filters_type_indoor')]];
  const catOpts = [['all', t('cat_all')], ['water_tap', t('cat_water_tap')], ['public_toilet', t('cat_public_toilet')]];
  const showAnimals = hasAny(p => p.dog_bowl === true);
  const showPointType = hasAny(p => p.point_type === 'indoor');

  function count(tmp) {
    const save = { c: ui.category, q: ui.quick, r: ui.radius, t: ui.point_type, f: ui.favoritesOnly };
    Object.assign(ui, { category: tmp.category, quick: tmp.quick, radius: tmp.radius, point_type: tmp.type, favoritesOnly: tmp.fav });
    const n = filtered().length;
    Object.assign(ui, { category: save.c, quick: save.q, radius: save.r, point_type: save.t, favoritesOnly: save.f });
    return n;
  }

  let tmp = { category: ui.category, quick: ui.quick, radius: ui.radius, type: ui.point_type, fav: ui.favoritesOnly };

  function draw() {
    overlay.innerHTML = `
      <div class="sheet" role="dialog" aria-label="${t('filters_title')}">
        <div class="grabber"></div>
        <h2>${t('filters_title')}</h2>
        <div class="filter-section">
          <div class="label">${t('filters_category')}</div>
          <div class="seg">${catOpts.map(([v, l]) => `<button class="chip ${tmp.category === v ? 'on' : ''}" data-c="${v}">${l}</button>`).join('')}</div>
        </div>
        <div class="filter-section">
          <div class="label">${t('chip_available')}</div>
          <div class="seg">
            <button class="chip ${tmp.quick === 'all' ? 'on' : ''}" data-q="all">${t('chip_all')}</button>
            <button class="chip ${tmp.quick === 'available' ? 'on' : ''}" data-q="available">${t('chip_available')}</button>
            ${showAnimals ? `<button class="chip ${tmp.quick === 'animals' ? 'on' : ''}" data-q="animals">${t('chip_animals')}</button>` : ''}
            <button class="chip ${tmp.fav ? 'on' : ''}" data-f="1">${t('chip_favorites')}</button>
          </div>
        </div>
        <div class="filter-section">
          <div class="label">${t('filters_radius')}</div>
          <div class="seg">${radiusOpts.map(([v, l]) => `<button class="chip ${tmp.radius === v ? 'on' : ''}" data-r="${v ?? ''}">${l}</button>`).join('')}</div>
        </div>
        ${showPointType ? `<div class="filter-section">
          <div class="label">${t('filters_type')}</div>
          <div class="seg">${typeOpts.map(([v, l]) => `<button class="chip ${tmp.type === v ? 'on' : ''}" data-t="${v ?? ''}">${l}</button>`).join('')}</div>
        </div>` : ''}
        <div class="sheet-actions">
          <button class="btn-ghost" id="f-reset">${t('filters_reset')}</button>
          <button class="btn-primary" id="f-apply">${t('filters_apply', { n: count(tmp) })}</button>
        </div>
      </div>`;
    overlay.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { tmp.category = b.dataset.c; draw(); }));
    overlay.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { tmp.quick = b.dataset.q; draw(); }));
    overlay.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => { tmp.radius = b.dataset.r ? +b.dataset.r : null; draw(); }));
    overlay.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { tmp.type = b.dataset.t || null; draw(); }));
    overlay.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { tmp.fav = !tmp.fav; draw(); }));
    overlay.querySelector('#f-reset').addEventListener('click', () => {
      tmp = { category: 'all', quick: 'all', radius: null, type: null, fav: false }; draw();
    });
    overlay.querySelector('#f-apply').addEventListener('click', () => {
      ui.category = tmp.category; ui.quick = tmp.quick; ui.radius = tmp.radius;
      ui.point_type = tmp.type; ui.favoritesOnly = tmp.fav;
      overlay.remove(); render();
    });
  }
  draw();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  app.appendChild(overlay);
}

// ---------- отчёт о проблеме (FR-09, FR-17) ----------
const REPORT_CATEGORIES = {
  water_tap: ['not_working', 'damage', 'no_access', 'wrong_point', 'other'],
  // §6.3: у туалетов свои типы проблем, водные сюда не подмешиваем
  public_toilet: ['wc_closed', 'wc_dirty', 'wc_hours', 'wc_location', 'wc_gone', 'other']
};

function openReportSheet(p) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const cats = REPORT_CATEGORIES[p.category] || REPORT_CATEGORIES.water_tap;
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
        pointId: p.id, category: cat, pointCategory: p.category,
        comment: overlay.querySelector('#r-comment').value.trim(),
        contact: overlay.querySelector('#r-contact').value.trim()
      });
      if (!res.ok) { error = t('report_rate_limited'); draw(); return; }
      track('report_submit', { point: p.id, category: cat, point_category: p.category });
      draw(true);
    });
  }
  draw();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  app.appendChild(overlay);
}

// ---------- рендер ----------
function render() {
  // карта-инстанс переживает смену вью; из DOM её вынимает innerHTML, вернёт mountMap
  switch (ui.view) {
    case 'onboarding': renderOnboarding(); break;
    case 'map': renderMapView(); break;
    case 'list': renderListView(); break;
    case 'saved': renderSavedView(); break;
    case 'settings': renderSettingsView(); break;
    case 'detail': renderDetailView(); break;
  }
}

// ---------- запуск ----------
function openSharedPoint() {
  const id = new URLSearchParams(location.search).get('p');   // FR-13
  if (!id || !state.points.some(p => p.id === id)) return false;
  ui.detailId = id; ui.detailFrom = 'map'; ui.view = 'detail';
  return true;
}

async function start() {
  setTheme(getTheme());
  document.documentElement.lang = getLang();
  track('app_open');
  loadCached();
  ui.loading = false;

  const shared = openSharedPoint();
  // FR-01: системный запрос геолокации — только после экрана с объяснением
  if (!isOnboarded() && !shared) ui.view = 'onboarding';
  render();
  if (isOnboarded()) requestGeo();

  sync().then(() => render());
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  if ('serviceWorker' in navigator && !location.hostname.includes('localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

start();
