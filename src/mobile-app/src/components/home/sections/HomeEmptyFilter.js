import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, radius, spacing } from '../../../constants/theme';
import Icon from '../../ui/Icon';

/**
 * Khung trạng thái rỗng khi không có kết quả tìm kiếm hoặc lọc bài giảng.
 */
export default function HomeEmptyFilter({
  searchKeyword = '',
  activeCategory = 'all',
  onResetFilter,
}) {
  const hasFilter = searchKeyword.trim().length > 0 || activeCategory !== 'all';

  return (
    <View style={styles.emptyFilterBox}>
      <View style={styles.iconCircle}>
        <Icon name="search" size={24} color={colors.coral} />
      </View>
      <Text style={styles.emptyFilterTitle}>Không tìm thấy bài giảng phù hợp</Text>
      <Text style={styles.emptyFilterSub}>
        {searchKeyword.trim()
          ? `Không có kết quả nào cho "${searchKeyword}". Thử từ khóa khác hoặc đặt lại bộ lọc.`
          : 'Chưa có bài giảng nào trong danh mục này.'}
      </Text>
      {hasFilter ? (
        <TouchableOpacity style={styles.resetFilterBtn} onPress={onResetFilter} activeOpacity={0.8}>
          <Text style={styles.resetFilterBtnText}>Đặt lại bộ lọc</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyFilterBox: {
    paddingVertical: 28,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.outlineStrong,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralTint,
    marginBottom: 12,
  },
  emptyFilterTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
    marginBottom: 5,
    textAlign: 'center',
  },
  emptyFilterSub: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.slate,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 14,
  },
  resetFilterBtn: {
    backgroundColor: colors.coral,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.pill,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  resetFilterBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#FFFFFF',
  },
});
