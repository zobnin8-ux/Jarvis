# Jarvis — Personal Command Center

Личный HUD-дашборд в стиле mission control: погода, календарь, космос, AI-брифинг, радио с аудио-реактором в центре и голосовой консолью.  
Рассчитан на **вкладку браузера на компьютере** (Chrome / Edge), не на TV-киоск 24/7.

**Репозиторий:** [github.com/zobnin8-ux/Jarvis](https://github.com/zobnin8-ux/Jarvis)  
**Obsidian:** [docs/Jarvis Command Center.md](docs/Jarvis%20Command%20Center.md) — краткая заметка для vault  
**Стек:** Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion  
**Версия UI:** v0.10 — **narrow HUD** (пол-экрана / ноутбук), launcher, календарь+Tasks, голос, kiosk/PWA, weather rails, **Устарело**, 429 cooldown

---

## Содержание

1. [Скриншот схемы](#схема-интерфейса)
2. [Модули](#модули)
3. [Ночной режим](#ночной-режим)
4. [Быстрый старт](#быстрый-старт)
5. [Переменные окружения](#переменные-окружения)
6. [Где брать API-ключи](#где-брать-api-ключи)
7. [Graceful degradation](#graceful-degradation)
8. [Голосовая консоль](#голосовая-консоль)
9. [API-роуты](#api-роуты)
10. [Архитектура](#архитектура)
11. [Надёжность и отказоустойчивость](#надёжность-и-отказоустойчивость)
12. [Разработка](#разработка)
13. [Безопасность](#безопасность)
14. [Зарезервированные модули](#зарезервированные-модули)
15. [Известные ограничения](#известные-ограничения)
16. [Карта и геолокация](#карта-и-геолокация)
17. [Roadmap](#roadmap)

---

## Схема интерфейса

```
┌────────────────────────────────────────────────────────────────┐
│  Command Center              [Space·Briefing·News·ISS]  v0.10 │
├─────────────────┬────────────────────────────┬─────────────────┤
│    WEATHER      │      CLOCK + CORE          │  COMMS (Cal/Mail)│
│  (атмосфера)    │   HUD-кольца, эквалайзер   │  week / NEXT    │
│                 │   System Status            │  timeline       │
│    BRIEFING     │                            │                 │
│  (AI-сводка)    │                            │                 │
├─────────────────┴────────────────────────────┴─────────────────┤
│  ORBITAL OPERATIONS — Space (countdown / post-launch / NASA)   │
│                          │  World News (RSS, RU/EN, 10 с)       │
├────────────────────────────────────────────────────────────────┤
│  SV TICKER — tech-события + котировки (бегущая строка)         │
├────────────────────────────────────────────────────────────────┤
│  Ambient Audio · Audiobooks · MAP (OSM) · ISS · Voice Console ◯           │
└────────────────────────────────────────────────────────────────┘
```

### Narrow HUD (пол-экрана, ноутбук, окно < ~72% монитора)

Авто: `useNarrowHud` — ширина ≤1399px, высота ≤849px **или** окно уже ~72% ширины монитора (Snap пол-экрана на ultrawide).

```
┌─────────────────── max 900px, по центру ───────────────────┐
│  [Space] [Briefing] [News] [ISS]  → drawer справа          │
├─────────────┬──────────────────────┬───────────────────────┤
│  Weather    │  16:10 · день · дата │  Comms (calendar)     │
│  compact    │  greeting            │  week strip + 2 events│
│             │       CORE ◉         │                       │
├─────────────┴──────────────────────┴───────────────────────┤
│  Briefing teaser (1 строка → drawer)                        │
├────────────────────────────────────────────────────────────┤
│  Ambient Audio · Audiobooks · MAP · Voice Console                │
└────────────────────────────────────────────────────────────┘
```

| | |
|---|---|
| **Скрыто на HUD** | Space, полный Briefing, World News, ISS, SV ticker, Gmail-вкладка |
| **Drawer** | Space · Briefing · News · ISS — чипы в шапке |
| **Файлы** | `useNarrowHud.ts`, `HudDrawer.tsx`, `HudNavChips.tsx`, `BriefingTeaser.tsx`, `ClockCore.tsx`, `ClockMeta.tsx`, `WeatherModule compact`, `CommsModule compact` |
| **Core** | Только кольца по центру; время/дата/greeting **над** core (не поверх) |

**Центр экрана (wide)** — Core Reactor: кольца HUD + эквалайзер, реагирующий на **радио** (не на голосовой TTS).

---

---

## Модули

### Clock + Core Reactor

| | |
|---|---|
| **Файлы** | `ClockModule`, `ClockCore`, `ClockMeta`, `CentralHudRings`, `coreReactorEngine`, `useCoreResonanceVisuals`, `useClockNow.ts` |
| **Что делает** | Часы, дата, приветствие (`Good Morning, {name}`), System Status |
| **Core Reactor** | Свечение и «дыхание» от аудио-анализатора радио; idle-режим через 45 с без активности |
| **Обновление** | Часы — каждую секунду; статус фидов — из `ModuleHealthContext` |

### Weather (погода)

| | |
|---|---|
| **Источник** | OpenWeather (current + forecast + air pollution) |
| **Refresh** | 15 мин |
| **Без ключа** | Demo-погода (San Jose по умолчанию) |
| **UI** | Hero **3 колонки**: центр — температура + HUD-иконка; **слева** H/L/Feels + восход; **справа** влажность, ветер, осадки, AQI, закат + `WeatherRailIcon`. Без раскрывающейся телеметрии (hourly/daily убраны из панели) |
| **Файлы** | `WeatherModule.tsx`, `WeatherRailIcon.tsx`, `WeatherHudIcon.tsx`, `weatherMood.ts` |

Координаты: `WEATHER_LAT` / `WEATHER_LON`. Подпись города: `NEXT_PUBLIC_WEATHER_CITY`.

### AI Briefing

| | |
|---|---|
| **Источник** | Claude (`claude-sonnet-4-6`) + контекст: погода, календарь, космос |
| **Refresh** | 1 ч; серверный кэш — 3 ч (инвалидируется при смене `dayPart`) |
| **Диск-кэш** | `.data/briefing-cache.json` — переживает рестарт dev/start, экономит Claude |
| **Без `ANTHROPIC_API_KEY`** | Шаблонный demo-брифинг из тех же данных |
| **Расположение** | Левая колонка, под Weather |
| **Формат** | Русский plain text, **без markdown**; 1–3 предложения (ночью ≤ 2) |
| **Логика** | «Слой смысла» — не дублирует панели; срочность пуска только при `imminent` (< 2 ч или liftoff); советы «на выход/зонт» только утром/днём |
| **Файлы** | `briefingSources.ts`, `briefingCache.ts`, `briefingDiskCache.ts`, `briefingContext.ts`, `stripMarkdown.ts`, `daypart.ts` |

Часовой пояс брифинга: `BRIEFING_TZ` (напр. `America/Los_Angeles`) или offset из OpenWeather.

### World News (Orbital Operations)

| | |
|---|---|
| **Расположение** | Справа от Space, экраны **lg+** |
| **Источники** | BBC World, The Guardian, РИА, RBC (RSS) |
| **Refresh** | 10 мин (сервер); слайды — **10 с**, чередование RU/EN |
| **Ключи** | Не нужны |
| **UI** | Заголовок по центру блока, line-clamp 3, ссылка в новую вкладку |
| **Файлы** | `WorldNewsModule.tsx`, `worldNews.ts`, `/api/world-news` |

### Calendar + Mail (Comms)

Правая колонка — панель **Comms** с вкладками **CALENDAR** (по умолчанию) и **MAIL**.

| | |
|---|---|
| **Mail badge** | Unread в INBOX; скрыт при 0; `99+` cap |
| **Список** | До 7 unread; клик → Gmail thread |
| **Refresh** | 5 мин; ночью — кэш |
| **Без OAuth** | Demo inbox (2 письма) |
| **Файлы** | `CommsModule.tsx`, `comms/MailTab.tsx`, `/api/gmail`, `gmail.ts` |

**Gmail ≠ Calendar keys:** календарь — Service Account JSON; почта — **OAuth 2.0** (личный `@gmail.com`).

| Переменная | Описание |
|------------|----------|
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth Client ID (Web) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth secret |
| `GMAIL_REFRESH_TOKEN` | Refresh token после `node scripts/gmail-oauth.mjs` |

### Calendar

| | |
|---|---|
| **Источник** | Google Calendar (Service Account) |
| **Refresh** | 5 мин |
| **Без ключей** | Demo-события с Meet-ссылкой |
| **UI** | Week strip, блок NEXT (отсчёт «in N min», join URL, location), timeline сегодня, expandable «This Week» |

### Space (Orbital Operations)

| | |
|---|---|
| **Источник** | [The Space Devs](https://thespacedevs.com/) |
| **Refresh** | Клиент 30 мин; серверный кэш **15 мин** |
| **Singleflight** | `/api/briefing` и `/api/space` делят **один** in-flight запрос к Spacedevs при холодном кэше |
| **Фазы** | `countdown` → `liftoff` (~30 мин) → `postlaunch` (12 ч) → следующий манифест |
| **Post-launch** | Mission Report: outcome, orbit, booster, payload, новость (SpaceX/NASA) |
| **NASA** | Последний breaking news из RSS NASA |

### ISS Telemetry (футер)

| | |
|---|---|
| **Расположение** | Центр футера между Ambient Audio / Audiobooks и Voice Console (экраны **md+**) |
| **Источник** | [Where The ISS At](https://wheretheiss.at/) — позиция, скорость, SUNLIT/ECLIPSE |
| **Геокодинг** | Open-Meteo reverse geocoding → «город, регион, страна» |
| **Орбита** | TLE Celestrak + `satellite.js` — номер витка за сутки, % текущего витка |
| **Refresh** | Клиент 15 с; сервер `cache: no-store` |
| **Ключи** | Не нужны |
| **UI** | LIVE POSITION · NORAD 25544 · место над Землёй · шкала скорости · сетка Alt/Speed/Lat/Lon |

Без карты и ground track — только компактная телеметрическая карточка.

### Silicon Valley Ticker

| | |
|---|---|
| **Источник** | Demo tech-события; котировки — Finnhub (опционально) |
| **Refresh** | 5 мин |
| **Без `FINNHUB_API_KEY`** | Demo-цены AAPL, NVDA, GOOGL, META |
| **UI** | Бегущая строка над футером |

### Ambient Audio (радио)

| | |
|---|---|
| **Станции** | SomaFM: Groove Salad, Drone Zone, Deep Space One; Radio Paradise Mellow |
| **Метаданные** | `/api/radio/metadata` — track / artist; **обложка** — только Radio Paradise |
| **UI** | RP: миниатюра 40×40 + `Artist — Title`; Audiobooks: обложка 40×40 в мини-плеере |
| **Связь с ядром** | `<audio>` + Web Audio AnalyserNode → Core Reactor |

### Audiobooks (YouTube)

| | |
|---|---|
| **Канал** | «Голос Коваленко — аудиокниги», `UCY-ekT04DX2bQhzYvm2y5Lw` |
| **Расположение** | Футер, **справа** от Ambient Audio (одинаковая высота блоков) |
| **Плеер** | YouTube IFrame API, скрытый контейнер; звук **не** в реактор |
| **Библиотека** | Оверлей по кнопке «Библиотека» (~828×736 px), **перетаскивается** за шапку |
| **Resume** | `localStorage` `jarvis-audiobook-progress` |
| **Радио** | Не затрагивается |
| **Env** | `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID` |
| **UI** | Обложка 40×40 в мини-плеере (как RP); resume — thumbnail из `localStorage` |
| **Файлы** | `AudiobookPlayer.tsx`, `AudiobooksContext.tsx`, `/api/audiobooks` |

### Voice Console (голос)

| | |
|---|---|
| **Ввод** | Web Speech API, **toggle** (клик или пробел), `ru-RU` |
| **Мозг** | `/api/ask` → Claude + контекст: погода, календарь, космос, **Briefing**, **World News**, **почта**, **ISS** |
| **Озвучка** | `/api/tts` → ElevenLabs (клон) → **отдельный** `new Audio()` |
| **Фолбэк** | Только если ElevenLabs недоступен — `SpeechSynthesis` (системный голос) |
| **Управление** | Кнопка ◯ справа в футере: **пробел — начать · пробел — отправить** |
| **Браузер** | Chrome / Edge; Firefox — кнопка скрыта (`supported: false`) |
| **Env** | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` — после смены голоса **перезапустите** `npm run dev` |

**Важно:** TTS **не** подключён к радио и **не** идёт в AnalyserNode / Core Reactor. Радио и голос — независимые аудио-каналы.

**Короткие команды (1–2 предложения):** «какая погода», «что в мире?», «есть что срочное?», «включи радио» (радио включается на клиенте).

**Защита от двойной озвучки:**
- Запрос к Claude/TTS отправляется **один раз** за сессию (по toggle off / второму нажатию пробела).
- Повторный `speak()` отменяет предыдущий (`generationRef`).
- Перед ElevenLabs всегда вызывается `speechSynthesis.cancel()` — клон и системный голос **не смешиваются**.

---

## Быстрый старт

### Требования

- Node.js 20+
- npm
- Браузер Chrome или Edge (для голоса)

### Установка

```bash
git clone https://github.com/zobnin8-ux/Jarvis.git
cd Jarvis
npm install
cp .env.example .env.local
```

Заполните `.env.local` (см. [переменные](#переменные-окружения) и [где брать ключи](#где-брать-api-ключи)).

### Google Calendar (если нужен живой календарь)

1. Создайте Service Account в [Google Cloud Console](https://console.cloud.google.com/).
2. Включите **Google Calendar API**.
3. Скачайте JSON-ключ → положите в корень проекта, напр. `jarvis-command-center-XXXXX.json`.
4. Укажите путь в `GOOGLE_SERVICE_ACCOUNT_JSON_PATH`.
5. **Расшарьте календарь** на email сервисного аккаунта (права «See all event details»).
6. `GOOGLE_CALENDAR_ID` — email календаря (часто ваш Gmail).

### Запуск

**Ежедневно (без терминала):**

1. Один раз: `npm run build` → `npm run launcher:build` → `npm run launcher:shortcut`
2. Двойной клик **`D:\Jarvis\Jarvis.lnk`** (или `launcher\Jarvis.exe`) → откроется браузер по умолчанию
3. **F11** — полный экран

После `git pull` с изменениями кода: снова `npm run build`, затем ярлык.

**Разработка:**

```bash
npm run dev          # hot reload
npm run dev:clean    # kill :3001, удалить .next, dev (лечит 500)
npm run kiosk        # build + start — тихий режим для постоянной вкладки
```

```bash
npm run build
npm start            # production вручную (если без launcher)
```

Откройте [http://localhost:3001](http://localhost:3001).

> После изменения `.env.local` **перезапустите** сервер (`npm run dev` или ярлык после `build`).

---

## Переменные окружения

Скопируйте `.env.example` → `.env.local`. **Никогда не коммитьте `.env.local`.**

### Клиентские (`NEXT_PUBLIC_*`)

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `NEXT_PUBLIC_USER_NAME` | нет | Имя в приветствии и брифинге (default: `Andrei`) |
| `NEXT_PUBLIC_WEATHER_CITY` | нет | Подпись города на панели погоды (default: `San Jose`) |

### Серверные — погода

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `OPENWEATHER_API_KEY` | нет* | Ключ [OpenWeather](https://openweathermap.org/api) |
| `WEATHER_LAT` | нет | Широта (default: `37.338207`) |
| `WEATHER_LON` | нет | Долгота (default: `-121.886330`) |

\* Без ключа — demo-погода.

### Серверные — календарь

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `GOOGLE_CALENDAR_ID` | нет* | ID календаря |
| `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` | нет* | Путь к JSON service account в корне проекта |

Альтернатива JSON-файлу: `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`.

### Серверные — AI

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `ANTHROPIC_API_KEY` | нет* | Claude — брифинг + голосовые ответы |
| `ANTHROPIC_MODEL` | нет | Default: `claude-sonnet-4-6` |
| `BRIEFING_TZ` | нет | IANA timezone для `dayPart` (напр. `America/Los_Angeles`) |

### Серверные — голос (ElevenLabs)

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `ELEVENLABS_API_KEY` | нет* | API-ключ ElevenLabs |
| `ELEVENLABS_VOICE_ID` | нет* | Voice ID **вашего клонированного** голоса |

\* Без ключей — текст ответа + системный голос браузера.

### Серверные — SV ticker (опционально)

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `FINNHUB_API_KEY` | нет | [Finnhub](https://finnhub.io) — живые котировки; без ключа — demo |

### Серверные — Gmail (OAuth)

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `GOOGLE_OAUTH_CLIENT_ID` | нет* | OAuth Client ID (Web application) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | нет* | OAuth secret |
| `GMAIL_REFRESH_TOKEN` | нет* | Refresh token после `node scripts/gmail-oauth.mjs` |

\* Без OAuth — demo inbox (2 письма). **Не путать** с Service Account календаря.

### Серверные — Audiobooks (YouTube)

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `YOUTUBE_API_KEY` | нет* | YouTube Data API v3 |
| `YOUTUBE_CHANNEL_ID` | нет | Default: `UCY-ekT04DX2bQhzYvm2y5Lw` (Голос Коваленко) |

\* Без ключа — demo-полка без живого воспроизведения.

### Клиентские — ночной режим (расписание)

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `NEXT_PUBLIC_NIGHT_START_HOUR` | нет | Начало ночи (0–23), default **23** |
| `NEXT_PUBLIC_NIGHT_END_HOUR` | нет | Конец ночи (0–23), default **7** |
| `NEXT_PUBLIC_NIGHT_TZ` | нет | IANA TZ для авто-режима; иначе — часовой пояс браузера |

### Пример `.env.local`

```env
OPENWEATHER_API_KEY=...
WEATHER_LAT=37.338207
WEATHER_LON=-121.886330
NEXT_PUBLIC_WEATHER_CITY=San Jose

GOOGLE_CALENDAR_ID=you@gmail.com
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=jarvis-command-center-XXXXX.json

NEXT_PUBLIC_USER_NAME=Andrei

ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=...

YOUTUBE_API_KEY=...
YOUTUBE_CHANNEL_ID=UCY-ekT04DX2bQhzYvm2y5Lw

GOOGLE_OAUTH_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...

# NEXT_PUBLIC_NIGHT_START_HOUR=23
# NEXT_PUBLIC_NIGHT_END_HOUR=7
# NEXT_PUBLIC_NIGHT_TZ=America/Los_Angeles

FINNHUB_API_KEY=...
```

---

## Где брать API-ключи

### OpenWeather
1. [openweathermap.org](https://openweathermap.org/) → Sign up → API keys.
2. План Free достаточен для current + forecast + air pollution.

### Anthropic (Claude)
1. [platform.claude.com](https://platform.claude.com/) → API Keys.
2. Один ключ на брифинг (`/api/briefing`) и голос (`/api/ask`).

### ElevenLabs (клонированный голос)
1. [elevenlabs.io](https://elevenlabs.io) → войти в аккаунт с подпиской.
2. **API Key:** Profile → API Keys → Create.
3. **Voice ID:** Voices → ваш клон → Settings → скопировать Voice ID.

После смены `ELEVENLABS_VOICE_ID` в `.env.local` перезапустите dev-сервер.

### YouTube (Audiobooks)
1. [console.cloud.google.com](https://console.cloud.google.com/) → Enable **YouTube Data API v3**.
2. Credentials → Create API key → `YOUTUBE_API_KEY`.
3. Канал по умолчанию уже в `.env.example`; свой — укажите `YOUTUBE_CHANNEL_ID`.

### Finnhub (акции в SV-тикере)
1. [finnhub.io](https://finnhub.io) → Get free API key.
2. Free tier: котировки с задержкой, лимит запросов — для личного дашборда достаточно.

### Google Calendar
1. [console.cloud.google.com](https://console.cloud.google.com/) → новый проект.
2. APIs & Services → Enable **Google Calendar API**.
3. Credentials → Service Account → Create key (JSON).
4. Расшарить календарь на `client_email` из JSON.

### Gmail (личный inbox)
1. Тот же или отдельный проект в Google Cloud.
2. Enable **Gmail API** в APIs & Services.
3. Credentials → **OAuth client ID** → Web application → redirect `http://localhost:3333/oauth2callback`.
4. `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` в `.env.local`.
5. `node scripts/gmail-oauth.mjs` → скопировать `GMAIL_REFRESH_TOKEN`.
6. Перезапустить `npm run dev`.

Календарь и почта — **разные** типы доступа (Service Account vs OAuth).

---

## Graceful degradation

Все внешние интеграции следуют единому контракту:

```typescript
// Успех
{ ok: true, data: T }

// Ключ задан, сервис недоступен (401 / 402 / 429 / 5xx / сеть)
{ ok: false, reason: "unavailable", service: "openweather" | "google-calendar" | ... }
```

| Ситуация | Поведение |
|----------|-----------|
| Ключ **не задан** | Тихий demo-режим |
| Ключ **задан**, API упал | HUD-плашка **«Погода временно недоступна»** (и т.д.), дашборд не падает |
| Сеть оборвалась mid-session | `useIntervalFetch` сохраняет последние данные + метка Stale |

Сообщения на **русском** (`ServiceUnavailablePanel`).

---

## Голосовая консоль

### Поток

```
[Toggle / пробел] → SpeechRecognition (ru-RU)
       ↓ (второй toggle / пробел)
   /api/ask (Claude + briefing / ISS / погода / календарь / космос)
       ↓
   Текст на экране + /api/tts (ElevenLabs mp3)
       ↓
   Отдельный Audio() — НЕ радио, НЕ AnalyserNode
```

### Проверка TTS вручную (PowerShell)

```powershell
$headers = @{
  "xi-api-key" = "ВАШ_ELEVENLABS_KEY"
  "Content-Type" = "application/json"
  "Accept" = "audio/mpeg"
}
$body = '{"text":"Привет, Jarvis на связи.","model_id":"eleven_multilingual_v2"}'
Invoke-WebRequest `
  -Uri "https://api.elevenlabs.io/v1/text-to-speech/ВАШ_VOICE_ID" `
  -Method POST -Headers $headers -Body $body `
  -OutFile test.mp3
```

### Состояния UI

| Состояние | Экран |
|-----------|-------|
| idle | «Готов» |
| listening | «Слушаю…» |
| thinking | «Думаю…» |
| speaking | «Говорю…» |

### Логика «один голос за раз»

```
onFinal (один раз) → /api/ask → speak(text)
                              ↓
                    ElevenLabs mp3 → Audio.play()
                              ↓ (только при ошибке API)
                    SpeechSynthesis (fallback)
```

Если слышите **два голоса** — обновите код до последней версии и перезапустите dev. Старые сборки могли вызывать `speak()` дважды из-за повторного срабатывания `transcript` после `onend`.

---

## Ночной режим

Тумблер **«Режим»** в шапке — «глубокая» экономия: **нулевой фоновый API**, статичный HUD, минимум CPU.

| Режим | Поведение |
|-------|-----------|
| **Авто** (по умолчанию) | Ночь **23:00–07:00** по часовому поясу браузера; днём — обычный HUD |
| **День** | Вручную: все API активны |
| **Ночь** | Вручную: только кэш |

Клик по кнопке: **Авто → День → Ночь → Авто**. В авто на кнопке: `Авто · День` или `Авто · Ночь`.  
`localStorage`: `jarvis-night-mode-preference`. Опционально: `NEXT_PUBLIC_NIGHT_START_HOUR`, `NEXT_PUBLIC_NIGHT_END_HOUR`, `NEXT_PUBLIC_NIGHT_TZ`.

| | День | Ночь |
|---|------|------|
| **API (все модули)** | по расписанию (ISS 15 с … SV 5 мин) | **paused** — только кэш `jarvis-cache-v2-*` |
| **Часы** | каждую 1 с | каждую **1 мин** |
| **Countdown Space** | тик каждую 1 с | **заморожен** |
| **Core Reactor (без радио)** | RAF ~60 fps, idle-дыхание | **статичный** (без RAF) |
| **Core Reactor (радио вкл.)** | полный эквалайзер | полный эквалайзер |
| **CSS-анимации** | все | ambient, weather, SV, ISS pulse — off |
| **World News** | слайды 10 с | ротация off |
| **Циркадная тема** | обновление каждые 60 с | заморожена при входе в ночь |

**Файлы:** `nightMode.ts`, `nightSchedule.ts`, `NightModeContext.tsx`, `useAdaptivePoll.ts`, `useCoreResonanceVisuals.ts`, `ClockModule`, `LaunchCountdown`, `NightModeToggle.tsx`, `.command-shell.night-mode` в `globals.css`.

> Для минимального шума вентиляторов: **Ночь** + радио выкл + по возможности `npm run build && npm start` вместо dev.

---

## API-роуты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/weather` | `WeatherData` |
| GET | `/api/calendar` | `CalendarData` |
| GET | `/api/gmail` | `GmailData` (unread + messages) |
| GET | `/api/space` | `SpaceLaunch` |
| GET | `/api/world-news` | `WorldNewsData` (RSS headlines) |
| GET | `/api/nasa-news` | Последний заголовок NASA RSS |
| GET | `/api/iss-telemetry` | `IssTelemetryData` (МКС, live) |
| GET | `/api/briefing` | `BriefingData` (Claude, кэш 3 ч) |
| GET | `/api/sv-events` | `SvEventsData` (тикер) |
| GET | `/api/radio/metadata?station=...` | Метаданные трека |
| POST | `/api/ask` | `{ query }` → `{ text }` |
| GET | `/api/audiobooks` | `AudiobookData` (YouTube uploads) |
| POST | `/api/tts` | `{ text }` → `audio/mpeg` или `{ ok: false }` |

Типы данных: `src/types/modules.ts`.  
Контракт API: `src/types/api.ts`.

---

## Архитектура

```
src/
├── app/
│   ├── api/              # Серверные роуты (ключи только здесь)
│   │   ├── weather/
│   │   ├── calendar/
│   │   ├── gmail/
│   │   ├── space/
│   │   ├── nasa-news/
│   │   ├── world-news/
│   │   ├── iss-telemetry/
│   │   ├── briefing/
│   │   ├── audiobooks/
│   │   ├── sv-events/
│   │   ├── ask/
│   │   ├── tts/
│   │   └── radio/metadata/
│   ├── globals.css       # HUD-тема, mood, circadian overrides
│   ├── layout.tsx
│   └── page.tsx
├── components/           # UI-модули + WorldNews + Audiobooks + VoiceConsole + narrow HUD
│   ├── ClockCore.tsx, ClockMeta.tsx, BriefingTeaser.tsx, HudDrawer.tsx, HudNavChips.tsx
├── config/
│   ├── theme.ts          # Темы + circadian palette
│   ├── nightMode.ts      # Ночные интервалы опроса
│   ├── news.ts           # RSS feeds World News
│   ├── radio.ts          # ⚠️ не трогать без необходимости
│   └── coreReactor.ts    # ⚠️ не трогать
├── context/
│   ├── CoreResonanceContext.tsx   # Радио + AnalyserNode
│   ├── ModuleHealthContext.tsx    # Heartbeat для System Status
│   └── NightModeContext.tsx       # День/Ночь + localStorage
│   └── AudiobooksContext.tsx      # YouTube IFrame (отдельно от радио)
├── hooks/
│   ├── useIntervalFetch.ts        # Retry, cache, stale, unavailable, paused
│   ├── useAdaptivePoll.ts         # Ночные интервалы + пауза при hidden tab
│   ├── useCoreResonanceVisuals.ts # ⚠️ не трогать
│   ├── useNarrowHud.ts, useClockNow.ts
│   ├── useVoiceInput.ts / useVoiceOutput.ts
│   └── useSystemStatus.ts
├── layout/
│   └── DashboardLayout.tsx
├── lib/
│   ├── server/           # briefingSources, briefingCache, briefingDiskCache, worldNews, spaceSnapshot, gmail, …
│   ├── briefingContext.ts, stripMarkdown.ts, daypart.ts, nightSchedule.ts
│   ├── client/           # apiFetch + ServiceUnavailableError
│   ├── calendar.ts, weather.ts, spaceLaunch.ts, …
│   ├── coreReactorEngine.ts  # ⚠️ не трогать
│   └── audioAnalysis.ts      # ⚠️ не трогать
├── services/             # Клиентские fetch-обёртки
└── types/
    ├── modules.ts
    └── api.ts
```

### Реестр модулей

`src/lib/moduleRegistry.ts`:

| ID | Статус | Refresh |
|----|--------|---------|
| weather | ✅ active | 15 min |
| calendar | ✅ active | 5 min |
| clock | ✅ active | — |
| space | ✅ active | 30 min / 90 s |
| world-news | ✅ active | 10 min |
| ambient-audio | ✅ active | — |
| audiobooks | ✅ active | 30 min |
| ai-briefing | ✅ active | 1 h |
| silicon-valley | ✅ active | 5 min |
| radar | 🔒 reserved | — |
| gremlin | 🔒 reserved | — |
| notifications | 🔒 reserved | — |

### Циркадная тема

- `CircadianThemeController` меняет accent/panel colors по времени суток (night → dawn → day → dusk).
- **Зона `.zone-center` (ядро) зафиксирована** — эквалайзер и кольца всегда в базовой JARVIS-палитре (`#55d6ff`).

### Неприкосновенные части (не менять без крайней необходимости)

- Core Reactor: `coreReactorEngine.ts`, `coreReactor.ts`, `CentralHudRings.tsx`, `useCoreResonanceVisuals.ts`
- Эквалайзер: `audioAnalysis.ts`
- Рadio: `radio.ts`, `radioService.ts`, `api/radio/**`, `AmbientAudioModule.tsx`, radio-часть `CoreResonanceContext.tsx`

---

## Надёжность и отказоустойчивость

### `useIntervalFetch`

- Retry с backoff: **2 с → 8 с → 30 с** (3 попытки).
- При ошибке **не затирает** предыдущие `data`.
- Кэш последнего успешного ответа в `localStorage` (ключи **`jarvis-cache-v2-*`**).
- Автораспаковка устаревших записей формата `{ ok, data }` (миграция с ранних сборок).
- Возвращает: `data`, `loading`, `error`, `isStale`, `lastUpdated`, `unavailableService`.
- Опция `paused: true` — без периодического опроса; данные из кэша остаются на экране.

### Ночной режим (`useAdaptivePoll`)

- **Авто** (default): ночь **23:00–07:00** по TZ браузера или `NEXT_PUBLIC_NIGHT_TZ`.
- Клик тумблера: **Авто → День → Ночь → Авто**; `localStorage`: `jarvis-night-mode-preference`.
- В режиме **Ночь** (авто или вручную): `NightModeContext` → все модули **`paused: true`**, нулевой API-трафик.
- Часы 1/min, countdown и idle-реактор заморожены; при **включённом радио** реактор работает как днём.
- CSS: `.command-shell.night-mode`.

---

### Space / Spacedevs

- Сервер: `fetchCachedSpaceLaunch()` — TTL **15 мин** + **singleflight** (параллельные briefing/space не дублируют upstream).
- При **429** от Spacedevs — отдаётся stale-кэш, если есть; иначе плашка «Космос временно недоступен».
- Не запускайте несколько `npm run dev` и не спамьте `/api/space` вручную — лимит API жёсткий.

### `ModuleErrorBoundary`

Каждый модуль обёрнут в error boundary — падение одного блока показывает «MODULE OFFLINE», остальной дашборд жив.

### System Status

Точки online / stale / offline для: Weather, Calendar, Space Feed, Briefing.

### Briefing — диск-кэш (экономия Claude)

- Файл: **`.data/briefing-cache.json`** (в `.gitignore`).
- Порядок: память → диск → Claude.
- TTL **3 ч** + инвалидация при смене `dayPart` (утро/день/вечер/ночь).
- Общий кэш для `/api/briefing` и голоса `/api/ask`.
- Сброс вручную: удалить `.data/briefing-cache.json`.

### Журнал правок надёжности (память)

Зафиксированные исправления v0.6–v0.8 — чтобы не повторять старые ошибки:

| # | Проблема | Исправление |
|---|----------|-------------|
| 1 | `useIntervalFetch` сразу refetch после успеха → сотни req/min, бан OpenWeather | Интервал соблюдается; retry **2→8→30 с** (3×); stale не затирает `data` |
| 2 | Несколько `npm run dev` + `build` параллельно с dev | **Один** процесс на **`:3001`**; не мешать `npm run build` и dev — битый `.next` → 500 `Cannot find module './NNN.js'` |
| 3 | Space polling 90 с + нет серверного кэша → Spacedevs **429** | Клиент **30 мин**; сервер **15 мин** + **singleflight** (briefing + space = один upstream) |
| 4 | OpenWeather: 1 `/api/weather` = 3 upstream-вызова | Серверный кэш **10 мин**; один dev |
| 5 | Рестарт сервера → новый вызов Claude | **Диск-кэш** briefing в `.data/` |
| 6 | Двойная озвучка (ElevenLabs + системный голос) | `onFinal` один раз; `generationRef`; `speechSynthesis.cancel()` перед TTS |
| 7 | API упал, но в `localStorage` есть данные | Stale на экране + плашка; не пустой модуль |
| 8 | Ночной шум API / вентилятор | **Авто 23:00–07:00** или **Ночь** → `paused: true`, только кэш |
| 9 | Падение одного модуля роняло UI | `ModuleErrorBoundary` → «MODULE OFFLINE» |
| 10 | Comms / Gmail | Тот же `useIntervalFetch` + night pause; OAuth **отдельно** от Calendar SA |
| 11 | YT IFrame внутри React → `removeChild` / мигание при HMR | Контейнер на `document.body`, singleton без `destroy()` при remount |
| 12 | Запись `.data/briefing-cache.json` триггерит dev HMR | `next.config` — `watchOptions.ignored: **/.data/**` |

**Операционка (не код):** после `.env.local` — перезапуск dev; Gmail API включить в GCP; при 403 — проверить Client ID (типичная опечатка в середине строки).

**Сделано:** тесты `formatSunset` + polling policy; cooldown **15 мин** после 429 (Space + OpenWeather); PWA manifest; `npm run dev:clean` + `npm run kiosk`.

---

## Разработка

### Скрипты

```bash
npm run dev        # localhost:3001, hot reload (разработка)
npm run dev:clean  # kill :3001, удалить .next, старт dev (лечит 500)
npm run build      # production build + typecheck
npm run start      # serve после build
npm run kiosk      # build + start — тихий режим для постоянной вкладки
npm run launcher:build     # собрать launcher/Jarvis.exe
npm run launcher:shortcut  # Jarvis.lnk в корне проекта
npm run lint       # ESLint
npm test           # Vitest (pure lib)
```

### Launcher (ярлык без терминала)

| Файл | Назначение |
|------|------------|
| `launcher/Jarvis.exe` | Стартует `npm start` скрыто + открывает браузер |
| `Jarvis.lnk` (корень) | Ярлык для двойного клика — **основной способ запуска** |
| `launcher/Start-Jarvis.ps1` | Исходник PowerShell |
| `launcher/Jarvis.vbs` | Fallback без exe |

Сборка: `npm run launcher:build` (нужен интернет, `pkg`). Ярлык: `npm run launcher:shortcut`.  
Если Desktop через OneDrive не принимает ярлык — перетащи `D:\Jarvis\Jarvis.lnk` на рабочий стол вручную.

### Режим киоска (внешний монитор / крышка ноута закрыта)

Для **фонового HUD** на втором экране (или единственном внешнем) — без HMR и лишней нагрузки на CPU:

```bash
npm run kiosk
```

Сервер крутится в терминале; в Chrome на внешнем мониторе открой `http://localhost:3001`.

**PWA (без полос Chrome):** Chrome → меню **Установить Jarvis** / **Install app** (или «Добавить на рабочий стол»). Открой установленное приложение на весь экран (`F11`).

**Windows:** при закрытой крышке ноута — в питании: «При закрытии крышки» → **Ничего не делать** (от сети), иначе Jarvis уснёт.

Для правок кода — снова `npm run dev` или `npm run dev:clean`.

### Типичные проблемы

| Симптом | Решение |
|---------|---------|
| `MODULE OFFLINE` (Weather / Calendar) | Очистить `localStorage` (`jarvis-cache-*`), Ctrl+Shift+R; обновить до v0.6+ |
| Все модули Stale / «временно недоступен» | Проверить сеть; перезапустить `npm run dev`; API: `Invoke-RestMethod localhost:3001/api/weather` |
| Два голоса одновременно | Обновить репо; перезапустить dev — исправлено в `useVoiceOutput` + `onFinal` |
| `Internal Server Error` на `/` | `npm run dev:clean` (или вручную: kill `:3001`, удалить `.next`, один dev) |
| ISS telemetry не видна | Блок скрыт на узких экранах (`<768px`); расширьте окно |
| Build + dev одновременно | Не запускать параллельно |
| Ключи не подхватились | Перезапустить dev после правки `.env.local` |
| Voice кнопки нет | Firefox — нет Web Speech API; используйте Chrome/Edge |
| Порт занят | Убедитесь, что не запущено несколько `npm run dev`; Jarvis по умолчанию на `:3001` |
| OpenWeather key blocked | Не запускайте несколько dev-серверов; лимит Free — 60 req/min; подождите ~1 ч или смените ключ |
| Spacedevs 429 (Космос) | Сервер молчит **15 мин**, отдаёт stale; подождите или `npm run kiosk` вместо dev |
| SSL при `git push` | Windows: временно `GIT_SSL_NO_VERIFY=1` или настроить сертификаты |
| Вентилятор шумит ночью | **Ночь** в шапке + радио выкл; для постоянной вкладки — `npm run kiosk` |
| Calendar пустой | Расшарить календарь на service account email |

### Очистка кэша модулей (браузер)

F12 → **Application** → **Local Storage** → ваш `localhost` → удалить ключи `jarvis-cache-*`.

Или в консоли:

```javascript
Object.keys(localStorage)
  .filter((k) => k.startsWith("jarvis-cache"))
  .forEach((k) => localStorage.removeItem(k));
```

### Проверка API локально

```powershell
Invoke-RestMethod http://localhost:3001/api/weather
Invoke-RestMethod http://localhost:3001/api/briefing
Invoke-RestMethod http://localhost:3001/api/sv-events
Invoke-RestMethod http://localhost:3001/api/world-news
Invoke-RestMethod http://localhost:3001/api/iss-telemetry
```

Успешный ответ: `{ "ok": true, "data": { ... } }`.

---

## Безопасность

- **`.env.local`** и `jarvis-command-center-*.json` в `.gitignore` — не пушить в GitHub.
- **`.env.example`** — только плейсхолдеры, без реальных ключей.
- Серверные ключи доступны только в `app/api/**` — не используйте `NEXT_PUBLIC_*` для секретов.
- Если ключ случайно попал в git — **перевыпустите** его в консоли провайдера.

---

## Зарезервированные модули

В `moduleRegistry.ts` с `enabled: false`:

- **radar** — погодный радар
- **gremlin** — easter egg / character module
- **notifications** — push / alerts hub

Спека задач для Cursor: `CURSOR_TASKS.md`, голос: `VOICE_TASKS.md`.

---

## Известные ограничения

- World News — только на экранах **lg+** (wide layout); в narrow — drawer «News».
- Narrow HUD: Gmail только в wide Comms; календарь — 2 события без скролла.
- Voice Console — Chrome / Edge (Web Speech API).
- UI боковых метрик погоды — one-line rails, AQI цифрой, sunset 12h (v0.9).
- Ярлык на Desktop через OneDrive (кириллица) может не создаваться автоматически — drag `Jarvis.lnk` вручную.
- Post-launch report держится **12 часов**, затем переключается на **следующий** ближайший пуск из API (не «ваш» Starlink навсегда).
- Briefing cache: память + **`.data/briefing-cache.json`** (переживает рестарт сервера).
- System Status подписи на английском; плашки недоступности — на русском.
- Карта — **OSM** (бесплатно); pan/zoom в футере; геолокация — одна точка на карту и погоду. Google Maps не подключён — см. [docs/MAP_AND_LOCATION.md](docs/MAP_AND_LOCATION.md).

---

## Карта и геолокация

**Решение:** сейчас **OpenStreetMap + Leaflet** — достаточно для личного HUD, **$0**, без Google Cloud.

| | |
|---|---|
| **Карта** | футер между Audiobooks и ISS; drag, колесо/+−, ◎, ссылка OSM |
| **Локация** | browser geolocation → **ЗДЕСЬ**; fallback San Jose/env → **HOME** |
| **Google Maps** | опционально позже; ~10k бесплатных загрузок/мес; для «иногда открыл» ≈ **$0** |

Подробно (лимиты Google, когда списывают, как включить без сюрпризов): **[docs/MAP_AND_LOCATION.md](docs/MAP_AND_LOCATION.md)**

---

## Changelog (кратко)

| Версия | Изменения |
|--------|-----------|
| **v0.10** | **Narrow HUD**: frame 900px, погода слева, время+core по центру, compact calendar, drawer (Space/Briefing/News/ISS), Briefing teaser, radio+audiobooks в футере, half-screen detection |
| **v0.9** | **Launcher** (`Jarvis.exe` + ярлык), календарь **Tasks/reminders** + клик по дням, голос (**World News**, почта, короткие команды, радио), weather rails (AQI/12h), **Устарело**, `dev:clean` / `kiosk`, PWA manifest, 429 cooldown 15 мин, тесты sunset/polling |
| **v0.8** | Briefing, World News, Audiobooks, **Comms + Gmail**, **briefing disk cache**, audiobook covers, **weather side rails** (HUD icons), **авто день/ночь**, голос + briefing/ISS, RP album art, deep night, ISS, NASA RSS, singleflight; **ритуал удалён** |
| **v0.7** | ISS Telemetry (код). NASA RSS в Space. Голос: toggle. Fix приветствия. Удалена карта МКС из Space. |
| **v0.6** | Исправлен двойной TTS. Кэш модулей `jarvis-cache-v2-*`. **Fix:** бесконечный refetch в `useIntervalFetch` (убивал OpenWeather). Dev-порт **3001**. Серверный кэш погоды 10 мин. |
| **v0.5** | AI Briefing, Voice Console, SV ticker, circadian theme, graceful degradation, ModuleHealth. |
| **v0.4** | Resilience: retry, stale cache, error boundaries, System Status. |

---

## Roadmap

- [x] Narrow HUD (half-screen / laptop)
- [ ] ISS telemetry на узких экранах (свёрнутый режим в drawer — частично через чип ISS)
- [x] Readability: weather side rails, calendar day picker
- [x] World News + почта в голосовом `/api/ask`
- [x] Launcher, kiosk, dev:clean, PWA, 429 cooldown
- [ ] Модули: radar, gremlin, notifications

---

## Лицензия

Private project. All rights reserved.

---

## Благодарности

- [The Space Devs](https://thespacedevs.com/) — launch data  
- [Where The ISS At](https://wheretheiss.at/) · [CelesTrak](https://celestrak.org/) — ISS position / TLE  
- [OpenStreetMap](https://www.openstreetmap.org/) · [Nominatim](https://nominatim.org/) — карта и reverse geocode (устройство)  
- [Open-Meteo](https://open-meteo.com/) — geocoding fallback / ISS  
- [NASA RSS](https://www.nasa.gov/rss/dyn/breaking_news.rss) — breaking news  
- [SomaFM](https://somafm.com/) · [Radio Paradise](https://radioparadise.com/) — streams  
- [OpenWeather](https://openweathermap.org/) · [Anthropic](https://anthropic.com/) · [ElevenLabs](https://elevenlabs.io/) · [Finnhub](https://finnhub.io/)
