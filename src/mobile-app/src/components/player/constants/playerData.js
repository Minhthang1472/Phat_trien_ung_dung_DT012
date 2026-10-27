export const LANG_MAP = {
  vi: { code: 'vi', name: 'Tiếng Việt' },
  en: { code: 'en', name: 'Tiếng Anh' },
  ja: { code: 'ja', name: 'Tiếng Nhật' },
  ko: { code: 'ko', name: 'Tiếng Hàn' },
  zh: { code: 'zh', name: 'Tiếng Trung' },
  fr: { code: 'fr', name: 'Tiếng Pháp' },
  de: { code: 'de', name: 'Tiếng Đức' },
  es: { code: 'es', name: 'Tiếng Tây Ban Nha' },
  ru: { code: 'ru', name: 'Tiếng Nga' },
};

export const getLangMeta = (code, fallbackName = 'Ngôn ngữ') => {
  if (!code) return { code: '', name: fallbackName };
  const clean = String(code).toLowerCase().trim();
  return LANG_MAP[clean] || { code: clean, name: clean.toUpperCase() };
};

// HTML nhúng YouTube Iframe API cho Mobile WebView (Tương thích Android / iOS 100%)
export const generateYouTubeHtml = (youtubeId, startSeconds = 0) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    #player { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
    video::-webkit-media-controls { opacity: 0.99 !important; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    var player;
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: '${youtubeId}',
        playerVars: {
          playsinline: 1,
          controls: 1,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          enablejsapi: 1,
          fs: 1,
          start: ${Math.floor(startSeconds || 0)},
          origin: 'https://www.youtube.com'
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
      });
      window.player = player;
    }

    function post(type, data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {})));
      }
    }

    var timer = null;
    function onPlayerReady(event) {
      window.player = player;
      post('ready', { duration: player.getDuration ? player.getDuration() : 0 });
    }

    function onPlayerStateChange(event) {
      post('stateChange', { state: event.data });
      if (event.data === 1) {
        if (!timer) {
          timer = setInterval(function() {
            if (player && player.getCurrentTime) {
              post('timeUpdate', { time: player.getCurrentTime() });
            }
          }, 250);
        }
      } else {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
    }

    window.addEventListener('message', function(e) { handleCommand(e.data); });
    document.addEventListener('message', function(e) { handleCommand(e.data); });
    function handleCommand(raw) {
      try {
        var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!player) return;
        if (data.action === 'seek' && player.seekTo) {
          player.seekTo(data.time, true);
          if (player.playVideo) player.playVideo();
        } else if (data.action === 'pause' && player.pauseVideo) {
          player.pauseVideo();
        } else if (data.action === 'play' && player.playVideo) {
          player.playVideo();
        }
      } catch(e) {}
    }
  </script>
</body>
</html>
`;

// HTML nhúng Local Media/Audio cho Mobile WebView
export const generateMediaHtml = (src, isAudio = false, startSeconds = 0) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    video, audio { width: 100%; height: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <${isAudio ? 'audio' : 'video'} id="media" src="${src}" controls playsinline preload="auto"></${isAudio ? 'audio' : 'video'}>
  <script>
    var media = document.getElementById('media');
    function post(type, data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {})));
      }
    }
    media.addEventListener('loadedmetadata', function() {
      post('ready', { duration: media.duration });
      if (${Math.floor(startSeconds || 0)} > 0) {
        media.currentTime = ${Math.floor(startSeconds || 0)};
      }
    });
    media.addEventListener('play', function() { post('stateChange', { state: 1 }); });
    media.addEventListener('pause', function() { post('stateChange', { state: 2 }); });
    media.addEventListener('timeupdate', function() {
      post('timeUpdate', { time: media.currentTime });
    });

    window.addEventListener('message', function(e) { handleCommand(e.data); });
    document.addEventListener('message', function(e) { handleCommand(e.data); });
    function handleCommand(raw) {
      try {
        var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!media) return;
        if (data.action === 'seek') {
          media.currentTime = data.time;
          media.play();
        } else if (data.action === 'pause') {
          media.pause();
        } else if (data.action === 'play') {
          media.play();
        }
      } catch(e) {}
    }
  </script>
</body>
</html>
`;
