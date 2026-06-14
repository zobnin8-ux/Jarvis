export interface WeatherData {
  temperature: number;
  feelsLike: number;
  highToday: number;
  lowToday: number;
  precipChance: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  sunrise: string;
  sunset: string;
  airQuality?: { aqi: number; label: string };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  icon: string;
  precipChance: number;
}

export interface DailyForecast {
  day: string;
  icon: string;
  high: number;
  low: number;
  description: string;
}

export type CalendarEventCategory = "work" | "call" | "personal" | "other";

export interface CalendarEvent {
  time: string;
  title: string;
  isAllDay: boolean;
  category: CalendarEventCategory;
  startIso: string;
  location?: string;
  joinUrl?: string;
}

export interface CalendarWeekDay {
  dateKey: string;
  weekdayLetter: string;
  dayNumber: number;
  isToday: boolean;
  hasEvents: boolean;
}

export interface CalendarDay {
  label: string;
  dateKey: string;
  events: CalendarEvent[];
}

export interface CalendarNextEvent {
  time: string;
  title: string;
  category: CalendarEventCategory;
  startIso: string;
  location?: string;
  joinUrl?: string;
}

export interface CalendarData {
  monthLabel: string;
  weekStrip: CalendarWeekDay[];
  today: CalendarDay;
  week: CalendarDay[];
  nextEvent: CalendarNextEvent | null;
  totalWeekEvents: number;
}

export type LaunchPhase = "countdown" | "liftoff" | "postlaunch";

export type LaunchOutcome =
  | "PENDING"
  | "SUCCESS"
  | "FAILURE"
  | "PARTIAL"
  | "UNKNOWN";

export interface LaunchDetailLine {
  label: string;
  value: string;
}

export interface SpaceLaunch {
  launchId: string;
  operator: string;
  rocket: string;
  mission: string;
  padName: string;
  latitude: number;
  longitude: number;
  countdown: string;
  status: "UPCOMING" | "LAUNCHED" | "SUCCESS" | "FAILURE" | "TBD";
  launchTime: string;
  phase: LaunchPhase;
  outcome: LaunchOutcome;
  detailLines: LaunchDetailLine[];
  newsHeadline?: string;
  newsSource?: string;
  postLaunchExpiresAt?: string;
  issPass?: IssPassInfo;
}

export interface IssPassInfo {
  time: string;
  durationMin: number;
  risetimeIso: string;
}

export interface BriefingData {
  text: string;
  generatedAt: string;
}

export type ModuleId =
  | "weather"
  | "calendar"
  | "clock"
  | "space"
  | "ambient-audio"
  | "radar"
  | "silicon-valley"
  | "gremlin"
  | "notifications"
  | "ai-briefing";

export interface ModuleConfig {
  id: ModuleId;
  enabled: boolean;
  refreshInterval?: number;
}
