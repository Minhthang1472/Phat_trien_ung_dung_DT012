export const UPLOAD_LANG_OPTIONS = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'Tiếng Anh' },
  { code: 'ja', label: 'Tiếng Nhật' },
  { code: 'zh', label: 'Tiếng Trung' },
  { code: 'ko', label: 'Tiếng Hàn' },
];

export const getLangDisplayName = (code) => {
  const found = UPLOAD_LANG_OPTIONS.find((l) => l.code === code);
  return found ? found.label : (code || '').toUpperCase();
};

// Giới hạn dung lượng file tối đa
export const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150 MB cho Video / Audio
export const MAX_SUBTITLE_SIZE = 10 * 1024 * 1024; // 10 MB cho Phụ đề

// Helper đổi thời gian dạng string (mm:ss hoặc hh:mm:ss) sang giây
export const parseTimeToSeconds = (str) => {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split(':').map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p) || p < 0)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
};

// Helper đổi giây sang định dạng mm:ss hoặc hh:mm:ss
export const formatSecondsToTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Dữ liệu mẫu bài giảng nếu chưa kết nối server
export const SAMPLE_LECTURES = [
  {
    video_url: 'https://www.youtube.com/watch?v=sample1',
    title: 'Nhập môn Trí tuệ Nhân tạo - Học máy & Mạng nơ-ron',
    duration_seconds: 2710,
    language: 'vi',
    folder: 'Trí tuệ nhân tạo',
    tags: ['Học máy', 'Machine Learning', 'Mạng nơ-ron', 'F1-Score'],
    summary:
      'Bài học tập trung vào 3 giải thuật phân lớp cơ bản, giải thích ma trận nhầm lẫn (Confusion Matrix) và cách tính F1-Score khi dữ liệu bị mất cân bằng.',
    segments: [
      { id: 0, start: 0, end: 5, text: 'Chào mừng các em sinh viên đến với môn học Trí tuệ Nhân tạo.' },
      { id: 1, start: 5, end: 12, text: 'Trong bài giảng ngày hôm nay, chúng ta sẽ tìm hiểu về mô hình Học máy có giám sát.' },
      { id: 2, start: 12, end: 20, text: 'Học máy có giám sát là phương pháp huấn luyện mô hình dựa trên tập dữ liệu đã có nhãn sẵn.' },
      { id: 3, start: 20, end: 28, text: 'Ví dụ điển hình nhất là phân loại email rác (Spam) và không phải rác.' },
      { id: 4, start: 28, end: 38, text: 'Chúng ta sử dụng mạng nơ-ron nhân tạo nhiều tầng để trích xuất đặc trưng của dữ liệu.' },
      { id: 5, start: 38, end: 48, text: 'Khi đánh giá mô hình, chỉ số F1-Score thường được ưu tiên hơn Accuracy.' },
    ],
    key_points: [
      'Học máy có giám sát (Supervised Learning) với tập dữ liệu có nhãn.',
      'Ma trận nhầm lẫn: TP (True Positive), FP, TN, FN.',
      'Precision: Tỷ lệ dự đoán đúng trong số các mẫu được dự đoán là Positive.',
      'Recall: Tỷ lệ tìm thấy các mẫu Positive thực tế.',
      'F1-Score: Trung bình điều hòa giữa Precision và Recall.',
    ],
    formulas_and_terms: [
      'F1 = 2 * (Precision * Recall) / (Precision + Recall)',
      'ReLU(x) = max(0, x)',
      'Cross-Entropy Loss',
    ],
    sections: [
      {
        id: 1,
        title: 'Học máy có giám sát',
        summary:
          'Khái niệm học máy có giám sát, dữ liệu gán nhãn và ví dụ phân loại email rác.',
        start_sec: 0,
        end_sec: 1200,
        key_points: [
          'Supervised Learning dựa trên tập dữ liệu đã có nhãn.',
          'Ứng dụng điển hình: phân loại email Spam/Not Spam.',
        ],
      },
      {
        id: 2,
        title: 'Đánh giá mô hình & F1-Score',
        summary:
          'Ma trận nhầm lẫn, Precision, Recall và lý do F1-Score phù hợp với dữ liệu mất cân bằng.',
        start_sec: 1200,
        end_sec: 2100,
        key_points: [
          'Confusion Matrix gồm TP, FP, TN, FN.',
          'F1-Score là trung bình điều hòa của Precision và Recall.',
        ],
      },
      {
        id: 3,
        title: 'Mạng nơ-ron & hàm kích hoạt',
        summary:
          'Vai trò của mạng nơ-ron nhiều tầng, hàm kích hoạt ReLU và hàm mất mát Cross-Entropy.',
        start_sec: 2100,
        end_sec: 2710,
        key_points: [
          'ReLU(x) = max(0, x) tạo tính phi tuyến.',
          'Cross-Entropy Loss đo sai lệch giữa phân phối dự đoán và nhãn thật.',
        ],
      },
    ],
    quiz_target: 5,
    quiz: [
      {
        section_id: 2,
        section_title: 'Đánh giá mô hình & F1-Score',
        timestamp_sec: 1350,
        question: 'Khi tập dữ liệu bị mất cân bằng trầm trọng (Imbalanced Data), chỉ số nào đánh giá khách quan hơn Accuracy?',
        options: ['A. Loss hàm mất mát', 'B. F1-Score', 'C. Số lượng Epoch', 'D. Learning Rate'],
        correct_answer: 'B',
        explanation: 'F1-Score là trung bình điều hòa của Precision và Recall, phản ánh chính xác hiệu quả dự đoán trên các lớp thiểu số.',
      },
      {
        section_id: 1,
        section_title: 'Học máy có giám sát',
        timestamp_sec: 420,
        question: 'Thuật toán nào sau đây thuộc nhóm Học máy có giám sát (Supervised Learning)?',
        options: ['A. K-Means Clustering', 'B. PCA', 'C. Support Vector Machine (SVM)', 'D. Autoencoder'],
        correct_answer: 'C',
        explanation: 'SVM là giải thuật phân loại và hồi quy có giám sát rất phổ biến.',
      },
      {
        section_id: 2,
        section_title: 'Đánh giá mô hình & F1-Score',
        timestamp_sec: 1500,
        question: 'Precision đo lường điều gì?',
        options: [
          'A. Tỷ lệ dự đoán đúng trong số các mẫu được mô hình dự đoán là Positive',
          'B. Tỷ lệ mẫu Positive thực tế được mô hình tìm thấy',
          'C. Tổng số mẫu trong tập dữ liệu',
          'D. Thời gian huấn luyện mô hình',
        ],
        correct_answer: 'A',
        explanation: 'Precision = TP / (TP + FP), tức trong các mẫu được dự đoán Positive có bao nhiêu mẫu thực sự Positive.',
      },
      {
        section_id: 3,
        section_title: 'Mạng nơ-ron & hàm kích hoạt',
        timestamp_sec: 2350,
        question: 'Hàm kích hoạt ReLU được định nghĩa như thế nào?',
        options: ['A. ReLU(x) = max(0, x)', 'B. ReLU(x) = x²', 'C. ReLU(x) = 1 / (1 + e⁻ˣ)', 'D. ReLU(x) = tanh(x)'],
        correct_answer: 'A',
        explanation: 'ReLU giữ nguyên giá trị dương và đưa các giá trị âm về 0, giúp mạng nơ-ron học các quan hệ phi tuyến.',
      },
      {
        section_id: 2,
        section_title: 'Đánh giá mô hình & F1-Score',
        timestamp_sec: 1700,
        question: 'Trong ma trận nhầm lẫn, FN (False Negative) là trường hợp nào?',
        options: [
          'A. Mẫu Negative được dự đoán đúng là Negative',
          'B. Mẫu Positive thực tế nhưng mô hình dự đoán thành Negative',
          'C. Mẫu Negative thực tế nhưng mô hình dự đoán thành Positive',
          'D. Mẫu Positive được dự đoán đúng là Positive',
        ],
        correct_answer: 'B',
        explanation: 'FN là mẫu thực tế Positive nhưng bị mô hình bỏ sót và dự đoán thành Negative.',
      },
    ],
    mindmap: {
      title: 'Nhập môn Trí tuệ Nhân tạo',
      children: [
        {
          title: 'Học máy có giám sát (Supervised Learning)',
          children: [
            { title: 'Tập dữ liệu huấn luyện có nhãn sẵn' },
            { title: 'Phân loại email Spam và dự báo giá nhà' },
          ],
        },
        {
          title: 'Đánh giá mô hình & Ma trận nhầm lẫn',
          children: [
            { title: 'Confusion Matrix: TP, FP, TN, FN' },
            { title: 'Chỉ số F1-Score khi dữ liệu Imbalanced' },
          ],
        },
        {
          title: 'Mạng nơ-ron nhân tạo (ANN)',
          children: [
            { title: 'Hàm kích hoạt phi tuyến ReLU' },
            { title: 'Hàm mất mát Cross-Entropy Loss' },
          ],
        },
      ],
    },
    exercises: [
      {
        question: 'Tại sao khi tập dữ liệu bị mất cân bằng (Imbalanced) lại không nên dùng Accuracy?',
        answer: 'Vì mô hình có thể dự đoán 100% về lớp chiếm đa số và đạt Accuracy rất cao nhưng hoàn toàn vô dụng trên lớp thiểu số quan trọng.',
        hint: 'Nghĩ về ví dụ bài toán phát hiện bệnh hiếm (chỉ 1% người mắc).',
      },
      {
        question: 'Công thức F1-Score được tính như thế nào từ Precision và Recall?',
        answer: 'F1 = 2 * (Precision * Recall) / (Precision + Recall), là trung bình điều hòa giữa Precision và Recall.',
        hint: 'Trung bình điều hòa của 2 chỉ số.',
      },
    ],
  },
  {
    video_url: 'https://www.youtube.com/watch?v=sample2',
    title: 'Kiến trúc Máy tính & Hệ điều hành - Tiến trình & Bộ nhớ ảo',
    duration_seconds: 3620,
    language: 'vi',
    folder: 'Hệ điều hành & Máy tính',
    tags: ['Hệ điều hành', 'Linux', 'Bộ nhớ ảo', 'Tiến trình'],
    summary:
      'Tổng quan về kiến trúc phân tầng bộ nhớ, cơ chế phân trang (Paging) và chuyển ngữ cảnh (Context Switch) giữa các Process trong Linux.',
    segments: [
      { id: 0, start: 0, end: 6, text: 'Hệ điều hành đóng vai trò là cầu nối trung gian giữa phần cứng máy tính và người dùng.' },
      { id: 1, start: 6, end: 15, text: 'Tiến trình (Process) là một chương trình đang trong quá trình thực thi.' },
      { id: 2, start: 15, end: 25, text: 'Bộ nhớ ảo (Virtual Memory) giúp giải quyết vấn đề phân mảnh và thiếu bộ nhớ RAM vật lý.' },
    ],
    key_points: [
      'Khái niệm Process và Thread.',
      'Bộ nhớ ảo và Bảng trang (Page Table).',
      'Giải thuật điều phối CPU: Round Robin, FCFS.',
      'Chuyển ngữ cảnh (Context Switch) và chi phí của nó.',
      'Hiện tượng Thrashing khi hệ thống thiếu bộ nhớ.',
    ],
    formulas_and_terms: [
      'Context Switch: Chuyển ngữ cảnh giữa các tiến trình',
      'Page Fault: Lỗi trang khi dữ liệu chưa có trong RAM',
      'Thrashing: Hệ thống tráo đổi trang liên tục',
    ],
    sections: [
      {
        id: 1,
        title: 'Tiến trình & Luồng',
        summary:
          'Khái niệm Process, Thread và cơ chế chuyển ngữ cảnh giữa các tiến trình trong hệ điều hành.',
        start_sec: 0,
        end_sec: 1200,
        key_points: [
          'Process là chương trình đang thực thi, có không gian địa chỉ riêng.',
          'Thread chia sẻ không gian bộ nhớ trong cùng một Process.',
        ],
      },
      {
        id: 2,
        title: 'Bộ nhớ ảo & Phân trang',
        summary:
          'Cách bộ nhớ ảo và bảng trang ánh xạ địa chỉ logic sang địa chỉ vật lý.',
        start_sec: 1200,
        end_sec: 2500,
        key_points: [
          'Page Table lưu ánh xạ giữa trang logic và khung vật lý.',
          'Page Fault xảy ra khi trang cần truy cập chưa nằm trong RAM.',
        ],
      },
      {
        id: 3,
        title: 'Điều phối CPU & Thrashing',
        summary:
          'Các giải thuật điều phối CPU và hiện tượng Thrashing khi bộ nhớ bị quá tải.',
        start_sec: 2500,
        end_sec: 3620,
        key_points: [
          'Round Robin và FCFS là hai giải thuật điều phối CPU phổ biến.',
          'Thrashing làm giảm mạnh hiệu năng do tráo đổi trang liên tục.',
        ],
      },
    ],
    quiz_target: 5,
    quiz: [
      {
        section_id: 1,
        section_title: 'Tiến trình & Luồng',
        timestamp_sec: 180,
        question: 'Tiến trình (Process) được định nghĩa là gì?',
        options: [
          'A. Một chương trình đang trong quá trình thực thi',
          'B. Một file dữ liệu tĩnh trên đĩa',
          'C. Một thiết bị phần cứng',
          'D. Một gói tin mạng',
        ],
        correct_answer: 'A',
        explanation: 'Process là chương trình đang thực thi, bao gồm mã lệnh, dữ liệu và trạng thái thực thi.',
      },
      {
        section_id: 1,
        section_title: 'Tiến trình & Luồng',
        timestamp_sec: 420,
        question: 'Điểm khác biệt cơ bản giữa Thread và Process là gì?',
        options: [
          'A. Thread có không gian địa chỉ riêng, Process thì không',
          'B. Các Thread trong cùng Process chia sẻ không gian bộ nhớ',
          'C. Thread không thể thực thi song song',
          'D. Process không cần CPU để chạy',
        ],
        correct_answer: 'B',
        explanation: 'Thread chia sẻ không gian bộ nhớ của Process chứa nó, nên tạo Thread rẻ hơn tạo Process.',
      },
      {
        section_id: 2,
        section_title: 'Bộ nhớ ảo & Phân trang',
        timestamp_sec: 1500,
        question: 'Bảng trang (Page Table) có chức năng gì?',
        options: [
          'A. Lưu ánh xạ giữa địa chỉ trang logic và khung vật lý',
          'B. Lưu danh sách người dùng hệ thống',
          'C. Quản lý kết nối mạng',
          'D. Ghi log sự kiện bảo mật',
        ],
        correct_answer: 'A',
        explanation: 'Page Table ánh xạ địa chỉ ảo sang địa chỉ vật lý để CPU truy cập đúng dữ liệu.',
      },
      {
        section_id: 2,
        section_title: 'Bộ nhớ ảo & Phân trang',
        timestamp_sec: 1900,
        question: 'Điều gì xảy ra khi một trang cần truy cập không có trong RAM?',
        options: [
          'A. Hệ thống khởi động lại',
          'B. Xảy ra Page Fault và OS phải nạp trang từ đĩa',
          'C. CPU tự sinh dữ liệu mới',
          'D. Tiến trình luôn bị hủy ngay lập tức',
        ],
        correct_answer: 'B',
        explanation: 'Page Fault kích hoạt việc nạp trang cần thiết từ bộ nhớ phụ vào RAM.',
      },
      {
        section_id: 3,
        section_title: 'Điều phối CPU & Thrashing',
        timestamp_sec: 2800,
        question: 'Hiện tượng Thrashing trong hệ điều hành xảy ra khi nào?',
        options: [
          'A. CPU bị quá nhiệt',
          'B. Hệ thống dành hầu hết thời gian để tráo đổi trang (Page Swapping)',
          'C. Tràn bộ đệm đĩa cứng',
          'D. Đứt kết nối mạng',
        ],
        correct_answer: 'B',
        explanation: 'Thrashing xảy ra khi tỷ lệ lỗi trang quá cao, khiến OS liên tục nạp/xóa trang bộ nhớ.',
      },
    ],
    mindmap: {
      title: 'Kiến trúc Hệ điều hành',
      children: [
        {
          title: 'Tiến trình (Process) & Luồng (Thread)',
          children: [
            { title: 'Chuyển ngữ cảnh (Context Switch)' },
            { title: 'Không gian địa chỉ và luồng thực thi' },
          ],
        },
        {
          title: 'Bộ nhớ ảo & Phân trang',
          children: [
            { title: 'Bảng trang (Page Table)' },
            { title: 'Lỗi trang (Page Fault) và hiện tượng Thrashing' },
          ],
        },
      ],
    },
    exercises: [
      {
        question: 'Phân biệt sự khác nhau cơ bản giữa Process và Thread?',
        answer: 'Process sở hữu không gian địa chỉ bộ nhớ độc lập, trong khi các Thread trong cùng một Process chia sẻ chung không gian bộ nhớ đó.',
        hint: 'Liên quan đến việc chia sẻ bộ nhớ và chi phí tạo lập.',
      },
    ],
  },
];

// Hàm tự động gắn thẻ & phân loại thông minh cho bài giảng chưa có nhãn
export function ensureAiClassification(lecture) {
  if (!lecture) return lecture;
  let folder = lecture.folder || lecture.full_data?.folder;
  let rawTags = lecture.tags || lecture.full_data?.tags;
  let tags = Array.isArray(rawTags) ? [...rawTags] : [];

  if (tags.length === 0) {
    const title = lecture.title || '';
    const summary = lecture.summary || '';
    const combined = (title + ' ' + summary).toLowerCase();
    const autoTags = [];

    if (combined.includes('trí tuệ nhân tạo') || combined.includes('ai') || combined.includes('machine learning') || combined.includes('học máy')) {
      autoTags.push('Trí tuệ nhân tạo', 'Machine Learning');
      if (!folder) folder = 'Trí tuệ nhân tạo';
    }
    if (combined.includes('python') || combined.includes('lập trình') || combined.includes('code') || combined.includes('javascript') || combined.includes('java')) {
      autoTags.push('Lập trình', 'Khoa học máy tính');
      if (!folder) folder = 'Lập trình & CNTT';
    }
    if (combined.includes('toán') || combined.includes('giải tích') || combined.includes('đại số') || combined.includes('xác suất')) {
      autoTags.push('Toán học', 'Khoa học cơ bản');
      if (!folder) folder = 'Toán học';
    }
    if (combined.includes('hệ điều hành') || combined.includes('máy tính') || combined.includes('mạng') || combined.includes('linux')) {
      autoTags.push('Hệ điều hành', 'Phần cứng & Mạng');
      if (!folder) folder = 'Hệ điều hành & Máy tính';
    }
    if (combined.includes('kinh tế') || combined.includes('tài chính') || combined.includes('quản trị')) {
      autoTags.push('Kinh tế', 'Quản trị');
      if (!folder) folder = 'Kinh tế & Quản trị';
    }
    if (autoTags.length === 0) {
      const words = title
        .split(/[\s,–—\-:]+/)
        .filter((w) => w.length > 3 && !['video', 'bài', 'giảng', 'nhập', 'môn', 'tổng', 'quan'].includes(w.toLowerCase()));
      if (words.length > 0) {
        autoTags.push(...words.slice(0, 3));
      } else {
        autoTags.push('Bài giảng', 'Video học tập');
      }
    }
    tags = autoTags;
  }

  if (!folder) {
    folder = tags[0] || 'Bài giảng chung';
  }

  return {
    ...lecture,
    folder,
    tags,
  };
}
