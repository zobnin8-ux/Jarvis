---
title: Jarvis Command Center
tags:
  - jarvis
  - project
  - dev
  - hud
aliases:
  - Jarvis
  - JARVIS
status: active
repo: https://github.com/zobnin8-ux/Jarvis
stack: Next.js 15 · React 19 · TypeScript
updated: 2026-06-16
version: v0.10
---

# Jarvis — Personal Command Center

> Личный HUD-дашборд: погода, **Comms**, космос, AI-брифинг, World News, радио, Audiobooks, голос и **авто день/ночь**.  
> **Narrow HUD** — пол-экрана / ноутбук (frame 900px, drawer для Space/News/ISS).  
> Запуск: **`Jarvis.lnk`** · порт **3001** · Chrome / Edge.

---

## Быстрые ссылки

| Что | Где |
|-----|-----|
| README (полная дока) | `README.md` |
| **Narrow HUD** | `useNarrowHud.ts`, `HudDrawer.tsx`, `HudNavChips.tsx`, `BriefingTeaser.tsx`, `ClockCore.tsx`, `ClockMeta.tsx` |
| Layout | `src/layout/DashboardLayout.tsx` |
| Env-шаблон | `.env.example` |
| Реестр модулей | `src/lib/moduleRegistry.ts` |
| Брифинг (сервер) | `briefingSources.ts`, `briefingCache.ts`, `briefingDiskCache.ts` |
| Погода (UI) | `WeatherModule.tsx`, `WeatherRailIcon.tsx` |
| Comms / Gmail / Tasks | `CommsModule.tsx`, `googleTasks.ts`, `scripts/gmail-oauth.mjs` |
| **Launcher** | `launcher/Jarvis.exe`, `Jarvis.lnk`, `npm run launcher:build` |
| Голос `/api/ask` | briefing + **World News** + **почта** + ISS; `voiceCommands.ts` |
| Audiobooks | `AudiobooksContext.tsx`, `/api/audiobooks` |
| World News (RSS) | `src/config/news.ts` |
| Space snapshot | `src/lib/server/spaceSnapshot.ts` |
| ISS telemetry | `src/components/IssTelemetryModule.tsx` |
| Ночной режим | `nightMode.ts`, `nightSchedule.ts`, `NightModeContext.tsx` |

---

## Запуск (шпаргалка)

| Режим | Действие |
|-------|----------|
| **Каждый день** | `D:\Jarvis\Jarvis.lnk` → F11 |
| После `git pull` | `npm run build` → ярлык |
| Разработка | `npm run dev` / `npm run dev:clean` |
| Киоск | `npm run kiosk` |
| Exe | `npm run launcher:build` |

---

## Схема экрана

### Wide (полный монитор)

```
┌──────────────┬─────────────────────┬──────────────┐
│ Weather      │   Clock + Core      │  Comms       │
│ Briefing     │   Reactor (radio)   │  Cal / Mail  │
├──────────────┴──────────┬──────────┴──────────────┤
│ Space                   │  World News (lg+)        │
├─────────────────────────┴────────────────────────┤
│ SV Ticker · Audio · Audiobooks · ISS · Voice      │
└──────────────────────────────────────────────────┘
```

### Narrow (пол-экрана / ноутбук)

Триггер: `useNarrowHud` — малый viewport **или** окно < ~72% ширины монитора.

```
        ┌──────── max 900px по центру ────────┐
        │ Weather │ time+date+core │ Calendar │
        │         │   greeting     │ 2 events │
        ├─────────┴────────────────┴──────────┤
        │ Briefing teaser → drawer            │
        │ Radio · Audiobooks · Voice          │
        └─────────────────────────────────────┘
```

Чипы в шапке → drawer: **Space · Briefing · News · ISS**. Gmail — только в wide Comms.

---

## Модули

### Активные

- **Weather** — OpenWeather, mood-фон; hero **3 колонки** (центр + боковые метрики с `WeatherRailIcon`); без toggle «Atmospheric Data»
- **Briefing** — Claude + insight-слой, `dayPart`, без markdown → [[#Брифинг v0.8]]
- **Comms** — CALENDAR (клик по дням недели, **Tasks/reminders**) | **MAIL**
- **Space** — The Space Devs, countdown / post-launch / NASA RSS; кэш 15 мин + **singleflight**
- **World News** — BBC, Guardian, RIA, RBC; слайды 10 с, RU/EN
- **Ambient Audio** — SomaFM + Radio Paradise → **Core Reactor**; **обложка трека** — только RP
- **ISS Telemetry** — футер (md+), WTIA + geocoding + TLE
- **Audiobooks** — YouTube «Голос Коваленко», футер **справа** от радио; **обложка 40×40** в мини-плеере; библиотека **draggable**
- **Voice Console** — toggle + пробел; `/api/ask` (briefing + **news** + **mail** + ISS); короткие команды; радио по голосу
- **SV Ticker** — demo events + Finnhub (опц.)
- **Night Mode** — тумблер в шапке → [[#Ночной режим]]

### Зарезервированы

`radar` · `gremlin` · `notifications` — `enabled: false` в `moduleRegistry.ts`

---

## Брифинг v0.8

**Принцип:** не пересказывать панели (погода слева, календарь справа, пуск внизу). Дать приоритет / одну подсказку / «срочного ничего».

| Правило | Детали |
|---------|--------|
| Формат | Русский plain text, `stripMarkdown.ts` |
| Длина | 1–3 предложения; ночь/вечер ≤ 2 |
| Пуск | `imminent` только < 2 ч или `liftoff`; человеческое время в промпте |
| Советы «на выход» | Только утро / день |
| Кэш | 3 ч + инвалидация при смене `dayPart` |
| Диск | `.data/briefing-cache.json` — переживает рестарт dev, экономит Claude |
| TZ | `BRIEFING_TZ` или offset OpenWeather |

Файлы: `briefingContext.ts`, `stripMarkdown.ts`, `daypart.ts`, `briefingCache.ts`, `briefingDiskCache.ts`, `briefing/route.ts`, `ask/route.ts`

**Голос (`/api/ask`):** общий кэш с `/api/briefing` + телеметрия ISS из футера. Примеры: «что важного?», «где МКС?».

---

## Ночной режим

**Тумблер:** шапка → `Авто · День` / `Авто · Ночь` / `День` / `Ночь`  
**Клик:** Авто → День → Ночь → Авто · `localStorage`: `jarvis-night-mode-preference`

| Режим | Поведение |
|-------|-----------|
| **Авто** (default) | Ночь **23:00–07:00** (TZ браузера или `NEXT_PUBLIC_NIGHT_TZ`) |
| **День** | Вручную — все API |
| **Ночь** | Вручную — только cache |

| | День | Ночь |
|---|------|------|
| API | все модули по таймеру | **0** — только cache |
| Часы | 1 с | 1 мин |
| Countdown | 1 с | frozen |
| Reactor без радио | RAF idle | static |
| Reactor + радио | full | full |

World News: ротация 10 с off. ISS: **CACHED POSITION**. Циркадная палитра не пересчитывается.

Env: `NEXT_PUBLIC_NIGHT_START_HOUR`, `NEXT_PUBLIC_NIGHT_END_HOUR`, `NEXT_PUBLIC_NIGHT_TZ`

Файлы: `nightMode.ts`, `nightSchedule.ts`, `NightModeContext`, `useAdaptivePoll`, `useCoreResonanceVisuals`, `ClockModule`, `LaunchCountdown`, `globals.css`

---

## Космос (Spacedevs)

- Клиент: опрос `/api/space` раз в **30 мин**
- Сервер: `spaceSnapshot.ts` — кэш **15 мин**, **singleflight** (briefing + space = один запрос при холодном старте)
- **429** — лимит The Space Devs; подождать или stale из кэша

---

## Голос и аудио

```mermaid
flowchart LR
  subgraph radio [Radio — Core Reactor]
    A[audio element] --> B[AnalyserNode]
    B --> C[HUD rings / equalizer]
  end
  subgraph voice [Voice Console]
    D[SpeechRecognition] --> E[/api/ask/]
    E --> H[briefing cache + ISS + panels]
    E --> F[/api/tts ElevenLabs]
    F --> G[new Audio — отдельно]
  end
```

**Не трогать без необходимости:** `coreReactorEngine.ts`, `audioAnalysis.ts`, `CoreResonanceContext` (radio), `CentralHudRings.tsx`, `useCoreResonanceVisuals.ts`

**Audiobooks + Voice + Radio** — три независимых аудио-канала; радио не паузится при книге. YT IFrame — контейнер на `document.body` (не в React-дереве), иначе HMR ломает DOM.

---

## Comms (Calendar + Mail)

| | |
|---|---|
| **Вкладки** | **CALENDAR** (default) · **MAIL · N** |
| **Mail** | Unread INBOX, до 7 писем, клик → Gmail thread |
| **Refresh** | 5 мин; ночью — только cache |
| **Календарь** | Service Account JSON (как раньше) |
| **Почта** | OAuth 2.0 — `scripts/gmail-oauth.mjs` → `GMAIL_REFRESH_TOKEN` |
| **GCP** | Включить **Gmail API** в проекте |

Файлы: `CommsModule.tsx`, `comms/CalendarTab.tsx`, `comms/MailTab.tsx`, `gmail.ts`, `/api/gmail`

---

## API (локально)

База: `http://localhost:3001`

| Route | Назначение |
|-------|------------|
| `/api/weather` | Погода |
| `/api/calendar` | Календарь |
| `/api/gmail` | Inbox unread + список |
| `/api/space` | Пуск |
| `/api/briefing` | AI-сводка |
| `/api/world-news` | RSS headlines |
| `/api/audiobooks` | YouTube полка |
| `/api/ask` | POST голосовой вопрос |
| `/api/tts` | POST озвучка |
| `/api/iss-telemetry` | МКС (если включён модуль) |

Ответ: `{ ok: true, data }` или `{ ok: false, reason: "unavailable", service }`

---

## Env (минимум для «живого» Jarvis)

```env
OPENWEATHER_API_KEY=
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=        # после смены — перезапуск npm run dev
YOUTUBE_API_KEY=
YOUTUBE_CHANNEL_ID=UCY-ekT04DX2bQhzYvm2y5Lw
NEXT_PUBLIC_USER_NAME=Andrei
GOOGLE_CALENDAR_ID=
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=
BRIEFING_TZ=America/Los_Angeles

GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=          # node scripts/gmail-oauth.mjs

# NEXT_PUBLIC_NIGHT_START_HOUR=23
# NEXT_PUBLIC_NIGHT_END_HOUR=7
# NEXT_PUBLIC_NIGHT_TZ=America/Los_Angeles
```

После правки `.env.local` → перезапуск `npm run dev`.

---

## Команды

```bash
npm run dev      # :3001
npm run build
npm run lint
npm test         # Vitest
```

**Типичный фикс 500:** один dev-процесс, удалить `.next`, Ctrl+Shift+R.

**Кэш модулей:** localStorage `jarvis-cache-v2-*` · **брифинг на диске:** `.data/briefing-cache.json` (в gitignore)

---

## Надёжность (журнал, память)

| # | Было | Стало |
|---|------|-------|
| 1 | refetch loop в `useIntervalFetch` | Интервал + retry 2→8→30 с; stale не затирает data |
| 2 | Несколько dev + build ∥ dev | Один dev на **:3001**; битый `.next` → удалить и перезапуск |
| 3 | Space 90 с polling → 429 | Клиент 30 мин; сервер 15 мин + **singleflight** |
| 4 | OpenWeather ban | Серверный кэш 10 мин; один dev |
| 5 | Рестарт → новый Claude | **Диск-кэш** briefing `.data/` |
| 6 | Двойной TTS | `onFinal` один раз + `generationRef` |
| 7 | Ночной API-шум | Авто 23–7 / Ночь → `paused`, только cache |
| 8 | YT IFrame + React HMR | Плеер на `body`, без `destroy()` при remount |
| 9 | `.data/` пишется → HMR | `next.config` ignore `.data/**` |

**Операционка:** `.env.local` → перезапуск dev; Gmail API enable в GCP; OAuth ≠ Calendar SA.

---

## Changelog (кратко)

| Ver | Highlights |
|-----|------------|
| **v0.10** | **Narrow HUD**: frame 900px, weather left, time above core, compact calendar, drawer chips, Briefing teaser, half-screen detect |
| **v0.9** | Launcher, calendar Tasks + day picker, voice news/mail/radio, weather rails, Устарело, dev:clean/kiosk/PWA, 429 cooldown, tests |
| **v0.8** | Briefing, World News, Audiobooks, **Comms + Gmail**, disk cache, audiobook covers, **weather side rails**, авто день/ночь, голос+briefing/ISS, RP art, ISS, singleflight; **ритуал удалён** |
| v0.7 | ISS (код), NASA RSS, voice toggle, убрана карта МКС |
| v0.6 | Fix двойного TTS, cache v2, порт 3001 |
| v0.5 | Briefing, Voice, SV ticker, circadian |

---

## Roadmap

- [x] **Narrow HUD** (half-screen / laptop)
- [ ] ISS telemetry на узких экранах (свёрнутый режим — частично drawer ISS)
- [x] Readability: weather side rails, calendar day picker
- [x] World News + почта в голосовом `/api/ask`
- [x] **Launcher** (`Jarvis.lnk`, `launcher:build`)
- [x] `dev:clean`, PWA, kiosk, 429 cooldown, тесты sunset/polling
- [ ] radar · gremlin · notifications

---

## Заметки для себя

- Demo-режим тихий, если ключ не задан; плашка «недоступен» — только когда ключ есть, API упал.
- Briefing не должен падать, если упала только погода.
- Narrow: чипы Space/Briefing/News/ISS → drawer; календарь 2 события; radio+audiobooks+**MAP (OSM)** в футере.
- **Карта:** OSM сейчас, Google Maps опционально — [MAP_AND_LOCATION.md](MAP_AND_LOCATION.md)
- Spacedevs/OpenWeather 429: сервер **15 мин cooldown**, stale из кэша; `npm run kiosk` для постоянной вкладки.
- **Launcher:** `Jarvis.lnk` в корне — двойной клик, без терминала; Edge/Chrome по умолчанию.
- **Lifecycle:** `LifecycleGuard` + `POST /api/lifecycle` — в production Node гасится, когда закрыта последняя вкладка (`JARVIS_LIFECYCLE_SHUTDOWN`).
- PWA: `public/manifest.webmanifest` — Install app (опционально).
- Ночь: **авто 23–7** или вручную — **нулевой API**, статичный HUD; радио при включении — полный реактор.
- Голос: `/api/ask` — briefing, World News, почта, ISS; «включи радио».
- RP Mellow: обложка трека в Ambient Audio.
- Audiobooks: YT IFrame на `body`; обложка 40×40 в мини-плеере; радио не трогаем.
- Gmail: OAuth отдельно; `node scripts/gmail-oauth.mjs`; badge скрыт при 0 unread.
- Briefing disk: удалить `.data/briefing-cache.json` для принудительной регенерации.

---

## Связанные заметки (шаблон)

- [[Jarvis — API keys]]
- [[Jarvis — Troubleshooting]]
- [[Home lab]]

*Скопируй этот файл в vault Obsidian и поправь wikilinks под свою структуру.*
