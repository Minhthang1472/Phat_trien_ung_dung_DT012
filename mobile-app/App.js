import React, { useState, useEffect } from 'react';
import { StyleSheet, StatusBar, View, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './src/constants/theme';
import HomeScreen from './src/screens/HomeScreen';
import SyncPlayerScreen from './src/screens/SyncPlayerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { apiService } from './src/services/api';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('Profile');
  const [routeParams, setRouteParams] = useState({});
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'PHỤ ĐỀ BÀI GIẢNG TỰ ĐỘNG';
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

  if (checkingAuth) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor={colors.card} />
          <View style={[styles.container, styles.loadingCenter]}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.card} />
        <View style={styles.container}>
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
    backgroundColor: colors.card,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
