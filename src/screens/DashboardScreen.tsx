import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { CalendarEvent, PersonalRecord, WeatherData } from '../types';
import CalendarWidget from '../widgets/CalendarWidget';
import WeatherWidget from '../widgets/WeatherWidget';
import SeansStuffWidget from '../widgets/SeansStuffWidget';
import { colors, spacing, borderRadius } from '../ui';

// ---------------------------------------------------------------------------
// DashboardScreen – Main kiosk layout
//
// Layout:  ┌──────────────────────┬──────────────┐
//          │                      │   Weather     │
//          │     Calendar         │              │
//          │     (Month View)     ├──────────────┤
//          │                      │  SeansStuff   │
//          │                      │  (Records)    │
//          └──────────────────────┴──────────────┘
// ---------------------------------------------------------------------------

interface Props {
  // Calendar
  calendarEvents: CalendarEvent[];
  calendarLoading: boolean;
  calendarError: string | null;

  // Weather
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;

  // Records
  records: PersonalRecord[];
  recordsLoading: boolean;
  recordsError: string | null;
  recordsLastSynced: string | null;

  // Settings
  onOpenSettings: () => void;

  // Calendar month navigation
  onCalendarMonthChange?: (date: Date) => void;
}

export default function DashboardScreen({
  calendarEvents,
  calendarLoading,
  calendarError,
  weather,
  weatherLoading,
  weatherError,
  records,
  recordsLoading,
  recordsError,
  recordsLastSynced,
  onOpenSettings,
  onCalendarMonthChange,
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {/* Left column: Calendar (~60%) */}
        <View style={styles.leftColumn}>
          <View style={styles.widget}>
            <CalendarWidget
              events={calendarEvents}
              isLoading={calendarLoading}
              error={calendarError}
              onMonthChange={onCalendarMonthChange}
            />
          </View>
        </View>

        {/* Right column: Weather + SeansStuff (~40%) */}
        <View style={styles.rightColumn}>
          <View style={styles.widget}>
            <WeatherWidget
              weather={weather}
              isLoading={weatherLoading}
              error={weatherError}
            />
          </View>

          <View style={styles.widget}>
            <SeansStuffWidget
              records={records}
              isLoading={recordsLoading}
              error={recordsError}
              lastSyncedAt={recordsLastSynced}
            />
          </View>
        </View>
      </View>

      {/* Settings gear – floating in corner */}
      <TouchableOpacity style={styles.settingsButton} onPress={onOpenSettings}>
        <MaterialCommunityIcons name="cog-outline" size={20} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.md,
  },

  row: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },

  leftColumn: {
    flex: 6, // ~60%
  },

  rightColumn: {
    flex: 4, // ~40%
    gap: spacing.md,
  },

  widget: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },

  settingsButton: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
});
