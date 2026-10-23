import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { spacing, borderRadius } from '../../../constants/theme';

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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>
                {stage === 'uploading'
                  ? '📤'
                  : stage === 'whisper'
                  ? '🎙️'
                  : stage === 'translating'
                  ? '🌐'
                  : stage === 'summarizing'
                  ? '🧠'
                  : '🎉'}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
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
            {/* Bước 1: Upload */}
            <View style={styles.checkItem}>
              <Text style={styles.checkIcon}>
                {uploadProgress >= 100 ? '✅' : '⏳'}
              </Text>
              <Text style={[styles.checkText, uploadProgress >= 100 && styles.checkTextDone]}>
                1. Tải file lên máy chủ ({uploadProgress}%)
              </Text>
            </View>

            {/* Bước 2: Whisper AI */}
            <View style={styles.checkItem}>
              <Text style={styles.checkIcon}>
                {['translating', 'summarizing', 'done'].includes(stage)
                  ? '✅'
                  : stage === 'whisper'
                  ? '⏳'
                  : '⚪'}
              </Text>
              <Text
                style={[
                  styles.checkText,
                  ['translating', 'summarizing', 'done'].includes(stage) && styles.checkTextDone,
                  stage === 'whisper' && styles.checkTextActive,
                ]}
              >
                2. Nhận diện giọng nói (ASR) & timestamps
              </Text>
            </View>

            {/* Bước 3: Dịch thuật */}
            <View style={styles.checkItem}>
              <Text style={styles.checkIcon}>
                {['summarizing', 'done'].includes(stage)
                  ? '✅'
                  : stage === 'translating'
                  ? '⏳'
                  : '⚪'}
              </Text>
              <Text
                style={[
                  styles.checkText,
                  ['summarizing', 'done'].includes(stage) && styles.checkTextDone,
                  stage === 'translating' && styles.checkTextActive,
                ]}
              >
                3. Dịch thuật song ngữ ({targetLanguageName})
              </Text>
            </View>

            {/* Bước 4: Tóm tắt & Quiz */}
            <View style={styles.checkItem}>
              <Text style={styles.checkIcon}>
                {stage === 'done'
                  ? '✅'
                  : stage === 'summarizing'
                  ? '⏳'
                  : '⚪'}
              </Text>
              <Text
                style={[
                  styles.checkText,
                  stage === 'done' && styles.checkTextDone,
                  stage === 'summarizing' && styles.checkTextActive,
                ]}
              >
                4. Tổng hợp nội dung bài giảng & biên soạn Quiz
              </Text>
            </View>
          </View>

          {/* Nút Hủy */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>🛑 HỦY TIẾN TRÌNH ĐANG CHẠY (GIẢI PHÓNG BỘ NHỚ)</Text>
          </TouchableOpacity>

          <View style={styles.limitBadge}>
            <Text style={styles.limitText}>
              🎬 Sau khi hoàn tất, bạn có thể xuất video kèm phụ đề (MP4) ngay trong trình phát!
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
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
  icon: {
    fontSize: 22,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#818cf8',
    letterSpacing: 0.5,
  },
  fileName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  percentText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#38bdf8',
  },
  track: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  fill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 4,
  },
  fillDone: {
    backgroundColor: '#10B981',
  },
  checklist: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: borderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    marginBottom: spacing.md,
    gap: 6,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIcon: {
    fontSize: 14,
  },
  checkText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
  },
  checkTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  checkTextDone: {
    color: '#10B981',
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#f87171',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  limitBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  limitText: {
    color: '#38bdf8',
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 15,
  },
});
