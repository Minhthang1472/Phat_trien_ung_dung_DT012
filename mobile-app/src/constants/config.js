import { Platform } from 'react-native';

// Tự động phát hiện URL mặc định theo nền tảng
export const getDefaultApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  // iOS Simulator hoặc Web chạy localhost
  return 'http://127.0.0.1:8000';
};

export const STORAGE_KEYS = {
  SERVER_URL: '@lecture_ai_server_url',
  RECENT_LECTURES: '@lecture_ai_recent_history',
  FAVORITES: '@lecture_ai_favorites',
  PLAYBACK_PROGRESS: '@lecture_ai_playback_progress',
  CUSTOM_FOLDERS: '@lecture_ai_custom_folders',
  DEFAULT_FOLDER: '@lecture_ai_default_folder',
  DEFAULT_TAGS: '@lecture_ai_default_tags',
  DEFAULT_EXPORT_DIR: '@lecture_ai_default_export_dir',
  DEFAULT_EXPORT_DIR_NAME: '@lecture_ai_default_export_dir_name',
  AUTH_TOKEN: '@lecture_ai_auth_token',
  AUTH_USER: '@lecture_ai_auth_user',
};

export const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt 🇻🇳' },
  { code: 'en', label: 'English 🇺🇸' },
  { code: 'ja', label: '日本語 🇯🇵' },
  { code: 'ko', label: '한국어 🇰🇷' },
  { code: 'zh', label: '中文 🇨🇳' },
];

export const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
};
