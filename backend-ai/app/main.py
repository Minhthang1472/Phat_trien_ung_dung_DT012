import os
from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uuid
import logging
import shutil
import subprocess
import tempfile

from app.core.config import settings
from app.firebase_database import firebase_service
from pydantic import BaseModel
from app.models.schemas import ProcessVideoRequest, ProcessVideoResponse, SubtitleSegment, LookaheadSubtitleRequest, BurnSubtitlesRequest
from app.services.audio_service import audio_service
from app.services.whisper_service import whisper_service
from app.services.summary_service import summary_service, normalize_quiz, normalize_mindmap, normalize_exercises
from app.services.translation_service import translation_service
from app.services.subtitle_exporter import subtitle_exporter
from app.services.subtitle_parser import parse_subtitle
from app.api.websocket_router import ws_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động kết nối Google Firebase Cloud Firestore
    firebase_service.init_firebase()
    yield

app = FastAPI(
    title="Lecture Caption & Summary AI API",
    description="Hệ thống tự động bóc tách phụ đề, đồng bộ timestamps, dịch thuật đa ngôn ngữ và tóm tắt bài giảng",
    version="2.0.0",
    lifespan=lifespan
)

# Cấu hình CORS để Mobile App (Flutter) và Browser Extension có thể kết nối không bị chặn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kênh WebSocket Live-Caption Realtime
app.include_router(ws_router)

# Thư mục lưu và phát video tĩnh tải lên từ máy tính
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "2.0.0",
        "whisper_device": settings.WHISPER_DEVICE,
        "docs_url": "/docs"
    }

# Bộ lưu trữ trạng thái các tác vụ bị hủy ngang (Yêu cầu 1)
cancelled_jobs: set = set()
streaming_jobs: dict = {}

@app.post("/api/video/cancel/{job_id}")
async def cancel_job(job_id: str):
    """Cơ chế ngắt ngang tiến trình đang chạy (Yêu cầu 1)."""
    cancelled_jobs.add(job_id)
    if job_id in streaming_jobs:
        streaming_jobs[job_id]["is_cancelled"] = True
    logger.info(f"Đã kích hoạt ngắt ngang cho tác vụ: {job_id}")
    return {"success": True, "message": f"Tác vụ {job_id} đã được gửi tín hiệu dừng."}


class UpdateLectureMetaRequest(BaseModel):
    video_url: str
    folder: Optional[str] = None
    tags: Optional[List[str]] = None


@app.post("/api/lecture/meta")
async def update_lecture_meta(req: UpdateLectureMetaRequest):
    """Cập nhật thư mục và gắn nhãn phân loại bài giảng (Yêu cầu 8)."""
    cached = firebase_service.get_lecture_cache(req.video_url)
    if cached:
        if req.folder is not None:
            cached["folder"] = req.folder
        if req.tags is not None:
            cached["tags"] = req.tags
        firebase_service.save_lecture_cache(req.video_url, cached)
        return {"success": True, "lecture": cached}
    return {"success": False, "message": "Bài giảng không tồn tại trong bộ nhớ"}


@app.post("/api/video/process", response_model=ProcessVideoResponse)
async def process_video(request: ProcessVideoRequest):
    """
    Xử lý link video (YouTube, Drive, LMS):
    1. Tải stream audio siêu nhẹ
    2. Nhận diện giọng nói & timestamps qua Whisper
    3. Dịch thuật đồng bộ timestamps đa ngôn ngữ
    4. Tóm tắt 4 phần & sinh câu hỏi trắc nghiệm bằng LLM
    5. Cache CSDL MongoDB Cloud
    """
    url = request.video_url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp URL bài giảng hợp lệ.")

    # 0. Kiểm tra tín hiệu hủy ngang trước khi bắt đầu (Yêu cầu 1)
    if request.job_id and request.job_id in cancelled_jobs:
        cancelled_jobs.discard(request.job_id)
        raise HTTPException(status_code=499, detail="Tác vụ đã bị người dùng hủy ngang.")

    # 1. Kiểm tra cache trong Firebase Firestore (tiết kiệm 100% Token Gemini!)
    # Nếu người dùng yêu cầu cắt mốc thời gian tùy chỉnh thì bỏ qua cache để xử lý đoạn được chọn (Yêu cầu 4)
    has_custom_range = (request.start_time is not None and request.start_time > 0) or (request.end_time is not None and request.end_time > 0)
    target_lang = (request.target_language or "vi").lower().strip()
    
    if not has_custom_range:
        cached_fb = firebase_service.get_lecture_cache(url)
        if cached_fb:
            cached_fb["quiz"] = normalize_quiz(cached_fb.get("quiz", []))
            cached_fb["mindmap"] = normalize_mindmap(
                cached_fb.get("mindmap"),
                default_title=cached_fb.get("title", ""),
                key_points=cached_fb.get("key_points"),
                terms=cached_fb.get("formulas_and_terms")
            )
            cached_fb["exercises"] = normalize_exercises(
                cached_fb.get("exercises"),
                key_points=cached_fb.get("key_points")
            )
            if request.folder:
                cached_fb["folder"] = request.folder
            if request.tags:
                cached_fb["tags"] = request.tags
            cached_lang = (cached_fb.get("language") or "").lower().strip()
            segs = cached_fb.get("segments", [])
            # Nếu cache đã đúng ngôn ngữ đích và đã có tiếng Việt
            if cached_lang == target_lang:
                logger.info(f"Tìm thấy kết quả trong FIREBASE CACHE đúng ngôn ngữ ({target_lang}): {url}")
                return cached_fb
            elif segs:
                logger.info(f"Bản cache có ngôn ngữ '{cached_lang}', tiến hành dịch thuật sang '{target_lang}' bằng Gemini AI...")
                src_lang = cached_fb.get("detected_language") or cached_lang or "en"
                cached_fb["segments"] = translation_service.translate_segments(
                    segs,
                    source_lang=src_lang,
                    target_lang=target_lang
                )
                cached_fb["language"] = target_lang
                firebase_service.save_lecture_cache(url, cached_fb)
                return cached_fb

    # 2. Bóc tách âm thanh siêu nhẹ bằng yt-dlp & Xác minh bản quyền DRM (Yêu cầu 4, 6)
    try:
        audio_info = audio_service.extract_audio_from_url(
            url, 
            duration_limit_sec=request.max_duration_seconds,
            start_time_sec=request.start_time or 0,
            end_time_sec=request.end_time
        )
    except ValueError as ve:
        # Lỗi chặn do bản quyền / DRM
        logger.warning(f"Từ chối tải URL do chính sách bản quyền/DRM: {ve}")
        raise HTTPException(status_code=403, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi khi bóc tách âm thanh: {e}")
        raise HTTPException(status_code=500, detail=f"Không thể bóc tách âm thanh từ URL ({e})")

    # Kiểm tra tín hiệu hủy sau khi tải âm thanh (Yêu cầu 1)
    if request.job_id and request.job_id in cancelled_jobs:
        if os.path.exists(audio_info.get("audio_path", "")):
            try: os.remove(audio_info["audio_path"])
            except Exception: pass
        cancelled_jobs.discard(request.job_id)
        raise HTTPException(status_code=499, detail="Tác vụ đã bị người dùng hủy ngang.")

    audio_path = audio_info["audio_path"]

    # 3. Chạy mô hình Whisper để nhận diện giọng nói và timestamps
    try:
        target_lang = (request.target_language or "vi").lower().strip()
        segments, detected_lang = whisper_service.transcribe_audio(
            audio_path=audio_path,
            language=None if request.source_language == "auto" else request.source_language,
            task="transcribe"
        )
    except Exception as e:
        logger.error(f"Lỗi khi chạy mô hình Whisper: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi phiên âm giọng nói AI ({e})")
    finally:
        # Xóa file audio tạm để tiết kiệm ổ cứng
        if os.path.exists(audio_path):
            try: os.remove(audio_path)
            except Exception: pass

    # Kiểm tra tín hiệu hủy sau khi phiên âm (Yêu cầu 1)
    if request.job_id and request.job_id in cancelled_jobs:
        cancelled_jobs.discard(request.job_id)
        raise HTTPException(status_code=499, detail="Tác vụ đã bị người dùng hủy ngang.")

    # Hiệu chỉnh mốc timestamps nếu xử lý từ mốc thời gian bắt đầu > 0 (Yêu cầu 4)
    start_offset = float(audio_info.get("start_time_offset", 0) or 0)
    if start_offset > 0:
        for seg in segments:
            seg["start"] = round(float(seg.get("start", 0)) + start_offset, 2)
            seg["end"] = round(float(seg.get("end", 0)) + start_offset, 2)

    # Lưu giữ nguyên văn lời người nói vào original_text để phục vụ chế độ song ngữ
    for seg in segments:
        if "original_text" not in seg or not seg["original_text"]:
            seg["original_text"] = seg.get("text", "")

    # 4. Dịch thuật đồng bộ nếu ngôn ngữ đích khác ngôn ngữ phát hiện được
    if target_lang != detected_lang:
        segments = translation_service.translate_segments(
            segments, 
            source_lang=detected_lang, 
            target_lang=target_lang
        )
    else:
        for seg in segments:
            seg["translated_text"] = seg.get("text", "")

    # 5. Tóm tắt nội dung bài giảng (Tổng quan, Điểm chính, Thuật ngữ, Trắc nghiệm nếu bật)
    full_transcript = " ".join([seg.get("text", "") for seg in segments])
    include_quiz = True if request.include_quiz is None else request.include_quiz
    summary_data = summary_service.summarize_transcript(full_transcript, include_quiz=include_quiz)

    result = {
        "video_url": url,
        "title": audio_info["title"],
        "duration_seconds": audio_info["duration"],
        "language": target_lang,
        "detected_language": detected_lang,
        "segments": segments,
        "summary": summary_data.get("summary", ""),
        "key_points": summary_data.get("key_points", []),
        "formulas_and_terms": summary_data.get("formulas_and_terms", []),
        "quiz": normalize_quiz(summary_data.get("quiz", [])),
        "mindmap": summary_data.get("mindmap") or normalize_mindmap(None, default_title=audio_info["title"], key_points=summary_data.get("key_points")),
        "exercises": summary_data.get("exercises") or normalize_exercises(None, key_points=summary_data.get("key_points")),
        "folder": request.folder or summary_data.get("folder") or "Bài giảng chung",
        "tags": request.tags if (request.tags and len(request.tags) > 0) else (summary_data.get("tags") or ["Bài giảng"]),
        "copyright_status": audio_info.get("copyright_status", "verified_clean"),
    }

    # 6. Lưu vào Firebase Firestore làm kho lưu vĩnh cửu
    firebase_service.save_lecture_cache(url, result)

    if request.job_id:
        cancelled_jobs.discard(request.job_id)

    return result

@app.post("/api/video/lookahead")
async def process_lookahead_window(request: LookaheadSubtitleRequest):
    """Return captions for the next short playback window without blocking the player."""
    audio_path = None
    try:
        audio_info = audio_service.extract_audio_from_url(
            request.video_url.strip(),
            duration_limit_sec=request.window_seconds,
            start_time_sec=request.start_seconds,
        )
        audio_path = audio_info["audio_path"]
        requested_source = (request.source_language or "auto").lower().strip()
        segments, detected_language = whisper_service.transcribe_audio(
            audio_path=audio_path,
            language=None if requested_source == "auto" else requested_source,
            task="transcribe",
        )
    except Exception as exc:
        logger.error("Could not process lookahead window: %s", exc)
        raise HTTPException(status_code=500, detail="Khong the xu ly cua so audio tiep theo.")
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass

    for index, segment in enumerate(segments):
        segment["id"] = index
        segment["start"] = float(segment.get("start", 0)) + request.start_seconds
        segment["end"] = float(segment.get("end", 0)) + request.start_seconds
        segment["original_text"] = segment.get("text", "")

    target_lang = (request.target_language or "vi").lower().strip()
    if target_lang != detected_language:
        segments = translation_service.translate_segments(
            segments,
            source_lang=detected_language,
            target_lang=target_lang,
        )
    else:
        for seg in segments:
            seg["translated_text"] = seg.get("text", "")

    return {
        "window_start": request.start_seconds,
        "window_end": request.start_seconds + request.window_seconds,
        "language": target_lang,
        "detected_language": detected_language,
        "segments": segments,
    }


@app.post("/api/video/upload", response_model=ProcessVideoResponse)
async def upload_video(
    file: UploadFile = File(..., description="File bài giảng tải lên (.mp3, .wav, .mp4, .m4a)"),
    max_duration_seconds: Optional[int] = Form(None, description="Số giây muốn test (để trống để chạy hết)"),
    start_time: Optional[float] = Form(None, description="Mốc thời gian bắt đầu muốn xử lý (giây)"),
    end_time: Optional[float] = Form(None, description="Mốc thời gian kết thúc muốn xử lý (giây)"),
    job_id: Optional[str] = Form(None, description="Mã định danh tác vụ để hỗ trợ hủy ngang"),
    source_language: Optional[str] = Form("auto", description="Ngôn ngữ nguồn (auto, vi, en, ja...)"),
    target_language: Optional[str] = Form("vi", description="Ngôn ngữ phụ đề muốn xuất (vi, en, ja...)"),
    include_quiz: Optional[bool] = Form(True, description="Tùy chọn tạo bài trắc nghiệm hay không"),
    folder: Optional[str] = Form(None, description="Thư mục phân loại bài giảng"),
    tags: Optional[str] = Form("", description="Danh sách nhãn phân loại, phân cách bằng dấu phẩy")
):
    """
    Tiếp nhận file ghi âm hoặc video bài giảng tải trực tiếp từ máy tính (Giới hạn tối đa 150MB)
    """
    if job_id and job_id in cancelled_jobs:
        cancelled_jobs.discard(job_id)
        raise HTTPException(status_code=499, detail="Tác vụ đã bị người dùng hủy ngang.")

    MAX_MEDIA_UPLOAD_SIZE = 150 * 1024 * 1024  # 150MB
    ALLOWED_MEDIA_EXTENSIONS = (
        ".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v",
        ".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"
    )
    try:
        safe_fname = os.path.basename(file.filename or "lecture.mp4")
        if not safe_fname.lower().endswith(ALLOWED_MEDIA_EXTENSIONS):
            raise HTTPException(
                status_code=415,
                detail="Chỉ hỗ trợ file video hoặc ghi âm (.mp4, .mov, .mkv, .webm, .avi, .mp3, .wav, .m4a)."
            )

        contents = await file.read()
        if not contents or len(contents) == 0:
            raise HTTPException(status_code=400, detail="File tải lên bị rỗng. Vui lòng chọn file hợp lệ.")
        if len(contents) > MAX_MEDIA_UPLOAD_SIZE:
            size_mb = len(contents) / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"Dung lượng file ({size_mb:.1f}MB) vượt quá giới hạn 150MB. Vui lòng nén file hoặc chọn file nhỏ hơn."
            )

        # Lưu file để có thể phát trực tiếp trên Web / App
        unique_name = f"{uuid.uuid4().hex[:12]}_{safe_fname}"
        saved_file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(saved_file_path, "wb") as f_saved:
            f_saved.write(contents)
        media_stream_url = f"/uploads/{unique_name}"

        audio_info = audio_service.extract_audio_from_file(
            file_bytes=contents,
            filename=file.filename or "upload_audio.mp4",
            duration_limit_sec=max_duration_seconds,
            start_time_sec=start_time or 0,
            end_time_sec=end_time
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi khi đọc file upload: {e}")
        raise HTTPException(status_code=400, detail=f"Không thể xử lý file tải lên: {e}")

    if job_id and job_id in cancelled_jobs:
        if os.path.exists(audio_info.get("audio_path", "")):
            try: os.remove(audio_info["audio_path"])
            except Exception: pass
        cancelled_jobs.discard(job_id)
        raise HTTPException(status_code=499, detail="Tác vụ đã bị người dùng hủy ngang.")

    audio_path = audio_info["audio_path"]

    try:
        target_lang = (target_language or "vi").lower().strip()
        segments, detected_lang = whisper_service.transcribe_audio(
            audio_path=audio_path,
            language=None if source_language == "auto" else source_language,
            task="transcribe"
        )
    except Exception as e:
        logger.error(f"Lỗi khi nhận diện giọng nói: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi phiên âm: {e}")
    finally:
        if os.path.exists(audio_path):
            try: os.remove(audio_path)
            except Exception: pass

    if job_id and job_id in cancelled_jobs:
        cancelled_jobs.discard(job_id)
        raise HTTPException(status_code=499, detail="Tác vụ đã bị người dùng hủy ngang.")

    # Hiệu chỉnh mốc timestamps nếu xử lý từ mốc thời gian bắt đầu > 0
    start_offset = float(audio_info.get("start_time_offset", 0) or 0)
    if start_offset > 0:
        for seg in segments:
            seg["start"] = round(float(seg.get("start", 0)) + start_offset, 2)
            seg["end"] = round(float(seg.get("end", 0)) + start_offset, 2)

    # Lưu giữ nguyên văn lời người nói vào original_text để phục vụ chế độ song ngữ
    for seg in segments:
        if "original_text" not in seg or not seg["original_text"]:
            seg["original_text"] = seg.get("text", "")

    # Dịch thuật nếu ngôn ngữ đích khác ngôn ngữ phát hiện được
    if target_lang != detected_lang:
        segments = translation_service.translate_segments(
            segments, 
            source_lang=detected_lang, 
            target_lang=target_lang
        )

    # Tóm tắt
    full_transcript = " ".join([seg.get("text", "") for seg in segments])
    include_q = True if include_quiz is None else include_quiz
    summary_data = summary_service.summarize_transcript(full_transcript, include_quiz=include_q)

    tags_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    result = {
        "video_url": f"local_file://{file.filename}",
        "media_url": media_stream_url,
        "title": audio_info["title"],
        "duration_seconds": audio_info["duration"],
        "language": target_lang,
        "detected_language": detected_lang,
        "segments": segments,
        "summary": summary_data.get("summary", ""),
        "key_points": summary_data.get("key_points", []),
        "formulas_and_terms": summary_data.get("formulas_and_terms", []),
        "quiz": normalize_quiz(summary_data.get("quiz", [])),
        "mindmap": summary_data.get("mindmap") or normalize_mindmap(None, default_title=audio_info["title"], key_points=summary_data.get("key_points")),
        "exercises": summary_data.get("exercises") or normalize_exercises(None, key_points=summary_data.get("key_points")),
        "folder": folder or summary_data.get("folder") or "Bài giảng chung",
        "tags": tags_list if len(tags_list) > 0 else (summary_data.get("tags") or ["Bài giảng"]),
        "copyright_status": "verified_clean"
    }

    # Lưu vào Firebase Firestore làm kho lưu vĩnh cửu
    firebase_service.save_lecture_cache(result["video_url"], result)

    if job_id:
        cancelled_jobs.discard(job_id)

    return result

@app.post("/api/video/burn-subtitles")
async def burn_subtitles_into_video(request: BurnSubtitlesRequest):
    """Render translated subtitle timestamps directly into an uploaded MP4."""
    media_url = request.media_url
    if "/uploads/" in media_url:
        media_url = "/uploads/" + media_url.split("/uploads/", 1)[1]
    if not media_url.startswith("/uploads/"):
        raise HTTPException(status_code=400, detail="Chi co the chen phu de vao video da upload len he thong.")

    source_name = os.path.basename(media_url)
    source_path = os.path.abspath(os.path.join(UPLOAD_DIR, source_name))
    if not source_path.startswith(os.path.abspath(UPLOAD_DIR) + os.sep) or not os.path.isfile(source_path):
        raise HTTPException(status_code=404, detail="Khong tim thay file video da upload.")

    ffmpeg_path = shutil.which(settings.FFMPEG_PATH) or (
        settings.FFMPEG_PATH if os.path.isfile(settings.FFMPEG_PATH) else None
    )
    if not ffmpeg_path:
        raise HTTPException(status_code=503, detail="May chu chua cai FFmpeg, khong the ghi cung phu de vao MP4.")

    job_id = uuid.uuid4().hex[:12]
    subtitle_path = os.path.join(UPLOAD_DIR, f"burn_{job_id}.srt")
    output_name = f"captioned_{job_id}.mp4"
    output_path = os.path.join(UPLOAD_DIR, output_name)
    try:
        with open(subtitle_path, "w", encoding="utf-8") as subtitle_file:
            subtitle_file.write(subtitle_exporter.to_srt([segment.model_dump() for segment in request.segments]))

        # FFmpeg subtitles filter accepts POSIX separators; escape Windows drive separators.
        escaped_subtitle_path = subtitle_path.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
        subtitle_filter = (
            f"subtitles=filename='{escaped_subtitle_path}':"
            "force_style='FontName=Arial,FontSize=20,Outline=2,Shadow=1,Alignment=2'"
        )
        command = [
            ffmpeg_path, "-y", "-i", source_path,
            "-map", "0:v:0", "-map", "0:a?",
            "-vf", subtitle_filter,
            "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", output_path,
        ]
        completed = await run_in_threadpool(
            subprocess.run,
            command,
            capture_output=True,
            text=True,
            check=False,
        )
        if completed.returncode != 0 or not os.path.isfile(output_path):
            logger.error("FFmpeg subtitle burn failed: %s", completed.stderr[-1000:])
            if os.path.exists(output_path):
                os.remove(output_path)
            raise HTTPException(status_code=500, detail="FFmpeg khong the render phu de vao video.")
    finally:
        if os.path.exists(subtitle_path):
            try:
                os.remove(subtitle_path)
            except OSError:
                pass

    return {
        "media_url": f"/uploads/{output_name}",
        "filename": output_name,
        "message": "Da tao MP4 co phu de ghi cung.",
    }


@app.post("/api/subtitles/process", response_model=ProcessVideoResponse)
async def process_subtitle_file(
    file: UploadFile = File(..., description="Subtitle file in SRT or VTT format"),
    video_url: Optional[str] = Form(None, description="Video URL for subtitle synchronization"),
    title: Optional[str] = Form(None, description="Lecture title"),
    source_language: Optional[str] = Form("auto"),
    target_language: Optional[str] = Form("vi"),
    include_quiz: Optional[bool] = Form(True),
):
    """Translate an existing subtitle file without re-transcribing its matching video."""
    filename = file.filename or "subtitles.srt"
    if not filename.lower().endswith((".srt", ".vtt")):
        raise HTTPException(status_code=400, detail="Chi ho tro tep phu de .srt hoac .vtt.")

    content = await file.read()
    if not content or len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Tep phu de trong hoac vuot qua 10 MB.")

    segments = parse_subtitle(content)
    if not segments:
        raise HTTPException(status_code=400, detail="Khong doc duoc moc thoi gian hop le tu tep phu de.")

    transcript = " ".join(segment["text"] for segment in segments)
    requested_source = (source_language or "auto").lower().strip()
    detected_language = (
        translation_service.detect_language(transcript)
        if requested_source == "auto"
        else requested_source
    )
    target_lang = (target_language or "vi").lower().strip()
    if target_lang != detected_language:
        segments = translation_service.translate_segments(
            segments,
            source_lang=detected_language,
            target_lang=target_lang,
        )

    summary_data = summary_service.summarize_transcript(
        " ".join(segment["text"] for segment in segments),
        include_quiz=True if include_quiz is None else include_quiz,
    )
    lecture_url = (video_url or f"subtitle_file://{filename}").strip()
    result = {
        "video_url": lecture_url,
        "title": title or os.path.splitext(filename)[0],
        "duration_seconds": max(segment["end"] for segment in segments),
        "language": target_lang,
        "detected_language": detected_language,
        "segments": segments,
        "summary": summary_data.get("summary", ""),
        "key_points": summary_data.get("key_points", []),
        "formulas_and_terms": summary_data.get("formulas_and_terms", []),
        "quiz": normalize_quiz(summary_data.get("quiz", [])),
        "mindmap": summary_data.get("mindmap") or normalize_mindmap(None, default_title=title or os.path.splitext(filename)[0], key_points=summary_data.get("key_points")),
        "exercises": summary_data.get("exercises") or normalize_exercises(None, key_points=summary_data.get("key_points")),
        "folder": summary_data.get("folder") or "Bài giảng chung",
        "tags": summary_data.get("tags") or ["Bài giảng"],
    }
    firebase_service.save_lecture_cache(lecture_url, result)
    return result


@app.get("/api/video/export")
async def export_subtitles(
    video_url: str = Query(..., description="URL video bài giảng đã được xử lý"),
    format: str = Query("srt", description="Định dạng phụ đề: 'srt' hoặc 'vtt'")
):
    """
    Xuất file phụ đề chuẩn quốc tế (.srt hoặc .vtt) để tải về máy hoặc phát trên web
    """
    # Tra cứu dữ liệu phụ đề từ Firebase Firestore
    record = firebase_service.get_lecture_cache(video_url)

    if not record or "segments" not in record:
        raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu phụ đề cho video này trên Cloud. Hãy xử lý video trước.")

    segments = record["segments"]
    fmt = format.lower().strip()
    
    if fmt == "vtt":
        content = subtitle_exporter.to_vtt(segments)
        media_type = "text/vtt; charset=utf-8"
        filename = "subtitles.vtt"
    else:
        content = subtitle_exporter.to_srt(segments)
        media_type = "application/x-subrip; charset=utf-8"
        filename = "subtitles.srt"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.get("/api/history")
async def get_lecture_history(limit: int = 10):
    """
    Lấy danh sách các bài giảng người dùng đã xử lý gần đây từ Google Firebase Firestore Cloud
    """
    items = firebase_service.get_history(limit=limit)

    return {
        "items": items, 
        "total": len(items), 
        "storage": "Google Firebase Firestore Cloud"
    }


@app.delete("/api/history")
async def delete_lecture_history(video_url: str = Query(..., description="URL video bài giảng cần xóa")):
    """
    Xóa bài giảng khỏi kho lưu trữ Google Firebase Firestore Cloud
    """
    success = firebase_service.delete_lecture(video_url)
    if not success:
        raise HTTPException(status_code=500, detail="Không thể xóa bài giảng khỏi CSDL.")
    return {"status": "success", "message": "Đã xóa bài giảng thành công."}


@app.get("/api/tts")
async def text_to_speech(
    text: str = Query(..., description="Văn bản cần phát âm"), 
    lang: str = Query("vi", description="Mã ngôn ngữ: vi, en, ja, ko, zh...")
):
    """
    Phát âm chuẩn giọng bản ngữ Google Translate (Tiếng Việt chuẩn có dấu, Tiếng Anh, Tiếng Nhật, Hàn, Trung...)
    """
    import urllib.parse
    import requests

    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Văn bản cần phát âm không được để trống.")

    short_text = clean_text[:250]
    encoded_query = urllib.parse.quote(short_text)
    clean_lang = lang.lower().strip()
    if "-" in clean_lang:
        clean_lang = clean_lang.split("-")[0]

    tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={clean_lang}&client=tw-ob&q={encoded_query}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(tts_url, headers=headers, timeout=8)
        if response.status_code == 200:
            return Response(
                content=response.content,
                media_type="audio/mpeg",
                headers={
                    "Cache-Control": "public, max-age=86400",
                    "Access-Control-Allow-Origin": "*"
                }
            )
        else:
            logger.warning(f"Google TTS response code: {response.status_code}")
    except Exception as e:
        logger.warning(f"Lỗi khi tải âm thanh từ Google TTS: {e}")

    raise HTTPException(status_code=502, detail="Không thể tạo âm thanh phát âm lúc này.")


# ==============================================================================
# GIAI ĐOẠN 2: NẠP ĐỒNG THỜI VIDEO + PHỤ ĐỀ CÓ SẴN (BỎ QUA WHISPER)
# ==============================================================================

@app.post("/api/video/pair", response_model=ProcessVideoResponse)
async def pair_video_and_subtitles(
    subtitle_file: UploadFile = File(..., description="Tệp phụ đề .srt hoặc .vtt có sẵn"),
    video_file: Optional[UploadFile] = File(None, description="Tệp video/audio tải lên kèm"),
    video_url: Optional[str] = Form(None, description="Đường link video YouTube hoặc LMS"),
    title: Optional[str] = Form(None, description="Tiêu đề bài giảng"),
    target_language: Optional[str] = Form("vi", description="Ngôn ngữ dịch phụ đề"),
    include_quiz: Optional[bool] = Form(True)
):
    """
    Giai đoạn 2: Nạp ghép đôi 1 Video và 1 file Phụ đề có sẵn
    Hệ thống bỏ qua hoàn toàn bước Whisper, hiển thị ngay lập tức và sinh Mindmap/Bài tập
    """
    sub_fname = subtitle_file.filename or "subtitles.srt"
    if not sub_fname.lower().endswith((".srt", ".vtt")):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file phụ đề định dạng .srt hoặc .vtt.")

    sub_bytes = await subtitle_file.read()
    if not sub_bytes or len(sub_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Tệp phụ đề rỗng hoặc vượt quá giới hạn 10MB.")

    segments = parse_subtitle(sub_bytes)
    if not segments:
        raise HTTPException(status_code=400, detail="Không trích xuất được mốc thời gian từ file phụ đề.")

    media_stream_url = None
    lecture_url = (video_url or "").strip() or f"paired_file://{sub_fname}"

    if video_file:
        v_name = os.path.basename(video_file.filename or "paired_lecture.mp4")
        v_bytes = await video_file.read()
        if len(v_bytes) > 150 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File video tải kèm vượt quá giới hạn 150MB.")
        unique_name = f"{uuid.uuid4().hex[:12]}_{v_name}"
        saved_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(saved_path, "wb") as f_v:
            f_v.write(v_bytes)
        media_stream_url = f"/uploads/{unique_name}"
        lecture_url = f"local_file://{v_name}"

    transcript = " ".join(s.get("text", "") for s in segments)
    detected_language = translation_service.detect_language(transcript)
    target_lang = (target_language or "vi").lower().strip()

    if target_lang != detected_language:
        segments = translation_service.translate_segments(
            segments,
            source_lang=detected_language,
            target_lang=target_lang
        )
    else:
        for s in segments:
            s["translated_text"] = s.get("text", "")

    summary_data = summary_service.summarize_transcript(
        transcript,
        include_quiz=True if include_quiz is None else include_quiz
    )

    max_duration = max((float(s.get("end", 0)) for s in segments), default=300.0)
    final_title = title or (video_file.filename if video_file else os.path.splitext(sub_fname)[0])

    result = {
        "video_url": lecture_url,
        "media_url": media_stream_url,
        "title": final_title,
        "duration_seconds": max_duration,
        "language": target_lang,
        "detected_language": detected_language,
        "segments": segments,
        "summary": summary_data.get("summary", ""),
        "key_points": summary_data.get("key_points", []),
        "formulas_and_terms": summary_data.get("formulas_and_terms", []),
        "quiz": normalize_quiz(summary_data.get("quiz", [])),
        "mindmap": summary_data.get("mindmap") or normalize_mindmap(None, default_title=final_title, key_points=summary_data.get("key_points")),
        "exercises": summary_data.get("exercises") or normalize_exercises(None, key_points=summary_data.get("key_points")),
        "folder": summary_data.get("folder") or "Bài giảng chung",
        "tags": summary_data.get("tags") or ["Bài giảng"],
    }

    firebase_service.save_lecture_cache(lecture_url, result)
    return result


# ==============================================================================
# GIAI ĐOẠN 3: XỬ LÝ SONG SONG NGẦN CHO VIDEO DÀI (BACKGROUND CHUNK STREAMING)
# ==============================================================================

import threading

streaming_jobs = {}

def _run_background_transcription(job_id: str, audio_path: str, target_lang: str, src_lang: str):
    """
    Worker tiến trình ngầm cho VIDEO DÀI:
    - Bóc tách theo luồng Streaming Generator liên tục.
    - Cứ mỗi 3 câu mới (khoảng 8-15 giây audio), dịch ngay và nhồi trực tiếp vào job["segments"].
    - Đảm bảo người dùng xem tới đâu thì phụ đề đã có sẵn tới đó, gối đầu liên tục không bị khựng sau 30 giây!
    """
    try:
        job = streaming_jobs.get(job_id)
        if not job:
            return

        duration = float(job.get("duration_seconds") or 1800.0)
        # Giữ lại các câu 30s đầu đã được load ban đầu
        existing_segments = list(job.get("segments", []))
        all_segments = list(existing_segments)
        max_existing_end = max((float(s.get("end", 0)) for s in existing_segments), default=0.0)

        buffer_batch = []
        detected = "en"

        for raw_seg in whisper_service.transcribe_audio_generator(
            audio_path=audio_path,
            language=None if src_lang == "auto" else src_lang,
            task="transcribe"
        ):
            detected = raw_seg.get("detected_language") or detected

            # Bỏ qua các câu rơi vào khoảng 30s đầu đã được nạp trước đó
            if float(raw_seg.get("end", 0)) <= max_existing_end:
                continue

            buffer_batch.append(raw_seg)

            # Cứ mỗi 3 câu mới: Dịch ngay lập tức và bơm vào danh sách phụ đề đang chạy!
            if len(buffer_batch) >= 3:
                translated_batch = list(buffer_batch)
                if target_lang != detected:
                    try:
                        translated_batch = translation_service.translate_segments(
                            translated_batch,
                            source_lang=detected,
                            target_lang=target_lang
                        )
                    except Exception as te:
                        logger.warning(f"Lỗi dịch batch nhỏ: {te}")
                        for s in translated_batch:
                            s["translated_text"] = s.get("text", "")
                else:
                    for s in translated_batch:
                        s["translated_text"] = s.get("text", "")

                for item in translated_batch:
                    item["id"] = len(all_segments)
                    all_segments.append(item)

                buffer_batch = []

                # Cập nhật trực tiếp vào job để Frontend SyncPlayer nhận ngay ở lần poll tiếp theo
                job["segments"] = list(all_segments)
                job["detected_language"] = detected
                prog = min(95, max(10, int((float(raw_seg.get("end", 0)) / duration) * 100)))
                job["progress"] = prog

        # Dịch nốt các câu còn lại trong buffer nếu còn
        if buffer_batch:
            translated_batch = list(buffer_batch)
            if target_lang != detected:
                try:
                    translated_batch = translation_service.translate_segments(
                        translated_batch,
                        source_lang=detected,
                        target_lang=target_lang
                    )
                except Exception:
                    for s in translated_batch:
                        s["translated_text"] = s.get("text", "")
            else:
                for s in translated_batch:
                    s["translated_text"] = s.get("text", "")

            for item in translated_batch:
                item["id"] = len(all_segments)
                all_segments.append(item)

            job["segments"] = list(all_segments)

        # Toàn bộ video dài đã xong: Tạo Tóm tắt, Mindmap, Quiz siêu tốc
        transcript = " ".join(s.get("text", "") for s in all_segments)
        summary_data = summary_service.summarize_transcript(transcript, include_quiz=True)

        job["segments"] = all_segments
        job["detected_language"] = detected
        job["summary"] = summary_data.get("summary", "")
        job["key_points"] = summary_data.get("key_points", [])
        job["formulas_and_terms"] = summary_data.get("formulas_and_terms", [])
        job["quiz"] = normalize_quiz(summary_data.get("quiz", []))
        job["mindmap"] = summary_data.get("mindmap") or normalize_mindmap(None, default_title=job.get("title", ""), key_points=job.get("key_points"))
        job["exercises"] = summary_data.get("exercises") or normalize_exercises(None, key_points=job.get("key_points"))
        job["folder"] = summary_data.get("folder") or "Bài giảng chung"
        job["tags"] = summary_data.get("tags") or ["Bài giảng"]
        job["status"] = "completed"
        job["progress"] = 100

        full_res = {
            "video_url": job["video_url"],
            "title": job["title"],
            "duration_seconds": job["duration_seconds"],
            "language": target_lang,
            "detected_language": detected,
            "segments": all_segments,
            "summary": job["summary"],
            "key_points": job["key_points"],
            "formulas_and_terms": job["formulas_and_terms"],
            "quiz": job["quiz"],
            "mindmap": job["mindmap"],
            "exercises": job["exercises"],
            "folder": job["folder"],
            "tags": job["tags"]
        }
        firebase_service.save_lecture_cache(job["video_url"], full_res)
        logger.info(f"Đã hoàn thành nạp gối đầu toàn bộ video dài [{job.get('title')}]: {len(all_segments)} câu phụ đề.")
    except Exception as e:
        logger.error(f"Lỗi worker xử lý ngầm video: {e}")
        if job_id in streaming_jobs:
            streaming_jobs[job_id]["status"] = "failed"
            streaming_jobs[job_id]["error"] = str(e)
    finally:
        if os.path.exists(audio_path):
            try: os.remove(audio_path)
            except Exception: pass


@app.post("/api/video/stream-init")
async def init_streaming_video(request: ProcessVideoRequest):
    """
    Giai đoạn 3: Bắt đầu phát video tức thì & chạy ngầm AI xử lý các phân đoạn tiếp theo
    """
    url = request.video_url.strip()
    target_lang = (request.target_language or "vi").lower().strip()

    # Kiểm tra Firestore Cache nếu đã từng xử lý
    cached = firebase_service.get_lecture_cache(url)
    if cached:
        cached["is_streaming"] = False
        cached["mindmap"] = normalize_mindmap(cached.get("mindmap"), default_title=cached.get("title", ""), key_points=cached.get("key_points"))
        cached["exercises"] = normalize_exercises(cached.get("exercises"), key_points=cached.get("key_points"))
        return cached

    # Tải audio stream
    audio_info = audio_service.extract_audio_from_url(url, duration_limit_sec=None)
    audio_path = audio_info["audio_path"]
    job_id = uuid.uuid4().hex[:12]

    # Lookahead cực nhanh 30s đầu từ file audio_path cục bộ (chỉ mất 0.05 giây!)
    fast_segments = []
    fast_wav = os.path.join(tempfile.gettempdir(), f"fast_{job_id}.wav")
    try:
        import subprocess
        cmd = ["ffmpeg", "-y", "-i", audio_path, "-t", "30", "-ar", "16000", "-ac", "1", fast_wav]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        if os.path.exists(fast_wav):
            fast_segments, det = whisper_service.transcribe_audio(audio_path=fast_wav, task="transcribe")
            if target_lang != det:
                fast_segments = translation_service.translate_segments(fast_segments, source_lang=det, target_lang=target_lang)
    except Exception as e:
        logger.warning(f"Lỗi lookahead khởi đầu: {e}")
    finally:
        if os.path.exists(fast_wav):
            try: os.remove(fast_wav)
            except Exception: pass

    streaming_jobs[job_id] = {
        "job_id": job_id,
        "video_url": url,
        "title": audio_info["title"],
        "duration_seconds": audio_info["duration"],
        "status": "processing",
        "progress": 30,
        "segments": fast_segments,
        "language": target_lang
    }

    # Kích hoạt worker chạy ngầm song song
    worker = threading.Thread(
        target=_run_background_transcription,
        args=(job_id, audio_path, target_lang, request.source_language or "auto"),
        daemon=True
    )
    worker.start()

    return {
        "job_id": job_id,
        "video_url": url,
        "title": audio_info["title"],
        "duration_seconds": audio_info["duration"],
        "language": target_lang,
        "segments": fast_segments,
        "is_streaming": True,
        "status": "processing",
        "progress": 30,
        "summary": "AI đang bóc tách song song bài giảng ở chế độ nền trong khi bạn theo dõi video...",
        "key_points": ["Hệ thống streaming song song đang hoạt động"],
        "formulas_and_terms": [],
        "quiz": [],
        "mindmap": normalize_mindmap(None, default_title=audio_info["title"]),
        "exercises": []
    }


@app.get("/api/video/stream-status")
async def get_stream_status(job_id: str = Query(..., description="ID của phiên streaming")):
    """
    Kiểm tra trạng thái tiến trình xử lý ngầm và nhận danh sách phụ đề mới nhất
    """
    job = streaming_jobs.get(job_id)
    if not job:
        return {
            "job_id": job_id,
            "status": "not_found",
            "progress": 100,
            "segments": [],
            "is_completed": True,
            "error": "Phiên xử lý không tồn tại hoặc server vừa khởi động lại."
        }

    return {
        "job_id": job_id,
        "status": job.get("status"),
        "progress": job.get("progress", 0),
        "segments": job.get("segments", []),
        "summary": job.get("summary"),
        "key_points": job.get("key_points", []),
        "formulas_and_terms": job.get("formulas_and_terms", []),
        "quiz": job.get("quiz", []),
        "mindmap": job.get("mindmap"),
        "exercises": job.get("exercises", []),
        "is_completed": job.get("status") == "completed"
    }


@app.get("/api/video/info")
async def get_video_info_endpoint(video_url: str = Query(..., description="Đường link video YouTube hoặc bài giảng")):
    """
    Kiểm tra nhanh tiêu đề và thời lượng video (< 1 giây) để phân loại:
    - Dưới 30 phút (< 1800s): Xử lý toàn bộ (transcribe full).
    - Từ 30 phút trở lên (>= 1800s): Kích hoạt chế độ Xem ngay & Xử lý song song (streaming background).
    """
    url = video_url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp URL video hợp lệ.")
    
    # Kiểm tra Firestore cache trước
    cached = firebase_service.get_lecture_cache(url)
    if cached:
        duration = float(cached.get("duration_seconds", 0) or 0)
        return {
            "title": cached.get("title", "Bài giảng"),
            "duration_seconds": duration,
            "is_cached": True,
            "is_long_video": duration >= 1800
        }

    info = audio_service.get_video_info(url)
    duration = float(info.get("duration", 0) or 0)
    return {
        "title": info.get("title", "Bài giảng"),
        "duration_seconds": duration,
        "is_cached": False,
        "is_long_video": duration >= 1800
    }

