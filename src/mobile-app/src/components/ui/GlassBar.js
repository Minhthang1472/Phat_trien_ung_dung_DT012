import React from 'react';
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../constants/theme';

/**
 * Nền kính mờ cho header / bottom nav.
 * - iOS + Web: blur thật (backdrop-filter trên web).
 * - Android: BlurView cần BlurTargetView để blur; nếu không truyền `blurTarget`
 *   sẽ hiển thị lớp trắng bán trong suốt (vẫn đúng tinh thần glassmorphism).
 */
export default function GlassBar({
  children,
  style,
  intensity = 45,
  tint = 'light',
  blurTarget,
  ...rest
}) {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      blurTarget={blurTarget}
      blurMethod={blurTarget ? 'dimezisBlurView' : 'none'}
      style={[styles.base, style]}
      {...rest}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.glass,
    overflow: 'hidden',
  },
});
