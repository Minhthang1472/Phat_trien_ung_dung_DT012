// Cấu hình Expo động: giữ nguyên app.json nhưng bổ sung EAS projectId, owner
// và OTA updates từ biến môi trường để không hardcode ID dự án vào repo.
//
//   EAS_PROJECT_ID=<uuid>      (lấy từ `eas init` hoặc expo.dev)
//   EXPO_OWNER=<tài khoản>     (tùy chọn, khi dùng organization)
//
// Khi thiếu EAS_PROJECT_ID, app vẫn chạy bình thường ở development; `eas build`
// sẽ yêu cầu liên kết dự án một lần.
const baseExpo = require('./app.json').expo;

module.exports = ({ config } = {}) => {
  const base = { ...(config || baseExpo) };
  const projectId = process.env.EAS_PROJECT_ID || base.extra?.eas?.projectId || '';
  const owner = process.env.EXPO_OWNER || base.owner || '';

  const extra = { ...(base.extra || {}) };
  if (projectId) {
    extra.eas = { ...(extra.eas || {}), projectId };
  }

  return {
    ...base,
    ...(owner ? { owner } : {}),
    ...(projectId
      ? {
          updates: {
            ...(base.updates || {}),
            url: base.updates?.url || `https://u.expo.dev/${projectId}`,
          },
          runtimeVersion: base.runtimeVersion || { policy: 'appVersion' },
        }
      : {}),
    extra,
  };
};
