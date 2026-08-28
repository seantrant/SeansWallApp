import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { CalendarEvent, GarminData, PersonalRecord, WeatherData } from '../types';
import CalendarWidget from '../widgets/CalendarWidget';
import GarminWidget from '../widgets/GarminWidget';
import WeatherWidget from '../widgets/WeatherWidget';
import SeansStuffWidget from '../widgets/SeansStuffWidget';
import { colors, spacing, borderRadius } from '../ui';

// ---------------------------------------------------------------------------
// DashboardScreen – Main kiosk layout
//
// Layout:  ┌──────────────────────┬──────────────┐
//          │                      │    Fitness    │
//          │     Calendar         │   (Garmin)    │
//          │     (Month View)     ├──────────────┤
//          │                      │ Weather (7d)  │
//          │                      ├──────────────┤
//          │                      │  SeansStuff   │
//          │                      │  (Records)    │
//          └──────────────────────┴──────────────┘
// ---------------------------------------------------------------------------

interface Props {
  // Calendar
  calendarEvents: CalendarEvent[];
  calendarLoading: boolean;
  calendarError: string | null;

  // Garmin fitness
  garmin: GarminData | null;
  garminLoading: boolean;
  garminError: string | null;
  onRefreshGarmin?: () => void;

  // Weather
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;

  // Records
  records: PersonalRecord[];
  recordsLoading: boolean;
  recordsError: string | null;
  recordsLastSynced: string | null;
  onRefreshRecords?: () => void;

  // Settings
  onOpenSettings: () => void;

  // Calendar month navigation
  onCalendarMonthChange?: (date: Date) => void;
}

export default function DashboardScreen({
  calendarEvents,
  calendarLoading,
  calendarError,
  garmin,
  garminLoading,
  garminError,
  onRefreshGarmin,
  weather,
  weatherLoading,
  weatherError,
  records,
  recordsLoading,
  recordsError,
  recordsLastSynced,
  onRefreshRecords,
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

        {/* Right column: Fitness + Weather + SeansStuff (~40%).
            Each card sizes to its full content (nothing is clipped); the
            column scrolls vertically only when the screen is too short. */}
        <View style={styles.rightColumn}>
          <ScrollView
            style={styles.rightScroll}
            contentContainerStyle={styles.rightScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.widgetCard}>
              <WeatherWidget
                weather={weather}
                isLoading={weatherLoading}
                error={weatherError}
                compact
              />
            </View>

            <View style={[styles.widgetCard, styles.widgetGrow]}>
              <GarminWidget
                garmin={garmin}
                isLoading={garminLoading}
                error={garminError}
                onRefresh={onRefreshGarmin}
              />
            </View>

            <View style={styles.widgetCard}>
              <SeansStuffWidget
                records={records}
                isLoading={recordsLoading}
                error={recordsError}
                lastSyncedAt={recordsLastSynced}
                onRefresh={onRefreshRecords}
              />
            </View>
          </ScrollView>
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
  },

  rightScroll: {
    flex: 1,
  },

  rightScrollContent: {
    flexGrow: 1,
    gap: spacing.md,
  },

  // Right-column cards size to their content so nothing is ever clipped.
  // flexShrink: 0 guarantees they keep their full height (the column scrolls
  // instead of squashing them). minHeight keeps empty/loading states looking
  // like proper cards.
  widgetCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    flexShrink: 0,
    minHeight: 180,
  },

  // The Garmin card absorbs leftover vertical space on tall screens.
  widgetGrow: {
    flexGrow: 1,
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
