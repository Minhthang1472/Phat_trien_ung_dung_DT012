import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, radius, spacing } from '../constants/theme';
import Icon from './ui/Icon';

export default function ExerciseCard({ exercise, index }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [mastered, setMastered] = useState(null); // true | false | null

  return (
    <View style={[styles.card, mastered === true && styles.cardMastered, mastered === false && styles.cardReview]}>
      {/* Tiêu đề bài tập */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>BÀI TẬP {index + 1}</Text>
        </View>
        {mastered !== null && (
          <View style={[styles.statusTag, mastered ? styles.statusMastered : styles.statusReview]}>
            <Icon
              name={mastered ? 'check' : 'refresh'}
              size={11}
              color={mastered ? colors.mintDeep : '#8A6100'}
            />
            <Text style={[styles.statusTagText, { color: mastered ? colors.mintDeep : '#8A6100' }]}>
              {mastered ? 'Đã thuộc' : 'Cần ôn lại'}
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
        activeOpacity={0.8}
      >
        <Icon name={showAnswer ? 'close' : 'bulb'} size={13} color={colors.coral} />
        <Text style={styles.revealBtnText}>
          {showAnswer ? 'Ẩn đáp án & Gợi ý' : 'Hiện câu trả lời & Gợi ý'}
        </Text>
      </TouchableOpacity>

      {/* Nội dung đáp án & gợi ý */}
      {showAnswer && (
        <View style={styles.answerBox}>
          {exercise.hint ? (
            <View style={styles.hintWrap}>
              <Text style={styles.hintLabel}>Gợi ý tư duy</Text>
              <Text style={styles.hintText}>{exercise.hint}</Text>
            </View>
          ) : null}

          <View style={styles.answerWrap}>
            <Text style={styles.answerLabel}>Đáp án chuẩn xác</Text>
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
                <Text style={styles.masteryBtnText}>Đã hiểu rõ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.masteryBtn, mastered === false && styles.masteryBtnActiveWarning]}
                onPress={() => setMastered(false)}
              >
                <Text style={styles.masteryBtnText}>Cần ôn lại</Text>
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
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  cardMastered: {
    borderColor: 'rgba(6, 214, 160, 0.45)',
    backgroundColor: '#FAFFFD',
  },
  cardReview: {
    borderColor: 'rgba(255, 209, 102, 0.55)',
    backgroundColor: '#FFFDF6',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
    gap: 6,
  },
  badge: {
    backgroundColor: colors.violetSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: colors.violet,
    fontFamily: fonts.extraBold,
    fontSize: 9.5,
    lineHeight: 13,
    letterSpacing: 0.4,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusMastered: {
    backgroundColor: colors.mintSoft,
  },
  statusReview: {
    backgroundColor: colors.lemonSoft,
  },
  statusTagText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    lineHeight: 13,
  },
  questionText: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    backgroundColor: colors.coralTint,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  revealBtnText: {
    color: colors.coralDeep,
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
  },
  answerBox: {
    marginTop: spacing.sm + 2,
    padding: spacing.sm + 2,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.sm,
  },
  hintWrap: {
    marginBottom: spacing.sm,
  },
  hintLabel: {
    color: '#8A6100',
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    marginBottom: 3,
  },
  hintText: {
    color: colors.slate,
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 17,
  },
  answerWrap: {
    marginBottom: spacing.xs,
  },
  answerLabel: {
    color: colors.mintDeep,
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    marginBottom: 3,
  },
  answerText: {
    color: colors.ink,
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    lineHeight: 19,
  },
  masteryRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  masteryPrompt: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 6,
  },
  masteryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  masteryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  masteryBtnActiveSuccess: {
    backgroundColor: colors.mintSoft,
    borderColor: colors.mint,
  },
  masteryBtnActiveWarning: {
    backgroundColor: colors.lemonSoft,
    borderColor: colors.lemon,
  },
  masteryBtnText: {
    color: colors.slate,
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
  },
});
