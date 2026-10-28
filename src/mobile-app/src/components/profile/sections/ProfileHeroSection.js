import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../../constants/theme';
import Icon from '../../ui/Icon';
import IconBadge from '../../ui/IconBadge';
import { resolveAvatarIcon, resolveAvatarUrl } from '../constants/profileData';
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
  const weeklyPercent = Math.min(100, Math.round((processedLectures / 5) * 100));
  const weeklyLabel = weeklyPercent >= 100 ? '100% Xuất sắc!' : `${weeklyPercent}%`;

  return (
    <View style={styles.profileHero}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.heroArc}
      />

      {/* Avatar to và nút sửa ảnh */}
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={onOpenEditProfile}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#7B2CBF', '#FF6F61', '#06D6A0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={styles.avatar}>
            {(() => {
              const avatarUri = resolveAvatarUrl(user.avatar) || (user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:') || user.avatar.startsWith('blob:') || user.avatar.startsWith('file:') || user.avatar.startsWith('content:')) ? user.avatar : null);
              if (avatarUri) {
                return <Image source={{ uri: avatarUri }} style={styles.avatarImage} />;
              }
              return (
                <Text style={styles.avatarText}>
                  {(user.display_name || user.email || 'U')[0].toUpperCase()}
                </Text>
              );
            })()}
          </View>
        </LinearGradient>
        <View style={styles.avatarEditBadge}>
          <Icon name="edit" size={14} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      <Text style={styles.name}>{user.display_name || 'Học viên'}</Text>
      <Text style={styles.email}>{user.email}</Text>

      {/* Hàng huy hiệu xác thực & Cấp bậc */}
      <View style={styles.badgeRow}>
        <View style={styles.verifiedBadge}>
          <Icon name="verified" size={14} color={colors.mintDeep} />
          <Text style={styles.verifiedBadgeText}>Tài khoản đã xác thực</Text>
        </View>
        <View
          style={[
            styles.levelBadge,
            {
              backgroundColor: rankInfo.current.bg,
            },
          ]}
        >
          <Icon name="diamond" size={13} color={rankInfo.current.color} />
          <Text style={[styles.levelBadgeText, { color: rankInfo.current.color }]}>
            {rankInfo.current.name}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editProfileBtnHero}
        onPress={onOpenEditProfile}
        activeOpacity={0.8}
      >
        <Icon name="edit" size={15} color={colors.coral} />
        <Text style={styles.editProfileBtnHeroText}> Chỉnh sửa thông tin &amp; Avatar</Text>
      </TouchableOpacity>

      {/* Chuỗi học tập & Mục tiêu tuần */}
      <View style={styles.streakBanner}>
        <View style={styles.streakInfo}>
          <IconBadge icon="fire" size={34} iconSize={18} tone="coral" />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Chuỗi ngày</Text>
            <Text style={styles.streakSubtitle} numberOfLines={1}>
              {streakDays} ngày liên tục
            </Text>
          </View>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakInfo}>
          <IconBadge icon="trackChanges" size={34} iconSize={18} tone="mint" />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Mục tiêu tuần</Text>
            <Text style={styles.streakSubtitle} numberOfLines={1}>
              {Math.min(processedLectures, 5)}/5 bài giảng
            </Text>
          </View>
        </View>
      </View>

      {/* Thanh tiến độ mục tiêu tuần */}
      <View style={styles.weeklyProgressBarWrap}>
        <View style={styles.weeklyProgressHeader}>
          <Text style={styles.weeklyProgressLabel}>Tiến độ hoàn thành tuần</Text>
          <Text style={styles.weeklyProgressPercent}>{weeklyLabel}</Text>
        </View>
        <View style={styles.weeklyProgressBar}>
          <LinearGradient
            colors={gradients.mint}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.weeklyProgressFill,
              { width: `${Math.min(100, Math.max(processedLectures > 0 ? 8 : 0, weeklyPercent))}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
}
