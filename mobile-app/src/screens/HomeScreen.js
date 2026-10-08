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
import SettingsModal from '../components/SettingsModal';

// Danh sách ngôn ngữ dịch thuật cho Popup Upload File
const UPLOAD_LANG_OPTIONS = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語 (Nhật)', flag: '🇯🇵' },
  { code: 'ko', label: '한국어 (Hàn)', flag: '🇰🇷' },
  { code: 'zh', label: '中文 (Trung)', flag: '🇨🇳' },
  { code: 'fr', label: 'Français (Pháp)', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch (Đức)', flag: '🇩🇪' },
];

const getLangDisplayName = (code) => {
  const found = UPLOAD_LANG_OPTIONS.find((l) => l.code === code);
  return found ? `${found.flag} ${found.label}` : (code || '').toUpperCase();
};

// Dữ liệu mẫu bài giảng nếu chưa kết nối server
const SAMPLE_LECTURES = [
  {
    video_url: 'https://www.youtube.com/watch?v=sample1',
    title: 'Nhập môn Trí tuệ Nhân tạo - Học máy & Mạng nơ-ron',
    duration_seconds: 2710,
    language: 'vi',
    folder: 'Trí tuệ nhân tạo',
    tags: ['Học máy', 'Machine Learning', 'Mạng nơ-ron', 'F1-Score'],
    summary:
      'Bài học tập trung vào 3 giải thuật phân lớp cơ bản, giải thích ma trận nhầm lẫn (Confusion Matrix) và cách tính F1-Score khi dữ liệu bị mất cân bằng.',
    segments: [
      { id: 0, start: 0, end: 5, text: 'Chào mừng các em sinh viên đến với môn học Trí tuệ Nhân tạo.' },
      { id: 1, start: 5, end: 12, text: 'Trong bài giảng ngày hôm nay, chúng ta sẽ tìm hiểu về mô hình Học máy có giám sát.' },
      { id: 2, start: 12, end: 20, text: 'Học máy có giám sát là phương pháp huấn luyện mô hình dựa trên tập dữ liệu đã có nhãn sẵn.' },
      { id: 3, start: 20, end: 28, text: 'Ví dụ điển hình nhất là phân loại email rác (Spam) và không phải rác.' },
      { id: 4, start: 28, end: 38, text: 'Chúng ta sử dụng mạng nơ-ron nhân tạo nhiều tầng để trích xuất đặc trưng của dữ liệu.' },
      { id: 5, start: 38, end: 48, text: 'Khi đánh giá mô hình, chỉ số F1-Score thường được ưu tiên hơn Accuracy.' },
    ],
    key_points: [
      'Học máy có giám sát (Supervised Learning) với tập dữ liệu có nhãn.',
      'Ma trận nhầm lẫn: TP (True Positive), FP, TN, FN.',
      'Precision: Tỷ lệ dự đoán đúng trong số các mẫu được dự đoán là Positive.',
      'Recall: Tỷ lệ tìm thấy các mẫu Positive thực tế.',
      'F1-Score: Trung bình điều hòa giữa Precision và Recall.',
    ],
    formulas_and_terms: [
      'F1 = 2 * (Precision * Recall) / (Precision + Recall)',
      'ReLU(x) = max(0, x)',
      'Cross-Entropy Loss',
    ],
    quiz: [
      {
        question: 'Khi tập dữ liệu bị mất cân bằng trầm trọng (Imbalanced Data), chỉ số nào đánh giá khách quan hơn Accuracy?',
        options: ['A. Loss hàm mất mát', 'B. F1-Score', 'C. Số lượng Epoch', 'D. Learning Rate'],
        correct_answer: 'B',
        explanation: 'F1-Score là trung bình điều hòa của Precision và Recall, phản ánh chính xác hiệu quả dự đoán trên các lớp thiểu số.',
      },
      {
        question: 'Thuật toán nào sau đây thuộc nhóm Học máy có giám sát (Supervised Learning)?',
        options: ['A. K-Means Clustering', 'B. PCA', 'C. Support Vector Machine (SVM)', 'D. Autoencoder'],
        correct_answer: 'C',
        explanation: 'SVM là giải thuật phân loại và hồi quy có giám sát rất phổ biến.',
      },
    ],
    mindmap: {
      title: 'Nhập môn Trí tuệ Nhân tạo',
      children: [
        {
          title: 'Học máy có giám sát (Supervised Learning)',
          children: [
            { title: 'Tập dữ liệu huấn luyện có nhãn sẵn' },
            { title: 'Phân loại email Spam và dự báo giá nhà' },
          ],
        },
        {
          title: 'Đánh giá mô hình & Ma trận nhầm lẫn',
          children: [
            { title: 'Confusion Matrix: TP, FP, TN, FN' },
            { title: 'Chỉ số F1-Score khi dữ liệu Imbalanced' },
          ],
        },
        {
          title: 'Mạng nơ-ron nhân tạo (ANN)',
          children: [
            { title: 'Hàm kích hoạt phi tuyến ReLU' },
            { title: 'Hàm mất mát Cross-Entropy Loss' },
          ],
        },
      ],
    },
    exercises: [
      {
        question: 'Tại sao khi tập dữ liệu bị mất cân bằng (Imbalanced) lại không nên dùng Accuracy?',
        answer: 'Vì mô hình có thể dự đoán 100% về lớp chiếm đa số và đạt Accuracy rất cao nhưng hoàn toàn vô dụng trên lớp thiểu số quan trọng.',
        hint: 'Nghĩ về ví dụ bài toán phát hiện bệnh hiếm (chỉ 1% người mắc).',
      },
      {
        question: 'Công thức F1-Score được tính như thế nào từ Precision và Recall?',
        answer: 'F1 = 2 * (Precision * Recall) / (Precision + Recall), là trung bình điều hòa giữa Precision và Recall.',
        hint: 'Trung bình điều hòa của 2 chỉ số.',
      },
    ],
  },
  {
    video_url: 'https://www.youtube.com/watch?v=sample2',
    title: 'Kiến trúc Máy tính & Hệ điều hành - Tiến trình & Bộ nhớ ảo',
    duration_seconds: 3620,
    language: 'vi',
    folder: 'Hệ điều hành & Máy tính',
    tags: ['Hệ điều hành', 'Linux', 'Bộ nhớ ảo', 'Tiến trình'],
    summary:
      'Tổng quan về kiến trúc phân tầng bộ nhớ, cơ chế phân trang (Paging) và chuyển ngữ cảnh (Context Switch) giữa các Process trong Linux.',
    segments: [
      { id: 0, start: 0, end: 6, text: 'Hệ điều hành đóng vai trò là cầu nối trung gian giữa phần cứng máy tính và người dùng.' },
      { id: 1, start: 6, end: 15, text: 'Tiến trình (Process) là một chương trình đang trong quá trình thực thi.' },
      { id: 2, start: 15, end: 25, text: 'Bộ nhớ ảo (Virtual Memory) giúp giải quyết vấn đề phân mảnh và thiếu bộ nhớ RAM vật lý.' },
    ],
    key_points: [
      'Khái niệm Process và Thread.',
      'Bộ nhớ ảo và Bảng trang (Page Table).',
      'Giải thuật điều phối CPU: Round Robin, FCFS.',
    ],
    quiz: [
      {
        question: 'Hiện tượng Thrashing trong hệ điều hành xảy ra khi nào?',
        options: ['A. CPU bị quá nhiệt', 'B. Hệ thống dành hầu hết thời gian để tráo đổi trang (Page Swapping)', 'C. Tràn bộ đệm đĩa cứng', 'D. Đứt kết nối mạng'],
        correct_answer: 'B',
        explanation: 'Thrashing xảy ra khi tỷ lệ lỗi trang (Page Fault) quá cao, khiến OS liên tục nạp/xóa trang bộ nhớ.',
      },
    ],
    mindmap: {
      title: 'Kiến trúc Hệ điều hành',
      children: [
        {
          title: 'Tiến trình (Process) & Luồng (Thread)',
          children: [
            { title: 'Chuyển ngữ cảnh (Context Switch)' },
            { title: 'Không gian địa chỉ và luồng thực thi' },
          ],
        },
        {
          title: 'Bộ nhớ ảo & Phân trang',
          children: [
            { title: 'Bảng trang (Page Table)' },
            { title: 'Lỗi trang (Page Fault) và hiện tượng Thrashing' },
          ],
        },
      ],
    },
    exercises: [
      {
        question: 'Phân biệt sự khác nhau cơ bản giữa Process và Thread?',
        answer: 'Process sở hữu không gian địa chỉ bộ nhớ độc lập, trong khi các Thread trong cùng một Process chia sẻ chung không gian bộ nhớ đó.',
        hint: 'Liên quan đến việc chia sẻ bộ nhớ và chi phí tạo lập.',
      },
    ],
  },
];

// Hàm tự động gắn thẻ & phân loại thông minh cho bài giảng chưa có nhãn
function ensureAiClassification(lecture) {
  if (!lecture) return lecture;
  let folder = lecture.folder || lecture.full_data?.folder;
  let rawTags = lecture.tags || lecture.full_data?.tags;
  let tags = Array.isArray(rawTags) ? [...rawTags] : [];

  if (tags.length === 0) {
    const title = lecture.title || '';
    const summary = lecture.summary || '';
    const combined = (title + ' ' + summary).toLowerCase();
    const autoTags = [];

    if (combined.includes('trí tuệ nhân tạo') || combined.includes('ai') || combined.includes('machine learning') || combined.includes('học máy')) {
      autoTags.push('Trí tuệ nhân tạo', 'Machine Learning');
      if (!folder) folder = 'Trí tuệ nhân tạo';
    }
    if (combined.includes('python') || combined.includes('lập trình') || combined.includes('code') || combined.includes('javascript') || combined.includes('java')) {
      autoTags.push('Lập trình', 'Khoa học máy tính');
      if (!folder) folder = 'Lập trình & CNTT';
    }
    if (combined.includes('toán') || combined.includes('giải tích') || combined.includes('đại số') || combined.includes('xác suất')) {
      autoTags.push('Toán học', 'Khoa học cơ bản');
      if (!folder) folder = 'Toán học';
    }
    if (combined.includes('hệ điều hành') || combined.includes('máy tính') || combined.includes('mạng') || combined.includes('linux')) {
      autoTags.push('Hệ điều hành', 'Phần cứng & Mạng');
      if (!folder) folder = 'Hệ điều hành & Máy tính';
    }
    if (combined.includes('kinh tế') || combined.includes('tài chính') || combined.includes('quản trị')) {
      autoTags.push('Kinh tế', 'Quản trị');
      if (!folder) folder = 'Kinh tế & Quản trị';
    }
    if (autoTags.length === 0) {
      const words = title
        .split(/[\s,–—\-:]+/)
        .filter((w) => w.length > 3 && !['video', 'bài', 'giảng', 'nhập', 'môn', 'tổng', 'quan'].includes(w.toLowerCase()));
      if (words.length > 0) {
        autoTags.push(...words.slice(0, 3));
      } else {
        autoTags.push('Bài giảng', 'Video học tập');
      }
    }
    tags = autoTags;
  }

  if (!folder) {
    folder = tags[0] || 'Bài giảng chung';
  }

  return {
    ...lecture,
    folder,
    tags,
  };
}

// Giới hạn dung lượng file tối đa (Giai đoạn 1)
const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150 MB cho Video / Audio
const MAX_SUBTITLE_SIZE = 10 * 1024 * 1024; // 10 MB cho Phụ đề

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
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);


  // Cơ chế ngắt ngang tiến trình (Task Cancellation - Yêu cầu 1)
  const [activeJobId, setActiveJobId] = useState(null);
  const abortControllerRef = useRef(null);
  const uploadCancelTokenRef = useRef(null);

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
  }, []);

  const checkHealthAndFetchHistory = async () => {
    const status = await apiService.checkServerHealth();
    setServerStatus(status);

    try {
      const [history, favs, pMap] = await Promise.all([
        apiService.getLectureHistory(25),
        apiService.getFavorites(),
        apiService.getPlaybackProgressMap(),
      ]);

      if (history && history.length > 0) {
        setRecentLectures(history.map(ensureAiClassification));
      } else {
        setRecentLectures(SAMPLE_LECTURES.map(ensureAiClassification));
      }
      setFavorites(favs || []);
      setPlaybackMap(pMap || {});
    } catch (err) {
      console.warn('Lỗi tải dữ liệu lịch sử/favorites:', err);
      setRecentLectures(SAMPLE_LECTURES.map(ensureAiClassification));
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
      await apiService.exportLectureSRT(lecture);
      if (Platform.OS === 'web') {
        window.alert('Đã tải xuống file phụ đề .SRT thành công!');
      } else {
        Alert.alert('Thành công', 'Đã xuất file phụ đề .SRT.');
      }
    } catch (err) {
      Alert.alert('Lỗi xuất phụ đề', err.message);
    }
  };

  const handleQuickExportSummary = async (lecture) => {
    try {
      await apiService.exportLectureSummary(lecture);
      if (Platform.OS === 'web') {
        window.alert('Đã tải xuống bản tóm tắt bài giảng .TXT thành công!');
      } else {
        Alert.alert('Thành công', 'Đã xuất bản tóm tắt bài giảng.');
      }
    } catch (err) {
      Alert.alert('Lỗi xuất tóm tắt', err.message);
    }
  };

  // Helper đổi mm:ss hoặc hh:mm:ss sang giây (Yêu cầu 4)
  const parseTimeToSeconds = (str) => {
    if (!str || !str.trim()) return null;
    const parts = str.trim().split(':').map((p) => parseFloat(p));
    if (parts.some((p) => isNaN(p))) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return null;
  };

  // Helper đổi giây sang định dạng mm:ss hoặc hh:mm:ss
  const formatSecondsToTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
    const total = Math.floor(seconds);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cơ chế ngắt ngang tiến trình (Task Cancellation - Yêu cầu 1)
  const handleCancelProcessing = async () => {
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

    try {
      // 1. Nếu video từ 30 phút trở lên, không chọn cắt đoạn và chưa có trong Cache: Tự động kích hoạt song song
      if (isLong && !pendingUrlInfo.is_cached && !isRange) {
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

      setLoading(false);
      setActiveJobId(null);
      onNavigate('SyncPlayer', { lecture: result });
    } catch (err) {
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
        onOpenSettings={() => setSettingsModalVisible(true)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primaryLight} />
        }
      >
        {/* Khung Nhập Liên Kết Bài Giảng */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionHeader}>🔗 HỘP NHẬP LIÊN KẾT BÀI GIẢNG</Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.urlInput}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="Dán đường dẫn YouTube, Drive, LMS..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {videoUrl.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={() => setVideoUrl('')}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Chọn Ngôn ngữ Dịch */}
          <Text style={styles.subLabel}>Dịch phụ đề sang (Ngôn ngữ hiển thị):</Text>
          <View style={styles.langRow}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langChip,
                  targetLang === lang.code && styles.activeLangChip,
                ]}
                onPress={() => setTargetLang(lang.code)}
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
            {/* Nút duy nhất: Bắt đầu Tạo Phụ đề AI (Tự động nhận diện thời lượng <30p hoặc >=30p) */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, loading && styles.disabledBtn]}
              onPress={handleProcessVideo}
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

            {/* Nút Hủy Xử Lý nếu đang chạy (Cơ chế ngắt ngang - Yêu cầu 1) */}
            {loading && (
              <TouchableOpacity
                style={styles.cancelProcessingBtn}
                onPress={handleCancelProcessing}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelProcessingBtnText}>🛑 HỦY TIẾN TRÌNH (GIẢI PHÓNG CPU / RAM)</Text>
              </TouchableOpacity>
            )}

            {/* Nút 2: Ghép đôi Video + Phụ đề có sẵn (Giai đoạn 2) */}
            <TouchableOpacity
              style={[styles.pairBtn, loading && styles.disabledBtn]}
              onPress={handlePairVideoAndSubtitle}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.pairBtnText}>🔗 GHÉP ĐÔI VIDEO + PHỤ ĐỀ (SIÊU TỐC)</Text>
            </TouchableOpacity>

            {/* Nút 3: Upload File Nội bộ từ thiết bị */}
            <TouchableOpacity
              style={[styles.uploadBtn, loading && styles.disabledBtn]}
              onPress={handleUploadFile}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.uploadBtnText}>📁 UPLOAD FILE TỪ THIẾT BỊ (MP4 / MP3)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Khối Thống kê Tiến độ Học */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionHeader}>📊 THỐNG KÊ TIẾN ĐỘ HỌC TẬP</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalLectures}</Text>
              <Text style={styles.statLabel}>Bài giảng</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxAccent]}>
              <Text style={[styles.statNumber, styles.statNumberAccent]}>{totalMinutes}</Text>
              <Text style={styles.statLabel}>Phút học</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalQuizzes}</Text>
              <Text style={styles.statLabel}>Câu quiz</Text>
            </View>
          </View>
        </View>

        {/* Danh sách Bài giảng Gần đây */}
        <View style={styles.cardSection}>
          <View style={styles.recentHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionHeader}>📚 BÀI GIẢNG ĐÃ XỬ LÝ GẦN ĐÂY</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredAndSortedLectures.length}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleRefresh} style={styles.reloadBtn}>
              <Text style={styles.reloadText}>Làm mới ↻</Text>
            </TouchableOpacity>
          </View>

          {/* Thanh Tìm kiếm bài giảng tức thì */}
          <View style={styles.searchBarContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên bài giảng, tóm tắt, từ khóa..."
              placeholderTextColor={colors.textMuted}
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              clearButtonMode="while-editing"
            />
            {searchKeyword.trim() ? (
              <TouchableOpacity onPress={() => setSearchKeyword('')} style={styles.searchClearBtn}>
                <Text style={styles.searchClearText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Hàng bộ lọc danh mục (Filter Chips) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterChipScroll}
            contentContainerStyle={styles.filterChipContainer}
          >
            <TouchableOpacity
              style={[styles.filterChip, activeCategory === 'all' && styles.filterChipActive]}
              onPress={() => setActiveCategory('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeCategory === 'all' && styles.filterChipTextActive]}>
                Tất cả ({recentLectures.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeCategory === 'fav' && styles.filterChipActive]}
              onPress={() => setActiveCategory('fav')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeCategory === 'fav' && styles.filterChipTextActive]}>
                ⭐ Đã ghim ({favorites.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeCategory === 'en' && styles.filterChipActive]}
              onPress={() => setActiveCategory('en')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeCategory === 'en' && styles.filterChipTextActive]}>
                🇬🇧 Tiếng Anh
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeCategory === 'ja' && styles.filterChipActive]}
              onPress={() => setActiveCategory('ja')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeCategory === 'ja' && styles.filterChipTextActive]}>
                🇯🇵 Tiếng Nhật
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeCategory === 'upload' && styles.filterChipActive]}
              onPress={() => setActiveCategory('upload')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeCategory === 'upload' && styles.filterChipTextActive]}>
                📁 File máy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeCategory === 'youtube' && styles.filterChipActive]}
              onPress={() => setActiveCategory('youtube')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeCategory === 'youtube' && styles.filterChipTextActive]}>
                🔴 YouTube
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Thanh Bộ Lọc Thẻ Bài Giảng (Tag Filter Bar) */}
          <View style={styles.tagFilterBar}>
            <TouchableOpacity
              style={[
                styles.tagFilterBtn,
                selectedFilterTags.length > 0 && styles.tagFilterBtnActive,
              ]}
              onPress={handleOpenTagFilterModal}
              activeOpacity={0.8}
            >
              <Text style={styles.tagFilterBtnIcon}>🏷️</Text>
              <Text
                style={[
                  styles.tagFilterBtnText,
                  selectedFilterTags.length > 0 && styles.tagFilterBtnTextActive,
                ]}
              >
                {selectedFilterTags.length > 0
                  ? `Bộ lọc thẻ (${selectedFilterTags.length})`
                  : 'Bộ lọc thẻ'}
              </Text>
            </TouchableOpacity>

            {selectedFilterTags.length > 0 && (
              <TouchableOpacity
                style={styles.tagClearFilterBtn}
                onPress={handleClearTagFilter}
                activeOpacity={0.7}
              >
                <Text style={styles.tagClearFilterText}>✕ Hủy lọc</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dải hiển thị các thẻ đang được lọc */}
          {selectedFilterTags.length > 0 && (
            <View style={styles.activeTagsRow}>
              <Text style={styles.activeTagsLabel}>Đang lọc:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activeTagsScroll}
              >
                {selectedFilterTags.map((tag) => (
                  <View key={tag} style={styles.activeTagBadge}>
                    <Text style={styles.activeTagBadgeText}>#{tag}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setSelectedFilterTags((prev) =>
                          prev.filter((t) => t !== tag)
                        )
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.activeTagBadgeRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

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
            <View style={styles.emptyFilterBox}>
              <Text style={styles.emptyFilterIcon}>🔎</Text>
              <Text style={styles.emptyFilterTitle}>Không tìm thấy bài giảng phù hợp</Text>
              <Text style={styles.emptyFilterSub}>
                {searchKeyword.trim()
                  ? `Không có kết quả nào cho "${searchKeyword}". Thử từ khóa khác hoặc đặt lại bộ lọc.`
                  : 'Chưa có bài giảng nào trong danh mục này.'}
              </Text>
              {(searchKeyword.trim() || activeCategory !== 'all') && (
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setSearchKeyword('');
                    setActiveCategory('all');
                  }}
                >
                  <Text style={styles.resetFilterBtnText}>Đặt lại bộ lọc</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Popup Chọn Ngôn Ngữ Dịch Thuật Cho File Upload */}
      <Modal
        visible={uploadConfigModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.configModalBackdrop}>
          <View style={styles.configModalCard}>
            <View style={styles.configHeaderRow}>
              <View style={styles.configIconWrap}>
                <Text style={styles.configHeaderIcon}>🎯</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.configModalTitle}>TÙY CHỌN DỊCH THUẬT & TỔNG HỢP</Text>
                <Text style={styles.configModalSubtitle} numberOfLines={1}>
                  📁 {pendingUploadFile?.name} {pendingUploadFile?.size ? `(${pendingUploadFile.size})` : ''}
                </Text>
              </View>
            </View>

            <Text style={styles.configSectionTitle}>
              🌐 Bạn muốn dịch phụ đề sang ngôn ngữ nào?
            </Text>

            <View style={styles.langGrid}>
              {UPLOAD_LANG_OPTIONS.map((item) => {
                const isSelected = uploadTargetLang === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.langOptionBtn, isSelected && styles.langOptionBtnSelected]}
                    onPress={() => setUploadTargetLang(item.code)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.langOptionFlag}>{item.flag}</Text>
                    <Text style={[styles.langOptionText, isSelected && styles.langOptionTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <Text style={styles.langOptionCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tùy chọn trắc nghiệm ôn tập AI */}
            <View style={styles.quizOptionRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.quizOptionTitle}>🧠 Tạo câu hỏi trắc nghiệm tự luyện (Quiz)</Text>
                <Text style={styles.quizOptionDesc}>Tự động tạo bộ câu hỏi kiểm tra sau khi dịch xong</Text>
              </View>
              <Switch
                value={uploadIncludeQuiz}
                onValueChange={setUploadIncludeQuiz}
                trackColor={{ false: '#334155', true: colors.primary }}
                thumbColor={uploadIncludeQuiz ? '#ffffff' : '#94a3b8'}
              />
            </View>

            {/* Tùy chọn Cắt mốc thời gian video upload (Yêu cầu 4) */}
            <View style={styles.uploadOptionCard}>
              <TouchableOpacity
                style={styles.advancedOptionHeader}
                onPress={() => setUploadEnableTimeRange(!uploadEnableTimeRange)}
                activeOpacity={0.8}
              >
                <View style={styles.advancedOptionLeft}>
                  <Text style={styles.advancedOptionIcon}>✂️</Text>
                  <View>
                    <Text style={styles.advancedOptionTitle}>Cắt khoảng thời gian bài giảng</Text>
                    <Text style={styles.advancedOptionSub}>Chỉ dịch đoạn bạn chọn (VD: 00:30 đến 05:00)</Text>
                  </View>
                </View>
                <Switch
                  value={uploadEnableTimeRange}
                  onValueChange={setUploadEnableTimeRange}
                  trackColor={{ false: '#334155', true: '#0284c7' }}
                  thumbColor={uploadEnableTimeRange ? '#38bdf8' : '#94a3b8'}
                />
              </TouchableOpacity>

              {uploadEnableTimeRange && (
                <View style={styles.timeRangeInputsRow}>
                  <View style={styles.timeRangeField}>
                    <Text style={styles.timeRangeLabel}>Bắt đầu từ (mm:ss):</Text>
                    <TextInput
                      style={styles.timeRangeInput}
                      value={uploadTimeRangeStart}
                      onChangeText={setUploadTimeRangeStart}
                      placeholder="00:00"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                  <Text style={styles.timeRangeArrow}>➔</Text>
                  <View style={styles.timeRangeField}>
                    <Text style={styles.timeRangeLabel}>Đến phút (mm:ss):</Text>
                    <TextInput
                      style={styles.timeRangeInput}
                      value={uploadTimeRangeEnd}
                      onChangeText={setUploadTimeRangeEnd}
                      placeholder="Hết file"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Hàng nút bấm */}
            <View style={styles.configActionRow}>
              <TouchableOpacity
                style={styles.configCancelBtn}
                onPress={() => {
                  setUploadConfigModalVisible(false);
                  setPendingUploadFile(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.configCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.configSubmitBtn}
                onPress={handleConfirmUpload}
                activeOpacity={0.8}
              >
                <Text style={styles.configSubmitText}>🚀 BẮT ĐẦU XỬ LÝ & DỊCH</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Thanh tiến trình Upload & Dịch thuật Đa bước (Multi-stage AI Progress) */}
      <Modal
        visible={uploadProgress !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.progressModalBackdrop}>
          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <View style={styles.progressIconWrap}>
                <Text style={styles.progressIcon}>
                  {aiProcessingStage === 'uploading'
                    ? '📤'
                    : aiProcessingStage === 'whisper'
                    ? '🎙️'
                    : aiProcessingStage === 'translating'
                    ? '🌐'
                    : aiProcessingStage === 'summarizing'
                    ? '🧠'
                    : '🎉'}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.progressTitle}>
                  {aiProcessingStage === 'uploading'
                    ? 'BƯỚC 1/4 • ĐANG TẢI LÊN MÁY CHỦ'
                    : aiProcessingStage === 'whisper'
                    ? 'BƯỚC 2/4 • WHISPER BÓC TÁCH GIỌNG NÓI'
                    : aiProcessingStage === 'translating'
                    ? `BƯỚC 3/4 • DỊCH THUẬT SANG ${getLangDisplayName(uploadTargetLang).toUpperCase()}`
                    : aiProcessingStage === 'summarizing'
                    ? 'BƯỚC 4/4 • TỔNG HỢP TÓM TẮT & TẠO QUIZ'
                    : 'HOÀN TẤT XỬ LÝ BÀI GIẢNG!'}
                </Text>
                <Text style={styles.progressFileName} numberOfLines={1}>
                  {uploadDetails.name || 'Bài giảng'} {uploadDetails.size ? `(${uploadDetails.size})` : ''}
                </Text>
              </View>
              <Text style={styles.progressPercentText}>{aiStageProgress}%</Text>
            </View>

            {/* Thanh tiến trình Progress Bar Animation */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(6, aiStageProgress)}%` },
                  aiStageProgress >= 100 && styles.progressBarFillDone,
                ]}
              />
            </View>

            {/* Checklist 4 Giai đoạn xử lý & dịch thuật */}
            <View style={styles.stageChecklist}>
              {/* Bước 1: Upload */}
              <View style={styles.stageCheckItem}>
                <Text style={styles.stageCheckIcon}>
                  {uploadProgress >= 100 ? '✅' : '⏳'}
                </Text>
                <Text style={[styles.stageCheckText, uploadProgress >= 100 && styles.stageCheckTextDone]}>
                  1. Tải file lên máy chủ ({uploadProgress}%)
                </Text>
              </View>

              {/* Bước 2: Whisper AI */}
              <View style={styles.stageCheckItem}>
                <Text style={styles.stageCheckIcon}>
                  {['translating', 'summarizing', 'done'].includes(aiProcessingStage)
                    ? '✅'
                    : aiProcessingStage === 'whisper'
                    ? '⏳'
                    : '⚪'}
                </Text>
                <Text
                  style={[
                    styles.stageCheckText,
                    ['translating', 'summarizing', 'done'].includes(aiProcessingStage) && styles.stageCheckTextDone,
                    aiProcessingStage === 'whisper' && styles.stageCheckTextActive,
                  ]}
                >
                  2. Nhận diện giọng nói (ASR) & timestamps
                </Text>
              </View>

              {/* Bước 3: Dịch thuật */}
              <View style={styles.stageCheckItem}>
                <Text style={styles.stageCheckIcon}>
                  {['summarizing', 'done'].includes(aiProcessingStage)
                    ? '✅'
                    : aiProcessingStage === 'translating'
                    ? '⏳'
                    : '⚪'}
                </Text>
                <Text
                  style={[
                    styles.stageCheckText,
                    ['summarizing', 'done'].includes(aiProcessingStage) && styles.stageCheckTextDone,
                    aiProcessingStage === 'translating' && styles.stageCheckTextActive,
                  ]}
                >
                  3. Dịch thuật song ngữ ({getLangDisplayName(uploadTargetLang)})
                </Text>
              </View>

              {/* Bước 4: Tóm tắt & Quiz */}
              <View style={styles.stageCheckItem}>
                <Text style={styles.stageCheckIcon}>
                  {aiProcessingStage === 'done'
                    ? '✅'
                    : aiProcessingStage === 'summarizing'
                    ? '⏳'
                    : '⚪'}
                </Text>
                <Text
                  style={[
                    styles.stageCheckText,
                    aiProcessingStage === 'done' && styles.stageCheckTextDone,
                    aiProcessingStage === 'summarizing' && styles.stageCheckTextActive,
                  ]}
                >
                  4. Tổng hợp nội dung bài giảng & biên soạn Quiz
                </Text>
              </View>
            </View>

            {/* Nút Hủy Ngang Tiến Trình Upload & AI (Cơ chế ngắt ngang - Yêu cầu 1) */}
            <TouchableOpacity
              style={styles.cancelProgressModalBtn}
              onPress={handleCancelProcessing}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelProgressModalBtnText}>🛑 HỦY TIẾN TRÌNH ĐANG CHẠY (GIẢI PHÓNG BỘ NHỚ)</Text>
            </TouchableOpacity>

            <View style={styles.progressLimitBadge}>
              <Text style={styles.progressLimitText}>
                🎬 Sau khi hoàn tất, bạn có thể xuất video kèm phụ đề (MP4) ngay trong trình phát!
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cấu Hình Tạo Phụ Đề Cho URL Video */}
      <Modal
        visible={urlConfigModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUrlConfigModalVisible(false)}
      >
        <View style={styles.configModalBackdrop}>
          <View style={styles.urlConfigModalCard}>
            {/* Header Modal */}
            <View style={styles.configHeaderRow}>
              <View style={styles.configIconWrap}>
                <Text style={styles.configHeaderIcon}>🎬</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.configModalTitle}>CẤU HÌNH TẠO PHỤ ĐỀ</Text>
                <Text style={styles.configModalSubtitle} numberOfLines={1}>
                  {pendingUrlInfo?.title || 'Bài giảng YouTube'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.tagFilterCloseIconBtn}
                onPress={() => setUrlConfigModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.tagFilterCloseIconText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Thông tin thời lượng video */}
            <View style={styles.urlDurationBadge}>
              <Text style={styles.urlDurationText}>
                ⏱️ Tổng thời lượng: {formatSecondsToTime(pendingUrlInfo?.duration_seconds || 0)}
              </Text>
            </View>

            {/* Phần 1: Chọn Phạm vi dịch thuật */}
            <View style={styles.urlSectionBox}>
              <Text style={styles.urlSectionTitle}>1. Bạn muốn dịch toàn bộ hay một đoạn?</Text>

              {/* Lựa chọn A: Toàn bộ video */}
              <TouchableOpacity
                style={[
                  styles.urlRadioOption,
                  urlProcessMode === 'all' && styles.urlRadioOptionActive,
                ]}
                onPress={() => setUrlProcessMode('all')}
                activeOpacity={0.8}
              >
                <View style={styles.urlRadioCircle}>
                  {urlProcessMode === 'all' && <View style={styles.urlRadioInnerCircle} />}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.urlRadioLabel}>Dịch toàn bộ video</Text>
                  <Text style={styles.urlRadioDesc}>
                    Xử lý toàn bộ từ 00:00 đến {formatSecondsToTime(pendingUrlInfo?.duration_seconds || 0)}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Lựa chọn B: Dịch 1 đoạn */}
              <TouchableOpacity
                style={[
                  styles.urlRadioOption,
                  urlProcessMode === 'range' && styles.urlRadioOptionActive,
                  { marginTop: 8 },
                ]}
                onPress={() => setUrlProcessMode('range')}
                activeOpacity={0.8}
              >
                <View style={styles.urlRadioCircle}>
                  {urlProcessMode === 'range' && <View style={styles.urlRadioInnerCircle} />}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.urlRadioLabel}>Dịch trong một đoạn thời gian</Text>
                  <Text style={styles.urlRadioDesc}>
                    Chỉ bóc tách và dịch đoạn quan trọng bạn chỉ định
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Nếu chọn Dịch 1 đoạn: Hiển thị bộ chọn thời gian dựa theo thời lượng video */}
              {urlProcessMode === 'range' && (
                <View style={styles.urlRangePickerCard}>
                  <Text style={styles.urlRangePickerLabel}>
                    Chọn khoảng thời gian (dựa theo thời lượng tối đa {formatSecondsToTime(pendingUrlInfo?.duration_seconds || 0)}):
                  </Text>
                  <View style={styles.timeRangeInputsRow}>
                    <View style={styles.timeRangeField}>
                      <Text style={styles.timeRangeLabel}>Bắt đầu từ (mm:ss):</Text>
                      <TextInput
                        style={styles.timeRangeInput}
                        value={urlRangeStart}
                        onChangeText={setUrlRangeStart}
                        placeholder="00:00"
                        placeholderTextColor="#64748b"
                      />
                    </View>
                    <Text style={styles.timeRangeArrow}>➔</Text>
                    <View style={styles.timeRangeField}>
                      <Text style={styles.timeRangeLabel}>Đến phút (mm:ss):</Text>
                      <TextInput
                        style={styles.timeRangeInput}
                        value={urlRangeEnd}
                        onChangeText={setUrlRangeEnd}
                        placeholder={formatSecondsToTime(pendingUrlInfo?.duration_seconds || 0)}
                        placeholderTextColor="#64748b"
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Phần 2: Có muốn tạo câu hỏi trắc nghiệm hay không */}
            <View style={[styles.urlSectionBox, { marginTop: 12 }]}>
              <Text style={styles.urlSectionTitle}>2. Tạo câu hỏi trắc nghiệm ôn tập (Quiz)?</Text>
              <TouchableOpacity
                style={[styles.quizToggleBoxModal, urlIncludeQuiz && styles.quizToggleBoxModalActive]}
                onPress={() => setUrlIncludeQuiz(!urlIncludeQuiz)}
                activeOpacity={0.8}
              >
                <View style={styles.quizToggleLeft}>
                  <Text style={styles.quizToggleIcon}>{urlIncludeQuiz ? '🎯' : '⚡'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quizToggleTitle}>
                      {urlIncludeQuiz ? 'Bật tạo câu hỏi trắc nghiệm ôn tập' : 'Bỏ qua trắc nghiệm (Xử lý siêu tốc)'}
                    </Text>
                    <Text style={styles.quizToggleDesc}>
                      {urlIncludeQuiz
                        ? 'AI tự động biên soạn câu hỏi 4 lựa chọn củng cố kiến thức'
                        : 'Chỉ bóc tách phụ đề & tóm tắt, tiết kiệm thời gian'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={urlIncludeQuiz}
                  onValueChange={setUrlIncludeQuiz}
                  trackColor={{ false: '#334155', true: '#4338ca' }}
                  thumbColor={urlIncludeQuiz ? '#818cf8' : '#94a3b8'}
                />
              </TouchableOpacity>
            </View>

            {/* Hàng nút bấm */}
            <View style={[styles.configActionRow, { marginTop: spacing.md }]}>
              <TouchableOpacity
                style={styles.configCancelBtn}
                onPress={() => setUrlConfigModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.configCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.configSubmitBtn}
                onPress={handleConfirmUrlProcess}
                activeOpacity={0.8}
              >
                <Text style={styles.configSubmitText}>🚀 BẮT ĐẦU TẠO PHỤ ĐỀ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Bộ Lọc Thẻ Bài Giảng (Multi-Select Tag Filter Modal) */}
      <Modal
        visible={tagFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTagFilterModalVisible(false)}
      >
        <View style={styles.configModalBackdrop}>
          <View style={styles.tagFilterModalCard}>
            {/* Header Modal */}
            <View style={styles.tagFilterHeaderRow}>
              <View style={styles.tagFilterHeaderLeft}>
                <View style={styles.tagFilterIconWrap}>
                  <Text style={styles.tagFilterHeaderIcon}>🏷️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tagFilterModalTitle}>BỘ LỌC THẺ BÀI GIẢNG</Text>
                  <Text style={styles.tagFilterModalSubtitle}>
                    Chọn một hoặc nhiều thẻ để lọc video
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.tagFilterCloseIconBtn}
                onPress={() => setTagFilterModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.tagFilterCloseIconText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Action: Chọn tất cả / Bỏ chọn */}
            {availableTags.length > 0 && (
              <View style={styles.tagFilterQuickBar}>
                <Text style={styles.tagFilterCountText}>
                  {tempSelectedTags.length > 0
                    ? `Đã chọn: ${tempSelectedTags.length}/${availableTags.length} thẻ`
                    : `Tổng cộng ${availableTags.length} thẻ khả dụng`}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={handleSelectAllTags}>
                    <Text style={styles.tagFilterQuickLink}>Chọn tất cả</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeselectAllTags}>
                    <Text style={styles.tagFilterQuickLink}>Bỏ chọn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Body: Danh sách Thẻ dạng Chips */}
            <ScrollView
              style={styles.tagFilterModalBody}
              contentContainerStyle={styles.tagFilterChipsWrap}
              showsVerticalScrollIndicator={false}
            >
              {availableTags.length === 0 ? (
                <View style={styles.emptyTagBox}>
                  <Text style={styles.emptyTagIcon}>🏷️</Text>
                  <Text style={styles.emptyTagTitle}>Chưa có thẻ bài giảng nào</Text>
                  <Text style={styles.emptyTagSub}>
                    Sau khi dịch hoặc xử lý bài giảng, AI sẽ tự động phân tích và gắn các thẻ tương ứng tại đây.
                  </Text>
                </View>
              ) : (
                availableTags.map((tag) => {
                  const isSelected = tempSelectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagModalChip,
                        isSelected && styles.tagModalChipSelected,
                      ]}
                      onPress={() => handleToggleTag(tag)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.tagModalChipText,
                          isSelected && styles.tagModalChipTextSelected,
                        ]}
                      >
                        {isSelected ? '✓ ' : ''}#{tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Footer Buttons: Hủy bộ lọc, Áp dụng lọc */}
            <View style={styles.tagFilterModalFooter}>
              <TouchableOpacity
                style={styles.tagFilterResetBtn}
                onPress={handleClearTagFilter}
                activeOpacity={0.7}
              >
                <Text style={styles.tagFilterResetBtnText}>✕ HỦY BỘ LỌC</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tagFilterApplyBtn}
                onPress={handleApplyTagFilter}
                activeOpacity={0.8}
              >
                <Text style={styles.tagFilterApplyBtnText}>
                  🔍 ÁP DỤNG LỌC {tempSelectedTags.length > 0 ? `(${tempSelectedTags.length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onSaved={checkHealthAndFetchHistory}
        onClearedHistory={checkHealthAndFetchHistory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
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
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  reloadText: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: '600',
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
  subtitleUploadBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  subtitleUploadBtnText: {
    color: '#4ADE80',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionButtonGroup: {
    gap: 2,
  },
  streamBtn: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#ec4899',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  streamBtnText: {
    color: '#f472b6',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statBoxAccent: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statNumberAccent: {
    color: colors.primaryLight,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  quizToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  quizToggleBoxActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  quizToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: spacing.sm,
  },
  quizToggleIcon: {
    fontSize: 20,
  },
  quizToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quizToggleDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: colors.primaryLight,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#94a3b8',
  },
  switchThumbActive: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-end',
  },

  // Styles Modal Cấu hình Dịch thuật File Upload
  configModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  configModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  configHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  configIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  configHeaderIcon: {
    fontSize: 22,
  },
  configModalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  configModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  configSectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  langOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    gap: 6,
  },
  langOptionBtnSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primaryLight,
  },
  langOptionFlag: {
    fontSize: 14,
  },
  langOptionText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  langOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  langOptionCheck: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 2,
  },
  quizOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    padding: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    marginBottom: spacing.lg,
  },
  quizOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quizOptionDesc: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  configActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  configCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configCancelText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  configSubmitBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  configSubmitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Styles Checklist 4 bước xử lý
  stageChecklist: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: borderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    gap: 6,
    marginBottom: spacing.xs,
  },
  stageCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageCheckIcon: {
    fontSize: 13,
    width: 20,
    textAlign: 'center',
  },
  stageCheckText: {
    fontSize: 11.5,
    color: colors.textMuted,
    flex: 1,
  },
  stageCheckTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  stageCheckTextDone: {
    color: '#94a3b8',
  },

  progressModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  progressCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    padding: spacing.lg,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  progressIcon: {
    fontSize: 22,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  progressFileName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressPercentText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.accent,
    marginLeft: spacing.sm,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 6,
  },
  progressBarFillDone: {
    backgroundColor: '#10b981',
  },
  progressStatusRow: {
    marginBottom: spacing.sm,
  },
  progressStatusText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
    fontWeight: '500',
  },
  progressLimitBadge: {
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    alignItems: 'center',
  },
  progressLimitText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  countBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
  },
  countBadgeText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  reloadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    height: 40,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
    color: colors.textMuted,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12.5,
    padding: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipScroll: {
    marginBottom: spacing.sm + 2,
  },
  filterChipContainer: {
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyFilterBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  emptyFilterIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyFilterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyFilterSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
    marginBottom: 12,
  },
  resetFilterBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  resetFilterBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  advancedOptionCard: {
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: spacing.sm,
  },
  advancedOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advancedOptionHeaderStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  advancedOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  advancedOptionIcon: {
    fontSize: 18,
  },
  advancedOptionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#f8fafc',
  },
  advancedOptionSub: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 1,
  },
  timeRangeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  timeRangeField: {
    flex: 1,
  },
  timeRangeLabel: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginBottom: 3,
  },
  timeRangeInput: {
    backgroundColor: '#1e293b',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#475569',
    color: '#f8fafc',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: 'center',
    fontWeight: '700',
  },
  timeRangeArrow: {
    fontSize: 14,
    color: '#38bdf8',
    marginHorizontal: 8,
    fontWeight: '700',
  },
  metaInputGroup: {
    marginTop: spacing.xs,
  },
  metaInputField: {
    marginTop: 6,
  },
  metaInputLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 3,
  },
  metaTextInput: {
    backgroundColor: '#1e293b',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#475569',
    color: '#f8fafc',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaTextInputModal: {
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#475569',
    color: '#f8fafc',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
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
  cancelProgressModalBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cancelProgressModalBtnText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '800',
  },
  uploadOptionCard: {
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: spacing.sm,
  },
  // Tag Filter UI Styles
  tagFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
    marginTop: 2,
  },
  tagFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#475569',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tagFilterBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: '#818cf8',
  },
  tagFilterBtnIcon: {
    fontSize: 16,
  },
  tagFilterBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  tagFilterBtnTextActive: {
    color: '#c7d2fe',
    fontWeight: '800',
  },
  tagClearFilterBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  tagClearFilterText: {
    color: '#f87171',
    fontSize: 12.5,
    fontWeight: '700',
  },
  activeTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: 6,
  },
  activeTagsLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  activeTagsScroll: {
    gap: 6,
    alignItems: 'center',
  },
  activeTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#312e81',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    gap: 5,
  },
  activeTagBadgeText: {
    color: '#e0e7ff',
    fontSize: 11,
    fontWeight: '600',
  },
  activeTagBadgeRemove: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 2,
  },

  // Modal Tag Filter Styles
  tagFilterModalCard: {
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#334155',
    padding: spacing.md,
    width: '92%',
    maxWidth: 420,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  tagFilterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tagFilterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  tagFilterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagFilterHeaderIcon: {
    fontSize: 18,
  },
  tagFilterModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  tagFilterModalSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  tagFilterCloseIconBtn: {
    padding: 4,
  },
  tagFilterCloseIconText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '700',
  },
  tagFilterQuickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tagFilterCountText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tagFilterQuickLink: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '700',
  },
  tagFilterModalBody: {
    maxHeight: 280,
    marginVertical: spacing.sm,
  },
  tagFilterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  tagModalChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagModalChipSelected: {
    backgroundColor: '#4338ca',
    borderColor: '#818cf8',
  },
  tagModalChipText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tagModalChipTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  emptyTagBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyTagIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTagTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  emptyTagSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
  tagFilterModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  tagFilterResetBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagFilterResetBtnText: {
    color: '#f87171',
    fontSize: 11.5,
    fontWeight: '700',
  },
  tagFilterApplyBtn: {
    flex: 1.3,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagFilterApplyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  // UrlConfigModal Styles
  urlConfigModalCard: {
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#334155',
    padding: spacing.md,
    width: '92%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  urlDurationBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.35)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    alignItems: 'center',
  },
  urlDurationText: {
    color: '#38bdf8',
    fontSize: 12.5,
    fontWeight: '700',
  },
  urlSectionBox: {
    marginTop: 8,
  },
  urlSectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  urlRadioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 10,
  },
  urlRadioOptionActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  urlRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlRadioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366f1',
  },
  urlRadioLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  urlRadioDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  urlRangePickerCard: {
    backgroundColor: '#0b1120',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 10,
    marginTop: 8,
  },
  urlRangePickerLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
    lineHeight: 15,
  },
  quizToggleBoxModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 10,
  },
  quizToggleBoxModalActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
});
