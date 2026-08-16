// Инлайн-SVG (stroke = currentColor), 44px зоны касания обеспечивают кнопки-обёртки.
const s = (paths, vb = '0 0 24 24', fill = 'none') =>
  `<svg width="22" height="22" viewBox="${vb}" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const icons = {
  drop: s('<path d="M12 3s6 6.3 6 10.2A6 6 0 0 1 6 13.2C6 9.3 12 3 12 3z"/>'),
  dropFill: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3s6 6.3 6 10.2A6 6 0 0 1 6 13.2C6 9.3 12 3 12 3z"/></svg>`,
  search: s('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  sliders: s('<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>'),
  map: s('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
  list: s('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>'),
  heart: s('<path d="M12 20.5s-7.5-4.7-9.3-9.3C1.4 7.9 3.5 5 6.6 5c2 0 3.6 1.1 4.4 2.7h2C13.8 6.1 15.4 5 17.4 5c3.1 0 5.2 2.9 3.9 6.2-1.8 4.6-9.3 9.3-9.3 9.3z"/>'),
  heartFill: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.5s-7.5-4.7-9.3-9.3C1.4 7.9 3.5 5 6.6 5c2 0 3.6 1.1 4.4 2.7h2C13.8 6.1 15.4 5 17.4 5c3.1 0 5.2 2.9 3.9 6.2-1.8 4.6-9.3 9.3-9.3 9.3z"/></svg>`,
  gear: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z"/>'),
  pin: s('<path d="M12 21s-7-5.8-7-11a7 7 0 0 1 14 0c0 5.2-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  nav: s('<path d="m3 11 18-7-7 18-2.5-7.5L3 11z"/>'),
  walk: s('<circle cx="13" cy="4.5" r="1.8"/><path d="M10 20.5 12 15l-2-2 .8-4.5L8 10l-1.5 2.5M12.8 8.5l2 2.5 2.7 1M12 15l2.5 2 1 3.5"/>'),
  layers: s('<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>'),
  locate: s('<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  back: s('<path d="M15 5l-7 7 7 7"/>'),
  close: s('<path d="M6 6l12 12M18 6 6 18"/>'),
  alert: s('<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4M12 17.2v.1"/>'),
  globe: s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.7 2.7 4 6 4 9s-1.3 6.3-4 9c-2.7-2.7-4-6-4-9s1.3-6.3 4-9z"/>'),
  moon: s('<path d="M20.5 14A8.5 8.5 0 1 1 10 3.5 7 7 0 0 0 20.5 14z"/>'),
  langs: s('<path d="M4 6h8M8 4v2M10.5 6C10 9.5 7.5 12.5 4 14M6.5 9.5c1 2.5 3.5 4.5 6 5"/><path d="m13 20 4-9 4 9M14.2 17.5h5.6"/>'),
  clock: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  paw: s('<circle cx="7" cy="9" r="1.6"/><circle cx="11" cy="6.5" r="1.6"/><circle cx="15.5" cy="7.5" r="1.6"/><circle cx="18.5" cy="11" r="1.6"/><path d="M8.5 18.5c0-2.5 2-5 4.5-5s4.5 2.5 4.5 5c0 1.4-1.1 2.2-2.3 2-1-.2-1.5-.5-2.2-.5s-1.2.3-2.2.5c-1.2.2-2.3-.6-2.3-2z"/>'),
  bottle: s('<path d="M10 3h4M10.5 3v3L9 8.5V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V8.5L13.5 6V3"/><path d="M9 13h6"/>'),
  refresh: s('<path d="M20 8A8.5 8.5 0 0 0 5 6.5L4 8M4 16a8.5 8.5 0 0 0 15 1.5l1-1.5"/><path d="M4 4v4h4M20 20v-4h-4"/>'),
  info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>'),
  check: s('<path d="m5 13 4 4L19 7"/>'),
  // FR-14: туалеты — своя иконка, ни в чём не похожая на каплю
  wc: s('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 9v6M6.5 9l1.5 3 1.5-3M13.5 9v6M13.5 9c2.5 0 2.5 3 0 3h.4l1.6 3"/>'),
  toiletKind: s('<path d="M6 4h9a3 3 0 0 1 0 6H6z"/><path d="M6 10v7a3 3 0 0 0 3 3h4"/><path d="M18 14v6"/>'),
  euro: s('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.6a4.2 4.2 0 0 0-6.3 3.4 4.2 4.2 0 0 0 6.3 3.4M7.6 11h5M7.6 13.2h5"/>'),
  accessible: s('<circle cx="13" cy="4.6" r="1.7"/><path d="M9.5 8.2 13 9.4V13h3.2l2.3 5"/><path d="M13.4 13a4.8 4.8 0 1 1-4.6 5.6"/>'),
  share: s('<circle cx="17.5" cy="5.8" r="2.6"/><circle cx="6.5" cy="12" r="2.6"/><circle cx="17.5" cy="18.2" r="2.6"/><path d="m8.9 10.8 6.3-3.6M8.9 13.2l6.3 3.6"/>'),
  leaf: s('<path d="M20 4C10 4 4.5 8 4.5 14.5A5.5 5.5 0 0 0 10 20c6.5 0 10-5.5 10-16z"/><path d="M17 7C11.5 9 8.5 13 7 19"/>')
};

// Цвет доступной точки задаёт категория, остальные статусы — общая шкала.
const CATEGORY_COLOR = { water_tap: '#2d9cdb', public_toilet: '#3d8f6d' };
const STATUS_COLOR = {
  seasonal_closed: '#90a0b4',
  reported_issue: '#f2994a',
  temporarily_unavailable: '#eb5757',
  unknown: '#90a0b4'
};

// Силуэты: капля = вода, скруглённый пин с подписью WC = туалет.
// Категория читается по форме, статус — по цвету и глифу (не только цвет, WCAG).
const BODY = {
  water_tap: 'M16 2C23 9.5 26 14 26 19a10 10 0 0 1-20 0c0-5 3-9.5 10-17z',
  public_toilet: 'M11 2h10a6 6 0 0 1 6 6v9a6 6 0 0 1-6 6h-3l-2 7-2-7h-3a6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z'
};

const STATUS_GLYPH = {
  seasonal_closed: '<path d="M16 11.5v6M13 14.5h6" stroke="#fff" stroke-width="2" stroke-linecap="round" transform="rotate(45 16 14.5)"/>',
  reported_issue: '<path d="M16 10.5v4.5M16 17.6v.1" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  temporarily_unavailable: '<path d="M13.5 12l5 5M18.5 12l-5 5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  unknown: '<path d="M14 12.2a2 2 0 1 1 2.4 2.6c-.4.2-.4.7-.4 1.2M16 18.2v.1" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
};

// Опознавательный знак категории — виден, когда точка доступна и статусный глиф не нужен.
const CATEGORY_GLYPH = {
  water_tap: '<path d="m12 16 2.5 2.5 5.5-5.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  public_toilet: '<text x="16" y="9.6" text-anchor="middle" font-size="9.5" font-weight="700" font-family="Inter, system-ui, sans-serif" fill="#fff">WC</text>'
};

export function markerSvg(category, status, selected) {
  const size = selected ? 44 : 32;
  const cat = BODY[category] ? category : 'water_tap';
  const ok = status === 'available';
  const fill = ok ? CATEGORY_COLOR[cat] : (STATUS_COLOR[status] || STATUS_COLOR.unknown);
  const glyph = ok ? CATEGORY_GLYPH[cat] : STATUS_GLYPH[status] || STATUS_GLYPH.unknown;
  // у туалета статусный глиф встаёт в центр корпуса, у капли — ниже, в её широкую часть
  const shift = cat === 'public_toilet' && !ok ? -2 : 3;
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32">
    <path d="${BODY[cat]}" fill="${fill}" stroke="#fff" stroke-width="${selected ? 2.5 : 1.5}"/>
    <g transform="translate(0 ${shift})">${glyph}</g>
  </svg>`;
}

// Заглушка фото: источник не даёт изображений — честная иллюстрация по категории.
export function thumbSvg(category = 'water_tap', sizeClass = '') {
  const art = category === 'public_toilet'
    ? '<path d="M4 4h16v16H4z" opacity="0"/><path d="M8.5 8v8M6.7 8l1.8 4 1.8-4M14.4 8v8M14.4 8c2.6 0 2.6 3.2 0 3.2h.4l1.8 4.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'
    : '<path d="M12 3s6 6.3 6 10.2A6 6 0 0 1 6 13.2C6 9.3 12 3 12 3z"/>';
  return `<div class="thumb ${category === 'public_toilet' ? 'wc' : ''} ${sizeClass}" aria-hidden="true">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" opacity="0.85">${art}</svg>
  </div>`;
}
