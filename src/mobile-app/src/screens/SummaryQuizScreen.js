import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  colors,
  fonts,
  radius,
  screenPadding,
  shadows,
  spacing,
} from '../constants/theme';
import QuizCard from '../components/QuizCard';
import MindmapViewer from '../components/MindmapViewer';
import ExerciseCard from '../components/ExerciseCard';
import Icon from '../components/ui/Icon';
import { apiService } from '../services/api';
import {
  buildQuizGroups,
  formatSectionRange,
} from '../utils/quizSections';

export default function SummaryQuizScreen({ lecture, onShare }) {
  const [subTab, setSubTab] = useState('summary'); // 'summary' | 'mindmap' | 'exercises'

  const summary = lecture?.summary || 'Chưa có bản tóm tắt bài giảng.';
  const keyPoints = lecture?.key_points || [];
  const formulasAndTerms = lecture?.formulas_and_terms || [];
  const quizList = lecture?.quiz || [];
  const sections = lecture?.sections || lecture?.full_data?.sections || [];
  const quizGroups = buildQuizGroups(quizList, sections);
  const mindmap = lecture?.mindmap || null;
  const exercises = lecture?.exercises || [];

  const handleShareDoc = async () => {
    if (onShare) {
      onShare();
      return;
    }
    try {
      const textToShare = `=== TỔNG QUAN BÀI HỌC: ${lecture?.title || ''} ===\n\n${summary}\n\n=== ĐIỂM KIẾN THỨC CỐT LÕI ===\n${keyPoints.map((k, i) => `${i + 1}. ${k}`).join('\n')}`;
      await Share.share({ message: textToShare });
    } catch (_) {}
  };

  // Xuất tài liệu ôn tập dưới dạng file TXT
  const handleExportSummary = async () => {
    try {
      let content = `=== BÀI GIẢNG: ${lecture?.title || 'Không tên'} ===\n\n`;
      content += `📝 TÓM TẮT:\n${summary}\n\n`;

      if (sections.length > 0) {
        content += `🧭 LỘ TRÌNH KIẾN THỨC:\n`;
        sections.forEach((sec, i) => {
          const range = formatSectionRange(sec);
          content += `  ${i + 1}. ${sec.title || `Phần ${i + 1}`}${range ? ` (${range})` : ''}\n`;
          if (sec.summary) content += `     ${sec.summary}\n`;
        });
        content += '\n';
      }

      if (keyPoints.length > 0) {
        content += `📌 ĐIỂM KIẾN THỨC CỐT LÕI:\n`;
        keyPoints.forEach((k, i) => { content += `  ${i + 1}. ${k}\n`; });
        content += '\n';
      }

      if (formulasAndTerms.length > 0) {
        content += `🧮 THUẬT NGỮ & CÔNG THỨC:\n`;
        formulasAndTerms.forEach((t) => { content += `  • ${t}\n`; });
        content += '\n';
      }

      if (quizList.length > 0) {
        content += `📝 CÂU HỎI TRẮC NGHIỆM:\n`;
        quizList.forEach((q, i) => {
          content += `\nCâu ${i + 1}: ${q.question}\n`;
          q.options.forEach((opt) => { content += `  ${opt}\n`; });
          content += `  ✅ Đáp án đúng: ${q.correct_answer}\n`;
          if (q.explanation) content += `  💡 Giải thích: ${q.explanation}\n`;
        });
      }

      if (exercises.length > 0) {
        content += `\n📚 BÀI TẬP TỰ LUYỆN:\n`;
        exercises.forEach((ex, i) => {
          content += `\nBài ${i + 1}: ${ex.question}\n`;
          content += `  ✅ Đáp án: ${ex.answer}\n`;
          if (ex.hint) content += `  💡 Gợi ý: ${ex.hint}\n`;
        });
      }

      const safeTitle = (lecture?.title || 'summary').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').substring(0, 30);
      const filename = `${safeTitle}_Summary.txt`;
      const res = await apiService.exportFile(filename, content, 'text/plain');

      if (res && res.isDefault) {
        Alert.alert('Thành công', `Đã lưu tài liệu thành công vào thư mục mặc định:\n${res.dirName}`);
      } else if (res && !res.cancelled) {
        Alert.alert('Thành công', 'Đã lưu tài liệu ôn tập thành công!');
      }
    } catch (err) {
      Alert.alert('Lỗi xuất tài liệu', err.message);
    }
  };

  // Tính năng tải Video Hardsub
  const handleDownloadVideo = () => {
    Alert.alert(
      'Tải Video Phụ Đề',
      'Bạn có muốn tải về video có đính kèm cứng phụ đề (Hardsub) để xem offline không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Có, Tải về', 
          onPress: async () => {
            try {
              Alert.alert('Đang xử lý', 'Đang ghép phụ đề vào video, vui lòng chờ...');
              const sourceMediaUrl = lecture?.media_url || lecture?.media_stream_url;
              if (!sourceMediaUrl || !sourceMediaUrl.includes('/uploads/')) {
                throw new Error('Chỉ có thể ghi cứng phụ đề cho video đã upload lên server.');
              }
              const burnResult = await apiService.burnSubtitlesIntoVideo(sourceMediaUrl, lecture.segments);
              
              const safeTitle = (lecture?.title || 'video').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').substring(0, 30);
              const filename = `${safeTitle}_PhuDe.mp4`;
              const tempUri = `${FileSystem.cacheDirectory}video_phude_${Date.now()}.mp4`;
              await FileSystem.downloadAsync(burnResult.media_url, tempUri);
              
              const res = await apiService.exportBinaryFile(filename, tempUri, 'video/mp4');
              if (res && res.isDefault) {
                Alert.alert('Thành công', `Đã lưu video có phụ đề vào thư mục mặc định:\n${res.dirName}`);
              } else if (res && !res.cancelled) {
                Alert.alert('Thành công', 'Đã lưu video có phụ đề thành công!');
              }
            } catch (err) {
              Alert.alert('Lỗi tạo video', err.message);
            }
          }
        }
      ]
    );
  };

  const SUB_TABS = [
    { key: 'summary', label: 'Tóm tắt & Quiz', icon: 'summary' },
    { key: 'mindmap', label: 'Sơ đồ Mindmap', icon: 'mindmap' },
    {
      key: 'exercises',
      label: exercises.length > 0 ? `Bài tập (${exercises.length})` : 'Bài tập',
      icon: 'menuBook',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Thanh chọn 3 chế độ ôn tập: Tóm tắt / Mindmap / Bài tập */}
      <View style={styles.subTabRow}>
        {SUB_TABS.map((tab) => {
          const active = subTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.subTabBtn, active && styles.subTabBtnActive]}
              onPress={() => setSubTab(tab.key)}
              activeOpacity={0.75}
            >
              <Icon
                name={tab.icon}
                size={15}
                color={active ? '#FFFFFF' : colors.slate}
              />
              <Text style={[styles.subTabBtnText, active && styles.subTabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 1. TAB TÓM TẮT & TRẮC NGHIỆM */}
      {subTab === 'summary' && (
        <View>
          {/* Khối Tổng quan tóm tắt */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconWrap}>
                <Icon name="summary" size={16} color={colors.coral} />
              </View>
              <Text style={styles.sectionTitle}>TỔNG QUAN BÀI HỌC</Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Tóm tắt ngắn gọn</Text>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>

            {keyPoints.length > 0 && (
              <View style={styles.keyPointsBox}>
                <Text style={styles.keyPointsLabel}>Các điểm kiến thức cốt lõi</Text>
                {keyPoints.map((point, idx) => (
                  <View key={idx} style={styles.bulletItem}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {sections.length > 0 && (
              <View style={styles.routeBox}>
                <View style={styles.routeHeader}>
                  <Icon name="account-tree" size={13} color={colors.coral} />
                  <Text style={styles.routeLabel}>Lộ trình kiến thức theo phần</Text>
                </View>
                {sections.map((sec, idx) => {
                  const range = formatSectionRange(sec);
                  return (
                    <View key={sec.id || idx} style={styles.routeItem}>
                      <View style={styles.routeIndex}>
                        <Text style={styles.routeIndexText}>{idx + 1}</Text>
                      </View>
                      <View style={styles.routeContent}>
                        <View style={styles.routeTitleRow}>
                          <Text style={styles.routeTitle} numberOfLines={2}>
                            {sec.title || `Phần ${idx + 1}`}
                          </Text>
                          {range ? (
                            <Text style={styles.routeTime}>{range}</Text>
                          ) : null}
                        </View>
                        {sec.summary ? (
                          <Text style={styles.routeSummary} numberOfLines={2}>
                            {sec.summary}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {formulasAndTerms.length > 0 && (
              <View style={styles.formulasBox}>
                <Text style={styles.formulasLabel}>Thuật ngữ & Công thức quan trọng</Text>
                <View style={styles.termList}>
                  {formulasAndTerms.map((term, idx) => (
                    <View key={idx} style={styles.termTag}>
                      <Text style={styles.termText}>{term}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Khối Bộ câu hỏi trắc nghiệm tự ôn tập */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconWrap, styles.sectionIconMint]}>
                <Icon name="quiz" size={16} color={colors.mintDeep} />
              </View>
              <Text style={styles.sectionTitle}>CÂU HỎI TRẮC NGHIỆM TỰ ÔN TẬP</Text>
            </View>

            {quizGroups.length > 0 ? (
              quizGroups.map((group) => (
                <View key={group.key} style={styles.quizGroup}>
                  {group.section ? (
                    <View style={styles.quizGroupHeader}>
                      <View style={styles.quizGroupIndex}>
                        <Text style={styles.quizGroupIndexText}>
                          {sections.findIndex((sec) => sec === group.section) + 1}
                        </Text>
                      </View>
                      <View style={styles.quizGroupTitleWrap}>
                        <Text style={styles.quizGroupTitle} numberOfLines={2}>
                          {group.section.title || 'Phần nội dung'}
                        </Text>
                        {formatSectionRange(group.section) ? (
                          <Text style={styles.quizGroupTime}>
                            {formatSectionRange(group.section)} • {group.questions.length} câu
                          </Text>
                        ) : (
                          <Text style={styles.quizGroupTime}>
                            {group.questions.length} câu hỏi
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : null}

                  {group.questions.map(({ quiz, index }) => (
                    <QuizCard key={`${group.key}_${index}`} quiz={quiz} index={index} />
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.emptyQuiz}>
                <Text style={styles.emptyQuizText}>
                  Chưa có bộ câu hỏi trắc nghiệm nào được tạo cho bài học này.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 2. TAB SƠ ĐỒ TƯ DUY (MINDMAP) */}
      {subTab === 'mindmap' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, styles.sectionIconViolet]}>
              <Icon name="mindmap" size={16} color={colors.violet} />
            </View>
            <Text style={styles.sectionTitle}>SƠ ĐỒ TƯ DUY KIẾN THỨC</Text>
          </View>
          <MindmapViewer mindmap={mindmap} defaultTitle={lecture?.title} />
        </View>
      )}

      {/* 3. TAB NGÂN HÀNG BÀI TẬP TỰ LUYỆN */}
      {subTab === 'exercises' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, styles.sectionIconLemon]}>
              <Icon name="menuBook" size={16} color="#8A6100" />
            </View>
            <Text style={styles.sectionTitle}>NGÂN HÀNG BÀI TẬP</Text>
          </View>

          {exercises.length > 0 ? (
            exercises.map((ex, idx) => (
              <ExerciseCard key={idx} exercise={ex} index={idx} />
            ))
          ) : (
            <View style={styles.emptyQuiz}>
              <Text style={styles.emptyQuizText}>
                Chưa có câu hỏi tự luyện nào. Hãy tạo phụ đề bài giảng để tạo bài tập!
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Nút Xuất / Chia sẻ tài liệu ôn tập */}
      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportBtn, styles.exportFileBtn]}
          onPress={handleExportSummary}
          activeOpacity={0.85}
        >
          <Icon name="download" size={16} color={colors.mintDeep} />
          <Text style={[styles.exportBtnText, styles.exportFileBtnText]}>Tài liệu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportBtn, styles.exportVideoBtn]}
          onPress={handleDownloadVideo}
          activeOpacity={0.85}
        >
          <Icon name="download" size={16} color={colors.coralDeep} />
          <Text style={[styles.exportBtnText, styles.exportVideoBtnText]}>Tải Video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportBtn, styles.exportShareBtn]}
          onPress={handleShareDoc}
          activeOpacity={0.85}
        >
          <Icon name="share" size={16} color={colors.violet} />
          <Text style={[styles.exportBtnText, styles.exportShareBtnText]}>Chia sẻ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },

  // Segmented control
  subTabRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
  },
  subTabBtnActive: {
    backgroundColor: colors.coral,
    ...shadows.coral,
  },
  subTabBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slate,
    flexShrink: 1,
  },
  subTabBtnTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },

  // Card section
  sectionCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralTint,
  },
  sectionIconMint: {
    backgroundColor: colors.mintSoft,
  },
  sectionIconViolet: {
    backgroundColor: colors.violetSoft,
  },
  sectionIconLemon: {
    backgroundColor: colors.lemonSoft,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.ink,
    letterSpacing: 0.4,
  },

  summaryBox: {
    marginBottom: spacing.md,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLow,
  },
  summaryLabel: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.coral,
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  summaryText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.slate,
    lineHeight: 21,
  },

  keyPointsBox: {
    marginBottom: spacing.md,
  },
  keyPointsLabel: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.mintDeep,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mint,
    marginTop: 7,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.slate,
    lineHeight: 19,
  },

  routeBox: {
    marginBottom: spacing.md,
    padding: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLow,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  routeLabel: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.coralDeep,
    letterSpacing: 0.2,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  routeIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLowest,
    borderWidth: 1,
    borderColor: colors.outline,
    flexShrink: 0,
    marginTop: 1,
  },
  routeIndexText: {
    fontFamily: fonts.extraBold,
    fontSize: 9.5,
    color: colors.coral,
  },
  routeContent: {
    flex: 1,
    minWidth: 0,
  },
  routeTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  routeTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.ink,
  },
  routeTime: {
    fontFamily: fonts.extraBold,
    fontSize: 9,
    lineHeight: 13,
    color: colors.muted,
    flexShrink: 0,
  },
  routeSummary: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.slate,
  },

  formulasBox: {
    marginBottom: spacing.xs,
  },
  formulasLabel: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.violet,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  termList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  termTag: {
    backgroundColor: colors.violetSoft,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  termText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.violet,
    lineHeight: 16,
  },

  quizGroup: {
    marginBottom: spacing.xs,
  },
  quizGroupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.mintSoft,
  },
  quizGroupIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
    flexShrink: 0,
  },
  quizGroupIndexText: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  quizGroupTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  quizGroupTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.mintDeep,
  },
  quizGroupTime: {
    marginTop: 1,
    fontFamily: fonts.semiBold,
    fontSize: 9.5,
    lineHeight: 13,
    color: colors.mintDeep,
    opacity: 0.8,
  },
  emptyQuiz: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyQuizText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Hàng nút xuất
  exportRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  exportBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 16,
  },
  exportFileBtn: {
    backgroundColor: colors.mintSoft,
  },
  exportFileBtnText: {
    color: colors.mintDeep,
  },
  exportVideoBtn: {
    backgroundColor: colors.coralTint,
  },
  exportVideoBtnText: {
    color: colors.coralDeep,
  },
  exportShareBtn: {
    backgroundColor: colors.violetSoft,
  },
  exportShareBtnText: {
    color: colors.violet,
  },
});
