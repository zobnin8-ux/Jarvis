"use client";

export type CommsTabId = "calendar" | "mail";

interface CommsTabsProps {
  active: CommsTabId;
  unreadCount: number;
  onChange: (tab: CommsTabId) => void;
}

function formatBadge(count: number): string | null {
  if (count <= 0) return null;
  if (count > 99) return "99+";
  return String(count);
}

export function CommsTabs({ active, unreadCount, onChange }: CommsTabsProps) {
  const badge = formatBadge(unreadCount);

  return (
    <div className="comms-tabs" role="tablist" aria-label="Communications">
      <button
        type="button"
        role="tab"
        aria-selected={active === "calendar"}
        className={`comms-tab${active === "calendar" ? " is-active" : ""}`}
        onClick={() => onChange("calendar")}
      >
        CALENDAR
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "mail"}
        className={`comms-tab${active === "mail" ? " is-active" : ""}`}
        onClick={() => onChange("mail")}
      >
        <span>MAIL</span>
        {badge && <span className="comms-tab-badge">{badge}</span>}
      </button>
    </div>
  );
}
