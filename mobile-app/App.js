import React, { useState } from 'react';
import { StyleSheet, StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './src/constants/theme';
import HomeScreen from './src/screens/HomeScreen';
import SyncPlayerScreen from './src/screens/SyncPlayerScreen';
import LiveCaptionScreen from './src/screens/LiveCaptionScreen';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('Home');
  const [routeParams, setRouteParams] = useState({});

  const handleNavigate = (route, params = {}) => {
    setRouteParams(params);
    setCurrentRoute(route);
  };

  const handleBack = () => {
    setCurrentRoute('Home');
    setRouteParams({});
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={colors.card} />
        <View style={styles.container}>
          {currentRoute === 'Home' && <HomeScreen onNavigate={handleNavigate} />}

          {currentRoute === 'SyncPlayer' && (
            <SyncPlayerScreen lecture={routeParams.lecture} onBack={handleBack} />
          )}

          {currentRoute === 'LiveCaption' && <LiveCaptionScreen onBack={handleBack} />}
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
});
