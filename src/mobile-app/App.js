import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { colors } from './src/constants/theme';
import { apiService } from './src/services/api';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import SyncPlayerScreen from './src/screens/SyncPlayerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BottomNavBar from './src/components/BottomNavBar';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('Home');
  const [currentUser, setCurrentUser] = useState(null);
  const [routeParams, setRouteParams] = useState({});
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Nạp bộ font Plus Jakarta Sans đầy đủ các trọng số
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'EdTech AI - Học Thông Minh Mỗi Ngày';
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

    // Mới mở app: Kiểm tra phiên đăng nhập đã lưu
    const checkAuth = async () => {
      try {
        const user = await apiService.getSavedUser();
        const token = await apiService.getAuthToken();
        if (user && token) {
          setCurrentUser(user);
          setCurrentRoute('Home');
        } else {
          setCurrentUser(null);
          setCurrentRoute('Home');
        }
      } catch (_) {
        setCurrentUser(null);
        setCurrentRoute('Home');
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

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (_) {}
    setCurrentUser(null);
    setCurrentRoute('Home');
  };

  if (checkingAuth || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" backgroundColor={colors.surface} />
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
        <StatusBar style="dark" backgroundColor={colors.surface} />
        <View style={styles.container}>
          <View style={styles.contentArea}>
            {currentRoute === 'Auth' && (
              <AuthScreen
                onAuthSuccess={(user) => {
                  setCurrentUser(user);
                  setCurrentRoute('Home');
                }}
                onSkip={() => setCurrentRoute('Home')}
              />
            )}
            {currentRoute === 'Home' && (
              <HomeScreen
                currentUser={currentUser}
                onNavigate={handleNavigate}
              />
            )}

            {currentRoute === 'SyncPlayer' && (
              <SyncPlayerScreen
                lecture={routeParams.lecture}
                initialSeekTime={routeParams.initialSeekTime}
                endTime={routeParams.endTime}
                onBack={handleBack}
              />
            )}
            {currentRoute === 'Profile' && (
              <ProfileScreen
                currentUser={currentUser}
                onBack={handleBack}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            )}
            {currentRoute === 'Settings' && (
              <SettingsScreen
                currentUser={currentUser}
                onBack={handleBack}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            )}
          </View>

          {/* Thanh điều hướng cố định dưới đáy (Bottom Navigation Bar) */}
          {(currentRoute === 'Home' || currentRoute === 'Profile' || currentRoute === 'Settings' || currentRoute === 'Auth') && (
            <BottomNavBar
              currentRoute={currentRoute}
              isLoggedIn={!!currentUser}
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
  },
  contentArea: {
    flex: 1,
  },
  loadingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
