import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../../constants/theme';
import { UPLOAD_LANG_OPTIONS } from '../constants/homeData';

/**
 * Modal cấu hình dịch thuật và tùy chọn cho File Upload từ thiết bị
 */
export default function UploadConfigModal({
  visible,
  pendingFile,
  targetLang,
  onSelectLang,
  includeQuiz,
  onToggleQuiz,
  enableTimeRange,
  onToggleTimeRange,
  timeRangeStart,
  onChangeTimeRangeStart,
  timeRangeEnd,
  onChangeTimeRangeEnd,
  onClose,
  onSubmit,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Text style={styles.headerIcon}>🎯</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title}>TÙY CHỌN DỊCH THUẬT & TỔNG HỢP</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                📁 {pendingFile?.name} {pendingFile?.size ? `(${pendingFile.size})` : ''}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            🌐 Bạn muốn dịch phụ đề sang ngôn ngữ nào?
          </Text>

          <View style={styles.langGrid}>
            {UPLOAD_LANG_OPTIONS.map((item) => {
              const isSelected = targetLang === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.langOptionBtn, isSelected && styles.langOptionBtnSelected]}
                  onPress={() => onSelectLang(item.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.langOptionFlag}>{item.flag}</Text>
                  <Text style={[styles.langOptionText, isSelected && styles.langOptionTextSelected]}>
                    {item.label}
                  </Text>
                  {isSelected && <Text style={styles.langOptionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tùy chọn trắc nghiệm ôn tập AI */}
          <View style={styles.quizOptionRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.quizOptionTitle}>🧠 Tạo câu hỏi trắc nghiệm tự luyện (Quiz)</Text>
              <Text style={styles.quizOptionDesc}>Tự động tạo bộ câu hỏi kiểm tra sau khi dịch xong</Text>
            </View>
            <Switch
              value={includeQuiz}
              onValueChange={onToggleQuiz}
              trackColor={{ false: '#334155', true: colors.primary }}
              thumbColor={includeQuiz ? '#ffffff' : '#94a3b8'}
            />
          </View>

          {/* Tùy chọn Cắt mốc thời gian video upload */}
          <View style={styles.uploadOptionCard}>
            <TouchableOpacity
              style={styles.advancedOptionHeader}
              onPress={() => onToggleTimeRange(!enableTimeRange)}
              activeOpacity={0.8}
            >
              <View style={styles.advancedOptionLeft}>
                <Text style={styles.advancedOptionIcon}>✂️</Text>
                <View>
                  <Text style={styles.advancedOptionTitle}>Cắt khoảng thời gian bài giảng</Text>
                  <Text style={styles.advancedOptionSub}>Chỉ dịch đoạn bạn chọn (VD: 00:30 đến 05:00)</Text>
                </View>
              </View>
              <Switch
                value={enableTimeRange}
                onValueChange={onToggleTimeRange}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={enableTimeRange ? '#38bdf8' : '#94a3b8'}
              />
            </TouchableOpacity>

            {enableTimeRange && (
              <View style={styles.timeRangeInputsRow}>
                <View style={styles.timeRangeField}>
                  <Text style={styles.timeRangeLabel}>Bắt đầu từ (mm:ss):</Text>
                  <TextInput
                    style={styles.timeRangeInput}
                    value={timeRangeStart}
                    onChangeText={onChangeTimeRangeStart}
                    placeholder="00:00"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <Text style={styles.timeRangeArrow}>➔</Text>
                <View style={styles.timeRangeField}>
                  <Text style={styles.timeRangeLabel}>Đến phút (mm:ss):</Text>
                  <TextInput
                    style={styles.timeRangeInput}
                    value={timeRangeEnd}
                    onChangeText={onChangeTimeRangeEnd}
                    placeholder="Hết file"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Hàng nút bấm */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={onSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>🚀 BẮT ĐẦU XỬ LÝ & DỊCH</Text>
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
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  headerIcon: {
    fontSize: 22,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  langOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    gap: 6,
  },
  langOptionBtnSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primaryLight,
  },
  langOptionFlag: {
    fontSize: 14,
  },
  langOptionText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  langOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  langOptionCheck: {
    color: '#22d3ee',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 2,
  },
  quizOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    padding: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    marginBottom: spacing.md,
  },
  quizOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quizOptionDesc: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  uploadOptionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    padding: 10,
    marginBottom: spacing.lg,
  },
  advancedOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advancedOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  advancedOptionIcon: {
    fontSize: 16,
  },
  advancedOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  advancedOptionSub: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  timeRangeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.12)',
  },
  timeRangeField: {
    flex: 1,
  },
  timeRangeLabel: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timeRangeInput: {
    backgroundColor: '#0B0F19',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    fontSize: 12,
    paddingVertical: 5,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  timeRangeArrow: {
    color: '#64748b',
    fontSize: 12,
    marginHorizontal: 8,
    marginTop: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
