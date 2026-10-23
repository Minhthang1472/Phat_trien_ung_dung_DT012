import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { apiService } from '../../../services/api';

export default function DataBackupSection({
  handleClearHistory,
  handleImport,
  styles,
}) {
  return (
    <>
      {/* Quản lý dữ liệu & Bộ nhớ */}
      <Text style={styles.sectionTitle}>🧹 QUẢN LÝ DỮ LIỆU & BỘ NHỚ</Text>
      <View style={styles.sectionCard}>
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

      {/* Dữ liệu & Sao lưu cấu hình */}
      <Text style={styles.sectionTitle}>⚙️ DỮ LIỆU & SAO LƯU CẤU HÌNH</Text>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() =>
          apiService
            .exportUserConfig()
            .then(() => Alert.alert('Đã xuất', 'File cấu hình cá nhân đã sẵn sàng để chia sẻ.'))
            .catch((e) => Alert.alert('Lỗi xuất file', e.message))
        }
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18 }}>📤</Text>
          <Text style={styles.actionBtnText}>Xuất file cấu hình cá nhân</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={handleImport}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18 }}>📥</Text>
          <Text style={styles.actionBtnText}>Nạp file cấu hình từ thiết bị</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </>
  );
}
