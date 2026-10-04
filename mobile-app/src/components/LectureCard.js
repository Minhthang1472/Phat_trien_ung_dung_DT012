import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function LectureCard({
  lecture,
  onPress,
  onDelete,
  isFavorite = false,
  onToggleFavorite,
  playbackProgress,
  onExportSRT,
  onExportSummary,
  onEditMeta,
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

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Định dạng ngôn ngữ nguồn và đích
  const getLanguagePairText = () => {
    const src = (lecture?.detected_language || 'auto').toUpperCase();
    const dst = (lecture?.language || 'vi').toUpperCase();
    const flagMap = {
      VI: '🇻🇳',
      EN: '🇬🇧',
      JA: '🇯🇵',
      KO: '🇰🇷',
      ZH: '🇨🇳',
      FR: '🇫🇷',
      DE: '🇩🇪',
    };
    const srcFlag = flagMap[src] || '🌐';
    const dstFlag = flagMap[dst] || '🇻🇳';

    if (src === 'AUTO' || src === dst) {
      return `${dstFlag} ${dst}`;
    }
    return `${srcFlag} ${src} ➔ ${dstFlag} ${dst}`;
  };

  // Xử lý xuất file nhanh phụ đề
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

  // Xử lý xuất file nhanh tóm tắt
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

  // Tính toán tiến độ học
  const percent = playbackProgress?.percent || 0;
  const currentTime = playbackProgress?.currentTime || 0;
  const duration = lecture?.duration_seconds || playbackProgress?.duration || 0;

  return (
    <TouchableOpacity
      style={[styles.card, isFavorite && styles.cardFavorite]}
      onPress={() => onPress && onPress(lecture)}
      activeOpacity={0.82}
    >
      <View style={styles.mainRow}>
        {/* Khối Thumbnail trực quan */}
        <View style={styles.thumbnailWrapper}>
          {youtubeId ? (
            <Image
              source={{ uri: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` }}
              style={styles.thumbnailImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.localThumbnail}>
              <Text style={styles.localThumbnailIcon}>
                {lecture?.video_url?.endsWith('.mp3') || lecture?.video_url?.endsWith('.m4a') ? '🎙️' : '🎬'}
              </Text>
              <Text style={styles.localThumbnailLabel}>
                {isLocalUpload ? 'THIẾT BỊ' : 'MẪU'}
              </Text>
            </View>
          )}

          {/* Lớp phủ icon Play và thời lượng video */}
          <View style={styles.thumbnailPlayOverlay}>
            <Text style={styles.thumbnailPlayIcon}>▶</Text>
          </View>

          <View style={styles.durationPill}>
            <Text style={styles.durationPillText}>{formatDuration(lecture?.duration_seconds)}</Text>
          </View>
        </View>

        {/* Khối Nội dung chi tiết */}
        <View style={styles.contentCol}>
          {/* Hàng 1: Nguồn, Cặp ngôn ngữ & Nút Thao tác (Ghim, Xóa) */}
          <View style={styles.topMetaRow}>
            <View style={styles.tagsGroup}>
              {/* Nguồn bài giảng */}
              <View
                style={[
                  styles.sourceTag,
                  isLocalUpload ? styles.sourceTagUpload : styles.sourceTagYoutube,
                ]}
              >
                <Text
                  style={[
                    styles.sourceTagText,
                    isLocalUpload ? styles.sourceTagUploadText : styles.sourceTagYoutubeText,
                  ]}
                >
                  {isLocalUpload ? '📁 File máy' : '🔴 YouTube'}
                </Text>
              </View>

              {/* Cặp ngôn ngữ */}
              <View style={styles.langPairTag}>
                <Text style={styles.langPairTagText}>{getLanguagePairText()}</Text>
              </View>
            </View>

            {/* Các nút góc phải */}
            <View style={styles.actionsRight}>
              {/* Nút Ghim / Yêu thích */}
              {onToggleFavorite && (
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
                  <Text style={[styles.starIconText, isFavorite && styles.starIconActive]}>
                    {isFavorite ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Nút Phân loại Thư mục & Thẻ */}
              {onEditMeta && (
                <TouchableOpacity
                  style={styles.metaBtn}
                  onPress={(e) => {
                    if (e && e.stopPropagation) e.stopPropagation();
                    onEditMeta(lecture);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                  accessibilityLabel="Phân loại bài giảng"
                >
                  <Text style={styles.metaIconText}>🏷️</Text>
                </TouchableOpacity>
              )}

              {/* Nút Xóa */}
              {onDelete && (
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
                  <Text style={styles.deleteIconText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tiêu đề bài giảng */}
          <Text style={styles.title} numberOfLines={2}>
            {lecture?.title || 'Bài giảng không tên'}
          </Text>

          {/* Đoạn trích Tóm tắt AI */}
          {lecture?.summary ? (
            <Text style={styles.summaryText} numberOfLines={2}>
              💡 {lecture.summary}
            </Text>
          ) : null}

          {/* Thư mục & Thẻ phân loại (Yêu cầu 8) */}
          {(lecture?.folder || (lecture?.tags && lecture.tags.length > 0)) && (
            <View style={styles.folderTagsRow}>
              {lecture?.folder ? (
                <View style={styles.folderBadge}>
                  <Text style={styles.folderBadgeText}>📁 {lecture.folder}</Text>
                </View>
              ) : null}
              {lecture?.tags && lecture.tags.map((tag, tIdx) => (
                <View key={tIdx} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Hàng nhãn phụ & Tác vụ nhanh */}
          <View style={styles.footerRow}>
            {/* Bộ câu hỏi Quiz */}
            {lecture?.quiz && lecture.quiz.length > 0 && (
              <View style={styles.quizBadge}>
                <Text style={styles.quizBadgeText}>🎯 {lecture.quiz.length} câu test</Text>
              </View>
            )}

            {/* Nút Tải nhanh Phụ đề SRT & Tóm tắt TXT */}
            <View style={styles.quickExportGroup}>
              {onExportSRT && (
                <TouchableOpacity
                  style={styles.quickExportBtn}
                  onPress={handleQuickExportSRT}
                  disabled={exporting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickExportBtnText}>📥 SRT</Text>
                </TouchableOpacity>
              )}

              {onExportSummary && (
                <TouchableOpacity
                  style={styles.quickExportBtn}
                  onPress={handleQuickExportSummary}
                  disabled={exporting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickExportBtnText}>📄 Tóm tắt</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Thanh tiến độ học đang xem dở (Resume Playback Progress Bar) */}
      {percent > 0 && (
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
            <Text style={styles.progressText}>
              {percent >= 90 ? '✅ Đã hoàn thành' : `🎯 Đang học: ${percent}%`} • Tiếp tục từ{' '}
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </Text>
            <Text style={styles.resumeClickHint}>Chạm để tiếp tục ➔</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cardFavorite: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: '#17243A',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailWrapper: {
    width: 104,
    height: 78,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    marginRight: spacing.sm + 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  localThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  localThumbnailIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  localThumbnailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  thumbnailPlayOverlay: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  thumbnailPlayIcon: {
    color: '#F8FAFC',
    fontSize: 10,
    marginLeft: 2,
  },
  durationPill: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  durationPillText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '700',
  },
  contentCol: {
    flex: 1,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tagsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  sourceTag: {
    borderRadius: borderRadius.sm - 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderWidth: 1,
  },
  sourceTagYoutube: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  sourceTagYoutubeText: {
    color: '#F87171',
    fontSize: 9.5,
    fontWeight: '700',
  },
  sourceTagUpload: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
  },
  sourceTagUploadText: {
    color: colors.secondary,
    fontSize: 9.5,
    fontWeight: '700',
  },
  langPairTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: borderRadius.sm - 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  langPairTagText: {
    color: colors.primaryLight,
    fontSize: 9.5,
    fontWeight: '700',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm - 2,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  actionBtnFavActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  starIconText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 16,
  },
  starIconActive: {
    color: '#F59E0B',
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm - 2,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteIconText: {
    fontSize: 11,
  },
  metaBtn: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm - 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metaIconText: {
    fontSize: 11,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  folderTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  folderBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  folderBadgeText: {
    color: '#38bdf8',
    fontSize: 9.5,
    fontWeight: '700',
  },
  tagBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  tagBadgeText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  quizBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm - 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  quizBadgeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '600',
  },
  quickExportGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  quickExportBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: borderRadius.sm - 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickExportBtnText: {
    color: colors.textSecondary,
    fontSize: 9.5,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primaryLight,
    borderRadius: 2,
  },
  progressBarFillDone: {
    backgroundColor: colors.success,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  resumeClickHint: {
    fontSize: 10,
    color: colors.primaryLight,
    fontWeight: '700',
  },
});
