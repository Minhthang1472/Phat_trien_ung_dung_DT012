import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../../constants/theme';
import { RANKS } from '../constants/profileData';
import styles from '../styles/profileStyles';

/**
 * Khối Phân bố Cấp bậc & Tiến độ thăng hạng học viên (Hạng hiện tại, Thanh tiến độ, Lộ trình, Quy tắc EXP)
 */
export default function ProfileRankSection({ rankInfo }) {
  if (!rankInfo || !rankInfo.current) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>🎖️ PHÂN BỐ CẤP BẬC & TIẾN ĐỘ THĂNG HẠNG</Text>
      <View style={styles.rankCard}>
        {/* Header Thẻ Hạng Hiện Tại */}
        <View style={styles.rankHeader}>
          <View
            style={[
              styles.rankIconBox,
              {
                backgroundColor: rankInfo.current.bg,
                borderColor: rankInfo.current.color,
              },
            ]}
          >
            <Text style={styles.rankIconLarge}>{rankInfo.current.icon}</Text>
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
            <Text style={styles.rankExpText}>
              ✨ Tích lũy: <Text style={{ color: colors.primaryLight, fontWeight: '800' }}>{rankInfo.totalExp} EXP</Text>
            </Text>
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
            <View
              style={[
                styles.rankProgressFill,
                {
                  width: `${Math.max(5, rankInfo.progressPercent)}%`,
                  backgroundColor: rankInfo.current.color,
                },
              ]}
            />
          </View>
          {rankInfo.next ? (
            <Text style={styles.rankHintText}>
              🎯 Hoàn thành thêm mục tiêu để nhận{' '}
              <Text style={{ color: colors.primaryLight, fontWeight: '700' }}>
                +{rankInfo.expNeeded} EXP
              </Text>{' '}
              thăng lên {rankInfo.next.icon}{' '}
              <Text style={{ color: rankInfo.next.color, fontWeight: '700' }}>
                {rankInfo.next.name}
              </Text>
            </Text>
          ) : (
            <Text style={[styles.rankHintText, { color: '#a855f7' }]}>
              🎉 Chúc mừng! Bạn đã chạm mốc cao nhất của bảng xếp hạng học giả!
            </Text>
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
                  isCurrent && { borderColor: r.color, backgroundColor: r.bg, borderWidth: 1.5 },
                  !isAchieved && { opacity: 0.5 },
                ]}
              >
                <View style={styles.rankStepLeft}>
                  <Text style={styles.rankStepIcon}>{r.icon}</Text>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.rankStepName,
                          isCurrent && { color: r.color, fontWeight: '800' },
                        ]}
                      >
                        {r.name}
                      </Text>
                      {isCurrent && (
                        <View style={[styles.currentBadgeSmall, { backgroundColor: r.color }]}>
                          <Text style={styles.currentBadgeSmallText}>Hiện tại</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rankStepExp}>Yêu cầu: {r.minExp} EXP</Text>
                  </View>
                </View>
                <View style={styles.rankStepRight}>
                  <Text
                    style={[
                      styles.rankStepStatus,
                      isAchieved ? { color: '#10b981' } : { color: colors.textMuted },
                    ]}
                  >
                    {isAchieved ? '✓ Đã đạt' : `Còn ${r.minExp - rankInfo.totalExp} EXP`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Quy tắc tích lũy EXP */}
        <View style={styles.expRulesBox}>
          <Text style={styles.expRulesTitle}>⚡ QUY TẮC NHẬN ĐIỂM EXP KHI HOÀN THÀNH:</Text>
          <View style={styles.expRulesRow}>
            <View style={styles.expRuleItem}>
              <Text style={styles.expRuleIcon}>📚</Text>
              <Text style={styles.expRuleText}>Hoàn thành bài giảng</Text>
              <Text style={styles.expRuleVal}>+100 EXP</Text>
            </View>
            <View style={styles.expRuleItem}>
              <Text style={styles.expRuleIcon}>🎯</Text>
              <Text style={styles.expRuleText}>Câu hỏi ôn tập</Text>
              <Text style={styles.expRuleVal}>+10 EXP</Text>
            </View>
            <View style={styles.expRuleItem}>
              <Text style={styles.expRuleIcon}>⏱️</Text>
              <Text style={styles.expRuleText}>Thời gian học tập</Text>
              <Text style={styles.expRuleVal}>+2 EXP / ph</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}
