export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const rest = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${weekday}\n${rest}`;
}

export function getGreeting(date: Date, name: string): string {
  const hour = date.getHours();
  let period = "Evening";

  if (hour < 12) period = "Morning";
  else if (hour < 17) period = "Afternoon";

  return `Good ${period}, ${name}`;
}

export interface CountdownParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
}

export function getCountdownParts(targetIso: string): CountdownParts {
  const totalMs = Math.max(0, new Date(targetIso).getTime() - Date.now());

  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
  }

  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

  return { totalMs, days, hours, minutes, seconds, isComplete: false };
}

export function formatCountdown(targetIso: string): string {
  const parts = getCountdownParts(targetIso);

  if (parts.isComplete) return "T-0";

  if (parts.days > 0) return `T-${parts.days}d ${parts.hours}h ${parts.minutes}m`;
  if (parts.hours > 0) return `T-${parts.hours}h ${parts.minutes}m`;
  return `T-${parts.minutes}m`;
}

export function formatSunset(timestamp: number, timezoneOffset: number): string {
  const local = new Date((timestamp + timezoneOffset) * 1000);
  return local.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
