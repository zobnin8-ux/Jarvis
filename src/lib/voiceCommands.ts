export type RadioVoiceCommand = "play" | "pause";

const RADIO_PLAY =
  /(включи|включить|запусти|запустить|поставь|поставить|играй).{0,30}(радио|музык|музыку)|(радио|музык|музыку).{0,20}(включи|включить|запусти)/iu;

const RADIO_PAUSE =
  /(выключи|выключить|останови|остановить|пауза|стоп).{0,30}(радио|музык|музыку)|(радио|музык|музыку).{0,20}(выключи|останови|пауза|стоп)/iu;

const SHORT_COMMAND =
  /(какая\s+погода|^погода[.!?]?$|температура|сколько\s+градусов|включи\s+радио|выключи\s+радио|включи\s+музык|есть\s+что[\s-]?срочн|срочн\w*\s+в\s+почт|что\s+в\s+почт|что\s+в\s+мире|новост|какой\s+час)/iu;

export function detectRadioVoiceAction(query: string): RadioVoiceCommand | null {
  const q = query.trim();
  if (!q) return null;
  if (RADIO_PAUSE.test(q)) return "pause";
  if (RADIO_PLAY.test(q)) return "play";
  return null;
}

export function isVoiceShortCommand(query: string): boolean {
  return SHORT_COMMAND.test(query.trim());
}
