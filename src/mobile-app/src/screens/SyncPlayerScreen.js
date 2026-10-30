import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { WebView } from 'react-native-webview';
import YoutubePlayer from 'react-native-youtube-iframe';
import { colors, spacing, borderRadius } from '../constants/theme';
import Header from '../components/Header';
import Icon from '../components/ui/Icon';
import LanguageMark from '../components/ui/LanguageMark';
import SubtitleItem from '../components/SubtitleItem';
import SummaryQuizScreen from './SummaryQuizScreen';
import { apiService } from '../services/api';

import {
  LANG_MAP,
  getLangMeta,
  generateYouTubeHtml,
  generateMediaHtml,
  styles,
  VideoPlayerSection,
  PlayerControlsSection,
  SubtitleListSection,
} from '../components/player';

export default function SyncPlayerScreen({ lecture, onBack, initialSeekTime, endTime }) {
  const effectiveStartTime = initialSeekTime || lecture?.start_time || lecture?.initial_time || 0;
  const effectiveEndTime = endTime || lecture?.end_time || null;
  const effectiveSeekTime = effectiveStartTime;
  const hasStoppedAtEndRef = useRef(false);
  const [reachedRangeEnd, setReachedRangeEnd] = useState(false);
  const [currentTab, setCurrentTab] = useState('subtitles'); // 'subtitles' | 'summary'
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [burningSubtitles, setBurningSubtitles] = useState(false);
  const [burnedMediaUrl, setBurnedMediaUrl] = useState(null);
  const [serverBaseUrl, setServerBaseUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCC, setShowCC] = useState(true);
  const [subMode, setSubMode] = useState('bilingual'); // 'bilingual' | 'target' | 'original'

  // Trạng thái kéo tua tiến trình video (Interactive Seek Bar)
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDragTime, setSeekDragTime] = useState(0);
  const seekBarLayoutRef = useRef({ width: 0, x: 0 });

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
  const webViewRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Xử lý sự kiện từ Native WebView (Mobile Android / iOS)
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        if (effectiveSeekTime > 0) {
          handleSeek(effectiveSeekTime);
        }
      } else if (data.type === 'stateChange') {
        // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
        if (data.state === 1) {
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
          if (lecture?.video_url && lastTimeUpdateRef.current > 0) {
            apiService.savePlaybackProgress(lecture.video_url, lastTimeUpdateRef.current, duration);
          }
        }
      } else if (data.type === 'timeUpdate') {
        const sec = typeof data.time === 'number' ? data.time : parseFloat(data.time);
        if (!isNaN(sec) && Math.abs(sec - lastTimeUpdateRef.current) >= 0.25) {
          lastTimeUpdateRef.current = sec;
          setCurrentTime(sec);
          checkRangeStop(sec);
          checkInVideoQuiz(sec);
          saveProgressThrottled(sec);
        }
      }
    } catch (_) {}
  };

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
  const title = lecture?.title || 'Bài giảng đồng bộ phụ đề';

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
          if (webViewRef.current) {
            try {
              webViewRef.current.injectJavaScript(`
                if (window.player && typeof window.player.pauseVideo === 'function') { window.player.pauseVideo(); }
                var m = document.getElementById('media'); if (m) { m.pause(); }
                true;
              `);
            } catch (_) {}
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
    if (webViewRef.current) {
      try {
        webViewRef.current.injectJavaScript(`
          if (window.player && typeof window.player.playVideo === 'function') { window.player.playVideo(); }
          var m = document.getElementById('media'); if (m) { m.play(); }
          true;
        `);
      } catch (_) {}
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

  const isDrive = Boolean(
    lecture?.is_drive ||
    (lecture?.video_url && (lecture.video_url.includes('drive.google.com') || lecture.video_url.includes('docs.google.com')))
  );

  const driveId = isDrive
    ? (lecture?.video_url?.match(/(?:file\/d\/|id=|\/d\/)([0-9A-Za-z_-]{25,})/)?.[1] || '')
    : '';

  const driveDirectStreamUrl = driveId
    ? `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`
    : null;

  const drivePreviewUrl = driveId
    ? `https://drive.google.com/file/d/${driveId}/preview`
    : (lecture?.media_url?.includes('drive.google.com') ? lecture.media_url : null);

  // Nguồn phát file thực tế: Sử dụng Backend Proxy Stream cho Google Drive & LMS để đồng bộ 100% nút Phát/Tua
  const backendProxyStreamUrl = (isDrive || (lecture?.video_url && !isYouTube && !lecture.video_url.startsWith('local_file://')))
    ? `${serverBaseUrl}/api/video/stream-media?video_url=${encodeURIComponent(lecture?.video_url || '')}`
    : null;

  const rawMediaSrc =
    burnedMediaUrl ||
    (lecture?.media_stream_url && !lecture.media_stream_url.includes('/preview') && !lecture.media_stream_url.includes('drive.google.com')
      ? (lecture.media_stream_url.startsWith('http')
        ? lecture.media_stream_url
        : `${serverBaseUrl}${lecture.media_stream_url}`)
      : null) ||
    (lecture?.media_url && !lecture.media_url.includes('/preview') && !lecture.media_url.includes('drive.google.com')
      ? (lecture.media_url.startsWith('http')
        ? lecture.media_url
        : `${serverBaseUrl}${lecture.media_url}`)
      : null) ||
    backendProxyStreamUrl ||
    (lecture?.video_url && !lecture.video_url.startsWith('local_file://') ? lecture.video_url : null);
  const mediaSrc = rawMediaSrc && lecture?.media_access_token && rawMediaSrc.includes('/uploads/')
    ? `${rawMediaSrc}${rawMediaSrc.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(lecture.media_access_token)}`
    : rawMediaSrc;

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
                          checkRangeStop(sec);
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

  // Polling đồng bộ phụ đề thời gian thực cho YoutubePlayer trên Mobile
  useEffect(() => {
    if (Platform.OS !== 'web' && isYouTube && isPlaying) {
      const pollTimer = setInterval(async () => {
        try {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
            const sec = await ytPlayerRef.current.getCurrentTime();
            if (typeof sec === 'number' && !isNaN(sec) && Math.abs(sec - lastTimeUpdateRef.current) >= 0.25) {
              lastTimeUpdateRef.current = sec;
              setCurrentTime(sec);
              checkRangeStop(sec);
              checkInVideoQuiz(sec);
              saveProgressThrottled(sec);
            }
          }
        } catch (_) {}
      }, 250);
      return () => clearInterval(pollTimer);
    }
  }, [isPlaying, isYouTube, interactiveQuizEnabled, activeCheckpointQuiz, checkpointQuizzes]);

  // Bộ đếm đồng bộ phụ đề thời gian thực cho Google Drive & LMS iframe
  useEffect(() => {
    let timer = null;
    const isIframeVideo = isDrive || (!isYouTube && !lecture?.media_stream_url?.includes('/uploads/') && !lecture?.video_url?.startsWith('local_file://'));
    if (isPlaying && isIframeVideo) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          const next = Math.round((prev + 0.5) * 10) / 10;
          if (duration > 0 && next >= duration) {
            setIsPlaying(false);
            return duration;
          }
          lastTimeUpdateRef.current = next;
          checkRangeStop(next);
          checkInVideoQuiz(next);
          saveProgressThrottled(next);
          return next;
        });
      }, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, isDrive, isYouTube, duration, lecture]);

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
      checkRangeStop(sec);
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

  // Gửi lệnh điều khiển YouTube (hỗ trợ cả YT.Player API và chuẩn Iframe postMessage)
  const sendYouTubeCommand = (func, args = []) => {
    if (Platform.OS === 'web') {
      // 1. Gọi trực tiếp qua YT.Player instance nếu đã bind
      if (ytPlayerRef.current && typeof ytPlayerRef.current[func] === 'function') {
        try { ytPlayerRef.current[func](...args); } catch (_) {}
      }
      // 2. Gửi postMessage trực tiếp vào iframe (chuẩn chính thức của YouTube Embed API)
      if (typeof document !== 'undefined') {
        const iframe = document.getElementById('yt-sync-iframe');
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage(
              JSON.stringify({
                event: 'command',
                func: func,
                args: args,
              }),
              '*'
            );
          } catch (_) {}
        }
      }
    } else {
      if (ytPlayerRef.current && typeof ytPlayerRef.current[func] === 'function') {
        try { ytPlayerRef.current[func](...args); } catch (_) {}
      }
    }
  };

  // Điều khiển Phát / Tạm dừng thống nhất, hoạt động 100% trên cả Web & Mobile
  const togglePlayPause = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);

    if (Platform.OS === 'web') {
      sendYouTubeCommand(nextPlay ? 'playVideo' : 'pauseVideo');
      if (htmlMediaRef.current) {
        try {
          if (nextPlay) htmlMediaRef.current.play?.().catch(() => {});
          else htmlMediaRef.current.pause?.();
        } catch (_) {}
      }
    } else {
      if (webViewRef.current) {
        try {
          webViewRef.current.injectJavaScript(`
            if (window.player) {
              ${nextPlay ? 'window.player.playVideo();' : 'window.player.pauseVideo();'}
            }
            var m = document.getElementById('media');
            if (m) {
              ${nextPlay ? 'm.play();' : 'm.pause();'}
            }
            true;
          `);
        } catch (_) {}
      }
    }
  };

  // Tự động dừng video khi phát đến mốc kết thúc của đoạn thời gian đã chọn
  const checkRangeStop = useCallback((sec) => {
    if (!effectiveEndTime || effectiveEndTime <= 0) return;
    if (sec >= effectiveEndTime) {
      if (!hasStoppedAtEndRef.current) {
        hasStoppedAtEndRef.current = true;
        setReachedRangeEnd(true);
        setIsPlaying(false);
        if (Platform.OS === 'web') {
          sendYouTubeCommand('pauseVideo');
          if (htmlMediaRef.current) {
            try { htmlMediaRef.current.pause?.(); } catch (_) {}
          }
        } else {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
            try { ytPlayerRef.current.pauseVideo(); } catch (_) {}
          }
          if (webViewRef.current) {
            try {
              webViewRef.current.injectJavaScript(`
                if (window.player && typeof window.player.pauseVideo === 'function') { window.player.pauseVideo(); }
                var m = document.getElementById('media'); if (m) { m.pause(); }
                true;
              `);
            } catch (_) {}
          }
        }
      }
    } else if (sec < effectiveEndTime - 1 && hasStoppedAtEndRef.current) {
      hasStoppedAtEndRef.current = false;
      setReachedRangeEnd(false);
    }
  }, [effectiveEndTime]);

  // Khi người dùng bấm tua hoặc kéo thanh tiến trình -> Video lập tức nhảy đến đúng giây đó và phát mượt
  const handleSeek = (seconds) => {
    const targetSec = Math.max(0, Math.min(seconds, duration));
    lastTimeUpdateRef.current = targetSec;
    setCurrentTime(targetSec);

    // 1. YouTube trên Web
    if (Platform.OS === 'web') {
      sendYouTubeCommand('seekTo', [targetSec, true]);
      sendYouTubeCommand('playVideo');
      if (htmlMediaRef.current) {
        try {
          htmlMediaRef.current.currentTime = targetSec;
          htmlMediaRef.current.play?.().catch(() => {});
        } catch (_) {}
      }
    } else {
      // 2. YouTube trên Mobile
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        try {
          ytPlayerRef.current.seekTo(targetSec, true);
        } catch (_) {}
      }
      // 3. Native WebView trên Mobile
      if (webViewRef.current) {
        try {
          webViewRef.current.injectJavaScript(`
            if (window.player && typeof window.player.seekTo === 'function') {
              window.player.seekTo(${targetSec}, true);
              window.player.playVideo();
            }
            var m = document.getElementById('media');
            if (m) {
              m.currentTime = ${targetSec};
              m.play();
            }
            true;
          `);
        } catch (_) {}
      }
    }
    setIsPlaying(true);
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
              <Icon name="share" size={13} color={colors.violet} />
              <Text style={styles.headerShareText}>Chia sẻ</Text>
            </TouchableOpacity>
            <View style={styles.langBadge}>
              <LanguageMark code={targetLangInfo.code} size={13} />
              <Text style={styles.langBadgeText}>
                {targetLangInfo.code.toUpperCase()}
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
          <Icon
            name="subtitles"
            size={15}
            color={currentTab === 'subtitles' ? colors.coral : colors.slate}
          />
          <Text style={[styles.tabBtnText, currentTab === 'subtitles' && styles.activeTabBtnText]}>
            Phụ đề Đồng bộ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, currentTab === 'summary' && styles.activeTabBtn]}
          onPress={() => setCurrentTab('summary')}
        >
          <Icon
            name="summary"
            size={15}
            color={currentTab === 'summary' ? colors.coral : colors.slate}
          />
          <Text style={[styles.tabBtnText, currentTab === 'summary' && styles.activeTabBtnText]}>
            Tóm tắt &amp; Ôn tập
          </Text>
        </TouchableOpacity>
      </View>

      {currentTab === 'summary' ? (
        <SummaryQuizScreen lecture={lecture} onShare={handleShare} />
      ) : (
        <View style={styles.playerContent}>
          <View style={styles.playerBox}>
            <VideoPlayerSection
              isYouTube={isYouTube}
              youtubeId={youtubeId}
              isDrive={isDrive}
              drivePreviewUrl={drivePreviewUrl}
              mediaSrc={mediaSrc}
              isAudioOnly={isAudioOnly}
              title={title}
              duration={duration}
              effectiveSeekTime={effectiveSeekTime}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              htmlMediaRef={htmlMediaRef}
              ytPlayerRef={ytPlayerRef}
              webViewRef={webViewRef}
              lastTimeUpdateRef={lastTimeUpdateRef}
              lecture={lecture}
              handleMediaLoadedMetadata={handleMediaLoadedMetadata}
              handleMediaTimeUpdate={handleMediaTimeUpdate}
              handleMediaSeeked={handleMediaSeeked}
              handleWebViewMessage={handleWebViewMessage}
              showCC={showCC}
              activeSegment={activeSegment}
              subMode={subMode}
              activeCheckpointQuiz={activeCheckpointQuiz}
              formatTime={formatTime}
              handleResumeFromQuiz={handleResumeFromQuiz}
              handleSelectQuizOption={handleSelectQuizOption}
              generateMediaHtml={generateMediaHtml}
              apiService={apiService}
              styles={styles}
            />

            {effectiveEndTime > 0 && (
              <View style={{
                backgroundColor: reachedRangeEnd ? colors.coralTint : colors.surfaceHigh,
                paddingVertical: 8,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.md,
                marginBottom: spacing.xs,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: reachedRangeEnd ? colors.coral : colors.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Icon name={reachedRangeEnd ? "check_circle" : "timer"} size={16} color={reachedRangeEnd ? colors.coral : colors.primaryLight} />
                  <Text style={{
                    fontSize: 12,
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    color: reachedRangeEnd ? colors.coralDeep || colors.coral : colors.textMuted,
                  }}>
                    {reachedRangeEnd
                      ? `Đã xem hết đoạn (${formatTime(effectiveEndTime)}). Video đã tự động dừng!`
                      : `Đoạn đã chọn: ${formatTime(effectiveStartTime)} ➔ ${formatTime(effectiveEndTime)}`}
                  </Text>
                </View>
                {reachedRangeEnd && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.coral,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: borderRadius.sm,
                      marginLeft: 8,
                    }}
                    onPress={() => {
                      hasStoppedAtEndRef.current = false;
                      setReachedRangeEnd(false);
                      handleSeek(effectiveStartTime);
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' }}>
                      Xem lại đoạn
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <PlayerControlsSection
              isSeeking={isSeeking}
              seekDragTime={seekDragTime}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              showCC={showCC}
              formatTime={formatTime}
              handleSeek={handleSeek}
              togglePlayPause={togglePlayPause}
              setShowCC={setShowCC}
              setIsSeeking={setIsSeeking}
              setSeekDragTime={setSeekDragTime}
              seekBarLayoutRef={seekBarLayoutRef}
              styles={styles}
            />
          </View>

          <SubtitleListSection
            scrollRef={scrollRef}
            hasDifferentOriginal={hasDifferentOriginal}
            sourceLangCode={sourceLangCode}
            targetLangCode={targetLangCode}
            sourceLangInfo={sourceLangInfo}
            targetLangInfo={targetLangInfo}
            subMode={subMode}
            setSubMode={setSubMode}
            interactiveQuizEnabled={interactiveQuizEnabled}
            setInteractiveQuizEnabled={setInteractiveQuizEnabled}
            checkpointQuizzes={checkpointQuizzes}
            streamProgress={streamProgress}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredSegments={filteredSegments}
            segments={segments}
            activeSegmentIndex={activeSegmentIndex}
            handleSeek={handleSeek}
            styles={styles}
          />
        </View>
      )}
    </View>
  );
}

