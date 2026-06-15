"use client";

import { ClockCore } from "@/components/ClockCore";
import { ClockMeta } from "@/components/ClockMeta";

export function ClockModule() {
  return (
    <ClockCore>
      <ClockMeta />
    </ClockCore>
  );
}
