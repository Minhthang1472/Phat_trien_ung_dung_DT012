import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '../../ui/Icon';
import { colors } from '../../../constants/theme';

export default function InVideoQuizOverlay({
  activeCheckpointQuiz,
  formatTime,
  handleResumeFromQuiz,
  handleSelectQuizOption,
  styles,
}) {
  if (!activeCheckpointQuiz) return null;

  return (
    <View style={styles.checkpointOverlay}>
      <View style={styles.checkpointCard}>
        <View style={styles.checkpointTopRow}>
          <View style={styles.checkpointBadge}>
            <Icon name="quiz" size={11} color={colors.coralDeep} />
            <Text style={styles.checkpointBadgeText}>
              ĐIỂM ÔN TẬP • MỐC {formatTime(activeCheckpointQuiz.quiz.checkpoint_time)}
            </Text>
          </View>
          {!activeCheckpointQuiz.isSubmitted && (
            <TouchableOpacity
              style={styles.checkpointSkipBtn}
              onPress={handleResumeFromQuiz}
              activeOpacity={0.7}
            >
              <Text style={styles.checkpointSkipText}>Bỏ qua</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.checkpointQuestion}>
          {activeCheckpointQuiz.quiz.question}
        </Text>

        <View style={styles.checkpointOptionsList}>
          {activeCheckpointQuiz.quiz.options.map((opt, oIdx) => {
            const isChosen = activeCheckpointQuiz.userChoice === opt;
            const correctAns = (
              activeCheckpointQuiz.quiz.correct_answer ||
              activeCheckpointQuiz.quiz.answer ||
              ''
            ).toUpperCase().trim();
            const isCorrectOption =
              opt.toUpperCase().startsWith(correctAns[0]) ||
              opt.toUpperCase() === correctAns;

            let btnStyle = styles.checkpointOptionBtn;
            if (activeCheckpointQuiz.isSubmitted) {
              if (isCorrectOption) {
                btnStyle = [styles.checkpointOptionBtn, styles.checkpointOptionCorrect];
              } else if (isChosen && !activeCheckpointQuiz.isCorrect) {
                btnStyle = [styles.checkpointOptionBtn, styles.checkpointOptionWrong];
              }
            } else if (isChosen) {
              btnStyle = [styles.checkpointOptionBtn, styles.checkpointOptionSelected];
            }

            return (
              <TouchableOpacity
                key={oIdx}
                style={btnStyle}
                disabled={activeCheckpointQuiz.isSubmitted}
                onPress={() => handleSelectQuizOption(opt)}
                activeOpacity={0.7}
              >
                <Text style={styles.checkpointOptionText}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeCheckpointQuiz.isSubmitted && (
          <View style={styles.checkpointFeedbackBox}>
            <Text
              style={[
                styles.checkpointFeedbackTitle,
                activeCheckpointQuiz.isCorrect
                  ? styles.checkpointFeedbackCorrect
                  : styles.checkpointFeedbackWrong,
              ]}
            >
              {activeCheckpointQuiz.isCorrect
                ? '✓ Chính xác! Bạn nắm bài rất tốt.'
                : '✗ Chưa đúng! Xem giải thích bên dưới:'}
            </Text>
            <Text style={styles.checkpointExplanation}>
              {activeCheckpointQuiz.quiz.explanation}
            </Text>
            <TouchableOpacity
              style={styles.checkpointContinueBtn}
              onPress={handleResumeFromQuiz}
              activeOpacity={0.8}
            >
              <Text style={styles.checkpointContinueBtnText}>
                TIẾP TỤC XEM BÀI GIẢNG
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
