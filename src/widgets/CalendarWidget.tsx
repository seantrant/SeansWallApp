import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import type { CalendarEvent } from '../types';
import { colors, spacing, borderRadius } from '../ui';

// ---------------------------------------------------------------------------
// CalendarWidget – Month view with events rendered in day cells
// ---------------------------------------------------------------------------

interface Props {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  onMonthChange?: (date: Date) => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarWidget({ events, isLoading, error, onMonthChange }: Props) {
  const [viewDate, setViewDate] = React.useState(() => dayjs());

  const monthLabel = viewDate.format('MMMM YYYY');

  const calendarGrid = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  const goToPrevMonth = () => {
    const next = viewDate.subtract(1, 'month');
    setViewDate(next);
    onMonthChange?.(next.toDate());
  };
  const goToNextMonth = () => {
    const next = viewDate.add(1, 'month');
    setViewDate(next);
    onMonthChange?.(next.toDate());
  };
  const goToToday = () => {
    const next = dayjs();
    setViewDate(next);
    onMonthChange?.(next.toDate());
  };

  const todayStr = dayjs().format('YYYY-MM-DD');

  return (
    <View style={styles.container}>
      {/* Header row: month nav */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text} />
        </TouchableOpacity>

        {isLoading && (
          <MaterialCommunityIcons
            name="sync"
            size={16}
            color={colors.muted}
            style={styles.syncIcon}
          />
        )}
        {error && (
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={16}
            color={colors.warning}
            style={styles.syncIcon}
          />
        )}
      </View>

      {/* Day-of-week header */}
      <View style={styles.dayHeaderRow}>
        {DAYS_OF_WEEK.map((d) => (
          <View key={d} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {calendarGrid.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day) => {
              const dateStr = day.date.format('YYYY-MM-DD');
              const isToday = dateStr === todayStr;
              const isCurrentMonth = day.date.month() === viewDate.month();
              const dayEvents = eventsByDate.get(dateStr) ?? [];

              return (
                <View
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    !isCurrentMonth && styles.dayCellOtherMonth,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberToday,
                      !isCurrentMonth && styles.dayNumberOther,
                    ]}
                  >
                    {day.date.date()}
                  </Text>
                  <View style={styles.eventsContainer}>
                    {dayEvents.slice(0, 3).map((evt, ei) => (
                      <View
                        key={evt.id + ei}
                        style={[
                          styles.eventPill,
                          {
                            backgroundColor: evt.color,
                            borderLeftColor: brightenColor(evt.color),
                          },
                        ]}
                      >
                        <Text
                          style={styles.eventText}
                          numberOfLines={1}
                        >
                          {evt.summary}
                        </Text>
                      </View>
                    ))}
                    {dayEvents.length > 3 && (
                      <Text style={styles.moreText}>+{dayEvents.length - 3} more</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      {/* Loading overlay for month changes */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Brighten a hex color for the accent left border */
function brightenColor(hex: string): string {
  try {
    const cleaned = hex.replace('#', '');
    const r = Math.min(255, parseInt(cleaned.substring(0, 2), 16) + 60);
    const g = Math.min(255, parseInt(cleaned.substring(2, 4), 16) + 60);
    const b = Math.min(255, parseInt(cleaned.substring(4, 6), 16) + 60);
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return '#FFFFFF';
  }
}

interface DayCell {
  date: dayjs.Dayjs;
}

function buildMonthGrid(viewDate: dayjs.Dayjs): DayCell[][] {
  const startOfMonth = viewDate.startOf('month');
  // dayjs weekday: 0 = Sunday. We want Monday = 0.
  let startDay = startOfMonth.day() - 1;
  if (startDay < 0) startDay = 6; // Sunday wraps to 6

  const gridStart = startOfMonth.subtract(startDay, 'day');
  const weeks: DayCell[][] = [];

  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({ date: gridStart.add(w * 7 + d, 'day') });
    }
    weeks.push(week);
  }

  return weeks;
}

function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();

  for (const evt of events) {
    // For multi-day events, add to each day in range
    const start = dayjs(evt.start).startOf('day');
    const end = dayjs(evt.end).startOf('day');
    let cursor = start;

    while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
      const key = cursor.format('YYYY-MM-DD');
      const list = map.get(key) ?? [];
      list.push(evt);
      map.set(key, list);
      cursor = cursor.add(1, 'day');
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },

  navButton: {
    padding: spacing.xs,
  },

  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    minWidth: 180,
    textAlign: 'center',
  },

  syncIcon: {
    marginLeft: spacing.sm,
  },

  dayHeaderRow: {
    flexDirection: 'row',
  },

  weekRow: {
    flexDirection: 'row',
    flex: 1,
  },

  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },

  weekDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
  },

  grid: {
    flex: 1,
  },

  dayCell: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 3,
    minHeight: 20,
  },

  dayCellToday: {
    backgroundColor: colors.calendarToday,
  },

  dayCellOtherMonth: {
    opacity: 0.4,
  },

  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },

  dayNumberToday: {
    color: colors.accent,
    fontWeight: '800',
  },

  dayNumberOther: {
    color: colors.muted,
  },

  eventsContainer: {
    flex: 1,
    gap: 1,
  },

  eventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderLeftWidth: 3,
  },

  eventText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  moreText: {
    fontSize: 8,
    color: colors.muted,
    paddingLeft: 3,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 30, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
});
