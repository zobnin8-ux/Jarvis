"use client";

import type { HudDrawerId } from "@/hooks/useNarrowHud";
import { HUD_DRAWER_LABELS } from "@/hooks/useNarrowHud";

const CHIP_ORDER: HudDrawerId[] = ["space", "briefing", "news", "iss"];

interface HudNavChipsProps {
  active: HudDrawerId | null;
  onSelect: (id: HudDrawerId) => void;
}

export function HudNavChips({ active, onSelect }: HudNavChipsProps) {
  return (
    <nav className="hud-nav-chips" aria-label="HUD panels">
      {CHIP_ORDER.map((id) => (
        <button
          key={id}
          type="button"
          className={`hud-nav-chip${active === id ? " is-active" : ""}`}
          onClick={() => onSelect(id)}
        >
          {HUD_DRAWER_LABELS[id]}
        </button>
      ))}
    </nav>
  );
}
