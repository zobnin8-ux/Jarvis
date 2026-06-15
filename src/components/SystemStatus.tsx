"use client";

import { useSystemStatus } from "@/hooks/useSystemStatus";

function stateLabel(
  feedId: string,
  state: "online" | "stale" | "offline"
): string {
  if (state === "stale") return "Устарело";
  if (state === "offline") return "Offline";
  return feedId === "calendar" ? "Synced" : "Online";
}

export function SystemStatus() {
  const status = useSystemStatus();

  if (!status) return null;

  const allOnline = status.feeds.every((f) => f.state === "online");
  const anyOffline = status.feeds.some((f) => f.state === "offline");

  const heading = allOnline
    ? "System Online"
    : anyOffline
      ? "System Partial"
      : "System Degraded";

  return (
    <div className="hud-status">
      <div className="hud-status-heading">{heading}</div>

      <ul className="hud-status-feeds">
        {status.feeds.map((feed) => (
          <li key={feed.id} className="hud-status-row">
            <span
              className={`hud-status-dot is-${feed.state}`}
              aria-hidden
            />
            <span>
              {feed.label}{" "}
              <span
                className={
                  feed.state === "online"
                    ? "hud-status-value"
                    : feed.state === "stale"
                      ? "hud-status-stale"
                      : "hud-status-offline"
                }
              >
                {stateLabel(feed.id, feed.state)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="hud-status-update" suppressHydrationWarning>
        Last Update {status.lastUpdate}
      </div>
    </div>
  );
}
