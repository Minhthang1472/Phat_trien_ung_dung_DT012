import { StyleSheet } from 'react-native';
import { colors, screenPadding, spacing } from '../../../constants/theme';

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
  },
  cardSection: {
    marginBottom: spacing.md,
  },
});

export default homeStyles;
