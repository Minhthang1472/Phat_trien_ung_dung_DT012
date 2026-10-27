import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../../constants/theme';
import Icon from '../../ui/Icon';

export default function LegalInfoModal({
  visible,
  onClose,
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
        <View style={[styles.modalCard, { maxHeight: '85%' }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Icon name="gavel" size={21} color={colors.violet} />
              <Text style={styles.modalTitle}>Thông Tin Pháp Lý</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Icon name="close" size={18} color={colors.slate} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
            <View style={styles.legalBox}>
              <Text style={styles.legalBoxTitle}>1. Mục đích & Điều khoản sử dụng</Text>
              <Text style={styles.legalBoxBody}>
                Ứng dụng và tiện ích mở rộng được phát triển cho mục đích học tập, nghiên cứu học thuật phi thương mại. Người dùng cam kết sử dụng công cụ hỗ trợ để nghe hiểu, tóm tắt và ôn tập kiến thức từ bài giảng công khai.
              </Text>
            </View>

            <View style={styles.legalBox}>
              <Text style={styles.legalBoxTitle}>2. Quyền sở hữu trí tuệ & Bản quyền nội dung</Text>
              <Text style={styles.legalBoxBody}>
                Bản quyền video, hình ảnh và âm thanh gốc thuộc quyền sở hữu của các tác giả, kênh phát hành trên nền tảng (YouTube,...). Hệ thống không lưu trữ trái phép hay phân phối lại toàn bộ tệp phương tiện phục vụ mục đích thương mại.
              </Text>
            </View>

            <View style={styles.legalBox}>
              <Text style={styles.legalBoxTitle}>3. Chính sách bảo mật & Quyền riêng tư</Text>
              <Text style={styles.legalBoxBody}>
                Toàn bộ thông tin tài khoản, mật khẩu đăng nhập đều được mã hóa bảo mật. Dữ liệu lịch sử bài giảng, tóm tắt và kết quả trắc nghiệm chỉ được lưu trữ cho mục đích hỗ trợ học tập cá nhân và không bị chia sẻ cho bên thứ ba.
              </Text>
            </View>

            <View style={styles.legalBox}>
              <Text style={styles.legalBoxTitle}>4. Giấy phép mã nguồn</Text>
              <Text style={styles.legalBoxBody}>
                Dự án thuộc đề tài môn học Phát triển Ứng dụng - Đại học Lạc Hồng. Tuân thủ giấy phép phần mềm mã nguồn mở MIT License dành cho mục đích giáo dục và nghiên cứu.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalPrimaryBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.modalPrimaryBtnText}>Tôi đã hiểu & Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
