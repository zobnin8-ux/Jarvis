# Personal Command Center

Futuristic personal mission control dashboard for 24/7 display on a dedicated monitor or TV.

**Current version:** v0.5

## Layout

```
┌─────────────┬──────────────────────┬─────────────┐
│   Weather   │   Clock + HUD Core   │  Calendar   │
│   (portal)  │   System Status      │  (schedule) │
├─────────────┴──────────────────────┴─────────────┤
│              Orbital Operations (Space)         │
├─────────────────────────────────────────────────┤
│  Ambient Audio          Personal Mission Control │
└─────────────────────────────────────────────────┘
```

## Modules

| Module | Description | Refresh |
|--------|-------------|---------|
| **Clock** | Time, date, greeting, HUD rings, system status | — |
| **Core Reactor** | Audio-reactive core glow (volume + beat), idle breath | live |
| **Weather** | Day status, mood accents, HUD icons; telemetry on expand | 15 min |
| **Calendar** | Week strip, NEXT event, today timeline, week expand | 5 min |
| **Space** | Next launch countdown; post-launch report (12 h hold) | 30 min / 90 s |
| **Ambient Audio** | Internet radio in footer; station + now playing | 30 s metadata |

### Radio stations

- SomaFM: Groove Salad, Drone Zone, Deep Space One
- Radio Paradise: Mellow Mix

Track metadata via SomaFM / Radio Paradise APIs. Radio Paradise also provides album cover URLs (not shown in UI yet).

### Space post-launch

After T-0 the module shows mission outcome, orbit/booster/payload details, and a news headline for SpaceX/NASA launches. Holds for 12 hours before switching to the next manifest.

## Quick Start

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and press **F11** for fullscreen.

### Dev notes

- If you see `Cannot find module './xxx.js'` or 500 errors: stop the dev server, delete `.next`, restart `npm run dev`.
- Avoid running `npm run build` and `npm run dev` at the same time.

## Environment Variables

Copy `.env.example` to `.env.local`:

| Variable | Description |
|----------|-------------|
| `OPENWEATHER_API_KEY` | [OpenWeather](https://openweathermap.org/api) API key |
| `WEATHER_LAT` / `WEATHER_LON` | Coordinates for weather |
| `NEXT_PUBLIC_WEATHER_CITY` | City label on weather panel (e.g. `San Jose`) |
| `GOOGLE_CALENDAR_ID` | Google Calendar ID to read |
| `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` | Path to service account JSON in project root |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Alternative: service account email |
| `GOOGLE_PRIVATE_KEY` | Alternative: private key (with `\n` for newlines) |
| `NEXT_PUBLIC_USER_NAME` | Name for greeting (default: Andrei) |

Without API keys, the dashboard uses demo data so you can preview the UI immediately.

## Architecture

```
src/
  app/api/          # Server routes: weather, calendar, space, radio/metadata
  components/       # WeatherModule, CalendarModule, ClockModule, SpaceModule, …
  config/           # radio stations, core reactor profiles, theme
  context/          # CoreResonanceProvider (radio + Web Audio analyser)
  hooks/            # useCoreResonanceVisuals, useIntervalFetch, useIdleMode
  layout/           # DashboardLayout
  lib/              # weatherMood, calendar, spaceLaunch, coreReactorEngine, …
  services/         # Client-side API fetchers
```

Reserved for future: Radar, Silicon Valley Events, Gremlin, Notifications, AI Briefing (`moduleRegistry.ts`).

## Tech Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion

## Planned / in discussion

- Move ambient audio player under the core (reduce footer dead space)
- Readability pass on weather telemetry and calendar empty states
- Album art for Radio Paradise in the player
