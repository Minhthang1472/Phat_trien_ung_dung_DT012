import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, borderRadius } from '../../../constants/theme';

/**
 * Khung trạng thái rỗng khi không có kết quả tìm kiếm hoặc lọc bài giảng
 */
export default function HomeEmptyFilter({
  searchKeyword = '',
  activeCategory = 'all',
  onResetFilter,
}) {
  const hasFilter = searchKeyword.trim().length > 0 || activeCategory !== 'all';

  return (
    <View style={styles.emptyFilterBox}>
      <Text style={styles.emptyFilterIcon}>🔎</Text>
      <Text style={styles.emptyFilterTitle}>Không tìm thấy bài giảng phù hợp</Text>
      <Text style={styles.emptyFilterSub}>
        {searchKeyword.trim()
          ? `Không có kết quả nào cho "${searchKeyword}". Thử từ khóa khác hoặc đặt lại bộ lọc.`
          : 'Chưa có bài giảng nào trong danh mục này.'}
      </Text>
      {hasFilter && (
        <TouchableOpacity style={styles.resetFilterBtn} onPress={onResetFilter}>
          <Text style={styles.resetFilterBtnText}>Đặt lại bộ lọc</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyFilterBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  emptyFilterIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyFilterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyFilterSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
    marginBottom: 12,
  },
  resetFilterBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  resetFilterBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
});
