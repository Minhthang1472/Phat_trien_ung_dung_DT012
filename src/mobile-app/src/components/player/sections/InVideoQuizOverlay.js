import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '../../ui/Icon';
import { colors, fonts, radius, spacing } from '../../../constants/theme';

export default function InVideoQuizOverlay({
  activeCheckpointQuiz,
  formatTime,
  handleResumeFromQuiz,
  handleSelectQuizOption,
}) {
  if (!activeCheckpointQuiz) return null;

  const quiz = activeCheckpointQuiz.quiz;
  const options = quiz.options || ['A', 'B', 'C', 'D'];
  const rawCorrect = quiz.correct_answer || quiz.answer || 'A';
  const correctLetter = typeof rawCorrect === 'string'
    ? (rawCorrect.trim().match(/^[A-E]/i) ? rawCorrect.trim()[0].toUpperCase() : rawCorrect.trim().toUpperCase())
    : 'A';

  const getOptionLetter = (opt, idx) => {
    const prefixes = ['A', 'B', 'C', 'D', 'E'];
    if (typeof opt === 'string' && opt.match(/^[A-E]\./i)) {
      return opt.substring(0, 1).toUpperCase();
    }
    return prefixes[idx] || `${idx + 1}`;
  };

  const getOptionText = (opt) => {
    if (typeof opt === 'string' && opt.match(/^[A-E]\.\s*/i)) {
      return opt.replace(/^[A-E]\.\s*/i, '');
    }
    return opt;
  };

  return (
    <Modal
      visible={!!activeCheckpointQuiz}
      transparent
      animationType="fade"
      onRequestClose={handleResumeFromQuiz}
    >
      <View style={overlayStyles.backdrop}>
        <View style={overlayStyles.card}>
          {/* Header hàng trên: Badge mốc thời gian & Nút bỏ qua */}
          <View style={overlayStyles.headerRow}>
            <View style={overlayStyles.badge}>
              <Icon name="quiz" size={13} color={colors.coralDeep} />
              <Text style={overlayStyles.badgeText}>
                ĐIỂM ÔN TẬP • MỐC {formatTime(quiz.checkpoint_time)}
              </Text>
            </View>

            <TouchableOpacity
              style={overlayStyles.skipBtn}
              onPress={handleResumeFromQuiz}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={overlayStyles.skipBtnText}>
                {activeCheckpointQuiz.isSubmitted ? 'Đóng' : 'Bỏ qua'}
              </Text>
              <Icon name="close" size={12} color={colors.slate} />
            </TouchableOpacity>
          </View>

          {/* Vùng nội dung có cuộn (ScrollView) đảm bảo không bao giờ bị cắt chữ */}
          <ScrollView
            style={overlayStyles.scrollBody}
            contentContainerStyle={overlayStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Tiêu đề câu hỏi */}
            <Text style={overlayStyles.questionText}>{quiz.question}</Text>

            {/* Danh sách 4 đáp án A, B, C, D */}
            <View style={overlayStyles.optionsList}>
              {options.map((opt, oIdx) => {
                const letter = getOptionLetter(opt, oIdx);
                const isThisChosen =
                  activeCheckpointQuiz.chosenLetter === letter ||
                  activeCheckpointQuiz.userChoice === opt;
                const isThisCorrect = correctLetter === letter;

                let btnStyle = overlayStyles.optionBtn;
                let letterBoxStyle = overlayStyles.letterBox;
                let textStyle = overlayStyles.optionText;

                if (activeCheckpointQuiz.isSubmitted) {
                  if (isThisCorrect) {
                    btnStyle = [overlayStyles.optionBtn, overlayStyles.optionBtnCorrect];
                    letterBoxStyle = [overlayStyles.letterBox, overlayStyles.letterBoxCorrect];
                    textStyle = [overlayStyles.optionText, overlayStyles.optionTextCorrect];
                  } else if (isThisChosen && !activeCheckpointQuiz.isCorrect) {
                    btnStyle = [overlayStyles.optionBtn, overlayStyles.optionBtnWrong];
                    letterBoxStyle = [overlayStyles.letterBox, overlayStyles.letterBoxWrong];
                    textStyle = [overlayStyles.optionText, overlayStyles.optionTextWrong];
                  }
                } else if (isThisChosen) {
                  btnStyle = [overlayStyles.optionBtn, overlayStyles.optionBtnSelected];
                  letterBoxStyle = [overlayStyles.letterBox, overlayStyles.letterBoxSelected];
                }

                return (
                  <TouchableOpacity
                    key={oIdx}
                    style={btnStyle}
                    disabled={activeCheckpointQuiz.isSubmitted}
                    onPress={() => handleSelectQuizOption(opt, letter)}
                    activeOpacity={0.75}
                  >
                    <View style={letterBoxStyle}>
                      <Text style={overlayStyles.letterBoxText}>{letter}</Text>
                    </View>
                    <Text style={textStyle}>{getOptionText(opt)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Hộp phản hồi & Lời giải thích khi đã chọn đáp án */}
            {activeCheckpointQuiz.isSubmitted && (
              <View style={overlayStyles.feedbackBox}>
                <View style={overlayStyles.feedbackHeader}>
                  <Icon
                    name={activeCheckpointQuiz.isCorrect ? 'check' : 'close'}
                    size={15}
                    color={activeCheckpointQuiz.isCorrect ? colors.mintDeep : colors.error}
                  />
                  <Text
                    style={[
                      overlayStyles.feedbackTitle,
                      activeCheckpointQuiz.isCorrect
                        ? overlayStyles.feedbackCorrect
                        : overlayStyles.feedbackWrong,
                    ]}
                  >
                    {activeCheckpointQuiz.isCorrect
                      ? 'Chính xác! Bạn nắm kiến thức rất vững.'
                      : 'Chưa chính xác! Xem giải thích bên dưới:'}
                  </Text>
                </View>

                {quiz.explanation ? (
                  <Text style={overlayStyles.explanationText}>
                    {quiz.explanation}
                  </Text>
                ) : null}

                {/* Nút Tiếp tục xem bài giảng */}
                <TouchableOpacity
                  style={overlayStyles.continueBtn}
                  onPress={handleResumeFromQuiz}
                  activeOpacity={0.85}
                >
                  <Text style={overlayStyles.continueBtnText}>
                    TIẾP TỤC XEM BÀI GIẢNG ➔
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Dòng chữ bỏ qua ở chân nếu người dùng muốn xem tiếp ngay */}
          {!activeCheckpointQuiz.isSubmitted && (
            <TouchableOpacity
              style={overlayStyles.bottomSkipWrap}
              onPress={handleResumeFromQuiz}
              activeOpacity={0.7}
            >
              <Text style={overlayStyles.bottomSkipText}>
                Bỏ qua câu hỏi này & tiếp tục phát video
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const overlayStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '84%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg || 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.coralTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 10.5,
    color: colors.coralDeep,
    letterSpacing: 0.3,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLow,
  },
  skipBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.slate,
  },
  scrollBody: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingBottom: 6,
  },
  questionText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  optionsList: {
    gap: 8,
    marginBottom: spacing.xs,
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
  optionBtnSelected: {
    borderColor: colors.violet,
    backgroundColor: colors.violetSoft,
  },
  optionBtnCorrect: {
    borderColor: colors.mint,
    backgroundColor: '#ECFDF5',
  },
  optionBtnWrong: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  letterBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterBoxSelected: {
    backgroundColor: colors.violet,
  },
  letterBoxCorrect: {
    backgroundColor: colors.mint,
  },
  letterBoxWrong: {
    backgroundColor: colors.error,
  },
  letterBoxText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.ink,
  },
  optionTextCorrect: {
    color: '#065F46',
    fontFamily: fonts.bold,
  },
  optionTextWrong: {
    color: '#991B1B',
    fontFamily: fonts.bold,
  },
  feedbackBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  feedbackTitle: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
  },
  feedbackCorrect: {
    color: colors.mintDeep,
  },
  feedbackWrong: {
    color: colors.error,
  },
  explanationText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  continueBtn: {
    backgroundColor: colors.coral,
    paddingVertical: 11,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  continueBtnText: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  bottomSkipWrap: {
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingVertical: 4,
  },
  bottomSkipText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate,
    textDecorationLine: 'underline',
  },
});
