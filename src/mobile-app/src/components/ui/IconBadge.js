import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors } from '../../constants/theme';

const TONES = {
  coral: { bg: colors.coralTint, fg: colors.coral },
  coralSolid: { bg: colors.coral, fg: '#FFFFFF' },
  mint: { bg: colors.mintSoft, fg: colors.mintDeep },
  mintSolid: { bg: colors.mint, fg: '#FFFFFF' },
  violet: { bg: colors.violetSoft, fg: colors.violet },
  violetSolid: { bg: colors.violet, fg: '#FFFFFF' },
  lemon: { bg: colors.lemonSoft, fg: '#B38600' },
  neutral: { bg: colors.surfaceLow, fg: colors.slate },
  white: { bg: colors.surfaceLowest, fg: colors.coral },
};

/** Vòng tròn nền nhạt bọc icon — dùng cho header section, thống kê, badge. */
export default function IconBadge({
  icon,
  size = 32,
  iconSize,
  tone = 'coral',
  color,
  style,
}) {
  const toneStyle = TONES[tone] || TONES.coral;
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: toneStyle.bg,
        },
        style,
      ]}
    >
      <Icon
        name={icon}
        size={iconSize || Math.round(size * 0.55)}
        color={color || toneStyle.fg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
