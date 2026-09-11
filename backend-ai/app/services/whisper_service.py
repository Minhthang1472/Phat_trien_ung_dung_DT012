import logging
import os
from faster_whisper import WhisperModel
from app.core.config import settings

logger = logging.getLogger("uvicorn")

class WhisperService:
    def __init__(self):
        self.model = None

    def load_model(self):
        if self.model is None:
            model_size = settings.WHISPER_MODEL_SIZE
            device = settings.WHISPER_DEVICE
            compute_type = settings.WHISPER_COMPUTE_TYPE
            
            logger.info(f"Đang tải mô hình faster-whisper [{model_size}] trên [{device} - {compute_type}]...")
            try:
                self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
                logger.info(f"Đã tải thành công mô hình Whisper trên GPU {device}!")
            except Exception as e:
                logger.warning(f"Không thể tải trên GPU ({e}). Tự động chuyển sang chế độ CPU (int8)...")
                self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
                logger.info("Đã tải mô hình Whisper trên CPU.")

    def transcribe_audio(self, audio_path: str, language: str = None, task: str = "transcribe") -> tuple:
        self.load_model()
        
        logger.info(f"Đang phiên âm: {audio_path} (Task: {task}, Lang: {language})...")
        try:
            segments_generator, info = self.model.transcribe(
                audio_path,
                beam_size=5,
                language=language if language and language != "auto" else None,
                task=task,
                vad_filter=True, # Lọc khoảng lặng không có tiếng nói
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            subtitles = []
            for idx, segment in enumerate(segments_generator):
                subtitles.append({
                    "id": idx,
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": segment.text.strip()
                })
                
            return subtitles, info.language
        except RuntimeError as e:
            if "cublas" in str(e).lower() or "cuda" in str(e).lower():
                logger.warning(f"Gặp lỗi CUDA ({e}). Đang tự động chuyển sang mô hình CPU...")
                self.model = WhisperModel(settings.WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
                return self.transcribe_audio(audio_path, language, task)
            raise e

whisper_service = WhisperService()
