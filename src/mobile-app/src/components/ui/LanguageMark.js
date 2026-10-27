import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors } from '../../constants/theme';

/**
 * Màu nhận diện cho từng ngôn ngữ — thay cho emoji cờ quốc gia để đồng bộ
 * tuyệt đối với hệ thống icon Material của design system mới.
 */
const LANG_TONES = {
  vi: { bg: colors.mintSoft, fg: colors.mintDeep },
  en: { bg: colors.violetSoft, fg: colors.violet },
  ja: { bg: colors.coralTint, fg: colors.coralDeep },
  ko: { bg: colors.lemonSoft, fg: '#8A6100' },
  zh: { bg: '#E4F0FB', fg: '#0D47A1' },
  fr: { bg: '#E8F0FE', fg: '#1A73E8' },
  de: { bg: '#EEF1F5', fg: '#37474F' },
  es: { bg: '#FFF1E6', fg: '#BF360C' },
  ru: { bg: '#F3E9FB', fg: '#6A1B9A' },
};

const FALLBACK_TONE = { bg: colors.surfaceLow, fg: colors.slate };

export function getLangTone(code) {
  return LANG_TONES[String(code || '').toLowerCase()] || FALLBACK_TONE;
}

/**
 * Mark ngôn ngữ dạng chip tròn: icon `translate` trên nền màu nhận diện.
 * Dùng thay cho các emoji cờ (🇻🇳, 🇬🇧, ...) ở mọi chip ngôn ngữ.
 */
export default function LanguageMark({ code, size = 18, active = false, style }) {
  const tone = getLangTone(code);

  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? 'rgba(255, 255, 255, 0.24)' : tone.bg,
        },
        style,
      ]}
    >
      <Icon
        name="translate"
        size={Math.max(10, Math.round(size * 0.62))}
        color={active ? '#FFFFFF' : tone.fg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
