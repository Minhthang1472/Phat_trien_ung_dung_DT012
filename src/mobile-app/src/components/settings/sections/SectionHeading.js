import React from 'react';
import { View, Text } from 'react-native';
import IconBadge from '../../ui/IconBadge';
import styles from '../styles/settingsStyles';

/**
 * Tiêu đề nhóm cài đặt: icon tròn + nhãn uppercase, dùng chung cho các section.
 */
export default function SectionHeading({ icon, title, tone = 'coral' }) {
  return (
    <View style={styles.sectionHeadingRow}>
      <IconBadge icon={icon} size={28} iconSize={15} tone={tone} />
      <Text style={styles.sectionHeadingText}>{title}</Text>
    </View>
  );
}
