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

  // FR-16: фильтр по типу точки. Подписи не смешивают категории (§7.2).
  cat_all: { et: 'Kõik', en: 'All', ru: 'Все' },
  cat_water_tap: { et: 'Vesi', en: 'Water', ru: 'Вода' },
  cat_public_toilet: { et: 'Tualetid', en: 'Toilets', ru: 'Туалеты' },
  filters_category: { et: 'Punkti tüüp', en: 'Point type', ru: 'Тип точки' },

  chip_all: { et: 'Kõik', en: 'All', ru: 'Все' },
  chip_available: { et: 'Praegu avatud', en: 'Available now', ru: 'Доступно сейчас' },
  chip_animals: { et: 'Loomadele', en: 'Dog friendly', ru: 'Для животных' },
  chip_favorites: { et: 'Lemmikud', en: 'Favorites', ru: 'Избранное' },

  filters_title: { et: 'Filtrid', en: 'Filters', ru: 'Фильтры' },
  filters_radius: { et: 'Raadius', en: 'Radius', ru: 'Радиус' },
  filters_radius_any: { et: 'Kõik kaugused', en: 'Any distance', ru: 'Любое расстояние' },
  filters_type: { et: 'Tüüp', en: 'Type', ru: 'Тип' },
  filters_type_outdoor: { et: 'Väli', en: 'Outdoor', ru: 'Уличный' },
  filters_type_indoor: { et: 'Sise', en: 'Indoor', ru: 'Крытый' },
  filters_show: { et: 'Näita', en: 'Show', ru: 'Показывать' },
  filters_reset: { et: 'Lähtesta', en: 'Reset', ru: 'Сбросить' },
  filters_apply: { et: 'Näita {n}', en: 'Show {n}', ru: 'Показать {n}' },
  results_count: { et: '{n} kohta', en: '{n} points', ru: 'Точек: {n}' },
  // Подпись кластера для скринридера. На экране у кружка только число, и озвучивалось
  // оно голым: «2», «27» — 26 таких кнопок подряд на общем виде карты, без единого
  // указания, что это и что будет по нажатию. Формулировка «Точек: {n}» выбрана
  // намеренно вместо «{n} точек»: она не требует склонения по числу ни в одном из
  // трёх языков (тот же приём, что в results_count выше).
  cluster_water: { et: 'Veekohti: {n}. Vajuta lähemale suumimiseks', en: 'Water points: {n}. Activate to zoom in', ru: 'Точек воды: {n}. Нажмите, чтобы приблизить' },
  cluster_toilet: { et: 'Tualette: {n}. Vajuta lähemale suumimiseks', en: 'Toilets: {n}. Activate to zoom in', ru: 'Туалетов: {n}. Нажмите, чтобы приблизить' },
  cluster_mixed: { et: 'Kohti: {n}. Vajuta lähemale suumimiseks', en: 'Points: {n}. Activate to zoom in', ru: 'Точек: {n}. Нажмите, чтобы приблизить' },

  status_available: { et: 'Tööolek on kinnitatud', en: 'Operating status confirmed', ru: 'Работоспособность подтверждена' },
  status_available_short: { et: 'Kinnitatud', en: 'Confirmed', ru: 'Подтверждено' },
  status_seasonal_closed: { et: 'Hooajaväliselt suletud', en: 'Closed for season', ru: 'Сезонно закрыта' },
  status_reported_issue: { et: 'Võimalik probleem märgitud', en: 'Possible issue marked', ru: 'Отмечена возможная проблема' },
  status_temporarily_unavailable: { et: 'Ajutiselt suletud', en: 'Temporarily unavailable', ru: 'Временно недоступна' },
  status_unknown: { et: 'Tööolek pole kinnitatud', en: 'Operating status not confirmed', ru: 'Статус работы не подтверждён' },
  status_note_reported: { et: 'Märkisid selles seadmes võimaliku probleemi. Märget ei ole moderaatorile saadetud.', en: 'You marked a possible issue on this device. It was not sent to a moderator.', ru: 'Вы отметили возможную проблему на этом устройстве. Отметка не отправлена модератору.' },

  detail_description: { et: 'Kirjeldus', en: 'Description', ru: 'Описание' },
  detail_no_description: { et: 'Kirjeldus puudub. Ametlik allikas: avalik veevõtukoht.', en: 'No description yet. Official source: public water point.', ru: 'Описания пока нет. Официальный источник: общественная точка воды.' },
  // description у туалетов тоже всегда null (нет данных в источнике) — заглушка
  // не может называть их «точкой воды», как это было общей строкой для обеих категорий
  detail_no_description_toilet: { et: 'Kirjeldus puudub. Ametlik allikas: avalik tualett.', en: 'No description yet. Official source: public toilet.', ru: 'Описания пока нет. Официальный источник: общественный туалет.' },
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
  detail_verified: { et: 'Andmed uuendatud', en: 'Data updated', ru: 'Данные обновлены' },
  detail_source_code: { et: 'Kood', en: 'Code', ru: 'Код' },
  detail_type: { et: 'Tüüp', en: 'Type', ru: 'Тип' },
  walk_min: { et: '{n} min', en: '{n} min', ru: '{n} мин' },
  // fmtDist() в data.js: расстояние на каждой карточке показывало «м»/«км» независимо
  // от языка интерфейса — на EN/ET экранах это выглядело как забытая отладочная строка.
  dist_m: { et: '{n} m', en: '{n} m', ru: '{n} м' },
  dist_km: { et: '{n} km', en: '{n} km', ru: '{n} км' },

  // §6.2: источник и дата проверки обязательны для каждой точки
  detail_source: { et: 'Andmeallikas', en: 'Data source', ru: 'Источник данных' },
  detail_source_water: { et: 'Tallinna GIS — avalikud veevõtukohad', en: 'Tallinn GIS — public water taps', ru: 'Tallinn GIS — общественные краны' },
  detail_source_toilet: { et: 'Tallinna GIS — avalikud tualetid', en: 'Tallinn GIS — public toilets', ru: 'Tallinn GIS — общественные туалеты' },
  detail_source_open: { et: 'Ava allikas', en: 'Open source', ru: 'Открыть источник' },

  // FR-15: карточка туалета
  toilet_unnamed: { et: 'Avalik tualett', en: 'Public toilet', ru: 'Общественный туалет' },
  toilet_kind: { et: 'Tüüp', en: 'Type', ru: 'Тип' },
  toilet_kind_stationary: { et: 'Statsionaarne', en: 'Permanent', ru: 'Стационарный' },
  toilet_kind_temporary: { et: 'Ajutine', en: 'Temporary', ru: 'Временный' },
  toilet_until: { et: 'kuni {date}', en: 'until {date}', ru: 'до {date}' },
  // без завершающей точки: русская дата уже оканчивается на «г.»
  toilet_temporary_note: { et: 'Ajutine tualett — linn eemaldab selle {date}.', en: 'Temporary toilet — the city removes it on {date}.', ru: 'Временный туалет — город демонтирует его {date}' },
  toilet_hours: { et: 'Lahtiolekuajad', en: 'Opening hours', ru: 'Часы работы' },
  toilet_fee: { et: 'Tasu', en: 'Fee', ru: 'Платность' },
  toilet_free: { et: 'Tasuta', en: 'Free', ru: 'Бесплатно' },
  toilet_paid: { et: 'Tasuline', en: 'Paid', ru: 'Платно' },
  toilet_accessibility: { et: 'Ligipääsetavus', en: 'Accessibility', ru: 'Доступность' },
  // §7.2, дословная микрокопия ТЗ
  no_data: { et: 'Kinnitatud andmed puuduvad. Kontrolli kohapeal.', en: 'No confirmed data. Please check on site.', ru: 'Нет подтверждённых данных. Проверьте на месте.' },
  no_data_short: { et: 'Andmed puuduvad', en: 'No data', ru: 'Нет данных' },

  // FR-13
  share_point: { et: 'Jaga kohta', en: 'Share point', ru: 'Поделиться точкой' },
  share_copied: { et: 'Link on kopeeritud', en: 'Link copied', ru: 'Ссылка скопирована' },

  saved_title: { et: 'Lemmikud', en: 'Saved', ru: 'Избранное' },
  // отдельный accessible-name для кнопки-переключателя (не «Избранное» как раздел —
  // это действие; состояние on/off сообщает aria-pressed, см. wireCards в main.js)
  fav_toggle: { et: 'Lemmikutesse', en: 'Add to favorites', ru: 'В избранное' },
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
  // было только про краны и только один слой GIS — молчало про туалеты и их источник,
  // хотя это ровно половина из 174 точек в приложении (см. критику: метаданные и
  // дисклеймеры не должны утверждать меньше, чем реально показывает продукт)
  settings_about_text: { et: 'WaterPoint Tallinn on sõltumatu rakendus avalike joogiveekohtade ja avalike tualettide leidmiseks. Andmete allikas: Tallinna GIS (kihid „Avalikud veevõtukohad“ ja „Avalikud tualetid“). Rakendus ei ole Tallinna Vesi ametlik toode.', en: 'WaterPoint Tallinn is an independent app for finding public drinking water points and public toilets. Data source: Tallinn GIS (layers “Avalikud veevõtukohad” and “Avalikud tualetid”). The app is not an official Tallinna Vesi product.', ru: 'WaterPoint Tallinn — независимое приложение для поиска общественных точек питьевой воды и общественных туалетов. Источник данных: Tallinn GIS (слои «Avalikud veevõtukohad» и «Avalikud tualetid»). Приложение не является официальным продуктом Tallinna Vesi.' },
  settings_privacy: { et: 'Privaatsus', en: 'Privacy', ru: 'Конфиденциальность' },
  // Текст утверждал «ничего не отправляем на сервер» безусловно — неверно: поиск
  // адреса, не найденного среди точек/районов приложения, безусловно шлёт введённый
  // текст на nominatim.openstreetmap.org (см. buildSuggestions в main.js). GPS-координаты
  // туда не попадают (это утверждение верно), но сам факт стороннего запроса — должен
  // быть виден в тексте о приватности, а не только в комментарии к коду.
  settings_privacy_text: { et: 'Täpset asukohta ei salvestata ega saadeta serverisse. Lemmikud, vahemälu ja demo-märked hoitakse ainult seadmes. Aadressiotsing, mida rakenduse enda punktide ja linnaosade seast ei leitud, saadab sisestatud teksti OpenStreetMapi Nominatimi geokodeerimisteenusesse.', en: 'Precise location is never stored or sent to a server. Favorites, cache and demo markers live on the device only. Searching for an address not matched among the app’s own points and districts sends the typed text to OpenStreetMap’s Nominatim geocoding service.', ru: 'Точная геолокация не сохраняется и не отправляется на сервер. Избранное, кеш и демонстрационные отметки хранятся только на устройстве. Поиск адреса, не найденного среди точек и районов приложения, отправляет введённый текст в сервис геокодирования OpenStreetMap (Nominatim).' },
  settings_demo_reports: { et: 'Demo-märked', en: 'Demo problem markers', ru: 'Демонстрационные отметки' },
  settings_demo_reports_count: { et: 'Seadmesse salvestatud: {n}', en: 'Saved on this device: {n}', ru: 'Сохранено на устройстве: {n}' },
  settings_demo_reports_empty: { et: 'Salvestatud märked puuduvad', en: 'No saved markers', ru: 'Сохранённых отметок нет' },
  settings_demo_reports_clear: { et: 'Kustuta', en: 'Delete', ru: 'Удалить' },
  settings_demo_reports_cleared: { et: 'Demo-märked on kustutatud', en: 'Demo markers deleted', ru: 'Демонстрационные отметки удалены' },

  report_title: { et: 'Märgi võimalik probleem', en: 'Mark a possible issue', ru: 'Отметить возможную проблему' },
  report_demo_notice: { et: 'Demo-režiim: märge salvestatakse ainult sellesse seadmesse ja seda ei saadeta kellelegi.', en: 'Demo mode: this marker is saved only on this device and is not sent anywhere.', ru: 'Демо-режим: отметка сохранится только на этом устройстве и никуда не отправится.' },
  report_cat_not_working: { et: 'Ei tööta', en: 'Not working', ru: 'Не работает' },
  report_cat_damage: { et: 'Kahjustus / reostus', en: 'Damage / contamination', ru: 'Повреждение / загрязнение' },
  report_cat_no_access: { et: 'Ligipääs puudub', en: 'No access', ru: 'Нет доступа' },
  report_cat_wrong_point: { et: 'Vale asukoht', en: 'Wrong location', ru: 'Неверная точка' },
  report_cat_other: { et: 'Muu', en: 'Other', ru: 'Другое' },
  // FR-17 / §6.3: у туалетов свой набор проблем
  report_cat_wc_closed: { et: 'Suletud', en: 'Closed', ru: 'Закрыто' },
  report_cat_wc_dirty: { et: 'Määrdunud / kahjustatud', en: 'Dirty / damaged', ru: 'Грязно / повреждено' },
  report_cat_wc_hours: { et: 'Valed lahtiolekuajad', en: 'Wrong opening hours', ru: 'Неверные часы работы' },
  report_cat_wc_location: { et: 'Vale asukoht', en: 'Wrong location', ru: 'Неверная локация' },
  report_cat_wc_gone: { et: 'Seda enam ei ole', en: 'No longer exists', ru: 'Больше не существует' },
  report_comment: { et: 'Kommentaar', en: 'Comment', ru: 'Комментарий' },
  report_comment_ph: { et: 'Kirjelda probleemi…', en: 'Describe the problem…', ru: 'Опишите проблему…' },
  report_submit: { et: 'Salvesta märge', en: 'Save marker', ru: 'Сохранить отметку' },
  report_cancel: { et: 'Loobu', en: 'Cancel', ru: 'Отмена' },
  report_sent_title: { et: 'Salvestatud', en: 'Saved', ru: 'Сохранено' },
  report_sent_text: { et: 'Märge salvestati sellesse seadmesse. Seda ei saadetud moderaatorile ega serverisse.', en: 'The marker was saved on this device. It was not sent to a moderator or server.', ru: 'Отметка сохранена на этом устройстве. Она не отправлена модератору или на сервер.' },
  report_need_category: { et: 'Vali kategooria', en: 'Choose a category', ru: 'Выберите категорию' },
  report_rate_limited: { et: 'Liiga palju märkmeid järjest. Proovi hiljem.', en: 'Too many markers in a row. Try again later.', ru: 'Слишком много отметок подряд. Попробуйте позже.' },
  // отказ записи в localStorage: «попробуйте позже» тут не поможет, нужна другая подсказка
  report_storage_failed: { et: 'Märget ei õnnestunud seadmesse salvestada — seadme mälu on täis või privaatrežiim blokeerib salvestamise.', en: 'Could not save the marker on this device — storage is full or private mode blocks saving.', ru: 'Не удалось сохранить отметку на устройстве — закончилось место или приватный режим блокирует сохранение.' },

  geo_denied: { et: 'Asukoht on keelatud — kaugused arvutatakse otsingu järgi.', en: 'Location denied — distances follow your search.', ru: 'Геолокация отключена — расстояния считаются от точки поиска.' },
  geo_denied_action: { et: 'Otsi käsitsi', en: 'Search manually', ru: 'Искать вручную' },
  offline_banner: { et: 'Võrguühendus puudub. Andmed: {date}', en: 'You are offline. Data from {date}', ru: 'Нет сети. Данные от {date}' },
  // Подложка карты — единственное, что всегда идёт из сети: точки лежат в кеше и
  // работают офлайн, а тайлы нет. Без этой подписи пользователь видит пустое серое
  // поле и не понимает, сломалось приложение или пропала связь.
  tiles_failed: { et: 'Kaardi taust ei laadinud — see vajab võrku. Punktide nimekiri ja kaardid töötavad ka võrguühenduseta.', en: 'The map background did not load — it needs a network. The point list and cards still work offline.', ru: 'Фон карты не загрузился — для него нужна сеть. Список точек и карточки работают и без неё.' },
  stale_banner: { et: 'Andmed: {date}', en: 'Data from {date}', ru: 'Данные от {date}' },
  // Установленное PWA иначе молча остаётся на старой оболочке до полного перезапуска —
  // причём дважды, потому что первый запуск после деплоя ещё работает на прежнем воркере.
  update_available: { et: 'Saadaval on uus versioon.', en: 'A new version is available.', ru: 'Доступна новая версия.' },
  update_action: { et: 'Uuenda', en: 'Update', ru: 'Обновить' },
  empty_title: { et: 'Midagi ei leitud', en: 'Nothing found', ru: 'Ничего не найдено' },
  empty_text: { et: 'Proovi filtreid lõdvendada või lähtestada.', en: 'Try relaxing or resetting the filters.', ru: 'Попробуйте ослабить или сбросить фильтры.' },
  error_title: { et: 'Midagi läks valesti', en: 'Something went wrong', ru: 'Что-то пошло не так' },
  error_retry: { et: 'Proovi uuesti', en: 'Retry', ru: 'Повторить' },
  loading: { et: 'Laadimine…', en: 'Loading…', ru: 'Загрузка…' },
  back: { et: 'Tagasi', en: 'Back', ru: 'Назад' },
  close: { et: 'Sulge', en: 'Close', ru: 'Закрыть' },
  locate_me: { et: 'Minu asukoht', en: 'My location', ru: 'Моё местоположение' },
  // Запрос координат длится до 8 секунд, и всё это время кнопка молчала — отсюда
  // повторные нажатия, которые iOS понимал как «увеличить страницу».
  locate_busy: { et: 'Otsin asukohta…', en: 'Finding your location…', ru: 'Определяем местоположение…' },
  distance_from_search: { et: 'otsingust', en: 'from search', ru: 'от точки поиска' },

  // ---- онбординг (FR-01, §7.1): объяснение до системного запроса ----
  onb_title: { et: 'Vesi ja tualett läheduses', en: 'Water and toilets nearby', ru: 'Вода и туалеты рядом' },
  onb_text: { et: 'Leia Tallinna avalikud joogiveekraanid ja avalikud tualetid, vaata staatust ja lase end kohale juhatada.', en: 'Find public drinking water taps and public toilets in Tallinn, check their status and get directions.', ru: 'Найдите общественные питьевые краны и общественные туалеты Таллина, проверьте статус и постройте маршрут.' },
  onb_lang: { et: 'Keel', en: 'Language', ru: 'Язык' },
  // §7.2, дословная микрокопия ТЗ
  onb_geo: { et: 'Luba juurdepääs asukohale, et leiaksime lähima kraani. Me ei salvesta sinu asukohta ilma vajaduseta.', en: 'Allow location access so we can find the nearest tap. We do not store your location unless needed.', ru: 'Разрешите доступ к местоположению, чтобы мы нашли ближайший кран. Мы не сохраняем вашу геолокацию без необходимости.' },
  onb_allow: { et: 'Luba asukoht', en: 'Allow location', ru: 'Разрешить геолокацию' },
  onb_skip: { et: 'Jäta vahele', en: 'Skip', ru: 'Пропустить' },

  // ---- ручной выбор точки отсчёта (FR-01, надёжность §8) ----
  pick_hint: { et: 'Puuduta kaarti, et määrata lähtepunkt.', en: 'Tap the map to set your starting point.', ru: 'Нажмите на карту, чтобы задать точку отсчёта.' },
  pick_done: { et: 'Lähtepunkt on kaardil määratud', en: 'Starting point set on the map', ru: 'Точка отсчёта задана на карте' },
  pick_map_point: { et: 'Valitud koht kaardil', en: 'Chosen map point', ru: 'Выбранная точка на карте' },

  // ---- сезонность и экология (§7.2) ----
  season_warning: { et: 'Välikraanid töötavad tavaliselt soojal hooajal. Kontrolli staatust enne teele asumist.', en: 'Outdoor taps usually work in the warm season. Check the status before you set off.', ru: 'Наружные краны обычно работают в тёплый сезон. Проверьте статус перед маршрутом.' },
  eco_title: { et: 'Vähem plasti', en: 'Less plastic', ru: 'Меньше пластика' },
  eco_text: { et: 'Täida pudel uuesti — vähem plasti, rohkem puhast vett linnas.', en: 'Refill your bottle — less plastic, more clean water in the city.', ru: 'Наполните бутылку повторно — меньше пластика, больше чистой воды в городе.' },

  // ---- легенда карты (§7.1, §7.2) ----
  legend_title: { et: 'Legend', en: 'Legend', ru: 'Легенда' },
  legend_show: { et: 'Näita legendi', en: 'Show legend', ru: 'Показать легенду' },
  legend_layers: { et: 'Kihid', en: 'Layers', ru: 'Слои' },
  legend_statuses: { et: 'Staatused', en: 'Statuses', ru: 'Статусы' },
  legend_default_note: { et: 'Ilma märketa punkt: registris olemas, kuid reaalajas kinnitamata.', en: 'A marker with no flag: listed in the registry, not confirmed live.', ru: 'Точка без отметки: числится в реестре, но не подтверждена в реальном времени.' }
};

const FALLBACK = 'en';

// FR-11: язык подхватывается из настроек устройства, дальше решает ручной выбор.
function detectLang() {
  for (const tag of navigator.languages || [navigator.language || '']) {
    const code = String(tag).slice(0, 2).toLowerCase();
    if (code === 'et' || code === 'ru' || code === 'en') return code;
  }
  return FALLBACK;
}

// чтение localStorage тоже бросает в приватном режиме Safari — а это самый первый
// вызов при загрузке модуля, падение здесь означало бы полностью белый экран
let lang = (() => {
  try { return localStorage.getItem('wpt_lang') || detectLang(); }
  catch { return detectLang(); }
})();

export function getLang() { return lang; }

// BCP-47 тег для Intl/toLocaleString (даты, десятичный разделитель расстояний и т.д.) —
// единая точка, чтобы формат чисел и дат по всему приложению не расходился с языком UI.
export function localeTag() {
  return lang === 'et' ? 'et-EE' : lang === 'en' ? 'en-GB' : 'ru-RU';
}

export function setLang(l) {
  lang = l;
  // не сохранилось — язык всё равно переключается, просто не переживёт перезагрузку
  try { localStorage.setItem('wpt_lang', l); } catch { /* квота / приватный режим */ }
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
