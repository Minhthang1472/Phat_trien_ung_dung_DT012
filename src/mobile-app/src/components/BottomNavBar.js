import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, fonts, radius } from '../constants/theme';
import GlassBar from './ui/GlassBar';
import Icon from './ui/Icon';

const TABS = [
  { route: 'Home', label: 'Bài giảng', icon: 'lecture' },
  { route: 'Profile', label: 'Hồ sơ', icon: 'profile' },
  { route: 'Settings', label: 'Cài đặt', icon: 'settings' },
];

export default function BottomNavBar({ currentRoute, onNavigate }) {
  return (
    <GlassBar style={styles.container} intensity={55} tint="light">
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const active = currentRoute === tab.route;
          return (
            <TouchableOpacity
              key={tab.route}
              style={styles.tabItem}
              onPress={() => onNavigate(tab.route)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.pill, active && styles.pillActive]}>
                <Icon
                  name={tab.icon}
                  size={22}
                  color={active ? '#FFFFFF' : colors.slate}
                />
                <Text style={[styles.label, active && styles.labelActive]}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </GlassBar>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 27, 75, 0.05)',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 12,
  },
  bar: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  pillActive: {
    backgroundColor: colors.coral,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
    transform: [{ scale: 1.03 }],
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.slate,
  },
  labelActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
});
