document.addEventListener("DOMContentLoaded", () => {
  const btnProcessTab = document.getElementById("btnProcessTab");
  const btnProcessSubtitle = document.getElementById("btnProcessSubtitle");
  const btnToggleOverlay = document.getElementById("btnToggleOverlay");
  const statusText = document.getElementById("statusText");
  const summarySection = document.getElementById("summarySection");
  const summaryContent = document.getElementById("summaryContent");
  const targetLang = document.getElementById("targetLang");
  const subtitleFile = document.getElementById("subtitleFile");
  const includeQuiz = document.getElementById("includeQuiz");

  const showResult = (tab, data) => {
    statusText.innerText = `Done! (${data.segments.length} subtitle entries)`;
    if (data.summary) {
      summarySection.style.display = "block";
      const quizPreview = (data.quiz || []).map((item, index) => `${index + 1}. ${item.question}`).join("\n\n");
      summaryContent.innerText = quizPreview ? `${data.summary}\n\nQuiz:\n${quizPreview}` : data.summary;
    }
    chrome.tabs.sendMessage(tab.id, {
      action: "LOAD_SUBTITLES",
      subtitles: data.segments
    });
  };

  btnProcessTab.addEventListener("click", async () => {
    statusText.innerText = "Đang lấy URL tab hiện tại...";

    // 1. Lấy URL của tab đang active
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      statusText.innerText = "Không thể lấy URL của tab.";
      return;
    }

    statusText.innerText = "AI đang xử lý video & tạo phụ đề...";
    chrome.tabs.sendMessage(tab.id, {
      action: "START_LOOKAHEAD",
      videoUrl: tab.url,
      targetLanguage: targetLang.value,
    });
    statusText.innerText = "Preparing a 15-second subtitle buffer...";
    return;

    btnProcessTab.disabled = true;

    try {
      // 2. Gửi request đến Backend AI Localhost
      const response = await fetch("http://127.0.0.1:8000/api/video/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: tab.url,
          target_language: targetLang.value
        })
      });

      if (!response.ok) {
        throw new Error(`Lỗi server: ${response.statusText}`);
      }

      const data = await response.json();
      statusText.innerText = `Hoàn tất! (${data.segments.length} câu phụ đề)`;
      
      // Hiển thị tóm tắt
      if (data.summary) {
        summarySection.style.display = "block";
        summaryContent.innerText = data.summary;
      }

      // 3. Gửi danh sách phụ đề sang content.js để hiển thị overlay trên video
      chrome.tabs.sendMessage(tab.id, {
        action: "LOAD_SUBTITLES",
        subtitles: data.segments
      });

    } catch (err) {
      console.error(err);
      statusText.innerText = "Lỗi kết nối Backend (Hãy bật server Python).";
    } finally {
      btnProcessTab.disabled = false;
    }
  });

  btnProcessSubtitle.addEventListener("click", async () => {
    const file = subtitleFile.files && subtitleFile.files[0];
    if (!file) {
      statusText.innerText = "Choose an .srt or .vtt subtitle file first.";
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    statusText.innerText = "Reading timestamps and translating subtitles...";
    btnProcessSubtitle.disabled = true;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("video_url", tab.url);
      formData.append("title", tab.title || file.name);
      formData.append("target_language", targetLang.value);
      formData.append("include_quiz", includeQuiz.checked ? "true" : "false");
      const response = await fetch("http://127.0.0.1:8000/api/subtitles/process", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(response.statusText);
      showResult(tab, await response.json());
    } catch (err) {
      console.error(err);
      statusText.innerText = "Could not process the subtitle file.";
    } finally {
      btnProcessSubtitle.disabled = false;
    }
  });

  btnToggleOverlay.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_OVERLAY" });
    }
  });
});
