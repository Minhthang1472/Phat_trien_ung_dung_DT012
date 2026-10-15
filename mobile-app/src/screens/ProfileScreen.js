import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { colors, spacing, borderRadius } from '../constants/theme';
import { GOOGLE_CLIENT_IDS } from '../constants/config';
import { apiService } from '../services/api';
import Header from '../components/Header';

WebBrowser.maybeCompleteAuthSession();

export default function ProfileScreen({ onBack }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ processed_lectures: 0, total_minutes: 0, saved_quizzes: 0 });
  const [loginMode, setLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [request, response, promptGoogle] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
  });

  const loadProfile = async () => {
    const saved = await apiService.getSavedUser();
    if (!saved) return;
    try {
      const profile = await apiService.getProfile();
      setUser(profile.user);
      setStats(profile.stats || stats);
    } catch (_) {
      setUser(saved);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    const idToken = response?.params?.id_token;
    if (response?.type === 'success' && idToken) {
      setBusy(true);
      apiService.loginWithGoogle(idToken)
        .then((googleUser) => setUser(googleUser))
        .catch((error) => Alert.alert('Google đăng nhập thất bại', error.message))
        .finally(() => setBusy(false));
    }
  }, [response]);

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Gmail và mật khẩu.');
      return;
    }
    setBusy(true);
    try {
      if (!loginMode) {
        const result = await apiService.register(email, password, displayName);
        Alert.alert('Kiểm tra Gmail', result.message);
        setLoginMode(true);
        return;
      }
      const result = await apiService.login(email, password);
      setUser(result);
      await loadProfile();
      setPassword('');
    } catch (error) {
      Alert.alert(loginMode ? 'Đăng nhập thất bại' : 'Đăng ký thất bại', error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Thiếu Gmail', 'Nhập Gmail trước khi yêu cầu đặt lại mật khẩu.');
      return;
    }
    try {
      const result = await apiService.forgotPassword(email);
      Alert.alert('Đã gửi yêu cầu', result.message);
    } catch (error) {
      Alert.alert('Không thể gửi email', error.message);
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

  const handleLogout = async () => {
    await apiService.logout();
    setUser(null);
    setStats({ processed_lectures: 0, total_minutes: 0, saved_quizzes: 0 });
  };

  return (
    <View style={styles.container}>
      <Header title="HỒ SƠ NGƯỜI DÙNG" showBack onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {user ? (
          <>
            <View style={styles.profileHero}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{(user.display_name || 'U')[0].toUpperCase()}</Text></View>
              <Text style={styles.name}>{user.display_name}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
            <Text style={styles.sectionTitle}>THỐNG KÊ HỌC TẬP</Text>
            <View style={styles.statsRow}>
              <Stat value={stats.processed_lectures} label="Bài giảng" />
              <Stat value={stats.total_minutes} label="Phút học" />
              <Stat value={stats.saved_quizzes} label="Câu hỏi" />
            </View>
            <Text style={styles.sectionTitle}>DỮ LIỆU & CẤU HÌNH</Text>
            <TouchableOpacity style={styles.action} onPress={() => apiService.exportUserConfig().then(() => Alert.alert('Đã xuất', 'File cấu hình đã sẵn sàng để chia sẻ.')).catch((e) => Alert.alert('Lỗi xuất file', e.message))}>
              <Text style={styles.actionText}>Xuất file cấu hình</Text><Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={handleImport}>
              <Text style={styles.actionText}>Nạp file cấu hình</Text><Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.action, styles.logout]} onPress={handleLogout}>
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>{loginMode ? 'Đăng nhập hệ sinh thái' : 'Tạo tài khoản Gmail'}</Text>
            <Text style={styles.authHint}>Dùng Gmail để đồng bộ hồ sơ, thống kê và dữ liệu học tập.</Text>
            {!loginMode && <TextInput style={styles.input} placeholder="Tên hiển thị" placeholderTextColor={colors.textMuted} value={displayName} onChangeText={setDisplayName} />}
            <TextInput style={styles.input} placeholder="you@gmail.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Mật khẩu tối thiểu 8 ký tự" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
            <TouchableOpacity style={styles.primary} onPress={handleAuth} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{loginMode ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'}</Text>}
            </TouchableOpacity>
            {loginMode && <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => {
                if (!GOOGLE_CLIENT_IDS.web && !GOOGLE_CLIENT_IDS.android && !GOOGLE_CLIENT_IDS.ios) {
                  Alert.alert('Chưa cấu hình Google', 'Thêm EXPO_PUBLIC_GOOGLE_*_CLIENT_ID trước khi đăng nhập Google.');
                  return;
                }
                promptGoogle();
              }}
              disabled={busy || !request}
            >
              <Text style={styles.googleText}>G  Tiếp tục với Google</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLoginMode((value) => !value)}>
              <Text style={styles.switchText}>{loginMode ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}</Text>
            </TouchableOpacity>
            <Text style={styles.localHint}>Bạn vẫn có thể dùng bài giảng local khi chưa đăng nhập.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  profileHero: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  email: { color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  statValue: { color: colors.primaryLight, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  action: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  actionText: { color: colors.textPrimary, fontWeight: '600' },
  arrow: { color: colors.primaryLight, fontSize: 24 },
  logout: { justifyContent: 'center', borderColor: colors.danger, marginTop: spacing.sm },
  logoutText: { color: colors.danger, fontWeight: '700' },
  authCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.lg, padding: spacing.lg, marginTop: spacing.xl },
  authTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: spacing.xs },
  authHint: { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.md, color: colors.textPrimary, padding: spacing.md, marginBottom: spacing.sm },
  primary: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  primaryText: { color: '#fff', fontWeight: '800' },
  switchText: { color: colors.primaryLight, textAlign: 'center', marginTop: spacing.md, fontWeight: '600' },
  forgotText: { color: colors.primaryLight, textAlign: 'right', marginTop: spacing.md, fontSize: 12 },
  googleButton: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm, backgroundColor: '#fff' },
  googleText: { color: '#1f2937', fontWeight: '800' },
  localHint: { color: colors.textMuted, textAlign: 'center', fontSize: 12, marginTop: spacing.lg },
});
