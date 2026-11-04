import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../../../constants/theme';
import Icon from '../../ui/Icon';

export default function UserGuideModal({
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
        <View style={[styles.modalCard, { maxHeight: '88%' }]}>
          {/* Header Modal */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Icon name="school" size={22} color={colors.coral} />
              <Text style={styles.modalTitle}>Cẩm Nang Sử Dụng &amp; Mẹo Học</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityLabel="Đóng hướng dẫn"
            >
              <Icon name="close" size={18} color={colors.slate} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Banner giới thiệu */}
            <View style={[styles.infoBadgeBanner, { backgroundColor: colors.coralTint, borderColor: colors.coralSoft }]}>
              <Text style={[styles.infoBadgeTitle, { color: colors.coralDeep }]}>
                HỌC THÔNG MINH CÙNG EDTECH AI
              </Text>
              <Text style={styles.infoBadgeSub}>
                5 tính năng cốt lõi giúp bạn tiếp thu bài giảng ngoại ngữ nhanh gấp 3 lần
              </Text>
            </View>

            {/* Bước 1 */}
            <View style={styles.infoSection}>
              <View style={guideStyles.stepHeadRow}>
                <View style={guideStyles.stepNumber}>
                  <Text style={guideStyles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.infoSectionHead}>TẢI &amp; BÓC TÁCH BÀI GIẢNG</Text>
              </View>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Dán đường dẫn:</Text> Hỗ trợ video YouTube, Google Drive công khai hoặc link bài giảng trực tuyến.
              </Text>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Tải từ thiết bị:</Text> Chọn file video/audio MP4, MP3 có sẵn trên điện thoại của bạn.
              </Text>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Xử lý thông minh:</Text> AI tự động phân biệt video ngắn (&lt; 30 phút) và nạp ngầm siêu tốc cho video dài.
              </Text>
            </View>

            {/* Bước 2 */}
            <View style={styles.infoSection}>
              <View style={guideStyles.stepHeadRow}>
                <View style={guideStyles.stepNumber}>
                  <Text style={guideStyles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.infoSectionHead}>HỌC ĐỒNG BỘ &amp; TUA THÔNG MINH</Text>
              </View>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Tua tức thì:</Text> Chạm vào bất kỳ câu phụ đề nào trong danh sách để video nhảy ngay đến đúng mốc thời gian đó.
              </Text>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Chế độ xem:</Text> Linh hoạt chuyển đổi giữa <Text style={guideStyles.highlight}>Song ngữ</Text>, <Text style={guideStyles.highlight}>Tiếng Việt</Text>, hoặc <Text style={guideStyles.highlight}>Gốc</Text>.
              </Text>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Tìm kiếm:</Text> Nhập từ khoá vào ô tìm kiếm phụ đề để lọc nhanh các khái niệm trong bài.
              </Text>
            </View>

            {/* Bước 3 */}
            <View style={styles.infoSection}>
              <View style={guideStyles.stepHeadRow}>
                <View style={guideStyles.stepNumber}>
                  <Text style={guideStyles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.infoSectionHead}>RẠP PHIM XOAY NGANG (CINEMA MODE)</Text>
              </View>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Xoay tự động:</Text> Nhấn nút <Text style={guideStyles.highlight}>"Phóng to"</Text>, màn hình tự động khoá xoay ngang chuẩn rạp chiếu phim.
              </Text>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Phụ đề nổi chống chói:</Text> Chữ to rõ ràng hiển thị ngay trên video mà không bị che khuất.
              </Text>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Tự ẩn điều khiển:</Text> Sau 3.5 giây không chạm, các nút điều khiển sẽ tự ẩn để bạn tập trung xem video. Chạm nhẹ màn hình để hiện lại.
              </Text>
            </View>

            {/* Bước 4 */}
            <View style={styles.infoSection}>
              <View style={guideStyles.stepHeadRow}>
                <View style={guideStyles.stepNumber}>
                  <Text style={guideStyles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.infoSectionHead}>TRẮC NGHIỆM TƯƠNG TÁC (IN-VIDEO QUIZ)</Text>
              </View>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Ôn tập ngắt quãng:</Text> Video tự động dừng tại các mốc trọng tâm để hiện câu hỏi trắc nghiệm kiểm tra kiến thức.
              </Text>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Phản hồi tức thì:</Text> Xem ngay đáp án đúng kèm lời giải thích chi tiết, hoặc bấm "Bỏ qua" nếu muốn xem tiếp.
              </Text>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Bật/tắt linh hoạt:</Text> Có thể bật hoặc tắt tính năng trắc nghiệm video ngay trên thanh phụ đề.
              </Text>
            </View>

            {/* Bước 5 */}
            <View style={styles.infoSection}>
              <View style={guideStyles.stepHeadRow}>
                <View style={guideStyles.stepNumber}>
                  <Text style={guideStyles.stepNumberText}>5</Text>
                </View>
                <Text style={styles.infoSectionHead}>TÓM TẮT &amp; XUẤT TÀI LIỆU ÔN TẬP</Text>
              </View>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Tóm tắt cốt lõi:</Text> Trích xuất ý chính, công thức, thuật ngữ và sơ đồ tư duy logic.
              </Text>
              <Text style={guideStyles.stepDesc}>
                • <Text style={guideStyles.bold}>Đa dạng định dạng:</Text> Xuất tài liệu bài giảng sang <Text style={guideStyles.highlight}>PDF</Text>, <Text style={guideStyles.highlight}>Word (DOCX)</Text>, <Text style={guideStyles.highlight}>Markdown</Text> hoặc file phụ đề <Text style={guideStyles.highlight}>SRT</Text>.
              </Text>
            </View>
          </ScrollView>

          {/* Nút hoàn tất */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.modalActionBtnText}>Đã Hiểu & Bắt Đầu Học</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const guideStyles = StyleSheet.create({
  stepHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  stepDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink,
    marginBottom: 4,
  },
  bold: {
    fontFamily: fonts.bold,
    color: colors.navy,
  },
  highlight: {
    fontFamily: fonts.bold,
    color: colors.coralDeep,
  },
});
