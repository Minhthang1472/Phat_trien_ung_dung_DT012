import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../../constants/theme';
import styles from '../styles/profileStyles';

/**
 * Khối Phân bổ Ngôn ngữ & Tính năng AI (Tóm tắt, Trắc nghiệm, Sơ đồ tư duy)
 */
export default function ProfileAnalyticsSection({
  stats = {},
  langStats = { vi: 0, en: 0 },
  featureStats = { summary: 0, quiz: 0, mindmap: 0 },
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>🌐 PHÂN BỔ NGÔN NGỮ & ĐỊNH DẠNG</Text>
      <View style={styles.analyticsCard}>
        {(stats.processed_lectures || 0) === 0 && (
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 12, fontStyle: 'italic' }}>
            Chưa có dữ liệu bài giảng. Hãy xử lý bài giảng đầu tiên để theo dõi phân bổ học tập!
          </Text>
        )}

        <View style={styles.analyticRow}>
          <View style={styles.analyticLabelWrap}>
            <Text style={styles.analyticLabel}>🇻🇳 Tiếng Việt</Text>
            <Text style={styles.analyticValue}>{langStats.vi}%</Text>
          </View>
          <View style={styles.analyticBar}>
            <View style={[styles.analyticFill, { width: `${langStats.vi}%`, backgroundColor: '#6366f1' }]} />
          </View>
        </View>

        <View style={styles.analyticRow}>
          <View style={styles.analyticLabelWrap}>
            <Text style={styles.analyticLabel}>🇺🇸 Tiếng Anh</Text>
            <Text style={styles.analyticValue}>{langStats.en}%</Text>
          </View>
          <View style={styles.analyticBar}>
            <View style={[styles.analyticFill, { width: `${langStats.en}%`, backgroundColor: '#ec4899' }]} />
          </View>
        </View>

        <View style={styles.analyticDivider} />

        <View style={styles.featureBreakdown}>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>📝</Text>
            <Text style={styles.featureTitle}>Tóm tắt AI</Text>
            <Text style={styles.featureTag}>{featureStats.summary}%</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🧠</Text>
            <Text style={styles.featureTitle}>Trắc nghiệm</Text>
            <Text style={styles.featureTag}>{featureStats.quiz}%</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🗺️</Text>
            <Text style={styles.featureTitle}>Mindmap</Text>
            <Text style={styles.featureTag}>{featureStats.mindmap}%</Text>
          </View>
        </View>
      </View>
    </>
  );
}
