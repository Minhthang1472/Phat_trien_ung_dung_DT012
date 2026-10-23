import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { spacing, borderRadius } from '../../../constants/theme';

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
                <Text style={styles.headerIcon}>🏷️</Text>
              </View>
              <View style={{ flex: 1 }}>
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
              <Text style={styles.closeIconText}>✕</Text>
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
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={onSelectAll}>
                  <Text style={styles.quickLink}>Chọn tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onDeselectAll}>
                  <Text style={styles.quickLink}>Bỏ chọn</Text>
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
                <Text style={styles.emptyTagIcon}>🏷️</Text>
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
                    <Text
                      style={[
                        styles.tagChipText,
                        isSelected && styles.tagChipTextSelected,
                      ]}
                    >
                      {isSelected ? '✓ ' : ''}#{tag}
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
              <Text style={styles.resetBtnText}>✕ HỦY BỘ LỌC</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={onApplyFilter}
              activeOpacity={0.8}
            >
              <Text style={styles.applyBtnText}>
                🔍 ÁP DỤNG LỌC {tempSelectedTags.length > 0 ? `(${tempSelectedTags.length})` : ''}
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
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#334155',
    padding: spacing.md,
    width: '92%',
    maxWidth: 420,
    maxHeight: '80%',
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
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
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 18,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeIconBtn: {
    padding: 4,
  },
  closeIconText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '700',
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  countText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  quickLink: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '700',
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
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagChipSelected: {
    backgroundColor: '#4338ca',
    borderColor: '#818cf8',
  },
  tagChipText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tagChipTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  emptyTagBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyTagIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTagTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  emptyTagSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
