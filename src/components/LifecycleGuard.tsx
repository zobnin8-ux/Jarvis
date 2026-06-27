"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 8_000;

function postLifecycle(action: string, sessionId: string): void {
  const payload = JSON.stringify({ action, sessionId });
  if (
    (action === "unregister" || action === "heartbeat") &&
    typeof navigator.sendBeacon === "function"
  ) {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon("/api/lifecycle", blob)) return;
  }
  void fetch("/api/lifecycle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: action === "unregister",
  });
}

export function LifecycleGuard() {
  useEffect(() => {
    const sessionId = crypto.randomUUID();
    postLifecycle("register", sessionId);

    const heartbeat = window.setInterval(() => {
      postLifecycle("heartbeat", sessionId);
    }, HEARTBEAT_MS);

    const onPageHide = () => postLifecycle("unregister", sessionId);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("pagehide", onPageHide);
      postLifecycle("unregister", sessionId);
    };
  }, []);

  return null;
}
