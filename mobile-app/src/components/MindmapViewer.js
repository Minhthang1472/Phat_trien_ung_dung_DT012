import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

const BRANCH_COLORS = [
  { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)', badge: 'rgba(99, 102, 241, 0.25)', text: '#a5b4fc' },
  { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', badge: 'rgba(6, 182, 212, 0.25)', text: '#67e8f9' },
  { border: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', badge: 'rgba(16, 185, 129, 0.25)', text: '#6ee7b7' },
  { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', badge: 'rgba(245, 158, 11, 0.25)', text: '#fcd34d' },
  { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', badge: 'rgba(236, 72, 153, 0.25)', text: '#f472b6' },
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
          <Text style={styles.rootBadgeText}>🌟 CHỦ ĐỀ TRUNG TÂM</Text>
        </View>
        <Text style={styles.rootTitle}>{rootTitle}</Text>
        <Text style={styles.rootSubtitle}>
          {branches.length} nhánh kiến thức chính • Chạm vào nhánh để thu phóng
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
                activeOpacity={0.8}
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
                    <Text style={styles.collapseToggleText}>
                      {isCollapsed ? '➕' : '➖'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Các nhánh lá chi tiết (Sub-nodes) */}
              {!isCollapsed && subChildren.length > 0 && (
                <View style={styles.subNodesContainer}>
                  <View style={[styles.branchLine, { borderColor: theme.border }]} />
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
    backgroundColor: '#0f172a',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  rootBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  rootBadgeText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rootTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
  },
  rootSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  trunkLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.primaryLight,
    alignSelf: 'center',
  },
  branchWrapper: {
    marginBottom: spacing.sm,
  },
  branchCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    padding: spacing.md,
  },
  branchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  branchIndexText: {
    fontSize: 13,
    fontWeight: '800',
  },
  branchTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  collapseToggle: {
    padding: 4,
  },
  collapseToggleText: {
    fontSize: 12,
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
    backgroundColor: '#1e293b',
    borderRadius: borderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  subNodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  subNodeText: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  emptyCard: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
