import { apiService } from './api';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.callbacks = {
      onStatus: () => {},
      onCaption: () => {},
      onError: () => {},
      onClose: () => {},
    };
    this.simulating = false;
    this.simInterval = null;
  }

  async connect(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    const baseUrl = await apiService.getBaseUrl();
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/live/stream';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.callbacks.onStatus({
          type: 'status',
          connected: true,
          message: 'Đã kết nối luồng Live-Caption qua WebSocket AI!',
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'caption') {
            this.callbacks.onCaption(data);
          } else if (data.type === 'status') {
            this.callbacks.onStatus(data);
          }
        } catch (e) {
          console.warn('Lỗi phân tích WebSocket message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Lỗi kết nối WebSocket:', err);
        this.callbacks.onError(err);
      };

      this.ws.onclose = () => {
        this.callbacks.onClose();
      };
    } catch (e) {
      console.warn('Không thể mở WebSocket:', e);
      this.callbacks.onError(e);
    }
  }

  sendAudioChunk(chunkBytes) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(chunkBytes);
    }
  }

  stop() {
    this.stopSimulation();
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ action: 'stop' }));
        }
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
  }

  // Chế độ giả lập chạy thử nghiệm khi chưa bật server
  startSimulation(onCaptionCallback) {
    this.stopSimulation();
    this.simulating = true;
    const sampleSentences = [
      'Chào mừng các em sinh viên đến với tiết học ngày hôm nay.',
      'Hôm nay chúng ta sẽ tìm hiểu về Kiến trúc Mạng Nơ-ron Tích chập (CNN).',
      'Đầu tiên, hãy nhìn vào ma trận trọng số và lớp Pooling.',
      'Hàm kích hoạt ReLU giúp mô hình học được các tính phi tuyến tính.',
      'Có bạn nào trong lớp có câu hỏi về thuật toán lan truyền ngược không?',
      'Chúng ta sẽ tiếp tục phần thực hành với thư viện PyTorch ngay sau đây.',
    ];
    let index = 0;

    this.simInterval = setInterval(() => {
      if (index < sampleSentences.length) {
        onCaptionCallback({
          text: sampleSentences[index],
          language: 'vi',
          timestamp: new Date().toLocaleTimeString(),
        });
        index++;
      } else {
        index = 0;
      }
    }, 2800);
  }

  stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.simulating = false;
  }
}

export const webSocketService = new WebSocketService();
