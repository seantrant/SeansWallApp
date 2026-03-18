import { StyleSheet } from 'react-native';

// ---------------------------------------------------------------------------
// Color palette – matches SeansAppAndoird dark theme
// ---------------------------------------------------------------------------
export const colors = {
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceElevated: '#252525',
  border: '#333333',
  text: '#F2F2F2',
  textSecondary: '#CCCCCC',
  muted: '#A7A7A7',
  accent: '#1DB954',
  accentDim: '#168A3F',
  danger: '#FF5C5C',
  warning: '#FFB347',
  info: '#5CA8FF',
  calendarToday: '#2A2A2A',
  calendarEvent: '#1DB954',
};

// ---------------------------------------------------------------------------
// Spacing / sizing constants
// ---------------------------------------------------------------------------
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
} as const;

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
export const sharedStyles = StyleSheet.create({
  /** Fill entire parent */
  fill: {
    flex: 1,
  },

  /** Root dark background */
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /** Standard card surface */
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },

  /** Row with centered cross-axis */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /** Column layout */
  column: {
    flexDirection: 'column',
  },

  /** Widget container */
  widget: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },

  /** Widget header row */
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  /** Widget title text */
  widgetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.sm,
  },

  /** Large display text (e.g. temperature) */
  heroText: {
    fontSize: 48,
    fontWeight: '300',
    color: colors.text,
  },

  /** Primary text */
  textPrimary: {
    fontSize: 14,
    color: colors.text,
  },

  /** Secondary / muted text */
  textSecondary: {
    fontSize: 12,
    color: colors.muted,
  },

  /** Separator line */
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  /** Badge / pill */
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.bg,
  },

  /** Status dot */
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },

  /** Error / empty state */
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  emptyStateText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

// ---------------------------------------------------------------------------
// Weather icon mapping – Met Éireann symbol id → MaterialCommunityIcons name
// ---------------------------------------------------------------------------
export const weatherIconMap: Record<string, string> = {
  Sun: 'weather-sunny',
  LightCloud: 'weather-partly-cloudy',
  PartlyCloud: 'weather-partly-cloudy',
  Cloud: 'weather-cloudy',
  LightRainSun: 'weather-partly-rainy',
  LightRain: 'weather-rainy',
  Rain: 'weather-pouring',
  SleetSun: 'weather-snowy-rainy',
  Sleet: 'weather-snowy-rainy',
  SnowSun: 'weather-snowy',
  Snow: 'weather-snowy-heavy',
  RainThunder: 'weather-lightning-rainy',
  SnowThunder: 'weather-snowy-heavy',
  Fog: 'weather-fog',
  DrizzleSun: 'weather-partly-rainy',
  RainSun: 'weather-partly-rainy',
  Drizzle: 'weather-rainy',
  LightSleet: 'weather-snowy-rainy',
  HeavyRain: 'weather-pouring',
  HeavySleet: 'weather-snowy-rainy',
  HeavySnow: 'weather-snowy-heavy',
};

/**
 * Map Met Éireann observation symbol codes (e.g. "02d") to icon names.
 * Format: number + "d" (day) or "n" (night).
 */
export const observationIconMap: Record<string, string> = {
  '01d': 'weather-sunny',
  '01n': 'weather-night',
  '02d': 'weather-partly-cloudy',
  '02n': 'weather-night-partly-cloudy',
  '03d': 'weather-cloudy',
  '03n': 'weather-cloudy',
  '04d': 'weather-cloudy',
  '04n': 'weather-cloudy',
  '09d': 'weather-rainy',
  '09n': 'weather-rainy',
  '10d': 'weather-pouring',
  '10n': 'weather-pouring',
  '11d': 'weather-lightning-rainy',
  '11n': 'weather-lightning-rainy',
  '13d': 'weather-snowy',
  '13n': 'weather-snowy',
  '40d': 'weather-partly-rainy',
  '40n': 'weather-rainy',
  '41d': 'weather-partly-rainy',
  '41n': 'weather-rainy',
  '46d': 'weather-rainy',
  '46n': 'weather-rainy',
  '50d': 'weather-fog',
  '50n': 'weather-fog',
};

export function getObservationIcon(symbol: string): string {
  return observationIconMap[symbol] ?? 'weather-cloudy';
}

export function getForecastIcon(symbolId: string): string {
  return weatherIconMap[symbolId] ?? 'weather-cloudy';
}
