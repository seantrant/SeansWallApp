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

/** A single day's forecast from Open-Meteo daily API. */
export interface DailyForecast {
  date: string;               // YYYY-MM-DD
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;         // WMO weather code
  precipitationSum: number;
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
