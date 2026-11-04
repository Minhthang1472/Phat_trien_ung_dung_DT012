import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Platform, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import YoutubePlayer from 'react-native-youtube-iframe';
import InVideoQuizOverlay from './InVideoQuizOverlay';
import Icon from '../../ui/Icon';

export default function VideoPlayerSection({
  isYouTube,
  youtubeId,
  isDrive,
  drivePreviewUrl,
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
  isFullscreen,
  setIsFullscreen,
  setSubMode,
  styles,
}) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isPhysicallyLandscape = winWidth > winHeight;

  let containerDynamicStyle = styles.videoContainer;
  let playerHeight = 220;

  if (isFullscreen) {
    if (isPhysicallyLandscape) {
      containerDynamicStyle = [
        styles.videoContainer,
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: winWidth,
          height: winHeight,
          zIndex: 99999,
          elevation: 99999,
          borderRadius: 0,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ];
      playerHeight = winHeight;
    } else {
      containerDynamicStyle = [
        styles.videoContainer,
        {
          position: 'absolute',
          width: winHeight,
          height: winWidth,
          top: (winHeight - winWidth) / 2,
          left: -(winHeight - winWidth) / 2,
          transform: [{ rotate: '90deg' }],
          zIndex: 99999,
          elevation: 99999,
          borderRadius: 0,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ];
      playerHeight = winWidth;
    }
  }
  const [fallbackToIframe, setFallbackToIframe] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimer = useRef(null);

  const resetControlsTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    setControlsVisible(true);
    hideControlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3500);
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      resetControlsTimer();
    } else {
      setControlsVisible(true);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    }
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [isFullscreen, resetControlsTimer]);
  const fallbackEmbedUrl = drivePreviewUrl || (lecture?.video_url && !lecture.video_url.startsWith('local_file://') ? lecture.video_url : null);

  return (
    <View style={containerDynamicStyle}>
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
        ) : mediaSrc && !fallbackToIframe ? (
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
              onError={(e) => {
                console.warn('Lỗi luồng video trực tiếp, chuyển sang chế độ nhúng Iframe:', e);
                if (fallbackEmbedUrl) setFallbackToIframe(true);
              }}
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
        ) : fallbackEmbedUrl ? (
          <iframe
            id="embed-sync-iframe"
            src={fallbackEmbedUrl}
            style={{ width: '100%', height: '100%', minHeight: 220, border: 'none', borderRadius: 12, backgroundColor: '#000' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title={title}
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
      ) : (
        /* PHÁT TRÊN MOBILE (Android / iOS) */
        isYouTube && youtubeId ? (
          <YoutubePlayer
            ref={ytPlayerRef}
            width={isFullscreen ? (isPhysicallyLandscape ? winWidth : winHeight) : '100%'}
            height={isFullscreen ? playerHeight : 220}
            play={isPlaying}
            videoId={youtubeId}
            initialPlayerParams={{
              preventFullScreen: true,
              controls: true,
              rel: false,
              start: Math.floor(effectiveSeekTime || 0),
            }}
            onFullScreenChange={(status) => {
              if (setIsFullscreen) setIsFullscreen(status);
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
        ) : mediaSrc && !fallbackToIframe ? (
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
            onError={(e) => {
              console.warn('Lỗi WebView mediaSrc, chuyển sang chế độ nhúng URL:', e);
              if (fallbackEmbedUrl) setFallbackToIframe(true);
            }}
          />
        ) : fallbackEmbedUrl ? (
          <WebView
            ref={webViewRef}
            style={styles.nativeWebView}
            containerStyle={styles.nativeWebViewContainer}
            originWhitelist={['*']}
            source={{ uri: fallbackEmbedUrl }}
            userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
            allowsInlineMediaPlayback={true}
            allowsFullscreenVideo={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
            androidLayerType="hardware"
            androidHardwareAccelerationDisabled={false}
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

      {/* Nút phóng to nổi trực tiếp trên video */}
      {!isFullscreen && setIsFullscreen && (
        <TouchableOpacity
          style={styles.floatingFullscreenBtn}
          onPress={() => setIsFullscreen(true)}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.floatingFullscreenPill}>
            <Icon name="fullscreen" size={15} color="#FFFFFF" />
            <Text style={styles.floatingFullscreenText}>Phóng to</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Thanh điều khiển nổi khi đang phóng to (tự động ẩn sau 3.5s để xem toàn màn hình điện ảnh) */}
      {isFullscreen && setIsFullscreen && controlsVisible && (
        <View style={styles.fullscreenTopOverlay}>
          <TouchableOpacity
            style={styles.fullscreenExitPill}
            onPress={() => setIsFullscreen(false)}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="fullscreenExit" size={18} color="#FFFFFF" />
            <Text style={styles.fullscreenExitPillText}>Thu nhỏ</Text>
          </TouchableOpacity>

          {setSubMode && (
            <View style={styles.fullscreenSubModeGroup}>
              <TouchableOpacity
                style={[
                  styles.fullscreenSubPill,
                  subMode === 'bilingual' && styles.fullscreenSubPillActive,
                ]}
                onPress={() => setSubMode('bilingual')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.fullscreenSubPillText,
                    subMode === 'bilingual' && styles.fullscreenSubPillTextActive,
                  ]}
                >
                  Song ngữ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.fullscreenSubPill,
                  subMode === 'vietnamese' && styles.fullscreenSubPillActive,
                ]}
                onPress={() => setSubMode('vietnamese')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.fullscreenSubPillText,
                    subMode === 'vietnamese' && styles.fullscreenSubPillTextActive,
                  ]}
                >
                  Tiếng Việt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.fullscreenSubPill,
                  subMode === 'original' && styles.fullscreenSubPillActive,
                ]}
                onPress={() => setSubMode('original')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.fullscreenSubPillText,
                    subMode === 'original' && styles.fullscreenSubPillTextActive,
                  ]}
                >
                  Gốc
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Nút mờ hỗ trợ hiện lại bảng điều khiển khi đã tự ẩn */}
      {isFullscreen && setIsFullscreen && !controlsVisible && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            zIndex: 40,
            backgroundColor: 'rgba(11, 16, 32, 0.65)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.18)',
          }}
          onPress={() => resetControlsTimer()}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Hiện điều khiển</Text>
        </TouchableOpacity>
      )}

      {/* Lớp phủ phụ đề nổi trên video (Overlay CC) */}
      {showCC && activeSegment && !activeCheckpointQuiz && (
        <View
          style={[
            styles.ccOverlayContainer,
            isFullscreen && styles.ccOverlayContainerFullscreen,
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.ccOverlayBox,
              isFullscreen && styles.ccOverlayBoxFullscreen,
            ]}
          >
            <Text
              style={[
                styles.ccOverlayText,
                isFullscreen && styles.ccOverlayTextFullscreen,
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
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
                <Text
                  style={[
                    styles.ccOverlaySubText,
                    isFullscreen && styles.ccOverlaySubTextFullscreen,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
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
