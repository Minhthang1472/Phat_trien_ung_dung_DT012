import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_STORAGE_KEY = '@lecture_ai_study_streak';

/**
 * Định dạng ngày theo múi giờ địa phương: YYYY-MM-DD
 */
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Lấy chuỗi ngày hôm qua theo giờ địa phương
 */
function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

class StreakService {
  /**
   * Lấy và tự động cập nhật chuỗi ngày học thực tế theo lịch thiết bị
   * - Nếu truy cập liên tiếp hôm qua -> hôm nay: Tăng +1 ngày (ví dụ 1 ngày -> 2 ngày)
   * - Nếu đã mở trong ngày hôm nay: Giữ nguyên chuỗi ngày hiện tại
   * - Nếu đứt đoạn (bỏ lỡ > 1 ngày): Reset về chuỗi 1 ngày
   */
  async getOrUpdateStreak(extraActiveDays = 0) {
    try {
      const today = getLocalDateString();
      const yesterday = getYesterdayDateString();

      const raw = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
      let data = raw ? JSON.parse(raw) : null;

      let streak = 1;
      let lastDate = null;

      if (data && typeof data.streak === 'number' && data.lastDate) {
        streak = data.streak;
        lastDate = data.lastDate;

        if (lastDate === today) {
          // Đã điểm danh ngày hôm nay
          streak = Math.max(1, streak);
        } else if (lastDate === yesterday) {
          // Truy cập liên tiếp ngày hôm sau: Tăng streak!
          streak = streak + 1;
          lastDate = today;
          await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify({ streak, lastDate }));
        } else {
          // Bị ngắt quãng nhiều hơn 1 ngày: Bắt đầu chuỗi mới
          streak = 1;
          lastDate = today;
          await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify({ streak, lastDate }));
        }
      } else {
        // Lần đầu mở app: Thiết lập 1 ngày
        streak = 1;
        lastDate = today;
        await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify({ streak, lastDate }));
      }

      if (extraActiveDays > streak) {
        streak = extraActiveDays;
        await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify({ streak, lastDate: today }));
      }

      return streak;
    } catch (e) {
      console.warn('Lỗi cập nhật streak học tập:', e);
      return 1;
    }
  }

  /**
   * Đánh dấu có hoạt động học tập hôm nay
   */
  async recordActivity() {
    return await this.getOrUpdateStreak();
  }
}

export const streakService = new StreakService();

