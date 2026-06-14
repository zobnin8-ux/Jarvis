"use client";

import { useEffect, useState } from "react";

/** True only after client hydration — safe for entrance animations */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
