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
  onPasteSample,
}) {
  const hasFilter = searchKeyword.trim().length > 0 || activeCategory !== 'all';

  return (
    <View style={styles.emptyFilterBox}>
      <View style={styles.iconCircle}>
        <Icon name={hasFilter ? 'search' : 'school'} size={24} color={colors.coral} />
      </View>
      <Text style={styles.emptyFilterTitle}>
        {hasFilter ? 'Không tìm thấy bài giảng phù hợp' : 'Chưa có bài giảng nào'}
      </Text>
      <Text style={styles.emptyFilterSub}>
        {hasFilter
          ? searchKeyword.trim()
            ? `Không có kết quả nào cho "${searchKeyword}". Thử từ khóa khác hoặc đặt lại bộ lọc.`
            : 'Chưa có bài giảng nào trong danh mục này.'
          : 'Dán đường dẫn YouTube hoặc thử ngay bài giảng mẫu để bắt đầu học song ngữ cùng AI!'}
      </Text>

      {hasFilter ? (
        <TouchableOpacity style={styles.resetFilterBtn} onPress={onResetFilter} activeOpacity={0.8}>
          <Text style={styles.resetFilterBtnText}>Đặt lại bộ lọc</Text>
        </TouchableOpacity>
      ) : onPasteSample ? (
        <TouchableOpacity
          style={styles.sampleActionBtn}
          onPress={onPasteSample}
          activeOpacity={0.8}
        >
          <Icon name="sparkle" size={15} color="#FFFFFF" />
          <Text style={styles.sampleActionBtnText}>Thử bài giảng mẫu (AI &amp; Machine Learning)</Text>
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
    color: colors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyFilterSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 290,
  },
  resetFilterBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.coralTint,
  },
  resetFilterBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.coralDeep,
  },
  sampleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  sampleActionBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
