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
import { colors, fonts, radius, shadows, spacing } from '../../../constants/theme';
import Icon from '../../ui/Icon';
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
              <Icon name="video" size={22} color={colors.coral} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>CẤU HÌNH TẠO PHỤ ĐỀ</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {videoInfo?.title || 'Bài giảng video'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeIconBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={16} color={colors.slate} />
            </TouchableOpacity>
          </View>

          {/* Thông tin thời lượng video */}
          <View style={styles.durationBadge}>
            <Icon name="timer" size={13} color={colors.mintDeep} />
            <Text style={styles.durationText}>
              Tổng thời lượng: {durationFormatted}
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
              <View style={styles.radioContent}>
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
                styles.radioOptionSpaced,
                processMode === 'range' && styles.radioOptionActive,
              ]}
              onPress={() => onSelectMode('range')}
              activeOpacity={0.8}
            >
              <View style={styles.radioCircle}>
                {processMode === 'range' && <View style={styles.radioInnerCircle} />}
              </View>
              <View style={styles.radioContent}>
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
                      placeholderTextColor={colors.muted}
                    />
                  </View>
                  <Icon
                    name="arrowRight"
                    size={14}
                    color={colors.muted}
                    style={styles.timeRangeArrow}
                  />
                  <View style={styles.timeRangeField}>
                    <Text style={styles.timeRangeLabel}>Đến phút (mm:ss):</Text>
                    <TextInput
                      style={styles.timeRangeInput}
                      value={rangeEnd}
                      onChangeText={onChangeRangeEnd}
                      placeholder={durationFormatted}
                      placeholderTextColor={colors.muted}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Phần 2: Có muốn tạo câu hỏi trắc nghiệm hay không */}
          <View style={[styles.sectionBox, styles.sectionBoxSpaced]}>
            <Text style={styles.sectionTitle}>2. Tạo câu hỏi trắc nghiệm ôn tập (Quiz)?</Text>
            <TouchableOpacity
              style={[styles.quizToggleBox, includeQuiz && styles.quizToggleBoxActive]}
              onPress={() => onToggleQuiz(!includeQuiz)}
              activeOpacity={0.8}
            >
              <View style={styles.quizToggleLeft}>
                <View style={[styles.quizIconWrap, includeQuiz && styles.quizIconWrapActive]}>
                  <Icon
                    name={includeQuiz ? 'quiz' : 'bolt'}
                    size={15}
                    color={includeQuiz ? colors.violet : colors.coral}
                  />
                </View>
                <View style={styles.quizToggleTextWrap}>
                  <Text style={styles.quizToggleTitle}>
                    {includeQuiz ? 'Bật tạo câu hỏi trắc nghiệm ôn tập' : 'Bỏ qua trắc nghiệm (Xử lý siêu tốc)'}
                  </Text>
                  <Text style={styles.quizToggleDesc}>
                    {includeQuiz
                      ? 'Tự động biên soạn câu hỏi 4 lựa chọn củng cố kiến thức'
                      : 'Chỉ bóc tách phụ đề & tóm tắt, tiết kiệm thời gian'}
                  </Text>
                </View>
              </View>
              <Switch
                value={includeQuiz}
                onValueChange={onToggleQuiz}
                trackColor={{ false: colors.surfaceHigh, true: colors.violet }}
                thumbColor="#FFFFFF"
              />
            </TouchableOpacity>
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
              <Icon name="bolt" size={15} color="#FFFFFF" />
              <Text style={styles.submitText}>BẮT ĐẦU TẠO PHỤ ĐỀ</Text>
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
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surfaceBright,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.floating,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.coralTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
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
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.mintSoft,
    borderRadius: radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  durationText: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.mintDeep,
  },
  sectionBox: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    padding: 12,
  },
  sectionBoxSpaced: {
    marginTop: 12,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.ink,
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceBright,
    padding: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  radioOptionSpaced: {
    marginTop: 8,
  },
  radioOptionActive: {
    backgroundColor: colors.coralTint,
    borderColor: 'rgba(255, 111, 97, 0.38)',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.outlineStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInnerCircle: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.coral,
  },
  radioContent: {
    flex: 1,
    marginLeft: 10,
  },
  radioLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.ink,
  },
  radioDesc: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 2,
  },
  rangePickerCard: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  rangePickerLabel: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.muted,
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
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    color: colors.slate,
    marginBottom: 4,
  },
  timeRangeInput: {
    backgroundColor: colors.surfaceBright,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    color: colors.ink,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    paddingVertical: 7,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  timeRangeArrow: {
    marginHorizontal: 8,
    marginTop: 16,
  },
  quizToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceBright,
    padding: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  quizToggleBoxActive: {
    backgroundColor: colors.violetSoft,
    borderColor: 'rgba(123, 44, 191, 0.24)',
  },
  quizToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 9,
    marginRight: 8,
  },
  quizIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizIconWrapActive: {
    backgroundColor: 'rgba(123, 44, 191, 0.14)',
  },
  quizToggleTextWrap: {
    flex: 1,
  },
  quizToggleTitle: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.ink,
  },
  quizToggleDesc: {
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    color: colors.muted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md + 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate,
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.coral,
  },
  submitText: {
    fontFamily: fonts.extraBold,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
});
