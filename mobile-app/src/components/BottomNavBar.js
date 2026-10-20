import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { colors } from '../constants/theme';

function HomeIcon({ color }) {
  return (
    <View style={styles.iconBox}>
      {/* Roof */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 10,
          borderRightWidth: 10,
          borderBottomWidth: 8,
          borderStyle: 'solid',
          backgroundColor: 'transparent',
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
      {/* House Body */}
      <View
        style={{
          width: 15,
          height: 10,
          borderWidth: 2,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            width: 5,
            height: 5,
            backgroundColor: color,
            borderTopLeftRadius: 1.5,
            borderTopRightRadius: 1.5,
          }}
        />
      </View>
    </View>
  );
}

function ProfileIcon({ color }) {
  return (
    <View style={styles.iconBox}>
      {/* Head */}
      <View
        style={{
          width: 9,
          height: 9,
          borderRadius: 4.5,
          borderWidth: 2,
          borderColor: color,
          marginBottom: 1,
        }}
      />
      {/* Shoulders */}
      <View
        style={{
          width: 17,
          height: 8,
          borderTopLeftRadius: 9,
          borderTopRightRadius: 9,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
    </View>
  );
}

function SettingsIcon({ color }) {
  return (
    <View style={styles.iconBox}>
      <View
        style={{
          width: 17,
          height: 17,
          borderRadius: 8.5,
          borderWidth: 2,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: 3,
            height: 21,
            backgroundColor: color,
            borderRadius: 1.5,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 21,
            height: 3,
            backgroundColor: color,
            borderRadius: 1.5,
          }}
        />
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: '#0b0f19',
            borderWidth: 1.5,
            borderColor: color,
            zIndex: 2,
          }}
        />
      </View>
    </View>
  );
}

export default function BottomNavBar({ currentRoute, onNavigate }) {
  const isHome = currentRoute === 'Home';
  const isProfile = currentRoute === 'Profile';
  const isSettings = currentRoute === 'Settings';

  const activeColor = '#a855f7';
  const inactiveColor = '#64748b';

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {/* Tab 1: Bài giảng */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('Home')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, isHome && styles.activeIconWrapper]}>
            <HomeIcon color={isHome ? activeColor : inactiveColor} />
          </View>
          <Text style={[styles.tabLabel, isHome ? styles.activeLabel : styles.inactiveLabel]}>
            Bài giảng
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Hồ sơ */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, isProfile && styles.activeIconWrapper]}>
            <ProfileIcon color={isProfile ? activeColor : inactiveColor} />
          </View>
          <Text style={[styles.tabLabel, isProfile ? styles.activeLabel : styles.inactiveLabel]}>
            Hồ sơ
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Cài đặt */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('Settings')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, isSettings && styles.activeIconWrapper]}>
            <SettingsIcon color={isSettings ? activeColor : inactiveColor} />
          </View>
          <Text style={[styles.tabLabel, isSettings ? styles.activeLabel : styles.inactiveLabel]}>
            Cài đặt
          </Text>
        </TouchableOpacity>
      </View>

      {/* iOS/Modern Home Indicator Bar (như trong ảnh mẫu) */}
      <View style={styles.homeIndicatorWrapper}>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b0f19',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 48,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconBox: {
    width: 24,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    borderRadius: 14,
  },
  activeIconWrapper: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: '#a855f7',
    fontWeight: '800',
  },
  inactiveLabel: {
    color: '#64748b',
    fontWeight: '600',
  },
  homeIndicatorWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  homeIndicator: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});
