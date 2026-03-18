import { DAVClient } from 'tsdav';
import type { CalendarEvent } from '../types';

// ---------------------------------------------------------------------------
// CalDAV service – connects to Nextcloud CalDAV
// ---------------------------------------------------------------------------

let cachedClient: DAVClient | null = null;
let cachedCredentials = '';

function credentialsKey(url: string, username: string, password: string) {
  return `${url}|${username}|${password}`;
}

/**
 * Get or create a DAVClient instance. Re-creates if credentials change.
 */
async function getClient(
  serverUrl: string,
  username: string,
  password: string,
): Promise<DAVClient> {
  const key = credentialsKey(serverUrl, username, password);

  if (cachedClient && cachedCredentials === key) {
    return cachedClient;
  }

  const client = new DAVClient({
    serverUrl,
    credentials: { username, password },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  await client.login();
  cachedClient = client;
  cachedCredentials = key;
  return client;
}

/**
 * Discover available calendars on the server.
 */
export async function fetchCalendars(
  serverUrl: string,
  username: string,
  password: string,
): Promise<{ url: string; displayName: string; color: string }[]> {
  const client = await getClient(serverUrl, username, password);
  const calendars = await client.fetchCalendars();

  return calendars.map((cal) => ({
    url: cal.url,
    displayName: typeof cal.displayName === 'string' ? cal.displayName : 'Calendar',
    color: cal.calendarColor ?? '#1DB954',
  }));
}

/**
 * Fetch calendar events for a given date range.
 */
export async function fetchCalendarEvents(
  serverUrl: string,
  username: string,
  password: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CalendarEvent[]> {
  const client = await getClient(serverUrl, username, password);
  const calendars = await client.fetchCalendars();
  const events: CalendarEvent[] = [];

  for (const calendar of calendars) {
    const calName = typeof calendar.displayName === 'string' ? calendar.displayName : 'Calendar';
    const calColor = calendar.calendarColor ?? '#1DB954';

    try {
      const objects = await client.fetchCalendarObjects({
        calendar,
        timeRange: {
          start: rangeStart.toISOString(),
          end: rangeEnd.toISOString(),
        },
      });

      for (const obj of objects) {
        const parsed = parseICalEvents(obj.data as string, calName, calColor);
        events.push(...parsed);
      }
    } catch (err) {
      console.warn(`Failed to fetch events from ${calName}:`, err);
    }
  }

  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}

// ---------------------------------------------------------------------------
// Lightweight iCalendar parser
// ---------------------------------------------------------------------------
// We avoid importing ical.js at module level and instead do simple regex
// parsing, which is more predictable in React Native's JS runtime.
// ---------------------------------------------------------------------------

function parseICalEvents(
  icsData: string,
  calendarName: string,
  color: string,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const veventBlocks = icsData.split('BEGIN:VEVENT');

  for (let i = 1; i < veventBlocks.length; i++) {
    const block = veventBlocks[i].split('END:VEVENT')[0];
    if (!block) continue;

    const uid = extractField(block, 'UID') ?? `evt_${i}_${Date.now()}`;
    const summary = extractField(block, 'SUMMARY') ?? '(No title)';
    const dtStart = extractDateField(block, 'DTSTART');
    const dtEnd = extractDateField(block, 'DTEND') ?? dtStart;

    if (!dtStart) continue;

    const allDay = isAllDay(block, 'DTSTART');

    events.push({
      id: uid,
      summary,
      start: dtStart,
      end: dtEnd ?? dtStart,
      calendarName,
      color,
      allDay,
    });
  }

  return events;
}

function extractField(block: string, field: string): string | null {
  // Handles lines like "SUMMARY:Meeting" and "SUMMARY;LANGUAGE=en:Meeting"
  const regex = new RegExp(`^${field}[;:](.*)$`, 'm');
  const match = block.match(regex);
  if (!match) return null;
  // If the line had parameters (e.g. SUMMARY;LANGUAGE=en:Meeting), get the value after the last ':'
  const raw = match[1];
  const colonIdx = raw.indexOf(':');
  if (match[0].includes(';') && colonIdx !== -1) {
    return raw.substring(colonIdx + 1).trim();
  }
  return raw.trim();
}

function isAllDay(block: string, field: string): boolean {
  const regex = new RegExp(`^${field}[^:]*VALUE=DATE[^:]`, 'm');
  return regex.test(block);
}

function extractDateField(block: string, field: string): Date | null {
  // Match DTSTART:20260318T100000Z  or  DTSTART;VALUE=DATE:20260318
  // or DTSTART;TZID=Europe/Dublin:20260318T100000
  const regex = new RegExp(`^${field}[^:]*:(.+)$`, 'm');
  const match = block.match(regex);
  if (!match) return null;

  const raw = match[1].trim();
  return parseICalDate(raw);
}

function parseICalDate(raw: string): Date | null {
  // Format: 20260318T100000Z (UTC) or 20260318T100000 (local) or 20260318 (date only)
  if (raw.length === 8) {
    // Date only: YYYYMMDD
    const y = parseInt(raw.substring(0, 4), 10);
    const m = parseInt(raw.substring(4, 6), 10) - 1;
    const d = parseInt(raw.substring(6, 8), 10);
    return new Date(y, m, d);
  }

  if (raw.length >= 15) {
    const y = parseInt(raw.substring(0, 4), 10);
    const m = parseInt(raw.substring(4, 6), 10) - 1;
    const d = parseInt(raw.substring(6, 8), 10);
    const h = parseInt(raw.substring(9, 11), 10);
    const min = parseInt(raw.substring(11, 13), 10);
    const s = parseInt(raw.substring(13, 15), 10);

    if (raw.endsWith('Z')) {
      return new Date(Date.UTC(y, m, d, h, min, s));
    }
    return new Date(y, m, d, h, min, s);
  }

  // Fallback: let Date parse it
  const date = new Date(raw);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Reset the cached client (e.g. when credentials change).
 */
export function resetClient(): void {
  cachedClient = null;
  cachedCredentials = '';
}
