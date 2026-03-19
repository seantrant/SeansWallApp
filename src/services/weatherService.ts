import { XMLParser } from 'fast-xml-parser';
import type { WeatherData, WeatherForecast, WeatherObservation, DailyForecast } from '../types';

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

export async function fetchDailyForecast(
  lat = DUBLIN_LAT,
  long = DUBLIN_LONG,
): Promise<DailyForecast[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum` +
    `&timezone=auto&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API returned ${response.status}`);
  }

  const json = await response.json();
  const daily = json.daily;
  if (!daily || !daily.time) return [];

  const results: DailyForecast[] = [];
  for (let i = 0; i < daily.time.length; i++) {
    results.push({
      date: daily.time[i],
      temperatureMax: daily.temperature_2m_max[i],
      temperatureMin: daily.temperature_2m_min[i],
      weatherCode: daily.weathercode[i],
      precipitationSum: daily.precipitation_sum[i] ?? 0,
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
