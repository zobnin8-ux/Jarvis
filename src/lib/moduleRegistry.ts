import type { ModuleConfig, ModuleId } from "@/types/modules";

const FUTURE_MODULES: ModuleId[] = [
  "radar",
  "gremlin",
  "notifications",
];

export const ACTIVE_MODULES: ModuleConfig[] = [
  { id: "weather", enabled: true, refreshInterval: 15 * 60 * 1000 },
  { id: "calendar", enabled: true, refreshInterval: 5 * 60 * 1000 },
  { id: "clock", enabled: true },
  { id: "space", enabled: true, refreshInterval: 30 * 60 * 1000 },
  { id: "ambient-audio", enabled: true },
  { id: "ai-briefing", enabled: true, refreshInterval: 60 * 60 * 1000 },
  { id: "silicon-valley", enabled: true, refreshInterval: 5 * 60 * 1000 },
];

export const RESERVED_MODULES: ModuleConfig[] = FUTURE_MODULES.map((id) => ({
  id,
  enabled: false,
}));

export function getModuleConfig(id: ModuleId): ModuleConfig | undefined {
  return [...ACTIVE_MODULES, ...RESERVED_MODULES].find((m) => m.id === id);
}
