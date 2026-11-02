import AsyncStorage from '@react-native-async-storage/async-storage';

// Khóa cache tách biệt với lịch sử bài giảng để có thể dọn riêng.
const PREFIX = 'lecture_cache_';
const KEY = (videoId) => `${PREFIX}${videoId}`;

export async function saveLectureCache(videoId, data) {
  if (!videoId || !data) return false;
  try {
    await AsyncStorage.setItem(
      KEY(videoId),
      JSON.stringify({
        summary: data.summary,
        mindmap: data.mindmap,
        quiz: data.quiz,
        sections: data.sections,
        quiz_target: data.quiz_target,
        key_points: data.key_points,
        formulas_and_terms: data.formulas_and_terms,
        exercises: data.exercises,
        cachedAt: Date.now(),
      })
    );
    return true;
  } catch (_) {
    return false;
  }
}

export async function loadLectureCache(videoId) {
  if (!videoId) return null;
  try {
    const r = await AsyncStorage.getItem(KEY(videoId));
    return r ? JSON.parse(r) : null;
  } catch (_) {
    return null;
  }
}

export async function removeLectureCache(videoId) {
  if (!videoId) return false;
  try {
    await AsyncStorage.removeItem(KEY(videoId));
    return true;
  } catch (_) {
    return false;
  }
}

// Xoá toàn bộ cache bài giảng; trả về số bản ghi đã xoá.
export async function clearLectureCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = (keys || []).filter((key) => key.startsWith(PREFIX));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
    return cacheKeys.length;
  } catch (_) {
    return 0;
  }
}
