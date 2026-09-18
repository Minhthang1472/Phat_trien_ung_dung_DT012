import os
from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.middleware.cors import CORSMiddleware
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
    cached_fb = firebase_service.get_lecture_cache(url)
    if cached_fb:
        logger.info(f"Tìm thấy kết quả trong FIREBASE CACHE cho video: {url}")
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
        # Nếu muốn dịch sang tiếng Anh trực tiếp, dùng task translate của Whisper
        target_lang = (request.target_language or "vi").lower().strip()
        task = "translate" if target_lang == "en" and request.source_language not in ("en", "english") else "transcribe"
        
        segments, detected_lang = whisper_service.transcribe_audio(
            audio_path=audio_path,
            language=None if request.source_language == "auto" else request.source_language,
            task=task
        )
    except Exception as e:
        logger.error(f"Lỗi khi chạy mô hình Whisper: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi phiên âm giọng nói AI ({e})")
    finally:
        # Xóa file audio tạm để tiết kiệm ổ cứng
        if os.path.exists(audio_path):
            try: os.remove(audio_path)
            except Exception: pass

    # 4. Dịch thuật đồng bộ nếu ngôn ngữ đích khác ngôn ngữ phát hiện được (ví dụ dịch sang tiếng Việt vi)
    if target_lang != "en" and target_lang != detected_lang:
        segments = translation_service.translate_segments(
            segments, 
            source_lang=detected_lang, 
            target_lang=target_lang
        )

    # 5. Tóm tắt nội dung bài giảng 4 phần (Tổng quan, Điểm chính, Thuật ngữ, Trắc nghiệm)
    full_transcript = " ".join([seg.get("text", "") for seg in segments])
    summary_data = summary_service.summarize_transcript(full_transcript)

    result = {
        "video_url": url,
        "title": audio_info["title"],
        "duration_seconds": audio_info["duration"],
        "language": detected_lang,
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
    target_language: Optional[str] = Form("vi", description="Ngôn ngữ phụ đề muốn xuất (vi, en, ja...)")
):
    """
    Tiếp nhận file ghi âm hoặc video bài giảng tải trực tiếp từ máy tính
    """
    try:
        contents = await file.read()
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
        task = "translate" if target_lang == "en" and source_language not in ("en", "english") else "transcribe"
        
        segments, detected_lang = whisper_service.transcribe_audio(
            audio_path=audio_path,
            language=None if source_language == "auto" else source_language,
            task=task
        )
    except Exception as e:
        logger.error(f"Lỗi khi nhận diện giọng nói: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi phiên âm: {e}")
    finally:
        if os.path.exists(audio_path):
            try: os.remove(audio_path)
            except Exception: pass

    # Dịch thuật nếu cần
    if target_lang != "en" and target_lang != detected_lang:
        segments = translation_service.translate_segments(
            segments, 
            source_lang=detected_lang, 
            target_lang=target_lang
        )

    # Tóm tắt
    full_transcript = " ".join([seg.get("text", "") for seg in segments])
    summary_data = summary_service.summarize_transcript(full_transcript)

    result = {
        "video_url": f"local_file://{file.filename}",
        "title": audio_info["title"],
        "duration_seconds": audio_info["duration"],
        "language": detected_lang,
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
