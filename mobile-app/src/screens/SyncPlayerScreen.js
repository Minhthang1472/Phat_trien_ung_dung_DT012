import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StyleSheet,
  Share,
} from 'react-native';
import { Video } from 'expo-av';
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

  // Xử lý cập nhật trạng thái video
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setCurrentTime(status.positionMillis / 1000);
      setIsPlaying(status.isPlaying);
    }
  };

  // Tua đến giây bất kỳ khi sinh viên bấm vào câu phụ đề
  const handleSeek = async (seconds) => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(seconds * 1000);
      if (!isPlaying) {
        await videoRef.current.playAsync();
      }
    }
  };

  const handleRewind = async () => {
    if (videoRef.current) {
      const newTime = Math.max(0, currentTime - 10);
      await videoRef.current.setPositionAsync(newTime * 1000);
    }
  };

  const handleForward = async () => {
    if (videoRef.current) {
      const newTime = Math.min(duration, currentTime + 10);
      await videoRef.current.setPositionAsync(newTime * 1000);
    }
  };

  const togglePlay = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Bài giảng: ${title}\nTổng quan: ${lecture?.summary || ''}\nXem tại: ${lecture?.video_url || ''}`,
      });
    } catch (_) {}
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
              <Video
                ref={videoRef}
                style={styles.videoPlayer}
                source={{
                  uri: lecture?.video_url || 'https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4',
                }}
                useNativeControls={false}
                resizeMode="contain"
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
              />
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
  videoPlayer: {
    width: '100%',
    height: '100%',
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
});
