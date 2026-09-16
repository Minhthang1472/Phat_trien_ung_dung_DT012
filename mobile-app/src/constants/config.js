import { Platform } from 'react-native';

// Tự động phát hiện URL mặc định theo nền tảng
export const getDefaultApiUrl = () => {
  if (Platform.OS === 'android') {
    // Android Emulator trỏ vào 10.0.2.2 để kết nối localhost của máy tính host
    return 'http://10.0.2.2:8000';
  }
  // iOS Simulator hoặc Web chạy localhost
  return 'http://127.0.0.1:8000';
};

export const STORAGE_KEYS = {
  SERVER_URL: '@lecture_ai_server_url',
  RECENT_LECTURES: '@lecture_ai_recent_history',
};

export const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt 🇻🇳' },
  { code: 'en', label: 'English 🇺🇸' },
  { code: 'ja', label: '日本語 🇯🇵' },
  { code: 'ko', label: '한국어 🇰🇷' },
  { code: 'zh', label: '中文 🇨🇳' },
];
