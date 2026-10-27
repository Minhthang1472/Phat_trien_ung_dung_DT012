import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/theme';
import Icon from '../../ui/Icon';
import SectionHeading from './SectionHeading';

export default function AccountSecuritySection({
  user,
  onOpenChangePassword,
  handleLogout,
  styles,
}) {
  if (!user) return null;

  return (
    <>
      <SectionHeading icon="lock" title="BẢO MẬT TÀI KHOẢN" tone="neutral" />
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onOpenChangePassword}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: colors.coralTint }]}>
          <Icon name="key" size={18} color={colors.coralDeep} />
        </View>
        <View style={styles.actionTextCol}>
          <Text style={styles.actionBtnText}>Cập nhật mật khẩu bảo vệ</Text>
          <Text style={styles.actionBtnDesc}>Thay đổi mật khẩu định kỳ để bảo vệ tài khoản</Text>
        </View>
        <Icon name="chevronRight" size={20} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.logoutBtn]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Icon name="logout" size={17} color={colors.coralDeep} />
        <Text style={styles.logoutBtnText}>Đăng xuất khỏi tài khoản</Text>
      </TouchableOpacity>
    </>
  );
}
