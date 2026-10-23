import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../../constants/theme';

/**
 * Thanh công cụ tìm kiếm, phân loại danh mục và lọc thẻ cho danh sách bài giảng
 */
export default function HomeFilterBar({
  totalCount = 0,
  onRefresh,
  searchKeyword,
  onChangeSearchKeyword,
  onClearSearchKeyword,
  activeCategory,
  onSelectCategory,
  recentCount = 0,
  favoritesCount = 0,
  selectedFilterTags = [],
  onOpenTagFilterModal,
  onClearTagFilter,
  onRemoveSingleFilterTag,
}) {
  return (
    <View style={styles.container}>
      {/* Hàng Tiêu đề danh sách và Nút làm mới */}
      <View style={styles.recentHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sectionHeader}>📚 BÀI GIẢNG ĐÃ XỬ LÝ GẦN ĐÂY</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalCount}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.reloadBtn}>
          <Text style={styles.reloadText}>Làm mới ↻</Text>
        </TouchableOpacity>
      </View>

      {/* Thanh Tìm kiếm bài giảng tức thì */}
      <View style={styles.searchBarContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên bài giảng, tóm tắt, từ khóa..."
          placeholderTextColor={colors.textMuted}
          value={searchKeyword}
          onChangeText={onChangeSearchKeyword}
          clearButtonMode="while-editing"
        />
        {searchKeyword.trim() ? (
          <TouchableOpacity onPress={onClearSearchKeyword} style={styles.searchClearBtn}>
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Hàng bộ lọc danh mục (Filter Chips) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipScroll}
        contentContainerStyle={styles.filterChipContainer}
      >
        <TouchableOpacity
          style={[styles.filterChip, activeCategory === 'all' && styles.filterChipActive]}
          onPress={() => onSelectCategory('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, activeCategory === 'all' && styles.filterChipTextActive]}>
            Tất cả ({recentCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeCategory === 'fav' && styles.filterChipActive]}
          onPress={() => onSelectCategory('fav')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, activeCategory === 'fav' && styles.filterChipTextActive]}>
            ⭐ Đã ghim ({favoritesCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeCategory === 'en' && styles.filterChipActive]}
          onPress={() => onSelectCategory('en')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, activeCategory === 'en' && styles.filterChipTextActive]}>
            🇬🇧 Tiếng Anh
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeCategory === 'ja' && styles.filterChipActive]}
          onPress={() => onSelectCategory('ja')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, activeCategory === 'ja' && styles.filterChipTextActive]}>
            🇯🇵 Tiếng Nhật
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeCategory === 'upload' && styles.filterChipActive]}
          onPress={() => onSelectCategory('upload')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, activeCategory === 'upload' && styles.filterChipTextActive]}>
            📁 File máy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeCategory === 'youtube' && styles.filterChipActive]}
          onPress={() => onSelectCategory('youtube')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, activeCategory === 'youtube' && styles.filterChipTextActive]}>
            🔴 YouTube
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Thanh Bộ Lọc Thẻ Bài Giảng (Tag Filter Bar) */}
      <View style={styles.tagFilterBar}>
        <TouchableOpacity
          style={[
            styles.tagFilterBtn,
            selectedFilterTags.length > 0 && styles.tagFilterBtnActive,
          ]}
          onPress={onOpenTagFilterModal}
          activeOpacity={0.8}
        >
          <Text style={styles.tagFilterBtnIcon}>🏷️</Text>
          <Text
            style={[
              styles.tagFilterBtnText,
              selectedFilterTags.length > 0 && styles.tagFilterBtnTextActive,
            ]}
          >
            {selectedFilterTags.length > 0
              ? `Bộ lọc thẻ (${selectedFilterTags.length})`
              : 'Bộ lọc thẻ'}
          </Text>
        </TouchableOpacity>

        {selectedFilterTags.length > 0 && (
          <TouchableOpacity
            style={styles.tagClearFilterBtn}
            onPress={onClearTagFilter}
            activeOpacity={0.7}
          >
            <Text style={styles.tagClearFilterText}>✕ Hủy lọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dải hiển thị các thẻ đang được lọc */}
      {selectedFilterTags.length > 0 && (
        <View style={styles.activeTagsRow}>
          <Text style={styles.activeTagsLabel}>Đang lọc:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeTagsScroll}
          >
            {selectedFilterTags.map((tag) => (
              <View key={tag} style={styles.activeTagBadge}>
                <Text style={styles.activeTagBadgeText}>#{tag}</Text>
                <TouchableOpacity
                  onPress={() => onRemoveSingleFilterTag(tag)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.activeTagBadgeRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
  },
  countBadgeText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  reloadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reloadText: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    height: 40,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
    color: colors.textMuted,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12.5,
    padding: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipScroll: {
    marginBottom: spacing.sm + 2,
  },
  filterChipContainer: {
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tagFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
    marginTop: 2,
  },
  tagFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#475569',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tagFilterBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: '#818cf8',
  },
  tagFilterBtnIcon: {
    fontSize: 16,
  },
  tagFilterBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  tagFilterBtnTextActive: {
    color: '#c7d2fe',
    fontWeight: '800',
  },
  tagClearFilterBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  tagClearFilterText: {
    color: '#f87171',
    fontSize: 12.5,
    fontWeight: '700',
  },
  activeTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: 6,
  },
  activeTagsLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  activeTagsScroll: {
    gap: 6,
    alignItems: 'center',
  },
  activeTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#312e81',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    gap: 5,
  },
  activeTagBadgeText: {
    color: '#e0e7ff',
    fontSize: 11,
    fontWeight: '600',
  },
  activeTagBadgeRemove: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 2,
  },
});
