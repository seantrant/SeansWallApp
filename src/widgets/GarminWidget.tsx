import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import type {
  GarminActivity,
  GarminActivityTypeStat,
  GarminDailyStat,
  GarminData,
  GarminWeekSummary,
} from '../types';
import { colors, spacing, borderRadius } from '../ui';

// ---------------------------------------------------------------------------
// GarminWidget – Fitness stats for the top-right corner (replaces Weather)
//
// Shows: a rolling 7-day summary, a stacked weekly bar chart coloured by
// activity type, a per-type breakdown with week-over-week deltas, and a short
// "recent activities" list. Built without a charting dependency (plain Views).
// ---------------------------------------------------------------------------

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Colour + icon per canonical activity group. */
const TYPE_VISUAL: Record<string, { color: string; icon: IconName }> = {
  running: { color: '#1DB954', icon: 'run' },
  cycling: { color: '#5CA8FF', icon: 'bike' },
  walking: { color: '#FFB347', icon: 'walk' },
  hiking: { color: '#8BC34A', icon: 'hiking' },
  strength: { color: '#BA68C8', icon: 'dumbbell' },
  cardio: { color: '#F06292', icon: 'heart-pulse' },
  hiit: { color: '#FF8A65', icon: 'lightning-bolt' },
  yoga: { color: '#4DB6AC', icon: 'meditation' },
  other: { color: '#9E9E9E', icon: 'dumbbell' },
};

function visualFor(typeKey: string) {
  return TYPE_VISUAL[typeKey] ?? TYPE_VISUAL.other;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDurationLabel(seconds: number) {
  if (!seconds || seconds < 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

function formatDistance(meters: number) {
  if (!meters || meters < 0) return '0m';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatKcal(calories: number) {
  const n = Math.round(calories).toString();
  // Manual thousand grouping – avoids relying on Intl/Hermes support on the kiosk.
  return `${n.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} kcal`;
}

/** Signed delta text + direction, e.g. { text: '+2', positive: true }. */
function formatDelta(countDelta: number): { text: string; positive: boolean } {
  if (countDelta > 0) return { text: `+${countDelta}`, positive: true };
  if (countDelta < 0) return { text: `${countDelta}`, positive: false };
  return { text: '±0', positive: false };
}

/** Week-over-week % change for duration, or '—' when there's no prior baseline. */
function durationPct(stat: GarminActivityTypeStat): string | null {
  const prev = stat.totalDuration - stat.durationDelta;
  if (prev <= 0) {
    if (stat.durationDelta > 0) return 'new';
    if (stat.durationDelta < 0) return '−100%';
    return null;
  }
  const pct = ((stat.totalDuration - prev) / prev) * 100;
  const rounded = Math.round(pct);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function formatSyncTime(iso?: string | null): string | null {
  if (!iso) return null;
  const time = dayjs(iso);
  return time.isSame(dayjs(), 'day') ? time.format('HH:mm') : time.format('D MMM HH:mm');
}
// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  garmin: GarminData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

export default function GarminWidget({ garmin, isLoading, error, onRefresh }: Props) {
  const lastSyncedAt = formatSyncTime(garmin?.fetchedAt);
  const week: GarminWeekSummary | null = garmin?.week ?? null;
  const hasData = !!week && week.activityCount > 0;
  const isConfigured = !!garmin?.configured;

  // Loading with no data yet.
  if (!garmin && isLoading) {
    return (
      <View style={styles.container}>
        <WidgetHeader label="Fitness" lastSyncedAt={null} isLoading onRefresh={onRefresh} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="heart-pulse" size={30} color={colors.muted} />
          <Text style={styles.emptyText}>Loading fitness stats…</Text>
        </View>
      </View>
    );
  }

  // Failure and nothing to fall back on.
  if (!garmin && error) {
    return (
      <View style={styles.container}>
        <WidgetHeader label="Fitness" lastSyncedAt={null} onRefresh={onRefresh} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="server-off" size={30} color={colors.warning} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      </View>
    );
  }

  // Credentials not supplied on the server.
  if (garmin && isConfigured === false) {
    return (
      <View style={styles.container}>
        <WidgetHeader label="Fitness" lastSyncedAt={lastSyncedAt} onRefresh={onRefresh} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="heart-pulse" size={30} color={colors.muted} />
          <Text style={styles.emptyText}>Garmin not configured</Text>
          <Text style={styles.emptySubtext}>Add GARMIN_USERNAME on the server</Text>
        </View>
      </View>
    );
  }

  // Configured but no activities in range.
  if (!hasData && !isLoading) {
    const garminError = garmin?.error ?? error;
    return (
      <View style={styles.container}>
        <WidgetHeader label="Fitness" lastSyncedAt={lastSyncedAt} onRefresh={onRefresh} />
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name={garminError ? 'alert-circle-outline' : 'run-fast'}
            size={30}
            color={garminError ? colors.warning : colors.muted}
          />
          <Text style={styles.emptyText}>{garminError ?? 'No activity data yet'}</Text>
          <Text style={styles.emptySubtext}>Try again in a few minutes</Text>
        </View>
      </View>
    );
  }

  // TypeScript cannot narrow `garmin` to non-null across the early returns
  // above; the no-data branch already consumes the null case, so this guard is
  // only a safety net for the compiler.
  if (!garmin) return null;

  const staleBanner = !!garmin?.error || (!!error && hasData);

  return (
    <View style={styles.container}>
      <WidgetHeader label="Fitness" lastSyncedAt={lastSyncedAt} isLoading={isLoading} onRefresh={onRefresh} />

      {staleBanner && hasData && (
        <View style={styles.refreshErrorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={13} color={colors.warning} />
          <Text style={styles.refreshErrorText} numberOfLines={1}>
            Refresh failed – showing last loaded stats
          </Text>
        </View>
      )}

      <View style={styles.body}>
        {week && <HeroSummary week={week} />}

        {garmin.daily.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Last 7 days</Text>
            <WeeklyChart daily={garmin.daily} />
            <TypeLegend byType={garmin.byType} />
          </>
        )}

        {garmin.byType.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>This week</Text>
            {garmin.byType.map((stat) => (
              <TypeRow key={stat.typeKey} stat={stat} />
            ))}
          </>
        )}

        {garmin.activities.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Recent</Text>
            {garmin.activities.slice(0, 4).map((activity) => (
              <ActivityRow key={activity.activityId} activity={activity} />
            ))}
          </>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WidgetHeader({
  label,
  lastSyncedAt,
  isLoading,
  onRefresh,
}: {
  label: string;
  lastSyncedAt: string | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <View style={styles.headerRow}>
      <MaterialCommunityIcons name="heart-pulse" size={18} color={colors.accent} />
      <Text style={styles.headerTitle}>{label}</Text>
      {lastSyncedAt && <Text style={styles.lastUpdated}>{lastSyncedAt}</Text>}
      {onRefresh && (
        <TouchableOpacity onPress={onRefresh} disabled={isLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons
            name="refresh"
            size={16}
            color={isLoading ? colors.muted : colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

function HeroSummary({ week }: { week: GarminWeekSummary }) {
  const count = formatDelta(week.countDelta);
  return (
    <View style={styles.hero}>
      <View style={styles.heroCount}>
        <Text style={styles.heroNumber}>{week.activityCount}</Text>
        <Text style={styles.heroUnit}>activities</Text>
        <View style={[styles.deltaBadge, count.positive ? styles.deltaBadgeUp : styles.deltaBadgeFlat]}>
          <MaterialCommunityIcons
            name={count.positive ? 'arrow-up' : 'minus'}
            size={11}
            color={count.positive ? colors.accent : colors.muted}
          />
          <Text style={[styles.deltaText, count.positive && styles.deltaTextUp]}>{count.text}</Text>
          <Text style={styles.deltaCaption}>this wk</Text>
        </View>
      </View>

      <View style={styles.heroMetrics}>
        <Metric label="Time" value={formatDurationLabel(week.totalDuration)} />
        <Metric label="Distance" value={formatDistance(week.totalDistance)} />
        <Metric label="Calories" value={formatKcal(week.totalCalories)} />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const CHART_HEIGHT = 84;

function WeeklyChart({ daily }: { daily: GarminDailyStat[] }) {
  const maxDay = Math.max(1, ...daily.map((d) => d.totalDuration));

  return (
    <View style={styles.chart}>
      {daily.map((day) => {
        const isToday = dayjs(day.date).isSame(dayjs(), 'day');
        return (
          <View key={day.date} style={styles.chartCol}>
            <View style={styles.chartBar}>
              {day.breakdown.map((part, index) => (
                <View
                  key={`${part.typeKey}-${index}`}
                  style={[
                    styles.chartSegment,
                    {
                      height: Math.max(2, (part.duration / maxDay) * CHART_HEIGHT),
                      backgroundColor: visualFor(part.typeKey).color,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.chartLabel, isToday && styles.chartLabelToday]}>{day.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function TypeLegend({ byType }: { byType: GarminActivityTypeStat[] }) {
  if (!byType.length) return null;
  return (
    <View style={styles.legend}>
      {byType.slice(0, 5).map((stat) => (
        <View key={stat.typeKey} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: visualFor(stat.typeKey).color }]} />
          <Text style={styles.legendLabel}>{stat.typeLabel}</Text>
          <Text style={styles.legendCount}>{stat.count}</Text>
        </View>
      ))}
    </View>
  );
}

function TypeRow({ stat }: { stat: GarminActivityTypeStat }) {
  const visual = visualFor(stat.typeKey);
  const pct = durationPct(stat);
  const positive = (pct?.startsWith('+') ?? false) || pct === 'new';
  return (
    <View style={styles.typeRow}>
      <MaterialCommunityIcons name={visual.icon} size={20} color={visual.color} />
      <View style={styles.typeInfo}>
        <Text style={styles.typeName} numberOfLines={1}>
          {stat.typeLabel}
        </Text>
        <Text style={styles.typeMeta}>
          {stat.count} session{stat.count === 1 ? '' : 's'} · {formatDistance(stat.totalDistance)}
        </Text>
      </View>
      <View style={styles.typeRight}>
        <Text style={styles.typeDuration}>{formatDurationLabel(stat.totalDuration)}</Text>
        {pct && (
          <Text style={[styles.typeDelta, positive ? styles.typeDeltaUp : styles.typeDeltaDown]}>{pct}</Text>
        )}
      </View>
    </View>
  );
}

function ActivityRow({ activity }: { activity: GarminActivity }) {
  const visual = visualFor(activity.typeKey);
  return (
    <View style={styles.activityRow}>
      <MaterialCommunityIcons name={visual.icon} size={16} color={visual.color} />
      <View style={styles.activityInfo}>
        <Text style={styles.activityName} numberOfLines={1}>
          {activity.name}
        </Text>
        <Text style={styles.activityMeta}>{dayjs(activity.startTimeLocal).format('ddd D MMM · HH:mm')}</Text>
      </View>
      <Text style={styles.activityRight}>
        {formatDurationLabel(activity.duration)}
        {activity.distance > 0 ? ` · ${formatDistance(activity.distance)}` : ''}
      </Text>
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
    paddingHorizontal: spacing.md,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  emptySubtext: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    opacity: 0.7,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },

  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },

  lastUpdated: {
    fontSize: 10,
    color: colors.muted,
  },

  refreshErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.warning + '1A',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },

  refreshErrorText: {
    fontSize: 10,
    color: colors.warning,
    flex: 1,
  },

  body: {
    flexGrow: 1,
  },

  // Hero summary
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  heroCount: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },

  heroNumber: {
    fontSize: 40,
    fontWeight: '200',
    color: colors.text,
    lineHeight: 42,
  },

  heroUnit: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
  },

  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: 8,
  },

  deltaBadgeUp: {
    backgroundColor: colors.accent + '1A',
  },

  deltaBadgeFlat: {
    backgroundColor: colors.surfaceElevated,
  },

  deltaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },

  deltaTextUp: {
    color: colors.accent,
  },

  deltaCaption: {
    fontSize: 9,
    color: colors.muted,
  },

  heroMetrics: {
    gap: 4,
  },

  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  metricLabel: {
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Section labels
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Weekly chart
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },

  chartCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },

  chartBar: {
    height: CHART_HEIGHT,
    width: 16,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceElevated,
  },

  chartSegment: {
    width: '100%',
    borderRadius: 1,
  },

  chartLabel: {
    fontSize: 10,
    color: colors.muted,
  },

  chartLabelToday: {
    color: colors.accent,
    fontWeight: '700',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendLabel: {
    fontSize: 10,
    color: colors.muted,
  },

  legendCount: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // Type breakdown rows
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },

  typeInfo: {
    flex: 1,
  },

  typeName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },

  typeMeta: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },

  typeRight: {
    alignItems: 'flex-end',
    gap: 1,
  },

  typeDuration: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },

  typeDelta: {
    fontSize: 10,
    fontWeight: '700',
  },

  typeDeltaUp: {
    color: colors.accent,
  },

  typeDeltaDown: {
    color: colors.muted,
  },

  // Recent activity rows
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },

  activityInfo: {
    flex: 1,
  },

  activityName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  activityMeta: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 1,
  },

  activityRight: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

