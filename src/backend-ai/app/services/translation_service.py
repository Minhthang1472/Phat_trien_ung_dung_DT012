import hashlib
import json
import logging
import re
from typing import Any, Dict, List, Optional

import requests

from app.core.config import settings

logger = logging.getLogger("uvicorn")

# Từ điển chuyên ngành dùng để "neo" nghĩa trước khi dịch.
# Đây là lớp bảo hiểm cuối cùng: sau khi Google/Gemini dịch, các thuật ngữ
# còn sót ở dạng gốc sẽ được thay bằng bản dịch chuẩn trong lĩnh vực.
DOMAIN_GLOSSARY = {
    "vi": {
        "artificial intelligence": "trí tuệ nhân tạo",
        "machine learning": "học máy",
        "deep learning": "học sâu",
        "neural network": "mạng nơ-ron",
        "supervised learning": "học có giám sát",
        "unsupervised learning": "học không giám sát",
        "reinforcement learning": "học tăng cường",
        "training data": "dữ liệu huấn luyện",
        "training set": "tập huấn luyện",
        "test set": "tập kiểm thử",
        "dataset": "tập dữ liệu",
        "feature engineering": "kỹ thuật đặc trưng",
        "feature extraction": "trích xuất đặc trưng",
        "gradient descent": "hạ gradient",
        "loss function": "hàm mất mát",
        "activation function": "hàm kích hoạt",
        "confusion matrix": "ma trận nhầm lẫn",
        "precision": "độ chính xác dương",
        "recall": "độ phủ",
        "overfitting": "quá khớp",
        "underfitting": "chưa khớp",
        "natural language processing": "xử lý ngôn ngữ tự nhiên",
        "computer vision": "thị giác máy tính",
        "operating system": "hệ điều hành",
        "virtual memory": "bộ nhớ ảo",
        "page table": "bảng trang",
        "context switch": "chuyển ngữ cảnh",
        "data structure": "cấu trúc dữ liệu",
        "algorithm complexity": "độ phức tạp thuật toán",
        "time complexity": "độ phức tạp thời gian",
        "space complexity": "độ phức tạp không gian",
        "database management system": "hệ quản trị cơ sở dữ liệu",
        "cloud computing": "điện toán đám mây",
        "big data": "dữ liệu lớn",
        "data science": "khoa học dữ liệu",
        "supply chain": "chuỗi cung ứng",
        "financial statement": "báo cáo tài chính",
        "opportunity cost": "chi phí cơ hội",
    },
    "en": {
        "trí tuệ nhân tạo": "artificial intelligence",
        "học máy": "machine learning",
        "học sâu": "deep learning",
        "mạng nơ-ron": "neural network",
        "học có giám sát": "supervised learning",
        "học không giám sát": "unsupervised learning",
        "học tăng cường": "reinforcement learning",
        "tập dữ liệu": "dataset",
        "dữ liệu huấn luyện": "training data",
        "hàm mất mát": "loss function",
        "hàm kích hoạt": "activation function",
        "ma trận nhầm lẫn": "confusion matrix",
        "quá khớp": "overfitting",
        "chưa khớp": "underfitting",
        "xử lý ngôn ngữ tự nhiên": "natural language processing",
        "thị giác máy tính": "computer vision",
        "hệ điều hành": "operating system",
        "bộ nhớ ảo": "virtual memory",
        "bảng trang": "page table",
        "chuyển ngữ cảnh": "context switch",
        "cấu trúc dữ liệu": "data structure",
        "điện toán đám mây": "cloud computing",
        "dữ liệu lớn": "big data",
        "khoa học dữ liệu": "data science",
        "chuỗi cung ứng": "supply chain",
        "báo cáo tài chính": "financial statement",
        "chi phí cơ hội": "opportunity cost",
    },
}

# Các từ viết hoa phổ biến ở đầu câu / từ nối không nên coi là thuật ngữ.
_STOP_TERMS = {
    "the", "this", "that", "these", "those", "and", "but", "for", "with",
    "from", "into", "when", "where", "what", "which", "while", "your", "you",
    "our", "their", "there", "here", "today", "next", "first", "second",
    "third", "finally", "however", "therefore", "because", "also", "then",
    "chúng", "chúng ta", "bài", "bài giảng", "hôm nay", "tiếp theo", "cuối cùng",
}

_TERM_PATTERN = re.compile(
    r"\b([A-Z][A-Za-z0-9+#.-]*(?:\s+[A-Z][A-Za-z0-9+#.-]*){0,3})\b"
)
_ACRONYM_PATTERN = re.compile(r"\b([A-Z]{2,8})\b")

# Kích thước "cửa sổ ngữ cảnh" khi dịch. Thay vì dịch từng câu rời rạc,
# mỗi request gửi cả một đoạn liền mạch để model giữ được mạch nghĩa.
CONTEXT_BLOCK_CHARS = 1300
CONTEXT_BLOCK_LINES = 14


class TranslationService:
    def __init__(self):
        self.endpoint = "https://translate.googleapis.com/translate_a/single"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        self._brief_cache: Dict[str, Dict[str, Any]] = {}
        self.gemini_client = None
        self.gemini_model = "gemini-2.5-flash"
        if settings.GEMINI_API_KEY:
            try:
                from google import genai

                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as exc:
                logger.warning("Could not initialise Gemini for contextual translation: %s", exc)
                self.gemini_client = None

    # ------------------------------------------------------------------
    # Phát hiện ngôn ngữ
    # ------------------------------------------------------------------
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

    # ------------------------------------------------------------------
    # Xây dựng ngữ cảnh + từ điển chuyên ngành cho cả video
    # ------------------------------------------------------------------
    def _extract_domain_terms(self, segments: List[Dict[str, Any]]) -> List[str]:
        text = " ".join(
            (seg.get("original_text") or seg.get("text") or "").strip()
            for seg in segments[:120]
        )
        if not text:
            return []

        counts: Dict[str, int] = {}
        for match in _TERM_PATTERN.finditer(text):
            term = match.group(1).strip(" .,:;!?()[]{}")
            if len(term) < 3:
                continue
            if term.lower() in _STOP_TERMS:
                continue
            counts[term] = counts.get(term, 0) + 1

        for match in _ACRONYM_PATTERN.finditer(text):
            term = match.group(1)
            if term.lower() in _STOP_TERMS or len(term) < 2:
                continue
            counts[term] = counts.get(term, 0) + 1

        ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
        return [
            term for term, count in ordered
            if count >= 2 or term.isupper()
        ][:18]

    def _quick_context(self, segments: List[Dict[str, Any]], video_title: str = "") -> str:
        texts = [
            (seg.get("original_text") or seg.get("text") or "").strip()
            for seg in segments
            if (seg.get("original_text") or seg.get("text") or "").strip()
        ]
        if not texts:
            return video_title or ""
        head = " ".join(texts[:4])[:320]
        tail = " ".join(texts[-4:])[-240:]
        title = f'Bài giảng "{video_title}". ' if video_title else ""
        return f"{title}Mở đầu: {head} ... Kết thúc: {tail}"

    def build_video_brief(
        self,
        segments: List[Dict[str, Any]],
        video_title: str = "",
        source_lang: str = "auto",
        target_lang: str = "vi",
    ) -> Dict[str, Any]:
        """Tạo "translation brief": ngữ cảnh tổng thể + glossary trước khi dịch.

        - Luôn có glossary cục bộ theo lĩnh vực (DOMAIN_GLOSSARY).
        - Nếu có Gemini, gọi đúng 1 lần để bổ sung ngữ cảnh/glossary chuyên sâu.
        - Kết quả được cache theo nội dung để không gọi lại cho cùng video.
        """
        glossary = dict(DOMAIN_GLOSSARY.get((target_lang or "vi").lower(), {}))
        context = self._quick_context(segments, video_title)
        terms = self._extract_domain_terms(segments)

        if not self.gemini_client or not segments:
            return {"context": context, "glossary": glossary, "terms": terms}

        joined = " ".join(
            (seg.get("original_text") or seg.get("text") or "").strip()
            for seg in segments[:80]
        ).strip()
        if len(joined) < 40:
            return {"context": context, "glossary": glossary, "terms": terms}

        cache_key = hashlib.sha1(
            f"{video_title}|{source_lang}|{target_lang}|{joined[:2500]}".encode("utf-8")
        ).hexdigest()
        if cache_key in self._brief_cache:
            return self._brief_cache[cache_key]

        prompt = f"""
Bạn là chuyên gia biên dịch bài giảng học thuật. Hãy đọc ngữ cảnh video dưới đây và tạo một "translation brief" cho người dịch.

THÔNG TIN:
- Tiêu đề: {video_title or "(không có)"}
- Ngôn ngữ nguồn: {source_lang or "auto"}
- Ngôn ngữ đích: {target_lang}
- Trích đoạn phụ đề: {joined[:2200]}

YÊU CẦU:
1. "context": 1-2 câu mô tả chủ đề, lĩnh vực chuyên môn và văn phong của bài giảng.
2. "glossary": tối đa 12 thuật ngữ chuyên ngành thực sự quan trọng, mỗi mục gồm "source" (thuật ngữ gốc) và "target" (bản dịch chuẩn trong lĩnh vực, ưu tiên cách diễn đạt tự nhiên của ngôn ngữ đích). Giữ nguyên tên riêng, tên sản phẩm và acronym phổ biến.
3. Không thêm thuật ngữ chung chung, không giải thích ngoài JSON.

Chỉ trả về JSON đúng dạng:
{{"context": "...", "glossary": [{{"source": "...", "target": "..."}}]}}
"""
        try:
            from google.genai import types

            response = self.gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            parsed = self._parse_json(response.text or "")
            extra_context = str(parsed.get("context") or "").strip()
            if extra_context:
                context = extra_context
            for item in parsed.get("glossary") or []:
                if not isinstance(item, dict):
                    continue
                source = str(item.get("source") or "").strip()
                target = str(item.get("target") or "").strip()
                if source and target and source.lower() != target.lower():
                    glossary[source] = target
        except Exception as exc:
            logger.warning("Gemini translation brief failed, using local glossary: %s", exc)

        if len(self._brief_cache) > 32:
            self._brief_cache.clear()
        brief = {"context": context, "glossary": glossary, "terms": terms}
        self._brief_cache[cache_key] = brief
        return brief

    @staticmethod
    def _parse_json(raw_text: str) -> dict:
        text = (raw_text or "").strip()
        if text.startswith("```"):
            text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
            text = re.sub(r"\s*```$", "", text).strip()
        try:
            return json.loads(text)
        except Exception:
            match = re.search(r"(\{.*\})", text, re.DOTALL)
            if match:
                try:
                    return json.loads(re.sub(r",\s*([\]\}])", r"\1", match.group(1)))
                except Exception:
                    pass
        return {}

    # ------------------------------------------------------------------
    # Dịch theo cửa sổ ngữ cảnh
    # ------------------------------------------------------------------
    @staticmethod
    def _build_blocks(texts: List[str]) -> List[List[int]]:
        blocks: List[List[int]] = []
        current: List[int] = []
        current_chars = 0
        for index, text in enumerate(texts):
            length = len(text or "")
            if current and (
                current_chars + length > CONTEXT_BLOCK_CHARS
                or len(current) >= CONTEXT_BLOCK_LINES
            ):
                blocks.append(current)
                current = []
                current_chars = 0
            current.append(index)
            current_chars += length + 1
        if current:
            blocks.append(current)
        return blocks

    def _google_batch(
        self,
        lines: List[str],
        source_lang: str,
        target_lang: str,
    ) -> Optional[List[str]]:
        """Dịch một đoạn liền mạch, giữ nguyên số dòng."""
        if not lines:
            return []
        joined = "\n".join(lines)
        try:
            params = {
                "client": "dict-chrome-ex",
                "sl": source_lang or "auto",
                "tl": target_lang,
                "dt": "t",
                "q": joined,
            }
            res = requests.get(self.endpoint, params=params, headers=self.headers, timeout=14)
            if res.status_code != 200:
                return None
            data = res.json()
            translated_full = "".join([part[0] for part in data[0] if part[0]])
            translated_lines = translated_full.split("\n")
            if len(translated_lines) != len(lines):
                return None
            return [line.strip() for line in translated_lines]
        except Exception as exc:
            logger.warning("Google context translation failed: %s", exc)
            return None

    def _translate_lines(
        self,
        lines: List[str],
        source_lang: str,
        target_lang: str,
    ) -> List[str]:
        """Dịch cả block; nếu lệch dòng thì thu nhỏ dần để bảo toàn timestamp."""
        result = self._google_batch(lines, source_lang, target_lang)
        if result is not None and len(result) == len(lines):
            return result

        output: List[str] = []
        for start in range(0, len(lines), 4):
            sub_lines = lines[start:start + 4]
            sub_result = self._google_batch(sub_lines, source_lang, target_lang)
            if sub_result is not None and len(sub_result) == len(sub_lines):
                output.extend(sub_result)
                continue
            for line in sub_lines:
                single = self._google_batch([line], source_lang, target_lang)
                output.append(single[0] if single else line)
        return output

    @staticmethod
    def _apply_glossary(text: str, glossary: Dict[str, str]) -> str:
        """Thay các thuật ngữ còn sót ở dạng gốc bằng bản dịch chuẩn."""
        if not text or not glossary:
            return text
        for source, target in sorted(glossary.items(), key=lambda item: len(item[0]), reverse=True):
            if not source or not target or source.lower() == target.lower():
                continue
            pattern = re.compile(
                r"(?<![\w-])" + re.escape(source) + r"(?![\w-])",
                re.IGNORECASE,
            )
            if pattern.search(text):
                text = pattern.sub(target, text)
        return text

    def translate_segments(
        self,
        segments: List[Dict[str, Any]],
        source_lang: str = "auto",
        target_lang: str = "vi",
        video_title: str = "",
        context: Optional[str] = None,
        glossary: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Dịch phụ đề theo ngữ cảnh đoạn/video thay vì từng câu rời rạc.

        - Gom các câu liên tiếp thành block ~14 dòng / 1300 ký tự.
        - Dịch cả block để giữ mạch nghĩa, sau đó mới tách lại theo dòng.
        - Áp dụng glossary chuyên ngành + ngữ cảnh video đã chuẩn bị trước.
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

        if context is None and glossary is None:
            brief = self.build_video_brief(
                segments,
                video_title=video_title,
                source_lang=source_lang,
                target_lang=target_lang,
            )
            context = brief.get("context")
            glossary = brief.get("glossary")
        elif glossary is None:
            glossary = dict(DOMAIN_GLOSSARY.get((target_lang or "vi").lower(), {}))
        elif context is None:
            context = self._quick_context(segments, video_title)

        glossary = glossary or {}
        logger.info(
            "Bắt đầu dịch %s dòng phụ đề từ [%s] sang [%s] theo ngữ cảnh (%s thuật ngữ). Ngữ cảnh: %s",
            len(segments), source_lang, target_lang, len(glossary),
            (context or "")[:160],
        )

        texts = [
            (seg.get("original_text") or seg.get("text", "")).replace("\n", " ").strip()
            for seg in segments
        ]
        translated_texts: List[str] = list(texts)

        for block in self._build_blocks(texts):
            non_empty = [idx for idx in block if texts[idx]]
            if not non_empty:
                continue
            block_lines = [texts[idx] for idx in non_empty]
            block_result = self._translate_lines(block_lines, source_lang, target_lang)
            for idx, translated in zip(non_empty, block_result):
                translated_texts[idx] = translated or texts[idx]

        for index, trans in enumerate(translated_texts):
            translated_texts[index] = self._apply_glossary(trans, glossary)

        for seg, trans in zip(segments, translated_texts):
            seg["translated_text"] = trans
            seg["text"] = trans

        logger.info("Dịch hoàn tất %s câu sang [%s] thành công!", len(segments), target_lang)
        return segments


translation_service = TranslationService()
