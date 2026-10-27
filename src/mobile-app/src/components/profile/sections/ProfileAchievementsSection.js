import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../../constants/theme';
import Icon from '../../ui/Icon';
import IconBadge from '../../ui/IconBadge';
import styles from '../styles/profileStyles';

const BADGES = [
  { key: 'pioneer', icon: 'school', title: 'Tân Binh Tiên Phong', subtitle: 'Hoàn thành bài đầu', tone: 'coral' },
  { key: 'speed', icon: 'bolt', title: 'Tốc Độ Ánh Sáng', subtitle: 'Tóm tắt AI tức thì', tone: 'mint' },
  { key: 'quiz', icon: 'quiz', title: 'Bậc Thầy Trắc Nghiệm', subtitle: 'Ôn tập 5+ câu hỏi', tone: 'violet' },
  { key: 'persist', icon: 'crown', title: 'Học Viên Bền Bỉ', subtitle: '30+ phút tiếp thu', tone: 'coral' },
];

const TONE_STYLES = {
  coral: { bg: colors.coralTint, fg: colors.coral },
  mint: { bg: colors.mintSoft, fg: colors.mintDeep },
  violet: { bg: colors.violetSoft, fg: colors.violet },
};

/**
 * Khối Huy hiệu Thành tích Học tập (Tân Binh Tiên Phong, Tốc Độ Ánh Sáng, Bậc Thầy Trắc Nghiệm, Học Viên Bền Bỉ)
 */
export default function ProfileAchievementsSection({ stats = {} }) {
  const processed = stats.processed_lectures || 0;
  const quizzes = stats.saved_quizzes || 0;
  const minutes = stats.total_minutes || 0;

  const unlockedMap = {
    pioneer: processed >= 1,
    speed: processed >= 1,
    quiz: quizzes >= 5,
    persist: minutes >= 30,
  };
  const unlockedCount = Object.values(unlockedMap).filter(Boolean).length;

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderLeft}>
          <IconBadge icon="trophy" size={32} iconSize={18} tone="coral" />
          <Text style={styles.sectionHeaderTitle}>Huy hiệu thành tích</Text>
        </View>
        <Text style={[styles.sectionHeaderMeta, { color: colors.coral }]}>
          {unlockedCount}/4 Mở khóa
        </Text>
      </View>

      <View style={styles.achievementsGrid}>
        {BADGES.map((badge) => {
          const tone = TONE_STYLES[badge.tone] || TONE_STYLES.coral;
          const unlocked = unlockedMap[badge.key];
          const isQuizBadge = badge.key === 'quiz';
          const quizPercent = Math.min(100, Math.round((quizzes / 5) * 100));

          return (
            <View
              key={badge.key}
              style={[
                styles.achievementBadge,
                unlocked && styles.achievementBadgeUnlocked,
              ]}
            >
              <View style={[styles.achievementIconWrap, { backgroundColor: tone.bg }]}>
                <Icon name={badge.icon} size={22} color={tone.fg} />
              </View>
              <Text style={styles.achievementTitle}>{badge.title}</Text>
              <Text style={styles.achievementSubtitle}>{badge.subtitle}</Text>

              {isQuizBadge && !unlocked ? (
                <View style={styles.achievementProgressRow}>
                  <Text style={styles.achievementProgressText}>{quizzes}/5 câu</Text>
                  <Text style={[styles.achievementProgressText, { color: colors.violet }]}>
                    {quizPercent}%
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.achievementStatusWrap,
                    unlocked && styles.achievementStatusUnlocked,
                  ]}
                >
                  {unlocked ? (
                    <Icon name="check" size={11} color={colors.mintDeep} />
                  ) : (
                    <Icon name="lock" size={11} color={colors.muted} />
                  )}
                  <Text
                    style={[
                      styles.achievementStatusText,
                      unlocked && styles.achievementStatusTextUnlocked,
                    ]}
                  >
                    {unlocked ? 'Đã mở khóa' : 'Đang khóa'}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </>
  );
}
