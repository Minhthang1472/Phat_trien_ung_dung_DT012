import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../../constants/theme';
import Icon from '../../ui/Icon';
import IconBadge from '../../ui/IconBadge';
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
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderLeft}>
          <IconBadge icon="stats" size={32} iconSize={18} tone="coral" />
          <Text style={styles.sectionHeaderTitle}>Chỉ số học tập tổng quan</Text>
        </View>
        <View style={styles.sectionHeaderMetaChip}>
          <Text style={styles.sectionHeaderMeta}>Tuần này</Text>
        </View>
      </View>

      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardCard}>
          <View style={[styles.dashboardCardIconBox, { backgroundColor: colors.coralTint }]}>
            <Icon name="library" size={18} color={colors.coral} />
          </View>
          <Text style={styles.dashboardCardValue}>{processed}</Text>
          <Text style={styles.dashboardCardTitle}>Bài giảng đã học</Text>
          <Text style={styles.dashboardCardDesc} numberOfLines={1}>Đã tóm tắt &amp; sơ đồ</Text>
        </View>

        <View style={styles.dashboardCard}>
          <View style={[styles.dashboardCardIconBox, { backgroundColor: colors.mintSoft }]}>
            <Icon name="timer" size={18} color={colors.mintDeep} />
          </View>
          <View style={styles.dashboardCardValueRow}>
            <Text style={[styles.dashboardCardValue, styles.dashboardCardValueInline]}>{minutes}</Text>
            <Text style={styles.dashboardCardUnit}>phút</Text>
          </View>
          <Text style={styles.dashboardCardTitle}>Thời lượng học</Text>
          <Text style={[styles.dashboardCardDesc, styles.dashboardCardDescAccent]} numberOfLines={1}>
            Tiết kiệm 80% thời gian
          </Text>
        </View>

        <View style={styles.dashboardCard}>
          <View style={[styles.dashboardCardIconBox, { backgroundColor: colors.violetSoft }]}>
            <Icon name="quiz" size={18} color={colors.violet} />
          </View>
          <Text style={styles.dashboardCardValue}>{quizzes}</Text>
          <Text style={styles.dashboardCardTitle}>Câu trắc nghiệm</Text>
          <Text style={styles.dashboardCardDesc} numberOfLines={1}>Bộ ôn tập củng cố kiến thức</Text>
        </View>

        <View style={styles.dashboardCard}>
          <View style={[styles.dashboardCardIconBox, { backgroundColor: colors.coralTint }]}>
            <Icon name="bolt" size={18} color={colors.coral} />
          </View>
          <Text style={[styles.dashboardCardValue, { color: colors.coral }]}>{efficiency}</Text>
          <Text style={styles.dashboardCardTitle}>Hiệu quả tiếp thu</Text>
          <Text style={styles.dashboardCardDesc} numberOfLines={1}>Độ chính xác bài ôn tập</Text>
        </View>
      </View>
    </>
  );
}
