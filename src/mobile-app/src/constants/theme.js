/**
 * Design tokens — "Vibrant Fluid Bilingual AI"
 * Nguồn: temp_ui/stitch_remix_of_vibrant_fluid_edtech_interface/vibrant_fluid_bilingual_ai/DESIGN.md
 *
 * Quy ước:
 * - `colors` giữ lại các alias cũ (card, textPrimary, primaryLight...) để các màn hình
 *   chưa được reskin không bị crash. Giá trị đã đổi sang bảng màu sáng mới.
 * - Font dùng family name của từng weight (Plus Jakarta Sans) thay vì `fontWeight`,
 *   vì React Native trên Android không tổng hợp weight cho font nạp từ file.
 */

export const palette = {
  // Canvas & neutrals
  surface: '#F8F9FE',
  surfaceBright: '#FFFFFF',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F2F3F8',
  surfaceContainer: '#ECEEF3',
  surfaceHigh: '#E7E8ED',
  surfaceHighest: '#E1E2E7',
  ink: '#1E1B4B',
  slate: '#475569',
  muted: '#8A90A6',
  outline: 'rgba(30, 27, 75, 0.08)',
  outlineStrong: 'rgba(30, 27, 75, 0.14)',

  // Chromatic pillars
  coral: '#FF6F61',
  coralLight: '#FF8A65',
  coralDeep: '#AC332A',
  coralSoft: '#FFDAD5',
  coralTint: '#FFF1EF',
  mint: '#06D6A0',
  mintLight: '#51FAC1',
  mintDeep: '#006C4F',
  mintSoft: '#E6FBF5',
  violet: '#7B2CBF',
  violetLight: '#9D4EDD',
  violetSoft: '#F3E8FF',
  lemon: '#FFD166',
  lemonSoft: '#FFF9E6',
  pink: '#FF5C8A',

  // Feedback
  error: '#BA1A1A',
  errorSoft: '#FFDAD6',
  success: '#06D6A0',
};

export const colors = {
  // ---- Bảng màu mới (dùng cho các màn hình đã reskin) ----
  surface: palette.surface,
  surfaceBright: palette.surfaceBright,
  surfaceLowest: palette.surfaceLowest,
  surfaceLow: palette.surfaceLow,
  surfaceContainer: palette.surfaceContainer,
  surfaceHigh: palette.surfaceHigh,
  ink: palette.ink,
  slate: palette.slate,
  muted: palette.muted,
  outline: palette.outline,
  outlineStrong: palette.outlineStrong,

  coral: palette.coral,
  coralLight: palette.coralLight,
  coralDeep: palette.coralDeep,
  coralSoft: palette.coralSoft,
  coralTint: palette.coralTint,
  mint: palette.mint,
  mintLight: palette.mintLight,
  mintDeep: palette.mintDeep,
  mintSoft: palette.mintSoft,
  violet: palette.violet,
  violetLight: palette.violetLight,
  violetSoft: palette.violetSoft,
  lemon: palette.lemon,
  lemonSoft: palette.lemonSoft,
  pink: palette.pink,

  // ---- Alias tương thích ngược ----
  background: palette.surface,
  card: palette.surfaceLowest,
  cardBorder: palette.outline,
  cardHover: palette.surfaceLow,
  primary: palette.coral,
  primaryLight: palette.coralLight,
  primaryGradient: [palette.coral, palette.coralDeep, palette.violet],
  secondary: palette.mint,
  success: palette.success,
  warning: palette.lemon,
  danger: palette.pink,
  accent: palette.lemon,
  error: palette.error,
  errorSoft: palette.errorSoft,
  textPrimary: palette.ink,
  textSecondary: palette.slate,
  textMuted: palette.muted,
  highlight: '#FFE066',
  activeSegment: 'rgba(6, 214, 160, 0.16)',
  activeSegmentBorder: palette.mint,

  // Nền kính mờ
  glass: 'rgba(255, 255, 255, 0.82)',
  glassStrong: 'rgba(255, 255, 255, 0.94)',
  glassBorder: 'rgba(255, 255, 255, 0.65)',
  scrim: 'rgba(30, 27, 75, 0.35)',
};

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/** Lề ngoài chuẩn của mockup: 1.25rem */
export const screenPadding = 20;

/** Base unit 0.5rem = 8px */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 36,
};

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  full: 9999,
  pill: 9999,
};

/** Alias cũ — giữ nguyên key để không phá vỡ code hiện có */
export const borderRadius = {
  sm: radius.sm,
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
  full: radius.full,
};

/**
 * Đổ bóng màu (aura) thay cho shadow xám.
 * `elevation` bắt buộc để Android hiển thị shadow.
 */
export const shadows = {
  card: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  cardHover: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 6,
  },
  coral: {
    shadowColor: palette.coral,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 6,
  },
  mint: {
    shadowColor: palette.mint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 5,
  },
  violet: {
    shadowColor: palette.violet,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 5,
  },
  floating: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.14,
    shadowRadius: 48,
    elevation: 10,
  },
};

export const gradients = {
  primary: [palette.coral, palette.coralDeep, palette.violet],
  coral: [palette.coralLight, palette.coral],
  mint: [palette.mintLight, palette.mint],
  violet: [palette.violetLight, palette.violet],
  lemon: ['#FFE066', palette.lemon],
  glass: ['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.78)'],
};

export const typography = {
  // Token theo DESIGN.md
  headlineXl: { fontFamily: fonts.extraBold, fontSize: 36, lineHeight: 44, color: palette.ink, letterSpacing: -0.6 },
  headlineXlMobile: { fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 34, color: palette.ink, letterSpacing: -0.4 },
  headlineLg: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36, color: palette.ink, letterSpacing: -0.3 },
  headlineLgMobile: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: palette.ink },
  headlineMd: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: palette.ink },
  bodyLg: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 26, color: palette.slate },
  bodyMd: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: palette.slate },
  bodySm: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: palette.slate },
  labelLg: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  labelMd: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  labelSm: { fontFamily: fonts.extraBold, fontSize: 10, lineHeight: 14 },

  // Alias cũ
  title: { fontFamily: fonts.bold, fontSize: 22, color: palette.ink, letterSpacing: 0.3 },
  subtitle: { fontFamily: fonts.semiBold, fontSize: 16, color: palette.ink },
  body: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: palette.slate },
  caption: { fontFamily: fonts.medium, fontSize: 12, color: palette.muted },
  badge: { fontFamily: fonts.semiBold, fontSize: 11 },
};

export default {
  palette,
  colors,
  fonts,
  spacing,
  space,
  screenPadding,
  radius,
  borderRadius,
  shadows,
  gradients,
  typography,
};
