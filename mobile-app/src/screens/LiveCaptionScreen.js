import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import Header from '../components/Header';
import { webSocketService } from '../services/websocketService';

export default function LiveCaptionScreen({ onBack }) {
  const [isRecording, setIsRecording] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Sẵn sàng ghi âm bài giảng tại giảng đường.');
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    return () => {
      webSocketService.stop();
    };
  }, []);

  const startListening = () => {
    setIsRecording(true);
    setStatusMessage('Đang kết nối WebSocket AI...');

    webSocketService.connect({
      onStatus: (data) => {
        setIsConnected(true);
        setStatusMessage(data.message || 'Đã kết nối AI Server.');
      },
      onCaption: (data) => {
        if (data.text) {
          setCaptions((prev) => [
            ...prev,
            {
              text: data.text,
              time: new Date().toLocaleTimeString(),
              lang: data.language || 'vi',
            },
          ]);
          // Tự động cuộn xuống cuối
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
        }
      },
      onError: () => {
        setIsConnected(false);
        setStatusMessage('Không kết nối được server, chuyển sang chế độ mô phỏng trực tiếp...');
        // Tự động kích hoạt simulation mode để demo giao diện
        webSocketService.startSimulation((simData) => {
          setCaptions((prev) => [...prev, simData]);
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true });
          }, 100);
        });
      },
      onClose: () => {
        setIsConnected(false);
      },
    });
  };

  const stopListening = () => {
    setIsRecording(false);
    webSocketService.stop();
    setStatusMessage('Đã dừng thu âm.');
  };

  const handleClear = () => {
    setCaptions([]);
  };

  const handleShare = async () => {
    if (captions.length === 0) return;
    try {
      const fullText = captions.map((c) => `[${c.time || ''}] ${c.text}`).join('\n\n');
      await Share.share({
        message: `=== BẢN GHI PHỤ ĐỀ TRỰC TIẾP GIẢNG ĐƯỜNG ===\n\n${fullText}`,
      });
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      <Header
        title="LIVE-CAPTION MICRO"
        showBack
        onBack={onBack}
        rightElement={
          <View
            style={[
              styles.statusChip,
              { backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)' },
            ]}
          >
            <View
              style={[
                styles.recordingDot,
                { backgroundColor: isRecording ? colors.danger : colors.textMuted },
              ]}
            />
            <Text
              style={[
                styles.statusChipText,
                { color: isRecording ? colors.danger : colors.textMuted },
              ]}
            >
              {isRecording ? 'REC' : 'IDLE'}
            </Text>
          </View>
        }
      />

      {/* Thanh trạng thái */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>

      {/* Vùng hiển thị Text phụ đề trực tiếp thời gian thực */}
      <ScrollView
        ref={scrollRef}
        style={styles.transcriptArea}
        contentContainerStyle={styles.transcriptContent}
      >
        {captions.length > 0 ? (
          captions.map((item, idx) => (
            <View key={idx} style={styles.captionBubble}>
              <View style={styles.captionMeta}>
                <Text style={styles.captionTime}>{item.time || 'Vừa xong'}</Text>
                <Text style={styles.captionLang}>{(item.lang || 'vi').toUpperCase()}</Text>
              </View>
              <Text style={styles.captionText}>{item.text}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyPrompt}>
            <View style={styles.bigMicCircle}>
              <Text style={styles.bigMicIcon}>🎙️</Text>
            </View>
            <Text style={styles.emptyPromptTitle}>Sẵn sàng lắng nghe lời giảng</Text>
            <Text style={styles.emptyPromptSub}>
              Bấm nút "Bắt đầu thu âm" bên dưới để nhận diện giọng nói thầy cô theo thời gian thực
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Thanh điều khiển Micro bên dưới */}
      <View style={styles.footerControls}>
        <TouchableOpacity
          style={[styles.smallBtn, captions.length === 0 && styles.disabledBtn]}
          onPress={handleClear}
          disabled={captions.length === 0}
        >
          <Text style={styles.smallBtnText}>Xóa chữ</Text>
        </TouchableOpacity>

        {isRecording ? (
          <TouchableOpacity style={styles.stopBtn} onPress={stopListening} activeOpacity={0.8}>
            <View style={styles.stopSquare} />
            <Text style={styles.stopBtnText}>Dừng thu âm</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.recordBtn} onPress={startListening} activeOpacity={0.8}>
            <Text style={styles.recordBtnIcon}>🎙️</Text>
            <Text style={styles.recordBtnText}>Bắt đầu thu âm</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.smallBtn, captions.length === 0 && styles.disabledBtn]}
          onPress={handleShare}
          disabled={captions.length === 0}
        >
          <Text style={styles.smallBtnText}>Lưu/Chia sẻ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBar: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  transcriptArea: {
    flex: 1,
  },
  transcriptContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  emptyPrompt: {
    flex: 1,
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  bigMicCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bigMicIcon: {
    fontSize: 36,
  },
  emptyPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyPromptSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  captionBubble: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryLight,
  },
  captionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  captionTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  captionLang: {
    fontSize: 10,
    color: colors.primaryLight,
    fontWeight: '700',
  },
  captionText: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
    fontWeight: '500',
  },
  footerControls: {
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: borderRadius.full,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  recordBtnIcon: {
    fontSize: 16,
  },
  recordBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: borderRadius.full,
    gap: 8,
  },
  stopSquare: {
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  stopBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.3,
  },
});
