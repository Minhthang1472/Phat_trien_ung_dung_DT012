import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, shadows, spacing } from '../constants/theme';
import Icon from './ui/Icon';
import LanguageMark from './ui/LanguageMark';

export default function LectureCard({
  lecture,
  onPress,
  onDelete,
  isFavorite = false,
  onToggleFavorite,
  playbackProgress,
  onExportSRT,
  onExportSummary,
}) {
  const [exporting, setExporting] = useState(false);

  // Trích xuất YouTube Video ID để lấy Thumbnail HD
  const ytMatch = lecture?.video_url?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  const youtubeId = ytMatch ? ytMatch[1] : null;
  const isLocalUpload =
    lecture?.video_url?.startsWith('local_file://') ||
    lecture?.media_url?.startsWith('/uploads/') ||
    lecture?.media_stream_url?.startsWith('/uploads/');

  const isAudio =
    lecture?.video_url?.endsWith('.mp3') ||
    lecture?.video_url?.endsWith('.m4a') ||
    lecture?.media_mime_type?.startsWith('audio');

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Cặp ngôn ngữ nguồn → đích (dùng icon Material thay cho emoji cờ)
  const getLanguagePair = () => {
    const src = (lecture?.detected_language || 'auto').toUpperCase();
    const dst = (lecture?.language || 'vi').toUpperCase();
    return {
      src: src === 'AUTO' || src === dst ? null : src,
      dst,
    };
  };

  const handleQuickExportSRT = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!onExportSRT) return;
    setExporting(true);
    try {
      await onExportSRT(lecture);
    } finally {
      setExporting(false);
    }
  };

  const handleQuickExportSummary = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!onExportSummary) return;
    setExporting(true);
    try {
      await onExportSummary(lecture);
    } finally {
      setExporting(false);
    }
  };

  const percent = playbackProgress?.percent || 0;
  const currentTime = playbackProgress?.currentTime || 0;
  const duration = lecture?.duration_seconds || playbackProgress?.duration || 0;
  const quizCount = lecture?.quiz?.length || 0;
  const langPair = getLanguagePair();

  return (
    <TouchableOpacity
      style={[styles.card, isFavorite ? shadows.coral : shadows.card]}
      onPress={() => onPress && onPress(lecture)}
      activeOpacity={0.85}
    >
      <View style={styles.mainRow}>
        {/* Thumbnail */}
        <View style={styles.thumbnailWrapper}>
          {youtubeId ? (
            <Image
              source={{ uri: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` }}
              style={styles.thumbnailImg}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={
                isLocalUpload
                  ? ['#D9FBF0', '#B8F5E2']
                  : ['#FFEAE6', '#FFDCD6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.localThumbnail}
            >
              <Icon
                name={isAudio ? 'mic' : 'video'}
                size={26}
                color={isLocalUpload ? colors.mintDeep : colors.coralDeep}
              />
            </LinearGradient>
          )}

          {/* Play overlay dạng kính */}
          <View style={styles.thumbnailPlayOverlay}>
            <Icon name="play" size={18} color={colors.coral} />
          </View>

          <View style={styles.durationPill}>
            <Text style={styles.durationPillText}>
              {formatDuration(lecture?.duration_seconds)}
            </Text>
          </View>
        </View>

        {/* Nội dung */}
        <View style={styles.contentCol}>
          <View style={styles.topMetaRow}>
            <View style={styles.tagsGroup}>
              <View
                style={[
                  styles.sourceTag,
                  isLocalUpload ? styles.sourceTagUpload : styles.sourceTagYoutube,
                ]}
              >
                <View
                  style={[
                    styles.sourceDot,
                    {
                      backgroundColor: isLocalUpload ? colors.mint : '#FF4D4F',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.sourceTagText,
                    {
                      color: isLocalUpload ? colors.mintDeep : '#93000A',
                    },
                  ]}
                >
                  {isLocalUpload ? 'File máy' : 'YouTube'}
                </Text>
              </View>

              <View style={styles.langPairTag}>
                <LanguageMark code={lecture?.language || 'vi'} size={12} />
                <Text style={styles.langPairTagText} numberOfLines={1}>
                  {langPair.src ? `${langPair.src} → ${langPair.dst}` : langPair.dst}
                </Text>
              </View>
            </View>

            <View style={styles.actionsRight}>
              {onToggleFavorite ? (
                <TouchableOpacity
                  style={[styles.actionBtn, isFavorite && styles.actionBtnFavActive]}
                  onPress={(e) => {
                    if (e && e.stopPropagation) e.stopPropagation();
                    onToggleFavorite(lecture);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                  accessibilityLabel="Ghim bài giảng"
                >
                  <Icon
                    name={isFavorite ? 'star' : 'starOutline'}
                    size={17}
                    color={isFavorite ? colors.lemon : colors.slate}
                  />
                </TouchableOpacity>
              ) : null}

              {onDelete ? (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={(e) => {
                    if (e && e.stopPropagation) e.stopPropagation();
                    onDelete(lecture);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                  accessibilityLabel="Xóa bài giảng"
                >
                  <Icon name="delete" size={16} color={colors.coralDeep} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {lecture?.title || 'Bài giảng không tên'}
          </Text>
        </View>
      </View>

      {/* Trích đoạn tóm tắt */}
      {lecture?.summary ? (
        <View style={styles.summaryBox}>
          <Icon name="bulb" size={17} color="#E0A100" style={styles.summaryIcon} />
          <Text style={styles.summaryText} numberOfLines={2}>
            {lecture.summary}
          </Text>
        </View>
      ) : null}

      {/* Thư mục & thẻ */}
      {(lecture?.folder || (lecture?.tags && lecture.tags.length > 0)) ? (
        <View style={styles.folderTagsRow}>
          {lecture?.folder ? (
            <View style={styles.folderBadge}>
              <Icon name="folder" size={11} color={colors.coral} />
              <Text style={styles.folderBadgeText} numberOfLines={1}>
                {lecture.folder}
              </Text>
            </View>
          ) : null}
          {lecture?.tags && lecture.tags.map((tag, tIdx) => (
            <View key={tIdx} style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Hàng tác vụ */}
      <View style={styles.footerRow}>
        {quizCount > 0 ? (
          <View style={styles.quizBadge}>
            <Icon name="quiz" size={14} color={colors.mintDeep} />
            <Text style={styles.quizBadgeText}>{quizCount} câu trắc nghiệm</Text>
          </View>
        ) : (
          <View />
        )}

        <View style={styles.quickExportGroup}>
          {onExportSRT ? (
            <TouchableOpacity
              style={styles.quickExportBtn}
              onPress={handleQuickExportSRT}
              disabled={exporting}
              activeOpacity={0.75}
            >
              <Icon name="subtitles" size={13} color={colors.violet} />
              <Text style={styles.quickExportBtnText}>SRT</Text>
            </TouchableOpacity>
          ) : null}

          {onExportSummary ? (
            <TouchableOpacity
              style={styles.summaryBtn}
              onPress={handleQuickExportSummary}
              disabled={exporting}
              activeOpacity={0.8}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="summary" size={13} color="#FFFFFF" />
                  <Text style={styles.summaryBtnText}>Tóm tắt</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Tiến độ xem dở */}
      {percent > 0 ? (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(4, percent))}%` },
                percent >= 90 && styles.progressBarFillDone,
              ]}
            />
          </View>
          <View style={styles.progressInfoRow}>
            <Text style={styles.progressText} numberOfLines={1}>
              {percent >= 90 ? 'Đã hoàn thành' : `Đang học: ${percent}%`} •{' '}
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </Text>
            <Text style={styles.resumeClickHint}>Tiếp tục ➔</Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    padding: spacing.md - 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumbnailWrapper: {
    width: 108,
    height: 80,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    position: 'relative',
    flexShrink: 0,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  localThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  thumbnailPlayOverlay: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignSelf: 'center',
    top: '50%',
    marginTop: -15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  durationPill: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(30, 27, 75, 0.78)',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationPillText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 12,
    color: '#FFFFFF',
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 5,
  },
  tagsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  sourceTagYoutube: {
    backgroundColor: colors.errorSoft,
  },
  sourceTagUpload: {
    backgroundColor: colors.mintSoft,
  },
  sourceDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  sourceTagText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 12,
  },
  langPairTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(81, 250, 193, 0.24)',
    flexShrink: 1,
  },
  langPairTagText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 12,
    color: colors.mintDeep,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnFavActive: {
    backgroundColor: colors.lemonSoft,
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  summaryIcon: {
    marginTop: 1,
  },
  summaryText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.slate,
  },
  folderTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
  },
  folderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.coralTint,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    maxWidth: '70%',
  },
  folderBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    lineHeight: 13,
    color: colors.coralDeep,
  },
  tagBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 9.5,
    lineHeight: 13,
    color: colors.slate,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 11,
  },
  quizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(81, 250, 193, 0.30)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  quizBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    lineHeight: 13,
    color: colors.mintDeep,
  },
  quickExportGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
    flexShrink: 0,
  },
  quickExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  quickExportBtnText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    lineHeight: 13,
    color: colors.slate,
  },
  summaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.violet,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    lineHeight: 13,
    color: '#FFFFFF',
  },
  progressContainer: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceHigh,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.coral,
    borderRadius: 3,
  },
  progressBarFillDone: {
    backgroundColor: colors.mint,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.slate,
  },
  resumeClickHint: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.coral,
  },
});
