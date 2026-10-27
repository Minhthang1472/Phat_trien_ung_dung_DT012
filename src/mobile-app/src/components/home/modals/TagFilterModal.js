import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { colors, fonts, radius, shadows, spacing } from '../../../constants/theme';
import Icon from '../../ui/Icon';

/**
 * Modal lọc bài giảng theo các thẻ (Tags) đa chọn
 */
export default function TagFilterModal({
  visible,
  availableTags = [],
  tempSelectedTags = [],
  onToggleTag,
  onSelectAll,
  onDeselectAll,
  onClearFilter,
  onApplyFilter,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header Modal */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Icon name="tag" size={18} color={colors.violet} />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.title}>BỘ LỌC THẺ BÀI GIẢNG</Text>
                <Text style={styles.subtitle}>
                  Chọn một hoặc nhiều thẻ để lọc video
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeIconBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={16} color={colors.slate} />
            </TouchableOpacity>
          </View>

          {/* Quick Action: Chọn tất cả / Bỏ chọn */}
          {availableTags.length > 0 && (
            <View style={styles.quickBar}>
              <Text style={styles.countText}>
                {tempSelectedTags.length > 0
                  ? `Đã chọn: ${tempSelectedTags.length}/${availableTags.length} thẻ`
                  : `Tổng cộng ${availableTags.length} thẻ khả dụng`}
              </Text>
              <View style={styles.quickActions}>
                <TouchableOpacity onPress={onSelectAll}>
                  <Text style={styles.quickLink}>Chọn tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onDeselectAll}>
                  <Text style={styles.quickLinkMuted}>Bỏ chọn</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Body: Danh sách Thẻ dạng Chips */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.chipsWrap}
            showsVerticalScrollIndicator={false}
          >
            {availableTags.length === 0 ? (
              <View style={styles.emptyTagBox}>
                <View style={styles.emptyTagIconWrap}>
                  <Icon name="tag" size={26} color={colors.violet} />
                </View>
                <Text style={styles.emptyTagTitle}>Chưa có thẻ bài giảng nào</Text>
                <Text style={styles.emptyTagSub}>
                  Sau khi dịch hoặc xử lý bài giảng, AI sẽ tự động phân tích và gắn các thẻ tương ứng tại đây.
                </Text>
              </View>
            ) : (
              availableTags.map((tag) => {
                const isSelected = tempSelectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    onPress={() => onToggleTag(tag)}
                    activeOpacity={0.75}
                  >
                    {isSelected ? (
                      <Icon name="check" size={12} color={colors.coralDeep} />
                    ) : null}
                    <Text
                      style={[
                        styles.tagChipText,
                        isSelected && styles.tagChipTextSelected,
                      ]}
                    >
                      #{tag}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer Buttons: Hủy bộ lọc, Áp dụng lọc */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={onClearFilter}
              activeOpacity={0.7}
            >
              <Icon name="close" size={12} color={colors.coralDeep} />
              <Text style={styles.resetBtnText}>HỦY BỘ LỌC</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={onApplyFilter}
              activeOpacity={0.8}
            >
              <Icon name="search" size={14} color="#FFFFFF" />
              <Text style={styles.applyBtnText}>
                ÁP DỤNG LỌC {tempSelectedTags.length > 0 ? `(${tempSelectedTags.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceBright,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    width: '92%',
    maxWidth: 420,
    maxHeight: '80%',
    ...shadows.floating,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.ink,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  countText: {
    flexShrink: 1,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickLink: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.coral,
  },
  quickLinkMuted: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.slate,
  },
  modalBody: {
    maxHeight: 280,
    marginVertical: spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  tagChipSelected: {
    backgroundColor: colors.coralTint,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 97, 0.32)',
  },
  tagChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate,
  },
  tagChipTextSelected: {
    color: colors.coralDeep,
    fontFamily: fonts.bold,
  },
  emptyTagBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyTagIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTagTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    marginBottom: 4,
  },
  emptyTagSub: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.coralTint,
  },
  resetBtnText: {
    color: colors.coralDeep,
    fontFamily: fonts.extraBold,
    fontSize: 11,
    lineHeight: 15,
  },
  applyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.coral,
    ...shadows.coral,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 12,
    lineHeight: 16,
  },
});
