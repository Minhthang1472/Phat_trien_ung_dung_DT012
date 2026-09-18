import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function AboutModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>🎓 THÔNG TIN ĐỒ ÁN</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeHeaderBtn}>
              <Text style={styles.closeHeaderText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.projectTitle}>
              Ứng dụng tự động tóm tắt và đồng bộ phụ đề đa ngôn ngữ cho video bài giảng
            </Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoRow}>
                <Text style={styles.label}>Trường: </Text>
                <Text style={styles.value}>Đại học Lạc Hồng (LHU)</Text>
              </Text>
              <Text style={styles.infoRow}>
                <Text style={styles.label}>Khoa: </Text>
                <Text style={styles.value}>Công nghệ Thông tin</Text>
              </Text>
              <Text style={styles.infoRow}>
                <Text style={styles.label}>GVHD: </Text>
                <Text style={styles.valueHighlight}>ThS. Phan Mạnh Thường</Text>
              </Text>
            </View>

            <Text style={styles.sectionHeader}>👥 NHÓM SINH VIÊN THỰC HIỆN</Text>
            <View style={styles.infoCard}>
              <Text style={styles.studentName}>1. Võ Trần Minh Thắng (Nhóm trưởng)</Text>
              <Text style={styles.studentId}>MSSV: 123001472</Text>
              <View style={styles.divider} />
              <Text style={styles.studentName}>2. Vũ Đình Khánh Long</Text>
              <Text style={styles.studentId}>MSSV: 123001217</Text>
            </View>

            <Text style={styles.sectionHeader}>⚡ CÔNG NGHỆ CỐT LÕI</Text>
            <View style={styles.techCard}>
              <Text style={styles.techItem}>• AI ASR: Faster-Whisper (Timestamps chính xác)</Text>
              <Text style={styles.techItem}>• LLM AI: Google Gemini 2.5 Flash</Text>
              <Text style={styles.techItem}>• Cloud DB & Cache: Google Firebase Firestore</Text>
              <Text style={styles.techItem}>• Client: React Native Expo (Android, iOS & Web)</Text>
              <Text style={styles.techItem}>• Backend: FastAPI (Python 3.11 Asynchronous)</Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  closeHeaderBtn: {
    padding: 4,
  },
  closeHeaderText: {
    color: colors.textMuted,
    fontSize: 18,
  },
  content: {
    marginBottom: spacing.md,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  infoRow: {
    fontSize: 12,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  label: {
    color: colors.textMuted,
  },
  value: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  valueHighlight: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  studentId: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 6,
  },
  techCard: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  techItem: {
    fontSize: 11,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  closeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
