import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Platform,
  Image,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { colors, spacing, borderRadius } from '../constants/theme';
import Header from '../components/Header';
import SubtitleItem from '../components/SubtitleItem';
import SummaryQuizScreen from './SummaryQuizScreen';

export default function SyncPlayerScreen({ lecture, onBack }) {
  const [currentTab, setCurrentTab] = useState('subtitles'); // 'subtitles' | 'summary'
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollRef = useRef(null);
  const videoRef = useRef(null);

  const duration = lecture?.duration_seconds || 300;
  const segments = lecture?.segments || [];
  const title = lecture?.title || 'Bài giảng đồng bộ phụ đề AI';
  const language = (lecture?.language || 'vi').toUpperCase();

  // Tìm segment đang phát khớp với currentTime
  const activeSegmentIndex = segments.findIndex(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  const isYouTube =
    lecture?.video_url &&
    (lecture.video_url.includes('youtube.com') || lecture.video_url.includes('youtu.be'));
  const youtubeId = isYouTube
    ? lecture.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1]
    : null;

  // Bộ đếm thời gian tự động đồng bộ phụ đề khi bấm Play
  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return Math.min(duration, prev + 1);
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, duration]);

  // Tự động cuộn xuống câu phụ đề đang phát
  useEffect(() => {
    if (activeSegmentIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: Math.max(0, activeSegmentIndex * 75 - 100),
        animated: true,
      });
    }
  }, [activeSegmentIndex]);

  // Xử lý cập nhật trạng thái video
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setCurrentTime(status.positionMillis / 1000);
      setIsPlaying(status.isPlaying);
    }
  };

  // Tua đến giây bất kỳ khi sinh viên bấm vào câu phụ đề
  const handleSeek = async (seconds) => {
    setCurrentTime(seconds);
    setIsPlaying(true);
    if (videoRef.current) {
      try {
        await videoRef.current.setPositionAsync(seconds * 1000);
        await videoRef.current.playAsync();
      } catch (_) {}
    }
  };

  const handleRewind = async () => {
    const newTime = Math.max(0, currentTime - 10);
    setCurrentTime(newTime);
    if (videoRef.current) {
      try {
        await videoRef.current.setPositionAsync(newTime * 1000);
      } catch (_) {}
    }
  };

  const handleForward = async () => {
    const newTime = Math.min(duration, currentTime + 10);
    setCurrentTime(newTime);
    if (videoRef.current) {
      try {
        await videoRef.current.setPositionAsync(newTime * 1000);
      } catch (_) {}
    }
  };

  const togglePlay = async () => {
    const nextPlayState = !isPlaying;
    setIsPlaying(nextPlayState);
    if (videoRef.current) {
      try {
        if (nextPlayState) {
          await videoRef.current.playAsync();
        } else {
          await videoRef.current.pauseAsync();
        }
      } catch (_) {}
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Bài giảng: ${title}\nTổng quan: ${lecture?.summary || ''}\nXem tại: ${lecture?.video_url || ''}`,
      });
    } catch (_) {}
  };

  // Xuất file phụ đề SRT chuẩn
  const handleExportSRT = async () => {
    if (segments.length === 0) {
      Alert.alert('Không có dữ liệu', 'Bài giảng này chưa có phụ đề để xuất.');
      return;
    }
    try {
      const formatSRTTime = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.round((sec % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };

      let srtContent = '';
      segments.forEach((seg, idx) => {
        srtContent += `${idx + 1}\n`;
        srtContent += `${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}\n`;
        srtContent += `${seg.text}\n\n`;
      });

      const safeTitle = (title || 'lecture').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').substring(0, 30);
      const filePath = `${FileSystem.cacheDirectory}${safeTitle}.srt`;
      await FileSystem.writeAsStringAsync(filePath, srtContent, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/x-subrip',
          dialogTitle: 'Xuất file phụ đề SRT',
          UTI: 'com.apple.subrip',
        });
      } else {
        Alert.alert('Thành công', `File SRT đã được lưu tại:\n${filePath}`);
      }
    } catch (err) {
      Alert.alert('Lỗi xuất SRT', err.message);
    }
  };

  const formatTime = (sec) => {
    if (typeof sec !== 'number') return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <Header
        title="ĐỒNG BỘ PHỤ ĐỀ"
        showBack
        onBack={onBack}
        rightElement={
          <View style={styles.langBadge}>
            <Text style={styles.langBadgeText}>{language}</Text>
          </View>
        }
      />

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, currentTab === 'subtitles' && styles.activeTabBtn]}
          onPress={() => setCurrentTab('subtitles')}
        >
          <Text style={[styles.tabBtnText, currentTab === 'subtitles' && styles.activeTabBtnText]}>
            💬 Phụ đề Đồng bộ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, currentTab === 'summary' && styles.activeTabBtn]}
          onPress={() => setCurrentTab('summary')}
        >
          <Text style={[styles.tabBtnText, currentTab === 'summary' && styles.activeTabBtnText]}>
            📑 Tóm tắt & Ôn tập
          </Text>
        </TouchableOpacity>
      </View>

      {currentTab === 'summary' ? (
        <SummaryQuizScreen lecture={lecture} onShare={handleShare} />
      ) : (
        <View style={styles.playerContent}>
          {/* Khung Phát Video / Audio */}
          <View style={styles.playerBox}>
            <View style={styles.videoContainer}>
              {Platform.OS === 'web' && isYouTube && youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={title}
                />
              ) : youtubeId ? (
                <View style={styles.thumbnailContainer}>
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  <View style={styles.thumbnailOverlay}>
                    <View style={styles.playStatusBadge}>
                      <Text style={styles.playStatusText}>{isPlaying ? '🟢 ĐANG ĐỒNG BỘ' : '⏸ TẠM DỪNG'}</Text>
                    </View>
                    <Text style={styles.thumbnailTitle} numberOfLines={2}>{title}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Text style={styles.mediaIcon}>🎓</Text>
                  <Text style={styles.mediaTitle} numberOfLines={2}>{title}</Text>
                  <Text style={styles.mediaStatus}>{isPlaying ? 'Đang phát...' : 'Nhấn ▶ để bắt đầu'}</Text>
                </View>
              )}
            </View>

            {/* Thanh tiến trình Timeline */}
            <View style={styles.timelineRow}>
              <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
            </View>

            {/* Nút Điều khiển Player */}
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.controlBtn} onPress={handleRewind}>
                <Text style={styles.controlIcon}>⏪ 10s</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.playPauseBtn} onPress={togglePlay}>
                <Text style={styles.playPauseIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlBtn} onPress={handleForward}>
                <Text style={styles.controlIcon}>10s ⏩</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tiêu đề vùng phụ đề */}
          <View style={styles.subtitleHeader}>
            <Text style={styles.subtitleHeaderText}>💬 PHỤ ĐỀ ĐỒNG BỘ THỜI GIAN THỰC</Text>
            <Text style={styles.hintText}>Chạm vào câu để nhảy đến mốc thời gian</Text>
          </View>

          {/* Thanh công cụ Xuất file */}
          <View style={styles.exportToolbar}>
            <TouchableOpacity style={styles.exportSrtBtn} onPress={handleExportSRT} activeOpacity={0.8}>
              <Text style={styles.exportSrtBtnText}>📄 Xuất SRT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Text style={styles.shareBtnText}>📤 Chia sẻ</Text>
            </TouchableOpacity>
          </View>

          {/* Danh sách phụ đề đồng bộ chạy theo giây */}
          <ScrollView
            ref={scrollRef}
            style={styles.subtitlesScroll}
            contentContainerStyle={styles.subtitlesScrollContent}
          >
            {segments.length > 0 ? (
              segments.map((seg, idx) => (
                <SubtitleItem
                  key={idx}
                  segment={seg}
                  isActive={idx === activeSegmentIndex}
                  onSeek={handleSeek}
                />
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Chưa có phụ đề bóc tách cho bài giảng này.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  langBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  langBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomColor: colors.primaryLight,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabBtnText: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  playerContent: {
    flex: 1,
  },
  playerBox: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  videoContainer: {
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    height: 200,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  thumbnailContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  playStatusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  playStatusText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  thumbnailTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mediaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  mediaIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  mediaTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  mediaStatus: {
    color: colors.textMuted,
    fontSize: 11,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  timeLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    width: 38,
  },
  progressBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primaryLight,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  controlBtn: {
    padding: spacing.sm,
  },
  controlIcon: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  playPauseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  playPauseIcon: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 2,
  },
  subtitleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  subtitleHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  hintText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  subtitlesScroll: {
    flex: 1,
  },
  subtitlesScrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  emptyBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  exportToolbar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  exportSrtBtn: {
    flex: 1,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: borderRadius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  exportSrtBtnText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  shareBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
});
