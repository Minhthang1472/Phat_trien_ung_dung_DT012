import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
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
  const [busy, setBusy] = useState(false);
  const activeClientId = GOOGLE_CLIENT_IDS.android || GOOGLE_CLIENT_IDS.web;
  const [request, response, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: activeClientId,
    webClientId: GOOGLE_CLIENT_IDS.web,
    androidClientId: activeClientId,
    iosClientId: GOOGLE_CLIENT_IDS.ios || GOOGLE_CLIENT_IDS.web,
  });

  useEffect(() => {
    if (request?.redirectUri) {
      console.log('🔗 GOOGLE_OAUTH_REDIRECT_URI:', request.redirectUri);
    }
  }, [request]);

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

  useEffect(() => {
    loadProfile();
  }, []);

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

  const handleGoogleAuth = () => {
    if (!GOOGLE_CLIENT_IDS.web && !GOOGLE_CLIENT_IDS.android && !GOOGLE_CLIENT_IDS.ios) {
      Alert.alert('Chưa cấu hình Google', 'Vui lòng kiểm tra lại cấu hình Google Client ID.');
      return;
    }
    if (promptGoogle) {
      promptGoogle();
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
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(user.display_name || user.email || 'U')[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.name}>{user.display_name || 'Học viên'}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>

            <Text style={styles.sectionTitle}>THỐNG KÊ HỌC TẬP</Text>
            <View style={styles.statsRow}>
              <Stat value={stats.processed_lectures} label="Bài giảng" />
              <Stat value={stats.total_minutes} label="Phút học" />
              <Stat value={stats.saved_quizzes} label="Câu hỏi" />
            </View>

            <Text style={styles.sectionTitle}>DỮ LIỆU & CẤU HÌNH</Text>
            <TouchableOpacity
              style={styles.action}
              onPress={() =>
                apiService
                  .exportUserConfig()
                  .then(() => Alert.alert('Đã xuất', 'File cấu hình đã sẵn sàng để chia sẻ.'))
                  .catch((e) => Alert.alert('Lỗi xuất file', e.message))
              }
            >
              <Text style={styles.actionText}>Xuất file cấu hình</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleImport}>
              <Text style={styles.actionText}>Nạp file cấu hình</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.action, styles.logout]} onPress={handleLogout}>
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.authCard}>
            <View style={styles.authHeader}>
              <View style={styles.authIconWrap}>
                <Text style={styles.authIcon}>🎓</Text>
              </View>
              <Text style={styles.authTitle}>Tài khoản Google</Text>
              <Text style={styles.authHint}>
                Kết nối với Google để tự động đồng bộ bài giảng, lịch sử học tập và kết quả trắc nghiệm trên mọi thiết bị.
              </Text>
            </View>

            <View style={styles.googleActionGroup}>
              {/* Nút 1: Đăng nhập bằng Google */}
              <TouchableOpacity
                style={styles.googlePrimaryBtn}
                onPress={handleGoogleAuth}
                disabled={busy}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator color="#1f2937" size="small" />
                ) : (
                  <View style={styles.googleBtnContent}>
                    <View style={styles.googleLogoBox}>
                      <Text style={styles.googleLogoLetter}>G</Text>
                    </View>
                    <Text style={styles.googlePrimaryBtnText}>Đăng nhập bằng Google</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Nút 2: Đăng ký bằng Google */}
              <TouchableOpacity
                style={styles.googleSecondaryBtn}
                onPress={handleGoogleAuth}
                disabled={busy}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.googleBtnContent}>
                    <View style={[styles.googleLogoBox, styles.googleLogoBoxAlt]}>
                      <Text style={[styles.googleLogoLetter, styles.googleLogoLetterAlt]}>G</Text>
                    </View>
                    <Text style={styles.googleSecondaryBtnText}>Đăng ký tài khoản với Google</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.securityBadgeRow}>
              <Text style={styles.securityBadgeText}>🔒 Xác thực bảo mật 100% qua Google OAuth</Text>
            </View>

            <Text style={styles.localHint}>
              Bạn vẫn có thể xem và xử lý bài giảng offline khi chưa đăng nhập.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  profileHero: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  email: { color: colors.textSecondary, marginTop: 4 },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statValue: { color: colors.primaryLight, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  action: {
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
  actionText: { color: colors.textPrimary, fontWeight: '600' },
  arrow: { color: colors.primaryLight, fontSize: 24 },
  logout: { justifyContent: 'center', borderColor: colors.danger, marginTop: spacing.sm },
  logoutText: { color: colors.danger, fontWeight: '700' },
  authCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  authIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  authIcon: {
    fontSize: 26,
  },
  authTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  authHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: spacing.xs,
  },
  googleActionGroup: {
    gap: 12,
    marginBottom: spacing.md,
  },
  googlePrimaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  googleSecondaryBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1.5,
    borderColor: '#6366f1',
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleLogoBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogoLetter: {
    fontSize: 13,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleLogoBoxAlt: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  googleLogoLetterAlt: {
    color: '#a5b4fc',
  },
  googlePrimaryBtnText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '800',
  },
  googleSecondaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  securityBadgeRow: {
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  securityBadgeText: {
    color: '#10b981',
    fontSize: 11.5,
    fontWeight: '600',
  },
  localHint: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 11.5,
    marginTop: spacing.sm,
  },
});
