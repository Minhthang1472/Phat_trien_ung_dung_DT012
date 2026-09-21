import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function SubtitleItem({ segment, isActive, onSeek, subMode = 'bilingual' }) {
  const formatTime = (sec) => {
    if (typeof sec !== 'number') return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasOriginal = Boolean(segment.original_text && segment.original_text.trim() !== segment.text.trim());

  let mainText = segment.text;
  let subText = null;

  if (subMode === 'en') {
    mainText = segment.original_text || segment.text;
  } else if (subMode === 'bilingual') {
    mainText = segment.text;
    if (hasOriginal) {
      subText = segment.original_text;
    }
  } else {
    mainText = segment.text;
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isActive ? styles.activeContainer : styles.inactiveContainer,
      ]}
      onPress={() => onSeek(segment.start)}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.timeTag}>
          <Text style={[styles.timeText, isActive && styles.activeTimeText]}>
            [{formatTime(segment.start)} - {formatTime(segment.end)}]
          </Text>
        </View>
        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>⭐ ĐANG PHÁT</Text>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.text,
          isActive ? styles.activeText : styles.inactiveText,
        ]}
      >
        {mainText}
      </Text>

      {subText ? (
        <Text style={[styles.subText, isActive && styles.activeSubText]}>
          {subText}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs + 2,
    transition: 'all 0.2s',
  },
  activeContainer: {
    backgroundColor: colors.activeSegment,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
  },
  inactiveContainer: {
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTimeText: {
    color: colors.primaryLight,
  },
  activeBadge: {
    backgroundColor: 'rgba(253, 224, 71, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.highlight,
  },
  text: {
    lineHeight: 22,
  },
  activeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inactiveText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    opacity: 0.75,
  },
  subText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  activeSubText: {
    color: '#cbd5e1',
    fontWeight: '500',
  },
});
