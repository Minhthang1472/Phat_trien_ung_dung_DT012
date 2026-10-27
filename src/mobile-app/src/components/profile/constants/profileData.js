// Bộ sưu tập Avatar dùng icon Material (thay emoji để đồng bộ design system)
export const PRESET_AVATARS = [
  { id: 'grad_cap', icon: 'school', label: 'Cử nhân' },
  { id: 'student_m', icon: 'person', label: 'Sinh viên' },
  { id: 'student_f', icon: 'face', label: 'Nữ sinh' },
  { id: 'ai_bot', icon: 'smartToy', label: 'AI Bot' },
  { id: 'owl', icon: 'menuBook', label: 'Uyên bác' },
  { id: 'rocket', icon: 'rocket', label: 'Bứt phá' },
  { id: 'lightbulb', icon: 'bulb', label: 'Sáng tạo' },
  { id: 'fire', icon: 'fire', label: 'Nhiệt huyết' },
  { id: 'lion', icon: 'pets', label: 'Dũng mãnh' },
  { id: 'fox', icon: 'psychologyAlt', label: 'Thông thái' },
  { id: 'gem', icon: 'diamond', label: 'Tinh anh' },
  { id: 'star', icon: 'star', label: 'Ngôi sao' },
];

// Tương thích ngược: avatar đã lưu trước đây là emoji → ánh xạ sang icon Material
const LEGACY_AVATAR_ICONS = {
  '🎓': 'school',
  '👨‍🎓': 'person',
  '👩‍🎓': 'face',
  '🤖': 'smartToy',
  '🦉': 'menuBook',
  '🚀': 'rocket',
  '💡': 'bulb',
  '🔥': 'fire',
  '🦁': 'pets',
  '🦊': 'psychologyAlt',
  '💎': 'diamond',
  '⭐': 'star',
};

export const resolveAvatarIcon = (value) => {
  if (!value) return null;
  return LEGACY_AVATAR_ICONS[value] || value;
};

// Cấu hình Hệ thống Phân bố Cấp bậc & Thăng hạng học viên
export const RANKS = [
  {
    id: 'bronze',
    tier: 1,
    name: 'Tân Binh Khởi Đầu',
    shortName: 'Tân Binh',
    icon: 'school',
    minExp: 0,
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    desc: 'Bắt đầu hành trình tiếp thu tri thức mới',
  },
  {
    id: 'silver',
    tier: 2,
    name: 'Học Viên Chuyên Cần',
    shortName: 'Chuyên Cần',
    icon: 'workspacePremium',
    minExp: 150,
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    desc: 'Nắm vững kiến thức qua nhiều bài học',
  },
  {
    id: 'gold',
    tier: 3,
    name: 'Học Giả Tích Cực',
    shortName: 'Tích Cực',
    icon: 'stars',
    minExp: 400,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    desc: 'Luyện tập câu hỏi và ôn thi thường xuyên',
  },
  {
    id: 'diamond',
    tier: 4,
    name: 'Tinh Anh Kim Cương',
    shortName: 'Kim Cương',
    icon: 'diamond',
    minExp: 800,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    desc: 'Kiến thức vững vàng, phản xạ xuất sắc',
  },
  {
    id: 'master',
    tier: 5,
    name: 'Huyền Thoại Tri Thức',
    shortName: 'Huyền Thoại',
    icon: 'crown',
    minExp: 1500,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    desc: 'Đỉnh cao học giả, hoàn thiện toàn diện',
  },
];

export const getRankDetails = (exp = 0) => {
  let currentIdx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (exp >= RANKS[i].minExp) {
      currentIdx = i;
      break;
    }
  }
  const current = RANKS[currentIdx];
  const next = RANKS[currentIdx + 1] || null;

  let progressPercent = 100;
  let expNeeded = 0;

  if (next) {
    const tierExp = exp - current.minExp;
    const tierTarget = next.minExp - current.minExp;
    progressPercent = Math.min(100, Math.max(0, Math.round((tierExp / tierTarget) * 100)));
    expNeeded = Math.max(0, next.minExp - exp);
  }

  return { current, next, currentIdx, progressPercent, expNeeded, totalExp: exp };
};
