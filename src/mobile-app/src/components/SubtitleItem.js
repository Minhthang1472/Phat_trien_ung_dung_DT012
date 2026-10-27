import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, radius, shadows, spacing } from '../constants/theme';
import Icon from './ui/Icon';

export default function SubtitleItem({ segment, isActive, onSeek, subMode = 'bilingual', searchQuery = '' }) {
  const formatTime = (sec) => {
    if (typeof sec !== 'number') return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Xác định câu phụ đề theo chế độ hiển thị:
  // - subMode === 'bilingual': Dòng chính là phụ đề dịch, dòng phụ là lời nói gốc
  // - subMode === 'original': Chỉ hiển thị lời nói gốc
  // - Mặc định (subMode === 'target'): Chỉ hiển thị phụ đề dịch
  let mainText = '';
  let subText = null;

  if (subMode === 'bilingual') {
    mainText = segment.translated_text || segment.text || '';
    if (segment.original_text && segment.original_text.trim() !== mainText.trim()) {
      subText = segment.original_text;
    }
  } else if (subMode === 'original') {
    mainText = segment.original_text || segment.text || '';
  } else {
    mainText = segment.translated_text || segment.text || segment.original_text || '';
  }

  const renderHighlighted = (text, query, baseStyle) => {
    if (!query || !query.trim() || !text) {
      return <Text style={baseStyle}>{text}</Text>;
    }
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <Text style={baseStyle}>
        {parts.map((part, idx) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <Text key={idx} style={[baseStyle, styles.highlightMatch]}>
              {part}
            </Text>
          ) : (
            part
          )
        )}
      </Text>
    );
  };

  const handleSpeak = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const textToSpeak = mainText;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(textToSpeak)) {
        utterance.lang = 'ja-JP';
      } else if (/[\uac00-\ud7af]/.test(textToSpeak)) {
        utterance.lang = 'ko-KR';
      } else if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(textToSpeak)) {
        utterance.lang = 'vi-VN';
      } else {
        utterance.lang = 'en-US';
      }
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isActive ? styles.activeContainer : null]}
      onPress={() => onSeek(segment.start)}
      activeOpacity={0.75}
    >
      <View style={styles.topRow}>
        <View style={[styles.timeTag, isActive && styles.activeTimeTag]}>
          <Text style={[styles.timeText, isActive && styles.activeTimeText]}>
            {formatTime(segment.start)} - {formatTime(segment.end)}
          </Text>
          <TouchableOpacity
            style={styles.speakerBtn}
            onPress={handleSpeak}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Đọc câu này"
          >
            <Icon
              name="volume"
              size={13}
              color={isActive ? colors.coral : colors.slate}
            />
          </TouchableOpacity>
        </View>

        {isActive ? (
          <View style={styles.activeBadge}>
            <Icon name="play" size={10} color="#FFFFFF" />
            <Text style={styles.activeBadgeText}>ĐANG PHÁT</Text>
          </View>
        ) : null}
      </View>

      {renderHighlighted(mainText, searchQuery, [
        styles.text,
        isActive ? styles.activeText : styles.inactiveText,
      ])}

      {subText
        ? renderHighlighted(subText, searchQuery, [
            styles.subText,
            isActive && styles.activeSubText,
          ])
        : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceLowest,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radius.md - 2,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 10,
  },
  activeContainer: {
    borderLeftWidth: 4,
    borderLeftColor: colors.coral,
    borderColor: 'rgba(255, 111, 97, 0.28)',
    ...shadows.coral,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
    gap: 8,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLow,
  },
  activeTimeTag: {
    backgroundColor: colors.coralTint,
  },
  timeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.muted,
    letterSpacing: 0.2,
  },
  activeTimeText: {
    color: colors.coral,
  },
  speakerBtn: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.coral,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  activeBadgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 8.5,
    lineHeight: 12,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  text: {
    lineHeight: 22,
  },
  activeText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 23,
  },
  inactiveText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.slate,
    lineHeight: 21,
  },
  subText: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 5,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  activeSubText: {
    color: colors.slate,
  },
  highlightMatch: {
    backgroundColor: colors.mintSoft,
    color: colors.mintDeep,
    fontFamily: fonts.bold,
    paddingHorizontal: 3,
    borderRadius: 4,
  },
});
