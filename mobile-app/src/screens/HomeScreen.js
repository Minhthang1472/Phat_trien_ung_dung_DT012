import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  Switch,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { colors, spacing, borderRadius } from '../constants/theme';
import { SUPPORTED_LANGUAGES } from '../constants/config';
import { apiService } from '../services/api';
import Header from '../components/Header';
import LectureCard from '../components/LectureCard';
import {
  UPLOAD_LANG_OPTIONS,
  getLangDisplayName,
  SAMPLE_LECTURES,
  ensureAiClassification,
  MAX_VIDEO_SIZE,
  MAX_SUBTITLE_SIZE,
  parseTimeToSeconds,
  formatSecondsToTime,
  UploadConfigModal,
  UploadProgressModal,
  UrlConfigModal,
  TagFilterModal,
  TranslationProgressModal,
  HomeInputSection,
  HomeStatsSection,
  HomeFilterBar,
  HomeEmptyFilter,
  homeStyles as styles,
} from '../components/home';

export default function HomeScreen({ onNavigate }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [targetLang, setTargetLang] = useState('vi');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null); // null hoặc 0-100
  const [uploadDetails, setUploadDetails] = useState({ name: '', size: '' });

  // Popup Cấu hình Dịch thuật cho File Upload
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [uploadConfigModalVisible, setUploadConfigModalVisible] = useState(false);
  const [uploadTargetLang, setUploadTargetLang] = useState('vi');
  const [uploadIncludeQuiz, setUploadIncludeQuiz] = useState(true);

  // Tiến trình đa bước AI (Upload -> Whisper AI -> Dịch thuật -> Tóm tắt & Quiz)
  const [aiProcessingStage, setAiProcessingStage] = useState('uploading'); // 'uploading' | 'whisper' | 'translating' | 'summarizing' | 'done'
  const [aiStageProgress, setAiStageProgress] = useState(0);

  const [recentLectures, setRecentLectures] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [serverStatus, setServerStatus] = useState({ online: false });


  // Cơ chế ngắt ngang tiến trình (Task Cancellation - Yêu cầu 1)
  const [activeJobId, setActiveJobId] = useState(null);
  const abortControllerRef = useRef(null);
  const uploadCancelTokenRef = useRef(null);

  // Popup Tiến trình Dịch thuật Trực quan & Real-time ETA (TranslationProgressModal)
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStage, setProgressStage] = useState('audio'); // 'audio' | 'whisper' | 'translation' | 'summary' | 'done'
  const [progressElapsed, setProgressElapsed] = useState(0);
  const [progressEstimatedTotal, setProgressEstimatedTotal] = useState(25);
  const [progressTitle, setProgressTitle] = useState('');
  const progressTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);

  // Popup Cấu hình Dịch thuật & Cắt đoạn cho URL Video
  const [urlConfigModalVisible, setUrlConfigModalVisible] = useState(false);
  const [pendingUrlInfo, setPendingUrlInfo] = useState(null);
  const [urlProcessMode, setUrlProcessMode] = useState('all'); // 'all' hoặc 'range'
  const [urlRangeStart, setUrlRangeStart] = useState('00:00');
  const [urlRangeEnd, setUrlRangeEnd] = useState('');
  const [urlIncludeQuiz, setUrlIncludeQuiz] = useState(true);

  // Mốc thời gian cắt đoạn cho File Upload
  const [uploadEnableTimeRange, setUploadEnableTimeRange] = useState(false);
  const [uploadTimeRangeStart, setUploadTimeRangeStart] = useState('00:00');
  const [uploadTimeRangeEnd, setUploadTimeRangeEnd] = useState('');

  // Bộ lọc theo Thẻ bài giảng đa chọn (Multi-select Tag Filter)
  const [selectedFilterTags, setSelectedFilterTags] = useState([]);
  const [tagFilterModalVisible, setTagFilterModalVisible] = useState(false);
  const [tempSelectedTags, setTempSelectedTags] = useState([]);

  // Bộ lọc, Tìm kiếm, Ghim yêu thích & Tiến độ phát video
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'fav', 'en', 'ja', 'upload', 'youtube'
  const [favorites, setFavorites] = useState([]);
  const [playbackMap, setPlaybackMap] = useState({});

  useEffect(() => {
    checkHealthAndFetchHistory();
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  const checkHealthAndFetchHistory = async () => {
    const status = await apiService.checkServerHealth();
    setServerStatus(status);

    try {
      const [history, favs, pMap, currentUser] = await Promise.all([
        apiService.getLectureHistory(25),
        apiService.getFavorites(),
        apiService.getPlaybackProgressMap(),
        apiService.getSavedUser(),
      ]);

      if (history && history.length > 0) {
        setRecentLectures(history.map(ensureAiClassification));
      } else if (!currentUser) {
        // Chỉ hiển thị bài mẫu khi ở chế độ khách chưa đăng nhập
        setRecentLectures(SAMPLE_LECTURES.map(ensureAiClassification));
      } else {
        // Người dùng đã đăng nhập: Hiển thị đúng danh sách bài riêng của họ (trống nếu tài khoản mới)
        setRecentLectures([]);
      }
      setFavorites(favs || []);
      setPlaybackMap(pMap || {});
    } catch (err) {
      console.warn('Lỗi tải dữ liệu lịch sử/favorites:', err);
      const currentUser = await apiService.getSavedUser();
      if (!currentUser) {
        setRecentLectures(SAMPLE_LECTURES.map(ensureAiClassification));
      } else {
        setRecentLectures([]);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkHealthAndFetchHistory();
    setRefreshing(false);
  };

  const handleToggleFavorite = async (lecture) => {
    if (!lecture?.video_url) return;
    const updated = await apiService.toggleFavorite(lecture.video_url);
    setFavorites(updated);
  };

  const handleQuickExportSRT = async (lecture) => {
    try {
      const res = await apiService.exportLectureSRT(lecture);
      if (Platform.OS === 'web') {
        window.alert('Đã tải xuống file phụ đề .SRT thành công!');
      } else if (res && res.isDefault) {
        Alert.alert('Thành công', `Đã lưu file phụ đề .SRT vào thư mục mặc định:\n📂 ${res.dirName}`);
      } else if (res && !res.cancelled) {
        Alert.alert('Thành công', 'Đã xuất file phụ đề .SRT.');
      }
    } catch (err) {
      Alert.alert('Lỗi xuất phụ đề', err.message);
    }
  };

  const handleQuickExportSummary = async (lecture) => {
    try {
      const res = await apiService.exportLectureSummary(lecture);
      if (Platform.OS === 'web') {
        window.alert('Đã tải xuống bản tóm tắt bài giảng .TXT thành công!');
      } else if (res && res.isDefault) {
        Alert.alert('Thành công', `Đã lưu bản tóm tắt vào thư mục mặc định:\n📂 ${res.dirName}`);
      } else if (res && !res.cancelled) {
        Alert.alert('Thành công', 'Đã xuất bản tóm tắt bài giảng.');
      }
    } catch (err) {
      Alert.alert('Lỗi xuất tóm tắt', err.message);
    }
  };

  // Cơ chế ngắt ngang tiến trình (Task Cancellation - Yêu cầu 1)
  const handleCancelProcessing = async () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setProgressModalVisible(false);

    if (activeJobId) {
      await apiService.cancelJob(activeJobId);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (uploadCancelTokenRef.current && uploadCancelTokenRef.current.abort) {
      uploadCancelTokenRef.current.abort();
    }
    setLoading(false);
    setUploadProgress(null);
    setPendingUploadFile(null);
    setActiveJobId(null);
    Alert.alert('Đã hủy tiến trình', 'Tiến trình xử lý video đã dừng lại để giải phóng CPU/GPU và RAM.');
  };

  // Danh sách thẻ tags khả dụng từ lịch sử bài giảng phục vụ bộ lọc
  const availableTags = useMemo(() => {
    const set = new Set();
    (recentLectures || []).forEach((lec) => {
      const tags = lec.tags || lec.full_data?.tags || [];
      if (Array.isArray(tags)) {
        tags.forEach((t) => {
          if (t && typeof t === 'string' && t.trim()) set.add(t.trim());
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [recentLectures]);

  // Bộ điều khiển Bộ lọc thẻ (Tag Filter Modal)
  const handleOpenTagFilterModal = () => {
    setTempSelectedTags([...selectedFilterTags]);
    setTagFilterModalVisible(true);
  };

  const handleToggleTag = (tag) => {
    setTempSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSelectAllTags = () => {
    setTempSelectedTags([...availableTags]);
  };

  const handleDeselectAllTags = () => {
    setTempSelectedTags([]);
  };

  const handleApplyTagFilter = () => {
    setSelectedFilterTags([...tempSelectedTags]);
    setTagFilterModalVisible(false);
  };

  const handleClearTagFilter = () => {
    setSelectedFilterTags([]);
    setTempSelectedTags([]);
    setTagFilterModalVisible(false);
  };

  // Tính toán danh sách bài giảng sau khi lọc và sắp xếp (bài ghim luôn ưu tiên trên đầu)
  const filteredAndSortedLectures = useMemo(() => {
    const list = recentLectures || [];
    return list
      .filter((lec) => {
        // 1. Lọc theo từ khóa tìm kiếm
        if (searchKeyword.trim()) {
          const q = searchKeyword.trim().toLowerCase();
          const matchTitle = (lec.title || '').toLowerCase().includes(q);
          const matchSummary = (lec.summary || '').toLowerCase().includes(q);
          const matchKeys = (lec.key_points || []).some((kp) => kp.toLowerCase().includes(q));
          if (!matchTitle && !matchSummary && !matchKeys) return false;
        }

        // 2. Lọc theo danh mục / Tab
        const isFav = favorites.includes(lec.video_url);
        const isLocal =
          lec.video_url?.startsWith('local_file://') ||
          lec.media_url?.startsWith('/uploads/') ||
          lec.media_stream_url?.startsWith('/uploads/');
        const lang = (lec.detected_language || lec.language || '').toLowerCase();

        if (activeCategory === 'fav') return isFav;
        if (activeCategory === 'en') return lang.includes('en');
        if (activeCategory === 'ja') return lang.includes('ja');
        if (activeCategory === 'upload') return isLocal;
        if (activeCategory === 'youtube') return !isLocal && (lec.video_url || '').includes('youtu');

        // 3. Lọc theo Thẻ bài giảng đa chọn (Multi-select Tag Filter)
        if (selectedFilterTags.length > 0) {
          const rawTags = lec.tags || lec.full_data?.tags || [];
          const lecTags = (Array.isArray(rawTags) ? rawTags : []).map((t) =>
            String(t).trim().toLowerCase()
          );
          const hasMatch = selectedFilterTags.some((ft) =>
            lecTags.includes(String(ft).trim().toLowerCase())
          );
          if (!hasMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Bài ghim (Favorites) luôn ưu tiên nổi lên trên đầu!
        const aFav = favorites.includes(a.video_url) ? 1 : 0;
        const bFav = favorites.includes(b.video_url) ? 1 : 0;
        return bFav - aFav;
      });
  }, [recentLectures, searchKeyword, activeCategory, favorites, selectedFilterTags]);

  // Bước 1: Khi bấm Bắt đầu -> Xác minh video & Mở Popup hỏi cấu hình (Toàn bộ vs Cắt đoạn, Bật/Tắt Quiz)
  const handleProcessVideo = async () => {
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      Alert.alert('Chưa nhập URL', 'Vui lòng dán liên kết video YouTube hoặc liên kết bài giảng hợp lệ.');
      return;
    }

    setLoading(true);
    setLoadingStep('Đang xác minh thông tin & thời lượng bài giảng...');

    try {
      const info = await apiService.getVideoInfo(trimmed);
      if (info.is_allowed === false) {
        throw new Error(`Từ chối tải: ${info.copyright_status || 'Video vi phạm bản quyền hoặc có DRM bảo vệ.'}`);
      }

      setLoading(false);
      const dur = info.duration_seconds || 0;
      const durFormatted = formatSecondsToTime(dur);
      setPendingUrlInfo(info);
      setUrlProcessMode('all');
      setUrlRangeStart('00:00');
      setUrlRangeEnd(durFormatted);
      setUrlIncludeQuiz(true);
      setUrlConfigModalVisible(true);
    } catch (err) {
      setLoading(false);
      Alert.alert('Không thể xác minh video', err.message || 'Lỗi kết nối tới máy chủ.');
    }
  };

  // Bước 2: Người dùng xác nhận lựa chọn trong Popup -> Bắt đầu tiến trình tạo phụ đề AI
  const handleConfirmUrlProcess = async () => {
    if (!pendingUrlInfo) return;
    const trimmed = videoUrl.trim();
    const durationSec = pendingUrlInfo.duration_seconds || 0;

    let parsedStart = null;
    let parsedEnd = null;

    if (urlProcessMode === 'range') {
      parsedStart = parseTimeToSeconds(urlRangeStart);
      parsedEnd = parseTimeToSeconds(urlRangeEnd);

      if (parsedStart === null || parsedEnd === null) {
        Alert.alert('Lỗi mốc thời gian', 'Vui lòng nhập định dạng thời gian hợp lệ (ví dụ: 01:30 hoặc 10:00).');
        return;
      }
      if (parsedStart >= parsedEnd) {
        Alert.alert('Lỗi mốc thời gian', 'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc.');
        return;
      }
      if (parsedEnd > durationSec + 10 && durationSec > 0) {
        Alert.alert(
          'Lỗi mốc thời gian',
          `Thời gian kết thúc không được vượt quá độ dài video (${formatSecondsToTime(durationSec)}).`
        );
        return;
      }
    }

    setUrlConfigModalVisible(false);

    const isLong = durationSec >= 1800; // Ngưỡng 30 phút
    const isRange = urlProcessMode === 'range';
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveJobId(jobId);
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    setLoading(true);

    // Tính toán ước tính thời gian xử lý (ETA) dựa trên độ dài video
    const effectiveSec = isRange
      ? Math.max(30, (parsedEnd || durationSec) - (parsedStart || 0))
      : (durationSec || 180);
    // Colab GPU Fast-Whisper + Translation chạy tốc độ ~10-15x realtime
    const estimatedSec = pendingUrlInfo.is_cached
      ? 4
      : Math.max(16, Math.min(180, Math.round(effectiveSec * 0.08)));

    setProgressEstimatedTotal(estimatedSec);
    setProgressElapsed(0);
    setProgressPercent(5);
    setProgressStage('audio');
    setProgressTitle(pendingUrlInfo.title || trimmed);
    setProgressModalVisible(true);

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);

    // Timer đếm giây thực tế
    elapsedTimerRef.current = setInterval(() => {
      setProgressElapsed((prev) => prev + 1);
    }, 1000);

    // Timer cập nhật tiến độ phần trăm % và giai đoạn mượt mà
    progressTimerRef.current = setInterval(() => {
      setProgressPercent((prev) => {
        let increment = 1;
        if (prev < 25) {
          increment = Math.max(1, Math.round(25 / (estimatedSec * 0.25 || 4)));
          setProgressStage('audio');
        } else if (prev < 65) {
          increment = Math.max(1, Math.round(40 / (estimatedSec * 0.45 || 8)));
          setProgressStage('whisper');
        } else if (prev < 85) {
          increment = Math.max(1, Math.round(20 / (estimatedSec * 0.2 || 4)));
          setProgressStage('translation');
        } else if (prev < 95) {
          increment = 1;
          setProgressStage('summary');
        } else {
          increment = 0;
          setProgressStage('summary');
        }
        return Math.min(95, prev + Math.max(1, increment));
      });
    }, 800);

    try {
      // 1. Nếu video từ 30 phút trở lên, không chọn cắt đoạn và chưa có trong Cache: Tự động kích hoạt song song
      if (isLong && !pendingUrlInfo.is_cached && !isRange) {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        setProgressModalVisible(false);

        const minutes = Math.round(durationSec / 60);
        setLoadingStep(`Video dài ${minutes}p (≥ 30p) - Tự động bật Xem ngay & Xử lý song song...`);
        const streamResult = await apiService.streamInit(trimmed, targetLang);
        setLoading(false);
        setActiveJobId(null);

        const noticeMsg = `Video này có thời lượng dài (${minutes} phút).\n\nHệ thống đã tự động kích hoạt chế độ XEM NGAY & XỬ LÝ SONG SONG để bạn theo dõi video ngay mà không cần chờ đợi!`;
        if (Platform.OS === 'web') {
          window.alert(`⚡ TỰ ĐỘNG XỬ LÝ SONG SONG\n\n${noticeMsg}`);
        } else {
          Alert.alert('⚡ Tự động xử lý song song', noticeMsg);
        }
        onNavigate('SyncPlayer', { lecture: streamResult });
        return;
      }

      // 2. Xử lý toàn bộ hoặc đoạn đã chọn (AI tự động phân loại & gắn thẻ)
      setLoadingStep('Đang bóc tách phụ đề & tổng hợp nội dung...');
      const result = await apiService.processVideo(trimmed, {
        targetLanguage: targetLang,
        sourceLanguage: 'auto',
        maxDuration: null,
        includeQuiz: urlIncludeQuiz,
        startTime: parsedStart,
        endTime: parsedEnd,
        jobId: jobId,
        folder: null,
        tags: [],
        signal: abortCtrl.signal,
      });

      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);

      // Nhảy 100% hoàn tất và chuyển sang phòng học
      setProgressPercent(100);
      setProgressStage('done');

      await new Promise((resolve) => setTimeout(resolve, 600));

      setProgressModalVisible(false);
      setLoading(false);
      setActiveJobId(null);
      onNavigate('SyncPlayer', { lecture: result });
    } catch (err) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      setProgressModalVisible(false);
      setLoading(false);
      setActiveJobId(null);

      if (err.name === 'AbortError' || err.message?.includes('hủy')) {
        Alert.alert('Đã hủy tiến trình', 'Tiến trình xử lý video đã được dừng lại theo yêu cầu của bạn.');
        return;
      }
      Alert.alert(
        'Không thể xử lý bài giảng',
        `${err.message}\n\nBạn có muốn mở bản bài giảng mẫu để trải nghiệm giao diện không?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xem bài mẫu',
            onPress: () => onNavigate('SyncPlayer', { lecture: SAMPLE_LECTURES[0] }),
          },
        ]
      );
    }
  };

  const handleSelectLecture = (lecture) => {
    const progress = playbackMap[lecture.video_url];
    const initialSeekTime = progress && progress.currentTime > 5 ? progress.currentTime : 0;

    // Nếu là item từ server chỉ có metadata, hoặc item đầy đủ
    if (lecture.full_data) {
      onNavigate('SyncPlayer', { lecture: lecture.full_data, initialSeekTime });
    } else if (lecture.segments && lecture.segments.length > 0) {
      onNavigate('SyncPlayer', { lecture, initialSeekTime });
    } else {
      // Gọi API tải dữ liệu chi tiết
      setLoading(true);
      setLoadingStep('Đang tải bài giảng từ Cloud Cache...');
      apiService
        .processVideo(lecture.video_url, lecture.language || 'vi')
        .then((fullData) => {
          setLoading(false);
          onNavigate('SyncPlayer', { lecture: fullData, initialSeekTime });
        })
        .catch(() => {
          setLoading(false);
          // Fallback dùng sample
          onNavigate('SyncPlayer', { lecture: SAMPLE_LECTURES[0], initialSeekTime });
        });
    }
  };

  const handleDeleteLecture = (lecture) => {
    const confirmDelete = async () => {
      // Cập nhật UI ngay lập tức (Optimistic UI)
      setRecentLectures((prev) => prev.filter((item) => item.video_url !== lecture.video_url));

      // Gọi xóa trên Server Cloud Firestore & Local Storage
      try {
        await apiService.deleteLecture(lecture.video_url);
      } catch (err) {
        console.warn('Lỗi khi xóa bài giảng:', err);
      }
    };

    if (Platform.OS === 'web') {
      const ok = window.confirm(`Bạn có chắc chắn muốn xóa bài giảng "${lecture.title || 'này'}" không?`);
      if (ok) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Xác nhận xóa bài giảng',
        `Bạn có chắc chắn muốn xóa bài giảng "${lecture.title || 'này'}" khỏi danh sách?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  // 1. Khi người dùng bấm nút Chọn File -> Chọn file -> Mở Popup cấu hình ngôn ngữ dịch thuật
  const handleUploadFile = () => {
    if (Platform.OS === 'web') {
      try {
        let input = document.getElementById('lecture-file-picker');
        if (!input) {
          input = document.createElement('input');
          input.id = 'lecture-file-picker';
          input.type = 'file';
          input.accept = 'video/*,audio/*,.mp4,.mp3,.wav,.m4a,.mov,.webm';
          input.style.display = 'none';
          document.body.appendChild(input);
        }

        input.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          // Kiểm tra dung lượng file Video/Audio (Tối đa 150MB)
          if (file.size > MAX_VIDEO_SIZE) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            Alert.alert(
              'File vượt quá giới hạn',
              `Dung lượng file (${sizeMb} MB) vượt quá giới hạn cho phép (150 MB).\nVui lòng chọn video/audio ngắn hơn hoặc nén lại trước khi tải.`
            );
            input.value = '';
            return;
          }

          // Lưu URL blob cục bộ để phát mượt trên Web
          let localMediaUrl = null;
          try {
            if (typeof URL !== 'undefined' && URL.createObjectURL) {
              localMediaUrl = URL.createObjectURL(file);
            }
          } catch (_) {}

          const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
          setPendingUploadFile({
            file,
            name: file.name,
            size: sizeStr,
            localMediaUrl,
            type: file.type || 'video/mp4',
          });
          setUploadTargetLang(targetLang || 'vi');
          setUploadIncludeQuiz(includeQuiz);
          setUploadConfigModalVisible(true);
          input.value = '';
        };

        input.click();
      } catch (err) {
        Alert.alert('Lỗi mở file', err.message);
      }
    } else {
      // Trên Điện thoại di động (Android / iOS)
      (async () => {
        try {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['video/*', 'audio/*'],
            copyToCacheDirectory: true,
          });

          if (result.canceled) return;
          const file = result.assets && result.assets[0];
          if (!file) return;

          // Kiểm tra dung lượng file Video/Audio (Tối đa 150MB)
          if (file.size && file.size > MAX_VIDEO_SIZE) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            Alert.alert(
              'File vượt quá giới hạn',
              `Dung lượng file (${sizeMb} MB) vượt quá giới hạn cho phép (150 MB).\nVui lòng chọn video/audio ngắn hơn hoặc nén lại trước khi tải.`
            );
            return;
          }

          const sizeStr = file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '';
          setPendingUploadFile({
            uri: file.uri,
            name: file.name || 'uploaded_lecture.mp4',
            type: file.mimeType || 'video/mp4',
            size: sizeStr,
          });
          setUploadTargetLang(targetLang || 'vi');
          setUploadIncludeQuiz(includeQuiz);
          setUploadConfigModalVisible(true);
        } catch (err) {
          Alert.alert('Lỗi chọn file', err.message);
        }
      })();
    }
  };

  // 2. Khi người dùng xác nhận ngôn ngữ & bấm Bắt đầu xử lý -> Mở Progress bar & thực hiện AI đa bước
  const handleConfirmUpload = async () => {
    if (!pendingUploadFile) return;
    const fileToUpload = pendingUploadFile;
    setUploadConfigModalVisible(false);

    const jobId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveJobId(jobId);
    uploadCancelTokenRef.current = { abort: null };

    // Kích hoạt thanh tiến trình (Progress Bar)
    setUploadDetails({ name: fileToUpload.name, size: fileToUpload.size });
    setUploadProgress(0);
    setAiProcessingStage('uploading');
    setAiStageProgress(5);

    let stageTimer = null;
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        formData.append('file', fileToUpload.file);
      } else {
        formData.append('file', {
          uri: fileToUpload.uri,
          name: fileToUpload.name,
          type: fileToUpload.type,
        });
      }
      formData.append('target_language', uploadTargetLang);
      formData.append('include_quiz', uploadIncludeQuiz ? 'true' : 'false');
      formData.append('job_id', jobId);

      // Cắt mốc thời gian nếu bật (Yêu cầu 4)
      if (uploadEnableTimeRange) {
        const s = parseTimeToSeconds(uploadTimeRangeStart);
        const e = parseTimeToSeconds(uploadTimeRangeEnd);
        if (s !== null) formData.append('start_time', s);
        if (e !== null) formData.append('end_time', e);
      }

      const uploadPromise = apiService.uploadWithProgress(
        '/api/video/upload',
        formData,
        (percent) => {
          setUploadProgress(percent);
          if (percent < 100) {
            setAiProcessingStage('uploading');
            setAiStageProgress(Math.round(percent * 0.35));
          } else {
            // Khi truyền file lên server thành công 100%
            setAiProcessingStage('whisper');
            setAiStageProgress(45);
          }
        },
        uploadCancelTokenRef.current
      );

      // Cập nhật tiến độ trực quan đa bước trong khi AI đang bóc tách, dịch thuật & tóm tắt
      let fakeProgress = 45;
      stageTimer = setInterval(() => {
        setAiProcessingStage((prevStage) => {
          if (prevStage === 'uploading') return prevStage;
          if (prevStage === 'whisper') {
            fakeProgress = Math.min(72, fakeProgress + 2);
            setAiStageProgress(fakeProgress);
            if (fakeProgress >= 70) return 'translating';
            return 'whisper';
          }
          if (prevStage === 'translating') {
            fakeProgress = Math.min(88, fakeProgress + 1);
            setAiStageProgress(fakeProgress);
            if (fakeProgress >= 86) return 'summarizing';
            return 'translating';
          }
          if (prevStage === 'summarizing') {
            fakeProgress = Math.min(96, fakeProgress + 1);
            setAiStageProgress(fakeProgress);
            return 'summarizing';
          }
          return prevStage;
        });
      }, 700);

      const data = await uploadPromise;
      if (stageTimer) clearInterval(stageTimer);

      // Hoàn tất 100% thành công!
      setAiProcessingStage('done');
      setAiStageProgress(100);
      setUploadProgress(100);
      setActiveJobId(null);

      if (fileToUpload.localMediaUrl) {
        data.media_stream_url = fileToUpload.localMediaUrl;
        data.media_mime_type = fileToUpload.type || '';
      }

      // Giữ 700ms để người dùng thấy tất cả các bước đã hoàn tất (100% Checkmarks)
      setTimeout(async () => {
        setUploadProgress(null);
        setPendingUploadFile(null);
        await apiService.saveLectureToLocal(data);
        await checkHealthAndFetchHistory();
        onNavigate('SyncPlayer', { lecture: data });
      }, 700);

    } catch (err) {
      if (stageTimer) clearInterval(stageTimer);
      setUploadProgress(null);
      setPendingUploadFile(null);
      setActiveJobId(null);
      if (err.message?.includes('hủy')) {
        Alert.alert('Đã hủy tiến trình', 'Tác vụ tải lên và xử lý đã được dừng lại.');
        return;
      }
      Alert.alert('Không thể xử lý file', err.message);
    }
  };

  // Nạp phụ đề có sẵn (Kiểm tra giới hạn 10MB)
  const handleUploadSubtitle = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/x-subrip', 'text/vtt', 'text/plain', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const subtitle = result.assets && result.assets[0];
      if (!subtitle || !/\.(srt|vtt)$/i.test(subtitle.name || '')) {
        Alert.alert('Tệp không hợp lệ', 'Vui lòng chọn tệp phụ đề .srt hoặc .vtt.');
        return;
      }

      // 1. Kiểm tra giới hạn 10MB cho tệp phụ đề
      if (subtitle.size && subtitle.size > MAX_SUBTITLE_SIZE) {
        const sizeMb = (subtitle.size / (1024 * 1024)).toFixed(1);
        Alert.alert(
          'Tệp phụ đề quá lớn',
          `Dung lượng tệp (${sizeMb} MB) vượt quá giới hạn cho phép (10 MB).`
        );
        return;
      }

      setLoading(true);
      setLoadingStep('Đang đọc timestamps và dịch phụ đề...');
      const uploadFile = subtitle.file || {
        uri: subtitle.uri,
        name: subtitle.name,
        type: subtitle.mimeType || 'text/plain',
      };
      const data = await apiService.processSubtitleFile(uploadFile, {
        videoUrl: videoUrl.trim(),
        title: subtitle.name.replace(/\.(srt|vtt)$/i, ''),
        targetLanguage: targetLang,
        includeQuiz,
      });
      setLoading(false);
      await checkHealthAndFetchHistory();
      onNavigate('SyncPlayer', { lecture: data });
    } catch (err) {
      setLoading(false);
      Alert.alert('Không thể xử lý phụ đề', err.message);
    }
  };

  // Xem ngay & Xử lý song song cho video dài (Giai đoạn 3)
  const handleStreamVideo = async () => {
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      Alert.alert(
        'Chưa nhập URL bài giảng',
        'Vui lòng dán liên kết video YouTube hoặc bài giảng để phát tức thì và tự động xử lý phụ đề ngầm.'
      );
      return;
    }

    setLoading(true);
    setLoadingStep('Khởi tạo phát tức thì & Lookahead phân đoạn đầu...');

    try {
      const result = await apiService.streamInit(trimmed, targetLang);
      setLoading(false);
      onNavigate('SyncPlayer', { lecture: result });
    } catch (err) {
      setLoading(false);
      Alert.alert('Không thể khởi tạo phát song song', err.message);
    }
  };

  // Ghép đôi Video và Phụ đề có sẵn (Giai đoạn 2)
  const handlePairVideoAndSubtitle = async () => {
    try {
      // 1. Chọn file phụ đề .srt hoặc .vtt
      const subResult = await DocumentPicker.getDocumentAsync({
        type: ['application/x-subrip', 'text/vtt', 'text/plain', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (subResult.canceled) return;
      const subtitle = subResult.assets && subResult.assets[0];
      if (!subtitle || !/\.(srt|vtt)$/i.test(subtitle.name || '')) {
        Alert.alert('Tệp không hợp lệ', 'Vui lòng chọn tệp phụ đề định dạng .srt hoặc .vtt.');
        return;
      }

      if (subtitle.size && subtitle.size > MAX_SUBTITLE_SIZE) {
        Alert.alert('Tệp quá lớn', 'Dung lượng tệp phụ đề vượt quá giới hạn 10MB.');
        return;
      }

      const uploadSubFile = subtitle.file || {
        uri: subtitle.uri,
        name: subtitle.name,
        type: subtitle.mimeType || 'text/plain',
      };

      const trimmedUrl = videoUrl.trim();

      // Nếu đã có URL ở ô nhập: ghép trực tiếp với URL
      if (trimmedUrl) {
        setLoading(true);
        setLoadingStep('Đang ghép đôi Video URL với Phụ đề và sinh Mindmap...');
        const result = await apiService.pairVideoAndSubtitles(
          uploadSubFile,
          null,
          trimmedUrl,
          targetLang,
          includeQuiz
        );
        setLoading(false);
        await checkHealthAndFetchHistory();
        onNavigate('SyncPlayer', { lecture: result });
        return;
      }

      // Nếu chưa có URL: Cho phép người dùng chọn thêm file Video từ máy hoặc xử lý độc lập
      const proceedWithSubOnly = async () => {
        setLoading(true);
        setLoadingStep('Đang phân tích phụ đề và sinh Mindmap...');
        try {
          const result = await apiService.pairVideoAndSubtitles(
            uploadSubFile,
            null,
            '',
            targetLang,
            includeQuiz
          );
          setLoading(false);
          await checkHealthAndFetchHistory();
          onNavigate('SyncPlayer', { lecture: result });
        } catch (err) {
          setLoading(false);
          Alert.alert('Lỗi phân tích phụ đề', err.message);
        }
      };

      const pickLocalVideoAndPair = async () => {
        try {
          const vidResult = await DocumentPicker.getDocumentAsync({
            type: ['video/*', 'audio/*'],
            copyToCacheDirectory: true,
          });
          if (vidResult.canceled) return;
          const vidFile = vidResult.assets && vidResult.assets[0];
          if (!vidFile) return;

          if (vidFile.size && vidFile.size > MAX_VIDEO_SIZE) {
            Alert.alert('File video quá lớn', 'Dung lượng file video vượt quá giới hạn 150MB.');
            return;
          }

          const uploadVidFile = vidFile.file || {
            uri: vidFile.uri,
            name: vidFile.name || 'lecture.mp4',
            type: vidFile.mimeType || 'video/mp4',
          };

          setLoading(true);
          setLoadingStep('Đang ghép đôi Video nội bộ với Phụ đề...');
          const result = await apiService.pairVideoAndSubtitles(
            uploadSubFile,
            uploadVidFile,
            '',
            targetLang,
            includeQuiz
          );

          if (typeof URL !== 'undefined' && URL.createObjectURL && vidFile.file) {
            result.media_stream_url = URL.createObjectURL(vidFile.file);
          }
          setLoading(false);
          await checkHealthAndFetchHistory();
          onNavigate('SyncPlayer', { lecture: result });
        } catch (err) {
          setLoading(false);
          Alert.alert('Lỗi ghép đôi', err.message);
        }
      };

      if (Platform.OS === 'web') {
        const choice = window.confirm(
          `Đã chọn phụ đề: "${subtitle.name}".\n\nBấm [OK] để chọn thêm File Video từ máy ghép đôi.\nBấm [Cancel] để chỉ phân tích file phụ đề.`
        );
        if (choice) {
          await pickLocalVideoAndPair();
        } else {
          await proceedWithSubOnly();
        }
      } else {
        Alert.alert(
          'Ghép đôi Video',
          `Đã chọn phụ đề: "${subtitle.name}". Bạn muốn liên kết với video nào?`,
          [
            { text: 'Chỉ phân tích phụ đề', onPress: proceedWithSubOnly },
            { text: 'Chọn File Video từ máy', onPress: pickLocalVideoAndPair },
            { text: 'Hủy', style: 'cancel' },
          ]
        );
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Lỗi thao tác', err.message);
    }
  };

  const totalLectures = recentLectures.length;
  const totalMinutes = Math.round(
    recentLectures.reduce((acc, l) => acc + (l.duration_seconds || 0), 0) / 60
  );
  const totalQuizzes = recentLectures.reduce(
    (acc, l) => acc + ((l.quiz || l.full_data?.quiz)?.length || 0), 0
  );

  return (
    <View style={styles.container}>
      <Header
        title="PHỤ ĐỀ BÀI GIẢNG TỰ ĐỘNG"
        serverStatus={serverStatus}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primaryLight} />
        }
      >
        {/* 1. Khung Nhập Liên Kết & Nút Tác Vụ */}
        <HomeInputSection
          videoUrl={videoUrl}
          onChangeVideoUrl={setVideoUrl}
          onClearVideoUrl={() => setVideoUrl('')}
          targetLang={targetLang}
          onChangeTargetLang={setTargetLang}
          supportedLanguages={SUPPORTED_LANGUAGES}
          loading={loading}
          loadingStep={loadingStep}
          onProcessVideo={handleProcessVideo}
          onCancelProcessing={handleCancelProcessing}
          onPairVideoAndSubtitle={handlePairVideoAndSubtitle}
          onUploadFile={handleUploadFile}
        />

        {/* 2. Khối Thống kê Tiến độ Học Tập */}
        <HomeStatsSection
          totalLectures={totalLectures}
          totalMinutes={totalMinutes}
          totalQuizzes={totalQuizzes}
        />

        {/* 3. Danh sách Bài giảng Gần đây & Bộ Lọc */}
        <View style={styles.cardSection}>
          <HomeFilterBar
            totalCount={filteredAndSortedLectures.length}
            onRefresh={handleRefresh}
            searchKeyword={searchKeyword}
            onChangeSearchKeyword={setSearchKeyword}
            onClearSearchKeyword={() => setSearchKeyword('')}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            recentCount={recentLectures.length}
            favoritesCount={favorites.length}
            selectedFilterTags={selectedFilterTags}
            onOpenTagFilterModal={handleOpenTagFilterModal}
            onClearTagFilter={handleClearTagFilter}
            onRemoveSingleFilterTag={(tag) =>
              setSelectedFilterTags((prev) => prev.filter((t) => t !== tag))
            }
          />

          {/* Danh sách thẻ bài giảng */}
          {filteredAndSortedLectures.length > 0 ? (
            filteredAndSortedLectures.map((lecture, idx) => (
              <LectureCard
                key={`${lecture.video_url}_${idx}`}
                lecture={lecture}
                isFavorite={favorites.includes(lecture.video_url)}
                onToggleFavorite={handleToggleFavorite}
                playbackProgress={playbackMap[lecture.video_url]}
                onPress={handleSelectLecture}
                onDelete={handleDeleteLecture}
                onExportSRT={handleQuickExportSRT}
                onExportSummary={handleQuickExportSummary}
              />
            ))
          ) : (
            <HomeEmptyFilter
              searchKeyword={searchKeyword}
              activeCategory={activeCategory}
              onResetFilter={() => {
                setSearchKeyword('');
                setActiveCategory('all');
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* 1. Modal Cấu hình File Upload từ Thiết bị */}
      <UploadConfigModal
        visible={uploadConfigModalVisible}
        pendingFile={pendingUploadFile}
        targetLang={uploadTargetLang}
        onSelectLang={setUploadTargetLang}
        includeQuiz={uploadIncludeQuiz}
        onToggleQuiz={setUploadIncludeQuiz}
        enableTimeRange={uploadEnableTimeRange}
        onToggleTimeRange={setUploadEnableTimeRange}
        timeRangeStart={uploadTimeRangeStart}
        onChangeTimeRangeStart={setUploadTimeRangeStart}
        timeRangeEnd={uploadTimeRangeEnd}
        onChangeTimeRangeEnd={setUploadTimeRangeEnd}
        onClose={() => {
          setUploadConfigModalVisible(false);
          setPendingUploadFile(null);
        }}
        onSubmit={handleConfirmUpload}
      />

      {/* 2. Modal Tiến trình Dịch thuật Trực quan URL (Lottie + Real-time ETA) */}
      <TranslationProgressModal
        visible={progressModalVisible}
        progress={progressPercent}
        stage={progressStage}
        title={progressTitle}
        targetLanguageName={getLangDisplayName(targetLang)}
        elapsedSeconds={progressElapsed}
        estimatedTotalSeconds={progressEstimatedTotal}
        onCancel={handleCancelProcessing}
      />

      {/* 3. Modal Thanh tiến trình Upload & Dịch thuật Đa bước */}
      <UploadProgressModal
        visible={uploadProgress !== null}
        uploadProgress={uploadProgress}
        stage={aiProcessingStage}
        stageProgress={aiStageProgress}
        uploadDetails={uploadDetails}
        targetLanguageName={getLangDisplayName(uploadTargetLang)}
        onCancel={handleCancelProcessing}
      />

      {/* 4. Modal Cấu Hình Tạo Phụ Đề Cho URL Video */}
      <UrlConfigModal
        visible={urlConfigModalVisible}
        videoInfo={pendingUrlInfo}
        processMode={urlProcessMode}
        onSelectMode={setUrlProcessMode}
        rangeStart={urlRangeStart}
        onChangeRangeStart={setUrlRangeStart}
        rangeEnd={urlRangeEnd}
        onChangeRangeEnd={setUrlRangeEnd}
        includeQuiz={urlIncludeQuiz}
        onToggleQuiz={setUrlIncludeQuiz}
        onClose={() => setUrlConfigModalVisible(false)}
        onSubmit={handleConfirmUrlProcess}
      />

      {/* 5. Modal Bộ Lọc Thẻ Bài Giảng (Multi-Select Tag Filter Modal) */}
      <TagFilterModal
        visible={tagFilterModalVisible}
        availableTags={availableTags}
        tempSelectedTags={tempSelectedTags}
        onToggleTag={handleToggleTag}
        onSelectAll={handleSelectAllTags}
        onDeselectAll={handleDeselectAllTags}
        onClearFilter={handleClearTagFilter}
        onApplyFilter={handleApplyTagFilter}
        onClose={() => setTagFilterModalVisible(false)}
      />
    </View>
  );
}

