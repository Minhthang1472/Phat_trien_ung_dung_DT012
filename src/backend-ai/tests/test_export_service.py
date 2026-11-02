import pytest

from app.export_service import (
    build_docx_bytes,
    build_export_bytes,
    build_html_document,
    build_markdown_text,
    build_pdf_bytes,
    flatten_mindmap,
    get_mime_type,
)


@pytest.fixture()
def lecture_data():
    return {
        "title": "Bài giảng Kiểm thử",
        "video_url": "https://youtu.be/abc123",
        "language": "vi",
        "target_language": "en",
        "summary": "Tóm tắt ngắn gọn về nội dung bài giảng.",
        "key_points": ["Luận điểm một", "Luận điểm hai"],
        "formulas_and_terms": ["Thuật ngữ A", "Công thức B"],
        "sections": [
            {
                "title": "Phần mở đầu",
                "start_sec": 0,
                "end_sec": 60,
                "summary": "Giới thiệu tổng quan.",
                "key_points": ["Ý phụ"],
            }
        ],
        "mindmap": {
            "title": "Gốc",
            "children": [{"title": "Nhánh 1", "children": [{"title": "Lá"}]}],
        },
        "quiz": [
            {
                "question": "Câu hỏi mẫu?",
                "options": ["A. Đúng", "B. Sai"],
                "correct_answer": "A",
                "explanation": "Vì đây là đáp án đúng.",
            }
        ],
        "segments": [
            {
                "start": 0,
                "end": 2.5,
                "original_text": "Xin chào",
                "translated_text": "Hello",
            }
        ],
    }


def test_flatten_mindmap_returns_depth_title_pairs():
    rows = flatten_mindmap(
        {"title": "Root", "children": [{"title": "Child", "children": [{"title": "Leaf"}]}]}
    )
    assert rows == [(0, "Root"), (1, "Child"), (2, "Leaf")]
    assert flatten_mindmap("not-a-dict") == []


def test_build_html_contains_all_sections(lecture_data):
    html = build_html_document(lecture_data)
    assert "<!DOCTYPE html>" in html
    assert "Bài giảng Kiểm thử" in html
    assert "1. Tóm tắt bài giảng" in html
    assert "Phần mở đầu" in html
    assert "Câu 1. Câu hỏi mẫu?" in html
    assert "Xin chào" in html and "Hello" in html


def test_build_html_escapes_untrusted_content(lecture_data):
    lecture_data["summary"] = "<script>alert(1)</script>"
    html = build_html_document(lecture_data)
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;" in html


def test_build_markdown_contains_table_and_quiz(lecture_data):
    md = build_markdown_text(lecture_data)
    assert md.startswith("# Bài giảng Kiểm thử")
    assert "| Mốc thời gian | Tiếng gốc | Tiếng dịch |" in md
    assert "> Đáp án: **A**" in md
    assert "- Luận điểm một" in md


def test_build_export_bytes_markdown(lecture_data):
    payload = build_export_bytes(lecture_data, "md")
    assert payload.decode("utf-8").startswith("# Bài giảng Kiểm thử")


def test_build_export_bytes_pdf(lecture_data):
    payload = build_pdf_bytes(lecture_data)
    assert payload.startswith(b"%PDF")
    assert len(payload) > 1000


def test_build_export_bytes_docx(lecture_data):
    payload = build_docx_bytes(lecture_data)
    # DOCX là file ZIP nên bắt đầu bằng "PK".
    assert payload.startswith(b"PK")
    assert len(payload) > 1000


def test_build_export_bytes_rejects_unknown_format(lecture_data):
    with pytest.raises(ValueError):
        build_export_bytes(lecture_data, "exe")


def test_get_mime_type():
    assert get_mime_type("pdf") == "application/pdf"
    assert get_mime_type("docx").startswith(
        "application/vnd.openxmlformats-officedocument"
    )
    assert get_mime_type("md").startswith("text/markdown")
    assert get_mime_type("unknown") == "application/octet-stream"


def test_build_export_handles_empty_data():
    html = build_html_document({})
    assert "Bài giảng AI" in html
    assert "Chưa có tóm tắt" in html
    md = build_markdown_text({})
    assert "Chưa có sơ đồ tư duy" in md
