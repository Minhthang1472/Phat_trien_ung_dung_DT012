import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../../../constants/theme';
import Card from '../../ui/Card';
import Icon from '../../ui/Icon';
import IconBadge from '../../ui/IconBadge';
import LanguageMark from '../../ui/LanguageMark';
import GradientButton, { GradientButtonContent } from '../../ui/GradientButton';

/**
 * Section nhập URL hoặc chọn file từ máy, chọn ngôn ngữ đích và các nút bắt đầu.
 * Toàn bộ handler/state được truyền từ HomeScreen, component này chỉ trình bày.
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
  onPasteSample,
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <IconBadge icon="link" size={28} iconSize={15} tone="coral" />
          <Text style={styles.sectionHeader}>HỘP NHẬP LIÊN KẾT BÀI GIẢNG</Text>
        </View>
        <View style={styles.aiReadyPill}>
          <View style={styles.aiReadyDot} />
          <Text style={styles.aiReadyText}>Sẵn sàng</Text>
        </View>
      </View>

      {/* Ô nhập liên kết */}
      <View style={[styles.inputWrapper, loading && styles.inputWrapperDisabled]}>
        <Icon name="video" size={20} color={colors.slate} style={styles.inputIcon} />
        <TextInput
          style={styles.urlInput}
          value={videoUrl}
          onChangeText={onChangeVideoUrl}
          placeholder="Dán đường dẫn YouTube, Drive, LMS..."
          placeholderTextColor="rgba(71, 85, 105, 0.55)"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        {videoUrl.length > 0 ? (
          <TouchableOpacity
            style={styles.inlineBtn}
            onPress={onClearVideoUrl}
            activeOpacity={0.75}
            accessibilityLabel="Xóa liên kết"
          >
            <Icon name="close" size={14} color={colors.coral} />
          </TouchableOpacity>
        ) : onPasteSample ? (
          <TouchableOpacity
            style={styles.inlineBtn}
            onPress={onPasteSample}
            activeOpacity={0.75}
          >
            <Text style={styles.inlineBtnText}>Dán mẫu</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Chọn ngôn ngữ dịch */}
      <View style={styles.langHeaderRow}>
        <Text style={styles.subLabel}>Dịch phụ đề sang ngôn ngữ:</Text>
        <View style={styles.aiLangTag}>
          <Icon name="translate" size={13} color={colors.violet} />
          <Text style={styles.aiLangTagText}>Chuẩn song ngữ</Text>
        </View>
      </View>

      <View style={styles.langRow}>
        {supportedLanguages.map((lang) => {
          const active = targetLang === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langChip, active && styles.activeLangChip]}
              onPress={() => onChangeTargetLang(lang.code)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={[styles.langChipText, active && styles.activeLangChipText]}>
                {lang.label}
              </Text>
              <LanguageMark code={lang.code} size={16} active={active} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Nút hành động chính */}
      <GradientButton
        onPress={onProcessVideo}
        disabled={loading}
        style={styles.primaryAction}
        accessibilityLabel="Bắt đầu tạo phụ đề và tóm tắt"
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.loadingText} numberOfLines={2}>
              {loadingStep || 'Đang xử lý...'}
            </Text>
          </View>
        ) : (
          <GradientButtonContent
            title="BẮT ĐẦU TẠO PHỤ ĐỀ & TÓM TẮT"
            subtitle="Tự động tối ưu: < 30p bóc tách toàn bộ • ≥ 30p nạp ngầm siêu tốc"
            icon={<Icon name="bolt" size={20} color={colors.lemon} />}
          />
        )}
      </GradientButton>

      {loading ? (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancelProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelBtnText}>HỦY TIẾN TRÌNH (GIẢI PHÓNG CPU / RAM)</Text>
        </TouchableOpacity>
      ) : null}

      {/* Hai tác vụ phụ */}
      <View style={styles.quickRow}>
        <TouchableOpacity
          style={[styles.quickBtn, loading && styles.disabledBtn]}
          onPress={onPairVideoAndSubtitle}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Icon name="merge" size={18} color={colors.coral} />
          <Text style={styles.quickBtnText} numberOfLines={1}>
            Ghép đôi phụ đề
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickBtn, styles.quickBtnMint, loading && styles.disabledBtn]}
          onPress={onUploadFile}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Icon name="upload" size={18} color={colors.mintDeep} />
          <Text style={[styles.quickBtnText, styles.quickBtnTextMint]} numberOfLines={1}>
            Tải file MP4/MP3
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 16,
    letterSpacing: 0.7,
    color: colors.ink,
    flexShrink: 1,
  },
  aiReadyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.mintSoft,
  },
  aiReadyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mint,
  },
  aiReadyText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.mintDeep,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingLeft: 14,
    paddingRight: 6,
    height: 48,
    marginBottom: spacing.md,
  },
  inputWrapperDisabled: {
    opacity: 0.75,
  },
  inputIcon: {
    marginTop: -1,
  },
  urlInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 0,
  },
  inlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLowest,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  inlineBtnText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.coral,
  },
  langHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 8,
  },
  subLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.slate,
    flexShrink: 1,
  },
  aiLangTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  aiLangTagText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.violet,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  activeLangChip: {
    backgroundColor: colors.mintDeep,
    shadowColor: colors.mintDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  langChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.slate,
  },
  activeLangChipText: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  primaryAction: {
    marginBottom: spacing.sm,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 4,
  },
  loadingText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 17,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  cancelBtn: {
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.errorSoft,
    marginBottom: spacing.sm,
  },
  cancelBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.error,
    letterSpacing: 0.3,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.xs,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLow,
  },
  quickBtnMint: {
    backgroundColor: 'rgba(81, 250, 193, 0.28)',
  },
  quickBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.ink,
    flexShrink: 1,
  },
  quickBtnTextMint: {
    color: colors.mintDeep,
  },
  disabledBtn: {
    opacity: 0.55,
  },
});
