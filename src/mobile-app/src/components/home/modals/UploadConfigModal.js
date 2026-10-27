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
import LanguageMark from '../../ui/LanguageMark';
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
              <Icon name="upload" size={22} color={colors.coral} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>TÙY CHỌN DỊCH THUẬT &amp; TỔNG HỢP</Text>
              <View style={styles.fileRow}>
                <Icon name="folder" size={12} color={colors.muted} />
                <Text style={styles.subtitle} numberOfLines={1}>
                  {pendingFile?.name} {pendingFile?.size ? `(${pendingFile.size})` : ''}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionTitleRow}>
            <Icon name="translate" size={14} color={colors.violet} />
            <Text style={styles.sectionTitle}>
              Bạn muốn dịch phụ đề sang ngôn ngữ nào?
            </Text>
          </View>

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
                  <LanguageMark code={item.code} size={18} active={isSelected} />
                  <Text style={[styles.langOptionText, isSelected && styles.langOptionTextSelected]}>
                    {item.label}
                  </Text>
                  {isSelected && (
                    <Icon name="check" size={13} color={colors.coralDeep} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tùy chọn trắc nghiệm ôn tập AI */}
          <View style={styles.quizOptionRow}>
            <View style={styles.quizTextWrap}>
              <View style={styles.quizTitleRow}>
                <Icon name="psychology" size={14} color={colors.coral} />
                <Text style={styles.quizOptionTitle}>
                  Tạo câu hỏi trắc nghiệm tự luyện (Quiz)
                </Text>
              </View>
              <Text style={styles.quizOptionDesc}>
                Tự động tạo bộ câu hỏi kiểm tra sau khi dịch xong
              </Text>
            </View>
            <Switch
              value={includeQuiz}
              onValueChange={onToggleQuiz}
              trackColor={{ false: colors.surfaceHigh, true: colors.coral }}
              thumbColor="#FFFFFF"
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
                <View style={styles.cutIconWrap}>
                  <Icon name="cut" size={14} color={colors.violet} />
                </View>
                <View style={styles.advancedTextWrap}>
                  <Text style={styles.advancedOptionTitle}>Cắt khoảng thời gian bài giảng</Text>
                  <Text style={styles.advancedOptionSub}>Chỉ dịch đoạn bạn chọn (VD: 00:30 đến 05:00)</Text>
                </View>
              </View>
              <Switch
                value={enableTimeRange}
                onValueChange={onToggleTimeRange}
                trackColor={{ false: colors.surfaceHigh, true: colors.violet }}
                thumbColor="#FFFFFF"
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
                    value={timeRangeEnd}
                    onChangeText={onChangeTimeRangeEnd}
                    placeholder="Hết file"
                    placeholderTextColor={colors.muted}
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
              <Icon name="bolt" size={15} color="#FFFFFF" />
              <Text style={styles.submitText}>BẮT ĐẦU XỬ LÝ &amp; DỊCH</Text>
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
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    letterSpacing: 0.4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  subtitle: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm + 2,
  },
  sectionTitle: {
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.ink,
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
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  langOptionBtnSelected: {
    backgroundColor: colors.coralTint,
    borderColor: 'rgba(255, 111, 97, 0.34)',
  },
  langOptionText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate,
  },
  langOptionTextSelected: {
    color: colors.coralDeep,
    fontFamily: fonts.bold,
  },
  quizOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLow,
    padding: 11,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  quizTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  quizTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quizOptionTitle: {
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.ink,
  },
  quizOptionDesc: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 3,
  },
  uploadOptionCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    padding: 11,
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
    gap: 9,
  },
  cutIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedTextWrap: {
    flex: 1,
  },
  advancedOptionTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.ink,
  },
  advancedOptionSub: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 1,
  },
  timeRangeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  timeRangeField: {
    flex: 1,
  },
  timeRangeLabel: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 15,
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
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
