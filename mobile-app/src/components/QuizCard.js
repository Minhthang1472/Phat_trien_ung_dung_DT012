import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function QuizCard({ quiz, index }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const options = quiz.options || ['A', 'B', 'C', 'D'];
  const correctAnswer = quiz.correct_answer || 'A';

  const handleSelect = (letter) => {
    if (submitted) return;
    setSelectedOption(letter);
    setSubmitted(true);
  };

  const getOptionLetter = (opt, idx) => {
    // Nếu option đã có dạng "A. Nội dung" hoặc chỉ là text
    const prefixes = ['A', 'B', 'C', 'D', 'E'];
    if (typeof opt === 'string' && opt.match(/^[A-E]\./i)) {
      return opt.substring(0, 1).toUpperCase();
    }
    return prefixes[idx] || `${idx + 1}`;
  };

  const isCorrect = selectedOption === correctAnswer;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Câu {index + 1}</Text>
        </View>
        {submitted && (
          <Text style={[styles.resultBadge, isCorrect ? styles.correctBadge : styles.wrongBadge]}>
            {isCorrect ? '✅ Chính xác!' : '❌ Chưa đúng'}
          </Text>
        )}
      </View>

      <Text style={styles.question}>{quiz.question}</Text>

      <View style={styles.optionsList}>
        {options.map((opt, idx) => {
          const letter = getOptionLetter(opt, idx);
          const isThisSelected = selectedOption === letter;
          const isThisCorrect = correctAnswer === letter;

          let btnStyle = styles.optionBtn;
          let textStyle = styles.optionText;

          if (submitted) {
            if (isThisCorrect) {
              btnStyle = [styles.optionBtn, styles.correctOptionBtn];
              textStyle = [styles.optionText, styles.correctOptionText];
            } else if (isThisSelected && !isCorrect) {
              btnStyle = [styles.optionBtn, styles.wrongOptionBtn];
              textStyle = [styles.optionText, styles.wrongOptionText];
            }
          } else if (isThisSelected) {
            btnStyle = [styles.optionBtn, styles.selectedOptionBtn];
          }

          return (
            <TouchableOpacity
              key={idx}
              style={btnStyle}
              onPress={() => handleSelect(letter)}
              activeOpacity={0.7}
              disabled={submitted}
            >
              <View style={styles.optionLetterBox}>
                <Text style={styles.optionLetterText}>{letter}</Text>
              </View>
              <Text style={textStyle}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {submitted && quiz.explanation ? (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationTitle}>💡 Giải thích chi tiết:</Text>
          <Text style={styles.explanationText}>{quiz.explanation}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  resultBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  correctBadge: {
    color: colors.success,
  },
  wrongBadge: {
    color: colors.danger,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
  },
  selectedOptionBtn: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  correctOptionBtn: {
    borderColor: colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  wrongOptionBtn: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  optionLetterBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  optionLetterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionText: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  correctOptionText: {
    color: colors.success,
    fontWeight: '600',
  },
  wrongOptionText: {
    color: colors.danger,
    fontWeight: '600',
  },
  explanationBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryLight,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: 2,
  },
  explanationText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
});
