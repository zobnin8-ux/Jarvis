"use client";

import { CircadianThemeController } from "@/components/CircadianThemeController";
import dynamic from "next/dynamic";
import { CoreResonanceProvider } from "@/context/CoreResonanceContext";
import { ModuleHealthProvider } from "@/context/ModuleHealthContext";
import { NightModeProvider } from "@/context/NightModeContext";

const DashboardLayout = dynamic(
  () => import("@/layout/DashboardLayout").then((mod) => mod.DashboardLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-bg">
        <div className="label animate-pulse">Initializing Command Center</div>
      </div>
    ),
  }
);

export function ClientDashboard() {
  return (
    <CoreResonanceProvider>
      <ModuleHealthProvider>
        <NightModeProvider>
          <CircadianThemeController />
          <DashboardLayout />
        </NightModeProvider>
      </ModuleHealthProvider>
    </CoreResonanceProvider>
  );
}
