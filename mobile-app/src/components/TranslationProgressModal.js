import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import LottieAnimation from './LottieAnimation';

// Nạp file animation JSON mà người dùng đã tải
const loadingLottieJson = require('../../assets/LOADING.json');

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
          icon: '🎧',
          sub: 'Đang trích xuất luồng Audio & tối ưu tần số 16kHz...',
        };
      case 'whisper':
        return {
          stepNum: '2/4',
          label: 'WHISPER AI NHẬN DIỆN GIỌNG NÓI',
          icon: '🎙️',
          sub: 'Mô hình ASR đang bóc tách lời giảng & đồng bộ timestamp...',
        };
      case 'translation':
        return {
          stepNum: '3/4',
          label: `DỊCH THUẬT CHUYÊN NGÀNH (${targetLanguageName.toUpperCase()})`,
          icon: '🌐',
          sub: 'AI đang dịch ngữ cảnh học thuật và chuẩn hóa thuật ngữ...',
        };
      case 'summary':
        return {
          stepNum: '4/4',
          label: 'TỔNG HỢP NỘI DUNG & TẠO QUIZ',
          icon: '🧠',
          sub: 'Trích xuất luận điểm cốt lõi, công thức & bộ trắc nghiệm ôn tập...',
        };
      case 'done':
        return {
          stepNum: '✓',
          label: 'HOÀN TẤT TIẾN TRÌNH!',
          icon: '🎉',
          sub: 'Dữ liệu đã sẵn sàng, đang chuyển vào phòng học tương tác...',
        };
      default:
        return {
          stepNum: '...',
          label: 'ĐANG XỬ LÝ DỮ LIỆU...',
          icon: '⚡',
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

          {/* Khu vực Animation Lottie */}
          <View style={styles.animationWrap}>
            <LottieAnimation
              source={loadingLottieJson}
              style={{ width: 140, height: 140 }}
              autoPlay
              loop
            />
            {/* Hiển thị số phần trăm lớn */}
            <View style={styles.percentFloatingWrap}>
              <Text style={styles.percentText}>{roundedPercent}%</Text>
            </View>
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
              <Text style={styles.stageLabel}>
                {stageInfo.icon} {stageInfo.label}
              </Text>
              <Text style={styles.stagePercentSmall}>{roundedPercent}%</Text>
            </View>
            <Text style={styles.stageDescText} numberOfLines={2}>
              {stageInfo.sub}
            </Text>
          </View>

          {/* Hộp Thống kê Thời gian thực (Real-time Timer & ETA) */}
          <View style={styles.timerStatsBox}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>⏱️ ĐÃ XỬ LÝ</Text>
              <Text style={styles.statValue}>{formatSeconds(elapsedSeconds)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>⏳ DỰ KIẾN CÒN</Text>
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
              <Text style={styles.statLabel}>⚡ TỐC ĐỘ</Text>
              <Text style={styles.statValue}>GPU Colab</Text>
            </View>
          </View>

          {/* 4 Giai đoạn xử lý chi tiết (Checklist trực quan) */}
          <View style={styles.checklistCard}>
            <StepItem
              icon="🎧"
              title="1. Bóc tách & nén âm thanh"
              status={getStepStatus('audio')}
            />
            <StepItem
              icon="🎙️"
              title="2. Whisper AI nhận diện giọng nói & timeline"
              status={getStepStatus('whisper')}
            />
            <StepItem
              icon="🌐"
              title={`3. Dịch thuật song ngữ (${targetLanguageName})`}
              status={getStepStatus('translation')}
            />
            <StepItem
              icon="🧠"
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
              <Text style={styles.cancelBtnText}>
                🛑 HỦY TIẾN TRÌNH (GIẢI PHÓNG BỘ NHỚ)
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

  return (
    <View style={[styles.stepItem, isActive && styles.stepItemActive]}>
      <Text style={styles.stepStatusIcon}>
        {isDone ? '✅' : isActive ? '⏳' : '⚪'}
      </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#131B2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#23324C',
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(79, 70, 229, 0.25)',
      },
      default: {
        elevation: 16,
      },
    }),
  },
  header: {
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818CF8',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  animationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
    height: 140,
  },
  percentFloatingWrap: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  percentText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#22D3EE',
    letterSpacing: 0.5,
  },
  progressSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#0E1626',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#06B6D4',
    borderRadius: 5,
  },
  progressBarFillDone: {
    backgroundColor: '#10B981',
  },
  progressSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  stageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.3,
  },
  stagePercentSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06B6D4',
  },
  stageDescText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 15,
  },
  timerStatsBox: {
    flexDirection: 'row',
    backgroundColor: '#0B1120',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1E293B',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  statValueHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },
  checklistCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  stepItemActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  stepStatusIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  stepTitle: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  stepTitleActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  stepTitleDone: {
    color: '#10B981',
    fontWeight: '500',
  },
  cancelBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
