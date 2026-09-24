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

from app.core.config import settings
from app.firebase_database import firebase_service
from app.models.schemas import ProcessVideoRequest, ProcessVideoResponse, SubtitleSegment, LookaheadSubtitleRequest, BurnSubtitlesRequest
from app.services.audio_service import audio_service
from app.services.whisper_service import whisper_service
from app.services.summary_service import summary_service
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

    # 1. Kiểm tra cache trong Firebase Firestore (tiết kiệm 100% Token Gemini!)
    target_lang = (request.target_language or "vi").lower().strip()
    cached_fb = firebase_service.get_lecture_cache(url)
    if cached_fb:
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

    # 2. Bóc tách âm thanh siêu nhẹ bằng yt-dlp
    try:
        audio_info = audio_service.extract_audio_from_url(
            url, 
            duration_limit_sec=request.max_duration_seconds
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi khi bóc tách âm thanh: {e}")
        raise HTTPException(status_code=500, detail=f"Không thể bóc tách âm thanh từ URL ({e})")

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
        "quiz": summary_data.get("quiz", [])
    }

    # 6. Lưu vào Firebase Firestore làm kho lưu vĩnh cửu
    firebase_service.save_lecture_cache(url, result)

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
    source_language: Optional[str] = Form("auto", description="Ngôn ngữ nguồn (auto, vi, en, ja...)"),
    target_language: Optional[str] = Form("vi", description="Ngôn ngữ phụ đề muốn xuất (vi, en, ja...)"),
    include_quiz: Optional[bool] = Form(True, description="Tùy chọn tạo bài trắc nghiệm hay không")
):
    """
    Tiếp nhận file ghi âm hoặc video bài giảng tải trực tiếp từ máy tính
    """
    try:
        contents = await file.read()
        # Lưu file để có thể phát trực tiếp trên Web / App
        safe_fname = os.path.basename(file.filename or "lecture.mp4")
        if not safe_fname.lower().endswith((".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v")):
            raise HTTPException(status_code=415, detail="Chỉ hỗ trợ file video để tạo MP4 phụ đề.")
        unique_name = f"{uuid.uuid4().hex[:12]}_{safe_fname}"
        saved_file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(saved_file_path, "wb") as f_saved:
            f_saved.write(contents)
        media_stream_url = f"/uploads/{unique_name}"

        audio_info = audio_service.extract_audio_from_file(
            file_bytes=contents,
            filename=file.filename or "upload_audio.mp4",
            duration_limit_sec=max_duration_seconds
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi khi đọc file upload: {e}")
        raise HTTPException(status_code=400, detail=f"Không thể xử lý file tải lên: {e}")

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
        "quiz": summary_data.get("quiz", [])
    }

    # Lưu vào Firebase Firestore làm kho lưu vĩnh cửu
    firebase_service.save_lecture_cache(result["video_url"], result)

    return result

@app.post("/api/video/burn-subtitles")
async def burn_subtitles_into_video(request: BurnSubtitlesRequest):
    """Render translated subtitle timestamps directly into an uploaded MP4."""
    if not request.media_url.startswith("/uploads/"):
        raise HTTPException(status_code=400, detail="Chi co the chen phu de vao video da upload len he thong.")

    source_name = os.path.basename(request.media_url)
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
        "quiz": summary_data.get("quiz", []),
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
