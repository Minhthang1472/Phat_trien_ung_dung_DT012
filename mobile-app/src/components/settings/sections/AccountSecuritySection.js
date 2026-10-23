import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function AccountSecuritySection({
  user,
  onOpenChangePassword,
  handleLogout,
  styles,
}) {
  if (!user) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>🔒 BẢO MẬT TÀI KHOẢN</Text>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onOpenChangePassword}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18 }}>🔑</Text>
          <Text style={styles.actionBtnText}>Cập nhật mật khẩu bảo vệ tài khoản</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.logoutBtn]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutBtnText}>🚪 Đăng xuất khỏi tài khoản</Text>
      </TouchableOpacity>
    </>
  );
}
