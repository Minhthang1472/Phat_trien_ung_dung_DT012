import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY = (v) => `lecture_cache_${v}`;
export async function saveLectureCache(videoId, data) { try { await AsyncStorage.setItem(KEY(videoId), JSON.stringify({ summary: data.summary, mindmap: data.mindmap, quiz: data.quiz, sections: data.sections, quiz_target: data.quiz_target, cachedAt: Date.now() })); } catch (_) {} }
export async function loadLectureCache(videoId) { try { const r = await AsyncStorage.getItem(KEY(videoId)); return r ? JSON.parse(r) : null; } catch (_) { return null; } }
