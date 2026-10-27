import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, radius, shadows, spacing } from '../constants/theme';
import Icon from './ui/Icon';

const BRANCH_COLORS = [
  { border: colors.coral, bg: colors.coralTint, badge: 'rgba(255, 111, 97, 0.18)', text: colors.coralDeep },
  { border: colors.mint, bg: colors.mintSoft, badge: 'rgba(6, 214, 160, 0.18)', text: colors.mintDeep },
  { border: colors.violet, bg: colors.violetSoft, badge: 'rgba(123, 44, 191, 0.14)', text: colors.violet },
  { border: colors.lemon, bg: colors.lemonSoft, badge: 'rgba(255, 209, 102, 0.28)', text: '#8A6100' },
  { border: colors.pink, bg: '#FFF0F5', badge: 'rgba(255, 92, 138, 0.16)', text: '#B3245A' },
];

export default function MindmapViewer({ mindmap, defaultTitle = 'Sơ đồ tư duy bài giảng' }) {
  const [collapsedBranches, setCollapsedBranches] = useState(new Set());

  const toggleBranch = (index) => {
    setCollapsedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const rootTitle = mindmap?.title || defaultTitle;
  const branches = mindmap?.children || [];

  return (
    <View style={styles.container}>
      {/* Nút Gốc Trung tâm (Root Node) */}
      <View style={styles.rootCard}>
        <View style={styles.rootBadge}>
          <Icon name="sparkle" size={11} color={colors.violet} />
          <Text style={styles.rootBadgeText}>CHỦ ĐỀ TRUNG TÂM</Text>
        </View>
        <Text style={styles.rootTitle}>{rootTitle}</Text>
        <Text style={styles.rootSubtitle}>
          {branches.length} nhánh kiến thức chính • Chạm vào nhánh để thu gọn
        </Text>
      </View>

      {/* Đường nối trục chính */}
      <View style={styles.trunkLine} />

      {/* Danh sách các nhánh chính (Branches) */}
      {branches.length > 0 ? (
        branches.map((branch, bIdx) => {
          const theme = BRANCH_COLORS[bIdx % BRANCH_COLORS.length];
          const isCollapsed = collapsedBranches.has(bIdx);
          const subChildren = branch.children || [];

          return (
            <View key={bIdx} style={styles.branchWrapper}>
              {/* Nhánh cha */}
              <TouchableOpacity
                style={[
                  styles.branchCard,
                  { borderColor: theme.border, backgroundColor: theme.bg },
                ]}
                onPress={() => toggleBranch(bIdx)}
                activeOpacity={0.85}
              >
                <View style={styles.branchHeaderRow}>
                  <View style={[styles.branchIndexBadge, { backgroundColor: theme.badge }]}>
                    <Text style={[styles.branchIndexText, { color: theme.text }]}>
                      {bIdx + 1}
                    </Text>
                  </View>
                  <Text style={[styles.branchTitle, { color: theme.text }]}>
                    {branch.title}
                  </Text>
                  <View style={styles.collapseToggle}>
                    <Icon
                      name={isCollapsed ? 'plus' : 'minus'}
                      size={16}
                      color={theme.text}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Các nhánh lá chi tiết (Sub-nodes) */}
              {!isCollapsed && subChildren.length > 0 && (
                <View style={styles.subNodesContainer}>
                  <View style={[styles.branchLine, { borderLeftColor: theme.border }]} />
                  <View style={styles.subNodesList}>
                    {subChildren.map((sub, sIdx) => (
                      <View key={sIdx} style={styles.subNodeCard}>
                        <View style={[styles.subNodeDot, { backgroundColor: theme.border }]} />
                        <Text style={styles.subNodeText}>{sub.title}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Chưa có dữ liệu sơ đồ tư duy cho bài học này.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  rootCard: {
    backgroundColor: colors.violetSoft,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(123, 44, 191, 0.28)',
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.violet,
  },
  rootBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceLowest,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  rootBadgeText: {
    color: colors.violet,
    fontFamily: fonts.extraBold,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 0.4,
  },
  rootTitle: {
    color: colors.ink,
    fontFamily: fonts.extraBold,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  rootSubtitle: {
    color: colors.slate,
    fontFamily: fonts.medium,
    fontSize: 10.5,
    marginTop: 4,
    textAlign: 'center',
  },
  trunkLine: {
    width: 2,
    height: 16,
    backgroundColor: 'rgba(123, 44, 191, 0.28)',
    alignSelf: 'center',
  },
  branchWrapper: {
    marginBottom: spacing.sm,
  },
  branchCard: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  branchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  branchIndexText: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
  },
  branchTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 13.5,
    lineHeight: 19,
  },
  collapseToggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  subNodesContainer: {
    flexDirection: 'row',
    marginLeft: 18,
    marginTop: 6,
  },
  branchLine: {
    width: 2,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    marginRight: 12,
  },
  subNodesList: {
    flex: 1,
    gap: 6,
  },
  subNodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  subNodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  subNodeText: {
    color: colors.slate,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  emptyCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 12.5,
  },
});
