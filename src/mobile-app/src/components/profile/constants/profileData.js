// Bộ sưu tập Avatar 3D & Minh họa sinh động cao cấp phong cách EdTech AI
export const PRESET_AVATARS = [
  {
    id: 'ai_bot',
    url: 'https://api.dicebear.com/9.x/bottts-neutral/png?seed=EdTechBot&backgroundColor=d1d4f9',
    label: 'AI Trợ Lý',
    tag: 'AI',
  },
  {
    id: 'student_m',
    url: 'https://api.dicebear.com/9.x/adventurer/png?seed=Felix&backgroundColor=ffd5dc',
    label: 'Nam Sinh',
    tag: 'Học viên',
  },
  {
    id: 'student_f',
    url: 'https://api.dicebear.com/9.x/adventurer/png?seed=Aneka&backgroundColor=d1d4f9',
    label: 'Nữ Sinh',
    tag: 'Học viên',
  },
  {
    id: 'scholar_leo',
    url: 'https://api.dicebear.com/9.x/adventurer/png?seed=Leo&backgroundColor=b6e3f4',
    label: 'Thủ Khoa',
    tag: 'Xuất sắc',
  },
  {
    id: 'cosmo_bot',
    url: 'https://api.dicebear.com/9.x/bottts-neutral/png?seed=Cosmo&backgroundColor=ffd5dc',
    label: 'AI Robot',
    tag: 'AI',
  },
  {
    id: 'creative_lilly',
    url: 'https://api.dicebear.com/9.x/adventurer/png?seed=Lilly&backgroundColor=ffdfbf',
    label: 'Sáng Tạo',
    tag: 'Năng động',
  },
  {
    id: 'scientist_sophia',
    url: 'https://api.dicebear.com/9.x/notionists/png?seed=Sophia&backgroundColor=d8b4e2',
    label: 'Bác Học',
    tag: 'Nghiên cứu',
  },
  {
    id: 'polyglot_milo',
    url: 'https://api.dicebear.com/9.x/adventurer/png?seed=Milo&backgroundColor=c0aede',
    label: 'Ngoại Ngữ',
    tag: 'Đa ngữ',
  },
  {
    id: 'tutor_spark',
    url: 'https://api.dicebear.com/9.x/bottts-neutral/png?seed=Spark&backgroundColor=ffeaa7',
    label: 'Gia Sư AI',
    tag: 'AI',
  },
  {
    id: 'prof_alex',
    url: 'https://api.dicebear.com/9.x/notionists/png?seed=Alexander&backgroundColor=e1d3c1',
    label: 'Giáo Sư',
    tag: 'Uyên bác',
  },
  {
    id: 'polyglot_zoe',
    url: 'https://api.dicebear.com/9.x/adventurer/png?seed=Zoe&backgroundColor=c1f0c1',
    label: 'Siêu Cấp',
    tag: 'Đột phá',
  },
  {
    id: 'achiever_lucas',
    url: 'https://api.dicebear.com/9.x/notionists/png?seed=Lucas&backgroundColor=fab1a0',
    label: 'Bứt Phá',
    tag: 'Tiến bộ',
  },
];

const LEGACY_AVATAR_MAP = {
  'grad_cap': 'https://api.dicebear.com/9.x/adventurer/png?seed=Felix&backgroundColor=ffd5dc',
  'school': 'https://api.dicebear.com/9.x/adventurer/png?seed=Felix&backgroundColor=ffd5dc',
  'student_m': 'https://api.dicebear.com/9.x/adventurer/png?seed=Felix&backgroundColor=ffd5dc',
  'person': 'https://api.dicebear.com/9.x/adventurer/png?seed=Felix&backgroundColor=ffd5dc',
  'student_f': 'https://api.dicebear.com/9.x/adventurer/png?seed=Aneka&backgroundColor=d1d4f9',
  'face': 'https://api.dicebear.com/9.x/adventurer/png?seed=Aneka&backgroundColor=d1d4f9',
  'ai_bot': 'https://api.dicebear.com/9.x/bottts-neutral/png?seed=EdTechBot&backgroundColor=d1d4f9',
  'smartToy': 'https://api.dicebear.com/9.x/bottts-neutral/png?seed=EdTechBot&backgroundColor=d1d4f9',
  'owl': 'https://api.dicebear.com/9.x/notionists/png?seed=Alexander&backgroundColor=e1d3c1',
  'menuBook': 'https://api.dicebear.com/9.x/notionists/png?seed=Alexander&backgroundColor=e1d3c1',
  'rocket': 'https://api.dicebear.com/9.x/adventurer/png?seed=Leo&backgroundColor=b6e3f4',
  'lightbulb': 'https://api.dicebear.com/9.x/adventurer/png?seed=Lilly&backgroundColor=ffdfbf',
  'bulb': 'https://api.dicebear.com/9.x/adventurer/png?seed=Lilly&backgroundColor=ffdfbf',
  'fire': 'https://api.dicebear.com/9.x/notionists/png?seed=Lucas&backgroundColor=fab1a0',
  'lion': 'https://api.dicebear.com/9.x/adventurer/png?seed=Milo&backgroundColor=c0aede',
  'pets': 'https://api.dicebear.com/9.x/adventurer/png?seed=Milo&backgroundColor=c0aede',
  'fox': 'https://api.dicebear.com/9.x/notionists/png?seed=Sophia&backgroundColor=d8b4e2',
  'psychologyAlt': 'https://api.dicebear.com/9.x/notionists/png?seed=Sophia&backgroundColor=d8b4e2',
  'gem': 'https://api.dicebear.com/9.x/adventurer/png?seed=Zoe&backgroundColor=c1f0c1',
  'diamond': 'https://api.dicebear.com/9.x/adventurer/png?seed=Zoe&backgroundColor=c1f0c1',
  'star': 'https://api.dicebear.com/9.x/bottts-neutral/png?seed=Spark&backgroundColor=ffeaa7',
  '🎓': 'https://api.dicebear.com/9.x/adventurer/png?seed=Felix&backgroundColor=ffd5dc',
  '👨‍🎓': 'https://api.dicebear.com/9.x/adventurer/png?seed=Felix&backgroundColor=ffd5dc',
  '👩‍🎓': 'https://api.dicebear.com/9.x/adventurer/png?seed=Aneka&backgroundColor=d1d4f9',
  '🤖': 'https://api.dicebear.com/9.x/bottts-neutral/png?seed=EdTechBot&backgroundColor=d1d4f9',
  '🦉': 'https://api.dicebear.com/9.x/notionists/png?seed=Alexander&backgroundColor=e1d3c1',
  '🚀': 'https://api.dicebear.com/9.x/adventurer/png?seed=Leo&backgroundColor=b6e3f4',
  '💡': 'https://api.dicebear.com/9.x/adventurer/png?seed=Lilly&backgroundColor=ffdfbf',
  '🔥': 'https://api.dicebear.com/9.x/notionists/png?seed=Lucas&backgroundColor=fab1a0',
  '🦁': 'https://api.dicebear.com/9.x/adventurer/png?seed=Milo&backgroundColor=c0aede',
  '🦊': 'https://api.dicebear.com/9.x/notionists/png?seed=Sophia&backgroundColor=d8b4e2',
  '💎': 'https://api.dicebear.com/9.x/adventurer/png?seed=Zoe&backgroundColor=c1f0c1',
  '⭐': 'https://api.dicebear.com/9.x/bottts-neutral/png?seed=Spark&backgroundColor=ffeaa7',
};

export const resolveAvatarUrl = (value) => {
  if (!value) return null;
  if (
    value.startsWith('http') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('file:') ||
    value.startsWith('content:')
  ) {
    return value;
  }
  return LEGACY_AVATAR_MAP[value] || null;
};

export const resolveAvatarIcon = (value) => {
  if (!value) return null;
  return resolveAvatarUrl(value) || value;
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
    id: 'trainee',
    tier: 2,
    name: 'Học Viên Tập Sự',
    shortName: 'Tập Sự',
    icon: 'menuBook',
    minExp: 300,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    desc: 'Hoàn thành bài giảng đầu tiên và làm quen hệ thống',
  },
  {
    id: 'silver',
    tier: 3,
    name: 'Học Viên Chuyên Cần',
    shortName: 'Chuyên Cần',
    icon: 'workspacePremium',
    minExp: 800,
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    desc: 'Chăm chỉ tích lũy kiến thức qua nhiều bài giảng',
  },
  {
    id: 'gold',
    tier: 4,
    name: 'Học Giả Tích Cực',
    shortName: 'Học Giả',
    icon: 'stars',
    minExp: 1800,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    desc: 'Chủ động ôn luyện trắc nghiệm và đào sâu kiến thức',
  },
  {
    id: 'diamond',
    tier: 5,
    name: 'Tinh Anh Tri Thức',
    shortName: 'Tinh Anh',
    icon: 'diamond',
    minExp: 3500,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    desc: 'Kiến thức vững vàng, phản xạ ngôn ngữ nhạy bén',
  },
  {
    id: 'expert',
    tier: 6,
    name: 'Cao Thủ Học Thuật',
    shortName: 'Cao Thủ',
    icon: 'militaryTech',
    minExp: 6000,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    desc: 'Chinh phục bài giảng nâng cao và thuật ngữ chuyên sâu',
  },
  {
    id: 'master',
    tier: 7,
    name: 'Bậc Thầy Thông Thái',
    shortName: 'Bậc Thầy',
    icon: 'trophy',
    minExp: 10000,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    desc: 'Làm chủ phương pháp học đa ngôn ngữ đỉnh cao',
  },
  {
    id: 'legend',
    tier: 8,
    name: 'Huyền Thoại Tri Thức',
    shortName: 'Huyền Thoại',
    icon: 'crown',
    minExp: 20000,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    desc: 'Đỉnh cao học giả, hoàn thiện toàn diện mọi kỹ năng',
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
