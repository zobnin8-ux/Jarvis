# Jarvis — Personal Command Center

Личный HUD-дашборд в стиле mission control: погода, календарь, космос, AI-брифинг, радио с аудио-реактором в центре и голосовой консолью.  
Рассчитан на **вкладку браузера на компьютере** (Chrome / Edge), не на TV-киоск 24/7.

**Репозиторий:** [github.com/zobnin8-ux/Jarvis](https://github.com/zobnin8-ux/Jarvis)  
**Стек:** Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion  
**Версия UI:** v0.5 (функционально — v0.6+: брифинг, голос, SV-тикер, циркадная тема)

---

## Содержание

1. [Скриншот схемы](#схема-интерфейса)
2. [Модули](#модули)
3. [Быстрый старт](#быстрый-старт)
4. [Переменные окружения](#переменные-окружения)
5. [Где брать API-ключи](#где-брать-api-ключи)
6. [Graceful degradation](#graceful-degradation)
7. [Голосовая консоль](#голосовая-консоль)
8. [API-роуты](#api-роуты)
9. [Архитектура](#архитектура)
10. [Надёжность и отказоустойчивость](#надёжность-и-отказоустойчивость)
11. [Разработка](#разработка)
12. [Безопасность](#безопасность)
13. [Зарезервированные модули](#зарезервированные-модули)
14. [Известные ограничения](#известные-ограничения)
15. [Roadmap](#roadmap)

---

## Схема интерфейса

```
┌─────────────────┬────────────────────────────┬─────────────────┐
│    WEATHER      │      CLOCK + CORE          │    CALENDAR     │
│  (атмосфера)    │   HUD-кольца, эквалайзер   │  week / NEXT    │
│                 │   System Status            │  timeline       │
│    BRIEFING     │                            │                 │
│  (AI-сводка)    │                            │                 │
├─────────────────┴────────────────────────────┴─────────────────┤
│              ORBITAL OPERATIONS (Space)                        │
│         countdown · post-launch report · ISS pass              │
├────────────────────────────────────────────────────────────────┤
│  SV TICKER — tech-события + котировки (бегущая строка)         │
├────────────────────────────────────────────────────────────────┤
│  Ambient Audio    Personal Mission Control    Voice Console ◯   │
└────────────────────────────────────────────────────────────────┘
```

**Центр экрана** — Core Reactor: кольца HUD + эквалайзер, реагирующий на **радио** (не на голосовой TTS).

---

## Модули

### Clock + Core Reactor

| | |
|---|---|
| **Файлы** | `ClockModule`, `CentralHudRings`, `coreReactorEngine`, `useCoreResonanceVisuals` |
| **Что делает** | Часы, дата, приветствие (`Good Morning, {name}`), System Status |
| **Core Reactor** | Свечение и «дыхание» от аудио-анализатора радио; idle-режим через 45 с без активности |
| **Обновление** | Часы — каждую секунду; статус фидов — из `ModuleHealthContext` |

### Weather (погода)

| | |
|---|---|
| **Источник** | OpenWeather (current + forecast + air pollution) |
| **Refresh** | 15 мин |
| **Без ключа** | Demo-погода (San Jose по умолчанию) |
| **UI** | Hero: температура, mood-фон, HUD-иконка; телеметрия: high/low, AQI, восход/закат, таймлайн осадков, 6 ч + 3 дня |

Координаты: `WEATHER_LAT` / `WEATHER_LON`. Подпись города: `NEXT_PUBLIC_WEATHER_CITY`.

### AI Briefing

| | |
|---|---|
| **Источник** | Claude (`claude-sonnet-4-6`) + контекст: погода, календарь, космос |
| **Refresh** | 1 ч; серверный кэш — 3 ч |
| **Без `ANTHROPIC_API_KEY`** | Шаблонный demo-брифинг из тех же данных |
| **Расположение** | Левая колонка, под Weather |

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
| **Источник** | [The Space Devs](https://thespacedevs.com/) + Open Notify (ISS passes) |
| **Refresh** | 30 мин (countdown) / 90 с (liftoff/postlaunch) |
| **Фазы** | `countdown` → `liftoff` (~30 мин) → `postlaunch` (12 ч) → следующий манифест |
| **Post-launch** | Mission Report: outcome, orbit, booster, payload, новость (SpaceX/NASA) |
| **ISS** | «ISS over you at HH:MM, ~N min» по вашим координатам |

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
| **Метаданные** | `/api/radio/metadata` — track / artist |
| **Связь с ядром** | `<audio>` + Web Audio AnalyserNode → Core Reactor |

### Voice Console (голос)

| | |
|---|---|
| **Ввод** | Web Speech API, push-to-talk, `ru-RU` |
| **Мозг** | `/api/ask` → Claude |
| **Озвучка** | `/api/tts` → ElevenLabs (клон) → отдельный `Audio()`; фолбэк — `SpeechSynthesis` |
| **Управление** | Кнопка ◯ или **удержание пробела** |
| **Браузер** | Chrome / Edge; Firefox — кнопка скрыта (`supported: false`) |

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

```bash
# Разработка
npm run dev

# Production-сборка
npm run build
npm start
```

Откройте [http://localhost:3000](http://localhost:3000).  
F11 — полноэкранный режим браузера.

> После изменения `.env.local` **перезапустите** `npm run dev`.

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

### Finnhub (акции в SV-тикере)
1. [finnhub.io](https://finnhub.io) → Get free API key.
2. Free tier: котировки с задержкой, лимит запросов — для личного дашборда достаточно.

### Google Calendar
1. [console.cloud.google.com](https://console.cloud.google.com/) → новый проект.
2. APIs & Services → Enable **Google Calendar API**.
3. Credentials → Service Account → Create key (JSON).
4. Расшарить календарь на `client_email` из JSON.

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
[Push-to-talk] → SpeechRecognition (ru-RU)
       ↓
   /api/ask (Claude + контекст погода/календарь/космос)
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

---

## API-роуты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/weather` | `WeatherData` |
| GET | `/api/calendar` | `CalendarData` |
| GET | `/api/space` | `SpaceLaunch` + `issPass` |
| GET | `/api/briefing` | `BriefingData` (Claude, кэш 3 ч) |
| GET | `/api/sv-events` | `SvEventsData` (тикер) |
| GET | `/api/radio/metadata?station=...` | Метаданные трека |
| POST | `/api/ask` | `{ query }` → `{ text }` |
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
│   │   ├── space/
│   │   ├── briefing/
│   │   ├── sv-events/
│   │   ├── ask/
│   │   ├── tts/
│   │   └── radio/metadata/
│   ├── globals.css       # HUD-тема, mood, circadian overrides
│   ├── layout.tsx
│   └── page.tsx
├── components/           # UI-модули + VoiceConsole + ErrorBoundary
├── config/
│   ├── theme.ts          # Темы + circadian palette
│   ├── radio.ts          # ⚠️ не трогать без необходимости
│   └── coreReactor.ts    # ⚠️ не трогать
├── context/
│   ├── CoreResonanceContext.tsx   # Радио + AnalyserNode
│   └── ModuleHealthContext.tsx    # Heartbeat для System Status
├── hooks/
│   ├── useIntervalFetch.ts        # Retry, cache, stale, unavailable
│   ├── useCoreResonanceVisuals.ts # ⚠️ не трогать
│   ├── useVoiceInput.ts / useVoiceOutput.ts
│   └── useSystemStatus.ts
├── layout/
│   └── DashboardLayout.tsx
├── lib/
│   ├── server/           # briefingSources, spaceSnapshot, svEvents, apiResponse
│   ├── client/           # apiFetch + ServiceUnavailableError
│   ├── calendar.ts, weather.ts, spaceLaunch.ts, issPass.ts, …
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
| ambient-audio | ✅ active | — |
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
- Кэш последнего успешного ответа в `localStorage` (опция `cacheKey`).
- Возвращает: `data`, `loading`, `error`, `isStale`, `lastUpdated`, `unavailableService`.

### `ModuleErrorBoundary`

Каждый модуль обёрнут в error boundary — падение одного блока показывает «MODULE OFFLINE», остальной дашборд жив.

### System Status

Точки online / stale / offline для: Weather, Calendar, Space Feed, Briefing.

---

## Разработка

### Скрипты

```bash
npm run dev      # localhost:3000, hot reload
npm run build    # production build + typecheck
npm run start    # serve после build
npm run lint     # ESLint
```

### Типичные проблемы

| Симптом | Решение |
|---------|---------|
| `Cannot find module './xxx.js'`, 500 | Остановить dev, удалить `.next`, `npm run dev` |
| Build + dev одновременно | Не запускать параллельно |
| Ключи не подхватились | Перезапустить dev после правки `.env.local` |
| Voice кнопки нет | Firefox — нет Web Speech API; используйте Chrome/Edge |
| SSL при `git push` | Windows: временно `GIT_SSL_NO_VERIFY=1` или настроить сертификаты |
| Calendar пустой | Расшарить календарь на service account email |

### Проверка API локально

```powershell
Invoke-RestMethod http://localhost:3000/api/weather
Invoke-RestMethod http://localhost:3000/api/briefing
Invoke-RestMethod http://localhost:3000/api/sv-events
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

- UI погоды в развёрнутой телеметрии — мелковат (запланирован readability pass).
- Radio Paradise album art в API есть, в UI пока не показан.
- Post-launch report держится **12 часов**, затем переключается на **следующий** ближайший пуск из API (не «ваш» Starlink навсегда).
- Briefing cache in-memory — сбрасывается при рестарте сервера.
- System Status подписи на английском; плашки недоступности — на русском.

---

## Roadmap

- [ ] Перенести radio player под core (меньше пустого места в футере)
- [ ] Readability pass: weather telemetry, calendar empty states
- [ ] Album art в Ambient Audio (Radio Paradise)
- [ ] Модули: radar, gremlin, notifications
- [ ] Wake-word (сейчас только push-to-talk)

---

## Лицензия

Private project. All rights reserved.

---

## Благодарности

- [The Space Devs](https://thespacedevs.com/) — launch data  
- [Open Notify](http://open-notify.org/) — ISS passes  
- [SomaFM](https://somafm.com/) · [Radio Paradise](https://radioparadise.com/) — streams  
- [OpenWeather](https://openweathermap.org/) · [Anthropic](https://anthropic.com/) · [ElevenLabs](https://elevenlabs.io/) · [Finnhub](https://finnhub.io/)
