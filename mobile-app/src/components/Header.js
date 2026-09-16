import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function Header({
  title = 'LECTURE AI CAPTION',
  serverStatus = { online: false },
  onOpenSettings,
  onBack,
  showBack = false,
  rightElement,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        )}
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.icon}>🎓</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: serverStatus.online ? colors.success : colors.warning },
              ]}
            />
            <Text style={styles.statusText}>
              {serverStatus.online ? 'Server Online' : 'Local Mode'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        {rightElement}
        {onOpenSettings && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onOpenSettings}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
  },
  backText: {
    fontSize: 28,
    color: colors.primaryLight,
    fontWeight: '300',
    lineHeight: 30,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsButton: {
    padding: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingsIcon: {
    fontSize: 16,
  },
});
