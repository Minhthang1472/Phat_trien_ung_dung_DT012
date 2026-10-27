import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radius, spacing } from '../../../constants/theme';
import Card from '../../ui/Card';
import Icon from '../../ui/Icon';

const DAILY_GOAL_MINUTES = 20;

/**
 * Banner chào mừng + mục tiêu học tập trong ngày.
 * Số phút lấy từ dữ liệu thật (tổng thời lượng bài giảng đã xử lý).
 */
export default function HomeWelcomeSection({
  totalMinutes = 0,
  streakDays = 1,
}) {
  const doneMinutes = Math.max(0, Math.round(totalMinutes));
  const percent = Math.min(100, Math.round((doneMinutes / DAILY_GOAL_MINUTES) * 100));

  return (
    <Card style={styles.card} padded={false}>
      <View pointerEvents="none" style={styles.decorCircle} />
      <View pointerEvents="none" style={styles.decorCircleSmall} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.greetingRow}>
            <View style={styles.emojiCircle}>
              <Icon name="sparkle" size={17} color={colors.coral} />
            </View>
            <View style={styles.greetingTextWrap}>
              <Text style={styles.title}>Chào mừng trở lại!</Text>
              <Text style={styles.subtitle}>Sẵn sàng khám phá kiến thức mới hôm nay</Text>
            </View>
          </View>

          <View style={styles.streakPill}>
            <Icon name="fire" size={12} color={colors.coralDeep} />
            <Text style={styles.streakText}>{streakDays} ngày</Text>
          </View>
        </View>

        <View style={styles.goalBox}>
          <View style={styles.goalLeft}>
            <View style={styles.goalIcon}>
              <Icon name="check" size={17} color={colors.mintDeep} />
            </View>
            <View style={styles.goalContent}>
              <Text style={styles.goalLabel} numberOfLines={1}>
                Mục tiêu ngày: {doneMinutes} / {DAILY_GOAL_MINUTES} phút
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${percent}%` }]} />
              </View>
            </View>
          </View>

          <View style={styles.percentPill}>
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -70,
    right: -40,
    backgroundColor: 'rgba(255, 111, 97, 0.10)',
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    top: 34,
    right: 18,
    backgroundColor: 'rgba(255, 111, 97, 0.06)',
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  emojiCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralTint,
  },
  greetingTextWrap: {
    flexShrink: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.slate,
    marginTop: 1,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.coralSoft,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.coralDeep,
  },
  goalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLow,
  },
  goalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  goalIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mintLight,
    flexShrink: 0,
  },
  goalContent: {
    flex: 1,
    minWidth: 0,
  },
  goalLabel: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.ink,
  },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceHigh,
    marginTop: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.mint,
  },
  percentPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLowest,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  percentText: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.slate,
  },
});
