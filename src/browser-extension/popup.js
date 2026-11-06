document.addEventListener("DOMContentLoaded", async () => {
  // Escape mọi nội dung do AI sinh ra trước khi đưa vào innerHTML.
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));

  // Mã hoá token bằng AES-GCM với khoá suy ra từ device_id của chính máy này.
  const cryptoUtil = {
    async deriveKey(keyText, usages) {
      const encoder = new TextEncoder();
      const digest = await crypto.subtle.digest('SHA-256', encoder.encode(keyText));
      return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, usages);
    },
    async encrypt(text, keyText) {
      const key = await this.deriveKey(keyText, ['encrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(text)
      );
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.length);
      let binary = '';
      for (const byte of combined) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    async decrypt(text, keyText) {
      const key = await this.deriveKey(keyText, ['decrypt']);
      const combined = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      return new TextDecoder().decode(plaintext);
    }
  };
  const btnProcessTab = document.getElementById("btnProcessTab");
  const btnLookahead = document.getElementById("btnLookahead");
  const btnProcessSubtitle = document.getElementById("btnProcessSubtitle");
  const btnToggleOverlay = document.getElementById("btnToggleOverlay");
  const statusText = document.getElementById("statusText");
  const statusDot = document.getElementById("statusDot");
  const tabUrlText = document.getElementById("tabUrlText");
  const targetLang = document.getElementById("targetLang");
  const subtitleFile = document.getElementById("subtitleFile");
  const bilingualCheck = document.getElementById("bilingualCheck");
  const includeQuizCheck = document.getElementById("includeQuizCheck");

  const accordionToggle = document.getElementById("accordionToggle");
  const accordionBody = document.getElementById("accordionBody");

  const inputStartTime = document.getElementById("startTime");
  const inputEndTime = document.getElementById("endTime");
  const btnCancelProcess = document.getElementById("btnCancelProcess");
  let currentAbortController = null;
  let currentJobId = null;

  const summarySection = document.getElementById("summarySection");
  const summaryContent = document.getElementById("summaryContent");
  const quizContent = document.getElementById("quizContent");
  const tabBtnSummary = document.getElementById("tabBtnSummary");
  const tabBtnQuiz = document.getElementById("tabBtnQuiz");
  const tabContentSummary = document.getElementById("tabContentSummary");
  const tabContentQuiz = document.getElementById("tabContentQuiz");

  let currentTab = null;

  // Gửi tin nhắn an toàn sang tab: tự động tiêm content script nếu trang chưa nạp
  const safeSendMessage = async (tabId, message) => {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (err) {
      const errMsg = err?.message || "";
      if (
        errMsg.includes("Receiving end does not exist") ||
        errMsg.includes("Extension context invalidated") ||
        errMsg.includes("Could not establish connection") ||
        errMsg.includes("connection")
      ) {
        try {
          // Trang web chưa nạp content script (do mở tab trước khi cài tiện ích hoặc vừa reload tiện ích)
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"],
          });
          await chrome.scripting.insertCSS({
            target: { tabId },
            files: ["overlay.css"],
          });
          await new Promise((r) => setTimeout(r, 200));
          return await chrome.tabs.sendMessage(tabId, message);
        } catch (injectErr) {
          console.warn("Không thể tự động tiêm script vào trang này:", injectErr);
        }
      } else {
        console.warn("Lỗi gửi tin nhắn sang tab:", err);
      }
    }
  };

  let activeBackendUrl = "http://127.0.0.1:8000";

  // Hàm fetch có timeout an toàn (tránh treo giao diện popup)
  const fetchWithTimeout = async (url, options = {}, timeoutMs = 3500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  // Tự động lấy URL Server từ Firebase Firestore (Đồng bộ với Colab GPU)
  const getBackendUrl = async () => {
    try {
      const res = await fetchWithTimeout("https://firestore.googleapis.com/v1/projects/ptud-dt012/databases/(default)/documents/system_config/server", {}, 3000);
      if (res.ok) {
        const data = await res.json();
        const remoteUrl = data?.fields?.url?.stringValue;
        if (remoteUrl && (remoteUrl.startsWith("http://") || remoteUrl.startsWith("https://"))) {
          let clean = remoteUrl.trim().replace(/\/+$/, "");
          chrome.storage.local.set({ serverUrl: clean });
          return clean;
        }
      }
    } catch (_) {}

    try {
      const stored = await chrome.storage.local.get(["serverUrl"]);
      if (stored && stored.serverUrl) return stored.serverUrl;
    } catch (_) {}

    return "http://127.0.0.1:8000";
  };

  // Mỗi bản cài extension có device_id riêng -> user riêng, không dùng tài khoản chung
  const getDeviceId = async () => {
    try {
      const stored = await chrome.storage.local.get(["extension_device_id"]);
      if (stored && stored.extension_device_id) return stored.extension_device_id;
    } catch (_) {}

    const raw = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `ext_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const deviceId = String(raw).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 128);
    try {
      await chrome.storage.local.set({ extension_device_id: deviceId });
    } catch (_) {}
    return deviceId;
  };

  const saveExtensionSession = async (sessionData, deviceId) => {
    const updates = {};
    try {
      updates.extension_token = await cryptoUtil.encrypt(sessionData.token, deviceId);
    } catch (_) {
      updates.extension_token = sessionData.token;
    }
    if (sessionData.refresh_token) {
      try {
        updates.extension_refresh_token = await cryptoUtil.encrypt(sessionData.refresh_token, deviceId);
      } catch (_) {
        updates.extension_refresh_token = sessionData.refresh_token;
      }
    }
    const ttlSeconds = Number(sessionData.expires_in) || 0;
    if (ttlSeconds > 0) {
      updates.extension_token_expires_at = Date.now() + ttlSeconds * 1000;
    }
    try {
      await chrome.storage.local.set(updates);
    } catch (_) {}
  };

  const clearExtensionAuth = async () => {
    try {
      await chrome.storage.local.remove([
        "extension_token",
        "extension_refresh_token",
        "extension_token_expires_at",
      ]);
    } catch (_) {}
  };

  const decodeStoredToken = async (value, deviceId) => {
    if (!value) return null;
    if (!deviceId) return value;
    try {
      return await cryptoUtil.decrypt(value, deviceId);
    } catch (_) {
      return value;
    }
  };

  const refreshExtensionSession = async (deviceId, refreshToken) => {
    if (!refreshToken) return null;
    try {
      const serverUrl = activeBackendUrl || "http://127.0.0.1:8000";
      const res = await fetchWithTimeout(`${serverUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }, 4000);
      if (res.ok) {
        const data = await res.json();
        if (data?.token) {
          await saveExtensionSession(data, deviceId);
          return data.token;
        }
      }
      if (res.status === 401 || res.status === 403) {
        await clearExtensionAuth();
      }
    } catch (_) {}
    return null;
  };

  const getAuthToken = async (forceRefresh = false) => {
    const deviceId = await getDeviceId();
    let stored = {};
    try {
      stored = await chrome.storage.local.get([
        "extension_token",
        "extension_refresh_token",
        "extension_token_expires_at",
      ]);
    } catch (_) {}

    const token = await decodeStoredToken(stored.extension_token, deviceId);
    const expiresAt = Number(stored.extension_token_expires_at) || 0;
    // Token legacy không có mốc hết hạn được coi là cũ để xin phiên mới.
    if (!forceRefresh && token && expiresAt && Date.now() < expiresAt - 60000) {
      return token;
    }

    // Access token hết hạn: thử refresh trước khi xin phiên thiết bị mới.
    const refreshToken = await decodeStoredToken(stored.extension_refresh_token, deviceId);
    const refreshed = await refreshExtensionSession(deviceId, refreshToken);
    if (refreshed) return refreshed;

    // Xin phiên mới theo device_id. Nếu origin extension chưa nằm trong CORS,
    // preflight sẽ bị 400 ngay tại browser; sau khi backend cho phép origin này,
    // flow mới thành công và token sẽ được lưu lại để dùng cho protected APIs.
    try {
      const serverUrl = activeBackendUrl || "http://127.0.0.1:8000";
      const sessionRes = await fetchWithTimeout(`${serverUrl}/api/auth/extension-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ device_id: deviceId })
      }, 4000);
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData.token) {
          await saveExtensionSession(sessionData, deviceId);
          return sessionData.token;
        }
      }
      if (sessionRes.status === 400 || sessionRes.status === 401 || sessionRes.status === 403) {
        const detail = await sessionRes.text().catch(() => "");
        console.warn("extension session failed:", sessionRes.status, detail);
      }
    } catch (err) {
      console.warn("extension session request failed:", err);
    }
    return null;
  };

  const getAuthHeaders = async (forceRefresh = false) => {
    const token = await getAuthToken(forceRefresh);
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  // Bộ nhớ đệm IndexedDB: chỉ dùng khi cùng video + ngôn ngữ + tùy chọn quiz.
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const lectureCacheKey = (videoUrl) =>
    `${videoUrl}::${targetLang.value}::${includeQuizCheck.checked ? 1 : 0}`;
  const readLectureCache = async (videoUrl) => {
    try {
      if (!videoUrl || !window.LectureCache) return null;
      return await window.LectureCache.get(lectureCacheKey(videoUrl), CACHE_TTL_MS);
    } catch (_) {
      return null;
    }
  };
  const writeLectureCache = async (videoUrl, data) => {
    try {
      if (!videoUrl || !data || !window.LectureCache) return;
      await window.LectureCache.put(lectureCacheKey(videoUrl), data);
    } catch (_) {}
  };
  const applyLectureToTab = async (data) => {
    if (!currentTab || !data) return;
    renderResult(data);
    await safeSendMessage(currentTab.id, {
      action: "LOAD_SUBTITLES",
      subtitles: data.segments || [],
      isBilingual: bilingualCheck.checked,
      targetLanguage: targetLang.value,
      sourceLanguage: data.detected_language || "en",
      serverUrl: activeBackendUrl,
    });
    updateOverlayButtonState();
  };

  // 1. Kiểm tra trạng thái Backend AI (Bất đồng bộ)
  const checkServerHealth = async () => {
    statusText.innerText = "Đang kết nối máy chủ AI...";
    const serverUrl = await getBackendUrl();
    activeBackendUrl = serverUrl;

    try {
      const res = await fetchWithTimeout(`${serverUrl}/`, { method: "GET" }, 3000);
      if (res.ok) {
        statusDot.className = "status-dot online";
        statusText.innerText = serverUrl.includes("trycloudflare")
          ? "Máy chủ sẵn sàng · Colab GPU"
          : "Máy chủ sẵn sàng · Port 8000";
        return true;
      }
    } catch (_) {}

    if (serverUrl !== "http://127.0.0.1:8000") {
      try {
        const resLocal = await fetchWithTimeout("http://127.0.0.1:8000/", { method: "GET" }, 2000);
        if (resLocal.ok) {
          activeBackendUrl = "http://127.0.0.1:8000";
          statusDot.className = "status-dot online";
          statusText.innerText = "Máy chủ sẵn sàng · Localhost";
          return true;
        }
      } catch (_) {}
    }

    statusDot.className = "status-dot offline";
    statusText.innerText = "Máy chủ chưa bật · Khởi động Colab hoặc port 8000";
    return false;
  };

  const statusBox = document.getElementById("statusBox");
  if (statusBox) {
    statusBox.style.cursor = "pointer";
    statusBox.title = "Nhấp để làm mới kết nối máy chủ";
    statusBox.addEventListener("click", () => checkServerHealth());
  }

  // 2. LẤY THÔNG TIN TAB HIỆN TẠI NGAY LẬP TỨC (Không chờ mạng)
  const updateOverlayButtonState = async () => {
    if (!currentTab || !currentTab.id) return;
    try {
      const res = await safeSendMessage(currentTab.id, { action: "GET_STATUS" });
      if (res && res.status === "ok") {
        if (res.isOverlayVisible === false) {
          btnToggleOverlay.innerText = "Hiện phụ đề nổi";
        } else {
          btnToggleOverlay.innerText = "Ẩn phụ đề nổi";
        }
      }
    } catch (_) {}
  };

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      currentTab = tabs[0];
      tabUrlText.innerText = currentTab.url || "Không xác định";
      tabUrlText.title = currentTab.url || "";
      updateOverlayButtonState();
    }
  } catch (e) {
    tabUrlText.innerText = "Không thể lấy tab.";
  }

  // Chạy kiểm tra server ngầm (không chặn giao diện) và tự động nạp phụ đề nếu có sẵn
  checkServerHealth().then(() => {
    autoCheckExistingSubtitles();
  }).catch(() => {});

  // Đóng/Mở mục nạp file phụ đề
  if (accordionToggle) {
    accordionToggle.addEventListener("click", () => {
      const isClosed = accordionBody.style.display === "none";
      accordionBody.style.display = isClosed ? "flex" : "none";
      accordionToggle.classList.toggle("open", isClosed);
    });
  }

  // Chuyển Tab Tóm tắt / Trắc nghiệm
  tabBtnSummary.addEventListener("click", () => {
    tabBtnSummary.classList.add("active");
    tabBtnQuiz.classList.remove("active");
    tabContentSummary.style.display = "block";
    tabContentQuiz.style.display = "none";
  });

  tabBtnQuiz.addEventListener("click", () => {
    tabBtnQuiz.classList.add("active");
    tabBtnSummary.classList.remove("active");
    tabContentSummary.style.display = "none";
    tabContentQuiz.style.display = "block";
  });

  const renderResult = (data) => {
    summarySection.style.display = "flex";
    summaryContent.innerText = data.summary || "Đã phân tích phụ đề thành công.";

    const quizList = data.quiz || [];
    const sections = Array.isArray(data.sections) ? data.sections : [];

    const formatTime = (s) => {
      const t = Number(s); if (!isFinite(t) || t < 0) return "";
      return `${String(Math.floor(t/60)).padStart(2,"0")}:${String(Math.floor(t%60)).padStart(2,"0")}`;
    };

    const buildGroups = () => {
      if (sections.length === 0) {
        return quizList.length > 0 ? [{ section: null, entries: quizList.map((q, i) => ({ q, i })) }] : [];
      }
      const groups = sections.map((s) => ({ section: s, entries: [] }));
      const unassigned = [];
      quizList.forEach((q, i) => {
        let target = null;
        if (q.section_id != null) target = groups.find(g => String(g.section.id) === String(q.section_id));
        if (!target && q.section_title) target = groups.find(g => String((g.section.title||"").trim()).toLowerCase() === String(q.section_title||"").trim().toLowerCase());
        if (!target && q.timestamp_sec != null) {
          const ts = Number(q.timestamp_sec);
          target = groups.find(g => { const a = Number(g.section.start_sec||0), b = Number(g.section.end_sec||0); return ts >= a && (b <= 0 || ts <= b); });
        }
        if (target) target.entries.push({ q, i }); else unassigned.push({ q, i });
      });
      unassigned.forEach((e, p) => groups[p % groups.length].entries.push(e));
      return groups.filter(g => g.entries.length > 0);
    };

    if (quizList.length > 0) {
      const groups = buildGroups();
      quizContent.innerHTML = groups.map((g) => {
        const cards = g.entries.map(({ q, i }) => {
          const opts = (q.options || []).map(o => `<div class="quiz-opt">${escapeHtml(o)}</div>`).join("");
          return `
            <div class="quiz-card">
              <div class="quiz-q">${i + 1}. ${escapeHtml(q.question)}</div>
              ${opts}
              <div class="quiz-ans">✓ Đáp án: ${escapeHtml(q.correct_answer || q.answer || "A")}</div>
            </div>`;
        }).join("");
        if (!g.section) return cards;
        const s = g.section;
        const meta = [`${formatTime(s.start_sec)} - ${formatTime(s.end_sec)}`, `${g.entries.length} câu`].filter(Boolean).join(" • ");
        return `<div class="quiz-section"><div class="quiz-section-head"><div class="quiz-section-title">${escapeHtml(s.title || "Phần nội dung")}</div><div class="quiz-section-meta">${escapeHtml(meta)}</div></div>${cards}</div>`;
      }).join("");
    } else {
      quizContent.innerHTML = "<p style='color:#8a90a6;font-weight:500;'>Không có câu hỏi ôn tập cho video này.</p>";
    }
  };

  // Tự động kiểm tra và nạp ngay phụ đề nếu bài giảng đã có sẵn trong Firebase Cache
  const autoCheckExistingSubtitles = async () => {
    if (!currentTab || !currentTab.url || !currentTab.url.includes("watch?v=")) return;
    try {
      const statusRes = await safeSendMessage(currentTab.id, { action: "GET_STATUS" });
      if (statusRes && statusRes.status === "ok" && statusRes.subtitleCount > 0) {
        statusText.innerText = `Tab đang chạy ${statusRes.subtitleCount} câu phụ đề`;
        return;
      }

      // 1. Bộ nhớ đệm cục bộ (IndexedDB) - nạp tức thì, không cần mạng
      const cached = await readLectureCache(currentTab.url);
      if (cached && Array.isArray(cached.segments) && cached.segments.length > 0) {
        statusText.innerText = `Đã nạp ${cached.segments.length} câu phụ đề từ bộ nhớ đệm.`;
        await applyLectureToTab(cached);
        return;
      }

      const authHeaders = await getAuthHeaders();
      const infoRes = await fetchWithTimeout(`${activeBackendUrl}/api/video/info?video_url=${encodeURIComponent(currentTab.url)}`, {
        headers: { ...authHeaders }
      }, 3500);

      if (infoRes.ok) {
        const infoData = await infoRes.json();
        if (infoData.is_cached) {
          statusText.innerText = "Bài giảng đã có sẵn! Đang tự động nạp phụ đề...";
          const procRes = await fetchWithTimeout(`${activeBackendUrl}/api/video/process`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({
              video_url: currentTab.url,
              target_language: targetLang.value,
              include_quiz: includeQuizCheck.checked
            })
          }, 8000);

          if (procRes.ok) {
            const data = await procRes.json();
            const segCount = (data.segments || []).length;
            statusText.innerText = `Đã tự động nạp ${segCount} câu phụ đề & Tóm tắt!`;
            await writeLectureCache(currentTab.url, data);
            await applyLectureToTab(data);
          }
        }
      }
    } catch (_) {}
  };

  // 3. Xử lý tạo phụ đề AI cho toàn bộ video Tab hiện tại
  btnProcessTab.addEventListener("click", async () => {
    if (!currentTab || !currentTab.url) {
      statusText.innerText = "Không tìm thấy URL của tab video.";
      return;
    }

    const isOnline = await checkServerHealth();
    if (!isOnline) {
      alert("Máy chủ chưa được bật! Vui lòng khởi động server Python FastAPI ở cổng 8000 trước.");
      return;
    }

    btnProcessTab.disabled = true;
    btnProcessTab.innerText = "Đang kiểm tra video...";
    statusText.innerText = "Đang kiểm tra thời lượng bài giảng...";

    try {
      // 1. Kiểm tra nhanh thời lượng video (< 1 giây)
      let isLong = false;
      let durationSec = 0;
      try {
        const authHeaders = await getAuthHeaders();
        const infoRes = await fetch(`${activeBackendUrl}/api/video/info?video_url=${encodeURIComponent(currentTab.url)}`, {
          headers: { ...authHeaders }
        });
        if (infoRes.ok) {
          const infoData = await infoRes.json();
          durationSec = infoData.duration_seconds || 0;
          if (infoData.is_long_video && !infoData.is_cached) {
            isLong = true;
          }
        }
      } catch (_) {}

      // 2. Nếu video từ 30 phút trở lên: Tự động kích hoạt xem nhanh & song song
      if (isLong) {
        const minutes = Math.round(durationSec / 60);
        statusText.innerText = `Video dài ${minutes}p (≥ 30p): Tự động bật xem nhanh song song...`;
        await safeSendMessage(currentTab.id, {
          action: "START_LOOKAHEAD",
          videoUrl: currentTab.url,
          targetLanguage: targetLang.value,
          isBilingual: bilingualCheck.checked,
          sourceLanguage: "en",
          serverUrl: activeBackendUrl,
        });
        statusText.innerText = `Đã bật xem nhanh cho video ${minutes}p! Phụ đề đang nạp liên tục.`;
        btnProcessTab.disabled = false;
        btnProcessTab.innerText = "Bắt đầu tạo phụ đề";
        return;
      }

      btnProcessTab.style.display = "none";
      btnCancelProcess.style.display = "block";
      btnCancelProcess.disabled = false;
      btnProcessTab.innerText = "Đang xử lý bóc tách & dịch thuật...";
      statusText.innerText = "Đang trích xuất âm thanh & bóc tách phụ đề...";

      currentAbortController = new AbortController();
      currentJobId = "job_" + Math.random().toString(36).substr(2, 9);

      const startVal = parseFloat(inputStartTime.value);
      const endVal = parseFloat(inputEndTime.value);
      const payload = {
        video_url: currentTab.url,
        target_language: targetLang.value,
        include_quiz: includeQuizCheck.checked,
        job_id: currentJobId
      };
      if (!isNaN(startVal) && startVal >= 0) payload.start_time = startVal;
      if (!isNaN(endVal) && endVal > 0) payload.end_time = endVal;

      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${activeBackendUrl}/api/video/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
        signal: currentAbortController.signal
      });

      if (!response.ok) {
        let errMsg = `Lỗi HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      const segCount = (data.segments || []).length;
      statusText.innerText = `Hoàn tất! (${segCount} câu phụ đề đồng bộ)`;

      await writeLectureCache(currentTab.url, data);
      await applyLectureToTab(data);
    } catch (err) {
      console.error(err);
      if (err.name === 'AbortError') {
        statusText.innerText = "Tiến trình đã bị hủy.";
      } else {
        statusText.innerText = `Lỗi: ${err.message}`;
        alert(`Không thể tạo phụ đề: ${err.message}`);
      }
    } finally {
      btnProcessTab.style.display = "block";
      btnCancelProcess.style.display = "none";
      btnCancelProcess.innerText = "Hủy tiến trình";
      btnProcessTab.disabled = false;
      btnProcessTab.innerText = "Bắt đầu tạo phụ đề";
      currentAbortController = null;
      currentJobId = null;
    }
  });

  if (btnCancelProcess) {
    btnCancelProcess.addEventListener("click", async () => {
      if (currentAbortController) {
        currentAbortController.abort();
      }
      if (currentJobId) {
        try {
          const authHeaders = await getAuthHeaders();
          await fetch(`${activeBackendUrl}/api/video/cancel/${currentJobId}`, {
            method: "POST",
            headers: { ...authHeaders }
          });
        } catch (e) {}
      }
      btnCancelProcess.disabled = true;
      btnCancelProcess.innerText = "Đang hủy...";
      statusText.innerText = "Đã gửi yêu cầu hủy tiến trình lên máy chủ.";
    });
  }

  // 4. Bật chế độ xem nhanh tức thì (nếu có nút)
  if (btnLookahead) {
    btnLookahead.addEventListener("click", async () => {
      if (!currentTab || !currentTab.url) return;
      statusText.innerText = "Đang tải phụ đề xem nhanh đoạn này...";
      await safeSendMessage(currentTab.id, {
        action: "START_LOOKAHEAD",
        videoUrl: currentTab.url,
        targetLanguage: targetLang.value,
        isBilingual: bilingualCheck.checked,
        sourceLanguage: "en",
        serverUrl: activeBackendUrl,
      });
    });
  }

  // 5. Ẩn / Hiện phụ đề nổi trên trang
  btnToggleOverlay.addEventListener("click", async () => {
    if (!currentTab) return;
    const res = await safeSendMessage(currentTab.id, { action: "TOGGLE_OVERLAY" });
    if (res && res.status === "ok") {
      if (res.visible) {
        btnToggleOverlay.innerText = "Ẩn phụ đề nổi";
        statusText.innerText = "Đã hiện phụ đề trên video.";
      } else {
        btnToggleOverlay.innerText = "Hiện phụ đề nổi";
        statusText.innerText = "Đã ẩn phụ đề khỏi video.";
      }
    }
  });

  // 6. Xử lý nạp file phụ đề có sẵn (Giới hạn tối đa 10MB)
  btnProcessSubtitle.addEventListener("click", async () => {
    const file = subtitleFile.files && subtitleFile.files[0];
    if (!file) {
      alert("Vui lòng chọn một file phụ đề .srt hoặc .vtt trước!");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(`Dung lượng file phụ đề (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn cho phép (10MB).`);
      return;
    }
    if (!currentTab || !currentTab.url) return;

    btnProcessSubtitle.disabled = true;
    statusText.innerText = "Đang dịch thuật file phụ đề...";

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("video_url", currentTab.url);
      formData.append("title", currentTab.title || file.name);
      formData.append("target_language", targetLang.value);
      formData.append("include_quiz", includeQuizCheck.checked ? "true" : "false");

      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${activeBackendUrl}/api/subtitles/process`, {
        method: "POST",
        headers: { ...authHeaders },
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      statusText.innerText = `Đã nạp ${data.segments.length} dòng phụ đề!`;

      await writeLectureCache(currentTab.url, data);
      await applyLectureToTab(data);
    } catch (err) {
      statusText.innerText = `Lỗi nạp phụ đề: ${err.message}`;
    } finally {
      btnProcessSubtitle.disabled = false;
    }
  });

  // Download export (PDF / DOCX / MD)
  const btnExport = document.getElementById("btnExport");
  const exportFormat = document.getElementById("exportFormat");
  if (btnExport && exportFormat) {
    btnExport.addEventListener("click", async () => {
      if (!currentTab || !currentTab.url || !currentTab.url.includes("watch?v=")) {
        alert("Vui lòng mở video YouTube trước!");
        return;
      }
      try {
        statusText.innerText = "Đang tạo tài liệu...";
        const fmt = exportFormat.value;
        const headers = await getAuthHeaders();
        const res = await fetch(
          `${activeBackendUrl}/api/export?video_url=${encodeURIComponent(currentTab.url)}&format=${encodeURIComponent(fmt)}`,
          { method: "GET", headers }
        );
        if (!res.ok) {
          let detail = `Lỗi HTTP ${res.status}`;
          try {
            const errData = await res.json();
            if (errData && errData.detail) detail = errData.detail;
          } catch (_) {}
          throw new Error(detail);
        }
        const blob = await res.blob();
        // Ưu tiên tên file do server đặt (Content-Disposition) nếu được expose.
        let filename = `lecture_ai_${Date.now()}.${fmt}`;
        const disposition = res.headers.get("Content-Disposition") || "";
        const encodedName = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
        const plainName = /filename="?([^";]+)"?/i.exec(disposition);
        try {
          if (encodedName) filename = decodeURIComponent(encodedName[1]);
          else if (plainName) filename = plainName[1];
        } catch (_) {}
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        statusText.innerText = "Đã tải xuống tài liệu.";
      } catch (err) {
        alert(`Không thể tải tài liệu: ${err.message}`);
      }
    });
  }

  // Xoá toàn bộ cache bài giảng trong IndexedDB của extension.
  const btnClearCache = document.getElementById("btnClearCache");
  if (btnClearCache) {
    btnClearCache.addEventListener("click", async () => {
      if (!window.LectureCache) {
        statusText.innerText = "Bộ nhớ đệm chưa sẵn sàng.";
        return;
      }
      const ok = window.confirm(
        "Xoá toàn bộ phụ đề và tóm tắt đã lưu trên trình duyệt? Dữ liệu trên máy chủ vẫn được giữ nguyên."
      );
      if (!ok) return;
      const cleared = await window.LectureCache.clear();
      statusText.innerText = cleared
        ? "Đã xoá bộ nhớ đệm bài giảng."
        : "Không thể xoá bộ nhớ đệm.";
    });
  }
});
