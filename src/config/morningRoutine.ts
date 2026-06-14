export const RITUAL_WAKE_PHRASE = "привет джарвис";

export type RoutineStep =
  | { kind: "say"; text: string }
  | { kind: "exercise"; name: string; durationSec: number; countIn?: boolean };

/** Лёгкая утренняя разминка ~3–5 мин */
export const MORNING_EXERCISE: RoutineStep[] = [
  {
    kind: "say",
    text: "Слушай тело — не через боль. Если что-то не так, остановись.",
  },
  {
    kind: "exercise",
    name: "Круговые движения плечами",
    durationSec: 30,
    countIn: true,
  },
  {
    kind: "exercise",
    name: "Приседания",
    durationSec: 45,
    countIn: true,
  },
  {
    kind: "exercise",
    name: "Наклоны в стороны",
    durationSec: 30,
    countIn: false,
  },
  {
    kind: "exercise",
    name: "Планка",
    durationSec: 30,
    countIn: true,
  },
];

export const RITUAL_MOOD_FALLBACK =
  "Понял. Начнём день спокойно, в своём темпе.";

export const RITUAL_CLOSING_FALLBACK =
  "Отличное утро. День твой — действуй уверенно.";
