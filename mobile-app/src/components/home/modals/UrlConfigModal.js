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
import { formatSecondsToTime } from '../constants/homeData';

/**
 * Modal cấu hình xử lý URL Video (Toàn bộ vs Cắt đoạn, Bật/Tắt Quiz)
 */
export default function UrlConfigModal({
  visible,
  videoInfo,
  processMode,
  onSelectMode,
  rangeStart,
  onChangeRangeStart,
  rangeEnd,
  onChangeRangeEnd,
  includeQuiz,
  onToggleQuiz,
  onClose,
  onSubmit,
}) {
  const durationSec = videoInfo?.duration_seconds || 0;
  const durationFormatted = formatSecondsToTime(durationSec);

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
            <View style={styles.iconWrap}>
              <Text style={styles.headerIcon}>🎬</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.title}>CẤU HÌNH TẠO PHỤ ĐỀ</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {videoInfo?.title || 'Bài giảng YouTube'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeIconBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeIconText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Thông tin thời lượng video */}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              ⏱️ Tổng thời lượng: {durationFormatted}
            </Text>
          </View>

          {/* Phần 1: Chọn Phạm vi dịch thuật */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>1. Bạn muốn dịch toàn bộ hay một đoạn?</Text>

            {/* Lựa chọn A: Toàn bộ video */}
            <TouchableOpacity
              style={[
                styles.radioOption,
                processMode === 'all' && styles.radioOptionActive,
              ]}
              onPress={() => onSelectMode('all')}
              activeOpacity={0.8}
            >
              <View style={styles.radioCircle}>
                {processMode === 'all' && <View style={styles.radioInnerCircle} />}
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.radioLabel}>Dịch toàn bộ video</Text>
                <Text style={styles.radioDesc}>
                  Xử lý toàn bộ từ 00:00 đến {durationFormatted}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Lựa chọn B: Dịch 1 đoạn */}
            <TouchableOpacity
              style={[
                styles.radioOption,
                processMode === 'range' && styles.radioOptionActive,
                { marginTop: 8 },
              ]}
              onPress={() => onSelectMode('range')}
              activeOpacity={0.8}
            >
              <View style={styles.radioCircle}>
                {processMode === 'range' && <View style={styles.radioInnerCircle} />}
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.radioLabel}>Dịch trong một đoạn thời gian</Text>
                <Text style={styles.radioDesc}>
                  Chỉ bóc tách và dịch đoạn quan trọng bạn chỉ định
                </Text>
              </View>
            </TouchableOpacity>

            {/* Nếu chọn Dịch 1 đoạn */}
            {processMode === 'range' && (
              <View style={styles.rangePickerCard}>
                <Text style={styles.rangePickerLabel}>
                  Chọn khoảng thời gian (dựa theo thời lượng tối đa {durationFormatted}):
                </Text>
                <View style={styles.timeRangeInputsRow}>
                  <View style={styles.timeRangeField}>
                    <Text style={styles.timeRangeLabel}>Bắt đầu từ (mm:ss):</Text>
                    <TextInput
                      style={styles.timeRangeInput}
                      value={rangeStart}
                      onChangeText={onChangeRangeStart}
                      placeholder="00:00"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                  <Text style={styles.timeRangeArrow}>➔</Text>
                  <View style={styles.timeRangeField}>
                    <Text style={styles.timeRangeLabel}>Đến phút (mm:ss):</Text>
                    <TextInput
                      style={styles.timeRangeInput}
                      value={rangeEnd}
                      onChangeText={onChangeRangeEnd}
                      placeholder={durationFormatted}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Phần 2: Có muốn tạo câu hỏi trắc nghiệm hay không */}
          <View style={[styles.sectionBox, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>2. Tạo câu hỏi trắc nghiệm ôn tập (Quiz)?</Text>
            <TouchableOpacity
              style={[styles.quizToggleBox, includeQuiz && styles.quizToggleBoxActive]}
              onPress={() => onToggleQuiz(!includeQuiz)}
              activeOpacity={0.8}
            >
              <View style={styles.quizToggleLeft}>
                <Text style={styles.quizToggleIcon}>{includeQuiz ? '🎯' : '⚡'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quizToggleTitle}>
                    {includeQuiz ? 'Bật tạo câu hỏi trắc nghiệm ôn tập' : 'Bỏ qua trắc nghiệm (Xử lý siêu tốc)'}
                  </Text>
                  <Text style={styles.quizToggleDesc}>
                    {includeQuiz
                      ? 'AI tự động biên soạn câu hỏi 4 lựa chọn củng cố kiến thức'
                      : 'Chỉ bóc tách phụ đề & tóm tắt, tiết kiệm thời gian'}
                  </Text>
                </View>
              </View>
              <Switch
                value={includeQuiz}
                onValueChange={onToggleQuiz}
                trackColor={{ false: '#334155', true: '#4338ca' }}
                thumbColor={includeQuiz ? '#818cf8' : '#94a3b8'}
              />
            </TouchableOpacity>
          </View>

          {/* Hàng nút bấm */}
          <View style={[styles.actionRow, { marginTop: spacing.md }]}>
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
              <Text style={styles.submitText}>🚀 BẮT ĐẦU TẠO PHỤ ĐỀ</Text>
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
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  durationBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  durationText: {
    color: '#818cf8',
    fontSize: 11.5,
    fontWeight: '600',
  },
  sectionBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  radioOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: colors.primaryLight,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInnerCircle: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primaryLight,
  },
  radioLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  radioDesc: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  rangePickerCard: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
  },
  rangePickerLabel: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginBottom: 6,
  },
  timeRangeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRangeField: {
    flex: 1,
  },
  timeRangeLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 3,
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
  quizToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  quizToggleBoxActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.35)',
  },
  quizToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 8,
  },
  quizToggleIcon: {
    fontSize: 18,
  },
  quizToggleTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  quizToggleDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
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
