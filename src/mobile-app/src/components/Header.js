import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, gradients, radius } from '../constants/theme';
import GlassBar from './ui/GlassBar';
import Icon from './ui/Icon';
import BrandLogo from './ui/BrandLogo';
import NotificationModal from './NotificationModal';
import { notificationService } from '../services/notificationService';
import { apiService } from '../services/api';

export default function Header({
  title = 'EdTech AI',
  brand = false,
  serverStatus,
  onOpenSettings,
  onBack,
  showBack = false,
  rightElement,
  streakLabel = '1 Ngày',
}) {
  const [internalOnline, setInternalOnline] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);

  useEffect(() => {
    let active = true;
    if (serverStatus !== null && serverStatus !== undefined) {
      setInternalOnline(!!serverStatus?.online);
    } else {
      apiService
        .checkServerHealth()
        .then((res) => {
          if (active) setInternalOnline(!!res?.online);
        })
        .catch(() => {
          if (active) setInternalOnline(false);
        });
    }
    return () => {
      active = false;
    };
  }, [serverStatus]);

  const online = serverStatus !== null && serverStatus !== undefined ? !!serverStatus?.online : internalOnline;

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((list) => {
      setNotifications(list || []);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <GlassBar style={styles.container} intensity={50} tint="light">
        <View style={styles.inner}>
          <View style={[styles.leftSection, brand && !showBack && styles.leftSectionBrand]}>
            {showBack ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                activeOpacity={0.7}
                accessibilityLabel="Quay lại"
              >
                <Icon name="back" size={24} color={colors.ink} />
              </TouchableOpacity>
            ) : brand ? (
              <BrandLogo size={38} />
            ) : (
              <View style={styles.logoBadge}>
                <Icon name="school" size={22} color={colors.coral} />
              </View>
            )}

            {brand && !showBack ? (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: online ? colors.mintSoft : colors.lemonSoft },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: online ? colors.mint : colors.lemon },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: online ? colors.mintDeep : '#8A6100' },
                  ]}
                >
                  {online ? 'TRỰC TUYẾN' : 'NGOẠI TUYẾN'}
                </Text>
              </View>
            ) : (
              <View style={styles.titleWrap}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                  {!showBack ? (
                    <Icon name="sparkle" size={15} color={colors.coral} style={styles.sparkle} />
                  ) : null}
                </View>

                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: online ? colors.mintSoft : colors.lemonSoft },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: online ? colors.mint : colors.lemon },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: online ? colors.mintDeep : '#8A6100' },
                    ]}
                  >
                    {online ? 'TRỰC TUYẾN' : 'NGOẠI TUYẾN'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.rightSection}>
            {rightElement}

            {!showBack ? (
              <>
                <View style={styles.streakPill}>
                  <Icon name="fire" size={15} color={colors.coral} />
                  <Text style={styles.streakText}>{streakLabel}</Text>
                </View>

                {/* Nút chuông thông báo trực quan */}
                <TouchableOpacity
                  style={styles.bellButton}
                  onPress={() => setShowNotifModal(true)}
                  activeOpacity={0.75}
                  accessibilityLabel="Thông báo hệ thống"
                >
                  <Icon name="bell" size={21} color={unreadCount > 0 ? colors.coral : colors.slate} />
                  {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
                </TouchableOpacity>
              </>
            ) : null}

            {onOpenSettings ? (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onOpenSettings}
                activeOpacity={0.7}
                accessibilityLabel="Cài đặt"
              >
                <Icon name="settings" size={20} color={colors.slate} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </GlassBar>

      {/* Modal Thông báo hệ thống */}
      <NotificationModal
        visible={showNotifModal}
        notifications={notifications}
        onClose={() => setShowNotifModal(false)}
        onMarkAllAsRead={() => notificationService.markAllAsRead()}
        onClearAll={() => notificationService.clearAll()}
        onDeleteSingle={(id) => notificationService.deleteNotification(id)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 27, 75, 0.05)',
  },
  inner: {
    minHeight: 64,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  leftSectionBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexShrink: 1,
    minWidth: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLow,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralTint,
    flexShrink: 0,
  },
  titleWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 24,
    color: colors.ink,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  sparkle: {
    marginTop: -1,
  },
  statusPill: {
    marginTop: 3,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: fonts.extraBold,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.6,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLowest,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  streakText: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.ink,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.coral,
    borderWidth: 1.5,
    borderColor: colors.surfaceBright,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLow,
  },
});
