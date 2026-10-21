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
import Header from '../components/Header';

WebBrowser.maybeCompleteAuthSession();

// Bộ sưu tập Avatar phong cách học tập & AI
const PRESET_AVATARS = [
  { id: 'grad_cap', icon: '🎓', label: 'Cử nhân' },
  { id: 'student_m', icon: '👨‍🎓', label: 'Sinh viên' },
  { id: 'student_f', icon: '👩‍🎓', label: 'Nữ sinh' },
  { id: 'ai_bot', icon: '🤖', label: 'AI Bot' },
  { id: 'owl', icon: '🦉', label: 'Uyên bác' },
  { id: 'rocket', icon: '🚀', label: 'Bứt phá' },
  { id: 'lightbulb', icon: '💡', label: 'Sáng tạo' },
  { id: 'fire', icon: '🔥', label: 'Nhiệt huyết' },
  { id: 'lion', icon: '🦁', label: 'Dũng mãnh' },
  { id: 'fox', icon: '🦊', label: 'Thông thái' },
  { id: 'gem', icon: '💎', label: 'Tinh anh' },
  { id: 'star', icon: '⭐', label: 'Ngôi sao' },
];

// Cấu hình Hệ thống Phân bố Cấp bậc & Thăng hạng học viên
const RANKS = [
  {
    id: 'bronze',
    tier: 1,
    name: 'Tân Binh Khởi Đầu',
    shortName: 'Tân Binh',
    icon: '🥉',
    minExp: 0,
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    desc: 'Bắt đầu hành trình tiếp thu tri thức mới',
  },
  {
    id: 'silver',
    tier: 2,
    name: 'Học Viên Chuyên Cần',
    shortName: 'Chuyên Cần',
    icon: '🥈',
    minExp: 150,
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    desc: 'Nắm vững kiến thức qua nhiều bài học',
  },
  {
    id: 'gold',
    tier: 3,
    name: 'Học Giả Tích Cực',
    shortName: 'Tích Cực',
    icon: '🥇',
    minExp: 400,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    desc: 'Luyện tập câu hỏi và ôn thi thường xuyên',
  },
  {
    id: 'diamond',
    tier: 4,
    name: 'Tinh Anh Kim Cương',
    shortName: 'Kim Cương',
    icon: '💎',
    minExp: 800,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    desc: 'Kiến thức vững vàng, phản xạ xuất sắc',
  },
  {
    id: 'master',
    tier: 5,
    name: 'Huyền Thoại Tri Thức',
    shortName: 'Huyền Thoại',
    icon: '👑',
    minExp: 1500,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    desc: 'Đỉnh cao học giả, hoàn thiện toàn diện',
  },
];

const getRankDetails = (exp) => {
  let currentIdx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (exp >= RANKS[i].minExp) {
      currentIdx = i;
      break;
    }
  }
  const current = RANKS[currentIdx];
  const next = RANKS[currentIdx + 1] || null;

  let progressPercent = 100;
  let expNeeded = 0;

  if (next) {
    const tierExp = exp - current.minExp;
    const tierTarget = next.minExp - current.minExp;
    progressPercent = Math.min(100, Math.max(0, Math.round((tierExp / tierTarget) * 100)));
    expNeeded = Math.max(0, next.minExp - exp);
  }

  return { current, next, currentIdx, progressPercent, expNeeded, totalExp: exp };
};

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
      {/* Header không có nút quay về vì đã có thanh điều hướng dưới đáy */}
      <Header title="HỒ SƠ & THỐNG KÊ" />
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
            {/* Thẻ Hero thông tin học viên & Chuỗi học tập */}
            <View style={styles.profileHero}>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={handleOpenEditProfile}
                activeOpacity={0.8}
              >
                <View style={styles.avatar}>
                  {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:') || user.avatar.startsWith('file:') || user.avatar.startsWith('content:')) ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                  ) : user.avatar ? (
                    <Text style={styles.avatarPresetIcon}>{user.avatar}</Text>
                  ) : (
                    <Text style={styles.avatarText}>
                      {(user.display_name || user.email || 'U')[0].toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.avatarEditBadge}>
                  <Text style={styles.avatarEditBadgeIcon}>✏️</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.name}>{user.display_name || 'Học viên'}</Text>
              <TouchableOpacity
                style={styles.editProfileBtnHero}
                onPress={handleOpenEditProfile}
                activeOpacity={0.7}
              >
                <Text style={styles.editProfileBtnHeroText}>✏️ Chỉnh sửa thông tin & Avatar</Text>
              </TouchableOpacity>
              <Text style={styles.email}>{user.email}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>✓ Tài khoản đã xác thực</Text>
                </View>
                <View
                  style={[
                    styles.levelBadge,
                    {
                      backgroundColor: rankInfo.current.bg,
                      borderColor: rankInfo.current.color,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text style={[styles.levelBadgeText, { color: rankInfo.current.color }]}>
                    {rankInfo.current.icon} {rankInfo.current.name}
                  </Text>
                </View>
              </View>

              {/* Chuỗi học tập & Mục tiêu tuần */}
              <View style={styles.streakBanner}>
                <View style={styles.streakInfo}>
                  <Text style={styles.streakIcon}>🔥</Text>
                  <View>
                    <Text style={styles.streakTitle}>Chuỗi học tập</Text>
                    <Text style={styles.streakSubtitle}>{streakDays} ngày liên tục</Text>
                  </View>
                </View>
                <View style={styles.streakDivider} />
                <View style={styles.streakInfo}>
                  <Text style={styles.streakIcon}>🎯</Text>
                  <View>
                    <Text style={styles.streakTitle}>Mục tiêu tuần</Text>
                    <Text style={styles.streakSubtitle}>{Math.min(stats.processed_lectures || 0, 5)}/5 bài giảng</Text>
                  </View>
                </View>
              </View>

              {/* Thanh tiến độ mục tiêu tuần */}
              <View style={styles.weeklyProgressBarWrap}>
                <View style={styles.weeklyProgressHeader}>
                  <Text style={styles.weeklyProgressLabel}>Tiến độ hoàn thành tuần này</Text>
                  <Text style={styles.weeklyProgressPercent}>
                    {Math.min(100, Math.round(((stats.processed_lectures || 0) / 5) * 100))}%
                  </Text>
                </View>
                <View style={styles.weeklyProgressBar}>
                  <View
                    style={[
                      styles.weeklyProgressFill,
                      {
                        width: `${Math.min(100, Math.max((stats.processed_lectures || 0) > 0 ? 15 : 0, Math.round(((stats.processed_lectures || 0) / 5) * 100)))}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* 4 Chỉ số KPI Thống kê cốt lõi */}
            <Text style={styles.sectionTitle}>📈 CHỈ SỐ HỌC TẬP TỔNG QUAN</Text>
            <View style={styles.dashboardGrid}>
              <View style={styles.dashboardCard}>
                <View style={[styles.dashboardCardIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                  <Text style={styles.dashboardCardIcon}>📚</Text>
                </View>
                <Text style={styles.dashboardCardValue}>{stats.processed_lectures || 0}</Text>
                <Text style={styles.dashboardCardTitle}>Bài giảng đã học</Text>
                <Text style={styles.dashboardCardDesc}>Đã tóm tắt & sơ đồ tư duy</Text>
              </View>

              <View style={styles.dashboardCard}>
                <View style={[styles.dashboardCardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Text style={styles.dashboardCardIcon}>⏱️</Text>
                </View>
                <Text style={styles.dashboardCardValue}>
                  {stats.total_minutes || 0}
                  <Text style={{ fontSize: 13, fontWeight: '600' }}> ph</Text>
                </Text>
                <Text style={styles.dashboardCardTitle}>Thời lượng học</Text>
                <Text style={styles.dashboardCardDesc}>Tiết kiệm 80% thời gian</Text>
              </View>

              <View style={styles.dashboardCard}>
                <View style={[styles.dashboardCardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Text style={styles.dashboardCardIcon}>🎯</Text>
                </View>
                <Text style={styles.dashboardCardValue}>{stats.saved_quizzes || 0}</Text>
                <Text style={styles.dashboardCardTitle}>Câu trắc nghiệm</Text>
                <Text style={styles.dashboardCardDesc}>Bộ ôn tập củng cố kiến thức</Text>
              </View>

              <View style={styles.dashboardCard}>
                <View style={[styles.dashboardCardIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
                  <Text style={styles.dashboardCardIcon}>⚡</Text>
                </View>
                <Text style={styles.dashboardCardValue}>
                  {(stats.processed_lectures || 0) > 0 ? `${Math.min(100, Math.round(((stats.saved_quizzes || 0) / Math.max(1, (stats.processed_lectures || 0) * 3)) * 100))}%` : '0%'}
                </Text>
                <Text style={styles.dashboardCardTitle}>Hiệu quả tiếp thu</Text>
                <Text style={styles.dashboardCardDesc}>Độ chính xác bài ôn tập</Text>
              </View>
            </View>

            {/* Phân bố Cấp bậc & Nâng hạng học viên */}
            <Text style={styles.sectionTitle}>🎖️ PHÂN BỐ CẤP BẬC & TIẾN ĐỘ THĂNG HẠNG</Text>
            <View style={styles.rankCard}>
              {/* Header Thẻ Hạng Hiện Tại */}
              <View style={styles.rankHeader}>
                <View
                  style={[
                    styles.rankIconBox,
                    {
                      backgroundColor: rankInfo.current.bg,
                      borderColor: rankInfo.current.color,
                    },
                  ]}
                >
                  <Text style={styles.rankIconLarge}>{rankInfo.current.icon}</Text>
                </View>
                <View style={styles.rankHeaderInfo}>
                  <View style={styles.rankTitleRow}>
                    <Text style={[styles.rankCurrentName, { color: rankInfo.current.color }]}>
                      {rankInfo.current.name}
                    </Text>
                    <View style={[styles.rankTierTag, { backgroundColor: rankInfo.current.bg }]}>
                      <Text style={[styles.rankTierTagText, { color: rankInfo.current.color }]}>
                        CẤP {rankInfo.current.tier}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rankDesc}>{rankInfo.current.desc}</Text>
                  <Text style={styles.rankExpText}>
                    ✨ Tích lũy: <Text style={{ color: colors.primaryLight, fontWeight: '800' }}>{rankInfo.totalExp} EXP</Text>
                  </Text>
                </View>
              </View>

              {/* Thanh tiến độ thăng hạng */}
              <View style={styles.rankProgressContainer}>
                <View style={styles.rankProgressHeader}>
                  <Text style={styles.rankProgressLabel}>
                    {rankInfo.next
                      ? `Tiến độ lên ${rankInfo.next.name}`
                      : 'Đã đạt cấp bậc cao nhất'}
                  </Text>
                  <Text style={[styles.rankProgressValue, { color: rankInfo.current.color }]}>
                    {rankInfo.progressPercent}%
                  </Text>
                </View>
                <View style={styles.rankProgressBar}>
                  <View
                    style={[
                      styles.rankProgressFill,
                      {
                        width: `${Math.max(5, rankInfo.progressPercent)}%`,
                        backgroundColor: rankInfo.current.color,
                      },
                    ]}
                  />
                </View>
                {rankInfo.next ? (
                  <Text style={styles.rankHintText}>
                    🎯 Hoàn thành thêm mục tiêu để nhận{' '}
                    <Text style={{ color: colors.primaryLight, fontWeight: '700' }}>
                      +{rankInfo.expNeeded} EXP
                    </Text>{' '}
                    thăng lên {rankInfo.next.icon}{' '}
                    <Text style={{ color: rankInfo.next.color, fontWeight: '700' }}>
                      {rankInfo.next.name}
                    </Text>
                  </Text>
                ) : (
                  <Text style={[styles.rankHintText, { color: '#a855f7' }]}>
                    🎉 Chúc mừng! Bạn đã chạm mốc cao nhất của bảng xếp hạng học giả!
                  </Text>
                )}
              </View>

              <View style={styles.rankDivider} />

              {/* Lộ trình phân bố các hạng */}
              <Text style={styles.rankTimelineTitle}>LỘ TRÌNH PHÂN BỐ CÁC HẠNG</Text>
              <View style={styles.rankStepsList}>
                {RANKS.map((r) => {
                  const isAchieved = rankInfo.totalExp >= r.minExp;
                  const isCurrent = rankInfo.current.id === r.id;
                  return (
                    <View
                      key={r.id}
                      style={[
                        styles.rankStepItem,
                        isCurrent && { borderColor: r.color, backgroundColor: r.bg, borderWidth: 1.5 },
                        !isAchieved && { opacity: 0.5 },
                      ]}
                    >
                      <View style={styles.rankStepLeft}>
                        <Text style={styles.rankStepIcon}>{r.icon}</Text>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.rankStepName,
                                isCurrent && { color: r.color, fontWeight: '800' },
                              ]}
                            >
                              {r.name}
                            </Text>
                            {isCurrent && (
                              <View style={[styles.currentBadgeSmall, { backgroundColor: r.color }]}>
                                <Text style={styles.currentBadgeSmallText}>Hiện tại</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.rankStepExp}>Yêu cầu: {r.minExp} EXP</Text>
                        </View>
                      </View>
                      <View style={styles.rankStepRight}>
                        <Text
                          style={[
                            styles.rankStepStatus,
                            isAchieved ? { color: '#10b981' } : { color: colors.textMuted },
                          ]}
                        >
                          {isAchieved ? '✓ Đã đạt' : `Còn ${r.minExp - rankInfo.totalExp} EXP`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Quy tắc tích lũy EXP */}
              <View style={styles.expRulesBox}>
                <Text style={styles.expRulesTitle}>⚡ QUY TẮC NHẬN ĐIỂM EXP KHI HOÀN THÀNH:</Text>
                <View style={styles.expRulesRow}>
                  <View style={styles.expRuleItem}>
                    <Text style={styles.expRuleIcon}>📚</Text>
                    <Text style={styles.expRuleText}>Hoàn thành bài giảng</Text>
                    <Text style={styles.expRuleVal}>+100 EXP</Text>
                  </View>
                  <View style={styles.expRuleItem}>
                    <Text style={styles.expRuleIcon}>🎯</Text>
                    <Text style={styles.expRuleText}>Câu hỏi ôn tập</Text>
                    <Text style={styles.expRuleVal}>+10 EXP</Text>
                  </View>
                  <View style={styles.expRuleItem}>
                    <Text style={styles.expRuleIcon}>⏱️</Text>
                    <Text style={styles.expRuleText}>Thời gian học tập</Text>
                    <Text style={styles.expRuleVal}>+2 EXP / ph</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Phân bổ Ngôn ngữ & Tính năng AI */}
            <Text style={styles.sectionTitle}>🌐 PHÂN BỔ NGÔN NGỮ & ĐỊNH DẠNG</Text>
            <View style={styles.analyticsCard}>
              {(stats.processed_lectures || 0) === 0 && (
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 12, fontStyle: 'italic' }}>
                  Chưa có dữ liệu bài giảng. Hãy xử lý bài giảng đầu tiên để theo dõi phân bổ học tập!
                </Text>
              )}

              <View style={styles.analyticRow}>
                <View style={styles.analyticLabelWrap}>
                  <Text style={styles.analyticLabel}>🇻🇳 Tiếng Việt</Text>
                  <Text style={styles.analyticValue}>{langStats.vi}%</Text>
                </View>
                <View style={styles.analyticBar}>
                  <View style={[styles.analyticFill, { width: `${langStats.vi}%`, backgroundColor: '#6366f1' }]} />
                </View>
              </View>

              <View style={styles.analyticRow}>
                <View style={styles.analyticLabelWrap}>
                  <Text style={styles.analyticLabel}>🇺🇸 Tiếng Anh</Text>
                  <Text style={styles.analyticValue}>{langStats.en}%</Text>
                </View>
                <View style={styles.analyticBar}>
                  <View style={[styles.analyticFill, { width: `${langStats.en}%`, backgroundColor: '#ec4899' }]} />
                </View>
              </View>

              <View style={styles.analyticDivider} />

              <View style={styles.featureBreakdown}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>📝</Text>
                  <Text style={styles.featureTitle}>Tóm tắt AI</Text>
                  <Text style={styles.featureTag}>{featureStats.summary}%</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>🧠</Text>
                  <Text style={styles.featureTitle}>Trắc nghiệm</Text>
                  <Text style={styles.featureTag}>{featureStats.quiz}%</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>🗺️</Text>
                  <Text style={styles.featureTitle}>Mindmap</Text>
                  <Text style={styles.featureTag}>{featureStats.mindmap}%</Text>
                </View>
              </View>
            </View>

            {/* Huy hiệu thành tích học tập */}
            <Text style={styles.sectionTitle}>🏆 HUY HIỆU THÀNH TÍCH</Text>
            <View style={styles.achievementsGrid}>
              <View style={[styles.achievementBadge, (stats.processed_lectures || 0) >= 1 && styles.achievementBadgeUnlocked]}>
                <Text style={styles.achievementIcon}>🎓</Text>
                <Text style={styles.achievementTitle}>Tân Binh Tiên Phong</Text>
                <Text style={styles.achievementSubtitle}>Hoàn thành bài đầu</Text>
                <Text style={styles.achievementStatus}>
                  {(stats.processed_lectures || 0) >= 1 ? '✓ Đã mở khóa' : '🔒 Đang khóa'}
                </Text>
              </View>

              <View style={[styles.achievementBadge, (stats.processed_lectures || 0) >= 1 ? styles.achievementBadgeUnlocked : null]}>
                <Text style={styles.achievementIcon}>⚡</Text>
                <Text style={styles.achievementTitle}>Tốc Độ Ánh Sáng</Text>
                <Text style={styles.achievementSubtitle}>Tóm tắt AI tức thì</Text>
                <Text style={styles.achievementStatus}>
                  {(stats.processed_lectures || 0) >= 1 ? '✓ Đã mở khóa' : '🔒 Đang khóa'}
                </Text>
              </View>

              <View style={[styles.achievementBadge, (stats.saved_quizzes || 0) >= 5 && styles.achievementBadgeUnlocked]}>
                <Text style={styles.achievementIcon}>🎯</Text>
                <Text style={styles.achievementTitle}>Bậc Thầy Trắc Nghiệm</Text>
                <Text style={styles.achievementSubtitle}>Ôn tập 5+ câu hỏi</Text>
                <Text style={styles.achievementStatus}>
                  {(stats.saved_quizzes || 0) >= 5 ? '✓ Đã mở khóa' : `${stats.saved_quizzes || 0}/5 câu`}
                </Text>
              </View>

              <View style={[styles.achievementBadge, (stats.total_minutes || 0) >= 30 && styles.achievementBadgeUnlocked]}>
                <Text style={styles.achievementIcon}>👑</Text>
                <Text style={styles.achievementTitle}>Học Viên Bền Bỉ</Text>
                <Text style={styles.achievementSubtitle}>30+ phút tiếp thu</Text>
                <Text style={styles.achievementStatus}>
                  {(stats.total_minutes || 0) >= 30 ? '✓ Đã mở khóa' : `${stats.total_minutes || 0}/30 ph`}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.authContainer}>
            {/* Header Form */}
            <View style={styles.authHeader}>
              <View style={styles.authIconWrap}>
                <Text style={styles.authIcon}>
                  {authMode === 'verify_otp'
                    ? '✉️'
                    : authMode === 'forgot_password'
                    ? forgotStep === 3
                      ? '🔒'
                      : forgotStep === 2
                      ? '✉️'
                      : '🔑'
                    : '🎓'}
                </Text>
              </View>
              <Text style={styles.authTitle}>
                {authMode === 'login'
                  ? 'ĐĂNG NHẬP HỆ THỐNG'
                  : authMode === 'register'
                  ? 'ĐĂNG KÝ TÀI KHOẢN'
                  : authMode === 'verify_otp'
                  ? 'XÁC MINH MÃ OTP'
                  : forgotStep === 1
                  ? 'QUÊN MẬT KHẨU'
                  : forgotStep === 2
                  ? 'XÁC THỰC MÃ OTP'
                  : 'TẠO MẬT KHẨU MỚI'}
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
                  : forgotStep === 2
                  ? `Mã OTP đã được gửi tới ${email}. Nhập mã 6 số để xác thực danh tính.`
                  : `Xác thực thành công! Nhập mật khẩu mới cho tài khoản ${email}.`}
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
                  <Text style={[styles.inputLabel, { textAlign: 'center', marginBottom: 6 }]}>
                    MÃ XÁC MINH OTP (6 CHỮ SỐ)
                  </Text>
                  <View style={styles.otpInputBox}>
                    <TextInput
                      style={styles.otpTextInput}
                      placeholder="• • • • • •"
                      placeholderTextColor="rgba(255, 255, 255, 0.2)"
                      value={otp}
                      onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, ''))}
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

            {/* Chế độ 3: Quên mật khẩu (Forgot Password qua OTP tách bước) */}
            {authMode === 'forgot_password' && (
              <View style={styles.formGroup}>
                {/* Thanh chỉ báo tiến trình 3 bước */}
                <View style={styles.stepIndicatorRow}>
                  <View style={[styles.stepDot, styles.stepDotActive]}>
                    <Text style={styles.stepDotText}>1</Text>
                  </View>
                  <View style={[styles.stepLine, forgotStep >= 2 && styles.stepLineActive]} />
                  <View style={[styles.stepDot, forgotStep >= 2 ? styles.stepDotActive : styles.stepDotInactive]}>
                    <Text style={[styles.stepDotText, forgotStep < 2 && styles.stepDotTextInactive]}>2</Text>
                  </View>
                  <View style={[styles.stepLine, forgotStep >= 3 && styles.stepLineActive]} />
                  <View style={[styles.stepDot, forgotStep >= 3 ? styles.stepDotActive : styles.stepDotInactive]}>
                    <Text style={[styles.stepDotText, forgotStep < 3 && styles.stepDotTextInactive]}>3</Text>
                  </View>
                </View>

                {forgotStep === 1 && (
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
                )}

                {/* Bước 2: Chỉ nhập mã OTP để xác nhận */}
                {forgotStep === 2 && (
                  <>
                    <View style={styles.inputField}>
                      <Text style={[styles.inputLabel, { textAlign: 'center', marginBottom: 6 }]}>
                        MÃ OTP TỪ EMAIL (6 SỐ)
                      </Text>
                      <View style={styles.otpInputBox}>
                        <TextInput
                          style={styles.otpTextInput}
                          placeholder="• • • • • •"
                          placeholderTextColor="rgba(255, 255, 255, 0.2)"
                          value={otp}
                          onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, ''))}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoFocus
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                      onPress={handleVerifyResetOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Xác nhận mã OTP ›</Text>
                      )}
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setForgotStep(1);
                          setErrorMessage('');
                          setSuccessMessage('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>
                          ‹ Đổi email khác
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleSendForgotOtp}
                        disabled={loading}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: colors.primaryLight, fontSize: 12.5, fontWeight: '700' }}>
                          Gửi lại mã OTP
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Bước 3: Sau khi xác nhận OTP thành công -> Nhập mật khẩu mới & xác nhận mật khẩu mới */}
                {forgotStep === 3 && (
                  <>
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
                          secureTextEntry={!showNewPassword}
                          autoCapitalize="none"
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => setShowNewPassword(!showNewPassword)}
                          style={styles.eyeBtn}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '🙈'}</Text>
                        </TouchableOpacity>
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
                          secureTextEntry={!showNewPassword}
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
                        <Text style={styles.submitBtnText}>✓ Lưu mật khẩu mới</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ alignSelf: 'center', marginTop: 8 }}
                      onPress={() => {
                        setForgotStep(2);
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>
                        ‹ Nhập lại mã OTP khác
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: 14, padding: 6 }}
                  onPress={() => {
                    setAuthMode('login');
                    setForgotStep(1);
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

      {/* POP-UP (MODAL) CHỈNH SỬA HỒ SƠ, AVATAR & XÁC THỰC ĐỔI EMAIL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEditModalVisible(false);
          setEditEmailOtpStep(1);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>{editEmailOtpStep === 2 ? '🔐' : '👤'}</Text>
                <Text style={styles.modalTitle}>
                  {editEmailOtpStep === 2 ? 'Xác Thực Đổi Email' : 'Chỉnh Sửa Hồ Sơ & Avatar'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditModalVisible(false);
                  setEditEmailOtpStep(1);
                  setEditError('');
                  setEditMsg('');
                }}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {editError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {editError}</Text>
                </View>
              ) : null}
              {editMsg ? (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>✓ {editMsg}</Text>
                </View>
              ) : null}

              {editEmailOtpStep === 1 ? (
                <>
                  {/* Phần Avatar xem trước & Đổi Avatar */}
                  <Text style={styles.editSectionLabel}>ẢNH ĐẠI DIỆN HỌC VIÊN</Text>
                  <View style={styles.avatarPreviewRow}>
                    <View style={styles.avatarPreviewBig}>
                      {selectedAvatar && (selectedAvatar.startsWith('http') || selectedAvatar.startsWith('data:') || selectedAvatar.startsWith('file:') || selectedAvatar.startsWith('content:')) ? (
                        <Image source={{ uri: selectedAvatar }} style={styles.avatarBigImage} />
                      ) : selectedAvatar ? (
                        <Text style={styles.avatarBigEmoji}>{selectedAvatar}</Text>
                      ) : (
                        <Text style={styles.avatarBigText}>
                          {(editDisplayName || user?.email || 'U')[0].toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <View style={styles.avatarActionCol}>
                      <TouchableOpacity
                        style={styles.uploadAvatarBtn}
                        onPress={handlePickAvatarFromDevice}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.uploadAvatarBtnText}>📁 Chọn ảnh từ thiết bị</Text>
                      </TouchableOpacity>

                      {selectedAvatar && (
                        <TouchableOpacity
                          style={styles.removeAvatarBtn}
                          onPress={() => setSelectedAvatar(null)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.removeAvatarBtnText}>✕ Xóa ảnh (Dùng chữ cái)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Bộ sưu tập Avatar Preset */}
                  <Text style={styles.editSectionSubLabel}>Hoặc chọn nhanh Avatar phong cách AI:</Text>
                  <View style={styles.presetAvatarGrid}>
                    {PRESET_AVATARS.map((item) => {
                      const isSelected = selectedAvatar === item.icon;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.presetAvatarItem, isSelected && styles.presetAvatarItemActive]}
                          onPress={() => setSelectedAvatar(item.icon)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.presetAvatarIcon}>{item.icon}</Text>
                          <Text style={[styles.presetAvatarLabel, isSelected && styles.presetAvatarLabelActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Phần Tên hiển thị */}
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.editSectionLabel}>TÊN HIỂN THỊ HỌC VIÊN</Text>
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputIcon}>✏️</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Nhập tên hiển thị mới"
                        placeholderTextColor={colors.textMuted}
                        value={editDisplayName}
                        onChangeText={setEditDisplayName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  {/* Phần Email */}
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.editSectionLabel}>EMAIL TÀI KHOẢN (LIÊN KẾT HỆ THỐNG)</Text>
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputIcon}>✉️</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Nhập địa chỉ email mới"
                        placeholderTextColor={colors.textMuted}
                        value={editEmail}
                        onChangeText={setEditEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <Text style={styles.emailHintText}>
                      💡 Khi đổi sang email mới, hệ thống sẽ gửi mã OTP 6 số để xác thực trước khi cập nhật.
                    </Text>
                  </View>
                </>
              ) : (
                /* Bước 2: Xác thực mã OTP đổi Email */
                <View style={styles.otpStepContainer}>
                  <View style={styles.otpInfoBadge}>
                    <Text style={styles.otpInfoBadgeIcon}>✉️</Text>
                    <Text style={styles.otpInfoBadgeText}>
                      Mã xác nhận 6 số đã được gửi đến email mới:
                    </Text>
                    <Text style={styles.otpTargetEmailText}>{pendingChangeEmail}</Text>
                    <Text style={[styles.otpInfoBadgeText, { marginTop: 6, fontSize: 11 }]}>
                      Vui lòng nhập mã OTP để hoàn tất thay đổi email tài khoản.
                    </Text>
                  </View>

                  <Text style={styles.otpInputTitle}>NHẬP MÃ OTP (6 CHỮ SỐ)</Text>
                  <View style={styles.otpInputWrapper}>
                    <TextInput
                      style={styles.otpCodeInput}
                      placeholder="••••••"
                      placeholderTextColor={colors.textMuted}
                      value={emailChangeOtp}
                      onChangeText={setEmailChangeOtp}
                      keyboardType="numeric"
                      maxLength={6}
                      textAlign="center"
                      autoFocus
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.resendOtpBtn}
                    onPress={handleSaveProfile}
                    disabled={editLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resendOtpBtnText}>Chưa nhận được mã? Gửi lại OTP</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Hàng nút hành động nhỏ gọn, vừa phải */}
            <View style={styles.editModalBtnRow}>
              <TouchableOpacity
                style={styles.editModalCancelBtn}
                onPress={() => {
                  if (editEmailOtpStep === 2) {
                    setEditEmailOtpStep(1);
                    setEditError('');
                    setEditMsg('');
                  } else {
                    setEditModalVisible(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.editModalCancelBtnText}>
                  {editEmailOtpStep === 2 ? '‹ Quay lại' : 'Hủy'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editModalSubmitBtn, editLoading && styles.editModalSubmitBtnDisabled]}
                onPress={editEmailOtpStep === 2 ? handleConfirmEmailOtp : handleSaveProfile}
                disabled={editLoading}
                activeOpacity={0.8}
              >
                {editLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.editModalSubmitBtnText}>
                    {editEmailOtpStep === 2 ? 'Xác nhận OTP' : 'Lưu thay đổi'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  levelBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelBadgeText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '92%',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakIcon: {
    fontSize: 22,
  },
  streakTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  streakSubtitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  streakDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  weeklyProgressBarWrap: {
    width: '92%',
    marginTop: spacing.sm + 4,
  },
  weeklyProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  weeklyProgressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  weeklyProgressPercent: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '800',
  },
  weeklyProgressBar: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weeklyProgressFill: {
    height: '100%',
    backgroundColor: colors.primaryLight,
    borderRadius: 4,
  },
  profileTabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  profileTabBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  profileTabBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  profileTabBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  profileTabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dashboardCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    flexGrow: 1,
  },
  dashboardCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dashboardCardIcon: {
    fontSize: 18,
  },
  dashboardCardValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  dashboardCardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  dashboardCardDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  analyticsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  analyticRow: {
    marginBottom: 10,
  },
  analyticLabelWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  analyticLabel: {
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  analyticValue: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  analyticBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  analyticFill: {
    height: '100%',
    borderRadius: 3,
  },
  analyticDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.sm,
  },
  featureBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  featureTitle: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  featureTag: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  achievementBadge: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    opacity: 0.65,
    flexGrow: 1,
  },
  achievementBadgeUnlocked: {
    opacity: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  achievementTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  achievementSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  achievementStatus: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  // Rank Tier System Styles
  rankCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  rankIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankIconLarge: {
    fontSize: 26,
  },
  rankHeaderInfo: {
    flex: 1,
  },
  rankTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  rankCurrentName: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  rankTierTag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rankTierTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rankDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rankExpText: {
    color: colors.textSecondary,
    fontSize: 12.5,
    marginTop: 4,
    fontWeight: '600',
  },
  rankProgressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rankProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rankProgressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  rankProgressValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  rankProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  rankProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  rankHintText: {
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  rankDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.md,
  },
  rankTimelineTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  rankStepsList: {
    gap: 8,
    marginBottom: spacing.md,
  },
  rankStepItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: borderRadius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  rankStepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankStepIcon: {
    fontSize: 20,
  },
  rankStepName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  rankStepExp: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  currentBadgeSmall: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  currentBadgeSmallText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  rankStepRight: {
    alignItems: 'flex-end',
  },
  rankStepStatus: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  expRulesBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.07)',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  expRulesTitle: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  expRulesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  expRuleItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  expRuleIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  expRuleText: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  expRuleVal: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  ctaBox: {
    marginTop: spacing.sm,
    gap: 10,
    marginBottom: spacing.md,
  },
  primaryCtaBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCtaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  settingsNavBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsNavBtnText: {
    color: colors.primaryLight,
    fontSize: 13.5,
    fontWeight: '700',
  },
  secondaryCtaBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '700',
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  profileMiniName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  profileMiniEmail: {
    color: colors.textSecondary,
    fontSize: 12,
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
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  stepDotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  stepDotText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepDotTextInactive: {
    color: colors.textMuted,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  // Centered OTP Input
  otpInputBox: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.45)',
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  otpTextInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 10,
    color: colors.primaryLight,
    padding: 0,
    margin: 0,
  },
  // Avatar & Profile Edit Styles
  avatarWrap: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarPresetIcon: {
    fontSize: 42,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  avatarEditBadgeIcon: {
    fontSize: 12,
  },
  editProfileBtnHero: {
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderRadius: borderRadius.md,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  editProfileBtnHeroText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
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
    fontSize: 17,
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
  editSectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  editSectionSubLabel: {
    color: colors.textMuted,
    fontSize: 11.5,
    marginTop: 12,
    marginBottom: 8,
  },
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatarPreviewBig: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarBigImage: {
    width: '100%',
    height: '100%',
  },
  avatarBigEmoji: {
    fontSize: 34,
  },
  avatarBigText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  avatarActionCol: {
    flex: 1,
    gap: 8,
  },
  uploadAvatarBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  uploadAvatarBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  removeAvatarBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  removeAvatarBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  presetAvatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetAvatarItem: {
    width: '22.8%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  presetAvatarItemActive: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
  },
  presetAvatarIcon: {
    fontSize: 22,
  },
  presetAvatarLabel: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  presetAvatarLabelActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  emailHintText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  // Nút Hủy và Lưu nhỏ gọn, vừa phải theo yêu cầu
  editModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  editModalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  editModalCancelBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  editModalSubmitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  editModalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  editModalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  // OTP Verification Step
  otpStepContainer: {
    paddingVertical: 6,
  },
  otpInfoBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  otpInfoBadgeIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  otpInfoBadgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  otpTargetEmailText: {
    color: colors.primaryLight,
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  otpInputTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  otpInputWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  otpCodeInput: {
    width: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    paddingVertical: 10,
    textAlign: 'center',
  },
  resendOtpBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  resendOtpBtnText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
