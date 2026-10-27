import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/theme';
import Icon from '../../ui/Icon';
import SectionHeading from './SectionHeading';

export default function InfoLinksSection({
  onOpenSystemInfo,
  onOpenLegalInfo,
  styles,
}) {
  return (
    <>
      <SectionHeading icon="info" title="THÔNG TIN & ĐIỀU KHOẢN" tone="neutral" />
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onOpenSystemInfo}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: colors.surfaceContainer }]}>
          <Icon name="info" size={18} color={colors.slate} />
        </View>
        <View style={styles.actionTextCol}>
          <Text style={styles.actionBtnText}>Thông tin hệ thống</Text>
          <Text style={styles.actionBtnDesc}>Phiên bản, công nghệ và đội ngũ phát triển</Text>
        </View>
        <View style={styles.actionBadge}>
          <Text style={styles.actionBadgeText}>MỚI NHẤT</Text>
        </View>
        <Icon name="chevronRight" size={20} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onOpenLegalInfo}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: colors.violetSoft }]}>
          <Icon name="gavel" size={18} color={colors.violet} />
        </View>
        <View style={styles.actionTextCol}>
          <Text style={styles.actionBtnText}>Thông tin pháp lý &amp; Quyền riêng tư</Text>
          <Text style={styles.actionBtnDesc}>Bảo vệ dữ liệu song ngữ cá nhân</Text>
        </View>
        <Icon name="chevronRight" size={20} color={colors.muted} />
      </TouchableOpacity>
    </>
  );
}
