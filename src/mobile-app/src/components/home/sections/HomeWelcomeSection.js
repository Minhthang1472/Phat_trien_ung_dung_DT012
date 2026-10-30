import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, spacing } from '../../../constants/theme';
import Card from '../../ui/Card';
import Icon from '../../ui/Icon';
import BrandLogo from '../../ui/BrandLogo';

const DAILY_GOAL_MINUTES = 20;

const HERO_FEATURES = [
  { key: 'context', icon: 'translate', label: 'Dịch theo ngữ cảnh' },
  { key: 'sections', icon: 'account-tree', label: 'Quiz theo phần' },
  { key: 'summary', icon: 'auto-awesome', label: 'Tóm tắt thông minh' },
];

/**
 * Hero thương hiệu + mục tiêu học tập trong ngày.
 * Logo và tên thương hiệu được đặt ngay đầu trang chủ, trên nền kính gradient.
 */
export default function HomeWelcomeSection({
  totalMinutes = 0,
}) {
  const doneMinutes = Math.max(0, Math.round(totalMinutes));
  const percent = Math.min(100, Math.round((doneMinutes / DAILY_GOAL_MINUTES) * 100));

  return (
    <Card style={styles.card} padded={false}>
      <LinearGradient
        colors={['#FFF5F2', '#F7F3FF', '#F0FFFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View pointerEvents="none" style={styles.decorCircle} />
        <View pointerEvents="none" style={styles.decorCircleSmall} />
        <View pointerEvents="none" style={styles.decorArc} />

        <View style={styles.content}>
          <View style={styles.brandRow}>
            <BrandLogo
              size={50}
              showWordmark
              showTagline
              title="EdTech AI"
              tagline="HỌC THÔNG MINH MỖI NGÀY"
              wordmarkStyle={styles.brandWordmark}
            />
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.title}>Chào mừng trở lại!</Text>
            <Text style={styles.subtitle}>
              Sẵn sàng khám phá kiến thức mới hôm nay
            </Text>
          </View>

          <View style={styles.featureRow}>
            {HERO_FEATURES.map((feature, index) => (
              <View
                key={feature.key}
                style={[
                  styles.featureChip,
                  index === 1 && styles.featureChipMint,
                  index === 2 && styles.featureChipViolet,
                ]}
              >
                <Icon
                  name={feature.icon}
                  size={12}
                  color={
                    index === 0
                      ? colors.coralDeep
                      : index === 1
                        ? colors.mintDeep
                        : colors.violet
                  }
                />
                <Text
                  style={[
                    styles.featureText,
                    index === 0 && { color: colors.coralDeep },
                    index === 1 && { color: colors.mintDeep },
                    index === 2 && { color: colors.violet },
                  ]}
                  numberOfLines={1}
                >
                  {feature.label}
                </Text>
              </View>
            ))}
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
      </LinearGradient>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  hero: {
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -78,
    right: -46,
    backgroundColor: 'rgba(255, 111, 97, 0.13)',
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    top: 52,
    right: 20,
    backgroundColor: 'rgba(123, 44, 191, 0.07)',
  },
  decorArc: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    bottom: -128,
    left: -54,
    borderWidth: 22,
    borderColor: 'rgba(6, 214, 160, 0.10)',
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  brandWordmark: {
    flexShrink: 1,
    minWidth: 0,
  },
  greetingBlock: {
    marginTop: 1,
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
    marginTop: 2,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 6,
  },
  featureChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.coralTint,
  },
  featureChipMint: {
    backgroundColor: colors.mintSoft,
  },
  featureChipViolet: {
    backgroundColor: colors.violetSoft,
  },
  featureText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 12,
    flexShrink: 1,
  },
  goalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.72)',
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
