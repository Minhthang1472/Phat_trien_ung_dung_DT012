import React from 'react';
import { View, Text, Platform, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import YoutubePlayer from 'react-native-youtube-iframe';
import InVideoQuizOverlay from './InVideoQuizOverlay';
import Icon from '../../ui/Icon';

export default function VideoPlayerSection({
  isYouTube,
  youtubeId,
  mediaSrc,
  isAudioOnly,
  title,
  duration,
  effectiveSeekTime,
  isPlaying,
  setIsPlaying,
  htmlMediaRef,
  ytPlayerRef,
  webViewRef,
  lastTimeUpdateRef,
  lecture,
  handleMediaLoadedMetadata,
  handleMediaTimeUpdate,
  handleMediaSeeked,
  handleWebViewMessage,
  showCC,
  activeSegment,
  subMode,
  activeCheckpointQuiz,
  formatTime,
  handleResumeFromQuiz,
  handleSelectQuizOption,
  generateMediaHtml,
  apiService,
  styles,
}) {
  return (
    <View style={styles.videoContainer}>
      {Platform.OS === 'web' ? (
        isYouTube && youtubeId ? (
          <iframe
            id="yt-sync-iframe"
            src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
            style={{ width: '100%', height: '100%', minHeight: 220, border: 'none', borderRadius: 12 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        ) : mediaSrc ? (
          !isAudioOnly ? (
            <video
              ref={htmlMediaRef}
              src={mediaSrc}
              controls
              playsInline
              preload="auto"
              style={{
                width: '100%',
                height: '100%',
                minHeight: 220,
                maxHeight: 260,
                backgroundColor: '#000',
                borderRadius: 12,
                objectFit: 'contain',
              }}
              onLoadedMetadata={handleMediaLoadedMetadata}
              onTimeUpdate={handleMediaTimeUpdate}
              onSeeked={handleMediaSeeked}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '24px 16px',
                backgroundColor: '#0f172a',
                borderRadius: 12,
                width: '100%',
                height: '100%',
                minHeight: 200,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: 'rgba(255, 111, 97, 0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FF8A65"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
                  <path d="M19 11a7 7 0 0 1-14 0" />
                  <line x1="12" y1="18" x2="12" y2="21" />
                  <line x1="8.5" y1="21" x2="15.5" y2="21" />
                </svg>
              </div>
              <div
                style={{
                  color: '#f8fafc',
                  fontSize: 14,
                  fontWeight: '600',
                  marginBottom: 16,
                  textAlign: 'center',
                  maxWidth: '90%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </div>
              <audio
                ref={htmlMediaRef}
                src={mediaSrc}
                controls
                preload="auto"
                style={{ width: '100%', maxWidth: 400 }}
                onLoadedMetadata={handleMediaLoadedMetadata}
                onTimeUpdate={handleMediaTimeUpdate}
                onSeeked={handleMediaSeeked}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          )
        ) : youtubeId ? (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
            <View style={styles.thumbnailOverlay}>
              <Text style={styles.thumbnailTitle} numberOfLines={2}>
                {title}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.mediaPlaceholder}>
            <View style={styles.mediaIconBadge}>
              <Icon name="school" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.mediaTitle} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.mediaStatus}>
              Bài giảng mẫu • {formatTime(duration)}
            </Text>
          </View>
        )
      ) : (
        /* PHÁT TRÊN MOBILE (Android / iOS) QUA REACT-NATIVE-YOUTUBE-IFRAME */
        isYouTube && youtubeId ? (
          <YoutubePlayer
            ref={ytPlayerRef}
            height={220}
            play={isPlaying}
            videoId={youtubeId}
            initialPlayerParams={{
              preventFullScreen: false,
              controls: true,
              rel: false,
              start: Math.floor(effectiveSeekTime || 0),
            }}
            onReady={() => {
              if (effectiveSeekTime > 0 && ytPlayerRef.current?.seekTo) {
                try {
                  ytPlayerRef.current.seekTo(effectiveSeekTime, true);
                } catch (_) {}
              }
            }}
            onChangeState={(state) => {
              if (state === 'playing') {
                setIsPlaying(true);
              } else if (state === 'paused') {
                setIsPlaying(false);
                if (lecture?.video_url && lastTimeUpdateRef?.current > 0) {
                  apiService.savePlaybackProgress(
                    lecture.video_url,
                    lastTimeUpdateRef.current,
                    duration
                  );
                }
              } else if (state === 'ended') {
                setIsPlaying(false);
              }
            }}
            webViewProps={{
              androidLayerType: 'hardware',
              androidHardwareAccelerationDisabled: false,
              setSupportMultipleWindows: false,
            }}
          />
        ) : mediaSrc ? (
          <WebView
            ref={webViewRef}
            style={styles.nativeWebView}
            containerStyle={styles.nativeWebViewContainer}
            originWhitelist={['*']}
            source={{
              html: generateMediaHtml(mediaSrc, isAudioOnly, effectiveSeekTime),
            }}
            userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
            allowsInlineMediaPlayback={true}
            allowsFullscreenVideo={true}
            mediaPlaybackRequiresUserAction={false}
            mediaPlaybackRequiresUserGesture={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
            androidLayerType="hardware"
            androidHardwareAccelerationDisabled={false}
            onMessage={handleWebViewMessage}
          />
        ) : youtubeId ? (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
            <View style={styles.thumbnailOverlay}>
              <Text style={styles.thumbnailTitle} numberOfLines={2}>
                {title}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.mediaPlaceholder}>
            <View style={styles.mediaIconBadge}>
              <Icon name="school" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.mediaTitle} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.mediaStatus}>
              Bài giảng mẫu • {formatTime(duration)}
            </Text>
          </View>
        )
      )}

      {/* Lớp phủ phụ đề nổi trên video (Overlay CC) */}
      {showCC && activeSegment && !activeCheckpointQuiz && (
        <View style={styles.ccOverlayContainer} pointerEvents="none">
          <View style={styles.ccOverlayBox}>
            <Text style={styles.ccOverlayText} numberOfLines={2} ellipsizeMode="tail">
              {subMode === 'original'
                ? activeSegment.original_text || activeSegment.text
                : activeSegment.translated_text ||
                  activeSegment.text ||
                  activeSegment.original_text}
            </Text>
            {subMode === 'bilingual' &&
              activeSegment.original_text &&
              activeSegment.original_text.trim() !==
                (
                  activeSegment.translated_text ||
                  activeSegment.text ||
                  ''
                ).trim() && (
                <Text style={styles.ccOverlaySubText} numberOfLines={1} ellipsizeMode="tail">
                  {activeSegment.original_text}
                </Text>
              )}
          </View>
        </View>
      )}

      {/* Lớp phủ Trắc nghiệm tương tác theo mốc thời gian */}
      {activeCheckpointQuiz && (
        <InVideoQuizOverlay
          activeCheckpointQuiz={activeCheckpointQuiz}
          formatTime={formatTime}
          handleResumeFromQuiz={handleResumeFromQuiz}
          handleSelectQuizOption={handleSelectQuizOption}
          styles={styles}
        />
      )}
    </View>
  );
}
