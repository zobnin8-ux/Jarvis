/** Shutdown production server when no Jarvis browser tab is open. */

const HEARTBEAT_INTERVAL_MS = 8_000;
const SESSION_STALE_MS = HEARTBEAT_INTERVAL_MS * 2;
const EXIT_GRACE_MS = 5_000;

const sessions = new Map<string, number>();

let sweepTimer: ReturnType<typeof setInterval> | null = null;
let exitTimer: ReturnType<typeof setTimeout> | null = null;

export function isLifecycleShutdownEnabled(): boolean {
  if (process.env.JARVIS_LIFECYCLE_SHUTDOWN === "0") return false;
  if (process.env.JARVIS_LIFECYCLE_SHUTDOWN === "1") return true;
  return process.env.NODE_ENV === "production";
}

function pruneStaleSessions(now = Date.now()): void {
  for (const [id, lastSeen] of sessions) {
    if (now - lastSeen > SESSION_STALE_MS) {
      sessions.delete(id);
    }
  }
}

function scheduleShutdown(): void {
  if (!isLifecycleShutdownEnabled()) return;

  if (sessions.size > 0) {
    if (exitTimer) {
      clearTimeout(exitTimer);
      exitTimer = null;
    }
    return;
  }

  if (exitTimer) return;

  exitTimer = setTimeout(() => {
    exitTimer = null;
    pruneStaleSessions();
    if (sessions.size === 0 && isLifecycleShutdownEnabled()) {
      console.log("[jarvis] browser closed — shutting down server");
      process.exit(0);
    }
  }, EXIT_GRACE_MS);
}

function ensureSweep(): void {
  if (sweepTimer || !isLifecycleShutdownEnabled()) return;
  sweepTimer = setInterval(() => {
    pruneStaleSessions();
    scheduleShutdown();
  }, HEARTBEAT_INTERVAL_MS);
}

export type LifecycleAction = "register" | "heartbeat" | "unregister";

export function handleLifecycle(
  action: LifecycleAction,
  sessionId: string | undefined
): void {
  if (!isLifecycleShutdownEnabled()) return;
  if (!sessionId) return;

  const now = Date.now();

  if (action === "unregister") {
    sessions.delete(sessionId);
    scheduleShutdown();
    return;
  }

  sessions.set(sessionId, now);
  ensureSweep();

  if (action === "register") {
    if (exitTimer) {
      clearTimeout(exitTimer);
      exitTimer = null;
    }
  }
}
