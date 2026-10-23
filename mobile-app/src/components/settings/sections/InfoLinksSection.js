import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function InfoLinksSection({
  onOpenSystemInfo,
  onOpenLegalInfo,
  styles,
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>ℹ️ THÔNG TIN & ĐIỀU KHOẢN</Text>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onOpenSystemInfo}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18 }}>ℹ️</Text>
          <Text style={styles.actionBtnText}>Thông tin hệ thống</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={onOpenLegalInfo}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18 }}>⚖️</Text>
          <Text style={styles.actionBtnText}>Thông tin pháp lý & Quyền riêng tư</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </>
  );
}
