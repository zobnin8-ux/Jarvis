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
version: v0.8
repo: https://github.com/zobnin8-ux/Jarvis
stack: Next.js 15 · React 19 · TypeScript
updated: 2026-06-15
---

# Jarvis — Personal Command Center

> Личный HUD-дашборд: погода, календарь, космос, AI-брифинг, World News, радио, Audiobooks, голос и **ночной режим (День/Ночь)**.  
> Браузер **Chrome / Edge**, порт dev **3001**.

---

## Быстрые ссылки

| Что | Где |
|-----|-----|
| README (полная дока) | `README.md` |
| Layout | `src/layout/DashboardLayout.tsx` |
| Env-шаблон | `.env.example` |
| Реестр модулей | `src/lib/moduleRegistry.ts` |
| Брифинг (сервер) | `src/lib/server/briefingSources.ts` |
| Audiobooks | `AudiobooksContext.tsx`, `/api/audiobooks` |
| World News (RSS) | `src/config/news.ts` |
| Space snapshot | `src/lib/server/spaceSnapshot.ts` |
| ISS telemetry | `src/components/IssTelemetryModule.tsx` |
| Ночной режим | `src/config/nightMode.ts`, `NightModeContext.tsx`, `useAdaptivePoll.ts` |

---

## Схема экрана (v0.8)

```
┌──────────────┬─────────────────────┬──────────────┐
│ Weather      │   Clock + Core      │  Calendar    │
│ Briefing     │   Reactor (radio)   │  NEXT / week │
├──────────────┴──────────┬──────────┴──────────────┤
│ Space (Orbital Ops)     │  World News (lg+)      │
├─────────────────────────┴────────────────────────┤
│ SV Ticker                                        │
├──────────────────────────────────────────────────┤
│ Ambient Audio · Audiobooks · ISS TELEMETRY · Voice Console │
└──────────────────────────────────────────────────┘
```

---

## Модули

### Активные

- **Weather** — OpenWeather, mood-фон, demo без ключа
- **Briefing** — Claude + insight-слой, `dayPart`, без markdown → [[#Брифинг v0.8]]
- **Calendar** — Google Calendar SA или demo
- **Space** — The Space Devs, countdown / post-launch / NASA RSS; кэш 15 мин + **singleflight**
- **World News** — BBC, Guardian, RIA, RBC; слайды 10 с, RU/EN
- **Ambient Audio** — SomaFM + Radio Paradise → **Core Reactor**
- **ISS Telemetry** — футер (md+), WTIA + geocoding + TLE
- **Audiobooks** — YouTube «Голос Коваленко», футер **справа** от радио (та же высота); библиотека **draggable**, ~828×736 px
- **Voice Console** — toggle + пробел, `/api/ask` + TTS
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
| TZ | `BRIEFING_TZ` или offset OpenWeather |

Файлы: `briefingContext.ts`, `stripMarkdown.ts`, `daypart.ts`, `briefing/route.ts`, `ask/route.ts`

---

## Ночной режим

**Тумблер:** шапка → «Режим: День / Ночь» · `localStorage`: `jarvis-night-mode`

| | День | Ночь |
|---|------|------|
| API | все модули по таймеру | **0** — только cache |
| Часы | 1 с | 1 мин |
| Countdown | 1 с | frozen |
| Reactor без радио | RAF idle | static |
| Reactor + радио | full | full |

World News: ротация 10 с off. ISS: **CACHED POSITION**. Циркадная палитра не пересчитывается.

Файлы: `nightMode.ts`, `NightModeContext`, `useAdaptivePoll`, `useCoreResonanceVisuals`, `ClockModule`, `LaunchCountdown`, `globals.css`

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
    E --> F[/api/tts ElevenLabs]
    F --> G[new Audio — отдельно]
  end
```

**Не трогать без необходимости:** `coreReactorEngine.ts`, `audioAnalysis.ts`, `CoreResonanceContext` (radio), `CentralHudRings.tsx`, `useCoreResonanceVisuals.ts`

**Audiobooks + Voice + Radio** — три независимых аудио-канала; радио не паузится при книге.

---

## API (локально)

База: `http://localhost:3001`

| Route | Назначение |
|-------|------------|
| `/api/weather` | Погода |
| `/api/calendar` | Календарь |
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

**Кэш модулей:** localStorage `jarvis-cache-v2-*`

---

## Changelog (кратко)

| Ver | Highlights |
|-----|------------|
| **v0.8** | Briefing, World News, Audiobooks, deep night mode, ISS, NASA RSS, singleflight; **ритуал удалён** |
| v0.7 | ISS (код), NASA RSS, voice toggle, убрана карта МКС |
| v0.6 | Fix двойного TTS, cache v2, порт 3001 |
| v0.5 | Briefing, Voice, SV ticker, circadian |

---

## Roadmap

- [ ] ISS telemetry на узких экранах (свёрнутый режим)
- [ ] Readability: weather / calendar
- [ ] Album art (Radio Paradise)
- [ ] radar · gremlin · notifications

---

## Заметки для себя

- Demo-режим тихий, если ключ не задан; плашка «недоступен» — только когда ключ есть, API упал.
- Briefing не должен падать, если упала только погода.
- World News только `lg+`; на телефоне — только Space.
- Spacedevs 429: один dev, не спамить API; singleflight на briefing+space.
- Ночь: тумблер в шапке — **нулевой API**, статичный HUD; радио при включении — полный реактор.
- Audiobooks: отдельный YT IFrame; радио не трогаем.

---

## Связанные заметки (шаблон)

- [[Jarvis — API keys]]
- [[Jarvis — Troubleshooting]]
- [[Home lab]]

*Скопируй этот файл в vault Obsidian и поправь wikilinks под свою структуру.*
