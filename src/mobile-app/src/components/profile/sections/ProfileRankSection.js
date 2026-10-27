import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../../../constants/theme';
import { RANKS } from '../constants/profileData';
import Icon from '../../ui/Icon';
import IconBadge from '../../ui/IconBadge';
import styles from '../styles/profileStyles';

const RANK_ICONS = {
  bronze: 'school',
  silver: 'workspacePremium',
  gold: 'stars',
  diamond: 'diamond',
  master: 'crown',
};

/**
 * Khối Phân bố Cấp bậc & Tiến độ thăng hạng học viên (Hạng hiện tại, Thanh tiến độ, Lộ trình, Quy tắc EXP)
 */
export default function ProfileRankSection({ rankInfo }) {
  if (!rankInfo || !rankInfo.current) return null;

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderLeft}>
          <IconBadge icon="militaryTech" size={32} iconSize={18} tone="violet" />
          <Text style={styles.sectionHeaderTitle}>Lộ trình phân bổ các hạng</Text>
        </View>
      </View>

      <View style={styles.rankCard}>
        {/* Header Thẻ Hạng Hiện Tại */}
        <View style={styles.rankHeader}>
          <View style={[styles.rankIconBox, { backgroundColor: rankInfo.current.bg }]}>
            <Icon
              name={RANK_ICONS[rankInfo.current.id] || 'militaryTech'}
              size={27}
              color={rankInfo.current.color}
            />
          </View>
          <View style={styles.rankHeaderInfo}>
            <View style={styles.rankTitleRow}>
              <Text style={[styles.rankCurrentName, { color: rankInfo.current.color }]}>
                {rankInfo.current.name}
              </Text>
              <View style={[styles.rankTierTag, { backgroundColor: rankInfo.current.bg }]}>
                <Text style={[styles.rankTierTagText, { color: rankInfo.current.color }]}>
                  CẤP {rankInfo.current.tier}
                </Text>
              </View>
            </View>
            <Text style={styles.rankDesc}>{rankInfo.current.desc}</Text>
            <View style={styles.rankExpBadge}>
              <Icon name="sparkle" size={13} color={colors.coral} />
              <Text style={styles.rankExpBadgeText}>
                Tích lũy:{' '}
                <Text style={styles.rankExpValue}>{rankInfo.totalExp} EXP</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Thanh tiến độ thăng hạng */}
        <View style={styles.rankProgressContainer}>
          <View style={styles.rankProgressHeader}>
            <Text style={styles.rankProgressLabel}>
              {rankInfo.next
                ? `Tiến độ lên ${rankInfo.next.name}`
                : 'Đã đạt cấp bậc cao nhất'}
            </Text>
            <Text style={[styles.rankProgressValue, { color: rankInfo.current.color }]}>
              {rankInfo.progressPercent}%
            </Text>
          </View>
          <View style={styles.rankProgressBar}>
            <LinearGradient
              colors={[rankInfo.current.color, colors.coral]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.rankProgressFill,
                { width: `${Math.max(4, rankInfo.progressPercent)}%` },
              ]}
            />
          </View>
          {rankInfo.next ? (
            <View style={styles.rankHintRow}>
              <Icon name="stars" size={14} color={colors.coral} />
              <Text style={[styles.rankHintText, { flex: 1, marginTop: 0 }]}>
                Hoàn thành thêm mục tiêu để nhận{' '}
                <Text style={{ color: colors.coral, fontFamily: fonts.extraBold }}>
                  +{rankInfo.expNeeded} EXP
                </Text>{' '}
                thăng hạng
              </Text>
            </View>
          ) : (
            <View style={styles.rankHintRow}>
              <Icon name="sparkle" size={14} color={colors.violet} />
              <Text style={[styles.rankHintText, { flex: 1, marginTop: 0, color: colors.violet }]}>
                Chúc mừng! Bạn đã chạm mốc cao nhất của bảng xếp hạng học giả!
              </Text>
            </View>
          )}
        </View>

        <View style={styles.rankDivider} />

        {/* Lộ trình phân bố các hạng */}
        <Text style={styles.rankTimelineTitle}>LỘ TRÌNH PHÂN BỐ CÁC HẠNG</Text>
        <View style={styles.rankStepsList}>
          {RANKS.map((r) => {
            const isAchieved = rankInfo.totalExp >= r.minExp;
            const isCurrent = rankInfo.current.id === r.id;
            return (
              <View
                key={r.id}
                style={[
                  styles.rankStepItem,
                  isCurrent && { borderColor: r.color, backgroundColor: r.bg },
                  !isAchieved && { opacity: 0.72 },
                ]}
              >
                <View style={styles.rankStepLeft}>
                  <View style={[styles.rankStepIconWrap, isCurrent && { backgroundColor: colors.surfaceLowest }]}>
                    <Icon
                      name={RANK_ICONS[r.id] || 'militaryTech'}
                      size={16}
                      color={isCurrent ? r.color : colors.slate}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text
                        style={[
                          styles.rankStepName,
                          isCurrent && { color: r.color },
                        ]}
                        numberOfLines={1}
                      >
                        {r.name}
                      </Text>
                      {isCurrent && (
                        <View style={[styles.currentBadgeSmall, { backgroundColor: r.color }]}>
                          <Text style={styles.currentBadgeSmallText}>HIỆN TẠI</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rankStepExp}>Yêu cầu: {r.minExp} EXP</Text>
                  </View>
                </View>
                <View style={styles.rankStepRight}>
                  <View
                    style={[
                      styles.rankStepPill,
                      !isAchieved && styles.rankStepPillLocked,
                    ]}
                  >
                    {isAchieved && (
                      <Icon name="checkCircle" size={11} color={colors.mintDeep} />
                    )}
                    <Text
                      style={[
                        styles.rankStepPillText,
                        !isAchieved && styles.rankStepPillTextLocked,
                      ]}
                    >
                      {isAchieved ? 'Đã đạt' : `Còn ${r.minExp - rankInfo.totalExp} EXP`}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Quy tắc tích lũy EXP */}
        <View style={styles.expRulesBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="electricBolt" size={14} color={colors.violet} />
            <Text style={[styles.expRulesTitle, { marginBottom: 0 }]}>
              Quy tắc nhận điểm EXP khi hoàn thành
            </Text>
          </View>
          <View style={[styles.expRulesRow, { marginTop: 8 }]}>
            <View style={styles.expRuleItem}>
              <Icon name="playCircle" size={16} color={colors.coral} />
              <Text style={styles.expRuleText}>Bài giảng</Text>
              <Text style={styles.expRuleVal}>+100 EXP</Text>
            </View>
            <View style={styles.expRuleItem}>
              <Icon name="factCheck" size={16} color={colors.mintDeep} />
              <Text style={styles.expRuleText}>Ôn trắc nghiệm</Text>
              <Text style={[styles.expRuleVal, { color: colors.mintDeep }]}>+10 EXP</Text>
            </View>
            <View style={styles.expRuleItem}>
              <Icon name="clock" size={16} color={colors.violet} />
              <Text style={styles.expRuleText}>Thời gian học</Text>
              <Text style={[styles.expRuleVal, { color: colors.violet }]}>+2 EXP/ph</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}
