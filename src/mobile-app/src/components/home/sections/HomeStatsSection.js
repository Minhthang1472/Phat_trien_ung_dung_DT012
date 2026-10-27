import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../../../constants/theme';
import Card from '../../ui/Card';
import Icon from '../../ui/Icon';
import IconBadge from '../../ui/IconBadge';

const METRICS = [
  { key: 'lectures', label: 'Bài giảng', icon: 'library', tone: 'mint', color: colors.mintDeep },
  { key: 'minutes', label: 'Thời gian học', icon: 'clock', tone: 'violet', color: colors.violet, suffix: 'ph' },
  { key: 'quizzes', label: 'Câu trắc nghiệm', icon: 'quiz', tone: 'coral', color: colors.coralDeep },
];

/**
 * Khối thống kê tổng quan tiến độ học tập (Bài giảng, Phút học, Câu Quiz).
 */
export default function HomeStatsSection({
  totalLectures = 0,
  totalMinutes = 0,
  totalQuizzes = 0,
}) {
  const values = {
    lectures: totalLectures,
    minutes: totalMinutes,
    quizzes: totalQuizzes,
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Icon name="stats" size={19} color={colors.violet} />
          <Text style={styles.sectionHeader}>THỐNG KÊ TIẾN ĐỘ HỌC TẬP</Text>
        </View>
        <Text style={styles.headerMeta}>Tuần này</Text>
      </View>

      <View style={styles.statsRow}>
        {METRICS.map((metric) => (
          <Card key={metric.key} style={styles.statBox} tone={metric.tone} padded={false}>
            <View style={styles.statInner}>
              <IconBadge
                icon={metric.icon}
                tone={metric.tone}
                size={30}
                iconSize={16}
                style={styles.statIcon}
              />
              <View style={styles.valueRow}>
                <Text style={[styles.statNumber, { color: metric.color }]}>
                  {values[metric.key]}
                </Text>
                {metric.suffix ? (
                  <Text style={[styles.statSuffix, { color: metric.color }]}>{metric.suffix}</Text>
                ) : null}
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>
                {metric.label}
              </Text>
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.6,
    color: colors.ink,
  },
  headerMeta: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.muted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
  },
  statInner: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  statIcon: {
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  statNumber: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  statSuffix: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    color: colors.slate,
    marginTop: 1,
    textAlign: 'center',
  },
});
