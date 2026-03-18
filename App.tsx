import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import dayjs from 'dayjs';

import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { loadSettings, saveSettings } from './src/storage';
import { fetchCalendarEvents, fetchCalendars, resetClient } from './src/services/caldavService';
import { fetchWeatherData } from './src/services/weatherService';
import { fetchRecords, fetchServerHealth } from './src/services/seansAppService';

import type { AppSettings, CalendarEvent, PersonalRecord, WeatherData } from './src/types';
import { DEFAULT_SETTINGS } from './src/types';
import { colors } from './src/ui';

// ---------------------------------------------------------------------------
// App – Root component for SeansWallApp
// ---------------------------------------------------------------------------

export default function App() {
  // ---- Settings & UI state ------------------------------------------------
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [caldavStatus, setCaldavStatus] = useState<string | null>(null);

  // ---- Data state ---------------------------------------------------------
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [recordsLastSynced, setRecordsLastSynced] = useState<string | null>(null);

  // ---- Refs for intervals -------------------------------------------------
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  // ---- Kiosk mode: hide system bars on mount (Android only) ----------------
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      try {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
        await NavigationBar.setBackgroundColorAsync(colors.bg);
      } catch {
        // Non-fatal — may fail on some devices / Expo Go
      }
    })();
  }, []);

  // ---- Load persisted settings on mount -----------------------------------
  useEffect(() => {
    (async () => {
      const loaded = await loadSettings();
      setSettings(loaded);
    })();
  }, []);

  // ---- Data fetching callbacks --------------------------------------------

  const refreshCalendar = useCallback(async () => {
    const { caldavUrl, caldavUsername, caldavPassword } = settings;
    if (!caldavUrl || !caldavUsername || !caldavPassword) return;

    setCalendarLoading(true);
    setCalendarError(null);
    try {
      const start = dayjs().startOf('month').subtract(7, 'day').toDate();
      const end = dayjs().endOf('month').add(14, 'day').toDate();
      const events = await fetchCalendarEvents(
        caldavUrl,
        caldavUsername,
        caldavPassword,
        start,
        end,
      );
      setCalendarEvents(events);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calendar sync failed';
      setCalendarError(message);
      console.warn('Calendar refresh error:', message);
    } finally {
      setCalendarLoading(false);
    }
  }, [settings.caldavUrl, settings.caldavUsername, settings.caldavPassword]);

  const refreshWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await fetchWeatherData(settings.weatherLocation);
      setWeather(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Weather fetch failed';
      setWeatherError(message);
      console.warn('Weather refresh error:', message);
    } finally {
      setWeatherLoading(false);
    }
  }, [settings.weatherLocation]);

  const refreshRecords = useCallback(async () => {
    if (!settings.serverUrl) return;

    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const data = await fetchRecords(settings.serverUrl);
      setRecords(data);
      setRecordsLastSynced(new Date().toISOString());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server fetch failed';
      setRecordsError(message);
      console.warn('Records refresh error:', message);
    } finally {
      setRecordsLoading(false);
    }
  }, [settings.serverUrl]);

  // ---- Start / restart refresh intervals when settings change -------------
  useEffect(() => {
    // Clear existing intervals
    for (const id of intervalsRef.current) clearInterval(id);
    intervalsRef.current = [];

    const intervalMs = Math.max(1, settings.refreshIntervalMinutes) * 60 * 1000;

    // Initial fetches
    refreshCalendar();
    refreshWeather();
    refreshRecords();

    // Set up intervals
    intervalsRef.current.push(setInterval(refreshCalendar, intervalMs));
    intervalsRef.current.push(setInterval(refreshWeather, 15 * 60 * 1000)); // weather every 15 min
    intervalsRef.current.push(setInterval(refreshRecords, intervalMs));

    return () => {
      for (const id of intervalsRef.current) clearInterval(id);
    };
  }, [refreshCalendar, refreshWeather, refreshRecords, settings.refreshIntervalMinutes]);

  // ---- Settings handlers --------------------------------------------------

  const handleSaveSettings = useCallback(
    async (newSettings: AppSettings) => {
      // If CalDAV credentials changed, reset the cached client
      if (
        newSettings.caldavUrl !== settings.caldavUrl ||
        newSettings.caldavUsername !== settings.caldavUsername ||
        newSettings.caldavPassword !== settings.caldavPassword
      ) {
        resetClient();
      }

      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [settings],
  );

  const handleTestServer = useCallback(async () => {
    if (!settings.serverUrl) {
      setServerStatus('✗ No server URL configured');
      return;
    }
    setServerStatus('Testing…');
    try {
      const health = await fetchServerHealth(settings.serverUrl);
      setServerStatus(
        health.status === 'ok'
          ? `✓ Connected (snapshot: ${health.snapshotPresent ? 'present' : 'none'})`
          : '✗ Unexpected response',
      );
    } catch (err) {
      setServerStatus(`✗ ${err instanceof Error ? err.message : 'Connection failed'}`);
    }
  }, [settings.serverUrl]);

  const handleTestCalDav = useCallback(async () => {
    const { caldavUrl, caldavUsername, caldavPassword } = settings;
    if (!caldavUrl || !caldavUsername || !caldavPassword) {
      setCaldavStatus('✗ Fill in all CalDAV fields first');
      return;
    }
    setCaldavStatus('Testing…');
    try {
      const calendars = await fetchCalendars(caldavUrl, caldavUsername, caldavPassword);
      setCaldavStatus(`✓ Found ${calendars.length} calendar(s)`);
    } catch (err) {
      setCaldavStatus(`✗ ${err instanceof Error ? err.message : 'Connection failed'}`);
    }
  }, [settings.caldavUrl, settings.caldavUsername, settings.caldavPassword]);

  // ---- Render -------------------------------------------------------------

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar hidden />

      <DashboardScreen
        calendarEvents={calendarEvents}
        calendarLoading={calendarLoading}
        calendarError={calendarError}
        weather={weather}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        records={records}
        recordsLoading={recordsLoading}
        recordsError={recordsError}
        recordsLastSynced={recordsLastSynced}
        onOpenSettings={() => setSettingsVisible(true)}
      />

      {settingsVisible && (
        <SettingsScreen
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setSettingsVisible(false)}
          onTestServer={handleTestServer}
          onTestCalDav={handleTestCalDav}
          serverStatus={serverStatus}
          caldavStatus={caldavStatus}
        />
      )}
    </View>
  );
}
