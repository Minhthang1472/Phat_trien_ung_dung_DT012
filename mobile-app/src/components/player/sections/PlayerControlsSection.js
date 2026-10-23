import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';

export default function PlayerControlsSection({
  isSeeking,
  seekDragTime,
  currentTime,
  duration,
  isPlaying,
  showCC,
  formatTime,
  handleSeek,
  togglePlayPause,
  setShowCC,
  setIsSeeking,
  setSeekDragTime,
  seekBarLayoutRef,
  styles,
}) {
  return (
    <>
      {/* Thanh Kéo Tua Tiến Trình Bài Giảng (Chỉ hiển thị trên Web, tự động ẩn trên Máy ảo / APK điện thoại) */}
      {Platform.OS === 'web' && (
        <View
          style={styles.seekBarWrap}
          onLayout={(e) => {
            const { width, x } = e.nativeEvent.layout;
            if (seekBarLayoutRef) seekBarLayoutRef.current = { width, x };
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            const touchX = e.nativeEvent.locationX;
            const barWidth = seekBarLayoutRef?.current?.width || 1;
            const ratio = Math.max(0, Math.min(1, touchX / barWidth));
            const targetTime = ratio * duration;
            setIsSeeking(true);
            setSeekDragTime(targetTime);
          }}
          onResponderMove={(e) => {
            const touchX = e.nativeEvent.locationX;
            const barWidth = seekBarLayoutRef?.current?.width || 1;
            const ratio = Math.max(0, Math.min(1, touchX / barWidth));
            const targetTime = ratio * duration;
            setSeekDragTime(targetTime);
          }}
          onResponderRelease={(e) => {
            const touchX = e.nativeEvent.locationX;
            const barWidth = seekBarLayoutRef?.current?.width || 1;
            const ratio = Math.max(0, Math.min(1, touchX / barWidth));
            const targetTime = ratio * duration;
            setIsSeeking(false);
            handleSeek(targetTime);
          }}
        >
          {/* Tooltip mốc thời gian nổi khi đang kéo trượt */}
          {isSeeking && (
            <View
              style={[
                styles.seekTooltip,
                {
                  left: `${Math.max(4, Math.min(90, (seekDragTime / (duration || 1)) * 100))}%`,
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.seekTooltipText}>{formatTime(seekDragTime)}</Text>
            </View>
          )}

          {/* Thanh ray nền */}
          <View style={styles.seekBarTrack}>
            <View
              style={[
                styles.seekBarFill,
                {
                  width: `${Math.max(0, Math.min(100, ((isSeeking ? seekDragTime : currentTime) / (duration || 1)) * 100))}%`,
                },
              ]}
            />
          </View>

          {/* Nút tròn kéo tua (Scrubber Thumb) */}
          <View
            style={[
              styles.seekBarThumb,
              {
                left: `${Math.max(0, Math.min(100, ((isSeeking ? seekDragTime : currentTime) / (duration || 1)) * 100))}%`,
              },
            ]}
            pointerEvents="none"
          />
        </View>
      )}

      {/* Thanh Trạng thái & Điều khiển Phát / Tạm dừng & Tua */}
      <View style={styles.realtimeStatusBar}>
        {Platform.OS === 'web' ? (
          <View style={styles.controlsLeftGroup}>
            {/* Nút Play / Pause */}
            <TouchableOpacity
              style={[styles.playControlBtn, isPlaying && styles.playControlBtnActive]}
              onPress={togglePlayPause}
              activeOpacity={0.7}
            >
              <Text style={styles.playControlIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              <Text style={styles.playControlText}>
                {isPlaying ? 'Tạm dừng' : 'Phát'}
              </Text>
            </TouchableOpacity>

            {/* Nút tua lùi 5s */}
            <TouchableOpacity
              style={styles.quickSeekBtn}
              onPress={() => handleSeek(currentTime - 5)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickSeekBtnText}>↺ 5s</Text>
            </TouchableOpacity>

            {/* Nút tua tới 5s */}
            <TouchableOpacity
              style={styles.quickSeekBtn}
              onPress={() => handleSeek(currentTime + 5)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickSeekBtnText}>5s ↻</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Trên Mobile (Máy ảo / APK): Ẩn các nút điều khiển thừa, chỉ hiện chấm trạng thái tinh tế */
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, isPlaying && styles.liveDotActive]} />
            <Text style={styles.liveText}>
              {isPlaying ? 'ĐANG PHÁT' : 'TẠM DỪNG'}
            </Text>
          </View>
        )}

        <View style={styles.statusRightGroup}>
          <TouchableOpacity
            style={[styles.ccBtn, showCC && styles.ccBtnActive]}
            onPress={() => setShowCC(!showCC)}
            activeOpacity={0.7}
          >
            <Text style={[styles.ccBtnText, showCC && styles.ccBtnTextActive]}>CC</Text>
          </TouchableOpacity>
          <Text style={styles.liveTimerText}>
            {formatTime(isSeeking ? seekDragTime : currentTime)} / {formatTime(duration)}
          </Text>
        </View>
      </View>
    </>
  );
}
