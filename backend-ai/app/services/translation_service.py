import logging
import requests
from typing import List, Dict, Any

logger = logging.getLogger("uvicorn")

class TranslationService:
    def __init__(self):
        self.endpoint = "https://translate.googleapis.com/translate_a/single"

    def translate_text(self, text: str, source_lang: str = "auto", target_lang: str = "vi") -> str:
        """
        Dịch đoạn văn bản sang ngôn ngữ đích miễn phí 100% không cần khóa API.
        """
        if not text or not text.strip():
            return text

        if source_lang == target_lang:
            return text

        try:
            params = {
                "client": "gtx",
                "sl": source_lang or "auto",
                "tl": target_lang,
                "dt": "t",
                "q": text
            }
            res = requests.get(self.endpoint, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                translated = "".join([part[0] for part in data[0] if part[0]])
                return translated.strip()
        except Exception as e:
            logger.warning(f"Lỗi dịch thuật câu '{text[:30]}...': {e}")

        return text

    def translate_segments(self, segments: List[Dict[str, Any]], source_lang: str = "auto", target_lang: str = "vi") -> List[Dict[str, Any]]:
        """
        Dịch đồng bộ toàn bộ danh sách phụ đề, giữ nguyên 100% timestamps (start/end) của từng câu.
        Bổ sung trường `translated_text` vào từng segment.
        """
        if not segments or source_lang == target_lang:
            return segments

        logger.info(f"Đang dịch {len(segments)} dòng phụ đề từ [{source_lang}] sang [{target_lang}]...")

        for seg in segments:
            original = seg.get("text", "")
            seg["original_text"] = original
            seg["translated_text"] = self.translate_text(original, source_lang=source_lang, target_lang=target_lang)
            # Gán text chính là bản dịch để hiển thị mặc định
            seg["text"] = seg["translated_text"]

        return segments

translation_service = TranslationService()
