import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function StorageSection({
  defaultExportDir,
  handlePickDefaultFolder,
  handleClearDefaultFolder,
  styles,
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>📁 THƯ MỤC TẢI VỀ MẶC ĐỊNH</Text>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionDesc}>
          Thiết lập thư mục cố định để tự động lưu phụ đề (.srt, .vtt), tài liệu (.txt) và video (.mp4) mà không cần hỏi lại mỗi lần:
        </Text>

        {defaultExportDir?.uri ? (
          <View style={styles.dirSelectedCard}>
            <View style={styles.dirSelectedInfo}>
              <Text style={styles.dirSelectedIcon}>📂</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.dirSelectedName} numberOfLines={1}>
                  {defaultExportDir.name || 'Thư mục đã chọn'}
                </Text>
                <Text style={styles.dirSelectedSub}>
                  ✓ Đang bật chế độ tự động lưu vào đây
                </Text>
              </View>
            </View>

            <View style={styles.dirActionRow}>
              <TouchableOpacity
                style={styles.dirChangeBtn}
                onPress={handlePickDefaultFolder}
                activeOpacity={0.7}
              >
                <Text style={styles.dirChangeBtnText}>🔄 Đổi thư mục</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dirRemoveBtn}
                onPress={handleClearDefaultFolder}
                activeOpacity={0.7}
              >
                <Text style={styles.dirRemoveBtnText}>✕ Hủy mặc định</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.dirEmptyCard}>
            <Text style={styles.dirEmptyDesc}>
              Trạng thái: Chưa chọn (ứng dụng sẽ mở bảng hỏi vị trí lưu mỗi khi tải).
            </Text>
            <TouchableOpacity
              style={styles.dirPickBtn}
              onPress={handlePickDefaultFolder}
              activeOpacity={0.8}
            >
              <Text style={styles.dirPickBtnText}>📁 Chọn thư mục lưu mặc định ngay</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}
