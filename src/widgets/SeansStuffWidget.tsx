import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import type { PersonalRecord } from '../types';
import { colors, spacing, borderRadius } from '../ui';

// ---------------------------------------------------------------------------
// SeansStuffWidget – Displays personal records from SeansAppServer
// ---------------------------------------------------------------------------

interface Props {
  records: PersonalRecord[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  onRefresh?: () => void;
}

export default function SeansStuffWidget({
  records,
  isLoading,
  error,
  lastSyncedAt,
  onRefresh,
}: Props) {
  if (!records.length && isLoading) {
    return (
      <View style={styles.container}>
        <WidgetHeader lastSyncedAt={lastSyncedAt} isLoading={isLoading} onRefresh={onRefresh} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="sync" size={28} color={colors.muted} />
          <Text style={styles.emptyText}>Loading records…</Text>
        </View>
      </View>
    );
  }

  if (!records.length && error) {
    return (
      <View style={styles.container}>
        <WidgetHeader lastSyncedAt={lastSyncedAt} isLoading={isLoading} onRefresh={onRefresh} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="server-off" size={28} color={colors.warning} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!records.length) {
    return (
      <View style={styles.container}>
        <WidgetHeader lastSyncedAt={lastSyncedAt} isLoading={isLoading} onRefresh={onRefresh} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="trophy-outline" size={28} color={colors.muted} />
          <Text style={styles.emptyText}>No records yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WidgetHeader lastSyncedAt={lastSyncedAt} isLoading={isLoading} onRefresh={onRefresh} />
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {records.map((record) => (
          <RecordRow key={record.id} record={record} />
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WidgetHeader({
  lastSyncedAt,
  isLoading,
  onRefresh,
}: {
  lastSyncedAt: string | null;
  isLoading: boolean;
  onRefresh?: () => void;
}) {
  const formattedTime = lastSyncedAt
    ? dayjs(lastSyncedAt).format('HH:mm')
    : null;

  return (
    <View style={styles.headerRow}>
      <MaterialCommunityIcons name="trophy-variant" size={18} color={colors.accent} />
      <Text style={styles.headerTitle}>Records</Text>
      {formattedTime && (
        <Text style={styles.lastUpdated}>{formattedTime}</Text>
      )}
      <TouchableOpacity
        onPress={onRefresh}
        disabled={isLoading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons
          name="refresh"
          size={16}
          color={isLoading ? colors.muted : colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

function RecordRow({ record }: { record: PersonalRecord }) {
  const isAtBest = record.currentCount >= record.personalBest && record.personalBest > 0;
  const iconName = record.icon ?? 'counter';
  const unitLabel = record.unit === 'days' ? 'd' : 'w';

  return (
    <View style={styles.recordRow}>
      <MaterialCommunityIcons
        name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
        size={20}
        color={isAtBest ? colors.accent : colors.muted}
      />
      <View style={styles.recordInfo}>
        <Text style={styles.recordName} numberOfLines={1}>
          {record.name}
        </Text>
        <Text style={styles.recordMeta}>
          PB: {record.personalBest}{unitLabel}
        </Text>
      </View>
      <View style={[styles.countBadge, isAtBest && styles.countBadgeHighlight]}>
        <Text
          style={[styles.countText, isAtBest && styles.countTextHighlight]}
        >
          {record.currentCount}
        </Text>
        <Text style={styles.countUnit}>{unitLabel}</Text>
      </View>
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

  emptyText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
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

  scrollArea: {
    flex: 1,
  },

  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },

  recordInfo: {
    flex: 1,
  },

  recordName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },

  recordMeta: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },

  countBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 2,
  },

  countBadgeHighlight: {
    backgroundColor: colors.accent + '22',
  },

  countText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  countTextHighlight: {
    color: colors.accent,
  },

  countUnit: {
    fontSize: 10,
    color: colors.muted,
  },
});
