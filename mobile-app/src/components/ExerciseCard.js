import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function ExerciseCard({ exercise, index }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [mastered, setMastered] = useState(null); // true | false | null

  return (
    <View style={[styles.card, mastered === true && styles.cardMastered, mastered === false && styles.cardReview]}>
      {/* Tiêu đề bài tập */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>BÀI TẬP CỦNG CỐ {index + 1}</Text>
        </View>
        {mastered !== null && (
          <View style={[styles.statusTag, mastered ? styles.statusMastered : styles.statusReview]}>
            <Text style={styles.statusTagText}>
              {mastered ? '✓ Đã thuộc' : '🔁 Cần ôn lại'}
            </Text>
          </View>
        )}
      </View>

      {/* Câu hỏi */}
      <Text style={styles.questionText}>{exercise.question}</Text>

      {/* Nút lật xem đáp án */}
      <TouchableOpacity
        style={styles.revealBtn}
        onPress={() => setShowAnswer(!showAnswer)}
        activeOpacity={0.7}
      >
        <Text style={styles.revealBtnText}>
          {showAnswer ? '🙈 Ẩn đáp án & Gợi ý' : '👁️ Hiện câu trả lời & Gợi ý'}
        </Text>
      </TouchableOpacity>

      {/* Nội dung đáp án & gợi ý */}
      {showAnswer && (
        <View style={styles.answerBox}>
          {exercise.hint ? (
            <View style={styles.hintWrap}>
              <Text style={styles.hintLabel}>💡 Gợi ý tư duy:</Text>
              <Text style={styles.hintText}>{exercise.hint}</Text>
            </View>
          ) : null}

          <View style={styles.answerWrap}>
            <Text style={styles.answerLabel}>✅ Đáp án chuẩn xác:</Text>
            <Text style={styles.answerText}>{exercise.answer}</Text>
          </View>

          {/* Đánh giá mức độ ghi nhớ */}
          <View style={styles.masteryRow}>
            <Text style={styles.masteryPrompt}>Bạn đã ghi nhớ nội dung này chưa?</Text>
            <View style={styles.masteryButtons}>
              <TouchableOpacity
                style={[styles.masteryBtn, mastered === true && styles.masteryBtnActiveSuccess]}
                onPress={() => setMastered(true)}
              >
                <Text style={styles.masteryBtnText}>✓ Đã hiểu rõ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.masteryBtn, mastered === false && styles.masteryBtnActiveWarning]}
                onPress={() => setMastered(false)}
              >
                <Text style={styles.masteryBtnText}>🔁 Cần ôn lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  cardMastered: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  cardReview: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusMastered: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusReview: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f8fafc',
  },
  questionText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  revealBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  revealBtnText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  answerBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#1e293b',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  hintWrap: {
    marginBottom: spacing.xs,
  },
  hintLabel: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  answerWrap: {
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  answerLabel: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  answerText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 18,
  },
  masteryRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  masteryPrompt: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 6,
  },
  masteryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  masteryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  masteryBtnActiveSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  masteryBtnActiveWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  masteryBtnText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
});
