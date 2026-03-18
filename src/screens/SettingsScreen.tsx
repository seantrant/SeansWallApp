import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AppSettings } from '../types';
import { colors, spacing, borderRadius } from '../ui';

// ---------------------------------------------------------------------------
// SettingsScreen – Modal overlay for configuring connections
// ---------------------------------------------------------------------------

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
  onTestServer: () => void;
  onTestCalDav: () => void;
  serverStatus: string | null;
  caldavStatus: string | null;
}

export default function SettingsScreen({
  settings,
  onSave,
  onClose,
  onTestServer,
  onTestCalDav,
  serverStatus,
  caldavStatus,
}: Props) {
  const [draft, setDraft] = useState<AppSettings>({ ...settings });

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="cog" size={22} color={colors.accent} />
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* SeansAppServer section */}
          <Section title="SeansApp Server" icon="server">
            <SettingField
              label="Server URL"
              placeholder="http://192.168.1.x:3010"
              value={draft.serverUrl}
              onChangeText={(v) => update('serverUrl', v)}
            />
            <View style={styles.rowBetween}>
              <TouchableOpacity style={styles.testButton} onPress={onTestServer}>
                <Text style={styles.testButtonText}>Test Connection</Text>
              </TouchableOpacity>
              {serverStatus && (
                <Text
                  style={[
                    styles.statusText,
                    { color: serverStatus.startsWith('✓') ? colors.accent : colors.danger },
                  ]}
                >
                  {serverStatus}
                </Text>
              )}
            </View>
          </Section>

          {/* CalDAV section */}
          <Section title="CalDAV (Nextcloud)" icon="calendar-sync">
            <SettingField
              label="Server URL"
              placeholder="https://cloud.example.com/remote.php/dav"
              value={draft.caldavUrl}
              onChangeText={(v) => update('caldavUrl', v)}
            />
            <SettingField
              label="Username"
              placeholder="your-username"
              value={draft.caldavUsername}
              onChangeText={(v) => update('caldavUsername', v)}
            />
            <SettingField
              label="Password / App Token"
              placeholder="app-password"
              value={draft.caldavPassword}
              onChangeText={(v) => update('caldavPassword', v)}
              secureTextEntry
            />
            <View style={styles.rowBetween}>
              <TouchableOpacity style={styles.testButton} onPress={onTestCalDav}>
                <Text style={styles.testButtonText}>Test Connection</Text>
              </TouchableOpacity>
              {caldavStatus && (
                <Text
                  style={[
                    styles.statusText,
                    { color: caldavStatus.startsWith('✓') ? colors.accent : colors.danger },
                  ]}
                >
                  {caldavStatus}
                </Text>
              )}
            </View>
          </Section>

          {/* General section */}
          <Section title="General" icon="tune">
            <SettingField
              label="Weather Location"
              placeholder="dublin"
              value={draft.weatherLocation}
              onChangeText={(v) => update('weatherLocation', v)}
            />
            <SettingField
              label="Refresh Interval (minutes)"
              placeholder="5"
              value={String(draft.refreshIntervalMinutes)}
              onChangeText={(v) => update('refreshIntervalMinutes', parseInt(v, 10) || 5)}
              keyboardType="numeric"
            />
          </Section>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={16}
          color={colors.accent}
        />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function SettingField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted + '88'}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  modal: {
    width: '60%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },

  closeButton: {
    padding: spacing.xs,
  },

  body: {
    padding: spacing.lg,
  },

  section: {
    marginBottom: spacing.xl,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  field: {
    marginBottom: spacing.md,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.xs,
  },

  fieldInput: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  testButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  statusText: {
    fontSize: 12,
    flex: 1,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },

  cancelButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },

  cancelText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
  },

  saveButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },

  saveText: {
    fontSize: 14,
    color: colors.bg,
    fontWeight: '700',
  },
});
