// Генерация снапшота общественных туалетов из Tallinn GIS (§6.4 ТЗ — ручное обновление).
// Районы (linnaosa) и асумы назначаются point-in-polygon — так же, как для кранов.
//
//   node scripts/gen-toilets.mjs src/data/toilets.json
//
import { writeFileSync } from 'node:fs';

const TOILETS =
  'https://gis.tallinn.ee/arcgis/rest/services/veebikaart/avalikud_tualetid/FeatureServer/0/query' +
  '?where=1%3D1&outFields=*&outSR=4326&f=json';
const POLY = id =>
  `https://gis.tallinn.ee/arcgis/rest/services/Linnaosad_asumid/FeatureServer/${id}/query` +
  '?where=1%3D1&outFields=*&outSR=4326&f=json';

const get = async url => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' -> http ' + r.status);
  const j = await r.json();
  if (j.error) throw new Error(url + ' -> ' + JSON.stringify(j.error));
  return j;
};

// ray casting по одному кольцу
const inRing = (x, y, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
// у ArcGIS кольца в одном массиве: внешние (по часовой) и дырки — чётность попаданий работает
const inPolygon = (x, y, rings) => rings.reduce((acc, r) => acc !== inRing(x, y, r), false);

// Слой «Asumid» несёт сразу оба уровня: linnaosa_lyhinimi (район в том же формате,
// что уже в waterpoints.json) и asumi_nimi.
const loadAsumid = async () => {
  const j = await get(POLY(0));
  console.log('asumid polygons:', j.features.length);
  return j.features.map(f => ({
    district: (f.attributes.linnaosa_lyhinimi || '').trim() || null,
    asum: (f.attributes.asumi_nimi || '').trim() || null,
    rings: f.geometry.rings
  }));
};

const locate = (lng, lat, polys) => polys.find(p => inPolygon(lng, lat, p.rings)) || {};

const KIND = {
  'Olemasolev statsionaarne': 'stationary',
  'Ajutine olemasolev': 'temporary'
};

const run = async () => {
  const [toi, asumid] = await Promise.all([get(TOILETS), loadAsumid()]);
  console.log('toilet features:', toi.features.length);

  const points = [];
  let skipped = 0;
  for (const f of toi.features) {
    const a = f.attributes, g = f.geometry;
    if (!g || typeof g.x !== 'number' || typeof g.y !== 'number') { skipped++; continue; }
    const area = locate(g.x, g.y, asumid);
    points.push({
      source_object_id: a.objectid,
      name: (a.nimi || '').trim() || null,
      name_en: (a.name_eng || '').trim() || null,
      name_ru: (a.name_rus || '').trim() || null,
      lat: g.y,
      lng: g.x,
      district: area.district || null,
      asum: area.asum || null,
      toilet_kind: KIND[a.kihi_nimi] || 'unknown',
      // t2htaeg — дата демонтажа временного туалета; у стационарных пусто
      available_until: a.t2htaeg ? new Date(a.t2htaeg).toISOString() : null
    });
  }

  const out = {
    fetched_at: new Date().toISOString(),
    source: 'Tallinn GIS ArcGIS REST — veebikaart/avalikud_tualetid (Avalikud tualetid)',
    source_url:
      'https://gis.tallinn.ee/arcgis/rest/services/veebikaart/avalikud_tualetid/FeatureServer/0',
    points
  };

  const target = process.argv[2] || 'src/data/toilets.json';
  writeFileSync(target, JSON.stringify(out, null, 1) + '\n', 'utf8');

  const by = k => points.reduce((m, p) => ((m[p[k]] = (m[p[k]] || 0) + 1), m), {});
  console.log('written:', points.length, '| skipped (no geometry):', skipped);
  console.log('kind:', by('toilet_kind'));
  console.log('district:', by('district'));
  console.log('no name:', points.filter(p => !p.name).length);
};

run().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
