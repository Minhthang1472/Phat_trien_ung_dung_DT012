import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../../constants/theme';
import Icon from '../../ui/Icon';
import IconBadge from '../../ui/IconBadge';
import SectionHeading from './SectionHeading';

export default function StorageSection({
  defaultExportDir,
  localLectureCount = 0,
  handlePickDefaultFolder,
  handleClearDefaultFolder,
  styles,
}) {
  const usedPercent = Math.min(100, Math.round((localLectureCount / 10) * 100));
  const overviewLabel = localLectureCount > 0
    ? `${localLectureCount} bài giảng`
    : 'Chưa có dữ liệu';

  return (
    <>
      {/* Tổng quan dung lượng ngoại tuyến */}
      <View style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <View style={styles.overviewLeft}>
            <IconBadge icon="storage" size={30} iconSize={16} tone="violet" />
            <Text style={styles.overviewTitle}>Dung lượng ngoại tuyến</Text>
          </View>
          <Text style={styles.overviewValue}>{overviewLabel}</Text>
        </View>

        <View style={styles.overviewBar}>
          <LinearGradient
            colors={gradients.violet}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.overviewBarUsed, { width: `${usedPercent}%` }]}
          />
          <View style={styles.overviewBarFree} />
        </View>

        <View style={styles.overviewLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.violet }]} />
            <Text style={styles.legendText}>Bài giảng đã lưu</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.mint }]} />
            <Text style={styles.legendText}>Sẵn sàng đồng bộ</Text>
          </View>
        </View>
      </View>

      <SectionHeading icon="folder" title="THƯ MỤC TẢI VỀ MẶC ĐỊNH" tone="coral" />
      <View style={styles.sectionCard}>
        <Text style={styles.sectionDesc}>
          Tự động xuất và tổ chức phụ đề song ngữ (.srt, .vtt), bảng từ vựng thông minh (.txt)
          và clip phát âm vào thư mục yêu thích của bạn mà không cần hỏi lại.
        </Text>

        {defaultExportDir?.uri ? (
          <View style={styles.dirSelectedCard}>
            <View style={styles.dirSelectedInfo}>
              <View style={styles.dirSelectedIcon}>
                <Icon name="folderOpen" size={17} color={colors.violet} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dirSelectedName} numberOfLines={1}>
                  {defaultExportDir.name || 'Thư mục đã chọn'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="checkCircle" size={12} color={colors.mintDeep} />
                  <Text style={styles.dirSelectedSub}>
                    Đang bật chế độ tự động lưu vào đây
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.dirActionRow}>
              <TouchableOpacity
                style={styles.dirChangeBtn}
                onPress={handlePickDefaultFolder}
                activeOpacity={0.7}
              >
                <Text style={styles.dirChangeBtnText}>Đổi thư mục</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dirRemoveBtn}
                onPress={handleClearDefaultFolder}
                activeOpacity={0.7}
              >
                <Text style={styles.dirRemoveBtnText}>Hủy mặc định</Text>
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
              <Icon name="folderOpen" size={16} color="#FFFFFF" />
              <Text style={styles.dirPickBtnText}>Chọn thư mục lưu mặc định ngay</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}
