import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../../../constants/theme';
import Icon from '../../ui/Icon';

const CATEGORIES = [
  { key: 'all', label: 'Tất cả' },
  { key: 'fav', label: 'Đã ghim', icon: 'star', iconColor: colors.lemon },
  { key: 'en', label: 'Tiếng Anh', icon: 'translate', iconColor: colors.violet },
  { key: 'ja', label: 'Tiếng Nhật', icon: 'translate', iconColor: colors.coral },
  { key: 'upload', label: 'File máy', icon: 'folder', iconColor: colors.violet },
  { key: 'youtube', label: 'YouTube', dot: '#FF4D4F' },
];

/**
 * Thanh công cụ tìm kiếm, phân loại danh mục và lọc thẻ cho danh sách bài giảng.
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
  const countFor = (key) => {
    if (key === 'all') return recentCount;
    if (key === 'fav') return favoritesCount;
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Tiêu đề danh sách + Làm mới */}
      <View style={styles.recentHeaderRow}>
        <View style={styles.headerLeft}>
          <Icon name="history" size={19} color={colors.coral} />
          <Text style={styles.sectionHeader}>Bài giảng đã xử lý</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalCount}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.reloadBtn}
          activeOpacity={0.75}
        >
          <Text style={styles.reloadText}>Làm mới</Text>
          <Icon name="refresh" size={15} color={colors.coral} />
        </TouchableOpacity>
      </View>

      {/* Tìm kiếm */}
      <View style={styles.searchBarContainer}>
        <Icon name="search" size={19} color={colors.slate} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên bài giảng, tóm tắt, từ khóa..."
          placeholderTextColor="rgba(71, 85, 105, 0.55)"
          value={searchKeyword}
          onChangeText={onChangeSearchKeyword}
          clearButtonMode="while-editing"
        />
        {searchKeyword.trim() ? (
          <TouchableOpacity
            onPress={onClearSearchKeyword}
            style={styles.searchClearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close" size={14} color={colors.slate} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Bộ lọc danh mục */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipScroll}
        contentContainerStyle={styles.filterChipContainer}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.key;
          const count = countFor(cat.key);
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onSelectCategory(cat.key)}
              activeOpacity={0.8}
            >
              {cat.icon ? (
                <Icon
                  name={cat.icon}
                  size={14}
                  color={active ? '#FFFFFF' : cat.iconColor || colors.slate}
                />
              ) : null}
              {cat.dot ? (
                <View
                  style={[
                    styles.chipDot,
                    { backgroundColor: active ? '#FFFFFF' : cat.dot },
                  ]}
                />
              ) : null}
              <Text
                style={[styles.filterChipText, active && styles.filterChipTextActive]}
              >
                {cat.label}
                {count !== null ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bộ lọc thẻ */}
      <View style={styles.tagFilterBar}>
        <TouchableOpacity
          style={[
            styles.tagFilterBtn,
            selectedFilterTags.length > 0 && styles.tagFilterBtnActive,
          ]}
          onPress={onOpenTagFilterModal}
          activeOpacity={0.8}
        >
          <Icon
            name="tag"
            size={16}
            color={selectedFilterTags.length > 0 ? colors.violet : colors.slate}
          />
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

        {selectedFilterTags.length > 0 ? (
          <TouchableOpacity
            style={styles.tagClearFilterBtn}
            onPress={onClearTagFilter}
            activeOpacity={0.75}
          >
            <Icon name="close" size={12} color={colors.coralDeep} />
            <Text style={styles.tagClearFilterText}>Hủy lọc</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Các thẻ đang lọc */}
      {selectedFilterTags.length > 0 ? (
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
                  <Icon name="close" size={11} color={colors.violet} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coral,
  },
  countBadgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    lineHeight: 14,
    color: '#FFFFFF',
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  reloadText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.coral,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 10,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.ink,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 2,
  },
  filterChipScroll: {
    marginBottom: 10,
  },
  filterChipContainer: {
    gap: 7,
    paddingVertical: 2,
    paddingRight: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceLowest,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: colors.coral,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  filterChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.slate,
  },
  filterChipTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tagFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surfaceLowest,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  tagFilterBtnActive: {
    backgroundColor: colors.violetSoft,
  },
  tagFilterBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate,
  },
  tagFilterBtnTextActive: {
    color: colors.violet,
  },
  tagClearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.coralTint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  tagClearFilterText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.coralDeep,
  },
  activeTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  activeTagsLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.muted,
  },
  activeTagsScroll: {
    gap: 6,
    alignItems: 'center',
    paddingRight: 8,
  },
  activeTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.violetSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  activeTagBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.violet,
  },
});
