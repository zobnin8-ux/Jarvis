import { NextRequest, NextResponse } from "next/server";
import {
  handleLifecycle,
  isLifecycleShutdownEnabled,
  type LifecycleAction,
} from "@/lib/server/lifecycle";

const ACTIONS = new Set<LifecycleAction>([
  "register",
  "heartbeat",
  "unregister",
]);

export async function POST(request: NextRequest) {
  if (!isLifecycleShutdownEnabled()) {
    return NextResponse.json({ ok: true, enabled: false });
  }

  let body: { action?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const action = body.action as LifecycleAction;
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  handleLifecycle(action, body.sessionId);
  return NextResponse.json({ ok: true, enabled: true });
}
