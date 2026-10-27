import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, radius, shadows, spacing } from '../constants/theme';
import Icon from './ui/Icon';

export default function QuizCard({ quiz, index }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const options = quiz.options || ['A', 'B', 'C', 'D'];
  const rawCorrect = quiz.correct_answer || quiz.answer || 'A';
  const correctLetter = typeof rawCorrect === 'string'
    ? (rawCorrect.trim().match(/^[A-E]/i) ? rawCorrect.trim()[0].toUpperCase() : rawCorrect.trim().toUpperCase())
    : 'A';

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

  const isCorrect = selectedOption === correctLetter;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Câu {index + 1}</Text>
        </View>
        {submitted && (
          <View style={[styles.resultPill, isCorrect ? styles.correctPill : styles.wrongPill]}>
            <Icon
              name={isCorrect ? 'check' : 'close'}
              size={12}
              color={isCorrect ? colors.mintDeep : colors.error}
            />
            <Text style={[styles.resultBadge, isCorrect ? styles.correctBadge : styles.wrongBadge]}>
              {isCorrect ? 'Chính xác!' : 'Chưa đúng'}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.question}>{quiz.question}</Text>

      <View style={styles.optionsList}>
        {options.map((opt, idx) => {
          const letter = getOptionLetter(opt, idx);
          const isThisSelected = selectedOption === letter;
          const isThisCorrect = correctLetter === letter;

          let btnStyle = styles.optionBtn;
          let letterBoxStyle = styles.optionLetterBox;
          let textStyle = styles.optionText;

          if (submitted) {
            if (isThisCorrect) {
              btnStyle = [styles.optionBtn, styles.correctOptionBtn];
              letterBoxStyle = [styles.optionLetterBox, styles.correctLetterBox];
              textStyle = [styles.optionText, styles.correctOptionText];
            } else if (isThisSelected && !isCorrect) {
              btnStyle = [styles.optionBtn, styles.wrongOptionBtn];
              letterBoxStyle = [styles.optionLetterBox, styles.wrongLetterBox];
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
              activeOpacity={0.75}
              disabled={submitted}
            >
              <View style={letterBoxStyle}>
                <Text style={styles.optionLetterText}>{letter}</Text>
              </View>
              <Text style={textStyle}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {submitted && quiz.explanation ? (
        <View style={styles.explanationBox}>
          <View style={styles.explanationTitleRow}>
            <Icon name="bulb" size={13} color={colors.violet} />
            <Text style={styles.explanationTitle}>Giải thích chi tiết</Text>
          </View>
          <Text style={styles.explanationText}>{quiz.explanation}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  badge: {
    backgroundColor: colors.coralTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.coralDeep,
    letterSpacing: 0.3,
  },
  resultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  correctPill: {
    backgroundColor: colors.mintSoft,
  },
  wrongPill: {
    backgroundColor: colors.errorSoft,
  },
  resultBadge: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
  },
  correctBadge: {
    color: colors.mintDeep,
  },
  wrongBadge: {
    color: colors.error,
  },
  question: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLow,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  selectedOptionBtn: {
    borderColor: colors.violet,
    backgroundColor: colors.violetSoft,
  },
  correctOptionBtn: {
    borderColor: colors.mint,
    backgroundColor: colors.mintSoft,
  },
  wrongOptionBtn: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  optionLetterBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceLowest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  correctLetterBox: {
    backgroundColor: colors.mint,
  },
  wrongLetterBox: {
    backgroundColor: colors.error,
  },
  optionLetterText: {
    fontFamily: fonts.extraBold,
    fontSize: 11,
    color: colors.slate,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.ink,
    lineHeight: 18,
  },
  correctOptionText: {
    fontFamily: fonts.bold,
    color: colors.mintDeep,
  },
  wrongOptionText: {
    fontFamily: fonts.bold,
    color: colors.error,
  },
  explanationBox: {
    marginTop: spacing.md,
    padding: spacing.sm + 2,
    backgroundColor: colors.violetSoft,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.violet,
  },
  explanationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  explanationTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.violet,
  },
  explanationText: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.slate,
    lineHeight: 17,
  },
});
