import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { getDefaultApiUrl, STORAGE_KEYS } from '../constants/config';

const SAF = LegacyFileSystem?.StorageAccessFramework || FileSystem?.StorageAccessFramework;

class ApiService {
  constructor() {
    this.cachedBaseUrl = null;
  }

  async syncServerUrlFromFirebase() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        'https://firestore.googleapis.com/v1/projects/ptud-dt012/databases/(default)/documents/system_config/server',
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const remoteUrl = data?.fields?.url?.stringValue;
        if (remoteUrl && (remoteUrl.startsWith('http://') || remoteUrl.startsWith('https://'))) {
          let clean = remoteUrl.trim();
          if (clean.endsWith('/')) clean = clean.slice(0, -1);
          console.log('✅ Đã tự động đồng bộ URL Server từ Firebase Firestore:', clean);
          this.cachedBaseUrl = clean;
          await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, clean);
          return clean;
        }
      }
    } catch (err) {
      console.log('Chưa đồng bộ được URL từ Firebase Firestore:', err?.message || err);
    }
    return null;
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

    // Tự động thử lấy từ Firebase nếu chưa có cấu hình thủ công
    const fromFirebase = await this.syncServerUrlFromFirebase();
    if (fromFirebase) return fromFirebase;

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

  async getAuthToken() {
    if (Platform.OS !== 'web') return SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    return AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  async getAuthHeaders() {
    const token = await this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async saveAuthSession(data) {
    if (Platform.OS !== 'web') await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, data.token);
    else await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
    return data.user;
  }

  async register(email, password, displayName = '') {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
    const data = await this.parseResponse(response);
    if (data && data.token) {
      const user = await this.saveAuthSession(data);
      return { ...data, user };
    }
    return data;
  }

  async login(email, password) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await this.parseResponse(response);
    if (data && data.token) {
      const user = await this.saveAuthSession(data);
      return { ...data, user };
    }
    return data;
  }

  async loginWithGoogle(idToken) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    });
    const data = await this.parseResponse(response);
    return this.saveAuthSession(data);
  }

  async forgotPassword(email) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return this.parseResponse(response);
  }

  async verifyOtp(email, otp) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await this.parseResponse(response);
    if (data && data.token) {
      const user = await this.saveAuthSession(data);
      return { ...data, user };
    }
    return data;
  }

  async resendOtp(email) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return this.parseResponse(response);
  }

  async verifyResetOtp(email, otp) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/verify-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    return this.parseResponse(response);
  }

  async resetPasswordOtp(email, otp, newPassword) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/reset-password-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, new_password: newPassword }),
    });
    return this.parseResponse(response);
  }

  async changePassword(oldPassword, newPassword) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await this.getAuthHeaders()) },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    return this.parseResponse(response);
  }

  async updateProfile(payload) {
    const baseUrl = await this.getBaseUrl();
    const bodyObj = typeof payload === 'string' ? { display_name: payload } : (payload || {});
    const response = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await this.getAuthHeaders()) },
      body: JSON.stringify(bodyObj),
    });
    const data = await this.parseResponse(response);
    if (data?.user) {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
    }
    return data;
  }

  async parseResponse(response) {
    let data = null;
    try { data = await response.json(); } catch (_) { }
    if (!response.ok) throw new Error(data?.detail || `Lỗi HTTP ${response.status}`);
    return data;
  }

  async getProfile() {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: await this.getAuthHeaders(),
    });
    return this.parseResponse(response);
  }

  async getSavedUser() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  async logout() {
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    else await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  }

  async exportUserConfig() {
    const keys = [
      STORAGE_KEYS.SERVER_URL,
      STORAGE_KEYS.DEFAULT_FOLDER,
      STORAGE_KEYS.DEFAULT_TAGS,
      STORAGE_KEYS.DEFAULT_EXPORT_DIR_NAME,
    ];
    const values = await AsyncStorage.multiGet(keys);
    const config = {
      version: 1,
      exported_at: new Date().toISOString(),
      settings: Object.fromEntries(values.map(([key, value]) => [key, value || ''])),
    };
    return this.exportFile('lecture-ai-config.json', JSON.stringify(config, null, 2), 'application/json');
  }

  async importUserConfig(file) {
    const raw = await FileSystem.readAsStringAsync(file.uri);
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.settings) {
      throw new Error('File cấu hình không đúng định dạng Lecture AI.');
    }
    const allowedKeys = [
      STORAGE_KEYS.SERVER_URL,
      STORAGE_KEYS.DEFAULT_FOLDER,
      STORAGE_KEYS.DEFAULT_TAGS,
      STORAGE_KEYS.DEFAULT_EXPORT_DIR_NAME,
    ];
    const entries = allowedKeys
      .filter((key) => typeof parsed.settings[key] === 'string')
      .map((key) => [key, parsed.settings[key]]);
    await AsyncStorage.multiSet(entries);
    this.cachedBaseUrl = null;
    return entries.length;
  }

  async getVideoInfo(videoUrl) {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/video/info?video_url=${encodeURIComponent(videoUrl)}`, {
        headers: await this.getAuthHeaders(),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Lỗi đọc metadata video nhanh:', err);
    }
    return { title: '', duration_seconds: 0, is_long_video: false };
  }

  async cancelJob(jobId) {
    if (!jobId) return false;
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/video/cancel/${encodeURIComponent(jobId)}`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
      });
      return response.ok;
    } catch (err) {
      console.warn('Lỗi gọi API hủy tác vụ:', err);
      return false;
    }
  }

  async updateLectureMeta(videoUrl, { folder, tags }) {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/lecture/meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await this.getAuthHeaders()) },
        body: JSON.stringify({ video_url: videoUrl, folder, tags }),
      });
      // Đồng bộ vào Local History
      const history = await this.getLocalHistory();
      const updated = history.map((item) => {
        if (item.video_url === videoUrl) {
          return {
            ...item,
            folder: folder !== undefined ? folder : item.folder,
            tags: tags !== undefined ? tags : item.tags,
            full_data: {
              ...(item.full_data || {}),
              folder: folder !== undefined ? folder : item.full_data?.folder,
              tags: tags !== undefined ? tags : item.full_data?.tags,
            },
          };
        }
        return item;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_LECTURES, JSON.stringify(updated));
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Lỗi cập nhật thư mục / nhãn bài giảng:', e);
    }
    return { success: false };
  }

  async processVideo(videoUrl, targetLanguageOrOptions = 'vi', sourceLanguage = 'auto', maxDuration = null, includeQuiz = true, extraOptions = {}) {
    let targetLanguage = 'vi';
    let sourceLang = sourceLanguage;
    let maxDur = maxDuration;
    let incQuiz = includeQuiz;
    let startTime = null;
    let endTime = null;
    let jobId = null;
    let folder = null;
    let tags = [];
    let signal = null;

    if (typeof targetLanguageOrOptions === 'object' && targetLanguageOrOptions !== null) {
      targetLanguage = targetLanguageOrOptions.targetLanguage || 'vi';
      sourceLang = targetLanguageOrOptions.sourceLanguage || 'auto';
      maxDur = targetLanguageOrOptions.maxDuration || null;
      incQuiz = targetLanguageOrOptions.includeQuiz !== undefined ? targetLanguageOrOptions.includeQuiz : true;
      startTime = targetLanguageOrOptions.startTime || null;
      endTime = targetLanguageOrOptions.endTime || null;
      jobId = targetLanguageOrOptions.jobId || null;
      folder = targetLanguageOrOptions.folder || null;
      tags = targetLanguageOrOptions.tags || [];
      signal = targetLanguageOrOptions.signal || null;
    } else {
      targetLanguage = targetLanguageOrOptions || 'vi';
      if (extraOptions) {
        startTime = extraOptions.startTime || null;
        endTime = extraOptions.endTime || null;
        jobId = extraOptions.jobId || null;
        folder = extraOptions.folder || null;
        tags = extraOptions.tags || [];
        signal = extraOptions.signal || null;
      }
    }

    const baseUrl = await this.getBaseUrl();
    const payload = {
      video_url: videoUrl,
      target_language: targetLanguage,
      source_language: sourceLang,
      max_duration_seconds: maxDur,
      include_quiz: incQuiz,
      start_time: startTime,
      end_time: endTime,
      job_id: jobId,
      folder: folder,
      tags: tags,
    };

    const fetchOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };
    Object.assign(fetchOpts.headers, await this.getAuthHeaders());
    if (signal) {
      fetchOpts.signal = signal;
    }

    const response = await fetch(`${baseUrl}/api/video/process`, fetchOpts);

    if (!response.ok) {
      let errMsg = `Lỗi HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errMsg = errJson.detail || errMsg;
      } catch (_) { }
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
      headers: await this.getAuthHeaders(),
      body: formData,
    });
    if (!response.ok) {
      let message = `Loi HTTP ${response.status}`;
      try {
        const body = await response.json();
        message = body.detail || message;
      } catch (_) { }
      throw new Error(message);
    }
    const data = await response.json();
    await this.saveToLocalHistory(data);
    return data;
  }

  async uploadWithProgress(endpoint, formData, onProgress, cancelToken = null) {
    const baseUrl = await this.getBaseUrl();
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', fullUrl);
      xhr.setRequestHeader('Accept', 'application/json');
      if (authHeaders.Authorization) {
        xhr.setRequestHeader('Authorization', authHeaders.Authorization);
      }

      if (cancelToken) {
        cancelToken.abort = () => {
          try {
            xhr.abort();
          } catch (_) { }
          reject(new Error('Tác vụ tải lên đã bị người dùng hủy.'));
        };
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
            onProgress(percent, event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (_) {
            resolve(xhr.responseText);
          }
        } else {
          let errMsg = `Lỗi máy chủ (${xhr.status})`;
          try {
            const errObj = JSON.parse(xhr.responseText);
            errMsg = errObj.detail || errMsg;
          } catch (_) {
            if (xhr.responseText) errMsg = xhr.responseText.slice(0, 200);
          }
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Lỗi kết nối mạng khi tải dữ liệu lên máy chủ.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Quá thời gian kết nối tải lên (Timeout).'));
      };

      xhr.send(formData);
    });
  }

  async pairVideoAndSubtitles(subtitleFile, videoFile = null, videoUrl = '', targetLang = 'vi', includeQuiz = true) {
    const baseUrl = await this.getBaseUrl();
    const formData = new FormData();
    formData.append('subtitle_file', subtitleFile);
    if (videoFile) {
      formData.append('video_file', videoFile);
    }
    if (videoUrl) {
      formData.append('video_url', videoUrl);
    }
    formData.append('target_language', targetLang);
    formData.append('include_quiz', includeQuiz ? 'true' : 'false');

    const response = await fetch(`${baseUrl}/api/video/pair`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: formData,
    });
    if (!response.ok) {
      let errMsg = `Lỗi HTTP ${response.status}`;
      try {
        const body = await response.json();
        errMsg = body.detail || errMsg;
      } catch (_) { }
      throw new Error(errMsg);
    }
    const data = await response.json();
    await this.saveToLocalHistory(data);
    return data;
  }

  async streamInit(videoUrl, targetLang = 'vi', sourceLang = 'auto') {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/video/stream-init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await this.getAuthHeaders()) },
      body: JSON.stringify({
        video_url: videoUrl,
        target_language: targetLang,
        source_language: sourceLang,
      }),
    });
    if (!response.ok) {
      let errMsg = `Lỗi HTTP ${response.status}`;
      try {
        const body = await response.json();
        errMsg = body.detail || errMsg;
      } catch (_) { }
      throw new Error(errMsg);
    }
    return await response.json();
  }

  async getStreamStatus(jobId) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/video/stream-status?job_id=${encodeURIComponent(jobId)}`, {
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) return null;
    return await response.json();
  }

  async getUserScopedKey(baseKey) {
    try {
      const user = await this.getSavedUser();
      if (user && user.id) {
        return `${baseKey}_${user.id}`;
      }
    } catch (_) { }
    return baseKey;
  }

  async getLectureHistory(limit = 25) {
    try {
      const baseUrl = await this.getBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${baseUrl}/api/history?limit=${limit}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.items)) {
          const key = await this.getUserScopedKey(STORAGE_KEYS.RECENT_LECTURES);
          await AsyncStorage.setItem(key, JSON.stringify(data.items));
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
      const key = await this.getUserScopedKey(STORAGE_KEYS.RECENT_LECTURES);
      await AsyncStorage.setItem(key, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Lỗi lưu local history:', e);
    }
  }

  async saveLectureToLocal(lecture) {
    return await this.saveToLocalHistory(lecture);
  }

  async getLocalHistory() {
    try {
      const key = await this.getUserScopedKey(STORAGE_KEYS.RECENT_LECTURES);
      const raw = await AsyncStorage.getItem(key);
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
      const key = await this.getUserScopedKey(STORAGE_KEYS.RECENT_LECTURES);
      await AsyncStorage.removeItem(key);
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
        headers: await this.getAuthHeaders(),
      });
    } catch (e) {
      console.warn('Lỗi gọi xóa bài giảng trên server:', e);
    }

    // 2. Xóa trong Local AsyncStorage
    try {
      const history = await this.getLocalHistory();
      const filtered = history.filter((item) => item.video_url !== videoUrl);
      const key = await this.getUserScopedKey(STORAGE_KEYS.RECENT_LECTURES);
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Lỗi xóa bài giảng trong local storage:', e);
    }

    return true;
  }

  // --- Tiến độ phát video (Resume Playback) ---
  async savePlaybackProgress(videoUrl, currentTime, duration) {
    if (!videoUrl) return;
    try {
      const map = await this.getPlaybackProgressMap();
      const cur = Math.max(0, Math.round(currentTime || 0));
      const dur = Math.max(1, Math.round(duration || 0));
      const percent = Math.min(100, Math.round((cur / dur) * 100));
      map[videoUrl] = {
        currentTime: cur,
        duration: dur,
        percent,
        lastUpdated: Date.now(),
      };
      const key = await this.getUserScopedKey(STORAGE_KEYS.PLAYBACK_PROGRESS);
      await AsyncStorage.setItem(key, JSON.stringify(map));
    } catch (e) {
      console.warn('Lỗi lưu tiến độ phát:', e);
    }
  }

  async getPlaybackProgressMap() {
    try {
      const key = await this.getUserScopedKey(STORAGE_KEYS.PLAYBACK_PROGRESS);
      const raw = await AsyncStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Lỗi đọc tiến độ phát:', e);
    }
    return {};
  }

  // --- Danh sách bài giảng Yêu thích / Ghim (Favorites / Pin) ---
  async getFavorites() {
    try {
      const key = await this.getUserScopedKey(STORAGE_KEYS.FAVORITES);
      const raw = await AsyncStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Lỗi đọc favorites:', e);
    }
    return [];
  }

  async toggleFavorite(videoUrl) {
    if (!videoUrl) return [];
    try {
      const favs = await this.getFavorites();
      let updated;
      if (favs.includes(videoUrl)) {
        updated = favs.filter((u) => u !== videoUrl);
      } else {
        updated = [videoUrl, ...favs];
      }
      const key = await this.getUserScopedKey(STORAGE_KEYS.FAVORITES);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Lỗi cập nhật favorites:', e);
      return [];
    }
  }


  // --- Quản lý Thư mục lưu file mặc định ---
  async getDefaultExportDir() {
    try {
      const uri = await AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_EXPORT_DIR);
      const name = await AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_EXPORT_DIR_NAME);
      return { uri, name: name || (uri ? 'Thư mục đã chọn' : null) };
    } catch (e) {
      return { uri: null, name: null };
    }
  }

  async setDefaultExportDir(uri, name) {
    try {
      if (uri) {
        await AsyncStorage.setItem(STORAGE_KEYS.DEFAULT_EXPORT_DIR, uri);
        await AsyncStorage.setItem(STORAGE_KEYS.DEFAULT_EXPORT_DIR_NAME, name || 'Thư mục mặc định');
      } else {
        await this.clearDefaultExportDir();
      }
      return true;
    } catch (e) {
      console.warn('Lỗi lưu thư mục xuất mặc định:', e);
      return false;
    }
  }

  async clearDefaultExportDir() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DEFAULT_EXPORT_DIR);
      await AsyncStorage.removeItem(STORAGE_KEYS.DEFAULT_EXPORT_DIR_NAME);
      return true;
    } catch (e) {
      console.warn('Lỗi xóa thư mục xuất mặc định:', e);
      return false;
    }
  }

  // --- Xuất file Phụ đề & Tóm tắt với Native File Picker hoặc Thư mục Mặc định ---
  async exportFile(filename, content, mimeType = 'text/plain') {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        // Tùy chọn 1: Dùng File System Access API (Native Save As Dialog cho người dùng chọn thư mục đích)
        if (typeof window !== 'undefined' && window.showSaveFilePicker) {
          try {
            const ext = filename.split('.').pop();
            const fileHandle = await window.showSaveFilePicker({
              suggestedName: filename,
              types: [
                {
                  description: 'Tệp xuất dữ liệu bài giảng',
                  accept: { [mimeType]: [`.${ext}`] },
                },
              ],
            });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return { success: true, isDefault: false };
          } catch (pickerErr) {
            if (pickerErr.name === 'AbortError') {
              return { success: false, cancelled: true };
            }
          }
        }

        // Tùy chọn 2: Fallback qua HTML5 Blob Download
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, isDefault: false };
      }

      // Trên Mobile Android
      if (Platform.OS === 'android') {
        // 1. Kiểm tra xem người dùng đã cài đặt sẵn Thư mục lưu mặc định chưa
        const { uri: defaultDirUri, name: defaultDirName } = await this.getDefaultExportDir();
        if (defaultDirUri && SAF?.createFileAsync) {
          try {
            const fileUri = await SAF.createFileAsync(
              defaultDirUri,
              filename,
              mimeType
            );
            await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
            return { success: true, isDefault: true, dirName: defaultDirName, path: fileUri };
          } catch (defaultDirErr) {
            console.warn('Không thể ghi vào thư mục mặc định (có thể quyền bị thu hồi), chuyển sang chọn thủ công:', defaultDirErr);
          }
        }

        // 2. Nếu chưa có thư mục mặc định hoặc bị lỗi quyền: Bật hộp thoại chọn thư mục lưu (Native Directory Picker)
        if (SAF?.requestDirectoryPermissionsAsync) {
          try {
            const permissions = await SAF.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const fileUri = await SAF.createFileAsync(
                permissions.directoryUri,
                filename,
                mimeType
              );
              await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
              return { success: true, isDefault: false, path: fileUri };
            } else {
              return { success: false, cancelled: true };
            }
          } catch (androidErr) {
            console.warn('Người dùng hủy chọn thư mục hoặc lỗi Storage Access:', androidErr);
          }
        }
      }

      // Fallback cho iOS hoặc khi Android từ chối chọn thư mục: Mở bảng Share Sheet
      const filePath = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(filePath, content, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType,
          dialogTitle: `Lưu ${filename}`,
        });
      }
      return { success: true, isDefault: false, path: filePath };
    } catch (err) {
      console.warn('Lỗi xuất file:', err);
      throw err;
    }
  }

  // --- Xuất file nhị phân (Video MP4 / Audio) vào Thư mục Mặc định hoặc Khay Share ---
  async exportBinaryFile(filename, sourceFileUri, mimeType = 'video/mp4') {
    try {
      if (Platform.OS === 'android') {
        const { uri: defaultDirUri, name: defaultDirName } = await this.getDefaultExportDir();
        if (defaultDirUri && SAF?.createFileAsync) {
          try {
            const fileUri = await SAF.createFileAsync(
              defaultDirUri,
              filename,
              mimeType
            );
            const base64Data = await FileSystem.readAsStringAsync(sourceFileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return { success: true, isDefault: true, dirName: defaultDirName, path: fileUri };
          } catch (err) {
            console.warn('Lỗi ghi video vào thư mục mặc định, chuyển sang Share Sheet:', err);
          }
        }
      }

      // Fallback sang Share Sheet hệ thống
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(sourceFileUri, {
          mimeType,
          dialogTitle: `Lưu ${filename}`,
        });
        return { success: true, isDefault: false };
      }
      return { success: true, isDefault: false, path: sourceFileUri };
    } catch (err) {
      console.warn('Lỗi xuất file nhị phân:', err);
      throw err;
    }
  }

  exportLectureSRT(lecture) {
    const segments = lecture.segments || [];
    if (!segments || segments.length === 0) {
      throw new Error('Bài giảng chưa có danh sách phụ đề.');
    }
    const formatSRTTime = (sec) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.round((sec % 1) * 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };

    let srt = '';
    segments.forEach((seg, idx) => {
      srt += `${idx + 1}\n`;
      srt += `${formatSRTTime(seg.start || 0)} --> ${formatSRTTime(seg.end || 0)}\n`;
      srt += `${seg.text || ''}\n`;
      if (seg.original_text && seg.original_text.trim() !== (seg.text || '').trim()) {
        srt += `${seg.original_text}\n`;
      }
      srt += '\n';
    });

    const safeTitle = (lecture.title || 'lecture').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').substring(0, 30);
    return this.exportFile(`${safeTitle}.srt`, srt, 'application/x-subrip');
  }

  exportLectureVTT(lecture) {
    const segments = lecture.segments || [];
    if (!segments || segments.length === 0) {
      throw new Error('Bài giảng chưa có danh sách phụ đề.');
    }
    const formatVTTTime = (sec) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.round((sec % 1) * 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    };

    let vtt = 'WEBVTT\n\n';
    segments.forEach((seg, idx) => {
      vtt += `${idx + 1}\n`;
      vtt += `${formatVTTTime(seg.start || 0)} --> ${formatVTTTime(seg.end || 0)}\n`;
      vtt += `${seg.text || ''}\n`;
      if (seg.original_text && seg.original_text.trim() !== (seg.text || '').trim()) {
        vtt += `${seg.original_text}\n`;
      }
      vtt += '\n';
    });

    const safeTitle = (lecture.title || 'lecture').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').substring(0, 30);
    return this.exportFile(`${safeTitle}.vtt`, vtt, 'text/vtt');
  }

  exportLectureJSON(lecture) {
    const safeTitle = (lecture.title || 'lecture').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').substring(0, 30);
    const jsonContent = JSON.stringify(lecture, null, 2);
    return this.exportFile(`${safeTitle}_Data.json`, jsonContent, 'application/json');
  }

  exportLectureSummary(lecture) {
    let text = `BÀI GIẢNG: ${lecture.title || 'Không tên'}\n`;
    text += `Thời lượng: ${lecture.duration_seconds || 0} giây\n`;
    text += `Ngôn ngữ: ${(lecture.language || 'vi').toUpperCase()}\n`;
    text += `Nguồn: ${lecture.video_url || ''}\n\n`;
    text += `=====================================\n`;
    text += `TÓM TẮT NỘI DUNG BÀI HỌC (SUMMARY):\n`;
    text += `${lecture.summary || 'Chưa có tóm tắt'}\n\n`;

    if (lecture.key_points && lecture.key_points.length > 0) {
      text += `=====================================\n`;
      text += `CÁC Ý CHÍNH QUAN TRỌNG (KEY POINTS):\n`;
      lecture.key_points.forEach((kp, idx) => {
        text += `${idx + 1}. ${kp}\n`;
      });
      text += '\n';
    }

    if (lecture.formulas_and_terms && lecture.formulas_and_terms.length > 0) {
      text += `=====================================\n`;
      text += `TỪ VỰNG & THUẬT NGỮ CỐT LÕI:\n`;
      lecture.formulas_and_terms.forEach((item, idx) => {
        text += `- ${item}\n`;
      });
      text += '\n';
    }

    const safeTitle = (lecture.title || 'lecture_summary').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').substring(0, 30);
    return this.exportFile(`${safeTitle}_Summary.txt`, text, 'text/plain');
  }

  // --- Xuất Video kèm phụ đề ghi cứng (Burn/Hardsub MP4 bằng FFmpeg) ---
  async burnSubtitlesIntoVideo(mediaUrl, segments) {
    const baseUrl = await this.getBaseUrl();
    const formattedSegments = (segments || []).map((seg, idx) => ({
      id: typeof seg.id === 'number' ? seg.id : idx,
      start: Number(seg.start) || 0,
      end: Number(seg.end) || 0,
      text: String(seg.text || ''),
      original_text: seg.original_text ? String(seg.original_text) : undefined,
      translated_text: seg.translated_text ? String(seg.translated_text) : undefined,
    }));

    const response = await fetch(`${baseUrl}/api/video/burn-subtitles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_url: mediaUrl,
        segments: formattedSegments,
      }),
    });

    if (!response.ok) {
      let errMsg = `Lỗi render phụ đề vào video (${response.status})`;
      try {
        const data = await response.json();
        errMsg = data.detail || errMsg;
      } catch (_) { }
      throw new Error(errMsg);
    }

    const data = await response.json();
    if (data.media_url && data.media_access_token) {
      const separator = data.media_url.includes('?') ? '&' : '?';
      data.media_url = `${data.media_url}${separator}access_token=${encodeURIComponent(data.media_access_token)}`;
    }
    return {
      ...data,
      media_url: data.media_url && data.media_url.startsWith('http')
        ? data.media_url
        : `${baseUrl}${data.media_url || ''}`,
    };
  }
}

export const apiService = new ApiService();
export default apiService;
