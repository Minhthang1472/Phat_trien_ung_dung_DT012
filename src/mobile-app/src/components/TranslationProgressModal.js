import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, shadows, spacing } from '../constants/theme';
import Icon from './ui/Icon';

/**
 * Helper format số giây thành dạng mm:ss
 */
const formatSeconds = (sec) => {
  if (!sec || isNaN(sec) || sec <= 0) return '00:00';
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Modal hiển thị tiến độ dịch thuật bài giảng trực quan (0% - 100%)
 * Có Lottie animation, tiến trình 4 giai đoạn, đếm thời gian thực & dự kiến còn lại
 */
export default function TranslationProgressModal({
  visible = false,
  progress = 0,
  stage = 'audio', // 'audio' | 'whisper' | 'translation' | 'summary' | 'done'
  title = '',
  targetLanguageName = 'Tiếng Việt',
  elapsedSeconds = 0,
  estimatedTotalSeconds = 30,
  onCancel,
}) {
  if (!visible) return null;

  // Tính thời gian dự kiến còn lại
  const remainingSeconds = Math.max(0, estimatedTotalSeconds - elapsedSeconds);

  // Xác định text tiêu đề giai đoạn hiện tại
  const getStageInfo = () => {
    switch (stage) {
      case 'audio':
        return {
          stepNum: '1/4',
          label: 'BÓC TÁCH & CHUẨN HÓA ÂM THANH',
          icon: 'headphones',
          sub: 'Đang trích xuất luồng Audio & tối ưu tần số 16kHz...',
        };
      case 'whisper':
        return {
          stepNum: '2/4',
          label: 'WHISPER AI NHẬN DIỆN GIỌNG NÓI',
          icon: 'mic',
          sub: 'Mô hình ASR đang bóc tách lời giảng & đồng bộ timestamp...',
        };
      case 'translation':
        return {
          stepNum: '3/4',
          label: `DỊCH THUẬT CHUYÊN NGÀNH (${targetLanguageName.toUpperCase()})`,
          icon: 'translate',
          sub: 'AI đang dịch ngữ cảnh học thuật và chuẩn hóa thuật ngữ...',
        };
      case 'summary':
        return {
          stepNum: '4/4',
          label: 'TỔNG HỢP NỘI DUNG & TẠO QUIZ',
          icon: 'psychology',
          sub: 'Trích xuất luận điểm cốt lõi, công thức & bộ trắc nghiệm ôn tập...',
        };
      case 'done':
        return {
          stepNum: '4/4',
          label: 'HOÀN TẤT TIẾN TRÌNH!',
          icon: 'celebration',
          sub: 'Dữ liệu đã sẵn sàng, đang chuyển vào phòng học tương tác...',
        };
      default:
        return {
          stepNum: '—',
          label: 'ĐANG XỬ LÝ DỮ LIỆU...',
          icon: 'bolt',
          sub: 'Vui lòng chờ trong giây lát...',
        };
    }
  };

  const stageInfo = getStageInfo();

  // Xác định trạng thái của từng bước trong Checklist
  // Trả về 'done' | 'active' | 'pending'
  const getStepStatus = (stepKey) => {
    const order = ['audio', 'whisper', 'translation', 'summary', 'done'];
    const currentIndex = order.indexOf(stage);
    const targetIndex = order.indexOf(stepKey);

    if (stage === 'done' || currentIndex > targetIndex) return 'done';
    if (currentIndex === targetIndex) return 'active';
    return 'pending';
  };

  const roundedPercent = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header với Huy hiệu AI LIVE & Tên bài giảng */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>AI PIPELINE ĐANG XỬ LÝ</Text>
              </View>
              <Text style={styles.stepBadge}>BƯỚC {stageInfo.stepNum}</Text>
            </View>

            <Text style={styles.title} numberOfLines={1}>
              {title || 'Đang chuẩn bị bài giảng...'}
            </Text>
          </View>

          {/* Khối orb tiến trình: icon giai đoạn + % lớn */}
          <View style={styles.animationWrap}>
            <LinearGradient
              colors={['#FF8A65', '#FF6F61', '#7B2CBF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orb}
            >
              <Icon name={stageInfo.icon} size={26} color="#FFFFFF" />
              <Text style={styles.percentText}>{roundedPercent}%</Text>
              <Text style={styles.orbLabel}>ĐANG XỬ LÝ</Text>
            </LinearGradient>
          </View>

          {/* Thanh Tiến trình (Progress Bar) */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(5, roundedPercent)}%` },
                  roundedPercent >= 100 && styles.progressBarFillDone,
                ]}
              />
            </View>
            <View style={styles.progressSubRow}>
              <View style={styles.stageLabelRow}>
                <Icon name={stageInfo.icon} size={14} color={colors.coral} />
                <Text style={styles.stageLabel} numberOfLines={1}>
                  {stageInfo.label}
                </Text>
              </View>
              <Text style={styles.stagePercentSmall}>{roundedPercent}%</Text>
            </View>
            <Text style={styles.stageDescText} numberOfLines={2}>
              {stageInfo.sub}
            </Text>
          </View>

          {/* Hộp Thống kê Thời gian thực (Real-time Timer & ETA) */}
          <View style={styles.timerStatsBox}>
            <View style={styles.statCol}>
              <View style={styles.statLabelRow}>
                <Icon name="timer" size={11} color={colors.slate} />
                <Text style={styles.statLabel}>ĐÃ XỬ LÝ</Text>
              </View>
              <Text style={styles.statValue}>{formatSeconds(elapsedSeconds)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <View style={styles.statLabelRow}>
                <Icon name="hourglass" size={11} color={colors.slate} />
                <Text style={styles.statLabel}>DỰ KIẾN CÒN</Text>
              </View>
              <Text style={styles.statValueHighlight}>
                {stage === 'done'
                  ? '00:00'
                  : remainingSeconds > 0
                  ? `~${formatSeconds(remainingSeconds)}`
                  : 'Đang kết thúc...'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <View style={styles.statLabelRow}>
                <Icon name="bolt" size={11} color={colors.slate} />
                <Text style={styles.statLabel}>TỐC ĐỘ</Text>
              </View>
              <Text style={styles.statValue}>GPU Colab</Text>
            </View>
          </View>

          {/* 4 Giai đoạn xử lý chi tiết (Checklist trực quan) */}
          <View style={styles.checklistCard}>
            <StepItem
              icon="headphones"
              title="1. Bóc tách & nén âm thanh"
              status={getStepStatus('audio')}
            />
            <StepItem
              icon="mic"
              title="2. Whisper AI nhận diện giọng nói & timeline"
              status={getStepStatus('whisper')}
            />
            <StepItem
              icon="translate"
              title={`3. Dịch thuật song ngữ (${targetLanguageName})`}
              status={getStepStatus('translation')}
            />
            <StepItem
              icon="psychology"
              title="4. Tóm tắt nội dung, công thức & tạo Quiz"
              status={getStepStatus('summary')}
            />
          </View>

          {/* Nút Hủy tiến trình giải phóng CPU/GPU */}
          {onCancel && stage !== 'done' && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Icon name="cancel" size={14} color={colors.error} />
              <Text style={styles.cancelBtnText}>
                HỦY TIẾN TRÌNH (GIẢI PHÓNG BỘ NHỚ)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * Component hiển thị từng dòng trong checklist 4 giai đoạn
 */
function StepItem({ icon, title, status }) {
  const isDone = status === 'done';
  const isActive = status === 'active';
  const tint = isDone ? colors.mintDeep : isActive ? colors.coral : colors.muted;

  return (
    <View style={[styles.stepItem, isActive && styles.stepItemActive]}>
      <View
        style={[
          styles.stepIconWrap,
          isDone && styles.stepIconWrapDone,
          isActive && styles.stepIconWrapActive,
        ]}
      >
        <Icon name={icon} size={13} color={tint} />
      </View>
      <Text
        style={[
          styles.stepTitle,
          isDone && styles.stepTitleDone,
          isActive && styles.stepTitleActive,
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Icon
        name={isDone ? 'checkCircle' : isActive ? 'hourglass' : 'circleOutline'}
        size={13}
        color={tint}
      />
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
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg - 4,
    ...shadows.floating,
  },
  header: {
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mintSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(6, 214, 160, 0.28)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mint,
    marginRight: 6,
  },
  liveText: {
    fontFamily: fonts.extraBold,
    fontSize: 9.5,
    lineHeight: 13,
    color: colors.mintDeep,
    letterSpacing: 0.5,
  },
  stepBadge: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.violet,
    backgroundColor: colors.violetSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(123, 44, 191, 0.18)',
    overflow: 'hidden',
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.ink,
  },
  animationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  orb: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    ...shadows.coral,
  },
  percentText: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    lineHeight: 32,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  orbLabel: {
    fontFamily: fonts.extraBold,
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: 1.2,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  progressSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
  },
  progressBarFillDone: {
    backgroundColor: colors.mint,
  },
  progressSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 8,
  },
  stageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  stageLabel: {
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.ink,
    letterSpacing: 0.2,
  },
  stagePercentSmall: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.coral,
  },
  stageDescText: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 3,
  },
  timerStatsBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.outline,
  },
  statLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    lineHeight: 13,
    color: colors.muted,
    letterSpacing: 0.3,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.ink,
  },
  statValueHighlight: {
    fontFamily: fonts.extraBold,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.coral,
  },
  checklistCard: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 14,
    gap: 2,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    gap: 8,
  },
  stepItemActive: {
    backgroundColor: colors.coralTint,
  },
  stepIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceBright,
  },
  stepIconWrapDone: {
    backgroundColor: colors.mintSoft,
  },
  stepIconWrapActive: {
    backgroundColor: colors.surfaceBright,
  },
  stepTitle: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.muted,
  },
  stepTitleActive: {
    color: colors.coralDeep,
    fontFamily: fonts.bold,
  },
  stepTitleDone: {
    color: colors.mintDeep,
    fontFamily: fonts.semiBold,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.errorSoft,
    borderRadius: radius.sm,
    paddingVertical: 11,
  },
  cancelBtnText: {
    color: colors.error,
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});
