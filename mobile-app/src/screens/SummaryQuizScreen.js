import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import QuizCard from '../components/QuizCard';

export default function SummaryQuizScreen({ lecture, onShare }) {
  const summary = lecture?.summary || 'Chưa có bản tóm tắt bài giảng.';
  const keyPoints = lecture?.key_points || [];
  const formulasAndTerms = lecture?.formulas_and_terms || [];
  const quizList = lecture?.quiz || [];

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

        {/* Nút Xuất / Chia sẻ tài liệu ôn tập */}
        <TouchableOpacity style={styles.exportBtn} onPress={handleShareDoc} activeOpacity={0.8}>
          <Text style={styles.exportBtnText}>📥 XUẤT TÀI LIỆU ÔN TẬP (SHARE / PDF)</Text>
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
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  keyPointsBox: {
    marginBottom: spacing.md,
  },
  keyPointsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 6,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDot: {
    fontSize: 14,
    color: colors.secondary,
    marginRight: 6,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  formulasBox: {
    marginTop: 4,
  },
  formulasLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 6,
  },
  termTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  termText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  emptyQuiz: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyQuizText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  exportBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  exportBtnText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
