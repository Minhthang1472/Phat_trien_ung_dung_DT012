import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../../constants/theme';

/**
 * Section nhập URL hoặc chọn file từ máy, chọn ngôn ngữ đích và các nút bắt đầu
 */
export default function HomeInputSection({
  videoUrl,
  onChangeVideoUrl,
  onClearVideoUrl,
  targetLang,
  onChangeTargetLang,
  supportedLanguages = [],
  loading = false,
  loadingStep = '',
  onProcessVideo,
  onCancelProcessing,
  onPairVideoAndSubtitle,
  onUploadFile,
}) {
  return (
    <View style={styles.cardSection}>
      <Text style={styles.sectionHeader}>🔗 HỘP NHẬP LIÊN KẾT BÀI GIẢNG</Text>

      {/* Ô nhập liên kết */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.urlInput}
          value={videoUrl}
          onChangeText={onChangeVideoUrl}
          placeholder="Dán đường dẫn YouTube, Drive, LMS..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        {videoUrl.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={onClearVideoUrl}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chọn Ngôn ngữ Dịch */}
      <Text style={styles.subLabel}>Dịch phụ đề sang (Ngôn ngữ hiển thị):</Text>
      <View style={styles.langRow}>
        {supportedLanguages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.langChip,
              targetLang === lang.code && styles.activeLangChip,
            ]}
            onPress={() => onChangeTargetLang(lang.code)}
            disabled={loading}
          >
            <Text
              style={[
                styles.langChipText,
                targetLang === lang.code && styles.activeLangChipText,
              ]}
            >
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Nhóm các nút hành động xử lý bài giảng */}
      <View style={styles.actionButtonGroup}>
        {/* Nút chính: Bắt đầu Tạo Phụ đề AI */}
        <TouchableOpacity
          style={[styles.primaryActionBtn, loading && styles.disabledBtn]}
          onPress={onProcessVideo}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.loadingText}>{loadingStep}</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.primaryActionBtnText}>⚡ BẮT ĐẦU TẠO PHỤ ĐỀ & TÓM TẮT</Text>
              <Text style={styles.primaryActionBtnSubText}>
                Tự động tối ưu: &lt; 30p bóc tách toàn bộ • ≥ 30p xem ngay & nạp ngầm
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Nút Hủy Xử Lý nếu đang chạy */}
        {loading && (
          <TouchableOpacity
            style={styles.cancelProcessingBtn}
            onPress={onCancelProcessing}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelProcessingBtnText}>🛑 HỦY TIẾN TRÌNH (GIẢI PHÓNG CPU / RAM)</Text>
          </TouchableOpacity>
        )}

        {/* Nút 2: Ghép đôi Video + Phụ đề có sẵn */}
        <TouchableOpacity
          style={[styles.pairBtn, loading && styles.disabledBtn]}
          onPress={onPairVideoAndSubtitle}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.pairBtnText}>🔗 GHÉP ĐÔI VIDEO + PHỤ ĐỀ (SIÊU TỐC)</Text>
        </TouchableOpacity>

        {/* Nút 3: Upload File Nội bộ từ thiết bị */}
        <TouchableOpacity
          style={[styles.uploadBtn, loading && styles.disabledBtn]}
          onPress={onUploadFile}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.uploadBtnText}>📁 UPLOAD FILE TỪ THIẾT BỊ (MP4 / MP3)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardSection: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  urlInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  clearBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  subLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  langChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  activeLangChip: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  langChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activeLangChipText: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  actionButtonGroup: {
    gap: 2,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  primaryActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primaryActionBtnSubText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  cancelProcessingBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelProcessingBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  pairBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  pairBtnText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  uploadBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  uploadBtnText: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
