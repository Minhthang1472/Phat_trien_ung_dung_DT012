import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function LectureCard({ lecture, onPress }) {
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(lecture)} activeOpacity={0.75}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.playIcon}>▶️</Text>
          <Text style={styles.title} numberOfLines={1}>
            {lecture.title || 'Bài giảng không tên'}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {(lecture.language || 'vi').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>⏱️ {formatDuration(lecture.duration_seconds)}</Text>
        {lecture.cached_offline ? (
          <Text style={styles.cacheText}>💾 Đã lưu Offline</Text>
        ) : (
          <Text style={styles.cacheText}>☁️ Cloud Firestore</Text>
        )}
      </View>

      {lecture.summary ? (
        <Text style={styles.summary} numberOfLines={2}>
          💡 {lecture.summary}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  playIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  badgeText: {
    fontSize: 10,
    color: colors.primaryLight,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cacheText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summary: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
});
