import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import styles from '../styles/profileStyles';

/**
 * Khối thông tin học viên Hero: Avatar, Tên, Cấp bậc, Chuỗi ngày học (Streak) và Tiến độ tuần
 */
export default function ProfileHeroSection({
  user,
  rankInfo,
  streakDays = 0,
  processedLectures = 0,
  onOpenEditProfile,
}) {
  return (
    <View style={styles.profileHero}>
      {/* Avatar to và nút sửa ảnh */}
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={onOpenEditProfile}
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
        onPress={onOpenEditProfile}
        activeOpacity={0.7}
      >
        <Text style={styles.editProfileBtnHeroText}>✏️ Chỉnh sửa thông tin & Avatar</Text>
      </TouchableOpacity>

      <Text style={styles.email}>{user.email}</Text>

      {/* Hàng huy hiệu xác thực & Cấp bậc */}
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
            <Text style={styles.streakSubtitle}>{Math.min(processedLectures, 5)}/5 bài giảng</Text>
          </View>
        </View>
      </View>

      {/* Thanh tiến độ mục tiêu tuần */}
      <View style={styles.weeklyProgressBarWrap}>
        <View style={styles.weeklyProgressHeader}>
          <Text style={styles.weeklyProgressLabel}>Tiến độ hoàn thành tuần này</Text>
          <Text style={styles.weeklyProgressPercent}>
            {Math.min(100, Math.round((processedLectures / 5) * 100))}%
          </Text>
        </View>
        <View style={styles.weeklyProgressBar}>
          <View
            style={[
              styles.weeklyProgressFill,
              {
                width: `${Math.min(100, Math.max(processedLectures > 0 ? 15 : 0, Math.round((processedLectures / 5) * 100)))}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}
