import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { colors, spacing, borderRadius } from '../constants/theme';
import { SUPPORTED_LANGUAGES } from '../constants/config';
import { apiService } from '../services/api';
import Header from '../components/Header';
import LectureCard from '../components/LectureCard';
import SettingsModal from '../components/SettingsModal';

// Dữ liệu mẫu bài giảng nếu chưa kết nối server
const SAMPLE_LECTURES = [
  {
    video_url: 'https://www.youtube.com/watch?v=sample1',
    title: 'Nhập môn Trí tuệ Nhân tạo - Học máy & Mạng nơ-ron',
    duration_seconds: 2710,
    language: 'vi',
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

// Giới hạn dung lượng file tối đa (Giai đoạn 1)
const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150 MB cho Video / Audio
const MAX_SUBTITLE_SIZE = 10 * 1024 * 1024; // 10 MB cho Phụ đề

export default function HomeScreen({ onNavigate }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [targetLang, setTargetLang] = useState('vi');
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null); // null hoặc 0-100
  const [uploadDetails, setUploadDetails] = useState({ name: '', size: '' });
  const [recentLectures, setRecentLectures] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [serverStatus, setServerStatus] = useState({ online: false });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  useEffect(() => {
    checkHealthAndFetchHistory();
  }, []);

  const checkHealthAndFetchHistory = async () => {
    const status = await apiService.checkServerHealth();
    setServerStatus(status);

    const history = await apiService.getLectureHistory(10);
    if (history && history.length > 0) {
      setRecentLectures(history);
    } else {
      setRecentLectures(SAMPLE_LECTURES);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkHealthAndFetchHistory();
    setRefreshing(false);
  };

  const handleProcessVideo = async () => {
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      Alert.alert('Chưa nhập URL', 'Vui lòng dán liên kết video YouTube hoặc liên kết bài giảng hợp lệ.');
      return;
    }

    setLoading(true);
    setLoadingStep('Đang kết nối Backend AI...');

    try {
      setLoadingStep('Kiểm tra bộ đệm Cache & Tải Audio...');
      const result = await apiService.processVideo(trimmed, targetLang, 'auto', null, includeQuiz);
      setLoading(false);
      // Chuyển sang màn hình Sync Player với kết quả
      onNavigate('SyncPlayer', { lecture: result });
    } catch (err) {
      setLoading(false);
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
    // Nếu là item từ server chỉ có metadata, hoặc item đầy đủ
    if (lecture.full_data) {
      onNavigate('SyncPlayer', { lecture: lecture.full_data });
    } else if (lecture.segments && lecture.segments.length > 0) {
      onNavigate('SyncPlayer', { lecture });
    } else {
      // Gọi API tải dữ liệu chi tiết
      setLoading(true);
      setLoadingStep('Đang tải bài giảng từ Cloud Cache...');
      apiService
        .processVideo(lecture.video_url, lecture.language || 'vi')
        .then((fullData) => {
          setLoading(false);
          onNavigate('SyncPlayer', { lecture: fullData });
        })
        .catch(() => {
          setLoading(false);
          // Fallback dùng sample
          onNavigate('SyncPlayer', { lecture: SAMPLE_LECTURES[0] });
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

  // Upload file video/audio từ thiết bị (Tương thích 100% cả Web máy tính lẫn Điện thoại)
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

        input.onchange = async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          // 1. Kiểm tra dung lượng file Video/Audio (Tối đa 150MB)
          if (file.size > MAX_VIDEO_SIZE) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            Alert.alert(
              'File vượt quá giới hạn',
              `Dung lượng file (${sizeMb} MB) vượt quá giới hạn cho phép (150 MB).\nVui lòng chọn video/audio ngắn hơn hoặc nén lại trước khi tải.`
            );
            input.value = '';
            return;
          }

          // Tạo URL phát trực tiếp từ bộ nhớ trình duyệt cho video/audio
          let localMediaUrl = null;
          try {
            if (typeof URL !== 'undefined' && URL.createObjectURL) {
              localMediaUrl = URL.createObjectURL(file);
            }
          } catch (_) {}

          const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
          setUploadDetails({ name: file.name, size: sizeStr });
          setUploadProgress(0);

          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('target_language', targetLang);
            formData.append('include_quiz', includeQuiz ? 'true' : 'false');

            const data = await apiService.uploadWithProgress(
              '/api/video/upload',
              formData,
              (percent) => {
                setUploadProgress(percent);
              }
            );

            if (localMediaUrl) {
              data.media_stream_url = localMediaUrl;
              data.media_mime_type = file.type || '';
            }
            setUploadProgress(null);
            await apiService.saveLectureToLocal(data);
            await checkHealthAndFetchHistory();
            onNavigate('SyncPlayer', { lecture: data });
          } catch (uploadErr) {
            setUploadProgress(null);
            Alert.alert('Không thể xử lý file', uploadErr.message);
          } finally {
            input.value = '';
          }
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

          // 1. Kiểm tra dung lượng file Video/Audio (Tối đa 150MB)
          if (file.size && file.size > MAX_VIDEO_SIZE) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            Alert.alert(
              'File vượt quá giới hạn',
              `Dung lượng file (${sizeMb} MB) vượt quá giới hạn cho phép (150 MB).\nVui lòng chọn video/audio ngắn hơn hoặc nén lại trước khi tải.`
            );
            return;
          }

          const sizeStr = file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '';
          setUploadDetails({ name: file.name || 'uploaded_lecture.mp4', size: sizeStr });
          setUploadProgress(0);

          const formData = new FormData();
          formData.append('file', {
            uri: file.uri,
            name: file.name || 'uploaded_lecture.mp4',
            type: file.mimeType || 'video/mp4',
          });
          formData.append('target_language', targetLang);
          formData.append('include_quiz', includeQuiz ? 'true' : 'false');

          const data = await apiService.uploadWithProgress(
            '/api/video/upload',
            formData,
            (percent) => {
              setUploadProgress(percent);
            }
          );

          setUploadProgress(null);
          await apiService.saveLectureToLocal(data);
          await checkHealthAndFetchHistory();
          onNavigate('SyncPlayer', { lecture: data });
        } catch (err) {
          setUploadProgress(null);
          Alert.alert('Lỗi tải file', err.message);
        }
      })();
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
        'Vui lòng dán liên kết video YouTube hoặc bài giảng để phát ngay tức thì và để AI tự động xử lý song song ngầm.'
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
        title="PHỤ ĐỀ BÀI GIẢNG AI"
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

          {/* Tùy chọn Bật/Tắt Quiz */}
          <TouchableOpacity
            style={[styles.quizToggleBox, includeQuiz && styles.quizToggleBoxActive]}
            onPress={() => setIncludeQuiz(!includeQuiz)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={styles.quizToggleLeft}>
              <Text style={styles.quizToggleIcon}>{includeQuiz ? '🎯' : '⚡'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.quizToggleTitle}>
                  {includeQuiz ? 'Tạo câu hỏi trắc nghiệm ôn tập (Quiz)' : 'Bỏ qua trắc nghiệm (Chế độ siêu tốc)'}
                </Text>
                <Text style={styles.quizToggleDesc}>
                  {includeQuiz ? 'AI tự động tạo bộ trắc nghiệm 4 lựa chọn có giải thích' : 'Chỉ bóc tách phụ đề & tóm tắt, tiết kiệm thời gian xử lý'}
                </Text>
              </View>
            </View>
            <View style={[styles.switchTrack, includeQuiz && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, includeQuiz && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>

          {/* Nhóm các nút hành động xử lý bài giảng */}
          <View style={styles.actionButtonGroup}>
            {/* Nút 1: Bắt đầu Tạo Phụ đề Tiêu chuẩn */}
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
                <Text style={styles.primaryActionBtnText}>⚡ BẮT ĐẦU TẠO PHỤ ĐỀ & TÓM TẮT (TIÊU CHUẨN)</Text>
              )}
            </TouchableOpacity>

            {/* Nút 2: Xem ngay & Xử lý song song ngầm cho video dài (Giai đoạn 3) */}
            <TouchableOpacity
              style={[styles.streamBtn, loading && styles.disabledBtn]}
              onPress={handleStreamVideo}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.streamBtnText}>🚀 XEM NGAY & XỬ LÝ SONG SONG (VIDEO DÀI)</Text>
            </TouchableOpacity>

            {/* Nút 3: Ghép đôi Video + Phụ đề có sẵn (Giai đoạn 2) */}
            <TouchableOpacity
              style={[styles.pairBtn, loading && styles.disabledBtn]}
              onPress={handlePairVideoAndSubtitle}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.pairBtnText}>🔗 GHÉP ĐÔI VIDEO + PHỤ ĐỀ (SIÊU TỐC)</Text>
            </TouchableOpacity>

            {/* Nút 4: Upload File Nội bộ từ thiết bị */}
            <TouchableOpacity
              style={[styles.uploadBtn, loading && styles.disabledBtn]}
              onPress={handleUploadFile}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.uploadBtnText}>📁 UPLOAD FILE TỪ THIẾT BỊ (MP4 / MP3)</Text>
            </TouchableOpacity>

            {/* Nút 5: Nạp phụ đề độc lập */}
            <TouchableOpacity
              style={[styles.subtitleUploadBtn, loading && styles.disabledBtn]}
              onPress={handleUploadSubtitle}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.subtitleUploadBtnText}>📄 NẠP PHỤ ĐỀ CÓ SẴN (SRT / VTT)</Text>
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
            <Text style={styles.sectionHeader}>📚 BÀI GIẢNG ĐÃ XỬ LÝ GẦN ĐÂY</Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={styles.reloadText}>Làm mới ↻</Text>
            </TouchableOpacity>
          </View>

          {recentLectures.map((lecture, idx) => (
            <LectureCard
              key={`${lecture.video_url}_${idx}`}
              lecture={lecture}
              onPress={handleSelectLecture}
              onDelete={handleDeleteLecture}
            />
          ))}
        </View>
      </ScrollView>

      {/* Modal Thanh tiến trình Upload (Progress Bar Animation) */}
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
                  {uploadProgress !== null && uploadProgress < 100 ? '🚀' : '🧠'}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.progressTitle}>
                  {uploadProgress !== null && uploadProgress < 100 ? 'ĐANG TẢI LÊN MÁY CHỦ' : 'ĐÃ TẢI LÊN • AI ĐANG XỬ LÝ'}
                </Text>
                <Text style={styles.progressFileName} numberOfLines={1}>
                  {uploadDetails.name || 'Bài giảng'} {uploadDetails.size ? `(${uploadDetails.size})` : ''}
                </Text>
              </View>
              <Text style={styles.progressPercentText}>{uploadProgress}%</Text>
            </View>

            {/* Thanh tiến trình Progress Bar Animation */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(6, uploadProgress || 0)}%` },
                  uploadProgress !== null && uploadProgress >= 100 && styles.progressBarFillDone,
                ]}
              />
            </View>

            {/* Trạng thái chi tiết */}
            <View style={styles.progressStatusRow}>
              <Text style={styles.progressStatusText}>
                {uploadProgress !== null && uploadProgress < 100
                  ? `Đang truyền file lên máy chủ AI: ${uploadProgress}%...`
                  : 'Tải lên hoàn tất! 🧠 Whisper AI đang nhận diện giọng nói & đồng bộ timestamps...'}
              </Text>
            </View>

            <View style={styles.progressLimitBadge}>
              <Text style={styles.progressLimitText}>
                🛡️ Giới hạn an toàn: Video/Audio ≤ 150MB • Phụ đề ≤ 10MB
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cài đặt hệ thống */}
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
});
