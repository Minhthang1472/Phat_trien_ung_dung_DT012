import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

/**
 * Bộ ánh xạ tên icon theo ngôn ngữ thiết kế (Material Symbols) sang bộ glyph
 * MaterialIcons có sẵn trong @expo/vector-icons.
 */
const ICON_MAP = {
  sparkle: 'auto-awesome',
  fire: 'local-fire-department',
  bell: 'notifications',
  link: 'link',
  video: 'smart-display',
  translate: 'translate',
  bolt: 'bolt',
  merge: 'merge',
  upload: 'upload-file',
  stats: 'query-stats',
  library: 'video-library',
  clock: 'schedule',
  quiz: 'quiz',
  history: 'history-edu',
  refresh: 'refresh',
  search: 'search',
  tag: 'sell',
  play: 'play-arrow',
  delete: 'delete-outline',
  bulb: 'lightbulb',
  folder: 'folder',
  subtitles: 'subtitles',
  summary: 'summarize',
  mic: 'mic',
  back: 'chevron-left',
  check: 'verified',
  close: 'close',
  share: 'ios-share',
  lecture: 'play-lesson',
  profile: 'account-circle',
  settings: 'settings',
  school: 'school',
  star: 'star',
  starOutline: 'star-border',
  menuBook: 'menu-book',
  lock: 'lock-outline',
  cloud: 'cloud-upload',
  storage: 'storage',
  wand: 'auto-fix-high',
  pause: 'pause',
  replay5: 'replay-5',
  forward5: 'forward-5',
  'closed-caption': 'closed-caption',
  volume: 'volume-up',
  mindmap: 'account-tree',
  plus: 'add',
  minus: 'remove',
  download: 'download',
  edit: 'edit',
  logout: 'logout',
  login: 'login',
  camera: 'photo-camera',
  person: 'person',
  trophy: 'emoji-events',
  analytics: 'insights',
  chart: 'bar-chart',
  crown: 'workspace-premium',
  arrowRight: 'arrow-forward',
  chevronRight: 'chevron-right',
  expandMore: 'expand-more',
  save: 'save',
  eye: 'visibility',
  eyeOff: 'visibility-off',
  mail: 'mail',
  key: 'key',
  verified: 'verified',
  bellActive: 'notifications-active',
  timer: 'timer',
  diamond: 'diamond',
  militaryTech: 'military-tech',
  stars: 'stars',
  psychology: 'psychology',
  trackChanges: 'track-changes',
  playCircle: 'play-circle',
  factCheck: 'fact-check',
  electricBolt: 'electric-bolt',
  manageAccounts: 'manage-accounts',
  badge: 'badge',
  smartToy: 'smart-toy',
  checkCircle: 'check-circle',
  folderOpen: 'folder-open',
  expandLess: 'expand-less',
  cameraAlt: 'camera-alt',
  chevronLeft: 'chevron-left',
  workspacePremium: 'workspace-premium',
  speed: 'speed',
  headphones: 'headphones',
  psychologyAlt: 'psychology-alt',
  hourglass: 'hourglass-empty',
  circleOutline: 'radio-button-unchecked',
  cut: 'content-cut',
  celebration: 'celebration',
  cancel: 'cancel',
  sparkle2: 'flare',
  rocket: 'rocket-launch',
  face: 'face',
};

export function resolveIconName(name) {
  return ICON_MAP[name] || name;
}

export default function Icon({ name, size = 20, color = colors.ink, style }) {
  return (
    <MaterialIcons
      name={resolveIconName(name)}
      size={size}
      color={color}
      style={style}
    />
  );
}
