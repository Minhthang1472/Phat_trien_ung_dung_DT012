import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles/profileStyles';

/**
 * Khối Huy hiệu Thành tích Học tập (Tân Binh Tiên Phong, Tốc Độ Ánh Sáng, Bậc Thầy Trắc Nghiệm, Học Viên Bền Bỉ)
 */
export default function ProfileAchievementsSection({ stats = {} }) {
  const processed = stats.processed_lectures || 0;
  const quizzes = stats.saved_quizzes || 0;
  const minutes = stats.total_minutes || 0;

  return (
    <>
      <Text style={styles.sectionTitle}>🏆 HUY HIỆU THÀNH TÍCH</Text>
      <View style={styles.achievementsGrid}>
        <View style={[styles.achievementBadge, processed >= 1 && styles.achievementBadgeUnlocked]}>
          <Text style={styles.achievementIcon}>🎓</Text>
          <Text style={styles.achievementTitle}>Tân Binh Tiên Phong</Text>
          <Text style={styles.achievementSubtitle}>Hoàn thành bài đầu</Text>
          <Text style={styles.achievementStatus}>
            {processed >= 1 ? '✓ Đã mở khóa' : '🔒 Đang khóa'}
          </Text>
        </View>

        <View style={[styles.achievementBadge, processed >= 1 ? styles.achievementBadgeUnlocked : null]}>
          <Text style={styles.achievementIcon}>⚡</Text>
          <Text style={styles.achievementTitle}>Tốc Độ Ánh Sáng</Text>
          <Text style={styles.achievementSubtitle}>Tóm tắt AI tức thì</Text>
          <Text style={styles.achievementStatus}>
            {processed >= 1 ? '✓ Đã mở khóa' : '🔒 Đang khóa'}
          </Text>
        </View>

        <View style={[styles.achievementBadge, quizzes >= 5 && styles.achievementBadgeUnlocked]}>
          <Text style={styles.achievementIcon}>🎯</Text>
          <Text style={styles.achievementTitle}>Bậc Thầy Trắc Nghiệm</Text>
          <Text style={styles.achievementSubtitle}>Ôn tập 5+ câu hỏi</Text>
          <Text style={styles.achievementStatus}>
            {quizzes >= 5 ? '✓ Đã mở khóa' : `${quizzes}/5 câu`}
          </Text>
        </View>

        <View style={[styles.achievementBadge, minutes >= 30 && styles.achievementBadgeUnlocked]}>
          <Text style={styles.achievementIcon}>👑</Text>
          <Text style={styles.achievementTitle}>Học Viên Bền Bỉ</Text>
          <Text style={styles.achievementSubtitle}>30+ phút tiếp thu</Text>
          <Text style={styles.achievementStatus}>
            {minutes >= 30 ? '✓ Đã mở khóa' : `${minutes}/30 ph`}
          </Text>
        </View>
      </View>
    </>
  );
}
