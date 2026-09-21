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
  TextInput,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showCC, setShowCC] = useState(true);
  const [subMode, setSubMode] = useState('bilingual'); // 'bilingual' | 'vi' | 'en'
  const scrollRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const htmlMediaRef = useRef(null);
  const pollTimerRef = useRef(null);

  const duration = lecture?.duration_seconds || 300;
  const segments = lecture?.segments || [];
  const title = lecture?.title || 'Bài giảng đồng bộ phụ đề AI';
  const language = (lecture?.language || 'vi').toUpperCase();

  // Tìm câu phụ đề đang phát tương ứng với giây hiện tại của video
  const activeSegmentIndex = segments.findIndex(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );
  const activeSegment = segments[activeSegmentIndex] || null;

  // Lọc phụ đề theo từ khóa tìm kiếm
  const filteredSegments = searchQuery.trim() === ''
    ? segments
    : segments.filter((seg) => {
        const q = searchQuery.toLowerCase();
        const textMatch = seg.text && seg.text.toLowerCase().includes(q);
        const origMatch = seg.original_text && seg.original_text.toLowerCase().includes(q);
        return textMatch || origMatch;
      });

  const isYouTube =
    Boolean(lecture?.video_url &&
    (lecture.video_url.includes('youtube.com') || lecture.video_url.includes('youtu.be')));

  const youtubeId = isYouTube
    ? lecture.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1]
    : null;

  // Nguồn phát file thực tế (từ bộ nhớ upload, link server /uploads/ hoặc link trực tiếp)
  const mediaSrc =
    lecture?.media_stream_url ||
    (lecture?.media_url ? `http://127.0.0.1:8000${lecture.media_url}` : null) ||
    (lecture?.video_url && !lecture.video_url.startsWith('local_file://') ? lecture.video_url : null);

  const isAudioOnly = Boolean(
    (lecture?.media_mime_type && lecture.media_mime_type.startsWith('audio/')) ||
    (lecture?.video_url && (lecture.video_url.endsWith('.mp3') || lecture.video_url.endsWith('.wav') || lecture.video_url.endsWith('.m4a')))
  );

  // Khởi tạo YouTube Iframe API để đồng bộ thời gian thực chuẩn 100%
  useEffect(() => {
    if (Platform.OS === 'web' && isYouTube && youtubeId) {
      let playerInstance = null;

      const bindPlayer = () => {
        if (!window.YT || !window.YT.Player) return;
        try {
          playerInstance = new window.YT.Player('yt-sync-iframe', {
            events: {
              onReady: (event) => {
                ytPlayerRef.current = event.target;
              },
              onStateChange: (event) => {
                // 1: Đang phát (PLAYING), 2: Tạm dừng (PAUSED), 0: Kết thúc (ENDED)
                if (event.data === 1) {
                  setIsPlaying(true);
                  if (!pollTimerRef.current) {
                    pollTimerRef.current = setInterval(() => {
                      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
                        const sec = ytPlayerRef.current.getCurrentTime();
                        setCurrentTime(sec);
                      }
                    }, 250);
                  }
                } else {
                  setIsPlaying(false);
                  if (pollTimerRef.current) {
                    clearInterval(pollTimerRef.current);
                    pollTimerRef.current = null;
                  }
                  if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
                    setCurrentTime(ytPlayerRef.current.getCurrentTime());
                  }
                }
              },
            },
          });
        } catch (err) {
          console.warn('Lỗi kết nối YouTube Player:', err);
        }
      };

      if (!window.YT) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        window.onYouTubeIframeAPIReady = () => {
          bindPlayer();
        };
        document.body.appendChild(script);
      } else {
        bindPlayer();
      }

      return () => {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        if (playerInstance && typeof playerInstance.destroy === 'function') {
          try { playerInstance.destroy(); } catch (_) {}
        }
      };
    }
  }, [isYouTube, youtubeId]);

  // Tự động cuộn đến câu phụ đề đang phát
  useEffect(() => {
    if (activeSegmentIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: Math.max(0, activeSegmentIndex * 75 - 100),
        animated: true,
      });
    }
  }, [activeSegmentIndex]);

  // Khi người dùng bấm vào một câu phụ đề -> Video lập tức nhảy đến đúng giây đó và phát tiếp có tiếng
  const handleSeek = (seconds) => {
    setCurrentTime(seconds);
    // Nếu là video YouTube
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(seconds, true);
      if (typeof ytPlayerRef.current.playVideo === 'function') {
        ytPlayerRef.current.playVideo();
      }
    }
    // Nếu là Video/Audio HTML5 từ thiết bị
    if (htmlMediaRef.current) {
      htmlMediaRef.current.currentTime = seconds;
      htmlMediaRef.current.play().catch(() => {});
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

  return (
    <View style={styles.container}>
      <Header
        title="ĐỒNG BỘ PHỤ ĐỀ"
        showBack
        onBack={onBack}
        serverStatus={{ online: true }}
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
          {/* Khung Phát Video / Audio Thật */}
          <View style={styles.playerBox}>
            <View style={styles.videoContainer}>
              {Platform.OS === 'web' && isYouTube && youtubeId ? (
                <iframe
                  id="yt-sync-iframe"
                  src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                  style={{ width: '100%', height: '100%', minHeight: 220, border: 'none', borderRadius: 12 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={title}
                />
              ) : Platform.OS === 'web' && mediaSrc ? (
                !isAudioOnly ? (
                  <video
                    ref={htmlMediaRef}
                    src={mediaSrc}
                    controls
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 220,
                      maxHeight: 260,
                      backgroundColor: '#000',
                      borderRadius: 12,
                      objectFit: 'contain',
                    }}
                    onTimeUpdate={(e) => {
                      if (e.target) setCurrentTime(e.target.currentTime);
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '24px 16px',
                    backgroundColor: '#0f172a',
                    borderRadius: 12,
                    width: '100%',
                    height: '100%',
                    minHeight: 200,
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🎙️</div>
                    <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: '600', marginBottom: 16, textAlign: 'center', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {title}
                    </div>
                    <audio
                      ref={htmlMediaRef}
                      src={mediaSrc}
                      controls
                      style={{ width: '100%', maxWidth: 400 }}
                      onTimeUpdate={(e) => {
                        if (e.target) setCurrentTime(e.target.currentTime);
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  </div>
                )
              ) : youtubeId ? (
                <View style={styles.thumbnailContainer}>
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  <View style={styles.thumbnailOverlay}>
                    <Text style={styles.thumbnailTitle} numberOfLines={2}>{title}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Text style={styles.mediaIcon}>🎓</Text>
                  <Text style={styles.mediaTitle} numberOfLines={2}>{title}</Text>
                  <Text style={styles.mediaStatus}>Bài giảng mẫu • {formatTime(duration)}</Text>
                </View>
              )}

              {/* Lớp phủ phụ đề nổi trên video (Overlay CC) */}
              {showCC && activeSegment && (
                <View style={styles.ccOverlayContainer} pointerEvents="none">
                  <View style={styles.ccOverlayBox}>
                    <Text style={styles.ccOverlayText}>
                      {subMode === 'en' ? (activeSegment.original_text || activeSegment.text) : activeSegment.text}
                    </Text>
                    {subMode === 'bilingual' && activeSegment.original_text && activeSegment.original_text.trim() !== activeSegment.text.trim() && (
                      <Text style={styles.ccOverlaySubText}>{activeSegment.original_text}</Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Thanh Trạng thái Đồng bộ Thời gian thực */}
            <View style={styles.realtimeStatusBar}>
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, isPlaying && styles.liveDotActive]} />
                <Text style={styles.liveText}>
                  {isPlaying ? 'ĐANG PHÁT & ĐỒNG BỘ' : 'ĐỒNG BỘ SẴN SÀNG'}
                </Text>
              </View>
              <View style={styles.statusRightGroup}>
                <TouchableOpacity
                  style={[styles.ccBtn, showCC && styles.ccBtnActive]}
                  onPress={() => setShowCC(!showCC)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.ccBtnText, showCC && styles.ccBtnTextActive]}>CC</Text>
                </TouchableOpacity>
                <Text style={styles.liveTimerText}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Text>
              </View>
            </View>
          </View>

          {/* Thanh chọn chế độ Ngôn ngữ & Chế độ Song ngữ */}
          <View style={styles.langModeBar}>
            <Text style={styles.langModeLabel}>Phụ đề:</Text>
            <View style={styles.langModeButtons}>
              <TouchableOpacity
                style={[styles.langModeBtn, subMode === 'bilingual' && styles.langModeBtnActive]}
                onPress={() => setSubMode('bilingual')}
                activeOpacity={0.7}
              >
                <Text style={[styles.langModeBtnText, subMode === 'bilingual' && styles.langModeBtnTextActive]}>
                  🌐 Song ngữ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langModeBtn, subMode === 'vi' && styles.langModeBtnActive]}
                onPress={() => setSubMode('vi')}
                activeOpacity={0.7}
              >
                <Text style={[styles.langModeBtnText, subMode === 'vi' && styles.langModeBtnTextActive]}>
                  🇻🇳 Tiếng Việt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langModeBtn, subMode === 'en' && styles.langModeBtnActive]}
                onPress={() => setSubMode('en')}
                activeOpacity={0.7}
              >
                <Text style={[styles.langModeBtnText, subMode === 'en' && styles.langModeBtnTextActive]}>
                  🇺🇸 Tiếng Anh
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Thanh tìm kiếm phụ đề và mốc thời gian */}
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Tìm câu / thuật ngữ trong bài giảng..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
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
            {filteredSegments.length > 0 ? (
              filteredSegments.map((seg, idx) => (
                <SubtitleItem
                  key={idx}
                  segment={seg}
                  isActive={segments[activeSegmentIndex] === seg}
                  onSeek={handleSeek}
                  subMode={subMode}
                />
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {searchQuery ? `Không tìm thấy câu nào khớp với "${searchQuery}"` : 'Chưa có phụ đề bóc tách cho bài giảng này.'}
                </Text>
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabBtnText: {
    color: colors.primaryLight,
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
    width: '100%',
    height: 220,
    backgroundColor: '#000',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  thumbnailTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  mediaPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  mediaIcon: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  mediaStatus: {
    fontSize: 12,
    color: colors.textMuted,
  },
  realtimeStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748b',
    marginRight: 6,
  },
  liveDotActive: {
    backgroundColor: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  liveTimerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  subtitleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  subtitleHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  exportToolbar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  exportSrtBtn: {
    flex: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  exportSrtBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '700',
  },
  subtitlesScroll: {
    flex: 1,
  },
  subtitlesScrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  statusRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ccBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ccBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  ccBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
  },
  ccBtnTextActive: {
    color: '#ffffff',
  },
  ccOverlayContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  ccOverlayBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    maxWidth: '94%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  ccOverlayText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  ccOverlaySubText: {
    color: '#94a3b8',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 15,
  },
  langModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  langModeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  langModeButtons: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  langModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  langModeBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primaryLight,
  },
  langModeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  langModeBtnTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 36,
    color: colors.textPrimary,
    fontSize: 13,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
