import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDefaultApiUrl, STORAGE_KEYS } from '../constants/config';

class ApiService {
  constructor() {
    this.cachedBaseUrl = null;
  }

  async getBaseUrl() {
    if (this.cachedBaseUrl) return this.cachedBaseUrl;
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
      if (saved) {
        this.cachedBaseUrl = saved;
        return saved;
      }
    } catch (e) {
      console.warn('Không đọc được server URL từ AsyncStorage:', e);
    }
    const defaultUrl = getDefaultApiUrl();
    this.cachedBaseUrl = defaultUrl;
    return defaultUrl;
  }

  async setBaseUrl(newUrl) {
    let cleanUrl = newUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    this.cachedBaseUrl = cleanUrl;
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, cleanUrl);
    return cleanUrl;
  }

  async checkServerHealth() {
    try {
      const baseUrl = await this.getBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${baseUrl}/`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { online: true, data };
      }
      return { online: false, error: `Status ${response.status}` };
    } catch (err) {
      return { online: false, error: err.message || 'Không thể kết nối máy chủ' };
    }
  }

  async processVideo(videoUrl, targetLanguage = 'vi', sourceLanguage = 'auto', maxDuration = null, includeQuiz = true) {
    const baseUrl = await this.getBaseUrl();
    const payload = {
      video_url: videoUrl,
      target_language: targetLanguage,
      source_language: sourceLanguage,
      max_duration_seconds: maxDuration,
      include_quiz: includeQuiz,
    };

    const response = await fetch(`${baseUrl}/api/video/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errMsg = `Lỗi HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errMsg = errJson.detail || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    // Tự động lưu vào lịch sử local
    await this.saveToLocalHistory(data);
    return data;
  }

  async processSubtitleFile(file, options = {}) {
    const baseUrl = await this.getBaseUrl();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('video_url', options.videoUrl || '');
    formData.append('title', options.title || '');
    formData.append('source_language', options.sourceLanguage || 'auto');
    formData.append('target_language', options.targetLanguage || 'vi');
    formData.append('include_quiz', options.includeQuiz ? 'true' : 'false');

    const response = await fetch(`${baseUrl}/api/subtitles/process`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      let message = `Loi HTTP ${response.status}`;
      try {
        const body = await response.json();
        message = body.detail || message;
      } catch (_) {}
      throw new Error(message);
    }
    const data = await response.json();
    await this.saveToLocalHistory(data);
    return data;
  }

  async burnSubtitlesIntoVideo(mediaUrl, segments) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/video/burn-subtitles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_url: mediaUrl, segments }),
    });
    if (!response.ok) {
      let message = `Lỗi HTTP ${response.status}`;
      try {
        const body = await response.json();
        message = body.detail || message;
      } catch (_) {}
      throw new Error(message);
    }
    const data = await response.json();
    return {
      ...data,
      media_url: data.media_url.startsWith('http')
        ? data.media_url
        : `${baseUrl}${data.media_url}`,
    };
  }

  async getLectureHistory(limit = 10) {
    try {
      const baseUrl = await this.getBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/api/history?limit=${limit}`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          return data.items;
        }
      }
    } catch (e) {
      console.warn('Lỗi lấy lịch sử từ server, chuyển sang local history:', e);
    }

    // Fallback sang local cache
    return await this.getLocalHistory();
  }

  async saveToLocalHistory(lecture) {
    try {
      const history = await this.getLocalHistory();
      // Loại bỏ bản ghi trùng URL nếu có
      const filtered = history.filter((item) => item.video_url !== lecture.video_url);
      filtered.unshift({
        video_url: lecture.video_url,
        title: lecture.title || 'Bài giảng không tên',
        duration_seconds: lecture.duration_seconds || 0,
        language: lecture.language || 'vi',
        summary: lecture.summary || '',
        cached_offline: true,
        full_data: lecture,
      });
      // Giữ tối đa 20 bản ghi
      const trimmed = filtered.slice(0, 20);
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_LECTURES, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Lỗi lưu local history:', e);
    }
  }

  async getLocalHistory() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_LECTURES);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Lỗi đọc local history:', e);
    }
    return [];
  }

  async clearLocalHistory() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_LECTURES);
      return true;
    } catch (e) {
      console.warn('Lỗi xóa local history:', e);
      return false;
    }
  }

  async deleteLecture(videoUrl) {
    if (!videoUrl) return false;
    // 1. Xóa trên Cloud Firestore qua Backend
    try {
      const baseUrl = await this.getBaseUrl();
      await fetch(`${baseUrl}/api/history?video_url=${encodeURIComponent(videoUrl)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Lỗi gọi xóa bài giảng trên server:', e);
    }

    // 2. Xóa trong Local AsyncStorage
    try {
      const history = await this.getLocalHistory();
      const filtered = history.filter((item) => item.video_url !== videoUrl);
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_LECTURES, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Lỗi xóa bài giảng trong local storage:', e);
    }

    return true;
  }
}

export const apiService = new ApiService();
