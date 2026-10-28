import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../constants/theme';
import { PRESET_AVATARS, resolveAvatarUrl, resolveAvatarIcon } from '../constants/profileData';
import Icon from '../../ui/Icon';
import styles from '../styles/profileStyles';

/**
 * Modal Chỉnh sửa hồ sơ, Avatar (từ thiết bị hoặc preset AI), và Quy trình đổi Email qua OTP
 */
export default function EditProfileModal({
  visible,
  onClose,
  user,
  selectedAvatar,
  onSelectAvatar,
  onPickAvatarFromDevice,
  editDisplayName,
  onChangeDisplayName,
  editEmail,
  onChangeEmail,
  editEmailOtpStep = 1,
  setEditEmailOtpStep,
  pendingChangeEmail,
  emailChangeOtp,
  onChangeEmailOtp,
  editLoading = false,
  editMsg = '',
  editError = '',
  onSaveProfile,
  onConfirmEmailOtp,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { maxHeight: '90%' }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Icon
                name={editEmailOtpStep === 2 ? 'lock' : 'manageAccounts'}
                size={22}
                color={colors.coral}
              />
              <Text style={styles.modalTitle}>
                {editEmailOtpStep === 2 ? 'Xác Thực Đổi Email' : 'Chỉnh Sửa Hồ Sơ & Avatar'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Icon name="close" size={18} color={colors.slate} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 6 }}>
            {editError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{editError}</Text>
              </View>
            ) : null}
            {editMsg ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{editMsg}</Text>
              </View>
            ) : null}

            {editEmailOtpStep === 1 ? (
              <>
                {/* Phần Avatar xem trước & Đổi Avatar */}
                <Text style={styles.editSectionLabel}>ẢNH ĐẠI DIỆN HỌC VIÊN</Text>
                <View style={styles.avatarPreviewRow}>
                  <View style={styles.avatarPreviewBig}>
                    {(() => {
                      const avatarUri = resolveAvatarUrl(selectedAvatar) || (selectedAvatar && (selectedAvatar.startsWith('http') || selectedAvatar.startsWith('data:') || selectedAvatar.startsWith('blob:') || selectedAvatar.startsWith('file:') || selectedAvatar.startsWith('content:')) ? selectedAvatar : null);
                      if (avatarUri) {
                        return <Image source={{ uri: avatarUri }} style={styles.avatarBigImage} />;
                      }
                      return (
                        <Text style={styles.avatarBigText}>
                          {(editDisplayName || user?.email || 'U')[0].toUpperCase()}
                        </Text>
                      );
                    })()}
                  </View>

                  <View style={styles.avatarActionCol}>
                    <TouchableOpacity
                      style={styles.uploadAvatarBtn}
                      onPress={onPickAvatarFromDevice}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="folderOpen" size={16} color={colors.violet} />
                        <Text style={styles.uploadAvatarBtnText}>Chọn ảnh từ thiết bị</Text>
                      </View>
                    </TouchableOpacity>

                    {selectedAvatar && (
                      <TouchableOpacity
                        style={styles.removeAvatarBtn}
                        onPress={() => onSelectAvatar(null)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.removeAvatarBtnText}>Xóa ảnh (Dùng chữ cái)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Bộ sưu tập Avatar Preset */}
                <Text style={styles.editSectionSubLabel}>Hoặc chọn nhanh Avatar phong cách AI:</Text>
                <View style={styles.presetAvatarGrid}>
                  {PRESET_AVATARS.map((item) => {
                    const isSelected = selectedAvatar === item.url || selectedAvatar === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.presetAvatarItem, isSelected && styles.presetAvatarItemActive]}
                        onPress={() => onSelectAvatar(item.url)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.presetAvatarImgWrap}>
                          <Image
                            source={{ uri: item.url }}
                            style={styles.presetAvatarImg}
                          />
                          {isSelected ? (
                            <View style={styles.presetAvatarSelectedBadge}>
                              <Icon name="check" size={9} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </View>
                        <Text
                          style={[styles.presetAvatarLabel, isSelected && styles.presetAvatarLabelActive]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Phần Tên hiển thị */}
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.editSectionLabel, { marginTop: 0 }]}>TÊN HIỂN THỊ HỌC VIÊN</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="badge" size={16} color={colors.muted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nhập tên hiển thị mới"
                      placeholderTextColor={colors.textMuted}
                      value={editDisplayName}
                      onChangeText={onChangeDisplayName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Phần Email */}
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.editSectionLabel, { marginTop: 0 }]}>EMAIL TÀI KHOẢN (LIÊN KẾT HỆ THỐNG)</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="mail" size={16} color={colors.muted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nhập địa chỉ email mới"
                      placeholderTextColor={colors.textMuted}
                      value={editEmail}
                      onChangeText={onChangeEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
                    <Icon name="bulb" size={13} color={colors.coral} style={{ marginTop: 2 }} />
                    <Text style={[styles.emailHintText, { flex: 1 }]}>
                      Khi đổi sang email mới, hệ thống sẽ gửi mã OTP 6 số để xác thực trước khi cập nhật.
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              /* Bước 2: Xác thực mã OTP đổi Email */
              <View style={styles.otpStepContainer}>
                <View style={styles.otpInfoBadge}>
                  <Icon name="mail" size={22} color={colors.violet} />
                  <Text style={styles.otpInfoBadgeText}>
                    Mã xác nhận 6 số đã được gửi đến email mới:
                  </Text>
                  <Text style={styles.otpTargetEmailText}>{pendingChangeEmail}</Text>
                  <Text style={[styles.otpInfoBadgeText, { marginTop: 6, fontSize: 10.5 }]}>
                    Vui lòng nhập mã OTP để hoàn tất thay đổi email tài khoản.
                  </Text>
                </View>

                <Text style={styles.otpInputTitle}>NHẬP MÃ OTP (6 CHỮ SỐ)</Text>
                <View style={styles.otpInputWrapper}>
                  <TextInput
                    style={styles.otpCodeInput}
                    placeholder="••••••"
                    placeholderTextColor={colors.muted}
                    value={emailChangeOtp}
                    onChangeText={onChangeEmailOtp}
                    keyboardType="numeric"
                    maxLength={6}
                    textAlign="center"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={styles.resendOtpBtn}
                  onPress={onSaveProfile}
                  disabled={editLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendOtpBtnText}>Chưa nhận được mã? Gửi lại OTP</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Hàng nút hành động */}
          <View style={styles.editModalBtnRow}>
            <TouchableOpacity
              style={styles.editModalCancelBtn}
              onPress={() => {
                if (editEmailOtpStep === 2) {
                  setEditEmailOtpStep(1);
                } else {
                  onClose();
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.editModalCancelBtnText}>
                {editEmailOtpStep === 2 ? '‹ Quay lại' : 'Hủy'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editModalSubmitBtn, editLoading && styles.editModalSubmitBtnDisabled]}
              onPress={editEmailOtpStep === 2 ? onConfirmEmailOtp : onSaveProfile}
              disabled={editLoading}
              activeOpacity={0.8}
            >
              {editLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.editModalSubmitBtnText}>
                  {editEmailOtpStep === 2 ? 'Xác nhận OTP' : 'Lưu thay đổi'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
