import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../constants/theme';
import Icon from '../../ui/Icon';

export default function DeleteAccountModal({
  visible,
  onClose,
  password,
  setPassword,
  loading,
  error,
  requiresPassword = true,
  onSubmit,
  styles,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Icon name="delete" size={22} color={colors.error} />
            <Text style={styles.modalTitle}>Xoá tài khoản</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Icon name="close" size={18} color={colors.slate} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDesc}>
            Hành động này không thể hoàn tác. Toàn bộ bài giảng, phụ đề, quiz,
            media đã tải lên và hồ sơ cá nhân sẽ bị xoá vĩnh viễn khỏi máy chủ.
            Hãy xuất dữ liệu trước nếu bạn muốn giữ bản sao.
            {requiresPassword ? '' : ' Tài khoản Google đã được xác thực bằng phiên đăng nhập hiện tại.'}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {requiresPassword ? (
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>MẬT KHẨU XÁC NHẬN</Text>
              <View style={styles.inputWrap}>
                <Icon name="key" size={16} color={colors.muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập mật khẩu hiện tại"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>
          ) : null}

          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.error },
                loading && styles.submitBtnDisabled,
              ]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Xoá vĩnh viễn</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
