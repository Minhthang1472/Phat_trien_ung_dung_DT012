// Bộ nhớ đệm phía trình duyệt cho kết quả bài giảng (IndexedDB).
// Script cổ điển (không phải ES module) để có thể nạp trước popup.js.
const LectureCache = (() => {
  const DB_NAME = "LectureAI_Cache";
  const DB_VERSION = 2;
  const STORE = "lectures";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "videoUrl" });
        }
      };
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  }

  async function put(videoUrl, data) {
    if (!videoUrl || !data) return false;
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ videoUrl, data, cachedAt: Date.now() });
      await txDone(tx);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function get(videoUrl, maxAgeMs = 0) {
    if (!videoUrl) return null;
    try {
      const db = await openDB();
      const record = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(videoUrl);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      if (!record) return null;
      if (maxAgeMs > 0 && Date.now() - Number(record.cachedAt || 0) > maxAgeMs) {
        await remove(videoUrl);
        return null;
      }
      return record.data || null;
    } catch (_) {
      return null;
    }
  }

  async function remove(videoUrl) {
    if (!videoUrl) return false;
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(videoUrl);
      await txDone(tx);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function clear() {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      await txDone(tx);
      return true;
    } catch (_) {
      return false;
    }
  }

  return { put, get, remove, clear };
})();

if (typeof window !== "undefined") {
  window.LectureCache = LectureCache;
}
