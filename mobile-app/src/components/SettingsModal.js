import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import { apiService } from '../services/api';

export default function SettingsModal({ visible, onClose, onSaved, onClearedHistory }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      apiService.getBaseUrl().then((current) => {
        setUrl(current);
        setTestResult(null);
      });
    }
  }, [visible]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const startTime = Date.now();
    try {
      await apiService.setBaseUrl(url);
      const res = await apiService.checkServerHealth();
      const latency = Date.now() - startTime;
      setTestResult({ ...res, latency });
    } catch (err) {
      setTestResult({ online: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ máy chủ hợp lệ');
      return;
    }
    setSaving(true);
    try {
      await apiService.setBaseUrl(url);
      Alert.alert('Thành công', 'Đã lưu cấu hình máy chủ Backend');
      if (onSaved) onSaved(url);
      onClose();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu cấu hình: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Xóa bộ nhớ đệm',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử bài giảng đã lưu trên thiết bị không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ngay',
          style: 'destructive',
          onPress: async () => {
            await apiService.clearLocalHistory();
            if (onClearedHistory) onClearedHistory();
            Alert.alert('Đã xóa', 'Bộ nhớ đệm lịch sử bài giảng đã được làm sạch');
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.titleIcon}>⚙️</Text>
              <Text style={styles.title}>CÀI ĐẶT HỆ THỐNG</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeHeaderBtn} activeOpacity={0.7}>
              <Text style={styles.closeHeaderText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Mục 1: Máy chủ Backend */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🌐 KẾT NỐI MÁY CHỦ BACKEND AI</Text>
              <Text style={styles.sectionDesc}>
                Địa chỉ FastAPI xử lý Whisper AI, dịch thuật và tóm tắt bài giảng:
              </Text>

              <TextInput
                style={styles.input}
                value={url}
                onChangeText={setUrl}
                placeholder="http://127.0.0.1:8000"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Nút gợi ý nhanh */}
              <View style={styles.presetsRow}>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => setUrl('http://127.0.0.1:8000')}
                >
                  <Text style={styles.presetChipText}>💻 Localhost</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => setUrl('http://10.0.2.2:8000')}
                >
                  <Text style={styles.presetChipText}>📱 Emulator</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => setUrl('http://10.0.128.147:8000')}
                >
                  <Text style={styles.presetChipText}>📶 Mạng LAN</Text>
                </TouchableOpacity>
              </View>

              {/* Kết quả kiểm tra */}
              {testResult && (
                <View
                  style={[
                    styles.resultBox,
                    {
                      backgroundColor: testResult.online
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                      borderColor: testResult.online ? colors.success : colors.danger,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.resultText,
                      { color: testResult.online ? colors.success : colors.danger },
                    ]}
                  >
                    {testResult.online
                      ? `✅ Máy chủ hoạt động tốt! (Phản hồi: ${testResult.latency || 0}ms)`
                      : `❌ Không kết nối được: ${testResult.error || 'Server đang tắt'}`}
                  </Text>
                </View>
              )}

              {/* Hàng nút Thử & Lưu */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnOutline]}
                  onPress={handleTest}
                  disabled={testing}
                >
                  {testing ? (
                    <ActivityIndicator size="small" color={colors.primaryLight} />
                  ) : (
                    <Text style={styles.btnOutlineText}>Kiểm tra kết nối</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.btnPrimaryText}>Lưu cấu hình</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Mục 2: Quản lý bộ nhớ đệm */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🧹 QUẢN LÝ DỮ LIỆU & BỘ NHỚ</Text>
              <Text style={styles.sectionDesc}>
                Làm sạch dữ liệu lưu tạm trên máy khi cần thiết lập lại hoặc giải phóng dung lượng:
              </Text>
              <TouchableOpacity
                style={styles.clearCacheBtn}
                onPress={handleClearHistory}
                activeOpacity={0.7}
              >
                <Text style={styles.clearCacheText}>🗑️ Xóa bộ nhớ đệm lịch sử bài giảng</Text>
              </TouchableOpacity>
            </View>

            {/* Mục 3: Trạng thái hệ thống AI */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>⚡ TRẠNG THÁI HỆ THỐNG AI</Text>
              <View style={styles.statusList}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>• AI Nhận diện âm thanh (ASR):</Text>
                  <Text style={styles.statusValue}>Faster-Whisper (CUDA / CPU)</Text>
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>• AI Tóm tắt & Trắc nghiệm:</Text>
                  <Text style={styles.statusValue}>Google Gemini Flash</Text>
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>• Cơ sở dữ liệu đám mây:</Text>
                  <Text style={styles.statusValue}>Google Firebase Firestore</Text>
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>• Phiên bản ứng dụng:</Text>
                  <Text style={styles.statusValue}>v1.2.0 (Giai đoạn 2)</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Nút đóng */}
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  closeHeaderBtn: {
    padding: 6,
  },
  closeHeaderText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    marginBottom: spacing.md,
  },
  sectionCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetChipText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: '500',
  },
  resultBox: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: 4,
  },
  btn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  btnOutlineText: {
    color: colors.primaryLight,
    fontWeight: '600',
    fontSize: 12,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  clearCacheBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  clearCacheText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  statusList: {
    gap: 6,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 11,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeBtnText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
});
