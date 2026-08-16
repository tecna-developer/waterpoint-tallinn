# WaterPoint Tallinn — контекст проекта (handoff)

Саммери для продолжения работы в другой сессии.

## Что это
PWA-прототип для поиска общественных питьевых кранов в Таллине. Сделан по макетам
Stitch («WaterPoint Tallinn», светлая тема) и ТЗ v1.0 от 15.07.2026
(документ `TZ_WaterPoint_Tallinn (1).docx`).

## Ссылки
- **Репозиторий:** https://github.com/tecna-developer/waterpoint-tallinn (ветка `main`, git-пользователь `tecna-developer`)
- **Живое демо:** https://tecna-developer.github.io/waterpoint-tallinn/
- **Локальный путь:** `C:\Users\AnnaTolstoukhova\Desktop\Projects\WPT`

## Стек
Vite + ванильный JS (без фреймворка) + Leaflet (карта, тайлы CARTO/OSM).
Деплой на GitHub Pages автоматически при пуше в `main` через `.github/workflows/deploy.yml`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # сборка в dist/
```

## Структура (`src/`)
- `main.js` — вся логика и рендер вью (карта, список, карточка, избранное, настройки, форма отчёта)
- `data.js` — синхронизация с ArcGIS, кеш, localStorage, статусы, тема
- `data/waterpoints.json` — снапшот 78 точек
- `i18n.js` — строки ET/EN/RU
- `icons.js` — SVG-иконки и `markerSvg()` (маркер-капля со статусным глифом)
- `styles.css` — стили, светлая/тёмная темы

## Источник данных
Tallinn GIS ArcGIS REST, слой `veebikaart/Veev6tukohad` («Avalikud veevõtukohad»),
78 точек. Районы (linnaosa) вычислены point-in-polygon по слою `Linnaosad_asumid`.
Фото в источнике нет — нейтральные заглушки.

## Реализовано (MVP)
FR-01…FR-10 и FR-12 из ТЗ: live-синхронизация с fallback, геолокация, поиск
(районы/адреса + геокодинг Nominatim), карта+список с общим набором результатов,
карточка с атрибутами и маршрутом, фильтры, избранное+офлайн (service worker +
localStorage), форма отчёта (5 категорий, honeypot+rate-limit, подтверждение с
SLA 2 дня), локализация ET/EN/RU, приватная аналитика в localStorage.

**FR-11 (админ-панель)** — не сделано, нужен backend (Supabase/PostGIS).

Статусы точек по §5 ТЗ: `available`, `seasonal_closed`, `reported_issue`,
`temporarily_unavailable`, `unknown`.

## Ключевые правки последней сессии
- Маршрут: deep link в **Apple Maps на iOS/iPadOS**, иначе Google Maps (`routeUrl()` в `main.js`)
- Центрирование галочки в маркере-капле (`icons.js`, `markerSvg`)
- Фикс обрезки карточек настроек на коротком вьюпорте — `.view:not(.no-scroll) > * { flex-shrink: 0 }` в `styles.css`
- PWA-иконки PNG 192/512 + apple-touch-icon
- OG/Twitter мета-теги + баннер `public/og.png` (1200×630, `summary_large_image`)

## Незакрытые задачи
1. **Описание репозитория на GitHub** — задать вручную через ⚙ About на странице репо
   (или `gh auth login` + `gh repo edit`). Предлагаемый текст:
   `Поиск общественных питьевых кранов в Таллине: карта и список точек, маршрут, фильтры. Интерфейс ET/EN/RU.`
   Website: `https://tecna-developer.github.io/waterpoint-tallinn/`
2. **За пределами клиентского MVP** (V1.1/V2 по ТЗ): backend-синхронизация и
   админ-модерация (Supabase/PostGIS), офлайн-тайлы карты, уведомления об избранном,
   рейтинг достоверности, другие города.

## Замечания по окружению
- ОС Windows, оболочка PowerShell; git выдаёт предупреждения LF→CRLF (не критично).
- `gh` CLI **не авторизован** — операции через GitHub API недоступны, только git push/pull.
- Демо кешируется service worker'ом: после деплоя на телефоне нужен полный перезапуск PWA.
