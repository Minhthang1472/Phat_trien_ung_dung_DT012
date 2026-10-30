import logging
import json
import re
import requests
import random
import time
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger("uvicorn")

DEFAULT_QUIZ_COUNT = 5
MAX_QUIZ_COUNT = 24
DEFAULT_QUIZ_OPTIONS = [
    "A. Đúng",
    "B. Sai",
    "C. Cần xem xét thêm",
    "D. Ý kiến khác",
]


def quiz_count_for_duration(duration_seconds, default: int = DEFAULT_QUIZ_COUNT) -> int:
    """Tính số câu hỏi trắc nghiệm phù hợp với thời lượng video.

    Ví dụ: < 5 phút -> 4 câu; 10-20 phút -> 10 câu; 45-60 phút -> 20 câu.
    Video mẫu hoặc dữ liệu chưa có thời lượng sẽ dùng mặc định 5 câu.
    """
    try:
        duration = float(duration_seconds or 0)
    except (TypeError, ValueError):
        duration = 0.0

    if duration <= 0:
        return default
    if duration < 300:
        return 4
    if duration < 600:
        return 6
    if duration < 1200:
        return 10
    if duration < 1800:
        return 12
    if duration < 2700:
        return 16
    if duration < 3600:
        return 20
    return MAX_QUIZ_COUNT


def _to_seconds(value):
    try:
        return round(max(0.0, float(value)), 1)
    except (TypeError, ValueError):
        return None


def normalize_sections(raw_sections, key_points=None, duration_seconds=None) -> list:
    """Chuẩn hóa danh sách section của bản tóm tắt.

    Mỗi section gồm id, title, summary, start_sec, end_sec, key_points.
    Nếu LLM không trả về sections, tự động chia key_points thành các phần nhỏ.
    """
    duration = _to_seconds(duration_seconds) or 0.0
    sections = []

    if isinstance(raw_sections, list):
        for idx, item in enumerate(raw_sections):
            if isinstance(item, str) and item.strip():
                item = {"title": item.strip()}
            if not isinstance(item, dict):
                continue

            title = str(item.get("title") or item.get("name") or f"Phần {idx + 1}").strip()
            summary = str(item.get("summary") or item.get("description") or "").strip()
            start_sec = _to_seconds(item.get("start_sec") or item.get("start_time") or item.get("start"))
            end_sec = _to_seconds(item.get("end_sec") or item.get("end_time") or item.get("end"))
            raw_points = item.get("key_points") or item.get("bullets") or []
            if isinstance(raw_points, str):
                raw_points = [raw_points]
            points = [str(p).strip() for p in raw_points if str(p).strip()]

            sections.append({
                "title": title or f"Phần {idx + 1}",
                "summary": summary,
                "start_sec": start_sec,
                "end_sec": end_sec,
                "key_points": points,
            })

    # Nếu AI chưa trả về sections: chia các điểm kiến thức cốt lõi thành phần nhỏ
    if not sections and isinstance(key_points, list) and key_points:
        points = [str(p).strip() for p in key_points if str(p).strip()][:4]
        if points:
            per_section = 1 if len(points) <= 3 else 2
            for idx in range(0, len(points), per_section):
                chunk = points[idx:idx + per_section]
                title = chunk[0].split(":", 1)[0].strip()[:70] or f"Phần {idx // per_section + 1}"
                sections.append({
                    "title": title,
                    "summary": " ".join(chunk),
                    "start_sec": None,
                    "end_sec": None,
                    "key_points": chunk,
                })

    if not sections:
        sections = [{
            "title": "Toàn bộ bài giảng",
            "summary": "",
            "start_sec": 0.0,
            "end_sec": duration,
            "key_points": [],
        }]

    # Sắp xếp theo mốc thời gian và bù các mốc còn thiếu
    def _sort_key(sec):
        return sec["start_sec"] if sec["start_sec"] is not None else float("inf")

    sections.sort(key=_sort_key)
    total = duration or max((s.get("end_sec") or 0 for s in sections), default=0.0)
    count = len(sections)
    for idx, sec in enumerate(sections):
        if sec["start_sec"] is None:
            sec["start_sec"] = round(total * idx / count, 1) if total else 0.0
        if sec["end_sec"] is None:
            sec["end_sec"] = round(total * (idx + 1) / count, 1) if total else 0.0
        if sec["end_sec"] < sec["start_sec"]:
            sec["end_sec"] = sec["start_sec"]
        sec["id"] = idx + 1

    return sections


def _assign_section(section_ref, timestamp_sec, fallback_index, sections):
    """Tìm section phù hợp cho một câu hỏi dựa trên id, tiêu đề hoặc timestamp."""
    if not sections:
        return None, None

    if isinstance(section_ref, str) and section_ref.strip():
        needle = section_ref.strip().lower()
        for sec in sections:
            if str(sec.get("id")) == needle or str(sec.get("title", "")).strip().lower() == needle:
                return sec.get("id"), sec.get("title")

    try:
        if section_ref is not None:
            wanted = int(float(section_ref))
            for sec in sections:
                if int(sec.get("id", -1)) == wanted:
                    return sec.get("id"), sec.get("title")
    except (TypeError, ValueError):
        pass

    if timestamp_sec is not None:
        for sec in sections:
            start = sec.get("start_sec") or 0
            end = sec.get("end_sec")
            if end is None or end <= start:
                continue
            if start <= timestamp_sec <= end:
                return sec.get("id"), sec.get("title")

    sec = sections[fallback_index % len(sections)]
    return sec.get("id"), sec.get("title")


def normalize_quiz(raw_quiz, sections=None) -> list:
    """Đảm bảo mọi phần tử trong quiz đều là dictionary hợp lệ, tự động xáo trộn và phân bổ cân bằng tự nhiên A, B, C, D."""
    if not isinstance(raw_quiz, list):
        return []

    clean_quiz = []
    sections = sections or []
    letters = ['A', 'B', 'C', 'D']
    balanced_cycle = ['C', 'A', 'D', 'B', 'D', 'B', 'C', 'A']

    for index, item in enumerate(raw_quiz):
        if isinstance(item, dict):
            q_text = item.get("question") or item.get("title") or "Câu hỏi ôn tập"
            raw_opts = item.get("options")
            if not isinstance(raw_opts, list) or len(raw_opts) < 2:
                raw_opts = DEFAULT_QUIZ_OPTIONS
            raw_ans = str(item.get("correct_answer") or item.get("answer") or "A").strip()
            exp = item.get("explanation") or "Dựa trên nội dung bài giảng."
            raw_ts = item.get("timestamp_sec") or item.get("time_sec") or item.get("timestamp")
            try:
                ts_val = round(float(raw_ts), 1) if raw_ts is not None else None
            except (ValueError, TypeError):
                ts_val = None

            section_ref = (
                item.get("section_id")
                or item.get("section_index")
                or item.get("section")
                or item.get("section_title")
            )
            section_id, section_title = _assign_section(
                section_ref, ts_val, index, sections
            )

            # XÁO TRỘN ĐÁP ÁN ĐỂ PHÂN BỔ ĐỀU TỰ NHIÊN A, B, C, D (Chống lạm dụng A, B)
            correct_idx = 0
            raw_ans_upper = raw_ans.upper()
            if raw_ans_upper in ('A', 'B', 'C', 'D'):
                correct_idx = ord(raw_ans_upper) - ord('A')
            else:
                m = re.match(r'^([A-D])[\.\:\s]', raw_ans_upper)
                if m:
                    correct_idx = ord(m.group(1)) - ord('A')
                else:
                    for i, o in enumerate(raw_opts):
                        if raw_ans in str(o) or raw_ans_upper in str(o).upper():
                            correct_idx = i
                            break
            correct_idx = max(0, min(correct_idx, len(raw_opts) - 1))

            # Tách nội dung không chứa tiền tố "A. ", "B. "
            clean_texts = [re.sub(r'^[A-E][\.\:\-\)]\s*', '', str(o).strip()) for o in raw_opts]
            correct_content = clean_texts[correct_idx]
            wrong_contents = [c for i, c in enumerate(clean_texts) if i != correct_idx]
            
            # Xáo trộn các phương án sai
            random.seed(int(time.time() * 1000) + index * 17)
            random.shuffle(wrong_contents)

            # Vị trí mục tiêu cho đáp án đúng từ chu trình cân bằng
            target_letter = balanced_cycle[index % len(balanced_cycle)]
            target_pos = min(ord(target_letter) - ord('A'), len(raw_opts) - 1)

            new_ordered = []
            w_idx = 0
            for pos in range(len(raw_opts)):
                if pos == target_pos:
                    new_ordered.append(correct_content)
                else:
                    if w_idx < len(wrong_contents):
                        new_ordered.append(wrong_contents[w_idx])
                        w_idx += 1
                    else:
                        new_ordered.append(correct_content)

            final_options = [f"{letters[i]}. {text}" for i, text in enumerate(new_ordered)]
            final_ans = letters[target_pos]

            clean_quiz.append({
                "question": str(q_text).strip(),
                "options": final_options,
                "correct_answer": final_ans,
                "answer": final_ans,
                "explanation": str(exp).strip(),
                "timestamp_sec": ts_val,
                "section_id": section_id,
                "section_title": section_title,
            })
        elif isinstance(item, str) and item.strip():
            section_id, section_title = _assign_section(None, None, index, sections)
            target_letter = balanced_cycle[index % len(balanced_cycle)]
            clean_quiz.append({
                "question": item.strip(),
                "options": [
                    "A. Cần thêm cơ sở phân tích",
                    "B. Hoàn toàn đồng ý",
                    "C. Không phù hợp với ngữ cảnh",
                    "D. Góc nhìn khác"
                ],
                "correct_answer": target_letter,
                "answer": target_letter,
                "explanation": "Câu hỏi gợi mở củng cố kiến thức từ bài giảng.",
                "timestamp_sec": None,
                "section_id": section_id,
                "section_title": section_title,
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
                self.fallback_model = "gemini-3.5-flash-lite"
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
            resp = requests.get(url, timeout=3.5)
            return resp.status_code == 200
        except Exception:
            return False

    def summarize_transcript(
        self,
        full_text: str,
        include_quiz: bool = True,
        duration_seconds=None,
        quiz_target=None,
        video_title: str = "",
    ) -> dict:
        """
        Gửi transcript bài giảng để tóm tắt các ý chính và câu hỏi ôn tập:
        Ưu tiên 1: Ollama Local LLM (Qwen 2.5 3B trên GPU Tesla T4) - 100% Offline & Free.
        Ưu tiên 2: Google Gemini 2.5 Flash API (Cloud AI).
        Dự phòng: Tóm tắt cơ bản nếu không có LLM nào.

        duration_seconds: thời lượng video, dùng để tự động tính số câu hỏi.
        quiz_target: ghi đè số câu hỏi mong muốn (nếu cần).
        """
        quiz_count = int(quiz_target or quiz_count_for_duration(duration_seconds))
        quiz_count = max(1, min(MAX_QUIZ_COUNT, quiz_count))

        if not full_text or len(full_text.strip()) < 10:
            sections = normalize_sections(
                None,
                key_points=["Nội dung bài giảng quá ngắn để phân tích chi tiết."],
                duration_seconds=duration_seconds,
            )
            return {
                "folder": "Bài giảng chung",
                "tags": ["Bài giảng", "Học tập"],
                "summary": "Nội dung bài giảng quá ngắn để tóm tắt.",
                "key_points": [],
                "formulas_and_terms": [],
                "sections": sections,
                "quiz": [],
                "quiz_target": quiz_count,
            }

        duration_hint = (
            f"{int(float(duration_seconds))} giây"
            if duration_seconds not in (None, "", 0)
            else "chưa xác định (hãy ước lượng theo nội dung)"
        )

        quiz_schema = """
            "quiz": [
                {
                    "section_id": 1,
                    "section_title": "Tên phần nội dung tương ứng",
                    "question": "Câu hỏi trắc nghiệm kiểm tra chi tiết kiến thức trong phần này?",
                    "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
                    "correct_answer": "A",
                    "explanation": "Giải thích ngắn gọn lý do đáp án đúng và liên hệ với nội dung phần tương ứng",
                    "timestamp_sec": 60
                }
            ],
        """ if include_quiz else '"quiz": [],'

        # Tối ưu hóa tốc độ: Với video dài (> 4.000 ký tự), trích chọn thông minh cốt lõi để LLM sinh trong vài giây
        condensed_text = full_text.strip()
        if len(condensed_text) > 4000:
            mid = len(condensed_text) // 2
            condensed_text = (
                condensed_text[:1800]
                + "\n...[lược bớt đoạn phân tích chi tiết]...\n"
                + condensed_text[mid - 500 : mid + 500]
                + "\n...[tiếp tục phần trọng tâm cuối bài]...\n"
                + condensed_text[-1400:]
            )

        title_hint = f'Tiêu đề bài giảng: "{video_title}".' if video_title else ""
        quiz_rule = (
            f"Sinh CHÍNH XÁC {quiz_count} câu hỏi trắc nghiệm, phân bổ đều theo các sections "
            f"(mỗi section có ít nhất 1 câu, section dài hơn có thể có nhiều câu hơn). "
            "Mỗi câu phải ghi rõ section_id, section_title và timestamp_sec nằm trong khoảng thời gian của section đó. "
            "Câu hỏi phải kiểm tra chi tiết cụ thể (khái niệm, ví dụ, công thức, lập luận) chứ không hỏi chung chung; "
            "các phương án nhiễu phải hợp lý và không trùng lặp. "
            "QUAN TRỌNG: Phân bổ ngẫu nhiên và đồng đều các đáp án đúng cho các chữ cái A, B, C, D (ví dụ: câu 1 là C, câu 2 là A, câu 3 là D, câu 4 là B, câu 5 là D, câu 6 là C). Tuyệt đối KHÔNG được để hầu hết đáp án đúng đều rơi vào A hoặc B."
            if include_quiz
            else "Không sinh quiz (quiz là mảng rỗng), nhưng vẫn phải chia sections đầy đủ."
        )

        prompt = f"""
        Bạn là một chuyên gia giáo dục và sư phạm AI xuất sắc. {title_hint}
        Dưới đây là phụ đề bài giảng (thời lượng ước tính: {duration_hint}):
        ---
        {condensed_text}
        ---

        Hãy phân tích chuyên sâu nội dung bài giảng trên, tự động phân loại chủ đề/thư mục và gắn thẻ (tags) từ khóa phù hợp nhất.

        QUY TẮC BẮT BUỘC:
        1. Chia bài giảng thành 3-5 sections theo trình tự thời gian. Mỗi section có tiêu đề ngắn gọn, tóm tắt 1-2 câu và khoảng thời gian start_sec/end_sec bao phủ toàn bộ bài giảng.
        2. {quiz_rule}
        3. Toàn bộ nội dung trả về bằng tiếng Việt, giữ nguyên thuật ngữ chuyên ngành/tên riêng khi cần.
        4. Chỉ trả về JSON hợp lệ, không thêm markdown hay lời giải thích bên ngoài.

        Trả về kết quả ĐÚNG ĐỊNH DẠNG JSON sau:
        {{
            "folder": "Tên chủ đề hoặc lĩnh vực môn học ngắn gọn của bài giảng (2-4 từ, ví dụ: 'Trí tuệ nhân tạo', 'Toán học', 'Lập trình', 'Kinh tế', 'Khoa học máy tính', 'Kỹ năng mềm')",
            "tags": [
                "TừKhóa1",
                "TừKhóa2",
                "TừKhóa3",
                "TừKhóa4"
            ],
            "sections": [
                {{
                    "id": 1,
                    "title": "Tên phần nội dung ngắn gọn",
                    "summary": "Tóm tắt 1-2 câu nội dung cốt lõi của phần này",
                    "start_sec": 0,
                    "end_sec": 180,
                    "key_points": [
                        "Ý chính chi tiết của phần này",
                        "Ví dụ hoặc lập luận quan trọng"
                    ]
                }}
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
            candidates = [match.group(1)] if match else []
            candidates.append(text)

            for cand in candidates:
                try:
                    return json.loads(cand)
                except Exception:
                    pass

                # Loại bỏ trailing commas
                fixed = re.sub(r",\s*([\]\}])", r"\1", cand)
                try:
                    return json.loads(fixed)
                except Exception:
                    pass

                # Tự động vá ngoặc nếu JSON bị ngắt giữa chừng do quá dài
                open_b = fixed.count('{') - fixed.count('}')
                open_sq = fixed.count('[') - fixed.count(']')
                if open_b > 0 or open_sq > 0:
                    patched = re.sub(r',\s*$', '', fixed.strip())
                    patched += (']' * max(0, open_sq)) + ('}' * max(0, open_b))
                    patched = re.sub(r",\s*([\]\}])", r"\1", patched)
                    try:
                        return json.loads(patched)
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

            sections = normalize_sections(
                parsed.get("sections"),
                key_points=kp,
                duration_seconds=duration_seconds,
            )
            return {
                "folder": folder_clean,
                "tags": tags_clean,
                "summary": parsed.get("summary", ""),
                "key_points": kp,
                "formulas_and_terms": terms,
                "sections": sections,
                "quiz": normalize_quiz(parsed.get("quiz", []), sections=sections) if include_quiz else [],
                "quiz_target": quiz_count,
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
                    "temperature": 0.2,
                    "num_predict": max(1200, min(3800, 900 + quiz_count * 110))
                }
            }
            # Giới hạn timeout 28s để không bao giờ bị Cloudflare cắt kết nối (HTTP 524)
            resp = requests.post(url, json=payload, timeout=28)
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
        # TIẾN HÀNH THỰC THI THEO THỨ TỰ ƯU TIÊN (SIÊU TỐC & CHỐNG TIMEOUT 524)
        # =============================================================
        def _has_cuda():
            try:
                import torch
                return torch.cuda.is_available()
            except Exception:
                return False

        has_gpu = _has_cuda()

        # TH1: Nếu có GPU VÀ Ollama đang bật -> Chạy Ollama siêu tốc trên GPU
        if has_gpu and self.is_ollama_available():
            try:
                logger.info(f"🚀 [LOCAL AI] Đang chạy Ollama ({settings.OLLAMA_MODEL}) trên GPU...")
                return _call_ollama()
            except Exception as e_ollama:
                logger.warning(f"Ollama Local GPU gặp lỗi/quá 28s ({e_ollama}). Chuyển sang Gemini dự phòng...")

        # TH2: Nếu KHÔNG CÓ GPU (Colab chạy CPU) hoặc Ollama lỗi: Ưu tiên Gemini Cloud AI (chỉ mất 2-3s!)
        if self.model and settings.GEMINI_API_KEY:
            try:
                logger.info(f"🌐 [CLOUD AI] Đang gọi Gemini ({self.model}) siêu tốc (chống timeout 524)...")
                return _call_gemini(self.model)
            except Exception as e1:
                logger.warning(f"Lỗi model chính {self.model}: {e1}. Chuyển sang {self.fallback_model}...")
                if self.fallback_model:
                    try:
                        return _call_gemini(self.fallback_model)
                    except Exception as e2:
                        logger.error(f"Fallback {self.fallback_model} thất bại: {e2}")

        # TH3: Nếu không có Gemini nhưng có Ollama trên CPU (chấp nhận thử với timeout ngắn)
        if not has_gpu and self.is_ollama_available():
            try:
                logger.info(f"⚠️ [CPU AI] Thử chạy Ollama trên CPU với timeout ngắn...")
                return _call_ollama()
            except Exception as e_cpu:
                logger.warning(f"Ollama CPU không kịp phản hồi: {e_cpu}")

        # [DỰ PHÒNG CUỐI CÙNG]: Bản tóm tắt cơ bản nếu không có AI nào
        logger.info("Chưa có Ollama hoặc Gemini, sinh bản tóm tắt cơ bản.")
        words = full_text.split()
        preview = " ".join(words[:60]) + ("..." if len(words) > 60 else "")

        default_kp = [
            "Bóc tách âm thanh và nhận diện giọng nói AI hoàn tất.",
            "Phụ đề đồng bộ mốc thời gian đã sẵn sàng tra cứu và xuất file.",
            "Hệ thống hỗ trợ cả Local AI (Ollama Qwen 2.5) và Cloud AI (Gemini)."
        ]
        default_terms = [
            "Speech-to-Text (ASR): Nhận diện lời nói thành phụ đề",
            "Timestamps Alignment: Đồng bộ mốc thời gian giây"
        ]
        sections = normalize_sections(
            None,
            key_points=default_kp,
            duration_seconds=duration_seconds,
        )

        detail_a = " ".join(words[:40]) or "Nội dung đang được hệ thống ghi nhận."
        detail_b = " ".join(words[40:90]) or "Các mốc kiến thức tiếp theo trong bài giảng."
        default_quiz = [
            {
                "section_id": 1,
                "question": "Ý nào sau đây tóm đúng nội dung mở đầu của bài giảng?",
                "options": [
                    f"A. {detail_a[:90]}",
                    "B. Một chủ đề hoàn toàn không liên quan",
                    "C. Chỉ là phần giới thiệu không có kiến thức",
                    "D. Tất cả các phương án trên đều sai",
                ],
                "correct_answer": "A",
                "explanation": "Phương án A bám sát nội dung mở đầu được ghi nhận từ phụ đề.",
            },
            {
                "section_id": 2,
                "question": "Hệ thống đã thực hiện bước nào để tạo phụ đề cho bài giảng?",
                "options": [
                    "A. Chỉ sao chép văn bản thủ công",
                    "B. Bóc tách âm thanh và nhận diện giọng nói bằng AI",
                    "C. Xóa toàn bộ âm thanh gốc",
                    "D. Không cần xử lý nội dung",
                ],
                "correct_answer": "B",
                "explanation": "Hệ thống dùng AI nhận diện giọng nói để tạo phụ đề kèm mốc thời gian.",
            },
            {
                "section_id": 2,
                "question": "Mốc thời gian (timestamp) trong phụ đề có tác dụng gì?",
                "options": [
                    "A. Trang trí giao diện",
                    "B. Giúp đồng bộ phụ đề với video khi phát lại",
                    "C. Tăng dung lượng file",
                    "D. Thay thế hoàn toàn bản tóm tắt",
                ],
                "correct_answer": "B",
                "explanation": "Timestamp giúp phụ đề hiển thị đúng thời điểm tương ứng với video.",
            },
            {
                "section_id": 3,
                "question": "Công cụ AI nào có thể được dùng để tóm tắt bài giảng trong hệ thống?",
                "options": [
                    "A. Ollama (Qwen) hoặc Gemini",
                    "B. Chỉ Excel",
                    "C. Chỉ Photoshop",
                    "D. Không có công cụ nào",
                ],
                "correct_answer": "A",
                "explanation": "Hệ thống ưu tiên Ollama local và dự phòng bằng Gemini Cloud AI.",
            },
            {
                "section_id": 3,
                "question": f"Nội dung nào phù hợp nhất với phần kết của bài giảng?",
                "options": [
                    f"A. {detail_b[:90]}",
                    "B. Một nội dung không xuất hiện trong bài",
                    "C. Chỉ là quảng cáo sản phẩm",
                    "D. Không có thông tin nào",
                ],
                "correct_answer": "A",
                "explanation": "Phương án A được lấy từ phần cuối nội dung phụ đề đã ghi nhận.",
            },
        ]

        # Bổ sung câu hỏi dự phòng cho đủ số lượng theo thời lượng video.
        if include_quiz and quiz_count > len(default_quiz):
            pool_points = []
            for sec in sections:
                sec_points = sec.get("key_points") or [sec.get("title") or "Nội dung bài giảng"]
                for point in sec_points:
                    text_point = str(point).strip()
                    if text_point:
                        pool_points.append((sec.get("id"), text_point))

            pool_index = 0
            while len(default_quiz) < quiz_count and pool_points:
                section_id, point = pool_points[pool_index % len(pool_points)]
                distractors = [p for _, p in pool_points if p != point][:3]
                while len(distractors) < 3:
                    distractors.append("Nội dung không được đề cập trong bài giảng")
                correct_letter = "ABCD"[len(default_quiz) % 4]
                distractor_iter = iter(distractors)
                options = []
                for letter in "ABCD":
                    if letter == correct_letter:
                        options.append(f"{letter}. {point[:110]}")
                    else:
                        options.append(f"{letter}. {next(distractor_iter)[:110]}")
                default_quiz.append({
                    "section_id": section_id,
                    "question": "Nội dung nào sau đây được trình bày trong bài giảng?",
                    "options": options,
                    "correct_answer": correct_letter,
                    "explanation": "Phương án đúng bám sát nội dung đã ghi nhận từ phụ đề.",
                })
                pool_index += 1

        if include_quiz:
            default_quiz = default_quiz[:quiz_count]

        return {
            "folder": "Bài giảng chung",
            "tags": ["Bài giảng", "Âm thanh", "Whisper"],
            "summary": f"Tóm tắt sơ lược bài học: {preview}",
            "key_points": default_kp,
            "formulas_and_terms": default_terms,
            "sections": sections,
            "quiz": normalize_quiz(default_quiz, sections=sections) if include_quiz else [],
            "quiz_target": quiz_count,
            "mindmap": normalize_mindmap(None, default_title="Sơ đồ tư duy bài giảng", key_points=default_kp, terms=default_terms),
            "exercises": normalize_exercises(None, key_points=default_kp)
        }

summary_service = SummaryService()
