# ТЗ для Cursor — Jarvis / Personal Command Center

Документ с задачами для реализации. Читать целиком перед началом работы.
Проект: Next.js 15 · React 19 · TypeScript · Tailwind 4 · Framer Motion.

---

## 0. ЖЁСТКИЕ ОГРАНИЧЕНИЯ (нарушать нельзя)

**НЕ ТРОГАТЬ следующие части — они готовы и неприкосновенны:**

- **Ядро / Core Reactor:** `src/lib/coreReactorEngine.ts`, `src/config/coreReactor.ts`,
  `src/components/CentralHudRings.tsx`, `src/hooks/useCoreResonanceVisuals.ts`.
- **Эквалайзер / аудио-визуализация:** `src/lib/audioAnalysis.ts` и любая логика
  спектра/битов/визуала, завязанная на AnalyserNode.
- **Радио:** `src/config/radio.ts`, `src/services/radioService.ts`,
  `src/app/api/radio/**`, `src/components/AmbientAudioModule.tsx`, а также радио-часть
  `src/context/CoreResonanceContext.tsx` (audio element, play/pause, станции, метаданные).

Если задача формально требует правки этих файлов — НЕ делать, вынести в отдельный
адаптер/обёртку и описать в PR, что и почему не тронуто.

**Контекст использования:** это веб-приложение (вкладка браузера на компьютере).
НЕ закладывать сценарий ТВ/24-7-киоска: никакой защиты от выгорания, pixel-shift,
presence-детекции через камеру и т.п.

**Конвенции проекта:**
- Все модули должны работать с demo-данными, если нет API-ключей (как сейчас).
- TypeScript строгий, без `any`. Типы данных — в `src/types/modules.ts`.
- Серверные ключи — только в API-роутах (`src/app/api/**`), не на клиенте.
  Клиентские значения — через `NEXT_PUBLIC_*`.
- Стиль HUD: тонкие линии, label-типографика (`.label`), приглушённые цвета,
  анимации через Framer Motion. Не ломать общую сетку `DashboardLayout.tsx`.

---

## ОБЩЕЕ ТРЕБОВАНИЕ — graceful degradation внешних сервисов

Применяется ко ВСЕМ интеграциям с платными/внешними API (Claude, ElevenLabs,
OpenWeather, Google Calendar, космос и т.д.).

Подписка может в любой момент кончиться или ключ стать невалидным. Это НИКОГДА
не должно ронять приложение. Различать два случая:

1. **Ключ не задан** → тихий demo-режим (как уже принято в проекте).
2. **Ключ задан, но сервис ответил ошибкой** (401 невалидный ключ, 402 оплата,
   429 лимит/квота, 5xx, таймаут, сеть) → НЕ падать, НЕ показывать demo молча,
   а вернуть управляемый статус и показать пользователю спокойное сообщение
   вида **«Сервис временно недоступен»** (по-русски), в HUD-стиле.

Реализация:
- Каждый серверный роут оборачивает вызов внешнего API в try/catch и возвращает
  единый формат: `{ ok: true, data } | { ok: false, reason: "unavailable", service: string }`.
  Никогда не бросать необработанное исключение наружу (иначе 500 + краш модуля).
- Клиент по `ok:false` рендерит компактную плашку «{Сервис} временно недоступен»
  вместо контента модуля; остальной дашборд продолжает работать.
- Никаких «белых экранов» и зависаний при истёкшей подписке — только сообщение.

Критерий приёмки: подменить ключ на заведомо невалидный (или сэмулировать 429) —
приложение продолжает работать, соответствующий блок показывает «временно недоступен».

---

## Карта архитектуры (текущая)

```
src/
  app/api/        weather, calendar, space, radio/metadata   # серверные роуты
  components/     WeatherModule, CalendarModule, ClockModule, SpaceModule, SystemStatus, ...
  config/         theme, radio, coreReactor
  context/        CoreResonanceProvider (радио + Web Audio)
  hooks/          useIntervalFetch, useIdleMode, useSystemStatus, useMounted, ...
  layout/         DashboardLayout
  lib/            weather, calendar, spaceLaunch, weatherMood, coreReactorEngine, ...
  services/       client-side fetchers (weatherService, calendarService, spaceService, ...)
  types/          modules.ts
```

Реестр модулей: `src/lib/moduleRegistry.ts`. Зарезервированы (enabled:false):
`radar`, `silicon-valley`, `gremlin`, `notifications`, `ai-briefing`.

---

## ПРИОРИТЕТ 1 — Надёжность (resilience)

### Задача 1.1 — Retry + кэш «последнего хорошего значения» в useIntervalFetch
Файл: `src/hooks/useIntervalFetch.ts` (трогать можно — это НЕ радио/ядро).

Текущий хук при ошибке fetch теряет данные и не повторяет попытку. Доработать:
- При ошибке оставлять предыдущие `data` (не зануляять), выставлять флаг устаревания.
- Добавить retry с экспоненциальным backoff (например 3 попытки: 2с, 8с, 30с),
  не чаще основного `interval`.
- Кэшировать последнее успешное значение в `localStorage` (ключ передаётся опцией
  `cacheKey?`), читать его при первом маунте до первого fetch.
- Вернуть из хука: `{ data, loading, error, isStale, lastUpdated }`
  где `lastUpdated: number | null` (timestamp последнего успешного ответа).

Критерии приёмки:
- При обрыве сети модуль показывает прошлые данные + метку устаревания, не пустоту.
- После восстановления сети данные обновляются автоматически.
- Существующие вызовы хука не сломаны (новые поля опциональны, имеют дефолты).

### Задача 1.2 — ErrorBoundary на каждый модуль
Новый файл: `src/components/ui/ModuleErrorBoundary.tsx` (React class error boundary).

- Оборачивает дочерний модуль; при выбросе показывает компактную HUD-заглушку
  («MODULE OFFLINE» + название), не роняя остальной дашборд.
- Обернуть в `DashboardLayout.tsx` каждый модуль: Weather, Calendar, Clock, Space.
  (AmbientAudio НЕ трогать.)

Критерии приёмки: искусственная ошибка в одном модуле не гасит остальные.

### Задача 1.3 — Реальный heartbeat в SystemStatus
Файлы: `src/hooks/useSystemStatus.ts`, `src/components/SystemStatus.tsx`.

- Собирать статус по модулям: online / stale / offline + время последнего успешного
  обновления (использовать `lastUpdated`/`isStale` из задачи 1.1).
- Отрисовать компактный индикатор (точки/линии в стиле HUD).

Критерии приёмки: при падении API соответствующий модуль виден как stale/offline.

---

## ПРИОРИТЕТ 2 — AI-брифинг (новый модуль `ai-briefing`)

### Задача 2.1 — Серверный роут брифинга
Новый файл: `src/app/api/briefing/route.ts`.

- Серверно собрать сводку из уже существующих источников: текущая погода
  (`lib/weather.ts`), ближайшие события (`lib/calendar.ts` / calendar route),
  ближайший пуск (`lib/spaceLaunch.ts`). Переиспользовать существующую логику,
  НЕ дублировать запросы к радио.
- Отправить компактный промпт в Claude API и вернуть `{ text: string, generatedAt: string }`.
- Модель: по умолчанию `claude-sonnet-4-6` (баланс цены/качества прозы);
  допускается `claude-haiku-4-5` для экономии. Ключ — `ANTHROPIC_API_KEY` (серверный).
- Кэшировать результат на 3 часа (in-memory или Next `revalidate`), чтобы не дёргать
  API на каждый рендер.
- Без ключа `ANTHROPIC_API_KEY` — отдавать детерминированный demo-брифинг,
  собранный шаблоном из тех же данных (без вызова Claude).

Промпт (ориентир): «Ты — Jarvis, лаконичный личный ассистент. Составь утренний
брифинг в 2-3 предложениях для {NEXT_PUBLIC_USER_NAME} на основе данных: погода,
календарь, ближайший пуск. Тон спокойный, по делу, без воды.»

### Задача 2.2 — Клиентский модуль и регистрация
Файлы: `src/services/briefingService.ts`, `src/components/BriefingModule.tsx`,
`src/lib/moduleRegistry.ts`, `src/types/modules.ts`, `src/layout/DashboardLayout.tsx`.

- Тип `BriefingData { text: string; generatedAt: string }` в `types/modules.ts`.
- Сервис-фетчер + использование `useIntervalFetch` (refresh, напр., раз в час).
- Компонент в HUD-стиле: заголовок «BRIEFING», текст, тихая метка времени.
- В `moduleRegistry.ts` перенести `ai-briefing` из RESERVED в ACTIVE (enabled:true,
  refreshInterval подобрать).
- Разместить модуль в layout аккуратно, не ломая сетку и не задевая центр (ядро).

Критерии приёмки: модуль показывает осмысленный брифинг с реальным ключом и
demo-брифинг без ключа.

---

> Голосовое общение (ввод + озвучка клонированным голосом ElevenLabs) вынесено
> в ОТДЕЛЬНОЕ ТЗ: `VOICE_TASKS.md`. Здесь его НЕ реализовывать.

---

## ПРИОРИТЕТ 3 — Углубление существующих модулей

> Примечание: в `WeatherData` уже есть `feelsLike`, `precipChance`, `sunset`,
> `humidity`, `windSpeed`, `hourly`, `daily`. Не дублировать — добавлять недостающее.

### Задача 3.1 — Weather: качество воздуха + восход + таймлайн осадков
Файлы: `src/app/api/weather/route.ts`, `src/lib/weather.ts`,
`src/types/modules.ts`, `src/components/WeatherModule.tsx`.

- Добавить в `WeatherData`: `sunrise: string`, `airQuality?: { aqi: number; label: string }`,
  и в `HourlyForecast` — `precipChance: number`.
- AQI тянуть из OpenWeather Air Pollution API тем же ключом.
- В UI (на раскрытии телеметрии) показать восход/закат, AQI и мини-таймлайн осадков
  на ближайшие часы. Без ключа — demo-значения.

### Задача 3.2 — Calendar: join-ссылки и «пора выходить»
Файлы: `src/lib/calendar.ts`, `src/types/modules.ts`,
`src/components/CalendarModule.tsx`, `src/app/api/calendar/route.ts`.

- Парсить из события ссылку на видеозвонок (Zoom/Meet/Teams) и `location`;
  добавить в `CalendarEvent` опциональные `joinUrl?`, `location?`.
- В блоке NEXT event показывать ссылку (если есть) и относительный отсчёт «через N мин».
- Не открывать ссылки автоматически — только отображать.

### Задача 3.3 — Space: пролёты МКС над координатами пользователя
Файлы: новый `src/lib/issPass.ts`, `src/app/api/space/route.ts` (расширить ответ),
`src/types/modules.ts`, `src/components/SpaceModule.tsx`.

- По `WEATHER_LAT` / `WEATHER_LON` получить ближайшие видимые пролёты МКС
  (любой публичный API пролётов). Показать «МКС над тобой в HH:MM, ~N мин».
- Не ломать существующую логику фаз пуска (`spaceLaunch.ts`). Это дополнительный блок.

---

## ПРИОРИТЕТ 4 — Характер (опционально)

### Задача 4.1 — Циркадная тема
Файлы: `src/config/theme.ts`, точка инициализации темы.
- Палитра/акценты плавно меняются по времени суток (тёплые ночью, холоднее днём).
- Реализовать так, чтобы НЕ затрагивать визуал ядра/эквалайзера.

### Задача 4.2 — Модуль `silicon-valley` (тикер)
Файлы: `src/app/api/sv-events/route.ts`, `src/services/svService.ts`,
`src/components/SiliconValleyModule.tsx`, `moduleRegistry.ts`.
- Бегущая строка снизу: локальные tech-события и/или тикеры акций.
- Перенести `silicon-valley` из RESERVED в ACTIVE. Demo-данные без ключей.

---

## Порядок выполнения

1. Приоритет 1 (1.1 → 1.2 → 1.3) — фундамент надёжности.
2. Приоритет 2 (2.1 → 2.2) — AI-брифинг.
3. Приоритет 3 по одной задаче.
4. Приоритет 4 — по желанию.

Голос — отдельно, по `VOICE_TASKS.md` (после готовности брифинга).

После каждого приоритета: `npm run lint` и `npm run build` должны проходить.
Каждую задачу — отдельным коммитом с понятным сообщением.

## Чеклист перед коммитом
- [ ] Не изменены файлы ядра / эквалайзера / радио (раздел 0).
- [ ] Нет сценариев ТВ/киоска.
- [ ] Работает с demo-данными без ключей.
- [ ] При невалидном/истёкшем ключе (401/402/429) — не падает, показывает
      «временно недоступен» (см. «ОБЩЕЕ ТРЕБОВАНИЕ»).
- [ ] `npm run lint` и `npm run build` — без ошибок.
- [ ] Нет `any`, типы — в `types/modules.ts`.
