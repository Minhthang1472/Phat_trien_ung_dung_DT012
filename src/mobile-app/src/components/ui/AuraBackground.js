import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Các mảng màu "aura" trang trí phía sau nội dung (Level 0 trong DESIGN.md).
 * Thuần View + gradient, không dùng blur để giữ hiệu năng trên Android cũ.
 */
export default function AuraBackground() {
  return (
    <View pointerEvents="none" style={styles.root}>
      <LinearGradient
        colors={['rgba(255,111,97,0.14)', 'rgba(248,249,254,0)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.topWash}
      />
      <View style={[styles.blob, styles.coralBlob]} />
      <View style={[styles.blob, styles.mintBlob]} />
      <View style={[styles.blob, styles.violetBlob]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    // Cắt phần blob tràn ra ngoài, tránh tạo scroll ngang trên web
    // (khiến trình duyệt mobile mở rộng layout viewport và thu nhỏ toàn app).
    overflow: 'hidden',
  },
  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  coralBlob: {
    width: 220,
    height: 220,
    top: -70,
    right: -70,
    backgroundColor: 'rgba(255, 111, 97, 0.10)',
  },
  mintBlob: {
    width: 260,
    height: 260,
    top: 420,
    left: -110,
    backgroundColor: 'rgba(6, 214, 160, 0.08)',
  },
  violetBlob: {
    width: 280,
    height: 280,
    top: 980,
    right: -120,
    backgroundColor: 'rgba(123, 44, 191, 0.07)',
  },
});
