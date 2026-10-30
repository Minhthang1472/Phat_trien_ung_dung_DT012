import io
from typing import Optional

try:
    import weasyprint
except Exception:
    weasyprint = None


def build_pdf_bytes(data: dict) -> bytes:
    html = build_pdf_template(data)
    if weasyprint is None:
        raise ImportError("weasyprint chưa được cài đặt. Cài đặt: pip install weasyprint")
    return weasyprint.HTML(string=html).write_pdf()


def build_pdf_template(data: dict) -> str:
    title = data.get("title", "Bài giảng AI")
    url = data.get("video_url", "")
    lang = data.get("language", "vi")
    summary = data.get("summary", "")
    sections = data.get("sections", [])
    quiz = data.get("quiz", [])
    mindmap = data.get("mindmap") or {}

    # Helper: build mindmap tree lines
    def tree_lines(node, depth=0):
        indent = "&nbsp;&nbsp;" * depth + ("├── " if depth > 0 else "")
        lines = [f"<div>{indent}<strong>{node.get('title', '')}</strong></div>"]
        for child in node.get("children", []):
            lines.extend(tree_lines(child, depth + 1))
        return "".join(lines)

    mindmap_html = ""
    if mindmap:
        root_title = mindmap.get("title", "Chủ đề bài học")
        branches = mindmap.get("children", [])
        mindmap_html = f"<h3>Sơ đồ tư duy: {root_title}</h3>"
        for branch in branches:
            mindmap_html += f"<div><strong>• {branch.get('title', '')}</strong></div>"
            for sub in branch.get("children", []):
                mindmap_html += f"<div style='margin-left:16px;'>— {sub.get('title', '')}</div>"

    # Build quiz list
    quiz_html = ""
    if quiz:
        for idx, q in enumerate(quiz, start=1):
            opts = "".join([f"<li>{opt}</li>" for opt in q.get("options", [])])
            quiz_html += (
                f"<div class='quiz-card'>"
                f"<div class='quiz-q'><strong>Câu {idx}:</strong> {q.get('question', '')}</div>"
                f"<ul>{opts}</ul>"
                f"<div><strong>Đáp án:</strong> {q.get('correct_answer', '')}</div>"
                f"<div><em>Giải thích:</em> {q.get('explanation', '')}</div>"
                f"</div>"
            )

    # Sections outline
    sections_html = ""
    for s in sections:
        sections_html += (
            f"<div style='margin-top:8px;'><strong>{s.get('title', '')}</strong> "
            f"({s.get('start_sec', 0)}s - {s.get('end_sec', 0)}s)</div>"
            f"<p>{s.get('summary', '')}</p>"
        )

    html_template = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
body {{ font-family: 'Segoe UI', sans-serif; color: #1e1b4b; padding: 30px; line-height: 1.6; }}
h1 {{ font-size: 26px; font-weight: 800; margin-bottom: 4px; }}
h2 {{ font-size: 16px; font-weight: 700; margin-top: 26px; border-bottom: 2px solid #06d6a0; padding-bottom: 6px; }}
h3 {{ font-size: 14px; font-weight: 700; margin-top: 16px; color: #7b2cbf; }}
.header {{ background: linear-gradient(135deg, #fff1ef, #e3fbf4); padding: 16px 20px; border-radius: 12px; border: 1px solid rgba(30,27,75,0.08); margin-bottom: 20px; }}
.meta {{ font-size: 10px; color: #8a90a6; margin-top: 4px; }}
.quiz-card {{ background: #f3e9fb; padding: 12px; border-radius: 10px; margin: 8px 0; border-left: 4px solid #7b2cbf; }}
.quiz-q {{ font-weight: 700; font-size: 11px; margin-bottom: 6px; }}
ul {{ margin: 6px 0 6px 20px; padding: 0; }}
</style>
</head>
<body>
<div class="header">
  <h1>{title}</h1>
  <div class="meta">Nguồn: {url} | Ngôn ngữ: {lang}</div>
</div>

<h2>1. Tóm tắt bài giảng</h2>
<p>{summary}</p>

<h2>2. Các luận điểm chính</h2>
{sections_html}

<h2>3. Sơ đồ tư duy</h2>
{mindmap_html}

<h2>4. Ngân hàng câu hỏi trắc nghiệm</h2>
{quiz_html}

<h2>5. Phụ đề song ngữ (đầy đủ)</h2>
<p><em>Phần này sẽ hiển thị bảng phụ đề song ngữ từ dữ liệu segments.</em></p>

</body>
</html>"""
    return html_template
