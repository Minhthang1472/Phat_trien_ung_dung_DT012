"""Tiến trình worker xử lý job streaming từ Redis.

Chạy song song với API khi ``REDIS_URL`` được cấu hình::

    python -m app.worker

Worker lấy job theo FIFO (``RPUSH``/``BLPOP``), cập nhật trạng thái vào Redis
và ghi heartbeat để dashboard biết worker còn sống. Không cấu hình Redis thì
không cần chạy tiến trình này: API tự chạy job bằng thread nội bộ.
"""

import logging
import os
import signal
import threading
import time
import traceback

from app.core.config import settings
from app.core.job_queue import JobQueueError, job_queue
from app.core.logging_config import configure_logging
from app.firebase_database import firebase_service

logger = logging.getLogger("uvicorn")


def _mark_failed(job_id: str, message: str) -> None:
    try:
        job_queue.update_job(
            job_id,
            status="failed",
            error=message,
            finished_at=time.time(),
        )
    except JobQueueError as exc:
        logger.error("Không cập nhật được job %s: %s", job_id, exc)


def run_worker() -> int:
    settings.validate()
    configure_logging(settings.LOG_LEVEL, settings.LOG_FORMAT)
    firebase_service.init_firebase()

    if not job_queue.is_redis:
        logger.error(
            "Worker cần REDIS_URL. Nếu chạy một tiến trình, API đã tự xử lý job "
            "bằng thread nội bộ nên không cần worker."
        )
        return 2

    stop = threading.Event()

    def _request_stop(signum, _frame):
        logger.info("Nhận tín hiệu %s, worker sẽ dừng sau job hiện tại.", signum)
        stop.set()

    signal.signal(signal.SIGINT, _request_stop)
    signal.signal(signal.SIGTERM, _request_stop)

    try:
        job_queue.heartbeat()
    except JobQueueError as exc:
        logger.error("Không kết nối được Redis: %s", exc)
        return 3

    logger.info(
        "Worker streaming đã sẵn sàng (Redis, ttl=%s phút).",
        settings.STREAM_JOB_TTL_MINUTES,
    )

    while not stop.is_set():
        try:
            job_queue.heartbeat()
            payload = job_queue.dequeue(timeout=5)
        except JobQueueError as exc:
            logger.error("Lỗi hàng đợi, thử lại sau 5 giây: %s", exc)
            stop.wait(5)
            continue

        if not payload:
            continue

        job_id = str(payload.get("job_id") or "").strip()
        audio_path = str(payload.get("audio_path") or "").strip()
        target_lang = str(payload.get("target_lang") or "vi")
        src_lang = str(payload.get("src_lang") or "auto")

        if not job_id:
            logger.warning("Bỏ qua payload không có job_id: %s", payload)
            continue

        try:
            job = job_queue.get_job(job_id)
        except JobQueueError as exc:
            logger.error("Không đọc được job %s: %s", job_id, exc)
            continue

        if not job:
            logger.warning("Bỏ qua job %s vì đã hết TTL hoặc bị xoá.", job_id)
            continue
        if job.get("status") in {"completed", "failed", "cancelled"}:
            logger.info("Bỏ qua job %s vì đã ở trạng thái kết thúc.", job_id)
            continue
        if not audio_path or not os.path.exists(audio_path):
            _mark_failed(job_id, "Không tìm thấy file audio của job trên worker.")
            logger.error("Job %s thiếu file audio: %s", job_id, audio_path)
            continue

        logger.info("Bắt đầu job %s (%s).", job_id, job.get("title") or "không tên")
        try:
            job_queue.update_job(
                job_id,
                status="processing",
                worker_started_at=time.time(),
            )
            # Import muộn để worker chỉ nạp model/thư viện AI khi thực sự có job.
            from app.routers.video import _run_background_transcription

            _run_background_transcription(job_id, audio_path, target_lang, src_lang)
        except Exception as exc:  # pragma: no cover - phòng thủ
            logger.error(
                "Worker gặp lỗi khi xử lý job %s: %s\n%s",
                job_id,
                exc,
                traceback.format_exc(),
            )
            _mark_failed(job_id, "Worker gặp lỗi không mong muốn.")
        finally:
            try:
                job_queue.heartbeat()
            except JobQueueError:
                pass

    logger.info("Worker đã dừng.")
    return 0


def main() -> int:
    return run_worker()


if __name__ == "__main__":
    raise SystemExit(main())
