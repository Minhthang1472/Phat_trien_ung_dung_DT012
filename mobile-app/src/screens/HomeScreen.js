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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { colors, spacing, borderRadius } from '../constants/theme';
import { SUPPORTED_LANGUAGES } from '../constants/config';
import { apiService } from '../services/api';
import Header from '../components/Header';
import LectureCard from '../components/LectureCard';
import ServerModal from '../components/ServerModal';

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
  },
];

export default function HomeScreen({ onNavigate }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [targetLang, setTargetLang] = useState('vi');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [recentLectures, setRecentLectures] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [serverStatus, setServerStatus] = useState({ online: false });
  const [serverModalVisible, setServerModalVisible] = useState(false);

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
      const result = await apiService.processVideo(trimmed, targetLang);
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

  // Upload file video/audio nội bộ từ điện thoại
  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*', 'audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      setLoading(true);
      setLoadingStep('Đang tải lên file từ thiết bị...');

      const baseUrl = await apiService.getBaseUrl();
      const uploadResult = await FileSystem.uploadAsync(
        `${baseUrl}/api/video/upload`,
        file.uri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          parameters: {
            target_language: targetLang,
          },
        }
      );

      if (uploadResult.status >= 200 && uploadResult.status < 300) {
        const data = JSON.parse(uploadResult.body);
        setLoading(false);
        onNavigate('SyncPlayer', { lecture: data });
      } else {
        throw new Error(`Server trả về lỗi: ${uploadResult.status}`);
      }
    } catch (err) {
      setLoading(false);
      Alert.alert(
        'Không thể upload file',
        `${err.message}\n\nHãy đảm bảo Backend đang chạy và có endpoint /api/video/upload.`,
        [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Xem bài mẫu',
            onPress: () => onNavigate('SyncPlayer', { lecture: SAMPLE_LECTURES[0] }),
          },
        ]
      );
    }
  };

  // Tính thống kê tiến độ từ lịch sử
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
        title="LECTURE AI CAPTION"
        serverStatus={serverStatus}
        onOpenSettings={() => setServerModalVisible(true)}
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
          <Text style={styles.subLabel}>Ngôn ngữ phụ đề mong muốn:</Text>
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

          {/* Nút Bắt đầu Tạo Phụ đề */}
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
              <Text style={styles.primaryActionBtnText}>⚡ BẮT ĐẦU TẠO PHỤ ĐỀ & TÓM TẮT</Text>
            )}
          </TouchableOpacity>

          {/* Nút Upload File Nội bộ */}
          <TouchableOpacity
            style={[styles.uploadBtn, loading && styles.disabledBtn]}
            onPress={handleUploadFile}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadBtnText}>📁 UPLOAD FILE TỪ THIẾT BỊ (MP4 / MP3)</Text>
          </TouchableOpacity>
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

        {/* Khối Hoạt động Trực tiếp Giảng đường */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionDividerText}>─── HOẶC HỌC TẠI GIẢNG ĐƯỜNG TRỰC TIẾP ───</Text>

          <TouchableOpacity
            style={styles.liveCaptionBtn}
            onPress={() => onNavigate('LiveCaption')}
            activeOpacity={0.85}
          >
            <View style={styles.liveCaptionContent}>
              <View style={styles.micCircle}>
                <Text style={styles.micIcon}>🎙️</Text>
              </View>
              <View style={styles.liveCaptionTexts}>
                <Text style={styles.liveCaptionTitle}>BẬT LIVE-CAPTION QUA MICRO</Text>
                <Text style={styles.liveCaptionDesc}>
                  Nhận diện lời thầy cô theo thời gian thực trực tiếp trên màn hình
                </Text>
              </View>
            </View>
          </TouchableOpacity>
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
            />
          ))}
        </View>
      </ScrollView>

      {/* Modal Cài đặt Server */}
      <ServerModal
        visible={serverModalVisible}
        onClose={() => setServerModalVisible(false)}
        onSaved={checkHealthAndFetchHistory}
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
  sectionDividerText: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
    marginVertical: spacing.sm,
    letterSpacing: 0.5,
  },
  liveCaptionBtn: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  liveCaptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  micIcon: {
    fontSize: 22,
  },
  liveCaptionTexts: {
    flex: 1,
  },
  liveCaptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  liveCaptionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
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
});
