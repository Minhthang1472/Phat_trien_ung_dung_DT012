import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { colors, spacing, borderRadius } from '../constants/theme';
import { GOOGLE_CLIENT_IDS } from '../constants/config';
import { apiService } from '../services/api';
import AuraBackground from '../components/ui/AuraBackground';
import Icon from '../components/ui/Icon';
import AuthSection from '../components/profile/sections/AuthSection';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ onAuthSuccess, onSkip, allowSkip = true }) {
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
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: Mật khẩu mới
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const activeClientId = GOOGLE_CLIENT_IDS.android || GOOGLE_CLIENT_IDS.web;
  const [request, response, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: activeClientId,
    webClientId: GOOGLE_CLIENT_IDS.web,
    androidClientId: activeClientId,
    iosClientId: GOOGLE_CLIENT_IDS.ios || GOOGLE_CLIENT_IDS.web,
  });

  useEffect(() => {
    const idToken = response?.params?.id_token;
    if (response?.type === 'success' && idToken) {
      setBusyGoogle(true);
      apiService
        .loginWithGoogle(idToken)
        .then((googleUser) => {
          setErrorMessage('');
          setSuccessMessage('Đăng nhập Google thành công!');
          if (onAuthSuccess) {
            setTimeout(() => onAuthSuccess(googleUser), 400);
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
        setSuccessMessage('Đăng nhập thành công!');
        setPassword('');
        if (onAuthSuccess) {
          setTimeout(() => onAuthSuccess(res.user), 300);
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
        setSuccessMessage('Đăng ký tài khoản thành công!');
        setPassword('');
        setConfirmPassword('');
        if (onAuthSuccess) {
          setTimeout(() => onAuthSuccess(res.user), 400);
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
        setSuccessMessage('Xác minh tài khoản thành công!');
        setOtp('');
        if (onAuthSuccess) {
          setTimeout(() => onAuthSuccess(res.user), 300);
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

  const handleVerifyResetOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6 || !/^\d{6}$/.test(trimmedOtp)) {
      setErrorMessage('Vui lòng nhập đầy đủ mã OTP 6 chữ số từ email.');
      return;
    }
    setLoading(true);
    try {
      try {
        const res = await apiService.verifyResetOtp(email.trim(), trimmedOtp);
        if (res?.message) {
          setSuccessMessage(res.message);
        }
      } catch (apiErr) {
        if (!apiErr.message || (!apiErr.message.includes('404') && !apiErr.message.includes('Not Found'))) {
          throw apiErr;
        }
      }
      setForgotStep(3);
    } catch (err) {
      setErrorMessage(err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setErrorMessage('Mã OTP không hợp lệ, vui lòng thử lại từ bước nhập mã.');
      setForgotStep(2);
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
      setForgotStep(1);
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

  return (
    <View style={styles.container}>
      <AuraBackground />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Branding Section */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Icon name="school" size={32} color={colors.coral} />
          </View>
          <Text style={styles.brandTitle}>EdTech AI</Text>
          <Text style={styles.brandSubtitle}>
            Hệ thống tạo phụ đề thông minh & ôn tập bài giảng bằng AI
          </Text>
        </View>

        {/* Khối Xác thực (AuthSection) */}
        <View style={styles.authWrapper}>
          <AuthSection
            authMode={authMode}
            setAuthMode={setAuthMode}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            displayName={displayName}
            setDisplayName={setDisplayName}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={loading}
            errorMessage={errorMessage}
            successMessage={successMessage}
            busyGoogle={busyGoogle}
            otp={otp}
            setOtp={setOtp}
            forgotStep={forgotStep}
            setForgotStep={setForgotStep}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmNewPassword={confirmNewPassword}
            setConfirmNewPassword={setConfirmNewPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onVerifyOtp={handleVerifyOtp}
            onResendOtp={handleResendOtp}
            onSendForgotOtp={handleSendForgotOtp}
            onVerifyResetOtp={handleVerifyResetOtp}
            onResetPasswordOtp={handleResetPasswordOtp}
            onGoogleAuth={handleGoogleAuth}
            allowSkip={allowSkip}
            onSkip={onSkip}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.xxl : spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    maxWidth: 420,
    width: '100%',
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.15)',
  },
  brandTitle: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.md,
  },
  authWrapper: {
    width: '100%',
    maxWidth: 440,
  },
});

