(() => {
  let subtitleData = [];
  let overlayContainer = null;
  let overlayBox = null;
  let activeVideo = null;
  let intervalId = null;

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
      createOverlay();
      startSync();
      sendResponse({ status: "ok", count: subtitleData.length });
    } else if (message.action === "TOGGLE_OVERLAY") {
      if (overlayContainer) {
        const isHidden = overlayContainer.style.display === "none";
        overlayContainer.style.display = isHidden ? "block" : "none";
      }
    }
  });
})();
