import React, { useState, useEffect } from 'react';
import { StyleSheet, StatusBar, View, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { colors } from './src/constants/theme';
import HomeScreen from './src/screens/HomeScreen';
import SyncPlayerScreen from './src/screens/SyncPlayerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BottomNavBar from './src/components/BottomNavBar';
import { apiService } from './src/services/api';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('Profile');
  const [routeParams, setRouteParams] = useState({});
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Plus Jakarta Sans là font nền tảng của design system mới.
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'PHỤ ĐỀ BÀI GIẢNG TỰ ĐỘNG';
      // Expo web không tự khóa chiều cao #root, khiến ScrollView không cuộn
      // mà cả trang cuộn theo (bottom nav bị đẩy khỏi màn hình).
      const rootEl = document.getElementById('root');
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      document.body.style.margin = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.backgroundColor = colors.surface;
      if (rootEl) {
        rootEl.style.height = '100%';
        rootEl.style.display = 'flex';
        rootEl.style.flexDirection = 'column';
      }
    }
    // Tự động kiểm tra và cập nhật link server mới nhất từ Firebase khi mở app
    apiService.syncServerUrlFromFirebase().catch(() => {});

    // Mới mở app: Nếu chưa đăng nhập thì hiện Đăng ký / Đăng nhập trước
    // Nếu đã có phiên đăng nhập hợp lệ thì chuyển thẳng vào màn hình chính Home
    const checkAuth = async () => {
      try {
        const user = await apiService.getSavedUser();
        const token = await apiService.getAuthToken();
        if (user && token) {
          setCurrentRoute('Home');
        } else {
          setCurrentRoute('Profile');
        }
      } catch (_) {
        setCurrentRoute('Profile');
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleNavigate = (route, params = {}) => {
    setRouteParams(params);
    setCurrentRoute(route);
  };

  const handleBack = () => {
    setCurrentRoute('Home');
    setRouteParams({});
  };

  if (checkingAuth || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
          <View style={[styles.container, styles.loadingCenter]}>
            <ActivityIndicator size="large" color={colors.coral} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.container}>
          <View style={styles.contentArea}>
            {currentRoute === 'Home' && <HomeScreen onNavigate={handleNavigate} />}

            {currentRoute === 'SyncPlayer' && (
              <SyncPlayerScreen
                lecture={routeParams.lecture}
                initialSeekTime={routeParams.initialSeekTime}
                onBack={handleBack}
              />
            )}
            {currentRoute === 'Profile' && (
              <ProfileScreen
                onBack={handleBack}
                onAuthSuccess={() => setCurrentRoute('Home')}
                onSkip={() => setCurrentRoute('Home')}
                onNavigate={handleNavigate}
              />
            )}
            {currentRoute === 'Settings' && (
              <SettingsScreen
                onBack={handleBack}
                onNavigate={handleNavigate}
              />
            )}
          </View>

          {/* Thanh điều hướng cố định dưới đáy (Bottom Navigation Bar) */}
          {(currentRoute === 'Home' || currentRoute === 'Profile' || currentRoute === 'Settings') && (
            <BottomNavBar
              currentRoute={currentRoute}
              onNavigate={(route) => {
                setRouteParams({});
                setCurrentRoute(route);
              }}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentArea: {
    flex: 1,
  },
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
