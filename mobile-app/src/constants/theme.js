// Modern Clean Theme Design System
export const colors = {
  background: '#0B0F19',       // Deep midnight slate
  card: '#161F30',             // Elevated card surface
  cardBorder: '#233048',       // Subtle border
  cardHover: '#1C273D',
  primary: '#4F46E5',          // Indigo accent
  primaryLight: '#6366F1',     // Bright indigo
  primaryGradient: ['#4F46E5', '#7C3AED'],
  secondary: '#06B6D4',        // Cyan
  success: '#10B981',          // Emerald green
  warning: '#F59E0B',          // Amber
  danger: '#EF4444',           // Rose red
  textPrimary: '#F8FAFC',      // Crisp white
  textSecondary: '#94A3B8',    // Muted slate
  textMuted: '#64748B',
  highlight: '#FDE047',        // Active subtitle glow
  activeSegment: 'rgba(99, 102, 241, 0.25)',
  activeSegmentBorder: '#6366F1',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    color: colors.textMuted,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600',
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};
