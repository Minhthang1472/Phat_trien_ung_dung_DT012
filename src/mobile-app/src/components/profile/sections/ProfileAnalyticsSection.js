import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../../constants/theme';
import Icon from '../../ui/Icon';
import IconBadge from '../../ui/IconBadge';
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
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderLeft}>
          <IconBadge icon="translate" size={32} iconSize={18} tone="mint" />
          <Text style={styles.sectionHeaderTitle}>Phân bổ ngôn ngữ &amp; Định dạng</Text>
        </View>
      </View>

      <View style={styles.analyticsCard}>
        {(stats.processed_lectures || 0) === 0 && (
          <Text style={styles.emptyNote}>
            Chưa có dữ liệu bài giảng. Hãy xử lý bài giảng đầu tiên để theo dõi phân bổ học tập!
          </Text>
        )}

        <View style={styles.analyticRow}>
          <View style={styles.analyticLabelWrap}>
            <View style={styles.analyticLabelRow}>
              <View style={[styles.analyticDot, { backgroundColor: colors.mint }]} />
              <Text style={styles.analyticLabel}>Tiếng Việt</Text>
            </View>
            <Text style={styles.analyticValue}>{langStats.vi}%</Text>
          </View>
          <View style={styles.analyticBar}>
            <View style={[styles.analyticFill, { width: `${langStats.vi}%`, backgroundColor: colors.mint }]} />
          </View>
        </View>

        <View style={styles.analyticRow}>
          <View style={styles.analyticLabelWrap}>
            <View style={styles.analyticLabelRow}>
              <View style={[styles.analyticDot, { backgroundColor: colors.coral }]} />
              <Text style={styles.analyticLabel}>Tiếng Anh</Text>
            </View>
            <Text style={styles.analyticValue}>{langStats.en}%</Text>
          </View>
          <View style={styles.analyticBar}>
            <View style={[styles.analyticFill, { width: `${langStats.en}%`, backgroundColor: colors.coral }]} />
          </View>
        </View>

        <View style={styles.analyticDivider} />

        <View style={styles.featureBreakdown}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: colors.coralTint }]}>
              <Icon name="summary" size={17} color={colors.coral} />
            </View>
            <Text style={styles.featureTitle}>Tóm tắt nội dung</Text>
            <Text style={[styles.featureTag, { color: colors.coral }]}>{featureStats.summary}%</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: colors.violetSoft }]}>
              <Icon name="quiz" size={17} color={colors.violet} />
            </View>
            <Text style={styles.featureTitle}>Trắc nghiệm</Text>
            <Text style={[styles.featureTag, { color: colors.violet }]}>{featureStats.quiz}%</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: colors.mintSoft }]}>
              <Icon name="mindmap" size={17} color={colors.mintDeep} />
            </View>
            <Text style={styles.featureTitle}>Mindmap</Text>
            <Text style={styles.featureTag}>{featureStats.mindmap}%</Text>
          </View>
        </View>
      </View>
    </>
  );
}
