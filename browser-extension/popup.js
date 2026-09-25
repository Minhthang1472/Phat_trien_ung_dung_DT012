document.addEventListener("DOMContentLoaded", async () => {
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
      if (err && err.message && err.message.includes("Receiving end does not exist")) {
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
          await new Promise((r) => setTimeout(r, 120));
          return await chrome.tabs.sendMessage(tabId, message);
        } catch (injectErr) {
          console.warn("Không thể tự động tiêm script vào trang này:", injectErr);
        }
      } else {
        console.warn("Lỗi gửi tin nhắn sang tab:", err);
      }
    }
  };

  // 1. Kiểm tra trạng thái Backend AI
  const checkServerHealth = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/", { method: "GET" });
      if (res.ok) {
        statusDot.className = "status-dot online";
        statusText.innerText = "🟢 Backend AI Sẵn sàng (Port 8000)";
        return true;
      }
    } catch (_) {}
    statusDot.className = "status-dot offline";
    statusText.innerText = "🔴 Backend AI chưa bật (Khởi động port 8000)";
    return false;
  };

  await checkServerHealth();

  // 2. Lấy thông tin Tab hiện tại & trạng thái khung phụ đề
  const updateOverlayButtonState = async () => {
    if (!currentTab || !currentTab.id) return;
    try {
      const res = await safeSendMessage(currentTab.id, { action: "GET_STATUS" });
      if (res && res.status === "ok") {
        if (res.isOverlayVisible === false) {
          btnToggleOverlay.innerText = "👁️ Hiện phụ đề";
        } else {
          btnToggleOverlay.innerText = "🙈 Ẩn phụ đề";
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
      await updateOverlayButtonState();
    }
  } catch (e) {
    tabUrlText.innerText = "Không thể lấy tab.";
  }

  // Đóng/Mở mục nạp file phụ đề
  if (accordionToggle) {
    accordionToggle.addEventListener("click", () => {
      const isClosed = accordionBody.style.display === "none";
      accordionBody.style.display = isClosed ? "flex" : "none";
      accordionToggle.innerText = isClosed
        ? "📁 Nạp file phụ đề có sẵn (.srt, .vtt) ▴"
        : "📁 Nạp file phụ đề có sẵn (.srt, .vtt) ▾";
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

    // Hiển thị tóm tắt
    summaryContent.innerText = data.summary || "Đã phân tích phụ đề thành công.";

    // Hiển thị câu hỏi trắc nghiệm (nếu có)
    const quizList = data.quiz || [];
    if (quizList.length > 0) {
      quizContent.innerHTML = quizList
        .map((q, idx) => {
          const optionsHtml = (q.options || [])
            .map((opt) => `<div class="quiz-opt">${opt}</div>`)
            .join("");
          const answerText = q.correct_answer || q.answer || "A";
          return `
            <div class="quiz-card">
              <div class="quiz-q">${idx + 1}. ${q.question}</div>
              ${optionsHtml}
              <div class="quiz-ans">✓ Đáp án: ${answerText}</div>
            </div>
          `;
        })
        .join("");
    } else {
      quizContent.innerHTML = "<p style='color: #64748b;'>Không có câu hỏi ôn tập cho video này.</p>";
    }
  };

  // 3. Xử lý tạo phụ đề AI cho toàn bộ video Tab hiện tại
  btnProcessTab.addEventListener("click", async () => {
    if (!currentTab || !currentTab.url) {
      statusText.innerText = "Không tìm thấy URL của tab video.";
      return;
    }

    const isOnline = await checkServerHealth();
    if (!isOnline) {
      alert("Backend AI chưa được bật! Vui lòng khởi động server Python FastAPI ở cổng 8000 trước.");
      return;
    }

    btnProcessTab.disabled = true;
    btnProcessTab.innerText = "⏳ AI đang xử lý (Whisper + Dịch)...";
    statusText.innerText = "Đang trích xuất âm thanh & bóc tách phụ đề...";

    try {
      const response = await fetch("http://127.0.0.1:8000/api/video/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: currentTab.url,
          target_language: targetLang.value,
          include_quiz: includeQuizCheck.checked,
        }),
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
      statusText.innerText = `✅ Hoàn tất! (${segCount} câu phụ đề đồng bộ)`;

      renderResult(data);

      // Gửi sang content.js trên trang để bật hiển thị overlay
      await safeSendMessage(currentTab.id, {
        action: "LOAD_SUBTITLES",
        subtitles: data.segments,
        isBilingual: bilingualCheck.checked,
        targetLanguage: targetLang.value,
        sourceLanguage: data.detected_language || "en",
      });
    } catch (err) {
      console.error(err);
      statusText.innerText = `❌ Lỗi: ${err.message}`;
      alert(`Không thể tạo phụ đề: ${err.message}`);
    } finally {
      btnProcessTab.disabled = false;
      btnProcessTab.innerText = "⚡ Bắt đầu tạo phụ đề AI";
    }
  });

  // 4. Bật chế độ xem nhanh tức thì (Lookahead 15s)
  btnLookahead.addEventListener("click", async () => {
    if (!currentTab || !currentTab.url) return;
    statusText.innerText = "⏩ Đang tải phụ đề xem nhanh đoạn này...";
    await safeSendMessage(currentTab.id, {
      action: "START_LOOKAHEAD",
      videoUrl: currentTab.url,
      targetLanguage: targetLang.value,
      isBilingual: bilingualCheck.checked,
      sourceLanguage: "en",
    });
  });

  // 5. Ẩn / Hiện phụ đề nổi trên trang
  btnToggleOverlay.addEventListener("click", async () => {
    if (!currentTab) return;
    const res = await safeSendMessage(currentTab.id, { action: "TOGGLE_OVERLAY" });
    if (res && res.status === "ok") {
      if (res.visible) {
        btnToggleOverlay.innerText = "🙈 Ẩn phụ đề";
        statusText.innerText = "👁️ Đã hiện phụ đề trên video.";
      } else {
        btnToggleOverlay.innerText = "👁️ Hiện phụ đề";
        statusText.innerText = "🙈 Đã ẩn phụ đề khỏi video.";
      }
    }
  });

  // 6. Xử lý nạp file phụ đề có sẵn
  btnProcessSubtitle.addEventListener("click", async () => {
    const file = subtitleFile.files && subtitleFile.files[0];
    if (!file) {
      alert("Vui lòng chọn một file phụ đề .srt hoặc .vtt trước!");
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

      const response = await fetch("http://127.0.0.1:8000/api/subtitles/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      statusText.innerText = `✅ Đã nạp ${data.segments.length} dòng phụ đề!`;

      renderResult(data);

      await safeSendMessage(currentTab.id, {
        action: "LOAD_SUBTITLES",
        subtitles: data.segments,
        isBilingual: bilingualCheck.checked,
        targetLanguage: targetLang.value,
        sourceLanguage: data.detected_language || "en",
      });
    } catch (err) {
      statusText.innerText = `❌ Lỗi nạp phụ đề: ${err.message}`;
    } finally {
      btnProcessSubtitle.disabled = false;
    }
  });
});
