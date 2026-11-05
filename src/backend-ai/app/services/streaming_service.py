"""Luồng xử lý job streaming cho video dài.

Tách khỏi router để cả API (thread nội bộ) và worker Redis dùng chung một
triển khai. Hàm ``run_background_transcription`` bóc tách audio theo generator,
dịch từng batch nhỏ và cập nhật trạng thái qua ``job_queue``.
"""

import logging
import os
import time
from typing import Any, Dict, List

from app.core.job_queue import JobQueueError, JobStatus, job_queue
from app.firebase_database import firebase_service
from app.services.summary_service import (
    normalize_exercises,
    normalize_mindmap,
    normalize_quiz,
    summary_service,
)
from app.services.translation_service import translation_service
from app.services.whisper_service import whisper_service

logger = logging.getLogger("uvicorn")

# Số câu gom lại trước khi dịch để phụ đề hiện gần như tức thời.
TRANSLATION_BATCH_SIZE = 3
DEFAULT_DURATION_SECONDS = 1800.0


def persist_job(job_id: str, **changes: Any) -> None:
    """Cập nhật trạng thái job, không làm hỏng worker nếu Redis tạm lỗi."""
    try:
        job_queue.update_job(job_id, **changes)
    except JobQueueError as exc:
        logger.error("Không cập nhật được trạng thái job %s: %s", job_id, exc)


def _translate_batch(
    batch: List[dict],
    *,
    detected: str,
    target_lang: str,
    video_title: str,
    context: str,
    glossary: Any,
) -> List[dict]:
    """Dịch một batch nhỏ; lỗi dịch được thay bằng bản ghi gốc."""
    translated = list(batch)
    if target_lang == detected:
        for segment in translated:
            segment["translated_text"] = segment.get("text", "")
        return translated

    try:
        return translation_service.translate_segments(
            translated,
            source_lang=detected,
            target_lang=target_lang,
            video_title=video_title,
            context=context,
            glossary=glossary,
        )
    except Exception as exc:
        logger.warning("Lỗi dịch batch nhỏ: %s", exc)
        for segment in translated:
            segment["translated_text"] = segment.get("text", "")
        return translated


def _append_segments(all_segments: List[dict], batch: List[dict]) -> None:
    for item in batch:
        item["id"] = len(all_segments)
        all_segments.append(item)


def _build_cached_lecture(
    job: Dict[str, Any],
    *,
    all_segments: List[dict],
    target_lang: str,
    detected: str,
) -> Dict[str, Any]:
    """Dữ liệu đầy đủ để ghi cache Firestore sau khi job hoàn thành."""
    return {
        "video_url": job["video_url"],
        "title": job["title"],
        "duration_seconds": job["duration_seconds"],
        "language": target_lang,
        "detected_language": detected,
        "segments": all_segments,
        "summary": job["summary"],
        "key_points": job["key_points"],
        "formulas_and_terms": job["formulas_and_terms"],
        "sections": job["sections"],
        "quiz": job["quiz"],
        "quiz_target": job.get("quiz_target"),
        "mindmap": job["mindmap"],
        "exercises": job["exercises"],
        "folder": job["folder"],
        "tags": job["tags"],
        "owner_id": job.get("owner_id"),
    }


def _apply_summary(job: Dict[str, Any], all_segments: List[dict], detected: str) -> None:
    """Tạo tóm tắt, mindmap, quiz và gán vào job (giữ nguyên hành vi cũ)."""
    transcript = " ".join(segment.get("text", "") for segment in all_segments)
    summary_data = summary_service.summarize_transcript(
        transcript,
        include_quiz=True,
        duration_seconds=job.get("duration_seconds"),
        quiz_target=job.get("quiz_target"),
        video_title=job.get("title", ""),
    )

    job["segments"] = all_segments
    job["detected_language"] = detected
    job["summary"] = summary_data.get("summary", "")
    job["key_points"] = summary_data.get("key_points", [])
    job["formulas_and_terms"] = summary_data.get("formulas_and_terms", [])
    job["sections"] = summary_data.get("sections") or []
    job["quiz"] = normalize_quiz(summary_data.get("quiz", []), sections=job["sections"])
    job["quiz_target"] = summary_data.get("quiz_target")
    job["mindmap"] = summary_data.get("mindmap") or normalize_mindmap(
        None,
        default_title=job.get("title", ""),
        key_points=job.get("key_points"),
    )
    job["exercises"] = summary_data.get("exercises") or normalize_exercises(
        None,
        key_points=job.get("key_points"),
    )
    job["folder"] = summary_data.get("folder") or "Bài giảng chung"
    job["tags"] = summary_data.get("tags") or ["Bài giảng"]
    job["status"] = JobStatus.COMPLETED
    job["progress"] = 100


def run_background_transcription(
    job_id: str,
    audio_path: str,
    target_lang: str,
    src_lang: str,
) -> None:
    """Worker tiến trình ngầm cho video dài.

    - Bóc tách theo luồng Streaming Generator liên tục.
    - Cứ mỗi 3 câu mới, dịch ngay và nhồi trực tiếp vào ``job["segments"]``.
    - Người dùng xem tới đâu thì phụ đề đã có sẵn tới đó.
    """
    try:
        job = job_queue.get_job(job_id)
    except JobQueueError as exc:
        logger.error("Không đọc được job %s: %s", job_id, exc)
        return
    if not job:
        return

    try:
        # Job có thể đã bị huỷ trong lúc chờ worker nhận việc.
        if job_queue.is_cancelled(job_id):
            persist_job(
                job_id,
                status=JobStatus.CANCELLED,
                progress=100,
                finished_at=time.time(),
            )
            return

        duration = float(job.get("duration_seconds") or DEFAULT_DURATION_SECONDS)
        existing_segments = list(job.get("segments", []))
        all_segments = list(existing_segments)
        max_existing_end = max(
            (float(segment.get("end", 0)) for segment in existing_segments),
            default=0.0,
        )

        # Chuẩn bị ngữ cảnh + glossary một lần cho cả video để mọi batch nhỏ
        # đều được dịch nhất quán (không gọi lại Gemini brief mỗi 3 câu).
        translation_brief = translation_service.build_video_brief(
            existing_segments,
            video_title=job.get("title", ""),
            source_lang=src_lang,
            target_lang=target_lang,
        )
        brief_context = translation_brief.get("context")
        brief_glossary = translation_brief.get("glossary")

        buffer_batch: List[dict] = []
        detected = "en"
        cancelled = False

        for raw_segment in whisper_service.transcribe_audio_generator(
            audio_path=audio_path,
            language=None if src_lang == "auto" else src_lang,
            task="transcribe",
        ):
            if job_queue.is_cancelled(job_id):
                cancelled = True
                break

            detected = raw_segment.get("detected_language") or detected

            # Bỏ qua các câu rơi vào khoảng 30s đầu đã được nạp trước đó.
            if float(raw_segment.get("end", 0)) <= max_existing_end:
                continue

            buffer_batch.append(raw_segment)

            if len(buffer_batch) >= TRANSLATION_BATCH_SIZE:
                translated = _translate_batch(
                    buffer_batch,
                    detected=detected,
                    target_lang=target_lang,
                    video_title=job.get("title", ""),
                    context=brief_context,
                    glossary=brief_glossary,
                )
                _append_segments(all_segments, translated)
                buffer_batch = []

                # Cập nhật ngay để SyncPlayer nhận ở lần poll tiếp theo.
                progress = min(
                    95,
                    max(10, int((float(raw_segment.get("end", 0)) / duration) * 100)),
                )
                job["segments"] = list(all_segments)
                job["detected_language"] = detected
                job["progress"] = progress
                persist_job(
                    job_id,
                    segments=job["segments"],
                    detected_language=detected,
                    progress=progress,
                )

        if cancelled:
            persist_job(
                job_id,
                status=JobStatus.CANCELLED,
                progress=100,
                segments=list(all_segments),
                detected_language=detected,
                finished_at=time.time(),
            )
            logger.info("Job streaming %s đã dừng theo yêu cầu người dùng.", job_id)
            return

        # Dịch nốt các câu còn lại trong buffer.
        if buffer_batch:
            translated = _translate_batch(
                buffer_batch,
                detected=detected,
                target_lang=target_lang,
                video_title=job.get("title", ""),
                context=brief_context,
                glossary=brief_glossary,
            )
            _append_segments(all_segments, translated)
            job["segments"] = list(all_segments)

        # Toàn bộ video dài đã xong: tạo tóm tắt, mindmap, quiz.
        _apply_summary(job, all_segments, detected)

        cached_lecture = _build_cached_lecture(
            job,
            all_segments=all_segments,
            target_lang=target_lang,
            detected=detected,
        )
        firebase_service.save_lecture_cache(job["video_url"], cached_lecture)
        persist_job(
            job_id,
            status=JobStatus.COMPLETED,
            progress=100,
            segments=all_segments,
            detected_language=detected,
            summary=job["summary"],
            key_points=job["key_points"],
            formulas_and_terms=job["formulas_and_terms"],
            sections=job["sections"],
            quiz=job["quiz"],
            quiz_target=job.get("quiz_target"),
            mindmap=job["mindmap"],
            exercises=job["exercises"],
            folder=job["folder"],
            tags=job["tags"],
            finished_at=time.time(),
        )
        logger.info(
            "Đã hoàn thành nạp gối đầu toàn bộ video dài [%s]: %s câu phụ đề.",
            job.get("title"),
            len(all_segments),
        )
    except Exception as exc:
        logger.error("Lỗi worker xử lý ngầm video: %s", exc)
        persist_job(
            job_id,
            status=JobStatus.FAILED,
            error=str(exc),
            finished_at=time.time(),
        )
    finally:
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass
