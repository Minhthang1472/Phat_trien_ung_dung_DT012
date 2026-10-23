import { StyleSheet } from 'react-native';
import { colors, spacing } from '../../../constants/theme';

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  cardSection: {
    marginBottom: spacing.md,
  },
});

export default homeStyles;
