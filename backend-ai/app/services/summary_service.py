import logging
import json
import re
import requests
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger("uvicorn")

def normalize_quiz(raw_quiz) -> list:
    """Đảm bảo mọi phần tử trong quiz đều là dictionary hợp lệ theo schema Pydantic, có timestamp_sec."""
    if not isinstance(raw_quiz, list):
        return []
    clean_quiz = []
    for item in raw_quiz:
        if isinstance(item, dict):
            q_text = item.get("question") or item.get("title") or "Câu hỏi ôn tập"
            opts = item.get("options")
            if not isinstance(opts, list) or len(opts) < 2:
                opts = ["A. Đúng", "B. Sai", "C. Cần xem xét thêm", "D. Ý kiến khác"]
            ans = item.get("correct_answer") or item.get("answer") or "A"
            exp = item.get("explanation") or "Dựa trên nội dung bài giảng."
            raw_ts = item.get("timestamp_sec") or item.get("time_sec") or item.get("timestamp")
            try:
                ts_val = round(float(raw_ts), 1) if raw_ts is not None else None
            except (ValueError, TypeError):
                ts_val = None

            clean_quiz.append({
                "question": str(q_text).strip(),
                "options": [str(o) for o in opts],
                "correct_answer": str(ans).strip(),
                "answer": str(ans).strip(),
                "explanation": str(exp).strip(),
                "timestamp_sec": ts_val
            })
        elif isinstance(item, str) and item.strip():
            # Nếu LLM trả về dạng chuỗi câu hỏi tự luận, tự động chuyển thành format trắc nghiệm chuẩn
            clean_quiz.append({
                "question": item.strip(),
                "options": [
                    "A. Hoàn toàn đồng ý",
                    "B. Cần thêm cơ sở phân tích",
                    "C. Không phù hợp với ngữ cảnh",
                    "D. Góc nhìn khác"
                ],
                "correct_answer": "A",
                "answer": "A",
                "explanation": "Câu hỏi gợi mở củng cố kiến thức từ bài giảng.",
                "timestamp_sec": None
            })
    return clean_quiz


def normalize_mindmap(raw_map, default_title="Chủ đề bài học", key_points=None, terms=None) -> dict:
    """Đảm bảo cấu trúc cây phân cấp (Mindmap) hợp lệ với title và mảng children."""
    if isinstance(raw_map, dict) and raw_map.get("title") and isinstance(raw_map.get("children"), list):
        def clean_node(n):
            title = str(n.get("title") or n.get("name") or "Nhánh kiến thức").strip()
            raw_children = n.get("children") or []
            clean_children = [clean_node(c) for c in raw_children if isinstance(c, dict)]
            return {"title": title, "children": clean_children}
        return clean_node(raw_map)

    # Nếu AI chưa trả về mindmap, tự động trích xuất từ key_points & terms
    kp = key_points or ["Khái niệm cốt lõi", "Quy trình phân tích", "Ý nghĩa ứng dụng"]
    tm = terms or []
    branches = []
    for idx, p in enumerate(kp[:4]):
        parts = p.split(":", 1)
        b_title = parts[0].strip() if len(parts) > 1 else f"Luận điểm {idx+1}"
        detail = parts[1].strip() if len(parts) > 1 else p.strip()
        branches.append({
            "title": b_title[:60],
            "children": [{"title": detail[:90], "children": []}]
        })
    if tm:
        branches.append({
            "title": "Thuật ngữ & Công thức",
            "children": [{"title": str(t)[:80], "children": []} for t in tm[:3]]
        })

    return {
        "title": default_title[:50] if default_title else "Tổng quan bài học",
        "children": branches
    }


def normalize_exercises(raw_exercises, key_points=None) -> list:
    """Đảm bảo danh sách bài tập ôn luyện (Flashcards & Tự luận) đầy đủ và hợp lệ."""
    if isinstance(raw_exercises, list) and len(raw_exercises) > 0:
        clean = []
        for item in raw_exercises:
            if isinstance(item, dict):
                clean.append({
                    "question": str(item.get("question") or "Khái niệm trọng tâm?").strip(),
                    "answer": str(item.get("answer") or "Tham khảo nội dung bài học.").strip(),
                    "hint": str(item.get("hint") or "Xem lại phần tóm tắt lý thuyết.").strip()
                })
        if clean:
            return clean

    # Tự động tạo bài tập củng cố từ key_points
    kp = key_points or [
        "Nắm vững các định nghĩa và thuật ngữ cốt lõi được giảng dạy trong video.",
        "Hiểu rõ phương pháp luận và cách áp dụng vào bài tập thực tế."
    ]
    exercises = []
    for idx, point in enumerate(kp[:3]):
        q_topic = point.split(":")[0] if ":" in point else f"Nội dung trọng tâm {idx+1}"
        exercises.append({
            "question": f"Hãy giải thích và trình bày ý nghĩa của '{q_topic}' trong bài giảng?",
            "answer": point,
            "hint": "Căn cứ vào phần giải thích chính của giảng viên."
        })
    return exercises


class SummaryService:
    def __init__(self):
        self.model = None
        self.fallback_model = None
        if settings.GEMINI_API_KEY:
            try:
                self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
                self.model = "gemini-2.5-flash"
                self.fallback_model = "gemini-2.5-flash-lite"
            except Exception as e:
                logger.warning(f"Không thể khởi tạo Gemini AI: {e}")
                self.model = None
                self.fallback_model = None
        else:
            self.model = None
            self.fallback_model = None

    def is_ollama_available(self) -> bool:
        """Kiểm tra xem Ollama Server nội bộ có đang chạy ở localhost:11434 không"""
        try:
            url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags"
            resp = requests.get(url, timeout=1.5)
            return resp.status_code == 200
        except Exception:
            return False

    def summarize_transcript(self, full_text: str, include_quiz: bool = True) -> dict:
        """
        Gửi transcript bài giảng để tóm tắt các ý chính và câu hỏi ôn tập:
        Ưu tiên 1: Ollama Local LLM (Qwen 2.5 3B trên GPU Tesla T4) - 100% Offline & Free.
        Ưu tiên 2: Google Gemini 2.5 Flash API (Cloud AI).
        Dự phòng: Tóm tắt cơ bản nếu không có LLM nào.
        """
        if not full_text or len(full_text.strip()) < 10:
            return {
                "folder": "Bài giảng chung",
                "tags": ["Bài giảng", "Học tập"],
                "summary": "Nội dung bài giảng quá ngắn để tóm tắt.",
                "key_points": [],
                "formulas_and_terms": [],
                "quiz": []
            }

        quiz_schema = """
            "quiz": [
                {
                    "question": "Nội dung câu hỏi trắc nghiệm tự kiểm tra kiến thức?",
                    "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
                    "correct_answer": "A",
                    "explanation": "Giải thích ngắn gọn lý do đúng",
                    "timestamp_sec": 60
                }
            ],
        """ if include_quiz else '"quiz": [],'

        # Tối ưu hóa tốc độ: Với video dài (> 7.000 ký tự), trích chọn thông minh các phần cốt lõi
        condensed_text = full_text.strip()
        if len(condensed_text) > 7000:
            mid = len(condensed_text) // 2
            condensed_text = (
                condensed_text[:3000]
                + "\n...[lược bớt đoạn diễn giải kéo dài]...\n"
                + condensed_text[mid - 1000 : mid + 1000]
                + "\n...[tiếp tục phần trọng tâm cuối bài]...\n"
                + condensed_text[-2500:]
            )

        prompt = f"""
        Bạn là một chuyên gia giáo dục và sư phạm AI xuất sắc. Dưới đây là phụ đề bài giảng:
        ---
        {condensed_text}
        ---
        Hãy phân tích chuyên sâu nội dung bài giảng trên, tự động phân loại chủ đề/thư mục và gắn thẻ (tags) từ khóa phù hợp nhất, rồi trả về kết quả ĐÚNG ĐỊNH DẠNG JSON sau:
        {{
            "folder": "Tên chủ đề hoặc lĩnh vực môn học ngắn gọn của bài giảng (2-4 từ, ví dụ: 'Trí tuệ nhân tạo', 'Toán học', 'Lập trình', 'Kinh tế', 'Khoa học máy tính', 'Kỹ năng mềm')",
            "tags": [
                "TừKhóa1",
                "TừKhóa2",
                "TừKhóa3",
                "TừKhóa4"
            ],
            "summary": "Đoạn văn 3-5 câu tóm tắt tổng quan bài học một cách súc tích",
            "key_points": [
                "Điểm cốt lõi thứ 1: giải thích ngắn",
                "Điểm cốt lõi thứ 2: giải thích ngắn",
                "Điểm cốt lõi thứ 3: giải thích ngắn"
            ],
            "formulas_and_terms": [
                "Thuật ngữ hoặc công thức quan trọng 1",
                "Thuật ngữ hoặc công thức quan trọng 2"
            ],
            {quiz_schema.strip()}
            "mindmap": {{
                "title": "Chủ đề trung tâm bài giảng",
                "children": [
                    {{
                        "title": "Nhánh chính 1",
                        "children": [
                            {{ "title": "Luận điểm chi tiết 1.1" }},
                            {{ "title": "Luận điểm chi tiết 1.2" }}
                        ]
                    }},
                    {{
                        "title": "Nhánh chính 2",
                        "children": [
                            {{ "title": "Luận điểm chi tiết 2.1" }},
                            {{ "title": "Luận điểm chi tiết 2.2" }}
                        ]
                    }}
                ]
            }},
            "exercises": [
                {{
                    "question": "Câu hỏi tự luận/củng cố kiến thức 1?",
                    "answer": "Gợi ý câu trả lời chuẩn xác và đầy đủ",
                    "hint": "Gợi ý ngắn gọn giúp người học tư duy"
                }},
                {{
                    "question": "Câu hỏi tự luận/củng cố kiến thức 2?",
                    "answer": "Gợi ý câu trả lời chuẩn xác và đầy đủ",
                    "hint": "Gợi ý ngắn gọn"
                }}
            ]
        }}
        """

        def _clean_and_parse_json(raw_text: str) -> dict:
            text = raw_text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
                text = re.sub(r"\s*```$", "", text).strip()

            try:
                return json.loads(text)
            except Exception:
                pass

            match = re.search(r"(\{.*\})", text, re.DOTALL)
            if match:
                candidate = match.group(1)
                try:
                    return json.loads(candidate)
                except Exception:
                    pass

                fixed = re.sub(r",\s*([\]\}])", r"\1", candidate)
                try:
                    return json.loads(fixed)
                except Exception:
                    pass

            raise ValueError(f"Không thể parse JSON từ phản hồi LLM: {text[:200]}...")

        def _format_parsed_result(parsed: dict) -> dict:
            kp = parsed.get("key_points", [])
            terms = parsed.get("formulas_and_terms", [])
            raw_folder = parsed.get("folder")
            folder_clean = str(raw_folder).strip() if raw_folder else "Bài giảng chung"
            raw_tags = parsed.get("tags") or []
            if isinstance(raw_tags, list):
                tags_clean = [str(t).strip().replace("#", "") for t in raw_tags if str(t).strip()]
            else:
                tags_clean = []
            if not tags_clean:
                tags_clean = ["Bài giảng", "Học tập"]
            return {
                "folder": folder_clean,
                "tags": tags_clean,
                "summary": parsed.get("summary", ""),
                "key_points": kp,
                "formulas_and_terms": terms,
                "quiz": normalize_quiz(parsed.get("quiz", [])),
                "mindmap": normalize_mindmap(parsed.get("mindmap"), default_title="Sơ đồ tư duy bài học", key_points=kp, terms=terms),
                "exercises": normalize_exercises(parsed.get("exercises"), key_points=kp)
            }

        # -------------------------------------------------------------
        # 1. HÀM GỌI OLLAMA LOCAL LLM (Qwen 2.5 3B trên GPU Tesla T4)
        # -------------------------------------------------------------
        def _call_ollama():
            url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
            payload = {
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.2
                }
            }
            resp = requests.post(url, json=payload, timeout=180)
            if resp.status_code == 200:
                raw_text = resp.json().get("response", "")
                parsed = _clean_and_parse_json(raw_text)
                return _format_parsed_result(parsed)
            raise RuntimeError(f"Ollama trả về HTTP {resp.status_code}: {resp.text[:120]}")

        # -------------------------------------------------------------
        # 2. HÀM GỌI GOOGLE GEMINI CLOUD API (Dự phòng khi không có Ollama)
        # -------------------------------------------------------------
        def _call_gemini(model_name):
            response = self.client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )
            parsed = _clean_and_parse_json(response.text)
            return _format_parsed_result(parsed)

        # =============================================================
        # TIẾN HÀNH THỰC THI THEO THỨ TỰ ƯU TIÊN
        # =============================================================

        # [ƯU TIÊN 1]: Chạy Ollama Local trên GPU nếu Ollama đang bật
        if self.is_ollama_available():
            try:
                logger.info(f"🚀 [LOCAL AI] Đang chạy Ollama ({settings.OLLAMA_MODEL}) trực tiếp trên GPU Tesla T4...")
                return _call_ollama()
            except Exception as e_ollama:
                logger.warning(f"Ollama Local gặp lỗi: {e_ollama}. Đang chuyển sang Gemini dự phòng...")

        # [ƯU TIÊN 2]: Chạy Gemini nếu có cấu hình API Key
        if self.model and settings.GEMINI_API_KEY:
            try:
                logger.info(f"🌐 [CLOUD AI] Đang gọi Gemini ({self.model}) để tóm tắt...")
                return _call_gemini(self.model)
            except Exception as e1:
                logger.warning(f"Lỗi khi gọi model chính gemini-2.5-flash: {e1}. Đang chuyển sang gemini-2.5-flash-lite...")
                if self.fallback_model:
                    try:
                        return _call_gemini(self.fallback_model)
                    except Exception as e2:
                        logger.error(f"Fallback gemini-2.5-flash-lite cũng thất bại: {e2}")

        # [DỰ PHÒNG CUỐI CÙNG]: Bản tóm tắt cơ bản nếu không có AI nào
        logger.info("Chưa có Ollama hoặc Gemini, sinh bản tóm tắt cơ bản.")
        words = full_text.split()
        preview = " ".join(words[:60]) + ("..." if len(words) > 60 else "")
        default_quiz = [
            {
                "question": "Mô hình AI nào được dùng để bóc tách phụ đề và mốc thời gian trong ứng dụng?",
                "options": ["A. Whisper AI", "B. ResNet-50", "C. YOLOv8", "D. BERT"],
                "correct_answer": "A",
                "answer": "A. Whisper AI",
                "explanation": "Hệ thống sử dụng lõi faster-whisper để nhận diện giọng nói chính xác."
            }
        ] if include_quiz else []

        default_kp = [
            "Bóc tách âm thanh và nhận diện giọng nói AI hoàn tất.",
            "Phụ đề đồng bộ mốc thời gian đã sẵn sàng tra cứu và xuất file.",
            "Hệ thống hỗ trợ cả Local AI (Ollama Qwen 2.5) và Cloud AI (Gemini)."
        ]
        default_terms = [
            "Speech-to-Text (ASR): Nhận diện lời nói thành phụ đề",
            "Timestamps Alignment: Đồng bộ mốc thời gian giây"
        ]

        return {
            "folder": "Bài giảng chung",
            "tags": ["Bài giảng", "Âm thanh", "Whisper"],
            "summary": f"Tóm tắt sơ lược bài học: {preview}",
            "key_points": default_kp,
            "formulas_and_terms": default_terms,
            "quiz": normalize_quiz(default_quiz),
            "mindmap": normalize_mindmap(None, default_title="Sơ đồ tư duy bài giảng", key_points=default_kp, terms=default_terms),
            "exercises": normalize_exercises(None, key_points=default_kp)
        }

summary_service = SummaryService()
