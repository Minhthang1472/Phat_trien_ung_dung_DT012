import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { colors } from '../constants/theme';
import { apiService } from '../services/api';
import Header from '../components/Header';
import AuraBackground from '../components/ui/AuraBackground';
import {
  styles,
  ChangePasswordModal,
  SystemInfoModal,
  LegalInfoModal,
  StorageSection,
  DataBackupSection,
  InfoLinksSection,
  AccountSecuritySection,
} from '../components/settings';

const SAF = LegacyFileSystem?.StorageAccessFramework || FileSystem?.StorageAccessFramework;

export default function SettingsScreen({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [defaultExportDir, setDefaultExportDir] = useState({ uri: null, name: null });
  const [serverOnline, setServerOnline] = useState(false);
  const [localLectureCount, setLocalLectureCount] = useState(0);

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
    apiService
      .checkServerHealth()
      .then((res) => setServerOnline(!!res?.online))
      .catch(() => setServerOnline(false));
    apiService
      .getLocalHistory()
      .then((history) => setLocalLectureCount(Array.isArray(history) ? history.length : 0))
      .catch(() => setLocalLectureCount(0));
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
      <AuraBackground />
      <Header title="CÀI ĐẶT" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tiêu đề trang + trạng thái máy chủ */}
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Cài đặt Hệ thống</Text>
            <Text style={styles.pageSubtitle}>Tùy biến bộ nhớ &amp; đồng bộ bài học</Text>
          </View>
          <View style={styles.readyPill}>
            <View style={[styles.readyDot, !serverOnline && { backgroundColor: colors.muted }]} />
            <Text style={styles.readyPillText}>
              {serverOnline ? 'MÁY CHỦ SẴN SÀNG' : 'NGOẠI TUYẾN'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.coral} />
          </View>
        ) : (
          <>
            <StorageSection
              defaultExportDir={defaultExportDir}
              localLectureCount={localLectureCount}
              handlePickDefaultFolder={handlePickDefaultFolder}
              handleClearDefaultFolder={handleClearDefaultFolder}
              styles={styles}
            />

            <DataBackupSection
              handleClearHistory={handleClearHistory}
              handleImport={handleImport}
              styles={styles}
            />

            <InfoLinksSection
              onOpenSystemInfo={() => setSystemInfoVisible(true)}
              onOpenLegalInfo={() => setLegalInfoVisible(true)}
              styles={styles}
            />

            <AccountSecuritySection
              user={user}
              onOpenChangePassword={() => {
                setModalVisible(true);
                setChangeMsg('');
                setChangeError('');
              }}
              handleLogout={handleLogout}
              styles={styles}
            />

            {/* Footer thương hiệu */}
            <View style={styles.footerNote}>
              <View style={styles.footerNoteRow}>
                <Text style={styles.footerNoteText}>♥</Text>
                <Text style={styles.footerNoteText}>Được thiết kế cho trải nghiệm học tập vui vẻ</Text>
              </View>
              <Text style={styles.footerCopyright}>Bản quyền © 2026 EdTech AI Inc.</Text>
            </View>
          </>
        )}
      </ScrollView>

      <ChangePasswordModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        oldPassword={oldPassword}
        setOldPassword={setOldPassword}
        changeNewPass={changeNewPass}
        setChangeNewPass={setChangeNewPass}
        changeConfirmPass={changeConfirmPass}
        setChangeConfirmPass={setChangeConfirmPass}
        changeLoading={changeLoading}
        changeMsg={changeMsg}
        changeError={changeError}
        onSubmit={handleChangePassword}
        styles={styles}
      />

      <SystemInfoModal
        visible={systemInfoVisible}
        onClose={() => setSystemInfoVisible(false)}
        styles={styles}
      />

      <LegalInfoModal
        visible={legalInfoVisible}
        onClose={() => setLegalInfoVisible(false)}
        styles={styles}
      />
    </View>
  );
}
