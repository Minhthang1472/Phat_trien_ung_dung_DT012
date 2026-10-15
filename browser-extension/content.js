(() => {
  let subtitleData = [];
  let overlayContainer = null;
  let overlayBox = null;
  let activeVideo = null;
  let intervalId = null;
  let lookaheadConfig = null;
  let lookaheadLoading = false;
  let loadedUntil = 0;
  let isBilingual = true;
  let currentFontSize = 20;
  let currentSelectingLine = null;
  let isOverlayVisible = true;
  let targetLanguage = "vi";
  let sourceLanguage = "en";
  let currentAudio = null;

  // 1. Nhận diện ngôn ngữ thông minh dựa trên ký tự
  function detectLanguage(text) {
    if (!text) return targetLanguage || "vi";
    const t = text.trim();
    // Tiếng Nhật: có ký tự Hiragana / Katakana
    if (/[\u3040-\u30ff]/.test(t)) {
      return "ja";
    }
    // Tiếng Hàn: có ký tự Hangul
    if (/[\uac00-\ud7af]/.test(t)) {
      return "ko";
    }
    // Tiếng Trung: ký tự Hán tự nhưng không có Hiragana
    if (/[\u4e00-\u9fa5]/.test(t)) {
      return "zh";
    }
    // Tiếng Việt: có nguyên âm mang dấu tiếng Việt
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(t)) {
      return "vi";
    }
    // Nếu không có dấu, dựa vào ngôn ngữ nguồn của video
    return sourceLanguage || "en";
  }

  // Xác định ngôn ngữ chính xác dựa trên dòng phụ đề mà người dùng bôi đen
  function getLineLanguage(targetElement, selectedText) {
    if (targetElement) {
      if (targetElement.closest(".lecture-ai-main-sub")) {
        return targetLanguage || "vi";
      }
      if (targetElement.closest(".lecture-ai-orig-sub")) {
        return sourceLanguage || "en";
      }
    }
    return detectLanguage(selectedText);
  }

  // 2. Chức năng Text-to-Speech (TTS) chuẩn giọng bản ngữ Google Translate (Chị Google Tiếng Việt, Anh, Nhật, v.v.)
  async function speakText(text, forcedLang = null) {
    if (!text) return;
    const cleanText = text.trim();
    if (!cleanText) return;

    // Chuẩn hóa mã ngôn ngữ (vi, en, ja, ko, zh)
    let lang = (forcedLang || detectLanguage(cleanText)).toLowerCase();
    if (lang.includes("-")) lang = lang.split("-")[0];

    // Dừng âm thanh trước đó nếu đang phát
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (_) {}
      currentAudio = null;
    }
    if (typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.cancel();
    }

    // Hiệu ứng viền sáng xanh khi phát âm
    if (overlayBox) {
      overlayBox.classList.add("lecture-ai-speaking");
    }
    const stopSpeakingEffect = () => {
      if (overlayBox) overlayBox.classList.remove("lecture-ai-speaking");
    };

    // ƯU TIÊN 1: Phát âm chuẩn Google Translate TTS từ Backend AI (giọng chuẩn bản ngữ 100%, không bị giọng lai Anh)
    try {
      const ttsUrl = `http://127.0.0.1:8000/api/tts?text=${encodeURIComponent(cleanText)}&lang=${lang}`;
      const res = await fetch(ttsUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        currentAudio = new Audio(blobUrl);
        currentAudio.onended = () => {
          stopSpeakingEffect();
          URL.revokeObjectURL(blobUrl);
          currentAudio = null;
        };
        currentAudio.onerror = () => {
          stopSpeakingEffect();
          URL.revokeObjectURL(blobUrl);
          currentAudio = null;
        };
        await currentAudio.play();
        return;
      }
    } catch (err) {
      console.warn("[LectureAI] Backend TTS không khả dụng, chuyển sang giọng trình duyệt:", err);
    }

    // DỰ PHÒNG: Dùng Web Speech API của trình duyệt nếu Backend chưa bật
    if (typeof window.speechSynthesis !== "undefined") {
      const fullLangMap = {
        vi: "vi-VN",
        en: "en-US",
        ja: "ja-JP",
        ko: "ko-KR",
        zh: "zh-CN",
      };
      const fullLang = fullLangMap[lang] || `${lang}-${lang.toUpperCase()}`;
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = fullLang;
      utterance.rate = 0.95;

      utterance.onend = stopSpeakingEffect;
      utterance.onerror = stopSpeakingEffect;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) =>
        v.lang.toLowerCase().replace("_", "-").startsWith(lang)
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } else {
      stopSpeakingEffect();
    }
  }

  // Tải trước cửa sổ phụ đề 15 giây (Lookahead)
  async function loadLookahead() {
    if (!activeVideo || !lookaheadConfig || lookaheadLoading) return;
    const currentTime = activeVideo.currentTime || 0;
    if (currentTime + 15 <= loadedUntil - 2) return;

    lookaheadLoading = true;
    const startSeconds = Math.max(currentTime, loadedUntil);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/video/lookahead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: lookaheadConfig.videoUrl,
          start_seconds: startSeconds,
          window_seconds: 15,
          target_language: lookaheadConfig.targetLanguage || "vi",
        }),
      });
      if (!response.ok) throw new Error(response.statusText);
      const data = await response.json();
      const existing = new Set(subtitleData.map((item) => `${item.start}:${item.end}:${item.text}`));
      for (const segment of data.segments || []) {
        const key = `${segment.start}:${segment.end}:${segment.text}`;
        if (!existing.has(key)) subtitleData.push(segment);
      }
      subtitleData.sort((a, b) => a.start - b.start);
      loadedUntil = Math.max(loadedUntil, data.window_end || startSeconds + 15);
    } catch (error) {
      console.warn("[LectureAI] Không thể nạp trước cửa sổ phụ đề:", error);
    } finally {
      lookaheadLoading = false;
    }
  }

  // Tạo giao diện khung phụ đề nổi
  function createOverlay() {
    const existing = document.getElementById("lecture-ai-overlay-container");
    if (existing) {
      overlayContainer = existing;
      overlayBox = document.getElementById("lecture-ai-overlay-box");
      return;
    }

    overlayContainer = document.createElement("div");
    overlayContainer.id = "lecture-ai-overlay-container";

    // Thanh nút điều khiển nhanh (hiện ở góc trên)
    const controls = document.createElement("div");
    controls.className = "lecture-ai-controls";

    // 1. Nút tay cầm chuyên dụng để kéo thả di chuyển vị trí (không bị lẫn với bôi đen chữ)
    const btnDrag = document.createElement("span");
    btnDrag.className = "lecture-ai-btn lecture-ai-drag-handle";
    btnDrag.innerText = "⠿ Di chuyển";
    btnDrag.title = "Giữ chuột vào nút này để kéo di chuyển vị trí phụ đề";

    // 2. Nút phát âm to câu hiện tại
    const btnSpeak = document.createElement("span");
    btnSpeak.className = "lecture-ai-btn";
    btnSpeak.innerText = "🔊 Đọc";
    btnSpeak.title = "Bấm để nghe phát âm phụ đề (hoặc bôi đen chữ để đọc từng câu/từ chuẩn giọng)";
    btnSpeak.onclick = (e) => {
      e.stopPropagation();
      const curTime = activeVideo ? activeVideo.currentTime : 0;
      const currentSeg = subtitleData.find((seg) => curTime >= seg.start && curTime <= seg.end);
      if (currentSeg) {
        const textToSpeak = currentSeg.translated_text || currentSeg.text || "";
        speakText(textToSpeak, targetLanguage || "vi");
      } else if (overlayBox.innerText.trim()) {
        speakText(overlayBox.innerText.trim(), targetLanguage || "vi");
      }
    };

    // 3. Nút chỉnh cỡ chữ
    const btnSmaller = document.createElement("span");
    btnSmaller.className = "lecture-ai-btn";
    btnSmaller.innerText = "A-";
    btnSmaller.title = "Giảm cỡ chữ";
    btnSmaller.onclick = (e) => {
      e.stopPropagation();
      changeFontSize(-2);
    };

    const btnBigger = document.createElement("span");
    btnBigger.className = "lecture-ai-btn";
    btnBigger.innerText = "A+";
    btnBigger.title = "Tăng cỡ chữ";
    btnBigger.onclick = (e) => {
      e.stopPropagation();
      changeFontSize(2);
    };

    // 4. Nút bật/tắt song ngữ
    const btnBilingual = document.createElement("span");
    btnBilingual.className = "lecture-ai-btn";
    btnBilingual.innerText = isBilingual ? "🌐 Song ngữ: Bật" : "🌐 Song ngữ: Tắt";
    btnBilingual.title = "Bật/Tắt hiển thị song ngữ";
    btnBilingual.onclick = (e) => {
      e.stopPropagation();
      isBilingual = !isBilingual;
      btnBilingual.innerText = isBilingual ? "🌐 Song ngữ: Bật" : "🌐 Song ngữ: Tắt";
    };

    // 5. Nút ẩn phụ đề (✕)
    const btnHide = document.createElement("span");
    btnHide.className = "lecture-ai-btn";
    btnHide.innerText = "✕";
    btnHide.title = "Ẩn phụ đề (Bật lại bằng nút Ẩn/Hiện trong tiện ích)";
    btnHide.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      isOverlayVisible = false;
      if (overlayContainer) {
        overlayContainer.style.display = "none";
      }
    };

    controls.appendChild(btnDrag);
    controls.appendChild(btnSpeak);
    controls.appendChild(btnSmaller);
    controls.appendChild(btnBigger);
    controls.appendChild(btnBilingual);
    controls.appendChild(btnHide);

    overlayBox = document.createElement("div");
    overlayBox.id = "lecture-ai-overlay-box";
    overlayBox.innerText = "";

    // GHI NHẬN DÒNG BẮT ĐẦU BÔI ĐEN ĐỂ CÔ LẬP VÙNG CHỌN
    overlayBox.addEventListener("mousedown", (e) => {
      const line = e.target.closest(".lecture-ai-sub-line");
      currentSelectingLine = line;
    });

    // KHI BÔI ĐEN CHỮ: NGĂN CHẶN KHÔNG CHO VÙNG CHỌN LAN SANG DÒNG KHÁC
    document.addEventListener("selectionchange", () => {
      if (!currentSelectingLine) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

      const range = sel.getRangeAt(0);

      // Nếu vùng chọn bị lan ra khỏi dòng người dùng đang bôi đen
      if (!currentSelectingLine.contains(range.startContainer)) {
        range.setStart(currentSelectingLine.firstChild || currentSelectingLine, 0);
      }
      if (!currentSelectingLine.contains(range.endContainer)) {
        const lastNode = currentSelectingLine.lastChild || currentSelectingLine;
        const maxOffset = lastNode.nodeType === Node.TEXT_NODE ? lastNode.length : lastNode.childNodes.length;
        range.setEnd(lastNode, maxOffset);
      }
    });

    // LẮNG NGHE SỰ KIỆN KÉO CHUỘT BÔI ĐEN XONG ĐỂ PHÁT ÂM (Text-to-Speech)
    overlayBox.addEventListener("mouseup", (e) => {
      const selectedText = window.getSelection().toString().trim();
      const targetEl = currentSelectingLine || e.target;
      currentSelectingLine = null;
      if (selectedText.length > 0) {
        const lang = getLineLanguage(targetEl, selectedText);
        speakText(selectedText, lang);
      }
    });

    // Nhấp đúp chuột vào từ nào thì phát âm ngay từ đó
    overlayBox.addEventListener("dblclick", (e) => {
      const selectedText = window.getSelection().toString().trim();
      const targetEl = e.target;
      if (selectedText.length > 0) {
        const lang = getLineLanguage(targetEl, selectedText);
        speakText(selectedText, lang);
      }
    });

    overlayContainer.appendChild(controls);
    overlayContainer.appendChild(overlayBox);
    document.body.appendChild(overlayContainer);

    // Chỉ cho phép kéo thả khi nhấn vào nút tay cầm `btnDrag`
    makeDraggable(overlayContainer, btnDrag);
    setupFullscreenHandling();
  }

  function changeFontSize(delta) {
    currentFontSize = Math.max(14, Math.min(32, currentFontSize + delta));
    const mainText = overlayBox.querySelector(".lecture-ai-main-sub");
    if (mainText) {
      mainText.style.fontSize = `${currentFontSize}px`;
    }
  }

  // Tự động chuyển Overlay vào thẻ Fullscreen khi người dùng bấm Toàn màn hình
  function setupFullscreenHandling() {
    const handleFsChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl && overlayContainer) {
        fsEl.appendChild(overlayContainer);
      } else if (overlayContainer && overlayContainer.parentElement !== document.body) {
        document.body.appendChild(overlayContainer);
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
  }

  // Kéo thả phụ đề: CHỈ KÍCH HOẠT KHI NHẤN VÀO TAY CẦM btnDrag (không ảnh hưởng đến bôi đen chữ)
  function makeDraggable(container, dragHandle) {
    let isDragging = false;
    let offsetX, offsetY;

    dragHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      offsetX = e.clientX - container.getBoundingClientRect().left;
      offsetY = e.clientY - container.getBoundingClientRect().top;
      dragHandle.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      container.style.left = `${e.clientX - offsetX + container.offsetWidth / 2}px`;
      container.style.top = `${e.clientY - offsetY}px`;
      container.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        dragHandle.style.cursor = "grab";
      }
    });
  }

  function findVideo() {
    const videos = Array.from(document.querySelectorAll("video"));
    if (!videos.length) return null;
    return videos.find((v) => !v.paused && v.offsetWidth > 200) || videos[0];
  }

  function syncTick() {
    // 1. Nếu người dùng đã bấm ẩn (✕ hoặc nút Ẩn/Hiện) thì ẩn hoàn toàn, không được tự ý hiện lại
    if (!isOverlayVisible) {
      if (overlayContainer && overlayContainer.style.display !== "none") {
        overlayContainer.style.display = "none";
      }
      return;
    }

    if (!activeVideo || !document.contains(activeVideo)) {
      activeVideo = findVideo();
    }
    if (!activeVideo || !subtitleData.length || !overlayBox || !overlayContainer) return;

    const curTime = activeVideo.currentTime;
    if (lookaheadConfig) {
      loadLookahead();
    }

    // Nếu người dùng đang bôi đen chữ để tra từ thì tạm thời không ghi đè lại nội dung để tránh mất vùng chọn
    if (window.getSelection().toString().trim().length > 0) {
      return;
    }

    // Tìm câu phụ đề tương ứng với mốc thời gian hiện tại
    const matchingSeg = subtitleData.find(
      (seg) => curTime >= seg.start && curTime <= seg.end
    );

    if (matchingSeg) {
      const transText = matchingSeg.translated_text || matchingSeg.text || "";
      const origText = matchingSeg.original_text || "";

      // TÁCH BIỆT 2 DÒNG THÀNH 2 KHỐI HOÀN TOÀN ĐỘC LẬP
      let htmlContent = `<div class="lecture-ai-line-wrapper"><span class="lecture-ai-sub-line lecture-ai-main-sub" style="font-size: ${currentFontSize}px;">${transText}</span></div>`;
      if (isBilingual && origText && origText !== transText) {
        htmlContent += `<div class="lecture-ai-line-wrapper"><span class="lecture-ai-sub-line lecture-ai-orig-sub" title="Bôi đen chữ hoặc nhấp đúp để nghe phát âm">${origText}</span></div>`;
      }

      overlayBox.innerHTML = htmlContent;
      if (overlayContainer.style.display !== "block") {
        overlayContainer.style.display = "block";
      }
    } else {
      overlayBox.innerHTML = "";
      if (overlayContainer.style.display !== "none") {
        overlayContainer.style.display = "none";
      }
    }
  }

  function startSync() {
    activeVideo = findVideo();
    if (!activeVideo) {
      console.log("[LectureAI] Chưa tìm thấy thẻ <video> trên trang web.");
    }

    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(syncTick, 120);
    syncTick();
  }

  // Lắng nghe message từ popup.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "LOAD_SUBTITLES") {
      subtitleData = message.subtitles || [];
      isBilingual = message.isBilingual ?? true;
      targetLanguage = message.targetLanguage || "vi";
      sourceLanguage = message.sourceLanguage || "en";
      lookaheadConfig = null;
      isOverlayVisible = true;
      createOverlay();
      startSync();
      sendResponse({ status: "ok", count: subtitleData.length });
    } else if (message.action === "START_LOOKAHEAD") {
      subtitleData = [];
      loadedUntil = 0;
      targetLanguage = message.targetLanguage || "vi";
      sourceLanguage = message.sourceLanguage || "en";
      lookaheadConfig = {
        videoUrl: message.videoUrl,
        targetLanguage: targetLanguage,
      };
      isBilingual = message.isBilingual ?? true;
      isOverlayVisible = true;
      createOverlay();
      startSync();
      loadLookahead();
      sendResponse({ status: "ok", mode: "lookahead" });
    } else if (message.action === "TOGGLE_OVERLAY") {
      if (!overlayContainer) {
        createOverlay();
      }
      isOverlayVisible = !isOverlayVisible;
      if (!isOverlayVisible) {
        if (overlayContainer) overlayContainer.style.display = "none";
      } else {
        syncTick();
      }
      sendResponse({ status: "ok", visible: isOverlayVisible });
    } else if (message.action === "GET_STATUS") {
      sendResponse({
        status: "ok",
        isOverlayVisible: isOverlayVisible,
        subtitleCount: subtitleData.length,
      });
    }
  });
})();
