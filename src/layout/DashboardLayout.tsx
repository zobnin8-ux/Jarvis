"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AmbientBackground } from "@/components/background/AmbientBackground";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";
import { WeatherModule } from "@/components/WeatherModule";
import { CalendarModule } from "@/components/CalendarModule";
import { ClockModule } from "@/components/ClockModule";
import { SpaceModule } from "@/components/SpaceModule";
import { BriefingModule } from "@/components/BriefingModule";
import { AmbientAudioModule } from "@/components/AmbientAudioModule";
import { SiliconValleyModule } from "@/components/SiliconValleyModule";
import { THEMES, THEME } from "@/config/theme";
import { useIdleMode } from "@/hooks/useIdleMode";
import { useMounted } from "@/hooks/useMounted";
import { VoiceConsole } from "@/components/VoiceConsole";

interface DashboardLayoutProps {
  futureSlot?: ReactNode;
}

export function DashboardLayout({ futureSlot }: DashboardLayoutProps) {
  const mounted = useMounted();
  const isIdle = useIdleMode(45_000);

  return (
    <div
      className={`command-shell relative flex h-screen w-screen flex-col overflow-hidden bg-bg p-4 md:p-6 lg:p-8${isIdle ? " idle-mode" : ""}`}
      suppressHydrationWarning
    >
      <AmbientBackground />
      <div className="scanline" />

      <motion.header
        initial={mounted ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="layer-ui relative z-20 mb-2 flex shrink-0 items-center justify-between px-2"
      >
        <div className="label">Command Center</div>
        <div className="label text-white/25">
          {THEMES[THEME].label} · v0.5
        </div>
      </motion.header>

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
          <ModuleErrorBoundary name="Calendar">
            <CalendarModule />
          </ModuleErrorBoundary>
        </div>

        <div className="zone-bottom min-h-0 lg:col-span-12 lg:row-start-2">
          <ModuleErrorBoundary name="Space">
            <SpaceModule />
          </ModuleErrorBoundary>
        </div>

        {futureSlot && (
          <div className="hidden lg:col-span-12">{futureSlot}</div>
        )}
      </div>

      <motion.footer
        initial={mounted ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="layer-ui relative z-20 mt-3 flex shrink-0 flex-col gap-2"
      >
        <ModuleErrorBoundary name="Silicon Valley">
          <SiliconValleyModule />
        </ModuleErrorBoundary>
        <div className="flex items-end justify-between gap-4">
        <AmbientAudioModule />
        <div className="flex-1 pb-1 text-center">
          <div className="text-[10px] tracking-[0.4em] text-white/15 uppercase">
            Personal Mission Control
          </div>
        </div>
        <div className="hidden w-[min(100%,280px)] sm:flex sm:justify-end">
          <VoiceConsole />
        </div>
        </div>
      </motion.footer>
    </div>
  );
}
