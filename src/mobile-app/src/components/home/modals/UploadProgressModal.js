import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, fonts, radius, shadows, spacing } from '../../../constants/theme';
import Icon from '../../ui/Icon';

const STAGE_META = {
  uploading: { icon: 'upload', tint: colors.coralTint, color: colors.coral },
  whisper: { icon: 'mic', tint: colors.violetSoft, color: colors.violet },
  translating: { icon: 'translate', tint: colors.mintSoft, color: colors.mintDeep },
  summarizing: { icon: 'psychology', tint: colors.lemonSoft, color: '#8A6100' },
  done: { icon: 'checkCircle', tint: colors.mintSoft, color: colors.mintDeep },
};

/**
 * Modal hiển thị tiến trình tải file lên server và bóc tách AI
 */
export default function UploadProgressModal({
  visible,
  uploadProgress,
  stage = 'uploading',
  stageProgress = 0,
  uploadDetails = { name: '', size: '' },
  targetLanguageName = 'Tiếng Việt',
  onCancel,
}) {
  if (!visible) return null;

  const meta = STAGE_META[stage] || STAGE_META.uploading;

  const step2Status = ['translating', 'summarizing', 'done'].includes(stage)
    ? 'done'
    : stage === 'whisper'
    ? 'active'
    : 'pending';
  const step3Status = ['summarizing', 'done'].includes(stage)
    ? 'done'
    : stage === 'translating'
    ? 'active'
    : 'pending';
  const step4Status = stage === 'done' ? 'done' : stage === 'summarizing' ? 'active' : 'pending';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: meta.tint }]}>
              <Icon name={meta.icon} size={22} color={meta.color} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>
                {stage === 'uploading'
                  ? 'BƯỚC 1/4 • ĐANG TẢI LÊN MÁY CHỦ'
                  : stage === 'whisper'
                  ? 'BƯỚC 2/4 • WHISPER BÓC TÁCH GIỌNG NÓI'
                  : stage === 'translating'
                  ? `BƯỚC 3/4 • DỊCH THUẬT SANG ${targetLanguageName.toUpperCase()}`
                  : stage === 'summarizing'
                  ? 'BƯỚC 4/4 • TỔNG HỢP TÓM TẮT & TẠO QUIZ'
                  : 'HOÀN TẤT XỬ LÝ BÀI GIẢNG!'}
              </Text>
              <Text style={styles.fileName} numberOfLines={1}>
                {uploadDetails.name || 'Bài giảng'} {uploadDetails.size ? `(${uploadDetails.size})` : ''}
              </Text>
            </View>
            <Text style={styles.percentText}>{stageProgress}%</Text>
          </View>

          {/* Thanh tiến trình Progress Bar */}
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.max(6, stageProgress)}%` },
                stageProgress >= 100 && styles.fillDone,
              ]}
            />
          </View>

          {/* Checklist 4 Giai đoạn */}
          <View style={styles.checklist}>
            <StepRow
              status={uploadProgress >= 100 ? 'done' : 'active'}
              text={`1. Tải file lên máy chủ (${uploadProgress}%)`}
            />
            <StepRow status={step2Status} text="2. Nhận diện giọng nói (ASR) & timestamps" />
            <StepRow
              status={step3Status}
              text={`3. Dịch thuật song ngữ (${targetLanguageName})`}
            />
            <StepRow
              status={step4Status}
              text="4. Tổng hợp nội dung bài giảng & biên soạn Quiz"
            />
          </View>

          {/* Nút Hủy */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Icon name="close" size={14} color={colors.error} />
            <Text style={styles.cancelBtnText}>
              HỦY TIẾN TRÌNH ĐANG CHẠY (GIẢI PHÓNG BỘ NHỚ)
            </Text>
          </TouchableOpacity>

          <View style={styles.limitBadge}>
            <Icon name="video" size={13} color={colors.violet} />
            <Text style={styles.limitText}>
              Sau khi hoàn tất, bạn có thể xuất video kèm phụ đề (MP4) ngay trong trình phát!
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StepRow({ status, text }) {
  const done = status === 'done';
  const active = status === 'active';

  return (
    <View style={styles.checkItem}>
      <View
        style={[
          styles.checkIconWrap,
          done && styles.checkIconWrapDone,
          active && styles.checkIconWrapActive,
        ]}
      >
        <Icon
          name={done ? 'checkCircle' : active ? 'hourglass' : 'circleOutline'}
          size={13}
          color={done ? colors.mintDeep : active ? colors.coral : colors.muted}
        />
      </View>
      <Text
        style={[
          styles.checkText,
          done && styles.checkTextDone,
          active && styles.checkTextActive,
        ]}
      >
        {text}
      </Text>
    </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.ink,
    letterSpacing: 0.4,
  },
  fileName: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 2,
  },
  percentText: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.coral,
  },
  track: {
    height: 8,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
  },
  fillDone: {
    backgroundColor: colors.mint,
  },
  checklist: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    padding: 11,
    marginBottom: spacing.md,
    gap: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceBright,
  },
  checkIconWrapDone: {
    backgroundColor: colors.mintSoft,
  },
  checkIconWrapActive: {
    backgroundColor: colors.coralTint,
  },
  checkText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.muted,
  },
  checkTextActive: {
    color: colors.coralDeep,
    fontFamily: fonts.bold,
  },
  checkTextDone: {
    color: colors.mintDeep,
    fontFamily: fonts.semiBold,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.errorSoft,
    paddingVertical: 11,
    borderRadius: radius.sm,
  },
  cancelBtnText: {
    color: colors.error,
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: colors.violetSoft,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  limitText: {
    flex: 1,
    color: colors.violet,
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 15,
  },
});
