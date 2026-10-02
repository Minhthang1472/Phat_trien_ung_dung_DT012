import logging
import json
import re
import google.generativeai as genai
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
                genai.configure(api_key=settings.GEMINI_API_KEY)
                json_config = {"response_mime_type": "application/json"}
                self.model = genai.GenerativeModel('gemini-2.5-flash', generation_config=json_config)
                self.fallback_model = genai.GenerativeModel('gemini-3.8-flash', generation_config=json_config)
            except Exception as e:
                logger.warning(f"Không thể khởi tạo Gemini AI: {e}")
                self.model = None
                self.fallback_model = None
        else:
            self.model = None
            self.fallback_model = None

    def summarize_transcript(self, full_text: str, include_quiz: bool = True) -> dict:
        """
        Gửi transcript bài giảng để tóm tắt các ý chính và câu hỏi ôn tập:
        1. Tổng quan bài học (summary)
        2. Điểm cốt lõi (key_points)
        3. Thuật ngữ / công thức quan trọng (formulas_and_terms)
        4. Bộ câu hỏi trắc nghiệm tự ôn tập (quiz) - tùy chọn include_quiz
        """
        if not full_text or len(full_text.strip()) < 10:
            return {
                "summary": "Nội dung bài giảng quá ngắn để tóm tắt.",
                "key_points": [],
                "formulas_and_terms": [],
                "quiz": []
            }

        if not self.model or not settings.GEMINI_API_KEY:
            logger.info("Chưa cấu hình GEMINI_API_KEY, sinh bản tóm tắt cơ bản.")
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
                "Để kích hoạt phân tích LLM thông minh và trắc nghiệm, cấu hình GEMINI_API_KEY trong file .env."
            ]
            default_terms = [
                "Speech-to-Text (ASR): Nhận diện lời nói thành phụ đề",
                "Timestamps Alignment: Đồng bộ mốc thời gian giây"
            ]

            return {
                "summary": f"Tóm tắt sơ lược bài học: {preview}",
                "key_points": default_kp,
                "formulas_and_terms": default_terms,
                "quiz": normalize_quiz(default_quiz),
                "mindmap": normalize_mindmap(None, default_title="Sơ đồ tư duy bài giảng", key_points=default_kp, terms=default_terms),
                "exercises": normalize_exercises(None, key_points=default_kp)
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

        # Tối ưu hóa tốc độ: Với video dài (> 7.000 ký tự), trích chọn thông minh các phần cốt lõi để Gemini phản hồi siêu tốc (3-5 giây)
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
        Hãy phân tích chuyên sâu nội dung trên và trả về kết quả ĐÚNG ĐỊNH DẠNG JSON sau:
        {{
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
            # Bỏ markdown code block nếu có
            if text.startswith("```"):
                text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
                text = re.sub(r"\s*```$", "", text).strip()

            # 1. Thử parse trực tiếp
            try:
                return json.loads(text)
            except Exception:
                pass

            # 2. Trích xuất khối nằm giữa { và } đầu-cuối
            match = re.search(r"(\{.*\})", text, re.DOTALL)
            if match:
                candidate = match.group(1)
                try:
                    return json.loads(candidate)
                except Exception:
                    pass

                # 3. Sửa lỗi phổ biến của LLM: dấu phẩy thừa trước dấu đóng } hoặc ]
                fixed = re.sub(r",\s*([\]\}])", r"\1", candidate)
                try:
                    return json.loads(fixed)
                except Exception:
                    pass

            raise ValueError(f"Không thể parse JSON từ phản hồi LLM: {text[:200]}...")

        def _call_model(m):
            response = m.generate_content(prompt)
            parsed = _clean_and_parse_json(response.text)
            kp = parsed.get("key_points", [])
            terms = parsed.get("formulas_and_terms", [])
            return {
                "summary": parsed.get("summary", ""),
                "key_points": kp,
                "formulas_and_terms": terms,
                "quiz": normalize_quiz(parsed.get("quiz", [])),
                "mindmap": normalize_mindmap(parsed.get("mindmap"), default_title="Sơ đồ tư duy bài học", key_points=kp, terms=terms),
                "exercises": normalize_exercises(parsed.get("exercises"), key_points=kp)
            }

        try:
            return _call_model(self.model)
        except Exception as e1:
            logger.warning(f"Lỗi khi gọi model chính gemini-2.5-flash: {e1}. Đang chuyển sang gemini-3.8-flash...")
            if self.fallback_model:
                try:
                    return _call_model(self.fallback_model)
                except Exception as e2:
                    logger.error(f"Fallback gemini-3.8-flash cũng thất bại: {e2}")
            logger.error(f"Lỗi khi gọi LLM tóm tắt: {e1}")
            fallback_kp = ["Bóc tách âm thanh thành công", "Nội dung bài giảng sẵn sàng"]
            return {
                "summary": "Tóm tắt từ phụ đề: " + full_text[:200] + "...",
                "key_points": fallback_kp,
                "formulas_and_terms": [],
                "quiz": [],
                "mindmap": normalize_mindmap(None, default_title="Sơ đồ bài giảng", key_points=fallback_kp),
                "exercises": normalize_exercises(None, key_points=fallback_kp)
            }

summary_service = SummaryService()
