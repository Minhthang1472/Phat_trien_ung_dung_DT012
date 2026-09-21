import os
from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uuid
import logging

from app.core.config import settings
from app.firebase_database import firebase_service
from app.models.schemas import ProcessVideoRequest, ProcessVideoResponse, SubtitleSegment
from app.services.audio_service import audio_service
from app.services.whisper_service import whisper_service
from app.services.summary_service import summary_service
from app.services.translation_service import translation_service
from app.services.subtitle_exporter import subtitle_exporter
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
        safe_fname = file.filename or "lecture.mp4"
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
