// ---------------------------------------------------------------------------
// SeansWallApp – Shared types
// ---------------------------------------------------------------------------

/** A calendar event parsed from CalDAV / iCalendar data. */
export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  calendarName: string;
  color: string;
  allDay: boolean;
}

/** A single hourly observation from Met Éireann observations API. */
export interface WeatherObservation {
  name: string;
  temperature: string;
  symbol: string;
  weatherDescription: string;
  windSpeed: string;
  windGust: string;
  cardinalWindDirection: string;
  windDirection: number;
  humidity: string;
  rainfall: string;
  pressure: string;
  dayName: string;
  date: string;
  reportTime: string;
}

/** A single forecast data point parsed from Met Éireann XML forecast. */
export interface WeatherForecast {
  time: Date;
  temperature: number;
  symbolId: string;
  symbolNumber: number;
  precipitation: number;
  windSpeedMps: number;
  windDirectionName: string;
  humidity: number;
}

/** Aggregated weather data for the widget. */
export interface WeatherData {
  current: WeatherObservation | null;
  hourlyObservations: WeatherObservation[];
  forecast: WeatherForecast[];
  dailyForecast: DailyForecast[];
  fetchedAt: string;
}

/** A single part-of-day forecast segment (Night / Morning / Afternoon / Evening). */
export interface DailyForecastPart {
  label: 'Night' | 'Morning' | 'Afternoon' | 'Evening';
  startHour: number;           // 0, 6, 12 or 18
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;         // WMO weather code (most significant in the part)
  precipitationProbability: number; // max chance of precipitation (0–100)
  precipitationSum: number;    // mm
  windSpeedMax: number;        // km/h
}

/** A single day's forecast from Open-Meteo daily API. */
export interface DailyForecast {
  date: string;               // YYYY-MM-DD
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;         // WMO weather code
  precipitationSum: number;
  parts: DailyForecastPart[];  // part-of-day breakdown (always 4 entries)
}

/** A personal best record – mirrors SeansAppServer snapshot schema. */
export interface PersonalRecord {
  id: string;
  name: string;
  icon?: string;
  unit: 'days' | 'weeks';
  currentCount: number;
  personalBest: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus?: 'local' | 'synced' | 'pending';
}

/** The server snapshot shape (subset we care about). */
export interface ServerSnapshot {
  schemaVersion: number;
  exportedAt?: string;
  savedAt?: string;
  groups: unknown[];
  goals: unknown[];
  records: PersonalRecord[];
}

// ---------------------------------------------------------------------------
// Garmin fitness stats (normalized by SeansAppServer /api/garmin)
// ---------------------------------------------------------------------------

/** A single activity, reduced to the fields the kiosk widget uses. */
export interface GarminActivity {
  activityId: number;
  name: string;
  typeKey: string;       // canonical group key, e.g. 'running' | 'cycling' | 'strength'
  typeLabel: string;     // friendly label, e.g. 'Running'
  startTimeLocal: string;
  startTimeGMT: string;
  distance: number;      // meters
  duration: number;      // seconds
  elapsedDuration: number;
  movingDuration: number;
  calories: number;
  averageHR: number;
  maxHR: number;
  averageSpeed: number;  // m/s
  elevationGain: number; // meters
  steps: number;
}

/** Per-activity-type rollup for the current window, with deltas vs prior week. */
export interface GarminActivityTypeStat {
  typeKey: string;
  typeLabel: string;
  count: number;
  totalDuration: number;  // seconds
  totalDistance: number;  // meters
  totalCalories: number;
  countDelta: number;
  durationDelta: number;  // seconds
  distanceDelta: number;  // meters
}

/** One activity's slice within a single day (for stacked bars). */
export interface GarminDailyBreakdown {
  typeKey: string;
  typeLabel: string;
  duration: number;  // seconds
  distance: number;  // meters
}

/** A single day in the last-7-days chart. */
export interface GarminDailyStat {
  date: string;      // YYYY-MM-DD (local)
  label: string;     // e.g. 'Mon'
  activityCount: number;
  totalDuration: number;  // seconds
  totalDistance: number;  // meters
  totalCalories: number;
  breakdown: GarminDailyBreakdown[];
}

/** Rolling 7-day summary + deltas vs the prior 7 days. */
export interface GarminWeekSummary {
  activityCount: number;
  totalDuration: number;  // seconds
  totalDistance: number;  // meters
  totalCalories: number;
  countDelta: number;
  durationDelta: number;  // seconds
  distanceDelta: number;  // meters
}

/** The full payload served by GET /api/garmin. */
export interface GarminData {
  configured: boolean;
  available?: boolean;
  cached?: boolean;
  error?: string | null;
  fetchedAt?: string | null;
  displayName?: string | null;
  week: GarminWeekSummary | null;
  daily: GarminDailyStat[];
  byType: GarminActivityTypeStat[];
  activities: GarminActivity[];
}

/** Persisted app settings. */
export interface AppSettings {
  serverUrl: string;
  caldavUrl: string;
  caldavUsername: string;
  caldavPassword: string;
  weatherLocation: string;
  refreshIntervalMinutes: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  serverUrl: '',
  caldavUrl: '',
  caldavUsername: '',
  caldavPassword: '',
  weatherLocation: 'dublin',
  refreshIntervalMinutes: 5,
};
