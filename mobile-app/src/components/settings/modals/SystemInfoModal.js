import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function SystemInfoModal({
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>ℹ️</Text>
              <Text style={styles.modalTitle}>Thông Tin Hệ Thống</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
            <View style={styles.infoBadgeBanner}>
              <Text style={styles.infoBadgeTitle}>HỆ THỐNG PHỤ ĐỀ & TÓM TẮT BÀI GIẢNG AI</Text>
              <Text style={styles.infoBadgeSub}>Phiên bản hoàn thiện: v1.2.0 (Build 2026)</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionHead}>⚙️ CÔNG NGHỆ CỐT LÕI</Text>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Nhận dạng tiếng nói (ASR):</Text>
                <Text style={styles.infoRowVal}>OpenAI Whisper Engine (CUDA/CPU)</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Xử lý ngôn ngữ tự nhiên (NLP):</Text>
                <Text style={styles.infoRowVal}>Mô-đun AI Tóm tắt & Tạo trắc nghiệm</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Cơ sở dữ liệu đám mây:</Text>
                <Text style={styles.infoRowVal}>Google Firebase Firestore</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Bảo mật & Xác thực:</Text>
                <Text style={styles.infoRowVal}>Mã hóa Bcrypt + OTP Email 6 chữ số</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Nền tảng hỗ trợ:</Text>
                <Text style={styles.infoRowVal}>Mobile App, Web App, Extension</Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionHead}>🎓 ĐỀ TÀI NGHIÊN CỨU & PHÁT TRIỂN</Text>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Cơ quan chủ quản:</Text>
                <Text style={styles.infoRowVal}>Khoa CNTT - Đại học Lạc Hồng (LHU)</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Giảng viên hướng dẫn:</Text>
                <Text style={styles.infoRowVal}>ThS. Phan Mạnh Thường</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Sinh viên thực hiện:</Text>
                <Text style={styles.infoRowVal}>Võ Trần Minh Thắng (Trưởng nhóm)</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Thành viên phối hợp:</Text>
                <Text style={styles.infoRowVal}>Vũ Đình Khánh Long</Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.modalPrimaryBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.modalPrimaryBtnText}>Đóng thông tin</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
