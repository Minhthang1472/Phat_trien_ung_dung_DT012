import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import SubtitleItem from '../../SubtitleItem';
import { spacing, colors } from '../../../constants/theme';

export default function SubtitleListSection({
  scrollRef,
  hasDifferentOriginal,
  sourceLangCode,
  targetLangCode,
  sourceLangInfo,
  targetLangInfo,
  subMode,
  setSubMode,
  interactiveQuizEnabled,
  setInteractiveQuizEnabled,
  checkpointQuizzes,
  streamProgress,
  searchQuery,
  setSearchQuery,
  filteredSegments,
  segments,
  activeSegmentIndex,
  handleSeek,
  styles,
}) {
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.subtitlesScroll}
      contentContainerStyle={styles.subtitlesScrollContent}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
    >
      {/* Thanh chọn chế độ Ngôn ngữ Phụ đề */}
      <View style={styles.langModeBar}>
        <Text style={styles.langModeLabel}>Phụ đề:</Text>
        <View style={styles.langModeButtons}>
          {/* Nút 1: Chế độ Song ngữ (nếu có bản dịch khác tiếng gốc) */}
          {(hasDifferentOriginal || sourceLangCode !== targetLangCode) && (
            <TouchableOpacity
              style={[
                styles.langModeBtn,
                subMode === 'bilingual' && styles.langModeBtnActive,
              ]}
              onPress={() => setSubMode('bilingual')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langModeBtnText,
                  subMode === 'bilingual' && styles.langModeBtnTextActive,
                ]}
              >
                🌐 Song ngữ
              </Text>
            </TouchableOpacity>
          )}

          {/* Nút 2: Phụ đề đã dịch (Target Language) */}
          <TouchableOpacity
            style={[
              styles.langModeBtn,
              subMode === 'target' && styles.langModeBtnActive,
            ]}
            onPress={() => setSubMode('target')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.langModeBtnText,
                subMode === 'target' && styles.langModeBtnTextActive,
              ]}
            >
              {targetLangInfo.flag} {targetLangInfo.name}
            </Text>
          </TouchableOpacity>

          {/* Nút 3: Ngôn ngữ gốc người nói trong video */}
          {(hasDifferentOriginal || sourceLangCode !== targetLangCode) && (
            <TouchableOpacity
              style={[
                styles.langModeBtn,
                subMode === 'original' && styles.langModeBtnActive,
              ]}
              onPress={() => setSubMode('original')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langModeBtnText,
                  subMode === 'original' && styles.langModeBtnTextActive,
                ]}
              >
                {sourceLangInfo.flag} {sourceLangInfo.name} (Gốc)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Thanh tùy chọn Trắc nghiệm tương tác theo mốc video */}
      <View style={styles.interactiveQuizBar}>
        <TouchableOpacity
          style={[
            styles.quizTogglePill,
            interactiveQuizEnabled && styles.quizTogglePillActive,
          ]}
          onPress={() => setInteractiveQuizEnabled(!interactiveQuizEnabled)}
          activeOpacity={0.8}
        >
          <Text style={styles.quizTogglePillIcon}>
            {interactiveQuizEnabled ? '🎯' : '⏸️'}
          </Text>
          <Text
            style={[
              styles.quizTogglePillText,
              interactiveQuizEnabled && styles.quizTogglePillTextActive,
            ]}
          >
            Trắc nghiệm theo video: {interactiveQuizEnabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
          </Text>
        </TouchableOpacity>

        {checkpointQuizzes.length > 0 && (
          <View style={styles.checkpointCountBadge}>
            <Text style={styles.checkpointCountText}>
              {checkpointQuizzes.length} mốc ôn tập
            </Text>
          </View>
        )}
      </View>

      {/* Banner thông báo tiến độ nạp ngầm song song cho video dài (Giai đoạn 3) */}
      {streamProgress !== null && streamProgress < 100 && (
        <View style={styles.streamingBanner}>
          <Text style={styles.streamingBannerIcon}>⚡</Text>
          <Text style={styles.streamingBannerText}>
            Đang xử lý ngầm và nạp dần phụ đề ({streamProgress}%)... Bạn vẫn theo dõi video bình thường.
          </Text>
        </View>
      )}

      {/* Thanh tìm kiếm phụ đề và mốc thời gian */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Tìm câu / chủ đề bài giảng (ví dụ: công thức, khái niệm)..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Thống kê kết quả tìm kiếm */}
      {searchQuery.trim().length > 0 && (
        <View style={styles.searchStatsBar}>
          <Text style={styles.searchStatsText}>
            🎯 Tìm thấy <Text style={{ color: '#f59e0b', fontWeight: '800' }}>{filteredSegments.length}</Text> câu phụ đề khớp với "{searchQuery.trim()}":
          </Text>
        </View>
      )}

      {/* Danh sách phụ đề đồng bộ chạy theo giây */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: 4 }}>
        {filteredSegments.length > 0 ? (
          filteredSegments.map((seg, idx) => (
            <SubtitleItem
              key={idx}
              segment={seg}
              isActive={segments[activeSegmentIndex] === seg}
              onSeek={handleSeek}
              subMode={subMode}
              searchQuery={searchQuery}
            />
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? `Không tìm thấy câu nào khớp với "${searchQuery}"`
                : 'Chưa có phụ đề bóc tách cho bài giảng này.'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
