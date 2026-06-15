"use client";

import { motion } from "framer-motion";
import { useCallback, useState, type ReactNode } from "react";
import { AmbientBackground } from "@/components/background/AmbientBackground";
import { BriefingTeaser } from "@/components/BriefingTeaser";
import { HudDrawer } from "@/components/HudDrawer";
import { HudNavChips } from "@/components/HudNavChips";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";
import { WeatherModule } from "@/components/WeatherModule";
import { CommsModule } from "@/components/CommsModule";
import { ClockCore } from "@/components/ClockCore";
import { ClockMeta } from "@/components/ClockMeta";
import { ClockModule } from "@/components/ClockModule";
import { SpaceModule } from "@/components/SpaceModule";
import { BriefingModule } from "@/components/BriefingModule";
import { AmbientAudioModule } from "@/components/AmbientAudioModule";
import { AudiobookPlayer } from "@/components/AudiobookPlayer";
import { SiliconValleyModule } from "@/components/SiliconValleyModule";
import { THEMES, THEME } from "@/config/theme";
import { useIdleMode } from "@/hooks/useIdleMode";
import { useNightMode } from "@/context/NightModeContext";
import { NightModeToggle } from "@/components/NightModeToggle";
import { useMounted } from "@/hooks/useMounted";
import {
  HUD_DRAWER_LABELS,
  useNarrowHud,
  type HudDrawerId,
} from "@/hooks/useNarrowHud";
import { VoiceConsole } from "@/components/VoiceConsole";
import { IssTelemetryModule } from "@/components/IssTelemetryModule";
import { WorldNewsModule } from "@/components/WorldNewsModule";

interface DashboardLayoutProps {
  futureSlot?: ReactNode;
}

export function DashboardLayout({ futureSlot }: DashboardLayoutProps) {
  const mounted = useMounted();
  const isIdle = useIdleMode(45_000);
  const { isNightMode } = useNightMode();
  const isNarrow = useNarrowHud();
  const [drawer, setDrawer] = useState<HudDrawerId | null>(null);

  const toggleDrawer = useCallback((id: HudDrawerId) => {
    setDrawer((current) => (current === id ? null : id));
  }, []);

  const closeDrawer = useCallback(() => setDrawer(null), []);

  const shellClass = [
    "command-shell relative flex h-screen w-screen flex-col overflow-hidden bg-bg p-3 md:p-4 lg:p-8",
    isNarrow ? "is-narrow" : "",
    isIdle ? "idle-mode" : "",
    isNightMode ? "night-mode" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass} suppressHydrationWarning>
      <AmbientBackground />
      <div className="scanline" />

      <motion.header
        initial={mounted ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="layer-ui relative z-20 mb-2 flex shrink-0 items-center justify-between gap-2 px-1 md:px-2"
      >
        <div className="label shrink-0">Command Center</div>
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          {isNarrow && (
            <HudNavChips active={drawer} onSelect={toggleDrawer} />
          )}
          <NightModeToggle />
          <div className="label hidden shrink-0 text-white/25 sm:block">
            {THEMES[THEME].label} · v0.10
          </div>
        </div>
      </motion.header>

      {isNarrow ? (
        <div className="narrow-hud layer-ui relative z-20 min-h-0 flex-1">
          <div className="narrow-frame">
            <div className="narrow-main-row">
              <div className="narrow-col narrow-weather-col narrow-weather-panel panel panel-glow">
                <ModuleErrorBoundary name="Weather">
                  <WeatherModule compact />
                </ModuleErrorBoundary>
              </div>

              <div className="narrow-col narrow-clock-col zone-center layer-hud">
                <div className="center-spotlight" aria-hidden />
                <div className="narrow-center-stack">
                  <ClockMeta align="center" showStatus={false} className="narrow-center-meta" />
                  <ModuleErrorBoundary name="Clock">
                    <ClockCore className="narrow-center-core" />
                  </ModuleErrorBoundary>
                </div>
              </div>

              <div className="narrow-col narrow-comms-col">
                <ModuleErrorBoundary name="Comms">
                  <CommsModule compact />
                </ModuleErrorBoundary>
              </div>
            </div>

            <BriefingTeaser onExpand={() => toggleDrawer("briefing")} />
          </div>
        </div>
      ) : (
        <div className="layer-ui relative z-20 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-[1fr_auto] lg:gap-5">
          <div className="zone-side zone-side-left zone-side-weather flex min-h-0 flex-col items-stretch gap-4 lg:col-span-3 lg:row-start-1">
            <ModuleErrorBoundary name="Weather">
              <WeatherModule />
            </ModuleErrorBoundary>
            <ModuleErrorBoundary name="Briefing">
              <BriefingModule />
            </ModuleErrorBoundary>
          </div>

          <div className="zone-center layer-hud min-h-[280px] lg:col-span-6 lg:row-start-1">
            <div className="center-spotlight" aria-hidden />
            <ModuleErrorBoundary name="Clock">
              <ClockModule />
            </ModuleErrorBoundary>
          </div>

          <div className="zone-side zone-side-right min-h-[200px] lg:col-span-3 lg:row-start-1">
            <ModuleErrorBoundary name="Comms">
              <CommsModule />
            </ModuleErrorBoundary>
          </div>

          <div className="zone-bottom min-h-0 lg:col-span-12 lg:row-start-2">
            <div className="orbital-operations-row flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5">
              <div className="orbital-operations-main min-w-0 flex-1">
                <ModuleErrorBoundary name="Space">
                  <SpaceModule />
                </ModuleErrorBoundary>
              </div>
              <div className="orbital-operations-news hidden lg:block lg:w-[min(100%,340px)] xl:w-[min(100%,380px)] shrink-0">
                <ModuleErrorBoundary name="World News">
                  <WorldNewsModule />
                </ModuleErrorBoundary>
              </div>
            </div>
          </div>

          {futureSlot && (
            <div className="hidden lg:col-span-12">{futureSlot}</div>
          )}
        </div>
      )}

      <motion.footer
        initial={mounted ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="layer-ui relative z-20 mt-2 flex shrink-0 flex-col gap-2"
      >
        {!isNarrow && (
          <ModuleErrorBoundary name="Silicon Valley">
            <SiliconValleyModule />
          </ModuleErrorBoundary>
        )}
        <div className="footer-controls flex items-end justify-between gap-2 md:gap-4">
          <div className="footer-controls-left min-w-0 flex-1">
            <div className="footer-audio-row">
              <AmbientAudioModule />
              <ModuleErrorBoundary name="Audiobooks">
                <AudiobookPlayer />
              </ModuleErrorBoundary>
            </div>
          </div>
          {!isNarrow && (
            <div className="footer-telemetry hidden min-w-0 flex-1 md:flex md:justify-center">
              <ModuleErrorBoundary name="ISS Telemetry">
                <IssTelemetryModule />
              </ModuleErrorBoundary>
            </div>
          )}
          <div
            className={
              isNarrow
                ? "flex w-[min(100%,240px)] shrink-0 justify-end"
                : "hidden w-[min(100%,280px)] sm:flex sm:justify-end"
            }
          >
            <VoiceConsole />
          </div>
        </div>
      </motion.footer>

      <HudDrawer
        open={drawer !== null}
        title={drawer ? HUD_DRAWER_LABELS[drawer] : ""}
        onClose={closeDrawer}
      >
        {drawer === "space" && (
          <ModuleErrorBoundary name="Space">
            <SpaceModule />
          </ModuleErrorBoundary>
        )}
        {drawer === "briefing" && (
          <ModuleErrorBoundary name="Briefing">
            <BriefingModule />
          </ModuleErrorBoundary>
        )}
        {drawer === "news" && (
          <ModuleErrorBoundary name="World News">
            <WorldNewsModule />
          </ModuleErrorBoundary>
        )}
        {drawer === "iss" && (
          <ModuleErrorBoundary name="ISS Telemetry">
            <IssTelemetryModule />
          </ModuleErrorBoundary>
        )}
      </HudDrawer>
    </div>
  );
}
