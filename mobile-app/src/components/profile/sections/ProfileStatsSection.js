import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles/profileStyles';

/**
 * 4 Chỉ số KPI học tập tổng quan (Bài giảng, Thời lượng, Câu trắc nghiệm, Hiệu quả tiếp thu)
 */
export default function ProfileStatsSection({ stats = {} }) {
  const processed = stats.processed_lectures || 0;
  const minutes = stats.total_minutes || 0;
  const quizzes = stats.saved_quizzes || 0;
  const efficiency = processed > 0
    ? `${Math.min(100, Math.round((quizzes / Math.max(1, processed * 3)) * 100))}%`
    : '0%';

  return (
    <>
      <Text style={styles.sectionTitle}>📈 CHỈ SỐ HỌC TẬP TỔNG QUAN</Text>
      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardCard}>
          <View style={[styles.dashboardCardIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
            <Text style={styles.dashboardCardIcon}>📚</Text>
          </View>
          <Text style={styles.dashboardCardValue}>{processed}</Text>
          <Text style={styles.dashboardCardTitle}>Bài giảng đã học</Text>
          <Text style={styles.dashboardCardDesc}>Đã tóm tắt & sơ đồ tư duy</Text>
        </View>

        <View style={styles.dashboardCard}>
          <View style={[styles.dashboardCardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
            <Text style={styles.dashboardCardIcon}>⏱️</Text>
          </View>
          <Text style={styles.dashboardCardValue}>
            {minutes}
            <Text style={{ fontSize: 13, fontWeight: '600' }}> ph</Text>
          </Text>
          <Text style={styles.dashboardCardTitle}>Thời lượng học</Text>
          <Text style={styles.dashboardCardDesc}>Tiết kiệm 80% thời gian</Text>
        </View>

        <View style={styles.dashboardCard}>
          <View style={[styles.dashboardCardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <Text style={styles.dashboardCardIcon}>🎯</Text>
          </View>
          <Text style={styles.dashboardCardValue}>{quizzes}</Text>
          <Text style={styles.dashboardCardTitle}>Câu trắc nghiệm</Text>
          <Text style={styles.dashboardCardDesc}>Bộ ôn tập củng cố kiến thức</Text>
        </View>

        <View style={styles.dashboardCard}>
          <View style={[styles.dashboardCardIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
            <Text style={styles.dashboardCardIcon}>⚡</Text>
          </View>
          <Text style={styles.dashboardCardValue}>{efficiency}</Text>
          <Text style={styles.dashboardCardTitle}>Hiệu quả tiếp thu</Text>
          <Text style={styles.dashboardCardDesc}>Độ chính xác bài ôn tập</Text>
        </View>
      </View>
    </>
  );
}
