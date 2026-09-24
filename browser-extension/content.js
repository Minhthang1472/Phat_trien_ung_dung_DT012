(() => {
  let subtitleData = [];
  let overlayContainer = null;
  let overlayBox = null;
  let activeVideo = null;
  let intervalId = null;
  let lookaheadConfig = null;
  let lookaheadLoading = false;
  let loadedUntil = 0;

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
          target_language: lookaheadConfig.targetLanguage,
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
      console.warn("[LectureAI] Could not prefetch subtitle window:", error);
    } finally {
      lookaheadLoading = false;
    }
  }

  function createOverlay() {
    if (document.getElementById("lecture-ai-overlay-container")) return;

    overlayContainer = document.createElement("div");
    overlayContainer.id = "lecture-ai-overlay-container";

    overlayBox = document.createElement("div");
    overlayBox.id = "lecture-ai-overlay-box";
    overlayBox.innerText = "";

    overlayContainer.appendChild(overlayBox);
    document.body.appendChild(overlayContainer);

    // Kéo thả phụ đề
    makeDraggable(overlayContainer);
  }

  function makeDraggable(el) {
    let isDragging = false;
    let offsetX, offsetY;

    el.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - el.getBoundingClientRect().left;
      offsetY = e.clientY - el.getBoundingClientRect().top;
      el.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      el.style.left = `${e.clientX - offsetX + el.offsetWidth / 2}px`;
      el.style.top = `${e.clientY - offsetY}px`;
      el.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      el.style.cursor = "grab";
    });
  }

  function startSync() {
    activeVideo = document.querySelector("video");
    if (!activeVideo) {
      console.log("[LectureAI] Chưa tìm thấy thẻ <video> trên trang.");
      return;
    }

    if (intervalId) clearInterval(intervalId);

    intervalId = setInterval(() => {
      if (!activeVideo || !subtitleData.length) return;
      const curTime = activeVideo.currentTime;
      loadLookahead();

      // Tìm câu phụ đề tương ứng với mốc thời gian hiện tại
      const matchingSeg = subtitleData.find(
        (seg) => curTime >= seg.start && curTime <= seg.end
      );

      if (matchingSeg) {
        overlayBox.innerText = matchingSeg.text;
        overlayBox.style.display = "block";
      } else {
        overlayBox.innerText = "";
        overlayBox.style.display = "none";
      }
    }, 150);
  }

  // Lắng nghe message từ popup.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "LOAD_SUBTITLES") {
      subtitleData = message.subtitles;
      lookaheadConfig = null;
      createOverlay();
      startSync();
      sendResponse({ status: "ok", count: subtitleData.length });
    } else if (message.action === "START_LOOKAHEAD") {
      subtitleData = [];
      loadedUntil = 0;
      lookaheadConfig = {
        videoUrl: message.videoUrl,
        targetLanguage: message.targetLanguage || "vi",
      };
      createOverlay();
      startSync();
      loadLookahead();
      sendResponse({ status: "ok", mode: "lookahead" });
    } else if (message.action === "TOGGLE_OVERLAY") {
      if (overlayContainer) {
        const isHidden = overlayContainer.style.display === "none";
        overlayContainer.style.display = isHidden ? "block" : "none";
      }
    }
  });
})();
