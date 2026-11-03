import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, radius, shadows, spacing } from '../constants/theme';
import Icon from './ui/Icon';

export default function QuizCard({ quiz, index, savedAnswer, onAnswer }) {
  const [selectedOption, setSelectedOption] = useState(savedAnswer?.selectedOption || null);
  const [submitted, setSubmitted] = useState(!!savedAnswer);

  useEffect(() => {
    if (savedAnswer?.selectedOption) {
      setSelectedOption(savedAnswer.selectedOption);
      setSubmitted(true);
    }
  }, [savedAnswer]);

  const options = quiz.options || ['A', 'B', 'C', 'D'];
  const rawCorrect = quiz.correct_answer || quiz.answer || 'A';
  const correctLetter = typeof rawCorrect === 'string'
    ? (rawCorrect.trim().match(/^[A-E]/i) ? rawCorrect.trim()[0].toUpperCase() : rawCorrect.trim().toUpperCase())
    : 'A';

  const handleSelect = (letter) => {
    if (submitted) return;
    setSelectedOption(letter);
    setSubmitted(true);
    if (onAnswer) {
      onAnswer(letter);
    }
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
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.slate,
  },
  resultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  correctPill: {
    backgroundColor: '#ECFDF5',
  },
  wrongPill: {
    backgroundColor: '#FEF2F2',
  },
  resultBadge: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  correctBadge: {
    color: colors.mintDeep,
  },
  wrongBadge: {
    color: colors.error,
  },
  question: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  optionsList: {
    gap: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  selectedOptionBtn: {
    borderColor: colors.violet,
    backgroundColor: colors.violetSoft,
  },
  correctOptionBtn: {
    borderColor: colors.mint,
    backgroundColor: '#ECFDF5',
  },
  wrongOptionBtn: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  optionLetterBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  correctLetterBox: {
    backgroundColor: colors.mint,
  },
  wrongLetterBox: {
    backgroundColor: colors.error,
  },
  optionLetterText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
  correctOptionText: {
    color: '#065F46',
    fontFamily: fonts.bold,
  },
  wrongOptionText: {
    color: '#991B1B',
    fontFamily: fonts.bold,
  },
  explanationBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  explanationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  explanationTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.violet,
  },
  explanationText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.slate,
  },
});
