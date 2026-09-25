import logging
import json
import re
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger("uvicorn")

def normalize_quiz(raw_quiz) -> list:
    """Đảm bảo mọi phần tử trong quiz đều là dictionary hợp lệ theo schema Pydantic."""
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
            clean_quiz.append({
                "question": str(q_text).strip(),
                "options": [str(o) for o in opts],
                "correct_answer": str(ans).strip(),
                "answer": str(ans).strip(),
                "explanation": str(exp).strip()
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
                "explanation": "Câu hỏi gợi mở củng cố kiến thức từ bài giảng."
            })
    return clean_quiz


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

            return {
                "summary": f"Tóm tắt sơ lược bài học: {preview}",
                "key_points": [
                    "Bóc tách âm thanh và nhận diện giọng nói AI hoàn tất.",
                    "Phụ đề đồng bộ mốc thời gian đã sẵn sàng tra cứu và xuất file.",
                    "Để kích hoạt phân tích LLM thông minh và trắc nghiệm, cấu hình GEMINI_API_KEY trong file .env."
                ],
                "formulas_and_terms": [
                    "Speech-to-Text (ASR): Nhận diện lời nói thành phụ đề",
                    "Timestamps Alignment: Đồng bộ mốc thời gian giây"
                ],
                "quiz": normalize_quiz(default_quiz)
            }

        quiz_schema = """
            "quiz": [
                {
                    "question": "Nội dung câu hỏi trắc nghiệm tự kiểm tra kiến thức?",
                    "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
                    "correct_answer": "A",
                    "explanation": "Giải thích ngắn gọn lý do đúng"
                }
            ]
        """ if include_quiz else '"quiz": []'

        prompt = f"""
        Bạn là một trợ lý giáo dục AI chuyên nghiệp. Dưới đây là nội dung phụ đề bài giảng:
        ---
        {full_text}
        ---
        Hãy phân tích nội dung trên và trả về kết quả ĐÚNG ĐỊNH DẠNG JSON sau (LƯU Ý: quiz phải là mảng các object có chứa question, options, correct_answer, explanation - KHÔNG ĐƯỢC trả về mảng chuỗi string):
        {{
            "summary": "Đoạn văn 3-5 câu tóm tắt tổng quan bài học một cách súc tích",
            "key_points": [
                "Điểm cốt lõi thứ 1",
                "Điểm cốt lõi thứ 2",
                "Điểm cốt lõi thứ 3"
            ],
            "formulas_and_terms": [
                "Thuật ngữ hoặc công thức quan trọng 1",
                "Thuật ngữ hoặc công thức quan trọng 2"
            ],
            {quiz_schema.strip()}
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
            return {
                "summary": parsed.get("summary", ""),
                "key_points": parsed.get("key_points", []),
                "formulas_and_terms": parsed.get("formulas_and_terms", []),
                "quiz": normalize_quiz(parsed.get("quiz", []))
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
            return {
                "summary": "Tóm tắt từ phụ đề: " + full_text[:200] + "...",
                "key_points": ["Đã xử lý âm thanh thành công"],
                "formulas_and_terms": [],
                "quiz": []
            }

summary_service = SummaryService()
