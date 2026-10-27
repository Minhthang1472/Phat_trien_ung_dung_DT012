import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../../../constants/theme';
import { apiService } from '../../../services/api';
import Icon from '../../ui/Icon';
import SectionHeading from './SectionHeading';

export default function DataBackupSection({
  handleClearHistory,
  handleImport,
  styles,
}) {
  return (
    <>
      {/* Quản lý dữ liệu & Bộ nhớ */}
      <SectionHeading icon="delete" title="QUẢN LÝ DỮ LIỆU & BỘ NHỚ" tone="coral" />
      <View style={styles.sectionCard}>
        <View style={styles.cacheHintRow}>
          <View style={styles.cacheHintIcon}>
            <Icon name="refresh" size={16} color={colors.mintDeep} />
          </View>
          <Text style={styles.cacheHintText}>
            Làm sạch bộ nhớ đệm (cache) video để giải phóng bộ nhớ thiết bị. Tiến trình
            bài học và danh sách từ vựng đã lưu sẽ luôn được bảo toàn an toàn.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearCacheBtn}
          onPress={handleClearHistory}
          activeOpacity={0.7}
        >
          <Icon name="delete" size={15} color={colors.coralDeep} />
          <Text style={styles.clearCacheText}>Xóa bộ nhớ đệm lịch sử bài giảng</Text>
        </TouchableOpacity>
      </View>

      {/* Dữ liệu & Sao lưu cấu hình */}
      <SectionHeading icon="cloud" title="DỮ LIỆU & SAO LƯU CẤU HÌNH" tone="mint" />
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
        <View style={[styles.actionIconWrap, { backgroundColor: colors.mintSoft }]}>
          <Icon name="upload" size={18} color={colors.mintDeep} />
        </View>
        <View style={styles.actionTextCol}>
          <Text style={styles.actionBtnText}>Xuất file cấu hình cá nhân</Text>
          <Text style={styles.actionBtnDesc}>Bao gồm bộ từ vựng, mốc thời gian và cài đặt</Text>
        </View>
        <Icon name="chevronRight" size={20} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={handleImport}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: colors.violetSoft }]}>
          <Icon name="download" size={18} color={colors.violet} />
        </View>
        <View style={styles.actionTextCol}>
          <Text style={styles.actionBtnText}>Nạp file cấu hình từ thiết bị</Text>
          <Text style={styles.actionBtnDesc}>Khôi phục tiến trình học tập từ tệp đã lưu</Text>
        </View>
        <Icon name="chevronRight" size={20} color={colors.muted} />
      </TouchableOpacity>
    </>
  );
}
