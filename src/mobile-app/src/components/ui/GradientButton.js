import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, gradients, radius, shadows } from '../../constants/theme';

/**
 * Nút CTA dạng pill với gradient + aura shadow.
 * Giữ nguyên hành vi onPress/disabled như TouchableOpacity thường.
 */
export default function GradientButton({
  children,
  onPress,
  disabled = false,
  colors: gradientColors = gradients.primary,
  shadow = 'coral',
  style,
  contentStyle,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  activeOpacity = 0.9,
  accessibilityLabel,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[
        styles.wrapper,
        shadow === 'coral' && shadows.coral,
        shadow === 'violet' && shadows.violet,
        shadow === 'mint' && shadows.mint,
        disabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={start}
        end={end}
        style={[styles.gradient, contentStyle]}
      >
        {children}
      </LinearGradient>
    </TouchableOpacity>
  );
}

/** Nội dung 2 dòng chuẩn cho CTA chính */
export function GradientButtonContent({ title, subtitle, icon, iconColor = colors.lemon }) {
  return (
    <View style={styles.content}>
      <View style={styles.titleRow}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.pill,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    marginTop: -1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 3,
    textAlign: 'center',
  },
});
