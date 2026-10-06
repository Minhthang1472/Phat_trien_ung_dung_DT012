import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { colors, spacing, borderRadius } from '../constants/theme';
import QuizCard from '../components/QuizCard';
import MindmapViewer from '../components/MindmapViewer';
import ExerciseCard from '../components/ExerciseCard';
import { apiService } from '../services/api';

export default function SummaryQuizScreen({ lecture, onShare }) {
  const [subTab, setSubTab] = useState('summary'); // 'summary' | 'mindmap' | 'exercises'

  const summary = lecture?.summary || 'Chưa có bản tóm tắt bài giảng.';
  const keyPoints = lecture?.key_points || [];
  const formulasAndTerms = lecture?.formulas_and_terms || [];
  const quizList = lecture?.quiz || [];
  const mindmap = lecture?.mindmap || null;
  const exercises = lecture?.exercises || [];

  const handleShareDoc = async () => {
    if (onShare) {
      onShare();
      return;
    }
    try {
      const textToShare = `=== TỔNG QUAN BÀI HỌC: ${lecture?.title || ''} ===\n\n${summary}\n\n=== ĐIỂM KIẾN THỨC CỐT LÕI ===\n${keyPoints.map((k, i) => `${i + 1}. ${k}`).join('\n')}`;
      await Share.share({ message: textToShare });
    } catch (_) {}
  };

  // Xuất tài liệu ôn tập dưới dạng file TXT
  const handleExportSummary = async () => {
    try {
      let content = `=== BÀI GIẢNG: ${lecture?.title || 'Không tên'} ===\n\n`;
      content += `📝 TÓM TẮT:\n${summary}\n\n`;

      if (keyPoints.length > 0) {
        content += `📌 ĐIỂM KIẾN THỨC CỐT LÕI:\n`;
        keyPoints.forEach((k, i) => { content += `  ${i + 1}. ${k}\n`; });
        content += '\n';
      }

      if (formulasAndTerms.length > 0) {
        content += `🧮 THUẬT NGỮ & CÔNG THỨC:\n`;
        formulasAndTerms.forEach((t) => { content += `  • ${t}\n`; });
        content += '\n';
      }

      if (quizList.length > 0) {
        content += `📝 CÂU HỎI TRẮC NGHIỆM:\n`;
        quizList.forEach((q, i) => {
          content += `\nCâu ${i + 1}: ${q.question}\n`;
          q.options.forEach((opt) => { content += `  ${opt}\n`; });
          content += `  ✅ Đáp án đúng: ${q.correct_answer}\n`;
          if (q.explanation) content += `  💡 Giải thích: ${q.explanation}\n`;
        });
      }

      if (exercises.length > 0) {
        content += `\n📚 BÀI TẬP TỰ LUYỆN:\n`;
        exercises.forEach((ex, i) => {
          content += `\nBài ${i + 1}: ${ex.question}\n`;
          content += `  ✅ Đáp án: ${ex.answer}\n`;
          if (ex.hint) content += `  💡 Gợi ý: ${ex.hint}\n`;
        });
      }

      const safeTitle = (lecture?.title || 'summary').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').substring(0, 30);
      const filePath = `${FileSystem.cacheDirectory}${safeTitle}_summary.txt`;
      await FileSystem.writeAsStringAsync(filePath, content, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/plain',
          dialogTitle: 'Xuất tài liệu ôn tập',
        });
      } else {
        Alert.alert('Thành công', `File đã được lưu tại:\n${filePath}`);
      }
    } catch (err) {
      Alert.alert('Lỗi xuất tài liệu', err.message);
    }
  };

  // Tính năng tải Video Hardsub
  const handleDownloadVideo = () => {
    Alert.alert(
      'Tải Video Phụ Đề',
      'Bạn có muốn tải về video có đính kèm cứng phụ đề (Hardsub) để xem offline không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Có, Tải về', 
          onPress: async () => {
            try {
              Alert.alert('Đang xử lý', 'Đang ghép phụ đề vào video, vui lòng chờ...');
              const burnResult = await apiService.burnSubtitlesIntoVideo(lecture.video_url, lecture.segments);
              
              const fileUri = `${FileSystem.cacheDirectory}video_phude_${Date.now()}.mp4`;
              await FileSystem.downloadAsync(burnResult.media_url, fileUri);
              
              const canShare = await Sharing.isAvailableAsync();
              if (canShare) {
                await Sharing.shareAsync(fileUri, { mimeType: 'video/mp4', dialogTitle: 'Lưu Video Phụ Đề' });
              }
            } catch (err) {
              Alert.alert('Lỗi tạo video', err.message);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Thanh chọn 3 chế độ ôn tập: Tóm tắt / Mindmap / Bài tập */}
      <View style={styles.subTabRow}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'summary' && styles.subTabBtnActive]}
          onPress={() => setSubTab('summary')}
          activeOpacity={0.7}
        >
          <Text style={[styles.subTabBtnText, subTab === 'summary' && styles.subTabBtnTextActive]}>
            📑 Tóm tắt & Quiz
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'mindmap' && styles.subTabBtnActive]}
          onPress={() => setSubTab('mindmap')}
          activeOpacity={0.7}
        >
          <Text style={[styles.subTabBtnText, subTab === 'mindmap' && styles.subTabBtnTextActive]}>
            🧠 Sơ đồ Mindmap
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'exercises' && styles.subTabBtnActive]}
          onPress={() => setSubTab('exercises')}
          activeOpacity={0.7}
        >
          <Text style={[styles.subTabBtnText, subTab === 'exercises' && styles.subTabBtnTextActive]}>
            📝 Bài tập tự luyện {exercises.length > 0 ? `(${exercises.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. TAB TÓM TẮT & TRẮC NGHIỆM */}
      {subTab === 'summary' && (
        <View>
          {/* Khối Tổng quan tóm tắt */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIcon}>📑</Text>
              <Text style={styles.sectionTitle}>TỔNG QUAN BÀI HỌC</Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>💡 Tóm tắt ngắn gọn:</Text>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>

            {keyPoints.length > 0 && (
              <View style={styles.keyPointsBox}>
                <Text style={styles.keyPointsLabel}>📌 Các điểm kiến thức cốt lõi:</Text>
                {keyPoints.map((point, idx) => (
                  <View key={idx} style={styles.bulletItem}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {formulasAndTerms.length > 0 && (
              <View style={styles.formulasBox}>
                <Text style={styles.formulasLabel}>🧮 Thuật ngữ & Công thức quan trọng:</Text>
                {formulasAndTerms.map((term, idx) => (
                  <View key={idx} style={styles.termTag}>
                    <Text style={styles.termText}>{term}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Khối Bộ câu hỏi trắc nghiệm tự ôn tập */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIcon}>📝</Text>
              <Text style={styles.sectionTitle}>CÂU HỎI TRẮC NGHIỆM TỰ ÔN TẬP</Text>
            </View>

            {quizList.length > 0 ? (
              quizList.map((q, idx) => <QuizCard key={idx} quiz={q} index={idx} />)
            ) : (
              <View style={styles.emptyQuiz}>
                <Text style={styles.emptyQuizText}>
                  Chưa có bộ câu hỏi trắc nghiệm nào được tạo cho bài học này.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 2. TAB SƠ ĐỒ TƯ DUY (MINDMAP) */}
      {subTab === 'mindmap' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>🧠</Text>
            <Text style={styles.sectionTitle}>SƠ ĐỒ TƯ DUY KIẾN THỨC (MINDMAP)</Text>
          </View>
          <MindmapViewer mindmap={mindmap} defaultTitle={lecture?.title} />
        </View>
      )}

      {/* 3. TAB NGÂN HÀNG BÀI TẬP TỰ LUYỆN */}
      {subTab === 'exercises' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>📚</Text>
            <Text style={styles.sectionTitle}>NGÂN HÀNG BÀI TẬP & FLASHCARDS</Text>
          </View>

          {exercises.length > 0 ? (
            exercises.map((ex, idx) => (
              <ExerciseCard key={idx} exercise={ex} index={idx} />
            ))
          ) : (
            <View style={styles.emptyQuiz}>
              <Text style={styles.emptyQuizText}>
                Chưa có câu hỏi tự luyện nào. Hãy chạy phân tích bằng AI để tạo bài tập!
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Nút Xuất / Chia sẻ tài liệu ôn tập */}
      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.exportFileBtn} onPress={handleExportSummary} activeOpacity={0.8}>
          <Text style={styles.exportFileBtnText}>📥 TÀI LIỆU</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportVideoBtn} onPress={handleDownloadVideo} activeOpacity={0.8}>
          <Text style={styles.exportVideoBtnText}>🎬 TẢI VIDEO</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={handleShareDoc} activeOpacity={0.8}>
          <Text style={styles.exportBtnText}>📤 CHIA SẺ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  subTabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  subTabBtnText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  subTabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  summaryBox: {
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  keyPointsBox: {
    marginBottom: spacing.md,
  },
  keyPointsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  bulletDot: {
    color: colors.accent,
    fontSize: 14,
    marginRight: 6,
    lineHeight: 18,
  },
  bulletText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  formulasBox: {
    marginBottom: spacing.xs,
  },
  formulasLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a855f7',
    marginBottom: spacing.xs,
  },
  termTag: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  termText: {
    fontSize: 12,
    color: '#d8b4fe',
    lineHeight: 16,
  },
  emptyQuiz: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyQuizText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  exportRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  exportFileBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportFileBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exportVideoBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportVideoBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exportBtn: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  exportBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
