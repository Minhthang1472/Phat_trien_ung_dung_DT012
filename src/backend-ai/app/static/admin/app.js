"use strict";

const TOKEN_KEY = "lecture-ai-admin-token";
const REFRESH_KEY = "lecture-ai-admin-refresh-seconds";
const DEFAULT_REFRESH_SECONDS = 15;

const state = {
  token: sessionStorage.getItem(TOKEN_KEY) || "",
  refreshSeconds: Number(localStorage.getItem(REFRESH_KEY)) || DEFAULT_REFRESH_SECONDS,
  timer: null,
  loading: false,
};

const numberFormatter = new Intl.NumberFormat("vi-VN");

function byId(id) {
  return document.getElementById(id);
}

function formatNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? numberFormatter.format(value)
    : "—";
}

function formatBytes(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function formatTime(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  let date;
  if (typeof value === "number") {
    date = new Date(value * 1000);
  } else if (typeof value === "string") {
    date = new Date(value);
  } else if (typeof value.toDate === "function") {
    date = value.toDate();
  } else if (typeof value.seconds === "number") {
    date = new Date(value.seconds * 1000);
  } else {
    return "—";
  }
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("vi-VN");
}

const STATUS_LABELS = {
  processing: "Đang xử lý",
  queued: "Đang chờ",
  pending: "Đang chờ",
  completed: "Hoàn thành",
  failed: "Thất bại",
  cancelled: "Đã huỷ",
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "Không rõ";
}

function showNotice(message, kind) {
  const notice = byId("notice");
  notice.textContent = message;
  notice.className = `notice${kind ? ` ${kind}` : ""}`;
  notice.hidden = false;
}

function hideNotice() {
  byId("notice").hidden = true;
}

function showLogin(message) {
  stopAutoRefresh();
  byId("dashboard-view").hidden = true;
  byId("login-view").hidden = false;
  byId("login-error").textContent = message || "";
  byId("token-input").focus();
}

function showDashboard() {
  byId("login-view").hidden = true;
  byId("dashboard-view").hidden = false;
}

async function apiRequest(path, options) {
  const config = Object.assign({ method: "GET" }, options || {});
  config.headers = Object.assign(
    { "X-Admin-Token": state.token },
    config.headers || {},
  );
  const response = await fetch(path, config);
  if (response.status === 401) {
    const error = new Error("Phiên quản trị không hợp lệ hoặc đã hết hạn.");
    error.unauthorized = true;
    throw error;
  }
  if (response.status === 429) {
    throw new Error("Quá nhiều yêu cầu. Vui lòng giảm tần suất làm mới.");
  }
  if (!response.ok) {
    let detail = `Yêu cầu thất bại (${response.status}).`;
    try {
      const body = await response.json();
      if (body && body.detail) {
        detail = body.detail;
      }
    } catch (_error) {
      // Giữ thông báo mặc định khi response không phải JSON.
    }
    throw new Error(detail);
  }
  return response.json();
}

function setText(id, text) {
  byId(id).textContent = text;
}

function renderQueue(queue) {
  const data = queue || {};
  setText("stat-queue", formatNumber(data.pending));
  setText(
    "stat-worker",
    data.worker_alive ? "Worker đang hoạt động" : "Worker chưa hoạt động",
  );
  setText("queue-pending", formatNumber(data.pending));
  setText("queue-processing", formatNumber(data.processing));
  setText("queue-completed", formatNumber(data.completed));
  setText("queue-failed", formatNumber(data.failed));
  setText("queue-cancelled", formatNumber(data.cancelled));

  const backend = byId("queue-backend");
  if (data.available === false) {
    backend.textContent = "Không kết nối được";
    backend.className = "badge bad";
  } else if (data.backend === "redis") {
    backend.textContent = data.worker_alive ? "Redis · worker online" : "Redis · thiếu worker";
    backend.className = `badge ${data.worker_alive ? "ok" : "bad"}`;
  } else {
    backend.textContent = "In-memory (một tiến trình)";
    backend.className = "badge ok";
  }
}

function renderStats(data) {
  setText("stat-users", formatNumber(data.users ? data.users.total : null));
  setText(
    "stat-deleted",
    `Đang xoá mềm: ${formatNumber(data.users ? data.users.deleted : null)}`,
  );
  setText("stat-lectures", formatNumber(data.lectures));
  setText("stat-media", formatNumber(data.media_owners));

  const storage = data.storage || {};
  setText("stat-storage", formatBytes(storage.bytes));
  setText("stat-storage-files", `${formatNumber(storage.files)} file`);

  renderQueue(data.queue);
}

function renderJobs(jobs) {
  const body = byId("jobs-body");
  body.replaceChildren();
  if (!Array.isArray(jobs) || jobs.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty";
    cell.textContent = "Chưa có job nào.";
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  for (const job of jobs) {
    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    const idSpan = document.createElement("span");
    idSpan.className = "mono";
    idSpan.textContent = job.job_id || "—";
    idCell.appendChild(idSpan);
    row.appendChild(idCell);

    const titleCell = document.createElement("td");
    titleCell.textContent = job.title || "—";
    row.appendChild(titleCell);

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    const status = String(job.status || "").toLowerCase();
    badge.className = `status ${status}`;
    badge.textContent = statusLabel(status);
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const progressCell = document.createElement("td");
    const progress = Number(job.progress);
    const wrapper = document.createElement("div");
    wrapper.className = "progress";
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    const fill = document.createElement("span");
    const safeProgress = Number.isFinite(progress)
      ? Math.max(0, Math.min(100, progress))
      : 0;
    fill.style.width = `${safeProgress}%`;
    bar.appendChild(fill);
    const label = document.createElement("span");
    label.textContent = `${Math.round(safeProgress)}%`;
    wrapper.appendChild(bar);
    wrapper.appendChild(label);
    progressCell.appendChild(wrapper);
    row.appendChild(progressCell);

    const updatedCell = document.createElement("td");
    updatedCell.textContent = formatTime(job.updated_at || job.created_at);
    row.appendChild(updatedCell);

    body.appendChild(row);
  }
}

function renderDeletedUsers(users) {
  const body = byId("deleted-body");
  body.replaceChildren();
  if (!Array.isArray(users) || users.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty";
    cell.textContent = "Chưa có tài khoản nào bị xoá mềm.";
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  for (const user of users) {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = user.display_name || user.id || "—";
    row.appendChild(nameCell);

    const emailCell = document.createElement("td");
    emailCell.textContent = user.email || "—";
    row.appendChild(emailCell);

    const timeCell = document.createElement("td");
    timeCell.textContent = formatTime(user.deleted_at);
    row.appendChild(timeCell);

    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Khôi phục";
    button.addEventListener("click", () => restoreUser(user, button, row));
    actionCell.appendChild(button);
    row.appendChild(actionCell);

    body.appendChild(row);
  }
}

async function restoreUser(user, button, row) {
  const label = user.email || user.display_name || user.id;
  if (!window.confirm(`Khôi phục tài khoản ${label}?`)) {
    return;
  }
  button.disabled = true;
  row.classList.add("removing");
  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(user.id)}/restore`, {
      method: "POST",
    });
    showNotice(`Đã khôi phục tài khoản ${label}.`, "ok");
    await loadOverview();
  } catch (error) {
    row.classList.remove("removing");
    button.disabled = false;
    if (error.unauthorized) {
      handleUnauthorized();
      return;
    }
    showNotice(error.message, "bad");
  }
}

function handleUnauthorized() {
  state.token = "";
  sessionStorage.removeItem(TOKEN_KEY);
  showLogin("Token không hợp lệ hoặc đã bị thay đổi. Vui lòng đăng nhập lại.");
}

async function loadOverview() {
  if (state.loading || !state.token) {
    return;
  }
  if (document.hidden) {
    return;
  }
  state.loading = true;
  byId("refresh-button").disabled = true;
  try {
    const data = await apiRequest("/api/admin/overview");
    renderStats(data);
    renderJobs(data.jobs);
    renderDeletedUsers(data.deleted_users);
    setText(
      "last-updated",
      `Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN")}`,
    );
    hideNotice();
  } catch (error) {
    if (error.unauthorized) {
      handleUnauthorized();
      return;
    }
    showNotice(error.message, "bad");
  } finally {
    state.loading = false;
    byId("refresh-button").disabled = false;
  }
}

function stopAutoRefresh() {
  if (state.timer !== null) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (state.refreshSeconds <= 0) {
    return;
  }
  state.timer = window.setInterval(() => {
    loadOverview();
  }, state.refreshSeconds * 1000);
}

function applyRefreshSetting(seconds) {
  state.refreshSeconds = seconds;
  localStorage.setItem(REFRESH_KEY, String(seconds));
  byId("refresh-select").value = String(seconds);
  startAutoRefresh();
}

function init() {
  const refreshSelect = byId("refresh-select");
  const allowed = ["0", "10", "15", "30"];
  const initial = allowed.includes(String(state.refreshSeconds))
    ? String(state.refreshSeconds)
    : String(DEFAULT_REFRESH_SECONDS);
  refreshSelect.value = initial;
  state.refreshSeconds = Number(initial);

  refreshSelect.addEventListener("change", () => {
    applyRefreshSetting(Number(refreshSelect.value));
  });

  byId("refresh-button").addEventListener("click", () => {
    loadOverview();
  });

  byId("logout-button").addEventListener("click", () => {
    state.token = "";
    sessionStorage.removeItem(TOKEN_KEY);
    showLogin("Đã đăng xuất khỏi phiên quản trị.");
  });

  byId("login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = byId("token-input");
    const token = input.value.trim();
    if (!token) {
      byId("login-error").textContent = "Vui lòng nhập admin token.";
      return;
    }
    state.token = token;
    sessionStorage.setItem(TOKEN_KEY, token);
    input.value = "";
    byId("login-error").textContent = "";
    showDashboard();
    startAutoRefresh();
    loadOverview();
  });

  if (state.token) {
    showDashboard();
    startAutoRefresh();
    loadOverview();
  } else {
    showLogin();
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.token) {
      loadOverview();
    }
  });
}

init();
