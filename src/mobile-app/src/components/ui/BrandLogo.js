import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, gradients } from '../../constants/theme';
import Icon from './Icon';

/**
 * Logo thương hiệu "EdTech AI".
 * Mark được ghép từ gradient coral -> violet, lõi kính mờ, nút play và
 * một tia sáng mint nhỏ để tạo cảm giác "AI đang dẫn đường".
 */
export default function BrandLogo({
  size = 40,
  showWordmark = false,
  showTagline = false,
  title = 'EdTech AI',
  tagline = 'HỌC THÔNG MINH',
  style,
  wordmarkStyle,
}) {
  const radiusValue = Math.max(10, Math.round(size * 0.32));
  const iconSize = Math.round(size * 0.46);
  const badgeSize = Math.max(15, Math.round(size * 0.36));
  const parts = String(title || 'EdTech AI').trim().split(/\s+/);
  const firstWord = parts[0] || 'EdTech';
  const restWords = parts.slice(1).join(' ');

  return (
    <View style={[styles.lockup, style]}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={[styles.mark, { width: size, height: size, borderRadius: radiusValue }]}
      >
        <View style={[styles.sheen, { borderRadius: radiusValue }]} />
        <View
          style={[
            styles.orbit,
            {
              width: size * 0.76,
              height: size * 0.76,
              borderRadius: size * 0.38,
            },
          ]}
        />
        <Icon name="play" size={iconSize} color="#FFFFFF" />
        <View
          style={[
            styles.sparkleBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              right: -Math.round(badgeSize * 0.18),
              top: -Math.round(badgeSize * 0.18),
            },
          ]}
        >
          <Icon name="sparkle" size={Math.round(badgeSize * 0.6)} color={colors.coralDeep} />
        </View>
      </LinearGradient>

      {showWordmark ? (
        <View style={[styles.wordmark, wordmarkStyle]}>
          <Text style={styles.wordmarkText} numberOfLines={1}>
            {firstWord}
            {restWords ? <Text style={styles.wordmarkAccent}>{` ${restWords}`}</Text> : null}
          </Text>
          {showTagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 6,
  },
  sheen: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: '46%',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  orbit: {
    position: 'absolute',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  sparkleBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mintLight,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  wordmark: {
    flexShrink: 1,
    minWidth: 0,
  },
  wordmarkText: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  wordmarkAccent: {
    color: colors.coral,
  },
  tagline: {
    marginTop: 1,
    fontFamily: fonts.extraBold,
    fontSize: 8.5,
    lineHeight: 11,
    letterSpacing: 1.4,
    color: colors.muted,
  },
});
