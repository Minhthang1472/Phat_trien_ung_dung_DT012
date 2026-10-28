import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { colors, spacing, borderRadius } from '../constants/theme';
import { GOOGLE_CLIENT_IDS } from '../constants/config';
import { apiService } from '../services/api';
import { notificationService } from '../services/notificationService';
import Header from '../components/Header';
import AuraBackground from '../components/ui/AuraBackground';
import {
  PRESET_AVATARS,
  RANKS,
  getRankDetails,
  EditProfileModal,
  AuthSection,
  ProfileHeroSection,
  ProfileStatsSection,
  ProfileRankSection,
  ProfileAnalyticsSection,
  ProfileAchievementsSection,
  profileStyles as styles,
} from '../components/profile';

WebBrowser.maybeCompleteAuthSession();

export default function ProfileScreen({ onBack, onAuthSuccess, onSkip, allowSkip = true, onNavigate }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ processed_lectures: 0, total_minutes: 0, saved_quizzes: 0 });
  const [streakDays, setStreakDays] = useState(0);
  const [langStats, setLangStats] = useState({ vi: 0, en: 0 });
  const [featureStats, setFeatureStats] = useState({ summary: 0, quiz: 0, mindmap: 0 });
  const [refreshing, setRefreshing] = useState(false);
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
  const [forgotStep, setForgotStep] = useState(1); // 1: Nhập email, 2: Nhập OTP, 3: Nhập Mật khẩu mới
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // States cho Đổi mật khẩu trong tài khoản
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [changeNewPass, setChangeNewPass] = useState('');
  const [changeConfirmPass, setChangeConfirmPass] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMsg, setChangeMsg] = useState('');
  const [changeError, setChangeError] = useState('');

  // States cho Chỉnh sửa hồ sơ, Avatar & Đổi Email
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [editEmailOtpStep, setEditEmailOtpStep] = useState(1); // 1: Form sửa, 2: Xác thực OTP
  const [emailChangeOtp, setEmailChangeOtp] = useState('');
  const [pendingChangeEmail, setPendingChangeEmail] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [editError, setEditError] = useState('');

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
      if (!saved) {
        setUser(null);
        setStats({ processed_lectures: 0, total_minutes: 0, saved_quizzes: 0 });
        setStreakDays(0);
        setLangStats({ vi: 0, en: 0 });
        setFeatureStats({ summary: 0, quiz: 0, mindmap: 0 });
        return;
      }
      setUser(saved);

      // 1. Đồng bộ tức thì từ lịch sử bài giảng thực tế của người dùng
      let localLectures = [];
      try {
        localLectures = await apiService.getLocalHistory();
      } catch (_) {}

      if (localLectures && localLectures.length > 0) {
        const count = localLectures.length;
        const totalSecs = localLectures.reduce(
          (acc, item) => acc + (item.duration_seconds || item.full_data?.duration_seconds || 0),
          0
        );
        const totalQuiz = localLectures.reduce(
          (acc, item) => acc + (item.full_data?.quiz?.length || item.quiz?.length || 0),
          0
        );

        // Tính chuỗi ngày học thực tế
        const uniqueDays = new Set(
          localLectures
            .map((item) => (item.cached_at || item.created_at || '').substring(0, 10))
            .filter(Boolean)
        );
        setStreakDays(Math.max(1, uniqueDays.size));

        // Tính tỉ lệ ngôn ngữ thực tế
        let viCount = 0;
        let enCount = 0;
        let sumCount = 0;
        let qzCount = 0;
        let mmCount = 0;

        localLectures.forEach((item) => {
          const lang = (item.language || item.full_data?.language || 'vi').toLowerCase();
          if (lang.includes('en')) enCount++;
          else viCount++;

          if (item.summary || item.full_data?.summary) sumCount++;
          if ((item.quiz?.length || item.full_data?.quiz?.length) > 0) qzCount++;
          if (item.mindmap || item.full_data?.mindmap) mmCount++;
        });

        const totalLangs = viCount + enCount || 1;
        setLangStats({
          vi: Math.round((viCount / totalLangs) * 100),
          en: Math.round((enCount / totalLangs) * 100),
        });

        setFeatureStats({
          summary: Math.round((sumCount / count) * 100),
          quiz: Math.round((qzCount / count) * 100),
          mindmap: Math.round((mmCount / count) * 100),
        });

        setStats({
          processed_lectures: count,
          total_minutes: Math.round(totalSecs / 60),
          saved_quizzes: totalQuiz,
        });
      } else {
        setStreakDays(0);
        setLangStats({ vi: 0, en: 0 });
        setFeatureStats({ summary: 0, quiz: 0, mindmap: 0 });
        setStats({ processed_lectures: 0, total_minutes: 0, saved_quizzes: 0 });
      }

      // 2. Đồng bộ thêm từ CSDL Cloud (/api/auth/me)
      try {
        const profile = await apiService.getProfile();
        if (profile?.user) {
          setUser(profile.user);
        }
        if (profile?.stats) {
          setStats((prev) => {
            const newCount = Math.max(profile.stats.processed_lectures || 0, prev.processed_lectures || 0);
            return {
              processed_lectures: newCount,
              total_minutes: Math.max(profile.stats.total_minutes || 0, prev.total_minutes || 0),
              saved_quizzes: Math.max(profile.stats.saved_quizzes || 0, prev.saved_quizzes || 0),
            };
          });
          if (profile.stats.processed_lectures > 0 && streakDays === 0) {
            setStreakDays(1);
          }
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
        // Nếu backend chưa có endpoint verify-reset-otp (404), chuyển tiếp sang bước 3
        // Việc xác thực OTP sẽ được hoàn tất tại bước cuối cùng qua /api/auth/reset-password-otp
        if (apiErr.message && (apiErr.message.includes('404') || apiErr.message.includes('Not Found'))) {
          // Bỏ qua lỗi 404
        } else {
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
      setSuccessMessage(res.message || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.');
      setAuthMode('login');
      setForgotStep(1);
      setPassword('');
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      if (err.message && (err.message.includes('OTP') || err.message.includes('hết hạn'))) {
        setForgotStep(2);
      }
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
      notificationService.addNotification({
        title: 'Đổi mật khẩu thành công 🔑',
        message: 'Mật khẩu tài khoản của bạn đã được thay đổi an toàn.',
        type: 'success',
        icon: 'key',
      });
      setOldPassword('');
      setChangeNewPass('');
      setChangeConfirmPass('');
    } catch (err) {
      setChangeError(err.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setChangeLoading(false);
    }
  };

  const handleOpenEditProfile = () => {
    setEditDisplayName(user?.display_name || user?.username || '');
    setEditEmail(user?.email || '');
    setSelectedAvatar(user?.avatar || null);
    setEditEmailOtpStep(1);
    setEmailChangeOtp('');
    setPendingChangeEmail('');
    setEditMsg('');
    setEditError('');
    setEditModalVisible(true);
  };

  const handlePickAvatarFromDevice = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setSelectedAvatar(asset.uri);
    } catch (err) {
      Alert.alert('Không thể chọn ảnh', err.message);
    }
  };

  const handleSaveProfile = async () => {
    const trimmedName = editDisplayName.trim();
    if (!trimmedName) {
      setEditError('Tên hiển thị không được để trống.');
      return;
    }

    const currentEmail = (user?.email || '').toLowerCase().trim();
    const newEmail = editEmail.toLowerCase().trim();
    const isEmailChanging = newEmail && newEmail !== currentEmail;

    if (isEmailChanging) {
      if (!newEmail.includes('@') || !newEmail.includes('.')) {
        setEditError('Địa chỉ email mới không hợp lệ.');
        return;
      }
    }

    setEditLoading(true);
    setEditError('');
    setEditMsg('');
    try {
      const payload = {
        display_name: trimmedName,
        avatar: selectedAvatar,
      };

      if (isEmailChanging) {
        payload.email = newEmail;
      }

      const res = await apiService.updateProfile(payload);

      if (res?.user) {
        setUser(res.user);
      }

      if (res?.requires_email_otp) {
        // Cần xác nhận mã OTP gửi tới email mới
        setPendingChangeEmail(newEmail);
        setEditEmailOtpStep(2);
        setEmailChangeOtp('');
        setEditMsg(res.message || `Mã OTP đã được gửi tới ${newEmail}. Vui lòng nhập mã để hoàn tất.`);
      } else {
        setEditMsg('Cập nhật hồ sơ thành công!');
        notificationService.addNotification({
          title: 'Cập nhật hồ sơ 👤',
          message: `Thông tin tài khoản "${trimmedName}" đã được cập nhật thành công.`,
          type: 'success',
          icon: 'profile',
        });
        setTimeout(() => {
          setEditModalVisible(false);
          setEditMsg('');
        }, 1200);
      }
    } catch (err) {
      if (!isEmailChanging && user) {
        const localUser = { ...user, display_name: trimmedName, avatar: selectedAvatar };
        await AsyncStorage.setItem('auth_user', JSON.stringify(localUser));
        setUser(localUser);
        setEditMsg('Cập nhật hồ sơ thành công!');
        setTimeout(() => {
          setEditModalVisible(false);
          setEditMsg('');
        }, 1200);
      } else {
        setEditError(err.message || 'Cập nhật thất bại. Vui lòng thử lại.');
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmEmailOtp = async () => {
    const trimmedOtp = emailChangeOtp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6 || !/^\d{6}$/.test(trimmedOtp)) {
      setEditError('Vui lòng nhập đầy đủ 6 chữ số mã OTP xác nhận.');
      return;
    }

    setEditLoading(true);
    setEditError('');
    setEditMsg('');
    try {
      const res = await apiService.updateProfile({
        display_name: editDisplayName.trim(),
        avatar: selectedAvatar,
        email: pendingChangeEmail,
        email_otp: trimmedOtp,
      });

      if (res?.user) {
        setUser(res.user);
      }

      setEditMsg('Xác thực đổi email thành công!');
      setTimeout(() => {
        setEditModalVisible(false);
        setEditEmailOtpStep(1);
        setEmailChangeOtp('');
        setPendingChangeEmail('');
        setEditMsg('');
      }, 1300);
    } catch (err) {
      setEditError(err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setEditLoading(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProfile();
    } catch (e) {
      console.warn('Lỗi làm mới hồ sơ:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const totalExp =
    (stats.processed_lectures || 0) * 100 +
    (stats.saved_quizzes || 0) * 10 +
    (stats.total_minutes || 0) * 2;
  const rankInfo = getRankDetails(totalExp);

  return (
    <View style={styles.container}>
      <AuraBackground />
      {/* Header không có nút quay về vì đã có thanh điều hướng dưới đáy */}
      <Header title="HỒ SƠ" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
            colors={[colors.primaryLight]}
          />
        }
      >
        {user ? (
          <>
            {/* 1. Thẻ Hero thông tin học viên & Chuỗi học tập */}
            <ProfileHeroSection
              user={user}
              rankInfo={rankInfo}
              streakDays={streakDays}
              processedLectures={stats.processed_lectures || 0}
              onOpenEditProfile={handleOpenEditProfile}
            />

            {/* 2. 4 Chỉ số KPI Thống kê cốt lõi */}
            <ProfileStatsSection stats={stats} />

            {/* 3. Phân bố Cấp bậc & Tiến độ thăng hạng */}
            <ProfileRankSection rankInfo={rankInfo} />

            {/* 4. Phân bổ Ngôn ngữ & Tính năng AI */}
            <ProfileAnalyticsSection
              stats={stats}
              langStats={langStats}
              featureStats={featureStats}
            />

            {/* 5. Huy hiệu thành tích học tập */}
            <ProfileAchievementsSection stats={stats} />
          </>
        ) : (
          /* Form Đăng nhập, Đăng ký, OTP, Quên mật khẩu & Google Login */
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
        )}
      </ScrollView>

      {/* POP-UP (MODAL) CHỈNH SỬA HỒ SƠ, AVATAR & XÁC THỰC ĐỔI EMAIL */}
      <EditProfileModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditEmailOtpStep(1);
          setEditError('');
          setEditMsg('');
        }}
        user={user}
        selectedAvatar={selectedAvatar}
        onSelectAvatar={setSelectedAvatar}
        onPickAvatarFromDevice={handlePickAvatarFromDevice}
        editDisplayName={editDisplayName}
        onChangeDisplayName={setEditDisplayName}
        editEmail={editEmail}
        onChangeEmail={setEditEmail}
        editEmailOtpStep={editEmailOtpStep}
        setEditEmailOtpStep={setEditEmailOtpStep}
        pendingChangeEmail={pendingChangeEmail}
        emailChangeOtp={emailChangeOtp}
        onChangeEmailOtp={setEmailChangeOtp}
        editLoading={editLoading}
        editMsg={editMsg}
        editError={editError}
        onSaveProfile={handleSaveProfile}
        onConfirmEmailOtp={handleConfirmEmailOtp}
      />
    </View>
  );
}

