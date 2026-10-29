import logging
import os

# Tự động vá (patch) PyAV nếu đang dùng phiên bản mới (av >= 19.0) không còn hỗ trợ tham số metadata_errors
try:
    import av
    _orig_av_open = av.open
    def _safe_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)
    av.open = _safe_av_open
except Exception:
    pass

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

    @staticmethod
    def _split_long_segment(segment_dict: dict, max_duration: float = 4.5) -> list:
        """Tự động chia nhỏ các đoạn phụ đề dài thành từng câu ngắn khớp thời gian thực"""
        start = segment_dict["start"]
        end = segment_dict["end"]
        text = segment_dict.get("text", "").strip()
        duration = end - start

        if duration <= max_duration or len(text) < 20:
            return [segment_dict]

        import re
        # Bước 1: Thử chia theo dấu kết câu (. ! ? 。 ！？ \n)
        parts = [s.strip() for s in re.split(r'([.!?。！？\n]+)', text) if s.strip()]
        combined = []
        i = 0
        while i < len(parts):
            if i + 1 < len(parts) and re.match(r'^[.!?。！？\n]+$', parts[i + 1]):
                combined.append(parts[i] + parts[i + 1])
                i += 2
            else:
                combined.append(parts[i])
                i += 1

        # Bước 2: Nếu chưa đủ nhỏ, tiếp tục chia theo dấu phẩy, chấm phẩy, gạch ngang (, ; : 、 ， ： -)
        if len(combined) <= 1:
            sub_parts = [s.strip() for s in re.split(r'([,;:、，：—\-]+)', text) if s.strip()]
            combined = []
            i = 0
            while i < len(sub_parts):
                if i + 1 < len(sub_parts) and re.match(r'^[,;:、，：—\-]+$', sub_parts[i + 1]):
                    combined.append(sub_parts[i] + sub_parts[i + 1])
                    i += 2
                else:
                    combined.append(sub_parts[i])
                    i += 1

        # Bước 3: Nếu nói liên tục không ngắt nghỉ (> 4.5s): chia đều theo cụm từ (6-8 từ)
        if len(combined) <= 1 and duration > max_duration:
            words = text.split()
            if len(words) >= 6:
                num_chunks = max(2, round(duration / 3.5))
                chunk_size = max(4, round(len(words) / num_chunks))
                combined = [" ".join(words[k:k+chunk_size]) for k in range(0, len(words), chunk_size) if words[k:k+chunk_size]]

        if len(combined) <= 1:
            return [segment_dict]

        total_chars = sum(len(c) for c in combined)
        if total_chars == 0:
            return [segment_dict]

        result = []
        cur_start = start
        for c in combined:
            c_dur = duration * (len(c) / total_chars)
            c_end = min(end, cur_start + c_dur)
            result.append({
                "start": round(cur_start, 2),
                "end": round(c_end, 2),
                "text": c.strip()
            })
            cur_start = c_end

        return result

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
                vad_parameters=dict(min_silence_duration_ms=500),
                condition_on_previous_text=False, # Chống ảo giác và lặp câu
                initial_prompt="Video bài giảng, ký sự, du lịch, ẩm thực, phát âm tiếng Việt rõ ràng, bóc tách chính xác từ ngữ, ánh sáng, văn hóa và địa danh."
            )

            raw_subtitles = []
            for segment in segments_generator:
                raw_subtitles.append({
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": segment.text.strip()
                })

            subtitles = []
            cur_id = 0
            for raw_seg in raw_subtitles:
                for chunk in WhisperService._split_long_segment(raw_seg):
                    chunk["id"] = cur_id
                    subtitles.append(chunk)
                    cur_id += 1
                
            return subtitles, info.language
        except RuntimeError as e:
            if "cublas" in str(e).lower() or "cuda" in str(e).lower():
                logger.warning(f"Gặp lỗi CUDA ({e}). Đang tự động chuyển sang mô hình CPU...")
                self.model = WhisperModel(settings.WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
                return self.transcribe_audio(audio_path, language, task)
            raise e

    def transcribe_audio_generator(self, audio_path: str, language: str = None, task: str = "transcribe"):
        """
        Nhận diện giọng nói theo luồng Generator (yield từng câu ngay khi Whisper xử lý xong),
        giúp tiến trình ngầm cho video dài có thể nạp phụ đề gối đầu liên tục theo thời gian thực.
        """
        self.load_model()
        logger.info(f"Đang bóc tách theo dòng thời gian thực: {audio_path}...")
        try:
            segments_generator, info = self.model.transcribe(
                audio_path,
                beam_size=5,
                language=language if language and language != "auto" else None,
                task=task,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500),
                condition_on_previous_text=False,
                initial_prompt="Video bài giảng, ký sự, du lịch, ẩm thực, phát âm tiếng Việt rõ ràng, bóc tách chính xác từ ngữ, ánh sáng, văn hóa và địa danh."
            )
            detected_lang = info.language
            for idx, segment in enumerate(segments_generator):
                yield {
                    "id": idx,
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": segment.text.strip(),
                    "detected_language": detected_lang
                }
        except RuntimeError as e:
            if "cublas" in str(e).lower() or "cuda" in str(e).lower():
                logger.warning(f"Gặp lỗi CUDA ({e}). Đang tự động chuyển sang mô hình CPU...")
                self.model = WhisperModel(settings.WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
                yield from self.transcribe_audio_generator(audio_path, language, task)
            else:
                raise e

whisper_service = WhisperService()
