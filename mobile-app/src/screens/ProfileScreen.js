import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
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

export default function ProfileScreen({ onBack, onAuthSuccess, onSkip, allowSkip = true }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ processed_lectures: 0, total_minutes: 0, saved_quizzes: 0 });
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'verify_otp' | 'forgot_password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [busyGoogle, setBusyGoogle] = useState(false);

  // States cho Xác minh OTP và Quên mật khẩu
  const [otp, setOtp] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Nhập email, 2: Nhập OTP & Mật khẩu mới
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // States cho Đổi mật khẩu trong tài khoản
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [changeNewPass, setChangeNewPass] = useState('');
  const [changeConfirmPass, setChangeConfirmPass] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMsg, setChangeMsg] = useState('');
  const [changeError, setChangeError] = useState('');

  const activeClientId = GOOGLE_CLIENT_IDS.android || GOOGLE_CLIENT_IDS.web;
  const [request, response, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: activeClientId,
    webClientId: GOOGLE_CLIENT_IDS.web,
    androidClientId: activeClientId,
    iosClientId: GOOGLE_CLIENT_IDS.ios || GOOGLE_CLIENT_IDS.web,
  });

  const loadProfile = async () => {
    try {
      const saved = await apiService.getSavedUser();
      if (!saved) return;
      setUser(saved);
      try {
        const profile = await apiService.getProfile();
        if (profile?.user) {
          setUser(profile.user);
        }
        if (profile?.stats) {
          setStats(profile.stats);
        }
      } catch (_) {
        // Offline or token expired fallback
      }
    } catch (e) {
      console.warn('Lỗi tải thông tin tài khoản:', e);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const idToken = response?.params?.id_token;
    if (response?.type === 'success' && idToken) {
      setBusyGoogle(true);
      apiService.loginWithGoogle(idToken)
        .then((googleUser) => {
          setUser(googleUser);
          setErrorMessage('');
          setSuccessMessage('Đăng nhập Google thành công!');
          if (onAuthSuccess) {
            setTimeout(() => onAuthSuccess(googleUser), 500);
          }
        })
        .catch((error) => Alert.alert('Google đăng nhập thất bại', error.message))
        .finally(() => setBusyGoogle(false));
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

  const handleLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const trimmedIdent = email.trim();
    if (!trimmedIdent) {
      setErrorMessage('Vui lòng nhập tên đăng nhập hoặc email.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.login(trimmedIdent, password);
      if (res?.user) {
        setUser(res.user);
        setSuccessMessage('Đăng nhập thành công!');
        setPassword('');
        if (onAuthSuccess) {
          setTimeout(() => onAuthSuccess(res.user), 400);
        } else {
          loadProfile();
        }
      } else {
        setErrorMessage('Không nhận được thông tin phiên đăng nhập.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const trimmedEmail = email.trim();
    const trimmedUsername = displayName.trim();

    if (!trimmedUsername) {
      setErrorMessage('Vui lòng nhập tên đăng nhập.');
      return;
    }
    if (trimmedUsername.length < 3) {
      setErrorMessage('Tên đăng nhập cần tối thiểu 3 ký tự.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Mật khẩu phải có độ dài từ 8 ký tự trở lên.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.register(trimmedEmail, password, trimmedUsername);
      if (res?.user) {
        setUser(res.user);
        setSuccessMessage('Đăng ký tài khoản thành công!');
        setPassword('');
        setConfirmPassword('');
        if (onAuthSuccess) {
          setTimeout(() => onAuthSuccess(res.user), 500);
        } else {
          loadProfile();
        }
      } else if (res?.requires_verification) {
        setAuthMode('verify_otp');
        setOtp('');
        setSuccessMessage(res.message || 'Đã gửi mã OTP xác minh qua email!');
      } else {
        setSuccessMessage('Đăng ký thành công! Hãy đăng nhập để bắt đầu.');
        setAuthMode('login');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length < 4) {
      setErrorMessage('Vui lòng nhập đầy đủ mã OTP 6 chữ số.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.verifyOtp(email.trim(), trimmedOtp);
      if (res?.user) {
        setUser(res.user);
        setSuccessMessage('Xác minh tài khoản thành công!');
        setOtp('');
        if (onAuthSuccess) {
          setTimeout(() => onAuthSuccess(res.user), 400);
        } else {
          loadProfile();
        }
      } else {
        setSuccessMessage(res.message || 'Xác minh thành công! Hãy đăng nhập.');
        setAuthMode('login');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Xác minh OTP thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const res = await apiService.resendOtp(email.trim());
      setSuccessMessage(res.message || 'Đã gửi lại mã OTP mới qua email.');
    } catch (err) {
      setErrorMessage(err.message || 'Gửi lại OTP thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Vui lòng nhập email hợp lệ.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.forgotPassword(trimmedEmail);
      setSuccessMessage(res.message || 'Đã gửi mã OTP đặt lại mật khẩu.');
      setForgotStep(2);
      setOtp('');
    } catch (err) {
      setErrorMessage(err.message || 'Gửi yêu cầu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length < 4) {
      setErrorMessage('Vui lòng nhập mã OTP.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('Mật khẩu mới phải từ 8 ký tự trở lên.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.resetPasswordOtp(email.trim(), trimmedOtp, newPassword);
      setSuccessMessage(res.message || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
      setAuthMode('login');
      setPassword('');
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setErrorMessage(err.message || 'Đặt lại mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleLogout = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản trên thiết bị này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await apiService.logout();
            setUser(null);
            setStats({ processed_lectures: 0, total_minutes: 0, saved_quizzes: 0 });
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setErrorMessage('');
            setSuccessMessage('');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="HỒ SƠ & TÀI KHOẢN" showBack onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {user ? (
          <>
            {/* Thẻ Hero thông tin người dùng */}
            <View style={styles.profileHero}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.display_name || user.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.name}>{user.display_name || 'Học viên'}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Tài khoản đã xác thực</Text>
              </View>
            </View>

            {/* Thống kê học tập */}
            <Text style={styles.sectionTitle}>📊 THỐNG KÊ HỌC TẬP</Text>
            <View style={styles.statsRow}>
              <Stat value={stats.processed_lectures || 0} label="Bài giảng" />
              <Stat value={stats.total_minutes || 0} label="Phút học" />
              <Stat value={stats.saved_quizzes || 0} label="Câu hỏi" />
            </View>

            {/* Bảo mật thông tin tài khoản & Quản lý phiên */}
            <Text style={styles.sectionTitle}>🔒 BẢO MẬT & QUẢN LÝ PHIÊN</Text>
            <View style={styles.securityCard}>
              <View style={styles.securityRow}>
                <Text style={styles.securityLabel}>Mã tài khoản (ID):</Text>
                <Text style={styles.securityValue} numberOfLines={1}>
                  {user.id ? `${user.id.substring(0, 16)}...` : 'Chưa cập nhật'}
                </Text>
              </View>
              <View style={styles.securityDivider} />
              <View style={styles.securityRow}>
                <Text style={styles.securityLabel}>Chuẩn xác thực:</Text>
                <Text style={styles.securityHighlight}>JWT Bearer Token (256-bit)</Text>
              </View>
              <View style={styles.securityDivider} />
              <View style={styles.securityRow}>
                <Text style={styles.securityLabel}>Mã hóa mật khẩu:</Text>
                <Text style={styles.securityHighlight}>PBKDF2-SHA256 (240k rounds)</Text>
              </View>
              <View style={styles.securityDivider} />
              <View style={styles.securityRow}>
                <Text style={styles.securityLabel}>Trạng thái phiên:</Text>
                <Text style={[styles.securityHighlight, { color: '#10b981' }]}>● Đang hoạt động an toàn</Text>
              </View>
            </View>

            {/* Đổi mật khẩu tài khoản */}
            <Text style={styles.sectionTitle}>🔒 ĐỔI MẬT KHẨU</Text>
            <View style={styles.securityCard}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
                onPress={() => {
                  setShowChangePassword(!showChangePassword);
                  setChangeMsg('');
                  setChangeError('');
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>🔑</Text>
                  <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 13.5 }}>
                    Thay đổi mật khẩu đăng nhập
                  </Text>
                </View>
                <Text style={{ color: colors.primaryLight, fontSize: 16 }}>
                  {showChangePassword ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showChangePassword && (
                <View style={{ marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
                  {changeError ? (
                    <View style={[styles.errorBox, { marginBottom: 10 }]}>
                      <Text style={styles.errorText}>⚠️ {changeError}</Text>
                    </View>
                  ) : null}
                  {changeMsg ? (
                    <View style={[styles.successBox, { marginBottom: 10 }]}>
                      <Text style={styles.successText}>✓ {changeMsg}</Text>
                    </View>
                  ) : null}

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

                  <TouchableOpacity
                    style={[styles.submitBtn, { marginTop: 10 }, changeLoading && styles.submitBtnDisabled]}
                    onPress={handleChangePassword}
                    disabled={changeLoading}
                    activeOpacity={0.8}
                  >
                    {changeLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>Cập nhật mật khẩu</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Cấu hình & Dữ liệu */}
            <Text style={styles.sectionTitle}>⚙️ DỮ LIỆU & CẤU HÌNH</Text>
            <TouchableOpacity
              style={styles.action}
              onPress={() =>
                apiService
                  .exportUserConfig()
                  .then(() => Alert.alert('Đã xuất', 'File cấu hình đã sẵn sàng để chia sẻ.'))
                  .catch((e) => Alert.alert('Lỗi xuất file', e.message))
              }
              activeOpacity={0.7}
            >
              <Text style={styles.actionText}>📤 Xuất file cấu hình cá nhân</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleImport} activeOpacity={0.7}>
              <Text style={styles.actionText}>📥 Nạp file cấu hình từ thiết bị</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>

            {/* Đăng xuất */}
            <TouchableOpacity style={[styles.action, styles.logout]} onPress={handleLogout} activeOpacity={0.7}>
              <Text style={styles.logoutText}>🚪 Đăng xuất khỏi tài khoản</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.authContainer}>
            {/* Header Form */}
            <View style={styles.authHeader}>
              <View style={styles.authIconWrap}>
                <Text style={styles.authIcon}>
                  {authMode === 'verify_otp' ? '✉️' : authMode === 'forgot_password' ? '🔑' : '🎓'}
                </Text>
              </View>
              <Text style={styles.authTitle}>
                {authMode === 'login'
                  ? 'ĐĂNG NHẬP HỆ THỐNG'
                  : authMode === 'register'
                  ? 'ĐĂNG KÝ TÀI KHOẢN'
                  : authMode === 'verify_otp'
                  ? 'XÁC MINH MÃ OTP'
                  : 'QUÊN MẬT KHẨU'}
              </Text>
              <Text style={styles.authHint}>
                {authMode === 'login'
                  ? 'Đăng nhập để đồng bộ bài giảng, phụ đề và câu hỏi ôn tập trên mọi thiết bị.'
                  : authMode === 'register'
                  ? 'Tạo tài khoản học viên để tự do quản lý bài giảng và tạo bài thi trắc nghiệm.'
                  : authMode === 'verify_otp'
                  ? `Mã OTP 6 số đã được gửi tới email ${email}. Vui lòng nhập mã để kích hoạt tài khoản.`
                  : forgotStep === 1
                  ? 'Nhập địa chỉ email tài khoản của bạn để nhận mã OTP đặt lại mật khẩu.'
                  : `Mã OTP đã được gửi tới ${email}. Nhập mã và mật khẩu mới bên dưới.`}
              </Text>
            </View>

            {/* Bộ chuyển đổi Tab: Đăng nhập / Đăng ký (chỉ hiện khi ở tab login hoặc register) */}
            {(authMode === 'login' || authMode === 'register') && (
              <View style={styles.tabSwitcher}>
                <TouchableOpacity
                  style={[styles.tabBtn, authMode === 'login' && styles.tabBtnActive]}
                  onPress={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabBtnText, authMode === 'login' && styles.tabBtnTextActive]}>
                    🔑 Đăng nhập
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, authMode === 'register' && styles.tabBtnActive]}
                  onPress={() => {
                    setAuthMode('register');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabBtnText, authMode === 'register' && styles.tabBtnTextActive]}>
                    ✨ Đăng ký
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Thông báo Lỗi / Thành công */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✓ {successMessage}</Text>
              </View>
            ) : null}

            {/* Chế độ 1: Đăng nhập & Đăng ký thông thường */}
            {(authMode === 'login' || authMode === 'register') && (
              <View style={styles.formGroup}>
                {authMode === 'register' ? (
                  <>
                    <View style={styles.inputField}>
                      <Text style={styles.inputLabel}>TÊN ĐĂNG NHẬP</Text>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputIcon}>👤</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ví dụ: nguyenvana"
                          placeholderTextColor={colors.textMuted}
                          value={displayName}
                          onChangeText={setDisplayName}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    <View style={styles.inputField}>
                      <Text style={styles.inputLabel}>ĐỊA CHỈ EMAIL</Text>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputIcon}>✉️</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="email@example.com"
                          placeholderTextColor={colors.textMuted}
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.inputField}>
                    <Text style={styles.inputLabel}>TÊN ĐĂNG NHẬP HOẶC EMAIL</Text>
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputIcon}>👤</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Nhập tên đăng nhập hoặc email"
                        placeholderTextColor={colors.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputField}>
                  <Text style={styles.inputLabel}>MẬT KHẨU</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Tối thiểu 8 ký tự"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {authMode === 'login' && (
                  <TouchableOpacity
                    style={{ alignSelf: 'flex-end', marginTop: 2, marginBottom: 8 }}
                    onPress={() => {
                      setAuthMode('forgot_password');
                      setForgotStep(1);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.primaryLight, fontSize: 12, fontWeight: '600' }}>
                      Quên mật khẩu?
                    </Text>
                  </TouchableOpacity>
                )}

                {authMode === 'register' && (
                  <View style={styles.inputField}>
                    <Text style={styles.inputLabel}>XÁC NHẬN MẬT KHẨU</Text>
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputIcon}>🔐</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Nhập lại mật khẩu"
                        placeholderTextColor={colors.textMuted}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                )}

                {/* Nút Thực hiện chính */}
                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={authMode === 'login' ? handleLogin : handleRegister}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {authMode === 'login' ? 'Đăng nhập ngay' : 'Tạo tài khoản mới'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Chế độ 2: Xác minh OTP (Verify OTP) */}
            {authMode === 'verify_otp' && (
              <View style={styles.formGroup}>
                <View style={styles.inputField}>
                  <Text style={styles.inputLabel}>MÃ XÁC MINH OTP (6 CHỮ SỐ)</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>🔢</Text>
                    <TextInput
                      style={[styles.textInput, { textAlign: 'center', letterSpacing: 6, fontSize: 20, fontWeight: '800', color: colors.primaryLight }]}
                      placeholder="• • • • • •"
                      placeholderTextColor={colors.textMuted}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Xác nhận kích hoạt tài khoản</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: 14, padding: 6 }}
                  onPress={handleResendOtp}
                  disabled={loading}
                >
                  <Text style={{ color: colors.primaryLight, fontSize: 13, fontWeight: '700' }}>
                    🔄 Chưa nhận được mã? Gửi lại OTP
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: 8, padding: 6 }}
                  onPress={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>
                    ‹ Quay lại Đăng nhập
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Chế độ 3: Quên mật khẩu (Forgot Password với OTP) */}
            {authMode === 'forgot_password' && (
              <View style={styles.formGroup}>
                {forgotStep === 1 ? (
                  <>
                    <View style={styles.inputField}>
                      <Text style={styles.inputLabel}>ĐỊA CHỈ EMAIL TÀI KHOẢN</Text>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputIcon}>✉️</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Nhập email tài khoản của bạn"
                          placeholderTextColor={colors.textMuted}
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoFocus
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                      onPress={handleSendForgotOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Gửi mã OTP qua Email</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.inputField}>
                      <Text style={styles.inputLabel}>MÃ OTP TỪ EMAIL (6 SỐ)</Text>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputIcon}>🔢</Text>
                        <TextInput
                          style={[styles.textInput, { textAlign: 'center', letterSpacing: 6, fontSize: 20, fontWeight: '800', color: colors.primaryLight }]}
                          placeholder="• • • • • •"
                          placeholderTextColor={colors.textMuted}
                          value={otp}
                          onChangeText={setOtp}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoFocus
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
                          value={newPassword}
                          onChangeText={setNewPassword}
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
                          value={confirmNewPassword}
                          onChangeText={setConfirmNewPassword}
                          secureTextEntry
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                      onPress={handleResetPasswordOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Xác nhận & Đổi mật khẩu</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: 14, padding: 6 }}
                  onPress={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    ‹ Quay lại Đăng nhập
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Đường phân cách và Google Login (chỉ hiện ở tab login hoặc register) */}
            {(authMode === 'login' || authMode === 'register') && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>HOẶC ĐĂNG NHẬP NHANH</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Đăng nhập bằng Google */}
                <TouchableOpacity
                  style={styles.googleBtn}
                  onPress={handleGoogleAuth}
                  disabled={busyGoogle}
                  activeOpacity={0.85}
                >
                  {busyGoogle ? (
                    <ActivityIndicator color="#1f2937" size="small" />
                  ) : (
                    <View style={styles.googleBtnContent}>
                      <View style={styles.googleLogoBox}>
                        <Text style={styles.googleLogoLetter}>G</Text>
                      </View>
                      <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Footer chuyển đổi chế độ */}
            <View style={styles.authFooter}>
              {authMode === 'login' ? (
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Chưa có tài khoản?</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAuthMode('register');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                  >
                    <Text style={styles.footerLink}> Đăng ký tài khoản ngay</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Đã có tài khoản?</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAuthMode('login');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                  >
                    <Text style={styles.footerLink}> Đăng nhập ngay</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Nút bỏ qua / Khám phá không cần đăng nhập */}
            {allowSkip && onSkip && (
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={onSkip}
                activeOpacity={0.8}
              >
                <Text style={styles.skipBtnText}>Bỏ qua & Khám phá ứng dụng (Offline) ›</Text>
              </TouchableOpacity>
            )}

            {/* Huy hiệu cam kết bảo mật */}
            <View style={styles.securityBadgeRow}>
              <Text style={styles.securityBadgeText}>
                🛡️ Mật khẩu được mã hóa an toàn • Phiên đăng nhập JWT bảo mật 100%
              </Text>
            </View>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  profileHero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
  },
  name: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  email: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  verifiedBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  verifiedBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statValue: {
    color: colors.primaryLight,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  securityCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  securityDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 4,
  },
  securityLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  securityValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '55%',
  },
  securityHighlight: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
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
  actionText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  arrow: {
    color: colors.primaryLight,
    fontSize: 22,
  },
  logout: {
    justifyContent: 'center',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    marginTop: spacing.sm,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  authContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  authIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  authIcon: {
    fontSize: 28,
  },
  authTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  authHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: spacing.xs,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
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
    marginBottom: spacing.md,
  },
  successText: {
    color: colors.success,
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  formGroup: {
    gap: 12,
  },
  inputField: {
    gap: 5,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    paddingVertical: 11,
    color: colors.textPrimary,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
    fontSize: 15,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  googleBtn: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
  googleBtnText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '800',
  },
  authFooter: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  footerLink: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '800',
  },
  securityBadgeRow: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  securityBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
