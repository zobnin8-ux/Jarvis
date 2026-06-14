# ТЗ для Cursor — Jarvis: голосовое общение (отдельный модуль)

Самостоятельное ТЗ. Реализуется ПОВЕРХ уже готового проекта Jarvis
(основные задачи — в `CURSOR_TASKS.md`, они уже в работе/сделаны).
Читать целиком перед началом. Стек: Next.js 15 · React 19 · TypeScript · Tailwind 4.

---

## 0. ЖЁСТКИЕ ОГРАНИЧЕНИЯ (нарушать нельзя)

**НЕ ТРОГАТЬ — готовые и неприкосновенные части:**
- **Ядро / Core Reactor:** `src/lib/coreReactorEngine.ts`, `src/config/coreReactor.ts`,
  `src/components/CentralHudRings.tsx`, `src/hooks/useCoreResonanceVisuals.ts`.
- **Эквалайзер / аудио-визуализация:** `src/lib/audioAnalysis.ts` и любая логика
  спектра/битов, завязанная на `AnalyserNode`.
- **Радио:** `src/config/radio.ts`, `src/services/radioService.ts`, `src/app/api/radio/**`,
  `src/components/AmbientAudioModule.tsx`, и радио-часть `src/context/CoreResonanceContext.tsx`
  (audio element, play/pause, станции, метаданные).

> КРИТИЧНО для голоса: TTS-аудио играть через ОТДЕЛЬНЫЙ `Audio`-элемент.
> НЕ подключать его к `AnalyserNode` реактора, НЕ маршрутизировать через радио-граф,
> НЕ трогать `CoreResonanceContext`. Микрофон и озвучка существуют полностью независимо
> от радио и эквалайзера.

**Контекст:** веб-приложение (вкладка браузера на компьютере). НЕ закладывать сценарий
ТВ/киоска.

**Конвенции:** строгий TypeScript без `any`; серверные ключи только в `app/api/**`;
типы — в `src/types/modules.ts`; HUD-стиль (тонкие линии, `.label`-типографика, Framer Motion);
не ломать сетку `DashboardLayout.tsx`.

---

## Выбранный стек голоса

- **Голосовой ВВОД** — бесплатный Web Speech API (`SpeechRecognition`), push-to-talk.
- **Мозг** — Claude API (`claude-sonnet-4-6`), ключ `ANTHROPIC_API_KEY`.
- **ОЗВУЧКА** — ElevenLabs. У пользователя ПЛАТНАЯ подписка и СВОЙ клонированный голос.
  Джарвис должен говорить ИМЕННО этим клонированным голосом. Фолбэк — системный
  `SpeechSynthesis`, если ElevenLabs недоступен.

---

## ОБЩЕЕ ТРЕБОВАНИЕ — graceful degradation (обязательно)

Подписка (Claude или ElevenLabs) может кончиться или ключ стать невалидным —
приложение НЕ должно падать. Два случая:
1. **Ключ не задан** → тихий demo-режим.
2. **Ключ задан, но сервис ответил ошибкой** (401 / 402 оплата / 429 лимит / 5xx /
   таймаут / сеть) → НЕ падать, показать спокойное сообщение **«Сервис временно
   недоступен»** (по-русски, в HUD-стиле).

Реализация:
- Каждый серверный роут оборачивает внешний вызов в try/catch и возвращает единый
  формат `{ ok: true, data } | { ok: false, reason: "unavailable", service: string }`.
  Наружу не летит необработанное исключение (никаких 500 + краш).
- Клиент по `ok:false` показывает плашку вместо контента, дашборд продолжает работать.

---

## Задача V1 — Голосовой ввод (push-to-talk)
Новый файл: `src/hooks/useVoiceInput.ts`.
- Обёртка над `window.SpeechRecognition || window.webkitSpeechRecognition`.
- Режим по умолчанию — **push-to-talk**: распознавание стартует по зажатию/клику кнопки
  (или горячей клавише, напр. удержание пробела), НЕ постоянное прослушивание.
  Wake-word на этом этапе НЕ делать.
- Язык `ru-RU` (с возможностью переопределить опцией).
- Вернуть `{ isListening, transcript, start, stop, supported }`.
- Если API не поддерживается (Firefox и т.п.) → `supported:false`, кнопка прячется,
  дашборд цел.

## Задача V2 — Роут запроса к Джарвису
Новый файл: `src/app/api/ask/route.ts`.
- Принимает `{ query: string }`.
- Если в проекте уже есть контекст брифинга (`src/app/api/briefing/route.ts` или
  `lib/weather.ts` / `lib/calendar.ts` / `lib/spaceLaunch.ts`) — переиспользовать его как
  контекст для ответа (погода/календарь/космос). Если контекста нет — отвечать без него.
- Отправляет в Claude (`claude-sonnet-4-6`) системный промпт:
  «Ты — Jarvis, лаконичный личный ассистент {NEXT_PUBLIC_USER_NAME}. Отвечай коротко,
  по делу, на русском.»
- Возвращает `{ ok: true, data: { text } }`. Без `ANTHROPIC_API_KEY` → короткий demo-ответ.
  При ошибке Claude → `{ ok: false, reason: "unavailable", service: "claude" }`.

## Задача V3 — Озвучка клонированным голосом (ElevenLabs) + фолбэк
Новые файлы: `src/app/api/tts/route.ts`, `src/hooks/useVoiceOutput.ts`.
- Роут `api/tts`: принимает `{ text }`, вызывает ElevenLabs Text-to-Speech, возвращает
  аудио (mp3) потоком.
  - Ключ: `ELEVENLABS_API_KEY`.
  - Голос: `ELEVENLABS_VOICE_ID` = voice_id клонированного голоса пользователя.
  - Модель: `eleven_multilingual_v2` (корректно произносит русский клоном).
  - `stability` / `similarity_boost` — в константах, дефолты под естественное звучание.
  - При ошибке/исчерпанной квоте → `{ ok: false, reason: "unavailable", service: "elevenlabs" }`
    (НЕ 500).
- Хук `useVoiceOutput`:
  - Если `api/tts` вернул аудио — играть mp3 через ОТДЕЛЬНЫЙ `new Audio()`
    (НЕ радио, НЕ реактор, НЕ AnalyserNode).
  - Если ключа нет или роут вернул `ok:false` — фолбэк на браузерный
    `SpeechSynthesis` (`ru-RU`), не падая.

## Задача V4 — UI-связка (VoiceConsole)
Новые файлы: `src/components/VoiceConsole.tsx`; правка `src/layout/DashboardLayout.tsx`.
- Кнопка-микрофон в HUD-стиле. Поток: зажал → говоришь (V1) → текст уходит в `api/ask`
  (V2) → ответ показывается текстом и озвучивается клоном (V3).
- Состояния: idle / listening / thinking / speaking — с визуальной индикацией.
- Разместить ненавязчиво, НЕ задевая центр (ядро) и не ломая сетку.
- Если `useVoiceInput.supported === false` — консоль скрыта целиком.

---

## Env-переменные (добавить в `.env.example`)
```
ANTHROPIC_API_KEY=        # для api/ask (может уже быть добавлен в основном ТЗ)
ELEVENLABS_API_KEY=       # ключ ElevenLabs
ELEVENLABS_VOICE_ID=      # voice_id клонированного голоса пользователя
```

## Порядок: V1 → V2 → V3 → V4. После всего — `npm run lint` и `npm run build`.

## Критерии приёмки
- [ ] Вопрос голосом → осмысленный ответ, озвученный КЛОНИРОВАННЫМ голосом (с ключами).
- [ ] Без `ELEVENLABS_API_KEY` (или при 401/429 от ElevenLabs) → ответ показан текстом
      и озвучен системным голосом; приложение не падает.
- [ ] Без `ANTHROPIC_API_KEY` (или при ошибке Claude) → demo/«временно недоступен»,
      не падает.
- [ ] В неподдерживаемом браузере кнопка скрыта, дашборд цел.
- [ ] Файлы ядра / эквалайзера / радио НЕ тронуты; TTS играет через отдельный Audio.
- [ ] `npm run lint` и `npm run build` без ошибок; нет `any`.
