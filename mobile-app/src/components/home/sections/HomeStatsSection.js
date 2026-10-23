import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../../constants/theme';

/**
 * Khối thống kê tổng quan tiến độ học tập (Bài giảng, Phút học, Câu Quiz)
 */
export default function HomeStatsSection({
  totalLectures = 0,
  totalMinutes = 0,
  totalQuizzes = 0,
}) {
  return (
    <View style={styles.cardSection}>
      <Text style={styles.sectionHeader}>📊 THỐNG KÊ TIẾN ĐỘ HỌC TẬP</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{totalLectures}</Text>
          <Text style={styles.statLabel}>Bài giảng</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxAccent]}>
          <Text style={[styles.statNumber, styles.statNumberAccent]}>
            {totalMinutes}
          </Text>
          <Text style={styles.statLabel}>Phút học</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{totalQuizzes}</Text>
          <Text style={styles.statLabel}>Câu quiz</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardSection: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statBoxAccent: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statNumberAccent: {
    color: colors.primaryLight,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
