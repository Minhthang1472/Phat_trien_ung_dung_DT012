import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../constants/theme';
import Icon from './ui/Icon';
import IconBadge from './ui/IconBadge';

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Vừa xong';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} giờ trước`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} ngày trước`;
};

const getNotifIconTone = (type) => {
  switch (type) {
    case 'success':
      return { tone: 'mint', iconName: 'check' };
    case 'warning':
      return { tone: 'lemon', iconName: 'bolt' };
    case 'error':
      return { tone: 'coral', iconName: 'close' };
    case 'info':
    default:
      return { tone: 'violet', iconName: 'sparkle' };
  }
};

export default function NotificationModal({
  visible,
  notifications = [],
  onClose,
  onMarkAllAsRead,
  onClearAll,
  onDeleteSingle,
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <IconBadge icon="bell" size={32} iconSize={17} tone="coral" />
              <View>
                <Text style={styles.title}>THÔNG BÁO</Text>
                <Text style={styles.subtitle}>
                  {unreadCount > 0
                    ? `Bạn có ${unreadCount} thông báo chưa đọc`
                    : 'Tất cả thông báo hệ thống'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Đóng thông báo"
            >
              <Icon name="close" size={18} color={colors.slate} />
            </TouchableOpacity>
          </View>

          {/* Quick Action Toolbar */}
          {notifications.length > 0 ? (
            <View style={styles.toolbar}>
              {unreadCount > 0 ? (
                <TouchableOpacity
                  style={styles.toolBtn}
                  onPress={onMarkAllAsRead}
                  activeOpacity={0.7}
                >
                  <Icon name="check" size={14} color={colors.mintDeep} />
                  <Text style={[styles.toolBtnText, { color: colors.mintDeep }]}>
                    Đọc tất cả
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.toolBtn}
                onPress={onClearAll}
                activeOpacity={0.7}
              >
                <Icon name="delete" size={14} color={colors.coral} />
                <Text style={[styles.toolBtnText, { color: colors.coral }]}>
                  Xóa tất cả
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Danh sách thông báo */}
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Icon name="bell" size={44} color={colors.slateLight} />
                <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
                <Text style={styles.emptyDesc}>
                  Khi bạn phiên dịch video, xóa bài giảng hoặc đổi tài khoản, thông báo sẽ hiển thị tại đây.
                </Text>
              </View>
            ) : (
              notifications.map((item) => {
                const iconInfo = getNotifIconTone(item.type);
                const resolvedIcon = item.icon === 'trash' ? 'delete' : (item.icon === 'key' ? 'settings' : iconInfo.iconName);

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.notifItem,
                      !item.read && styles.notifItemUnread,
                    ]}
                  >
                    <View style={styles.notifLeft}>
                      <IconBadge
                        icon={resolvedIcon}
                        size={32}
                        iconSize={16}
                        tone={iconInfo.tone}
                      />
                    </View>

                    <View style={styles.notifBody}>
                      <View style={styles.notifTopRow}>
                        <Text style={styles.notifTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.notifTime}>
                          {formatRelativeTime(item.timestamp)}
                        </Text>
                      </View>

                      <Text style={styles.notifMsg}>{item.message}</Text>
                    </View>

                    {onDeleteSingle ? (
                      <TouchableOpacity
                        style={styles.deleteSingleBtn}
                        onPress={() => onDeleteSingle(item.id)}
                        activeOpacity={0.6}
                      >
                        <Icon name="close" size={14} color={colors.slateLight} />
                      </TouchableOpacity>
                    ) : null}

                    {!item.read ? <View style={styles.unreadDot} /> : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLow,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.heavy,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.slate,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLow,
  },
  toolBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
  },
  listContainer: {
    marginTop: spacing.xs,
  },
  listContent: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FAFAFC',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    position: 'relative',
    gap: spacing.sm,
  },
  notifItemUnread: {
    backgroundColor: '#F3F8FF',
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  notifLeft: {
    flexShrink: 0,
    marginTop: 2,
  },
  notifBody: {
    flex: 1,
    minWidth: 0,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  notifTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
    flex: 1,
    marginRight: 6,
  },
  notifTime: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.slateLight,
  },
  notifMsg: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate,
    lineHeight: 16,
  },
  deleteSingleBtn: {
    padding: 4,
    marginLeft: 2,
  },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.coral,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  emptyDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.slate,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 17,
  },
});
