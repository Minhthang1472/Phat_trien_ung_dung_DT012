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

export default function ChangePasswordModal({
  visible,
  onClose,
  oldPassword,
  setOldPassword,
  changeNewPass,
  setChangeNewPass,
  changeConfirmPass,
  setChangeConfirmPass,
  changeLoading,
  changeMsg,
  changeError,
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
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Icon name="lock" size={22} color={colors.coral} />
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Icon name="close" size={18} color={colors.slate} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalDesc}>
            Để bảo mật tài khoản, vui lòng nhập mật khẩu hiện tại và mật khẩu mới tối thiểu 8 ký tự.
          </Text>

          {/* Feedback messages */}
          {changeError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{changeError}</Text>
            </View>
          ) : null}
          {changeMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{changeMsg}</Text>
            </View>
          ) : null}

          {/* Input: Old Password */}
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>MẬT KHẨU HIỆN TẠI</Text>
            <View style={styles.inputWrap}>
              <Icon name="key" size={16} color={colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập mật khẩu đang dùng"
                placeholderTextColor={colors.textMuted}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Input: New Password */}
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>MẬT KHẨU MỚI</Text>
            <View style={styles.inputWrap}>
              <Icon name="lock" size={16} color={colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="Tối thiểu 8 ký tự an toàn"
                placeholderTextColor={colors.textMuted}
                value={changeNewPass}
                onChangeText={setChangeNewPass}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Input: Confirm New Password */}
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>XÁC NHẬN MẬT KHẨU MỚI</Text>
            <View style={styles.inputWrap}>
              <Icon name="verified" size={16} color={colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={colors.textMuted}
                value={changeConfirmPass}
                onChangeText={setChangeConfirmPass}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Modal Buttons */}
          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, changeLoading && styles.submitBtnDisabled]}
              onPress={onSubmit}
              disabled={changeLoading}
              activeOpacity={0.8}
            >
              {changeLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Xác nhận đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
