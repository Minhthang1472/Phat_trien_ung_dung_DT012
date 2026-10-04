import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { apiService } from '../services/api';

const LANG_MAP = {
  vi: { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  en: { code: 'en', name: 'Tiếng Anh', flag: '🇺🇸' },
  ja: { code: 'ja', name: 'Tiếng Nhật', flag: '🇯🇵' },
  ko: { code: 'ko', name: 'Tiếng Hàn', flag: '🇰🇷' },
  zh: { code: 'zh', name: 'Tiếng Trung', flag: '🇨🇳' },
  fr: { code: 'fr', name: 'Tiếng Pháp', flag: '🇫🇷' },
  de: { code: 'de', name: 'Tiếng Đức', flag: '🇩🇪' },
  es: { code: 'es', name: 'Tiếng Tây Ban Nha', flag: '🇪🇸' },
  ru: { code: 'ru', name: 'Tiếng Nga', flag: '🇷🇺' },
};

const getLangMeta = (code, fallbackName = 'Ngôn ngữ') => {
  if (!code) return { code: '', name: fallbackName, flag: '🌐' };
  const clean = String(code).toLowerCase().trim();
  return LANG_MAP[clean] || { code: clean, name: clean.toUpperCase(), flag: '🌐' };
};

export default function SyncPlayerScreen({ lecture, onBack, initialSeekTime }) {
  const effectiveSeekTime = initialSeekTime || lecture?.initial_time || 0;
  const [currentTab, setCurrentTab] = useState('subtitles'); // 'subtitles' | 'summary'
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [burningSubtitles, setBurningSubtitles] = useState(false);
  const [burnedMediaUrl, setBurnedMediaUrl] = useState(null);
  const [serverBaseUrl, setServerBaseUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCC, setShowCC] = useState(true);
  const [subMode, setSubMode] = useState('bilingual'); // 'bilingual' | 'target' | 'original'

  // Trắc nghiệm theo mốc thời gian (In-Video Checkpoint Quiz)
  const [interactiveQuizEnabled, setInteractiveQuizEnabled] = useState(true);
  const [activeCheckpointQuiz, setActiveCheckpointQuiz] = useState(null);
  const triggeredCheckpointIdsRef = useRef(new Set());
  const lastTimeUpdateRef = useRef(0);
  const lastSavedProgressRef = useRef(0);
  const lastScrolledIndexRef = useRef(-1);

  // Xử lý song song ngầm cho video dài (Background Streaming)
  const [streamProgress, setStreamProgress] = useState(lecture?.progress || null);
  const [liveSegments, setLiveSegments] = useState(lecture?.segments || []);

  const scrollRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const htmlMediaRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    apiService.getBaseUrl().then(setServerBaseUrl).catch(() => {});
  }, []);

  // Lắng nghe cập nhật phụ đề song song ngầm (Task 7)
  useEffect(() => {
    if (!lecture?.is_streaming || !lecture?.job_id) return;

    let isSubscribed = true;
    const streamInterval = setInterval(async () => {
      try {
        const statusData = await apiService.getStreamStatus(lecture.job_id);
        if (!isSubscribed || !statusData) return;

        if (statusData.segments && statusData.segments.length > liveSegments.length) {
          setLiveSegments(statusData.segments);
        }
        if (typeof statusData.progress === 'number') {
          setStreamProgress(statusData.progress);
        }

        if (statusData.is_completed) {
          clearInterval(streamInterval);
          if (statusData.segments) setLiveSegments(statusData.segments);
          setStreamProgress(100);
          lecture.segments = statusData.segments;
          lecture.mindmap = statusData.mindmap;
          lecture.quiz = statusData.quiz;
          lecture.exercises = statusData.exercises;
          lecture.summary = statusData.summary;
          lecture.is_streaming = false;
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra tiến độ streaming:', err);
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(streamInterval);
    };
  }, [lecture?.job_id, lecture?.is_streaming, liveSegments.length]);

  const duration = lecture?.duration_seconds || 300;
  const segments = liveSegments.length > 0 ? liveSegments : (lecture?.segments || []);
  const title = lecture?.title || 'Bài giảng đồng bộ phụ đề AI';

  // Xác định chuẩn xác ngôn ngữ đích (Phụ đề dịch) và ngôn ngữ gốc (Người nói trong video)
  const targetLangCode = (lecture?.language || 'vi').toLowerCase();
  const language = targetLangCode.toUpperCase();
  const targetLangInfo = getLangMeta(targetLangCode, 'Bản dịch');

  const sourceLangCode = useMemo(() => {
    if (lecture?.detected_language) {
      return String(lecture.detected_language).toLowerCase();
    }
    if (lecture?.source_language && lecture.source_language !== 'auto') {
      return String(lecture.source_language).toLowerCase();
    }
    const allOriginal = segments.slice(0, 10).map((s) => s.original_text || '').join(' ');
    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(allOriginal)) return 'ja';
    if (/[\uac00-\ud7af]/.test(allOriginal)) return 'ko';
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(allOriginal)) return 'vi';
    return targetLangCode === 'en' ? 'ja' : 'en';
  }, [lecture?.detected_language, lecture?.source_language, segments, targetLangCode]);

  const sourceLangInfo = getLangMeta(sourceLangCode, 'Ngôn ngữ gốc');

  const hasDifferentOriginal = useMemo(() => {
    return segments.some(
      (s) => s.original_text && s.text && s.original_text.trim() !== s.text.trim()
    );
  }, [segments]);

  // Trích xuất văn bản phụ đề theo đúng ngôn ngữ người dùng đang chọn
  const getSegmentText = (seg) => {
    if (!seg) return '';
    if (subMode === 'original') {
      return seg.original_text || seg.text || '';
    }
    return seg.translated_text || seg.text || seg.original_text || '';
  };

  // Khởi tạo các mốc Checkpoint Quiz theo thời lượng bài giảng (In-Video Quiz)
  const rawQuizzes = lecture?.quiz || lecture?.full_data?.quiz || [];
  const checkpointQuizzes = useMemo(() => {
    if (!rawQuizzes || rawQuizzes.length === 0) return [];
    return rawQuizzes.map((q, idx) => {
      let ts = q.timestamp_sec;
      if (typeof ts !== 'number' || isNaN(ts) || ts <= 0) {
        // Phân bổ đều các câu trắc nghiệm theo thời lượng video nếu chưa có sẵn mốc giây
        ts = Math.round((idx + 1) * (duration / (rawQuizzes.length + 1)));
      }
      return {
        ...q,
        checkpoint_id: `cp_${idx}_${Math.round(ts)}`,
        checkpoint_time: ts,
        index: idx,
      };
    });
  }, [rawQuizzes, duration]);

  // Kiểm tra kích hoạt câu hỏi ôn tập khi video chạy tới mốc thời gian
  const checkInVideoQuiz = (timeSec) => {
    if (!interactiveQuizEnabled || activeCheckpointQuiz || checkpointQuizzes.length === 0) {
      return;
    }
    for (const cp of checkpointQuizzes) {
      if (!triggeredCheckpointIdsRef.current.has(cp.checkpoint_id)) {
        if (timeSec >= cp.checkpoint_time && timeSec <= cp.checkpoint_time + 3.0) {
          triggeredCheckpointIdsRef.current.add(cp.checkpoint_id);
          // 1. Tạm dừng video phát lại
          if (htmlMediaRef.current) {
            try { htmlMediaRef.current.pause(); } catch (_) {}
          }
          if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
            try { ytPlayerRef.current.pauseVideo(); } catch (_) {}
          }
          setIsPlaying(false);

          // 2. Mở popup trắc nghiệm tại mốc này
          setActiveCheckpointQuiz({
            quiz: cp,
            userChoice: null,
            isSubmitted: false,
            isCorrect: false,
          });
          break;
        }
      }
    }
  };

  const handleSelectQuizOption = (optKey) => {
    if (!activeCheckpointQuiz || activeCheckpointQuiz.isSubmitted) return;
    const q = activeCheckpointQuiz.quiz;
    const correctAns = (q.correct_answer || q.answer || '').toUpperCase().trim();
    const isRight =
      optKey.toUpperCase().startsWith(correctAns[0]) ||
      optKey.toUpperCase() === correctAns;

    setActiveCheckpointQuiz((prev) => ({
      ...prev,
      userChoice: optKey,
      isSubmitted: true,
      isCorrect: isRight,
    }));
  };

  const handleResumeFromQuiz = () => {
    setActiveCheckpointQuiz(null);
    if (htmlMediaRef.current) {
      htmlMediaRef.current.play().catch(() => {});
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
      ytPlayerRef.current.playVideo();
    }
    setIsPlaying(true);
  };

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
        const activeText = getSegmentText(seg).toLowerCase();
        const textMatch = seg.text && seg.text.toLowerCase().includes(q);
        const origMatch = seg.original_text && seg.original_text.toLowerCase().includes(q);
        return activeText.includes(q) || textMatch || origMatch;
      });

  const isYouTube =
    Boolean(lecture?.video_url &&
    (lecture.video_url.includes('youtube.com') || lecture.video_url.includes('youtu.be')));

  const youtubeId = isYouTube
    ? lecture.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1]
    : null;

  // Nguồn phát file thực tế (từ bộ nhớ upload, link server /uploads/ hoặc link trực tiếp)
  const mediaSrc =
    burnedMediaUrl ||
    (lecture?.media_stream_url
      ? (lecture.media_stream_url.startsWith('http')
        ? lecture.media_stream_url
        : `${serverBaseUrl}${lecture.media_stream_url}`)
      : null) ||
    (lecture?.media_url
      ? (lecture.media_url.startsWith('http')
        ? lecture.media_url
        : `${serverBaseUrl}${lecture.media_url}`)
      : null) ||
    (lecture?.video_url && !lecture.video_url.startsWith('local_file://') ? lecture.video_url : null);

  const isAudioOnly = Boolean(
    (lecture?.media_mime_type && lecture.media_mime_type.startsWith('audio/')) ||
    (lecture?.video_url && (lecture.video_url.endsWith('.mp3') || lecture.video_url.endsWith('.wav') || lecture.video_url.endsWith('.m4a')))
  );

  const isUploadedVideo = Boolean(
    !isYouTube && (
      (lecture?.media_url && lecture.media_url.includes('/uploads/')) ||
      (lecture?.video_url && lecture.video_url.startsWith('local_file://')) ||
      (lecture?.media_stream_url && lecture.media_stream_url.includes('/uploads/'))
    )
  );

  // Lưu tiến độ phát video ngầm (Throttle mỗi 4 giây)
  const saveProgressThrottled = (sec) => {
    if (lecture?.video_url && Math.abs(sec - lastSavedProgressRef.current) >= 4) {
      lastSavedProgressRef.current = sec;
      apiService.savePlaybackProgress(lecture.video_url, sec, duration);
    }
  };

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
                if (effectiveSeekTime > 5) {
                  try {
                    event.target.seekTo(effectiveSeekTime, true);
                  } catch (_) {}
                }
              },
              onStateChange: (event) => {
                // 1: Đang phát (PLAYING), 2: Tạm dừng (PAUSED), 0: Kết thúc (ENDED)
                if (event.data === 1) {
                  setIsPlaying(true);
                  if (!pollTimerRef.current) {
                    pollTimerRef.current = setInterval(() => {
                      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
                        const sec = ytPlayerRef.current.getCurrentTime();
                        // Throttle 250ms giảm re-render, tăng độ mượt playback
                        if (Math.abs(sec - lastTimeUpdateRef.current) >= 0.25) {
                          lastTimeUpdateRef.current = sec;
                          setCurrentTime(sec);
                          checkInVideoQuiz(sec);
                          saveProgressThrottled(sec);
                        }
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
                    const sec = ytPlayerRef.current.getCurrentTime();
                    lastTimeUpdateRef.current = sec;
                    setCurrentTime(sec);
                    if (lecture?.video_url) {
                      apiService.savePlaybackProgress(lecture.video_url, sec, duration);
                    }
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
  }, [isYouTube, youtubeId, interactiveQuizEnabled, activeCheckpointQuiz, checkpointQuizzes, effectiveSeekTime]);

  // Lưu tiến độ khi thoát màn hình
  useEffect(() => {
    return () => {
      if (lecture?.video_url && lastTimeUpdateRef.current > 0) {
        apiService.savePlaybackProgress(lecture.video_url, lastTimeUpdateRef.current, duration);
      }
    };
  }, [lecture?.video_url, duration]);

  // Tự động cuộn mượt đến câu phụ đề đang phát (chống giật khung hình khi video chạy)
  useEffect(() => {
    if (activeSegmentIndex >= 0 && activeSegmentIndex !== lastScrolledIndexRef.current && scrollRef.current && !searchQuery) {
      lastScrolledIndexRef.current = activeSegmentIndex;
      scrollRef.current.scrollTo({
        y: Math.max(0, activeSegmentIndex * 75 - 100),
        animated: true,
      });
    }
  }, [activeSegmentIndex, searchQuery]);

  // Bộ điều khiển sự kiện phát cho HTML5 Media (Throttle 250ms chống khựng giật)
  const handleMediaTimeUpdate = (e) => {
    if (!e.target) return;
    const sec = e.target.currentTime;
    if (Math.abs(sec - lastTimeUpdateRef.current) >= 0.25) {
      lastTimeUpdateRef.current = sec;
      setCurrentTime(sec);
      checkInVideoQuiz(sec);
      saveProgressThrottled(sec);
    }
  };

  const handleMediaLoadedMetadata = (e) => {
    if (effectiveSeekTime > 5 && e.target) {
      try {
        e.target.currentTime = effectiveSeekTime;
      } catch (_) {}
    }
  };

  const handleMediaSeeked = (e) => {
    if (!e.target) return;
    const sec = e.target.currentTime;
    lastTimeUpdateRef.current = sec;
    setCurrentTime(sec);
  };

  // Khi người dùng bấm vào một câu phụ đề -> Video lập tức nhảy đến đúng giây đó và phát mượt
  const handleSeek = (seconds) => {
    lastTimeUpdateRef.current = seconds;
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.headerShareBtn}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Text style={styles.headerShareText}>📤 Chia sẻ</Text>
            </TouchableOpacity>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>
                {targetLangInfo.flag} {targetLangInfo.code.toUpperCase()}
              </Text>
            </View>
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
                    preload="auto"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 220,
                      maxHeight: 260,
                      backgroundColor: '#000',
                      borderRadius: 12,
                      objectFit: 'contain',
                    }}
                    onLoadedMetadata={handleMediaLoadedMetadata}
                    onTimeUpdate={handleMediaTimeUpdate}
                    onSeeked={handleMediaSeeked}
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
                      preload="auto"
                      style={{ width: '100%', maxWidth: 400 }}
                      onLoadedMetadata={handleMediaLoadedMetadata}
                      onTimeUpdate={handleMediaTimeUpdate}
                      onSeeked={handleMediaSeeked}
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
              {showCC && activeSegment && !activeCheckpointQuiz && (
                <View style={styles.ccOverlayContainer} pointerEvents="none">
                  <View style={styles.ccOverlayBox}>
                    <Text style={styles.ccOverlayText}>
                      {subMode === 'original'
                        ? (activeSegment.original_text || activeSegment.text)
                        : (activeSegment.translated_text || activeSegment.text || activeSegment.original_text)}
                    </Text>
                    {subMode === 'bilingual' && activeSegment.original_text && activeSegment.original_text.trim() !== (activeSegment.translated_text || activeSegment.text || '').trim() && (
                      <Text style={styles.ccOverlaySubText}>{activeSegment.original_text}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Lớp phủ Trắc nghiệm tương tác theo mốc thời gian (In-Video Checkpoint Quiz) */}
              {activeCheckpointQuiz && (
                <View style={styles.checkpointOverlay}>
                  <View style={styles.checkpointCard}>
                    <View style={styles.checkpointTopRow}>
                      <View style={styles.checkpointBadge}>
                        <Text style={styles.checkpointBadgeText}>
                          🎯 ĐIỂM ÔN TẬP • MỐC {formatTime(activeCheckpointQuiz.quiz.checkpoint_time)}
                        </Text>
                      </View>
                      {!activeCheckpointQuiz.isSubmitted && (
                        <TouchableOpacity
                          style={styles.checkpointSkipBtn}
                          onPress={handleResumeFromQuiz}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.checkpointSkipText}>Bỏ qua ⏩</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={styles.checkpointQuestion}>
                      {activeCheckpointQuiz.quiz.question}
                    </Text>

                    <View style={styles.checkpointOptionsList}>
                      {activeCheckpointQuiz.quiz.options.map((opt, oIdx) => {
                        const isChosen = activeCheckpointQuiz.userChoice === opt;
                        const correctAns = (
                          activeCheckpointQuiz.quiz.correct_answer ||
                          activeCheckpointQuiz.quiz.answer ||
                          ''
                        ).toUpperCase().trim();
                        const isCorrectOption =
                          opt.toUpperCase().startsWith(correctAns[0]) ||
                          opt.toUpperCase() === correctAns;

                        let btnStyle = styles.checkpointOptionBtn;
                        if (activeCheckpointQuiz.isSubmitted) {
                          if (isCorrectOption) {
                            btnStyle = [styles.checkpointOptionBtn, styles.checkpointOptionCorrect];
                          } else if (isChosen && !activeCheckpointQuiz.isCorrect) {
                            btnStyle = [styles.checkpointOptionBtn, styles.checkpointOptionWrong];
                          }
                        } else if (isChosen) {
                          btnStyle = [styles.checkpointOptionBtn, styles.checkpointOptionSelected];
                        }

                        return (
                          <TouchableOpacity
                            key={oIdx}
                            style={btnStyle}
                            disabled={activeCheckpointQuiz.isSubmitted}
                            onPress={() => handleSelectQuizOption(opt)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.checkpointOptionText}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {activeCheckpointQuiz.isSubmitted && (
                      <View style={styles.checkpointFeedbackBox}>
                        <Text
                          style={[
                            styles.checkpointFeedbackTitle,
                            activeCheckpointQuiz.isCorrect
                              ? styles.checkpointFeedbackCorrect
                              : styles.checkpointFeedbackWrong,
                          ]}
                        >
                          {activeCheckpointQuiz.isCorrect
                            ? '✓ Chính xác! Bạn nắm bài rất tốt.'
                            : '✗ Chưa đúng! Xem giải thích bên dưới:'}
                        </Text>
                        <Text style={styles.checkpointExplanation}>
                          💡 {activeCheckpointQuiz.quiz.explanation}
                        </Text>
                        <TouchableOpacity
                          style={styles.checkpointContinueBtn}
                          onPress={handleResumeFromQuiz}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.checkpointContinueBtnText}>
                            ▶ TIẾP TỤC XEM BÀI GIẢNG
                          </Text>
                        </TouchableOpacity>
                      </View>
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

          {/* Thanh chọn chế độ Ngôn ngữ Phụ đề */}
          <View style={styles.langModeBar}>
            <Text style={styles.langModeLabel}>Phụ đề:</Text>
            <View style={styles.langModeButtons}>
              {/* Nút 1: Chế độ Song ngữ (nếu có bản dịch khác tiếng gốc) */}
              {(hasDifferentOriginal || sourceLangCode !== targetLangCode) && (
                <TouchableOpacity
                  style={[styles.langModeBtn, subMode === 'bilingual' && styles.langModeBtnActive]}
                  onPress={() => setSubMode('bilingual')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langModeBtnText, subMode === 'bilingual' && styles.langModeBtnTextActive]}>
                    🌐 Song ngữ
                  </Text>
                </TouchableOpacity>
              )}

              {/* Nút 2: Phụ đề đã dịch (Target Language) */}
              <TouchableOpacity
                style={[styles.langModeBtn, subMode === 'target' && styles.langModeBtnActive]}
                onPress={() => setSubMode('target')}
                activeOpacity={0.7}
              >
                <Text style={[styles.langModeBtnText, subMode === 'target' && styles.langModeBtnTextActive]}>
                  {targetLangInfo.flag} {targetLangInfo.name}
                </Text>
              </TouchableOpacity>

              {/* Nút 3: Ngôn ngữ gốc người nói trong video (nếu khác với ngôn ngữ dịch) */}
              {(hasDifferentOriginal || sourceLangCode !== targetLangCode) && (
                <TouchableOpacity
                  style={[styles.langModeBtn, subMode === 'original' && styles.langModeBtnActive]}
                  onPress={() => setSubMode('original')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langModeBtnText, subMode === 'original' && styles.langModeBtnTextActive]}>
                    {sourceLangInfo.flag} {sourceLangInfo.name} (Gốc)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Thanh tùy chọn Trắc nghiệm tương tác theo mốc video */}
          <View style={styles.interactiveQuizBar}>
            <TouchableOpacity
              style={[
                styles.quizTogglePill,
                interactiveQuizEnabled && styles.quizTogglePillActive,
              ]}
              onPress={() => setInteractiveQuizEnabled(!interactiveQuizEnabled)}
              activeOpacity={0.8}
            >
              <Text style={styles.quizTogglePillIcon}>
                {interactiveQuizEnabled ? '🎯' : '⏸️'}
              </Text>
              <Text
                style={[
                  styles.quizTogglePillText,
                  interactiveQuizEnabled && styles.quizTogglePillTextActive,
                ]}
              >
                Trắc nghiệm theo video: {interactiveQuizEnabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
              </Text>
            </TouchableOpacity>

            {checkpointQuizzes.length > 0 && (
              <View style={styles.checkpointCountBadge}>
                <Text style={styles.checkpointCountText}>
                  {checkpointQuizzes.length} mốc ôn tập
                </Text>
              </View>
            )}
          </View>

          {/* Banner thông báo tiến độ nạp ngầm song song cho video dài (Giai đoạn 3) */}
          {streamProgress !== null && streamProgress < 100 && (
            <View style={styles.streamingBanner}>
              <Text style={styles.streamingBannerIcon}>⚡</Text>
              <Text style={styles.streamingBannerText}>
                Đang xử lý ngầm và nạp dần phụ đề ({streamProgress}%)... Bạn vẫn theo dõi video bình thường.
              </Text>
            </View>
          )}

          {/* Thanh tìm kiếm phụ đề và mốc thời gian (Yêu cầu 3) */}
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Tìm câu / chủ đề bài giảng (ví dụ: công thức, khái niệm)..."
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

          {/* Thống kê kết quả tìm kiếm (Yêu cầu 3) */}
          {searchQuery.trim().length > 0 && (
            <View style={styles.searchStatsBar}>
              <Text style={styles.searchStatsText}>
                🎯 Tìm thấy <Text style={{ color: '#f59e0b', fontWeight: '800' }}>{filteredSegments.length}</Text> câu phụ đề khớp với "{searchQuery.trim()}":
              </Text>
            </View>
          )}


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
                  searchQuery={searchQuery}
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
  headerShareBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  headerShareText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '700',
  },
  searchStatsBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  searchStatsText: {
    fontSize: 11,
    color: '#f8fafc',
    fontWeight: '600',
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
  // Styles Trắc nghiệm In-Video Checkpoint Quiz
  checkpointOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.94)',
    borderRadius: 12,
    zIndex: 50,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkpointCard: {
    width: '100%',
    maxHeight: '98%',
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    padding: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  checkpointTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  checkpointBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  checkpointBadgeText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  checkpointSkipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  checkpointSkipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  checkpointQuestion: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 8,
  },
  checkpointOptionsList: {
    gap: 6,
    marginBottom: 6,
  },
  checkpointOptionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  checkpointOptionSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  checkpointOptionCorrect: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },
  checkpointOptionWrong: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  checkpointOptionText: {
    color: colors.textPrimary,
    fontSize: 11,
    lineHeight: 16,
  },
  checkpointFeedbackBox: {
    marginTop: 6,
    padding: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkpointFeedbackTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  checkpointFeedbackCorrect: {
    color: '#10b981',
  },
  checkpointFeedbackWrong: {
    color: '#ef4444',
  },
  checkpointExplanation: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 6,
  },
  checkpointContinueBtn: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  checkpointContinueBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  interactiveQuizBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  quizTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  quizTogglePillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.6)',
  },
  quizTogglePillIcon: {
    fontSize: 12,
  },
  quizTogglePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  quizTogglePillTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  checkpointCountBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  checkpointCountText: {
    color: '#2dd4bf',
    fontSize: 10,
    fontWeight: '700',
  },
  streamingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 8,
  },
  streamingBannerIcon: {
    fontSize: 14,
  },
  streamingBannerText: {
    flex: 1,
    color: '#67e8f9',
    fontSize: 11,
    fontWeight: '600',
  },
});
