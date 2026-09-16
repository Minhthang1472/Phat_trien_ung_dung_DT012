import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import { apiService } from '../services/api';

export default function ServerModal({ visible, onClose, onSaved }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

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
    try {
      await apiService.setBaseUrl(url);
      const res = await apiService.checkServerHealth();
      setTestResult(res);
    } catch (err) {
      setTestResult({ online: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    await apiService.setBaseUrl(url);
    if (onSaved) onSaved(url);
    onClose();
  };

  const handlePreset = (presetUrl) => {
    setUrl(presetUrl);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>⚙️ Cấu hình Server Backend</Text>
          <Text style={styles.subtitle}>
            Nhập địa chỉ máy chủ FastAPI chạy AI để kết nối từ điện thoại:
          </Text>

          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.100:8000"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.presetsRow}>
            <Text style={styles.presetLabel}>Gợi ý:</Text>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => handlePreset('http://10.0.2.2:8000')}
            >
              <Text style={styles.presetChipText}>Emulator (10.0.2.2)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => handlePreset('http://127.0.0.1:8000')}
            >
              <Text style={styles.presetChipText}>Localhost</Text>
            </TouchableOpacity>
          </View>

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
                  ? '✅ Kết nối Backend AI thành công!'
                  : `❌ Không kết nối được: ${testResult.error || 'Server offline'}`}
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnOutline]}
              onPress={handleTest}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color={colors.primaryLight} />
              ) : (
                <Text style={styles.btnOutlineText}>Kiểm tra</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={onClose}
            >
              <Text style={styles.btnCancelText}>Đóng</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSave}>
              <Text style={styles.btnPrimaryText}>Lưu</Text>
            </TouchableOpacity>
          </View>
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
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
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
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  presetLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  presetChipText: {
    fontSize: 11,
    color: colors.primaryLight,
  },
  resultBox: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
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
    fontSize: 13,
  },
  btnCancel: {
    backgroundColor: 'transparent',
  },
  btnCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
