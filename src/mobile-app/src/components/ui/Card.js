import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing } from '../../constants/theme';

/**
 * Card trắng trên nền canvas, viền hairline + aura shadow.
 * `tone` đổi màu aura để tạo điểm nhấn (coral / mint / violet).
 */
export default function Card({
  children,
  style,
  padded = true,
  tone = 'neutral',
  elevated = false,
  ...rest
}) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        tone === 'coral' && shadows.coral,
        tone === 'mint' && shadows.mint,
        tone === 'violet' && shadows.violet,
        tone === 'neutral' && (elevated ? shadows.cardHover : shadows.card),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  padded: {
    padding: spacing.md,
  },
});
