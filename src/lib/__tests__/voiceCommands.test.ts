import { describe, expect, it } from "vitest";
import { detectRadioVoiceAction, isVoiceShortCommand } from "@/lib/voiceCommands";

describe("voiceCommands", () => {
  it("detects radio play", () => {
    expect(detectRadioVoiceAction("включи радио")).toBe("play");
    expect(detectRadioVoiceAction("поставь музыку")).toBe("play");
  });

  it("detects radio pause", () => {
    expect(detectRadioVoiceAction("выключи радио")).toBe("pause");
    expect(detectRadioVoiceAction("пауза музыка")).toBe("pause");
  });

  it("flags short commands", () => {
    expect(isVoiceShortCommand("какая погода")).toBe(true);
    expect(isVoiceShortCommand("что в мире")).toBe(true);
    expect(isVoiceShortCommand("есть что срочное в почте")).toBe(true);
    expect(isVoiceShortCommand("расскажи подробно про мой день")).toBe(false);
  });
});
