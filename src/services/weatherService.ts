import { XMLParser } from 'fast-xml-parser';
import type { WeatherData, WeatherForecast, WeatherObservation, DailyForecast, DailyForecastPart } from '../types';

// ---------------------------------------------------------------------------
// Met Éireann API endpoints
// ---------------------------------------------------------------------------
const OBSERVATIONS_BASE = 'https://prodapi.metweb.ie/observations';
const FORECAST_BASE = 'http://openaccess.pf.api.met.ie/metno-wdb2ts/locationforecast';

// Dublin coordinates
const DUBLIN_LAT = 53.3498;
const DUBLIN_LONG = -6.2603;

// ---------------------------------------------------------------------------
// Observations API (JSON) – current & today's hourly data
// ---------------------------------------------------------------------------

export async function fetchObservations(
  location = 'dublin',
): Promise<WeatherObservation[]> {
  const url = `${OBSERVATIONS_BASE}/${encodeURIComponent(location)}/today`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Observations API returned ${response.status}`);
  }

  const data: WeatherObservation[] = await response.json();
  return data;
}

/**
 * Return the most recent observation from today's hourly list.
 */
export function latestObservation(
  observations: WeatherObservation[],
): WeatherObservation | null {
  if (observations.length === 0) return null;
  return observations[observations.length - 1];
}

// ---------------------------------------------------------------------------
// Point Forecast API (XML) – 48h forecast from HARMONIE model
// ---------------------------------------------------------------------------

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

interface ForecastXml {
  weatherdata?: {
    product?: {
      time?: ForecastTimeBlock | ForecastTimeBlock[];
    };
  };
}

interface ForecastTimeBlock {
  '@_datatype'?: string;
  '@_from'?: string;
  '@_to'?: string;
  location?: {
    temperature?: { '@_value'?: string };
    windSpeed?: { '@_mps'?: string };
    windDirection?: { '@_name'?: string };
    humidity?: { '@_value'?: string };
    precipitation?: { '@_value'?: string };
    symbol?: { '@_id'?: string; '@_number'?: string };
  };
}

export async function fetchForecast(
  lat = DUBLIN_LAT,
  long = DUBLIN_LONG,
): Promise<WeatherForecast[]> {
  const url = `${FORECAST_BASE}?lat=${lat}&long=${long}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Forecast API returned ${response.status}`);
  }

  const xml = await response.text();
  const parsed = xmlParser.parse(xml) as ForecastXml;

  const timeBlocks = parsed?.weatherdata?.product?.time;
  if (!timeBlocks) return [];

  const blocks = Array.isArray(timeBlocks) ? timeBlocks : [timeBlocks];

  // We need to combine "instant" blocks (temperature, wind, humidity)
  // with "period" blocks (precipitation, symbol). They share the same `from` timestamps.
  const instantMap = new Map<
    string,
    {
      temperature: number;
      windSpeedMps: number;
      windDirectionName: string;
      humidity: number;
    }
  >();

  const periodMap = new Map<
    string,
    { precipitation: number; symbolId: string; symbolNumber: number }
  >();

  for (const block of blocks) {
    const from = block['@_from'] ?? '';
    const to = block['@_to'] ?? '';
    const loc = block.location;
    if (!loc) continue;

    if (from === to || !loc.precipitation) {
      // Instant block
      instantMap.set(from, {
        temperature: parseFloat(loc.temperature?.['@_value'] ?? '0'),
        windSpeedMps: parseFloat(loc.windSpeed?.['@_mps'] ?? '0'),
        windDirectionName: loc.windDirection?.['@_name'] ?? '',
        humidity: parseFloat(loc.humidity?.['@_value'] ?? '0'),
      });
    } else {
      // Period block (precipitation + symbol)
      periodMap.set(to, {
        precipitation: parseFloat(loc.precipitation?.['@_value'] ?? '0'),
        symbolId: loc.symbol?.['@_id'] ?? 'Cloud',
        symbolNumber: parseInt(loc.symbol?.['@_number'] ?? '4', 10),
      });
    }
  }

  // Merge instant + period data by matching timestamps
  const forecasts: WeatherForecast[] = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  for (const [timeStr, instant] of instantMap) {
    const time = new Date(timeStr);
    if (time < now || time > cutoff) continue;

    const period = periodMap.get(timeStr);

    forecasts.push({
      time,
      temperature: instant.temperature,
      windSpeedMps: instant.windSpeedMps,
      windDirectionName: instant.windDirectionName,
      humidity: instant.humidity,
      precipitation: period?.precipitation ?? 0,
      symbolId: period?.symbolId ?? 'Cloud',
      symbolNumber: period?.symbolNumber ?? 4,
    });
  }

  forecasts.sort((a, b) => a.time.getTime() - b.time.getTime());
  return forecasts;
}

// ---------------------------------------------------------------------------
// Open-Meteo daily forecast – free 7-day forecast (no API key)
// ---------------------------------------------------------------------------

/** The part-of-day boundaries we split each forecast day into. */
const PART_DEFS = [
  { label: 'Night', startHour: 0 },
  { label: 'Morning', startHour: 6 },
  { label: 'Afternoon', startHour: 12 },
  { label: 'Evening', startHour: 18 },
] as const;

/** Ordering used to pick the "most significant" weather code in a part. */
function wmoSeverity(code: number): number {
  if (code === 0 || code === 1) return 1;
  if (code === 2) return 2;
  if (code === 3) return 3;
  if (code === 45 || code === 48) return 4;
  if (code >= 51 && code <= 57) return 5;
  if (code >= 61 && code <= 67) return 6;
  if (code >= 71 && code <= 77) return 7;
  if (code >= 80 && code <= 82) return 8;
  if (code === 85 || code === 86) return 9;
  if (code >= 95) return 10;
  return 0;
}

interface HourlyData {
  time?: unknown[];
  temperature_2m?: unknown[];
  weathercode?: unknown[];
  precipitation_probability?: unknown[];
  precipitation?: unknown[];
  windspeed_10m?: unknown[];
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Aggregate the hourly forecast for one date into Night / Morning / Afternoon /
 * Evening segments. Hours missing from the payload fall back to the day's
 * overall aggregate so the widget never shows gaps.
 */
function buildDailyParts(
  hourly: HourlyData | null,
  date: string,
  fallback: { max: number; min: number; code: number },
): DailyForecastPart[] {
  const time = Array.isArray(hourly?.time) ? (hourly!.time as unknown[]) : [];
  const temperature = Array.isArray(hourly?.temperature_2m) ? (hourly!.temperature_2m as unknown[]) : [];
  const weathercode = Array.isArray(hourly?.weathercode) ? (hourly!.weathercode as unknown[]) : [];
  const probability = Array.isArray(hourly?.precipitation_probability) ? (hourly!.precipitation_probability as unknown[]) : [];
  const precipitation = Array.isArray(hourly?.precipitation) ? (hourly!.precipitation as unknown[]) : [];
  const windspeed = Array.isArray(hourly?.windspeed_10m) ? (hourly!.windspeed_10m as unknown[]) : [];

  if (time.length === 0) return [];

  // Collect the array index of every hour belonging to this date + part.
  const partIndexes = new Map<number, number[]>();
  for (let i = 0; i < time.length; i++) {
    const timeStr = typeof time[i] === 'string' ? (time[i] as string) : '';
    if (!timeStr.startsWith(date)) continue;

    const hour = Number(timeStr.slice(11, 13));
    if (!Number.isFinite(hour)) continue;

    const partStart = Math.floor(hour / 6) * 6;
    const indexes = partIndexes.get(partStart) ?? [];
    indexes.push(i);
    partIndexes.set(partStart, indexes);
  }

  return PART_DEFS.map((part) => {
    const indexes = partIndexes.get(part.startHour) ?? [];

    if (indexes.length === 0) {
      return {
        label: part.label,
        startHour: part.startHour,
        temperatureMax: fallback.max,
        temperatureMin: fallback.min,
        weatherCode: fallback.code,
        precipitationProbability: 0,
        precipitationSum: 0,
        windSpeedMax: 0,
      };
    }

    let temperatureMax = -Infinity;
    let temperatureMin = Infinity;
    let precipitationProbability = 0;
    let precipitationSum = 0;
    let windSpeedMax = 0;
    let worstCode = 0;
    let worstSeverity = -1;

    for (const idx of indexes) {
      const temp = toNumber(temperature[idx]);
      if (temp !== null) {
        temperatureMax = Math.max(temperatureMax, temp);
        temperatureMin = Math.min(temperatureMin, temp);
      }

      const code = toNumber(weathercode[idx]);
      if (code !== null) {
        const severity = wmoSeverity(code);
        if (severity > worstSeverity) {
          worstSeverity = severity;
          worstCode = code;
        }
      }

      const prob = toNumber(probability[idx]);
      if (prob !== null) precipitationProbability = Math.max(precipitationProbability, prob);

      const rain = toNumber(precipitation[idx]);
      if (rain !== null) precipitationSum += rain;

      const wind = toNumber(windspeed[idx]);
      if (wind !== null) windSpeedMax = Math.max(windSpeedMax, wind);
    }

    return {
      label: part.label,
      startHour: part.startHour,
      temperatureMax: temperatureMax === -Infinity ? fallback.max : Math.round(temperatureMax),
      temperatureMin: temperatureMin === Infinity ? fallback.min : Math.round(temperatureMin),
      weatherCode: worstSeverity === -1 ? fallback.code : worstCode,
      precipitationProbability: Math.round(precipitationProbability),
      precipitationSum: Math.round(precipitationSum * 10) / 10,
      windSpeedMax: Math.round(windSpeedMax),
    };
  });
}

export async function fetchDailyForecast(
  lat = DUBLIN_LAT,
  long = DUBLIN_LONG,
): Promise<DailyForecast[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum` +
    `&hourly=temperature_2m,weathercode,precipitation_probability,precipitation,windspeed_10m` +
    `&timezone=auto&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API returned ${response.status}`);
  }

  const json = await response.json();
  const daily = json.daily;
  if (!daily || !daily.time) return [];

  const hourly = (json.hourly ?? null) as HourlyData | null;

  const results: DailyForecast[] = [];
  for (let i = 0; i < daily.time.length; i++) {
    const date: string = daily.time[i];
    results.push({
      date,
      temperatureMax: daily.temperature_2m_max[i],
      temperatureMin: daily.temperature_2m_min[i],
      weatherCode: daily.weathercode[i],
      precipitationSum: daily.precipitation_sum[i] ?? 0,
      parts: buildDailyParts(hourly, date, {
        max: daily.temperature_2m_max[i],
        min: daily.temperature_2m_min[i],
        code: daily.weathercode[i],
      }),
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Combined fetch
// ---------------------------------------------------------------------------

export async function fetchWeatherData(
  location = 'dublin',
): Promise<WeatherData> {
  const [observations, forecast, daily] = await Promise.allSettled([
    fetchObservations(location),
    fetchForecast(),
    fetchDailyForecast(),
  ]);

  const hourly =
    observations.status === 'fulfilled' ? observations.value : [];
  const forecastData =
    forecast.status === 'fulfilled' ? forecast.value : [];
  const dailyData =
    daily.status === 'fulfilled' ? daily.value : [];

  return {
    current: latestObservation(hourly),
    hourlyObservations: hourly,
    forecast: forecastData,
    dailyForecast: dailyData,
    fetchedAt: new Date().toISOString(),
  };
}
