import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_STORAGE_KEY = '@lecture_ai_notifications_list';

class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = new Set();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (raw) {
        this.notifications = JSON.parse(raw);
      } else {
        // Thông báo chào mừng mặc định
        this.notifications = [
          {
            id: `notif_welcome_${Date.now()}`,
            title: 'Chào mừng bạn đến với EdTech AI! ✨',
            message: 'Hệ thống phiên dịch và tạo bài giảng AI tự động đã sẵn sàng phục vụ bạn.',
            type: 'info',
            icon: 'sparkle',
            timestamp: Date.now(),
            read: false,
          },
        ];
        await this._save();
      }
    } catch (e) {
      console.warn('Lỗi đọc notifications:', e);
      this.notifications = [];
    }
    this.initialized = true;
    this._notifyListeners();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    if (!this.initialized) {
      this.init().then(() => listener(this.notifications));
    } else {
      listener(this.notifications);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  _notifyListeners() {
    const list = [...this.notifications];
    this.listeners.forEach((listener) => {
      try {
        listener(list);
      } catch (err) {
        console.warn('Lỗi thông báo listener:', err);
      }
    });
  }

  async _save() {
    try {
      // Giới hạn lưu tối đa 40 thông báo gần nhất
      const trimmed = this.notifications.slice(0, 40);
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Lỗi lưu notifications:', e);
    }
  }

  async addNotification({
    title,
    message,
    type = 'info', // 'success' | 'info' | 'warning' | 'error'
    icon = 'bell', // 'sparkle' | 'trash' | 'key' | 'profile' | 'bolt' | 'check'
  }) {
    if (!this.initialized) await this.init();

    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title || 'Thông báo mới',
      message: message || '',
      type,
      icon,
      timestamp: Date.now(),
      read: false,
    };

    this.notifications = [newNotif, ...this.notifications];
    await this._save();
    this._notifyListeners();
    return newNotif;
  }

  async markAllAsRead() {
    if (!this.initialized) await this.init();
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    await this._save();
    this._notifyListeners();
  }

  async markAsRead(id) {
    if (!this.initialized) await this.init();
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    await this._save();
    this._notifyListeners();
  }

  async deleteNotification(id) {
    if (!this.initialized) await this.init();
    this.notifications = this.notifications.filter((n) => n.id !== id);
    await this._save();
    this._notifyListeners();
  }

  async clearAll() {
    this.notifications = [];
    await this._save();
    this._notifyListeners();
  }

  getUnreadCount() {
    return this.notifications.filter((n) => !n.read).length;
  }

  getAll() {
    return this.notifications;
  }
}

export const notificationService = new NotificationService();
