import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import type { WeatherData, WeatherForecast, DailyForecast } from '../types';
import { colors, spacing, borderRadius, getObservationIcon, getForecastIcon, getObservationIconColor, getForecastIconColor, getWmoIcon, getWmoIconColor } from '../ui';

// ---------------------------------------------------------------------------
// WeatherWidget – Current conditions + 48h forecast for Dublin
// ---------------------------------------------------------------------------

interface Props {
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
}

export default function WeatherWidget({ weather, isLoading, error }: Props) {
  if (!weather && isLoading) {
    return (
      <View style={styles.container}>
        <WidgetHeader />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="weather-cloudy-clock" size={32} color={colors.muted} />
          <Text style={styles.loadingText}>Loading weather…</Text>
        </View>
      </View>
    );
  }

  if (!weather || (!weather.current && weather.forecast.length === 0)) {
    return (
      <View style={styles.container}>
        <WidgetHeader />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="weather-cloudy-alert" size={32} color={colors.warning} />
          <Text style={styles.loadingText}>
            {error ?? 'No weather data available'}
          </Text>
        </View>
      </View>
    );
  }

  const current = weather.current;

  return (
    <View style={styles.container}>
      <WidgetHeader lastUpdated={weather.fetchedAt} />

      {/* Current conditions */}
      {current && (
        <View style={styles.currentSection}>
          <View style={styles.currentMain}>
            <MaterialCommunityIcons
              name={getObservationIcon(current.symbol) as keyof typeof MaterialCommunityIcons.glyphMap}
              size={44}
              color={getObservationIconColor(current.symbol)}
            />
            <Text style={styles.temperature}>{current.temperature}°</Text>
          </View>

          <Text style={styles.description}>{current.weatherDescription}</Text>

          <View style={styles.detailsRow}>
            <DetailChip
              icon="weather-windy"
              label={`${current.windSpeed} km/h ${current.cardinalWindDirection}`}
            />
            <DetailChip icon="water-percent" label={`${current.humidity.trim()}%`} />
            <DetailChip icon="gauge" label={`${current.pressure} hPa`} />
            {current.rainfall.trim() !== '0.0' && (
              <DetailChip icon="weather-rainy" label={`${current.rainfall.trim()} mm`} />
            )}
          </View>
        </View>
      )}

      {/* 7-Day daily forecast */}
      {weather.dailyForecast.length > 0 && (
        <>
          <View style={styles.separator} />
          <Text style={styles.sectionLabel}>7-Day Forecast</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
            {weather.dailyForecast.map((day) => (
              <DailyForecastCard key={day.date} day={day} />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WidgetHeader({ lastUpdated }: { lastUpdated?: string }) {
  return (
    <View style={styles.headerRow}>
      <MaterialCommunityIcons name="weather-partly-cloudy" size={18} color={colors.accent} />
      <Text style={styles.headerTitle}>Dublin Weather</Text>
      {lastUpdated && (
        <Text style={styles.headerTime}>
          {dayjs(lastUpdated).format('HH:mm')}
        </Text>
      )}
    </View>
  );
}

function DetailChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.chip}>
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={13}
        color={colors.muted}
      />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function DailyForecastCard({ day }: { day: DailyForecast }) {
  const d = dayjs(day.date);
  const isToday = d.isSame(dayjs(), 'day');

  return (
    <View style={[styles.dayColumn, isToday && styles.dayColumnToday]}>
      <Text style={[styles.dayColumnLabel, isToday && styles.dayColumnLabelToday]}>
        {isToday ? 'Today' : d.format('ddd')}
      </Text>
      <Text style={styles.dayColumnDate}>{d.format('D MMM')}</Text>
      <MaterialCommunityIcons
        name={getWmoIcon(day.weatherCode) as keyof typeof MaterialCommunityIcons.glyphMap}
        size={22}
        color={getWmoIconColor(day.weatherCode)}
      />
      <View style={styles.tempRange}>
        <Text style={styles.tempHigh}>{Math.round(day.temperatureMax)}°</Text>
        <Text style={styles.tempLow}>{Math.round(day.temperatureMin)}°</Text>
      </View>
      {day.precipitationSum > 0 && (
        <Text style={styles.forecastRain}>{day.precipitationSum.toFixed(1)}mm</Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.sm,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },

  headerTime: {
    fontSize: 11,
    color: colors.muted,
  },

  // Current conditions
  currentSection: {
    gap: spacing.sm,
  },

  currentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  temperature: {
    fontSize: 42,
    fontWeight: '200',
    color: colors.text,
  },

  description: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 4,
  },

  chipText: {
    fontSize: 11,
    color: colors.muted,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  forecastScroll: {
    flexGrow: 0,
  },

  dayColumn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
    minWidth: 68,
    gap: spacing.xs,
  },

  dayColumnToday: {
    backgroundColor: colors.calendarToday,
    borderWidth: 1,
    borderColor: colors.accent + '44',
  },

  dayColumnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },

  dayColumnLabelToday: {
    color: colors.accent,
  },

  dayColumnDate: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
  },

  tempRange: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'baseline',
  },

  tempHigh: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  tempLow: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.muted,
  },

  forecastRain: {
    fontSize: 9,
    color: colors.info,
  },
});
