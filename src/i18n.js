// FR-10: все UI-строки через ключи ET/EN/RU. Пропуск перевода -> EN + console.warn.
const dict = {
  app_name: { et: 'WaterPoint Tallinn', en: 'WaterPoint Tallinn', ru: 'WaterPoint Tallinn' },
  nav_map: { et: 'Kaart', en: 'Map', ru: 'Карта' },
  nav_list: { et: 'Nimekiri', en: 'List', ru: 'Список' },
  nav_saved: { et: 'Lemmikud', en: 'Saved', ru: 'Избранное' },
  nav_settings: { et: 'Seaded', en: 'Settings', ru: 'Настройки' },

  search_placeholder: { et: 'Otsi aadressi või linnaosa…', en: 'Search address or district…', ru: 'Поиск адреса или района…' },
  search_hint_invalid: { et: 'Ei leidnud vastet. Proovi aadressi, tänavat või linnaosa, nt „Kesklinn“.', en: 'No match found. Try an address, street or district, e.g. “Kesklinn”.', ru: 'Ничего не найдено. Попробуйте адрес, улицу или район, например «Kesklinn».' },
  search_districts: { et: 'Linnaosad', en: 'Districts', ru: 'Районы' },
  search_points: { et: 'Veevõtukohad', en: 'Water points', ru: 'Точки' },
  search_addresses: { et: 'Aadressid', en: 'Addresses', ru: 'Адреса' },

  chip_all: { et: 'Kõik', en: 'All', ru: 'Все' },
  chip_available: { et: 'Praegu avatud', en: 'Available now', ru: 'Доступно сейчас' },
  chip_animals: { et: 'Loomadele', en: 'Dog friendly', ru: 'Для животных' },
  chip_nearest: { et: 'Lähimad', en: 'Nearest', ru: 'Ближайшие' },
  chip_recent: { et: 'Hiljuti lisatud', en: 'Recently added', ru: 'Недавно добавленные' },
  chip_favorites: { et: 'Lemmikud', en: 'Favorites', ru: 'Избранное' },

  filters_title: { et: 'Filtrid', en: 'Filters', ru: 'Фильтры' },
  filters_radius: { et: 'Raadius', en: 'Radius', ru: 'Радиус' },
  filters_radius_any: { et: 'Kõik kaugused', en: 'Any distance', ru: 'Любое расстояние' },
  filters_type: { et: 'Tüüp', en: 'Type', ru: 'Тип' },
  filters_type_outdoor: { et: 'Väli', en: 'Outdoor', ru: 'Уличный' },
  filters_type_indoor: { et: 'Sise', en: 'Indoor', ru: 'Крытый' },
  filters_reset: { et: 'Lähtesta', en: 'Reset', ru: 'Сбросить' },
  filters_apply: { et: 'Näita {n}', en: 'Show {n}', ru: 'Показать {n}' },
  results_count: { et: '{n} kohta', en: '{n} points', ru: 'Точек: {n}' },

  status_available: { et: 'Avatud viimaste andmete järgi', en: 'Available per latest data', ru: 'Доступна по последним данным' },
  status_available_short: { et: 'Avatud', en: 'Available', ru: 'Активен' },
  status_seasonal_closed: { et: 'Hooajaväliselt suletud', en: 'Closed for season', ru: 'Сезонно закрыта' },
  status_reported_issue: { et: 'Kasutaja teatas probleemist', en: 'Issue reported', ru: 'Есть сообщение о проблеме' },
  status_temporarily_unavailable: { et: 'Ajutiselt suletud', en: 'Temporarily unavailable', ru: 'Временно недоступна' },
  status_unknown: { et: 'Andmed puuduvad', en: 'Unknown', ru: 'Нет данных' },
  status_note_reported: { et: 'Teade ootab modereerimist; ametlik staatus pole muutunud.', en: 'Report awaits moderation; official status unchanged.', ru: 'Сообщение ждёт модерации; официальный статус не изменён.' },

  detail_description: { et: 'Kirjeldus', en: 'Description', ru: 'Описание' },
  detail_no_description: { et: 'Kirjeldus puudub. Ametlik allikas: avalik veevõtukoht.', en: 'No description yet. Official source: public water point.', ru: 'Описания пока нет. Официальный источник: общественная точка воды.' },
  detail_dog_bowl: { et: 'Loomadele', en: 'Dog bowl', ru: 'Для животных' },
  detail_bottle: { et: 'Pudeli täitmine', en: 'Bottle refill', ru: 'Набор бутылок' },
  detail_yes: { et: 'Jah', en: 'Yes', ru: 'Да' },
  detail_no: { et: 'Ei', en: 'No', ru: 'Нет' },
  detail_ok: { et: 'Sobib', en: 'Suitable', ru: 'Удобно' },
  detail_unknown: { et: 'Teadmata', en: 'Unknown', ru: 'Неизвестно' },
  detail_route: { et: 'Juhata kohale', en: 'Get directions', ru: 'Построить маршрут' },
  detail_report: { et: 'Teata probleemist', en: 'Report a problem', ru: 'Сообщить о проблеме' },
  detail_season: { et: 'Hooaeg', en: 'Season', ru: 'Сезон' },
  detail_season_value: { et: 'mai – oktoober', en: 'May – October', ru: 'май – октябрь' },
  detail_verified: { et: 'Kontrollitud', en: 'Verified', ru: 'Проверено' },
  detail_source_code: { et: 'Kood', en: 'Code', ru: 'Код' },
  detail_type: { et: 'Tüüp', en: 'Type', ru: 'Тип' },
  walk_min: { et: '{n} min', en: '{n} min', ru: '{n} мин' },

  saved_title: { et: 'Lemmikud', en: 'Saved', ru: 'Избранное' },
  saved_count: { et: '{n} kohta', en: '{n} points', ru: '{n} точки' },
  saved_empty_title: { et: 'Lemmikuid pole veel', en: 'No favorites yet', ru: 'Пока нет избранного' },
  saved_empty_text: { et: 'Puuduta südant kaardil või nimekirjas — koht salvestatakse seadmesse ja on saadaval võrguühenduseta.', en: 'Tap the heart on the map or in the list — points are stored on the device and available offline.', ru: 'Нажмите на сердечко на карте или в списке — точка сохранится на устройстве и будет доступна офлайн.' },

  settings_title: { et: 'Seaded', en: 'Settings', ru: 'Настройки' },
  settings_language: { et: 'Rakenduse keel', en: 'App language', ru: 'Язык приложения' },
  settings_dark: { et: 'Tume teema', en: 'Dark theme', ru: 'Тёмная тема' },
  settings_data: { et: 'Andmed', en: 'Data', ru: 'Данные' },
  settings_last_sync: { et: 'Viimane sünkroonimine', en: 'Last synced', ru: 'Последняя синхронизация' },
  settings_sync_now: { et: 'Uuenda kohe', en: 'Sync now', ru: 'Обновить сейчас' },
  settings_sync_never: { et: 'Kasutusel on kaasapandud koopia', en: 'Using bundled snapshot', ru: 'Используется встроенная копия' },
  settings_sync_fail: { et: 'Allikas pole kättesaadav — näitame viimast õnnestunud koopiat.', en: 'Source unreachable — showing last successful copy.', ru: 'Источник недоступен — показана последняя успешная копия.' },
  settings_about: { et: 'Projektist', en: 'About', ru: 'О проекте' },
  settings_about_text: { et: 'WaterPoint Tallinn on sõltumatu rakendus avalike joogiveekohtade leidmiseks. Andmete allikas: Tallinna GIS (kiht „Avalikud veevõtukohad“). Rakendus ei ole Tallinna Vesi ametlik toode.', en: 'WaterPoint Tallinn is an independent app for finding public drinking water points. Data source: Tallinn GIS (layer “Avalikud veevõtukohad”). The app is not an official Tallinna Vesi product.', ru: 'WaterPoint Tallinn — независимое приложение для поиска общественных точек питьевой воды. Источник данных: Tallinn GIS (слой «Avalikud veevõtukohad»). Приложение не является официальным продуктом Tallinna Vesi.' },
  settings_privacy: { et: 'Privaatsus', en: 'Privacy', ru: 'Конфиденциальность' },
  settings_privacy_text: { et: 'Täpset asukohta ei salvestata ega saadeta serverisse. Lemmikud ja vahemälu hoitakse ainult seadmes.', en: 'Precise location is never stored or sent to a server. Favorites and cache live on the device only.', ru: 'Точная геолокация не сохраняется и не отправляется на сервер. Избранное и кеш хранятся только на устройстве.' },

  report_title: { et: 'Teata probleemist', en: 'Report a problem', ru: 'Сообщить о проблеме' },
  report_cat_not_working: { et: 'Ei tööta', en: 'Not working', ru: 'Не работает' },
  report_cat_damage: { et: 'Kahjustus / reostus', en: 'Damage / contamination', ru: 'Повреждение / загрязнение' },
  report_cat_no_access: { et: 'Ligipääs puudub', en: 'No access', ru: 'Нет доступа' },
  report_cat_wrong_point: { et: 'Vale asukoht', en: 'Wrong location', ru: 'Неверная точка' },
  report_cat_other: { et: 'Muu', en: 'Other', ru: 'Другое' },
  report_comment: { et: 'Kommentaar', en: 'Comment', ru: 'Комментарий' },
  report_comment_ph: { et: 'Kirjelda probleemi…', en: 'Describe the problem…', ru: 'Опишите проблему…' },
  report_contact: { et: 'Kontakt (valikuline)', en: 'Contact (optional)', ru: 'Контакт (по желанию)' },
  report_contact_ph: { et: 'E-post või telefon', en: 'Email or phone', ru: 'Email или телефон' },
  report_consent: { et: 'Nõustun teate edastamisega moderaatorile', en: 'I agree to pass the report to a moderator', ru: 'Согласен(на) передать сообщение модератору' },
  report_submit: { et: 'Saada', en: 'Send', ru: 'Отправить' },
  report_cancel: { et: 'Loobu', en: 'Cancel', ru: 'Отмена' },
  report_sent_title: { et: 'Aitäh!', en: 'Thank you!', ru: 'Спасибо!' },
  report_sent_text: { et: 'Teade on saadetud modereerimisele. Vaatame selle üle 2 tööpäeva jooksul.', en: 'Your report went to moderation. We review within 2 business days.', ru: 'Сообщение отправлено на модерацию. Проверим в течение 2 рабочих дней.' },
  report_need_category: { et: 'Vali kategooria', en: 'Choose a category', ru: 'Выберите категорию' },
  report_need_consent: { et: 'Kinnita nõusolek', en: 'Please confirm consent', ru: 'Подтвердите согласие' },
  report_rate_limited: { et: 'Liiga palju teateid järjest. Proovi hiljem.', en: 'Too many reports in a row. Try again later.', ru: 'Слишком много сообщений подряд. Попробуйте позже.' },

  geo_denied: { et: 'Asukoht on keelatud — kaugused arvutatakse otsingu järgi.', en: 'Location denied — distances follow your search.', ru: 'Геолокация отключена — расстояния считаются от точки поиска.' },
  geo_denied_action: { et: 'Otsi käsitsi', en: 'Search manually', ru: 'Искать вручную' },
  offline_banner: { et: 'Võrguühendus puudub. Andmed: {date}', en: 'You are offline. Data from {date}', ru: 'Нет сети. Данные от {date}' },
  stale_banner: { et: 'Andmed: {date}', en: 'Data from {date}', ru: 'Данные от {date}' },
  empty_title: { et: 'Midagi ei leitud', en: 'Nothing found', ru: 'Ничего не найдено' },
  empty_text: { et: 'Proovi filtreid lõdvendada või lähtestada.', en: 'Try relaxing or resetting the filters.', ru: 'Попробуйте ослабить или сбросить фильтры.' },
  error_title: { et: 'Midagi läks valesti', en: 'Something went wrong', ru: 'Что-то пошло не так' },
  error_retry: { et: 'Proovi uuesti', en: 'Retry', ru: 'Повторить' },
  loading: { et: 'Laadimine…', en: 'Loading…', ru: 'Загрузка…' },
  back: { et: 'Tagasi', en: 'Back', ru: 'Назад' },
  close: { et: 'Sulge', en: 'Close', ru: 'Закрыть' },
  locate_me: { et: 'Minu asukoht', en: 'My location', ru: 'Моё местоположение' },
  distance_from_search: { et: 'otsingust', en: 'from search', ru: 'от точки поиска' }
};

const FALLBACK = 'en';
let lang = localStorage.getItem('wpt_lang') || 'ru';

export function getLang() { return lang; }

export function setLang(l) {
  lang = l;
  localStorage.setItem('wpt_lang', l);
  document.documentElement.lang = l;
}

export function t(key, params) {
  const entry = dict[key];
  if (!entry) { console.warn('[i18n] missing key', key); return key; }
  let s = entry[lang];
  if (s == null) { console.warn('[i18n] missing translation', key, lang); s = entry[FALLBACK]; }
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace('{' + k + '}', v);
  return s;
}

// «1 точка / 2 точки / 5 точек», «1 koht / 2 kohta», «1 point / 2 points»
export function pointsCount(n) {
  if (lang === 'ru') {
    const m10 = n % 10, m100 = n % 100;
    const w = m10 === 1 && m100 !== 11 ? 'точка'
      : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'точки' : 'точек';
    return n + ' ' + w;
  }
  if (lang === 'et') return n + (n === 1 ? ' koht' : ' kohta');
  return n + (n === 1 ? ' point' : ' points');
}

export const LANGS = [
  { code: 'et', tag: 'EE', label: 'Eesti' },
  { code: 'en', tag: 'GB', label: 'English' },
  { code: 'ru', tag: 'RU', label: 'Русский' }
];
