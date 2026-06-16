"use client";

import { CircadianThemeController } from "@/components/CircadianThemeController";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CoreResonanceProvider } from "@/context/CoreResonanceContext";
import { ModuleHealthProvider } from "@/context/ModuleHealthContext";
import { NightModeProvider } from "@/context/NightModeContext";
import { DeviceLocationProvider } from "@/context/DeviceLocationContext";
import { AudiobooksProvider } from "@/context/AudiobooksContext";

function DashboardLoading() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setStale(true), 12_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <div className="label animate-pulse">Initializing Command Center</div>
      {stale && (
        <p className="max-w-md font-mono text-[0.62rem] leading-relaxed tracking-[0.08em] text-white/45 uppercase">
          Долго грузится — перезапусти Jarvis после build. Старый сервер на порту 3001
          отдаёт битые JS-файлы.
        </p>
      )}
    </div>
  );
}

const DashboardLayout = dynamic(
  () => import("@/layout/DashboardLayout").then((mod) => mod.DashboardLayout),
  {
    ssr: false,
    loading: () => <DashboardLoading />,
  }
);
export function ClientDashboard() {
  return (
    <CoreResonanceProvider>
      <ModuleHealthProvider>
        <NightModeProvider>
          <DeviceLocationProvider>
            <AudiobooksProvider>
              <CircadianThemeController />
              <DashboardLayout />
            </AudiobooksProvider>
          </DeviceLocationProvider>
        </NightModeProvider>
      </ModuleHealthProvider>
    </CoreResonanceProvider>
  );
}
