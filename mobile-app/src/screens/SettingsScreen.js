import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, borderRadius } from '../constants/theme';
import { apiService } from '../services/api';
import Header from '../components/Header';

export default function SettingsScreen({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // States cho Popup Đổi mật khẩu
  const [modalVisible, setModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [changeNewPass, setChangeNewPass] = useState('');
  const [changeConfirmPass, setChangeConfirmPass] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMsg, setChangeMsg] = useState('');
  const [changeError, setChangeError] = useState('');

  const loadUserData = async () => {
    try {
      const saved = await apiService.getSavedUser();
      if (saved) {
        setUser(saved);
        try {
          const profile = await apiService.getProfile();
          if (profile?.user) {
            setUser(profile.user);
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Lỗi tải người dùng trong cài đặt:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleChangePassword = async () => {
    setChangeMsg('');
    setChangeError('');
    if (!oldPassword) {
      setChangeError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!changeNewPass || changeNewPass.length < 8) {
      setChangeError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (changeNewPass !== changeConfirmPass) {
      setChangeError('Mật khẩu nhập lại không khớp.');
      return;
    }
    setChangeLoading(true);
    try {
      const res = await apiService.changePassword(oldPassword, changeNewPass);
      setChangeMsg(res.message || 'Đổi mật khẩu thành công!');
      setOldPassword('');
      setChangeNewPass('');
      setChangeConfirmPass('');
      setTimeout(() => {
        setModalVisible(false);
        setChangeMsg('');
      }, 1500);
    } catch (err) {
      setChangeError(err.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setChangeLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const count = await apiService.importUserConfig(result.assets[0]);
      Alert.alert('Đã nạp cấu hình', `Đã cập nhật ${count} thiết lập an toàn.`);
    } catch (error) {
      Alert.alert('Không thể nạp cấu hình', error.message);
    }
  };

  const performLogout = async () => {
    try {
      await apiService.logout();
    } catch (e) {
      console.warn('Lỗi đăng xuất:', e);
    }
    setUser(null);
    if (onNavigate) {
      onNavigate('Profile');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản trên thiết bị này?') : true;
      if (confirmed) {
        performLogout();
      }
      return;
    }
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản trên thiết bị này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header không có nút quay về vì đã có thanh điều hướng dưới đáy */}
      <Header title="CÀI ĐẶT & BẢO MẬT" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
          </View>
        ) : user ? (
          <>
            {/* Thẻ thông tin tài khoản thu gọn */}
            <View style={styles.profileMiniCard}>
              <View style={styles.avatarMini}>
                <Text style={styles.avatarMiniText}>
                  {(user.display_name || user.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileMiniName}>{user.display_name || 'Học viên'}</Text>
                <Text style={styles.profileMiniEmail}>{user.email}</Text>
              </View>
              <View style={styles.verifiedBadgeSmall}>
                <Text style={styles.verifiedBadgeSmallText}>✓ Active</Text>
              </View>
            </View>

            {/* Nút mở Pop-up Đổi mật khẩu */}
            <Text style={styles.sectionTitle}>🔒 BẢO MẬT TÀI KHOẢN</Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setModalVisible(true);
                setChangeMsg('');
                setChangeError('');
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>🔑</Text>
                <Text style={styles.actionBtnText}>Cập nhật mật khẩu bảo vệ tài khoản</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            {/* Quản lý Cấu hình & Dữ liệu */}
            <Text style={styles.sectionTitle}>⚙️ DỮ LIỆU & SAO LƯU CẤU HÌNH</Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                apiService
                  .exportUserConfig()
                  .then(() => Alert.alert('Đã xuất', 'File cấu hình cá nhân đã sẵn sàng để chia sẻ.'))
                  .catch((e) => Alert.alert('Lỗi xuất file', e.message))
              }
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>📤</Text>
                <Text style={styles.actionBtnText}>Xuất file cấu hình cá nhân</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleImport} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>📥</Text>
                <Text style={styles.actionBtnText}>Nạp file cấu hình từ thiết bị</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            {/* Đăng xuất khỏi tài khoản */}
            <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn]} onPress={handleLogout} activeOpacity={0.7}>
              <Text style={styles.logoutBtnText}>🚪 Đăng xuất khỏi tài khoản</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🔒</Text>
            <Text style={styles.emptyTitle}>Chưa đăng nhập</Text>
            <Text style={styles.emptyDesc}>
              Vui lòng đăng nhập hoặc tạo tài khoản để quản lý cài đặt bảo mật và thông tin cá nhân.
            </Text>
            <TouchableOpacity
              style={styles.loginCtaBtn}
              onPress={() => onNavigate && onNavigate('Profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginCtaText}>👤 Đến trang Đăng nhập / Hồ sơ</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* POP-UP (MODAL) ĐỔI MẬT KHẨU */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🔑</Text>
                <Text style={styles.modalTitle}>Đổi Mật Khẩu</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Nhập mật khẩu hiện tại và mật khẩu mới từ 8 ký tự trở lên để cập nhật bảo vệ tài khoản.
            </Text>

            {changeError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {changeError}</Text>
              </View>
            ) : null}
            {changeMsg ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✓ {changeMsg}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>MẬT KHẨU HIỆN TẠI</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập mật khẩu đang dùng"
                  placeholderTextColor={colors.textMuted}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>MẬT KHẨU MỚI</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>✨</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Tối thiểu 8 ký tự"
                  placeholderTextColor={colors.textMuted}
                  value={changeNewPass}
                  onChangeText={setChangeNewPass}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>XÁC NHẬN MẬT KHẨU MỚI</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>🔐</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor={colors.textMuted}
                  value={changeConfirmPass}
                  onChangeText={setChangeConfirmPass}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, changeLoading && styles.submitBtnDisabled]}
                onPress={handleChangePassword}
                disabled={changeLoading}
                activeOpacity={0.8}
              >
                {changeLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Xác nhận đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  loadingBox: {
    paddingTop: 80,
    alignItems: 'center',
  },
  profileMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 12,
  },
  avatarMini: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  profileMiniName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  profileMiniEmail: {
    color: colors.textSecondary,
    fontSize: 12.5,
    marginTop: 2,
  },
  verifiedBadgeSmall: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedBadgeSmallText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  actionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  actionBtnText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  arrow: {
    color: colors.primaryLight,
    fontSize: 22,
  },
  logoutBtn: {
    justifyContent: 'center',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    marginTop: spacing.sm,
  },
  logoutBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  loginCtaBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  loginCtaText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  /* Modal Pop-up styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#111827',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  modalDesc: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  inputField: {
    marginBottom: 12,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1.4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: 10,
  },
  successText: {
    color: colors.success,
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
});
