document.addEventListener("DOMContentLoaded", () => {
  const btnProcessTab = document.getElementById("btnProcessTab");
  const btnToggleOverlay = document.getElementById("btnToggleOverlay");
  const statusText = document.getElementById("statusText");
  const summarySection = document.getElementById("summarySection");
  const summaryContent = document.getElementById("summaryContent");
  const targetLang = document.getElementById("targetLang");

  btnProcessTab.addEventListener("click", async () => {
    statusText.innerText = "Đang lấy URL tab hiện tại...";

    // 1. Lấy URL của tab đang active
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      statusText.innerText = "Không thể lấy URL của tab.";
      return;
    }

    statusText.innerText = "AI đang xử lý video & tạo phụ đề...";
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

  btnToggleOverlay.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_OVERLAY" });
    }
  });
});
