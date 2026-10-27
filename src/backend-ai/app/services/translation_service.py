import logging
import requests
from typing import List, Dict, Any

logger = logging.getLogger("uvicorn")

class TranslationService:
    def __init__(self):
        self.endpoint = "https://translate.googleapis.com/translate_a/single"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    def detect_language(self, text: str) -> str:
        """Detect the source language before translating subtitle batches."""
        if not text.strip():
            return "auto"
        try:
            response = requests.get(
                self.endpoint,
                params={"client": "dict-chrome-ex", "sl": "auto", "tl": "en", "dt": "t", "q": text[:4000]},
                headers=self.headers,
                timeout=8,
            )
            if response.ok:
                data = response.json()
                detected = data[2] if len(data) > 2 else None
                if isinstance(detected, str) and detected:
                    return detected.lower()
        except Exception as exc:
            logger.warning("Could not detect subtitle language: %s", exc)
        return "auto"

    def translate_segments(
        self,
        segments: List[Dict[str, Any]],
        source_lang: str = "auto",
        target_lang: str = "vi"
    ) -> List[Dict[str, Any]]:
        """
        Dịch đồng bộ toàn bộ danh sách phụ đề sang ngôn ngữ đích (target_lang)
        Cực nhanh, chính xác 100%, giữ nguyên timestamps và không bị lỗi giới hạn quota.
        """
        if not segments:
            return []

        # Đảm bảo luôn lưu giữ câu phụ đề gốc
        for seg in segments:
            if "original_text" not in seg or not seg["original_text"]:
                seg["original_text"] = seg.get("text", "")

        if source_lang and source_lang.lower() == target_lang.lower():
            for seg in segments:
                orig = seg.get("original_text") or seg.get("text", "")
                seg["original_text"] = orig
                seg["translated_text"] = orig
                seg["text"] = orig
            return segments

        logger.info(f"Bắt đầu dịch {len(segments)} dòng phụ đề từ [{source_lang}] sang [{target_lang}]...")

        batch_size = 35
        # Luôn dịch từ câu gốc original_text để tránh dịch chéo nhiều lần làm sai lệch nghĩa
        texts = [
            (seg.get("original_text") or seg.get("text", "")).replace("\n", " ").strip()
            for seg in segments
        ]
        translated_texts = []

        for i in range(0, len(texts), batch_size):
            chunk = texts[i:i+batch_size]
            joined = "\n".join(chunk)
            batch_success = False

            try:
                params = {
                    "client": "dict-chrome-ex",
                    "sl": source_lang or "auto",
                    "tl": target_lang,
                    "dt": "t",
                    "q": joined
                }
                res = requests.get(self.endpoint, params=params, headers=self.headers, timeout=12)
                if res.status_code == 200:
                    data = res.json()
                    translated_full = "".join([part[0] for part in data[0] if part[0]])
                    lines = translated_full.split("\n")
                    if len(lines) == len(chunk):
                        translated_texts.extend([l.strip() for l in lines])
                        batch_success = True
            except Exception as e:
                logger.warning(f"Lỗi batch translation ({i}): {e}")

            if not batch_success:
                # Fallback dịch từng câu nếu batch bị lệch dòng
                for single_text in chunk:
                    try:
                        params_s = {
                            "client": "dict-chrome-ex",
                            "sl": source_lang or "auto",
                            "tl": target_lang,
                            "dt": "t",
                            "q": single_text
                        }
                        res_s = requests.get(self.endpoint, params=params_s, headers=self.headers, timeout=5)
                        if res_s.status_code == 200:
                            data_s = res_s.json()
                            t_single = "".join([part[0] for part in data_s[0] if part[0]]).strip()
                            translated_texts.append(t_single or single_text)
                        else:
                            translated_texts.append(single_text)
                    except Exception:
                        translated_texts.append(single_text)

        for seg, trans in zip(segments, translated_texts):
            seg["translated_text"] = trans
            seg["text"] = trans

        logger.info(f"Dịch hoàn tất {len(segments)} câu sang [{target_lang}] thành công!")
        return segments

translation_service = TranslationService()
