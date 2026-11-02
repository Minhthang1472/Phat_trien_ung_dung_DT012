"""Bộ đếm metrics tối giản, không phụ thuộc thư viện ngoài.

Cung cấp endpoint ``/metrics`` theo định dạng Prometheus text. Phù hợp cho
đồ án: đủ để quan sát lưu lượng và tỉ lệ lỗi mà không cần thêm hạ tầng.
"""

import threading
import time


class MetricsRegistry:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._requests_total = 0
        self._errors_total = 0
        self._duration_sum = 0.0
        self._started_at = time.time()

    def observe(self, status_code: int, duration_seconds: float) -> None:
        with self._lock:
            self._requests_total += 1
            self._duration_sum += max(0.0, duration_seconds)
            if status_code >= 500:
                self._errors_total += 1

    def uptime_seconds(self) -> float:
        return max(0.0, time.time() - self._started_at)

    def render(self) -> str:
        with self._lock:
            requests_total = self._requests_total
            errors_total = self._errors_total
            duration_sum = self._duration_sum
        uptime = self.uptime_seconds()
        avg = (duration_sum / requests_total) if requests_total else 0.0
        lines = [
            "# HELP lecture_ai_http_requests_total Tổng số request HTTP.",
            "# TYPE lecture_ai_http_requests_total counter",
            f"lecture_ai_http_requests_total {requests_total}",
            "# HELP lecture_ai_http_errors_total Tổng số response 5xx.",
            "# TYPE lecture_ai_http_errors_total counter",
            f"lecture_ai_http_errors_total {errors_total}",
            "# HELP lecture_ai_http_request_duration_seconds_sum Tổng thời gian xử lý request.",
            "# TYPE lecture_ai_http_request_duration_seconds_sum counter",
            f"lecture_ai_http_request_duration_seconds_sum {duration_sum:.6f}",
            "# HELP lecture_ai_http_request_duration_seconds_avg Thời gian xử lý trung bình.",
            "# TYPE lecture_ai_http_request_duration_seconds_avg gauge",
            f"lecture_ai_http_request_duration_seconds_avg {avg:.6f}",
            "# HELP lecture_ai_uptime_seconds Thời gian hoạt động của tiến trình.",
            "# TYPE lecture_ai_uptime_seconds gauge",
            f"lecture_ai_uptime_seconds {uptime:.3f}",
        ]
        return "\n".join(lines) + "\n"


metrics_registry = MetricsRegistry()
