import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radius } from '../../constants/theme';
import Icon from './Icon';

const TONES = {
  neutral: { bg: colors.surfaceLow, text: colors.slate, border: 'transparent' },
  neutralSolid: { bg: colors.surfaceContainer, text: colors.slate, border: 'transparent' },
  coral: { bg: colors.coralTint, text: colors.coralDeep, border: 'transparent' },
  coralSolid: { bg: colors.coral, text: '#FFFFFF', border: 'transparent' },
  mint: { bg: colors.mintSoft, text: colors.mintDeep, border: 'transparent' },
  mintSolid: { bg: colors.mint, text: '#FFFFFF', border: 'transparent' },
  violet: { bg: colors.violetSoft, text: colors.violet, border: 'transparent' },
  violetSolid: { bg: colors.violet, text: '#FFFFFF', border: 'transparent' },
  lemon: { bg: colors.lemonSoft, text: '#8A6100', border: 'transparent' },
  outline: { bg: colors.surfaceLowest, text: colors.ink, border: colors.outline },
};

/**
 * Chip / badge dạng pill. Hỗ trợ icon trái và nhãn phụ bên phải (ví dụ mã ngôn ngữ).
 */
export default function Pill({
  label,
  icon,
  iconColor,
  iconSize = 14,
  tone = 'neutral',
  size = 'md',
  trailing,
  style,
  textStyle,
}) {
  const toneStyle = TONES[tone] || TONES.neutral;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.base,
        isSmall && styles.baseSm,
        { backgroundColor: toneStyle.bg, borderColor: toneStyle.border },
        style,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={iconSize}
          color={iconColor || toneStyle.text}
          style={styles.icon}
        />
      ) : null}
      {label ? (
        <Text
          numberOfLines={1}
          style={[
            styles.text,
            isSmall && styles.textSm,
            { color: toneStyle.text },
            textStyle,
          ]}
        >
          {label}
        </Text>
      ) : null}
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 4,
  },
  baseSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  icon: {
    marginTop: -1,
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
  },
  textSm: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    lineHeight: 14,
  },
  trailing: {
    marginLeft: 2,
  },
});
