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
import * as FileSystem from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { colors, spacing, borderRadius } from '../constants/theme';
import { apiService } from '../services/api';
import Header from '../components/Header';

const SAF = LegacyFileSystem?.StorageAccessFramework || FileSystem?.StorageAccessFramework;

export default function SettingsScreen({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [defaultExportDir, setDefaultExportDir] = useState({ uri: null, name: null });

  // States cho Popup Đổi mật khẩu
  const [modalVisible, setModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [changeNewPass, setChangeNewPass] = useState('');
  const [changeConfirmPass, setChangeConfirmPass] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMsg, setChangeMsg] = useState('');
  const [changeError, setChangeError] = useState('');

  // States cho Popup Thông tin hệ thống & Thông tin pháp lý
  const [systemInfoVisible, setSystemInfoVisible] = useState(false);
  const [legalInfoVisible, setLegalInfoVisible] = useState(false);

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
        } catch (_) { }
      }
    } catch (e) {
      console.warn('Lỗi tải người dùng trong cài đặt:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultFolder = async () => {
    try {
      const dir = await apiService.getDefaultExportDir();
      if (dir) {
        setDefaultExportDir(dir);
      }
    } catch (_) { }
  };

  useEffect(() => {
    loadUserData();
    loadDefaultFolder();
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

  const handlePickDefaultFolder = async () => {
    if (Platform.OS === 'android') {
      try {
        if (SAF && typeof SAF.requestDirectoryPermissionsAsync === 'function') {
          const permissions = await SAF.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const uri = permissions.directoryUri;
            let friendlyName = 'Thư mục đã chọn';
            try {
              const decoded = decodeURIComponent(uri);
              const parts = decoded.split(':');
              if (parts.length > 1) {
                friendlyName = parts[parts.length - 1] || 'Thư mục đã chọn';
              }
            } catch (_) { }
            await apiService.setDefaultExportDir(uri, friendlyName);
            setDefaultExportDir({ uri, name: friendlyName });
            Alert.alert('Thành công', `Đã cài đặt "${friendlyName}" làm thư mục tải về mặc định!`);
            return;
          }
        } else if (FileSystem.Directory && typeof FileSystem.Directory.pickDirectoryAsync === 'function') {
          const dir = await FileSystem.Directory.pickDirectoryAsync();
          if (dir && dir.uri) {
            const friendlyName = dir.name || 'Thư mục đã chọn';
            await apiService.setDefaultExportDir(dir.uri, friendlyName);
            setDefaultExportDir({ uri: dir.uri, name: friendlyName });
            Alert.alert('Thành công', `Đã cài đặt "${friendlyName}" làm thư mục tải về mặc định!`);
            return;
          }
        } else {
          Alert.alert('Thông báo', 'Hệ thống hiện tại chưa hỗ trợ bộ chọn thư mục trực tiếp.');
        }
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể chọn thư mục: ' + e.message);
      }
    } else {
      Alert.alert(
        'Thông báo',
        'Trên trình duyệt Web, file tải về (phụ đề .srt/.vtt, tóm tắt .txt) sẽ tự động lưu vào thư mục Downloads mặc định của thiết bị.'
      );
    }
  };

  const handleClearDefaultFolder = async () => {
    await apiService.clearDefaultExportDir();
    setDefaultExportDir({ uri: null, name: null });
    Alert.alert('Đã hủy', 'Đã hủy thư mục mặc định. Ứng dụng sẽ hỏi vị trí lưu mỗi khi tải file.');
  };

  const handleClearHistory = () => {
    const message = 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử bài giảng đã lưu trong bộ nhớ tạm trên thiết bị này không?';
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(message) : true;
      if (confirmed) {
        apiService.clearLocalHistory().then(() => {
          Alert.alert('Đã xóa', 'Bộ nhớ đệm lịch sử bài giảng đã được làm sạch.');
        });
      }
      return;
    }
    Alert.alert('Xóa bộ nhớ đệm', message, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa ngay',
        style: 'destructive',
        onPress: async () => {
          await apiService.clearLocalHistory();
          Alert.alert('Đã xóa', 'Bộ nhớ đệm lịch sử bài giảng đã được làm sạch.');
        },
      },
    ]);
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
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản trên thiết bị này?')
          : true;
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
      <Header title="CÀI ĐẶT HỆ THỐNG" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
          </View>
        ) : (
          <>
            {/* Mục 1: Thư mục lưu file tải về mặc định */}
            <Text style={styles.sectionTitle}>📁 THƯ MỤC TẢI VỀ MẶC ĐỊNH</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionDesc}>
                Thiết lập thư mục cố định để tự động lưu phụ đề (.srt, .vtt), tài liệu (.txt) và video (.mp4) mà không cần hỏi lại mỗi lần:
              </Text>

              {defaultExportDir?.uri ? (
                <View style={styles.dirSelectedCard}>
                  <View style={styles.dirSelectedInfo}>
                    <Text style={styles.dirSelectedIcon}>📂</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dirSelectedName} numberOfLines={1}>
                        {defaultExportDir.name || 'Thư mục đã chọn'}
                      </Text>
                      <Text style={styles.dirSelectedSub}>
                        ✓ Đang bật chế độ tự động lưu vào đây
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dirActionRow}>
                    <TouchableOpacity
                      style={styles.dirChangeBtn}
                      onPress={handlePickDefaultFolder}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dirChangeBtnText}>🔄 Đổi thư mục</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dirRemoveBtn}
                      onPress={handleClearDefaultFolder}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dirRemoveBtnText}>✕ Hủy mặc định</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.dirEmptyCard}>
                  <Text style={styles.dirEmptyDesc}>
                    Trạng thái: Chưa chọn (ứng dụng sẽ mở bảng hỏi vị trí lưu mỗi khi tải).
                  </Text>
                  <TouchableOpacity
                    style={styles.dirPickBtn}
                    onPress={handlePickDefaultFolder}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dirPickBtnText}>📁 Chọn thư mục lưu mặc định ngay</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Mục 2: Quản lý dữ liệu & Bộ nhớ */}
            <Text style={styles.sectionTitle}>🧹 QUẢN LÝ DỮ LIỆU & BỘ NHỚ</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionDesc}>
                Làm sạch dữ liệu lưu tạm trên máy khi cần thiết lập lại hoặc giải phóng dung lượng:
              </Text>
              <TouchableOpacity
                style={styles.clearCacheBtn}
                onPress={handleClearHistory}
                activeOpacity={0.7}
              >
                <Text style={styles.clearCacheText}>🗑️ Xóa bộ nhớ đệm lịch sử bài giảng</Text>
              </TouchableOpacity>
            </View>

            {/* Mục 3: Sao lưu & Cấu hình cá nhân */}
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

            {/* Mục 4: Thông tin hệ thống & Pháp lý (Thay thế khối trạng thái cũ) */}
            <Text style={styles.sectionTitle}>ℹ️ THÔNG TIN & ĐIỀU KHOẢN</Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setSystemInfoVisible(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>ℹ️</Text>
                <Text style={styles.actionBtnText}>Thông tin hệ thống</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setLegalInfoVisible(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>⚖️</Text>
                <Text style={styles.actionBtnText}>Thông tin pháp lý & Quyền riêng tư</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            {/* Mục 5: Tài khoản & Bảo mật */}
            {user ? (
              <>
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

                <TouchableOpacity
                  style={[styles.actionBtn, styles.logoutBtn]}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <Text style={styles.logoutBtnText}>🚪 Đăng xuất khỏi tài khoản</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </>
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

      {/* POP-UP (MODAL) THÔNG TIN HỆ THỐNG */}
      <Modal
        visible={systemInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSystemInfoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>ℹ️</Text>
                <Text style={styles.modalTitle}>Thông Tin Hệ Thống</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSystemInfoVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={styles.infoBadgeBanner}>
                <Text style={styles.infoBadgeTitle}>HỆ THỐNG PHỤ ĐỀ & TÓM TẮT BÀI GIẢNG AI</Text>
                <Text style={styles.infoBadgeSub}>Phiên bản hoàn thiện: v1.2.0 (Build 2026)</Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionHead}>⚙️ CÔNG NGHỆ CỐT LÕI</Text>
                <View style={styles.infoRowItem}>
                  <Text style={styles.infoRowKey}>Nhận dạng tiếng nói (ASR):</Text>
                  <Text style={styles.infoRowVal}>OpenAI Whisper Engine (CUDA/CPU)</Text>
                </View>
                <View style={styles.infoRowItem}>
                  <Text style={styles.infoRowKey}>Xử lý ngôn ngữ tự nhiên (NLP):</Text>
                  <Text style={styles.infoRowVal}>Mô-đun AI Tóm tắt & Tạo trắc nghiệm</Text>
                </View>
                <View style={styles.infoRowItem}>
                  <Text style={styles.infoRowKey}>Cơ sở dữ liệu đám mây:</Text>
                  <Text style={styles.infoRowVal}>Google Firebase Firestore</Text>
                </View>
                <View style={styles.infoRowItem}>
                  <Text style={styles.infoRowKey}>Bảo mật & Xác thực:</Text>
                  <Text style={styles.infoRowVal}>Mã hóa Bcrypt + OTP Email 6 chữ số</Text>
                </View>
                <View style={styles.infoRowItem}>
                  <Text style={styles.infoRowKey}>Nền tảng hỗ trợ:</Text>
                  <Text style={styles.infoRowVal}>Mobile App, Web App, Extension</Text>
                </View>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionHead}>🎓 ĐỀ TÀI NGHIÊN CỨU & PHÁT TRIỂN</Text>
                <View style={styles.infoRowItem}>
                  <Text style={styles.infoRowKey}>Cơ quan chủ quản:</Text>
                  <Text style={styles.infoRowVal}>Khoa CNTT - Đại học Lạc Hồng (LHU)</Text>
                </View>
                <View style={styles.infoRowItem}>
                  <Text style={styles.infoRowKey}>Giảng viên hướng dẫn:</Text>
                  <Text style={styles.infoRowVal}>ThS. Phan Mạnh Thường</Text>
                </View>
                <View style={styles.infoRowItem}>
                  <Text style={styles.infoRowKey}>Sinh viên thực hiện:</Text>
                  <Text style={styles.infoRowVal}>Võ Trần Minh Thắng (Trưởng nhóm)</Text>
                </View>
                <View style={styles.infoRowItem}>
                  <Text style={styles.infoRowKey}>Thành viên phối hợp:</Text>
                  <Text style={styles.infoRowVal}>Vũ Đình Khánh Long</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setSystemInfoVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryBtnText}>Đóng thông tin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* POP-UP (MODAL) THÔNG TIN PHÁP LÝ & QUYỀN RIÊNG TƯ */}
      <Modal
        visible={legalInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLegalInfoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>⚖️</Text>
                <Text style={styles.modalTitle}>Thông Tin Pháp Lý</Text>
              </View>
              <TouchableOpacity
                onPress={() => setLegalInfoVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={styles.legalBox}>
                <Text style={styles.legalBoxTitle}>1. Mục đích & Điều khoản sử dụng</Text>
                <Text style={styles.legalBoxBody}>
                  Ứng dụng và tiện ích mở rộng được phát triển cho mục đích học tập, nghiên cứu học thuật phi thương mại. Người dùng cam kết sử dụng công cụ hỗ trợ để nghe hiểu, tóm tắt và ôn tập kiến thức từ bài giảng công khai.
                </Text>
              </View>

              <View style={styles.legalBox}>
                <Text style={styles.legalBoxTitle}>2. Quyền sở hữu trí tuệ & Bản quyền nội dung</Text>
                <Text style={styles.legalBoxBody}>
                  Bản quyền video, hình ảnh và âm thanh gốc thuộc quyền sở hữu của các tác giả, kênh phát hành trên nền tảng (YouTube,...). Hệ thống không lưu trữ trái phép hay phân phối lại toàn bộ tệp phương tiện phục vụ mục đích thương mại.
                </Text>
              </View>

              <View style={styles.legalBox}>
                <Text style={styles.legalBoxTitle}>3. Chính sách bảo mật & Quyền riêng tư</Text>
                <Text style={styles.legalBoxBody}>
                  Toàn bộ thông tin tài khoản, mật khẩu đăng nhập đều được mã hóa bảo mật. Dữ liệu lịch sử bài giảng, tóm tắt và kết quả trắc nghiệm chỉ được lưu trữ cho mục đích hỗ trợ học tập cá nhân và không bị chia sẻ cho bên thứ ba.
                </Text>
              </View>

              <View style={styles.legalBox}>
                <Text style={styles.legalBoxTitle}>4. Giấy phép mã nguồn</Text>
                <Text style={styles.legalBoxBody}>
                  Dự án thuộc đề tài môn học Phát triển Ứng dụng - Đại học Lạc Hồng. Tuân thủ giấy phép phần mềm mã nguồn mở MIT License dành cho mục đích giáo dục và nghiên cứu.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setLegalInfoVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalPrimaryBtnText}>Tôi đã hiểu & Đóng</Text>
            </TouchableOpacity>
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
  sectionCard: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  sectionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  dirSelectedCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: 4,
  },
  dirSelectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dirSelectedIcon: {
    fontSize: 24,
  },
  dirSelectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  dirSelectedSub: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
  },
  dirActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: spacing.xs,
  },
  dirChangeBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
  },
  dirChangeBtnText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  dirRemoveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
  },
  dirRemoveBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  dirEmptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: 4,
  },
  dirEmptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  dirPickBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  dirPickBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  clearCacheBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.md,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  clearCacheText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  statusList: {
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusLabel: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 12.5,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  guestCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  guestTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  guestDesc: {
    color: colors.textMuted,
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  guestLoginBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    borderRadius: borderRadius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  guestLoginBtnText: {
    color: colors.primaryLight,
    fontSize: 12.5,
    fontWeight: '700',
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
  infoBadgeBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoBadgeTitle: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  infoBadgeSub: {
    color: '#a5b4fc',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoSectionHead: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 6,
  },
  infoRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    flexWrap: 'wrap',
    gap: 4,
  },
  infoRowKey: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  infoRowVal: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
  },
  modalPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  legalBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  legalBoxTitle: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  legalBoxBody: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});

