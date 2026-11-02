"""Dịch vụ xuất tài liệu bài giảng sang PDF / DOCX / Markdown.

PDF ưu tiên WeasyPrint (render HTML đẹp). Nếu máy không có WeasyPrint
(Windows thiếu GTK/Pango), tự động fallback sang ReportLab để vẫn xuất được.
"""

import html
import io
import os
from typing import Any, Dict, List, Tuple

MIME_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "md": "text/markdown; charset=utf-8",
}

SUPPORTED_FORMATS: Tuple[str, ...] = ("pdf", "docx", "md")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def get_mime_type(fmt: str) -> str:
    return MIME_TYPES.get((fmt or "").lower(), "application/octet-stream")


def _esc(value: Any) -> str:
    return html.escape(str(value if value is not None else ""))


def _text(value: Any) -> str:
    return str(value if value is not None else "").strip()


def _fmt_time(seconds: Any) -> str:
    try:
        total = float(seconds)
    except (TypeError, ValueError):
        return "00:00"
    if total < 0:
        return "00:00"
    hours = int(total // 3600)
    minutes = int((total % 3600) // 60)
    secs = int(total % 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def _sections(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [s for s in (data.get("sections") or []) if isinstance(s, dict)]


def _quiz(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [q for q in (data.get("quiz") or []) if isinstance(q, dict)]


def _segments(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [s for s in (data.get("segments") or []) if isinstance(s, dict)]


def _key_points(data: Dict[str, Any]) -> List[str]:
    points = data.get("key_points") or []
    return [_text(p) for p in points if _text(p)]


def _terms(data: Dict[str, Any]) -> List[str]:
    terms = data.get("formulas_and_terms") or []
    return [_text(t) for t in terms if _text(t)]


def flatten_mindmap(node: Any, depth: int = 0, out: List[Tuple[int, str]] = None) -> List[Tuple[int, str]]:
    """Chuyển mindmap dạng cây thành danh sách (độ sâu, tiêu đề)."""
    if out is None:
        out = []
    if not isinstance(node, dict):
        return out
    title = _text(node.get("title") or node.get("name"))
    if title:
        out.append((depth, title))
    for child in node.get("children") or []:
        flatten_mindmap(child, depth + 1, out)
    return out


# ---------------------------------------------------------------------------
# HTML (dùng cho WeasyPrint)
# ---------------------------------------------------------------------------
def build_html_document(data: Dict[str, Any]) -> str:
    title = _esc(data.get("title") or "Bài giảng AI")
    url = _esc(data.get("video_url") or "")
    lang = _esc(data.get("language") or "")
    target_lang = _esc(data.get("target_language") or "")
    created = _esc(data.get("created_at") or data.get("cached_at") or "")
    summary = _esc(data.get("summary") or "Chưa có tóm tắt cho bài giảng này.")

    points_html = "".join(f"<li>{_esc(p)}</li>" for p in _key_points(data)) or "<li>Chưa có luận điểm.</li>"
    terms_html = "".join(f"<li>{_esc(t)}</li>" for t in _terms(data))

    sections_html = ""
    for section in _sections(data):
        sections_html += (
            "<div class='section'>"
            f"<div class='section-title'>{_esc(section.get('title') or 'Phần nội dung')}"
            f"<span class='section-time'>{_fmt_time(section.get('start_sec'))} - {_fmt_time(section.get('end_sec'))}</span></div>"
            f"<p>{_esc(section.get('summary') or '')}</p>"
        )
        sub_points = "".join(f"<li>{_esc(p)}</li>" for p in (section.get("key_points") or []) if _text(p))
        if sub_points:
            sections_html += f"<ul>{sub_points}</ul>"
        sections_html += "</div>"

    mindmap_rows = flatten_mindmap(data.get("mindmap") or {})
    mindmap_html = ""
    for depth, text_value in mindmap_rows:
        mindmap_html += (
            f"<div class='mindmap-node depth-{min(depth, 4)}'>{'•' if depth else '◆'} {_esc(text_value)}</div>"
        )
    if not mindmap_html:
        mindmap_html = "<p>Chưa có sơ đồ tư duy.</p>"

    quiz_html = ""
    for index, item in enumerate(_quiz(data), start=1):
        options = "".join(f"<li>{_esc(opt)}</li>" for opt in (item.get("options") or []))
        quiz_html += (
            "<div class='quiz-card'>"
            f"<div class='quiz-q'>Câu {index}. {_esc(item.get('question') or '')}</div>"
            f"<ul class='quiz-options'>{options}</ul>"
            f"<div class='quiz-answer'>Đáp án: {_esc(item.get('correct_answer') or item.get('answer') or 'A')}</div>"
            f"<div class='quiz-explain'>Giải thích: {_esc(item.get('explanation') or '')}</div>"
            "</div>"
        )
    if not quiz_html:
        quiz_html = "<p>Chưa có câu hỏi trắc nghiệm.</p>"

    subtitle_rows = ""
    for seg in _segments(data):
        original = seg.get("original_text") or seg.get("text") or ""
        translated = seg.get("translated_text") or ""
        subtitle_rows += (
            "<tr>"
            f"<td class='time'>{_fmt_time(seg.get('start'))} - {_fmt_time(seg.get('end'))}</td>"
            f"<td>{_esc(original)}</td>"
            f"<td>{_esc(translated)}</td>"
            "</tr>"
        )
    if subtitle_rows:
        subtitles_html = (
            "<table class='subtitle-table'>"
            "<thead><tr><th>Mốc thời gian</th><th>Tiếng gốc</th><th>Tiếng dịch</th></tr></thead>"
            f"<tbody>{subtitle_rows}</tbody></table>"
        )
    else:
        subtitles_html = "<p>Chưa có dữ liệu phụ đề song ngữ.</p>"

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<style>
  @page {{ size: A4; margin: 16mm 14mm; }}
  body {{ font-family: 'Segoe UI', 'DejaVu Sans', sans-serif; color: #1e1b4b; font-size: 11px; line-height: 1.55; }}
  h1 {{ font-size: 23px; font-weight: 800; margin: 0 0 4px; }}
  h2 {{ font-size: 15px; font-weight: 800; margin: 22px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #06d6a0; }}
  p {{ margin: 6px 0; }}
  ul {{ margin: 6px 0 6px 18px; padding: 0; }}
  li {{ margin-bottom: 3px; }}
  .cover {{ background: linear-gradient(135deg, #fff1ef, #e3fbf4); border: 1px solid rgba(30,27,75,0.08); border-radius: 12px; padding: 16px 18px; }}
  .meta {{ font-size: 9px; color: #8a90a6; margin-top: 5px; }}
  .section {{ margin: 10px 0; padding: 9px 11px; background: #f8f9fe; border-left: 3px solid #06d6a0; border-radius: 6px; }}
  .section-title {{ font-weight: 800; font-size: 12px; color: #00795a; }}
  .section-time {{ float: right; font-weight: 600; font-size: 9px; color: #8a90a6; }}
  .mindmap-node {{ margin: 2px 0; }}
  .depth-1 {{ margin-left: 12px; }}
  .depth-2 {{ margin-left: 24px; }}
  .depth-3 {{ margin-left: 36px; }}
  .depth-4 {{ margin-left: 48px; }}
  .quiz-card {{ background: #f3e9fb; border-left: 4px solid #7b2cbf; border-radius: 8px; padding: 10px 12px; margin: 8px 0; page-break-inside: avoid; }}
  .quiz-q {{ font-weight: 800; font-size: 11px; margin-bottom: 4px; }}
  .quiz-options li {{ font-size: 10px; }}
  .quiz-answer {{ font-size: 10px; font-weight: 800; color: #00795a; margin-top: 4px; }}
  .quiz-explain {{ font-size: 9.5px; color: #475569; margin-top: 2px; }}
  .subtitle-table {{ width: 100%; border-collapse: collapse; font-size: 9px; }}
  .subtitle-table th {{ background: #1e1b4b; color: #fff; text-align: left; padding: 6px; }}
  .subtitle-table td {{ border-bottom: 1px solid #eceef3; padding: 5px 6px; vertical-align: top; }}
  .subtitle-table td.time {{ white-space: nowrap; color: #8a90a6; font-weight: 700; }}
</style>
</head>
<body>
  <div class="cover">
    <h1>{title}</h1>
    <div class="meta">Nguồn: {url or 'Không rõ'} | Ngôn ngữ gốc: {lang or 'Không rõ'} | Ngôn ngữ dịch: {target_lang or 'Không rõ'}</div>
    <div class="meta">Ngày tạo: {created or 'Không rõ'}</div>
  </div>

  <h2>1. Tóm tắt bài giảng</h2>
  <p>{summary}</p>

  <h2>2. Các luận điểm chính</h2>
  <ul>{points_html}</ul>
  {sections_html}

  <h2>3. Thuật ngữ &amp; công thức quan trọng</h2>
  <ul>{terms_html or '<li>Chưa có thuật ngữ.</li>'}</ul>

  <h2>4. Sơ đồ tư duy</h2>
  {mindmap_html}

  <h2>5. Ngân hàng câu hỏi trắc nghiệm</h2>
  {quiz_html}

  <h2>6. Phụ đề song ngữ đầy đủ</h2>
  {subtitles_html}
</body>
</html>"""


# Backwards-compatible alias
def build_pdf_template(data: Dict[str, Any]) -> str:
    return build_html_document(data)


def build_pdf_bytes(data: Dict[str, Any]) -> bytes:
    try:
        import weasyprint  # type: ignore

        return weasyprint.HTML(string=build_html_document(data)).write_pdf()
    except Exception:
        # Windows thường thiếu GTK/Pango -> dùng ReportLab
        return _build_pdf_bytes_reportlab(data)


# ---------------------------------------------------------------------------
# ReportLab fallback
# ---------------------------------------------------------------------------
_FONT_PAIRS = (
    (r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\segoeuib.ttf"),
    (r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\arialbd.ttf"),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"),
    ("/usr/share/fonts/opentype/noto/NotoSans-Regular.ttf", "/usr/share/fonts/opentype/noto/NotoSans-Bold.ttf"),
    ("/Library/Fonts/Arial Unicode.ttf", "/Library/Fonts/Arial Unicode.ttf"),
)


def _register_pdf_fonts() -> Tuple[str, str]:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    regular = None
    bold = None
    for regular_path, bold_path in _FONT_PAIRS:
        if not regular and os.path.exists(regular_path):
            try:
                pdfmetrics.registerFont(TTFont("LectureSans", regular_path))
                regular = "LectureSans"
            except Exception:
                regular = None
        if not bold and os.path.exists(bold_path):
            try:
                pdfmetrics.registerFont(TTFont("LectureSans-Bold", bold_path))
                bold = "LectureSans-Bold"
            except Exception:
                bold = None
        if regular:
            break

    regular = regular or "Helvetica"
    bold = bold or regular
    try:
        pdfmetrics.registerFontFamily(regular, normal=regular, bold=bold, italic=regular, boldItalic=bold)
    except Exception:
        pass
    return regular, bold


def _build_pdf_bytes_reportlab(data: Dict[str, Any]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    regular, bold = _register_pdf_fonts()
    base = getSampleStyleSheet()
    body = ParagraphStyle("BodyVN", parent=base["BodyText"], fontName=regular, fontSize=9.5, leading=14)
    title_style = ParagraphStyle("TitleVN", parent=base["Title"], fontName=bold, fontSize=19, leading=25, spaceAfter=4)
    h2 = ParagraphStyle("H2VN", parent=base["Heading2"], fontName=bold, fontSize=13, leading=18, spaceBefore=12, spaceAfter=6)
    h3 = ParagraphStyle("H3VN", parent=base["Heading3"], fontName=bold, fontSize=10.5, leading=15, spaceBefore=6, spaceAfter=3)
    small = ParagraphStyle("SmallVN", parent=body, fontSize=8.5, leading=12, textColor=colors.HexColor("#475569"))
    cell = ParagraphStyle("CellVN", parent=body, fontSize=8, leading=11)
    cell_head = ParagraphStyle("CellHeadVN", parent=cell, fontName=bold, textColor=colors.white)

    def para(value: Any, style=body) -> Paragraph:
        return Paragraph(_esc(value).replace("\n", "<br/>"), style)

    story: List[Any] = []
    story.append(para(data.get("title") or "Bài giảng AI", title_style))
    meta_line = " | ".join(
        part
        for part in (
            f"Nguồn: {_text(data.get('video_url'))}" if _text(data.get("video_url")) else "",
            f"Ngôn ngữ gốc: {_text(data.get('language'))}" if _text(data.get("language")) else "",
            f"Ngôn ngữ dịch: {_text(data.get('target_language'))}" if _text(data.get("target_language")) else "",
            f"Ngày tạo: {_text(data.get('created_at') or data.get('cached_at'))}"
            if _text(data.get("created_at") or data.get("cached_at"))
            else "",
        )
        if part
    )
    if meta_line:
        story.append(para(meta_line, small))
    story.append(Spacer(1, 8))

    story.append(para("1. Tóm tắt bài giảng", h2))
    story.append(para(data.get("summary") or "Chưa có tóm tắt cho bài giảng này."))

    story.append(para("2. Các luận điểm chính", h2))
    for point in _key_points(data) or ["Chưa có luận điểm."]:
        story.append(para(f"• {point}"))

    for section in _sections(data):
        heading = (
            f"{_text(section.get('title') or 'Phần nội dung')} "
            f"({_fmt_time(section.get('start_sec'))} - {_fmt_time(section.get('end_sec'))})"
        )
        story.append(para(heading, h3))
        if _text(section.get("summary")):
            story.append(para(section.get("summary")))
        for sub_point in section.get("key_points") or []:
            if _text(sub_point):
                story.append(para(f"- {sub_point}"))

    story.append(para("3. Thuật ngữ & công thức quan trọng", h2))
    terms = _terms(data)
    for term in terms or ["Chưa có thuật ngữ."]:
        story.append(para(f"• {term}"))

    story.append(para("4. Sơ đồ tư duy", h2))
    mindmap_rows = flatten_mindmap(data.get("mindmap") or {})
    if mindmap_rows:
        for depth, text_value in mindmap_rows:
            indent = "&nbsp;" * (depth * 4)
            prefix = "◆" if depth == 0 else "•"
            story.append(para(f"{indent}{prefix} {text_value}"))
    else:
        story.append(para("Chưa có sơ đồ tư duy."))

    story.append(para("5. Ngân hàng câu hỏi trắc nghiệm", h2))
    quiz_items = _quiz(data)
    if quiz_items:
        for index, item in enumerate(quiz_items, start=1):
            story.append(para(f"Câu {index}. {_text(item.get('question'))}"))
            for opt in item.get("options") or []:
                if _text(opt):
                    story.append(para(f"&nbsp;&nbsp;&nbsp;{opt}", small))
            story.append(
                para(f"Đáp án: {_text(item.get('correct_answer') or item.get('answer') or 'A')}", small)
            )
            if _text(item.get("explanation")):
                story.append(para(f"Giải thích: {_text(item.get('explanation'))}", small))
            story.append(Spacer(1, 4))
    else:
        story.append(para("Chưa có câu hỏi trắc nghiệm."))

    story.append(para("6. Phụ đề song ngữ đầy đủ", h2))
    segments = _segments(data)
    if segments:
        table_data = [
            [para("Mốc thời gian", cell_head), para("Tiếng gốc", cell_head), para("Tiếng dịch", cell_head)]
        ]
        for seg in segments:
            table_data.append(
                [
                    para(f"{_fmt_time(seg.get('start'))}\n{_fmt_time(seg.get('end'))}", cell),
                    para(seg.get("original_text") or seg.get("text") or "", cell),
                    para(seg.get("translated_text") or "", cell),
                ]
            )
        table = Table(table_data, colWidths=[26 * mm, 72 * mm, 72 * mm], repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e1b4b")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d5d8e4")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fe")]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(table)
    else:
        story.append(para("Chưa có dữ liệu phụ đề song ngữ."))

    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=_text(data.get("title") or "Bài giảng AI"),
    )
    document.build(story)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# DOCX
# ---------------------------------------------------------------------------
def build_docx_bytes(data: Dict[str, Any]) -> bytes:
    from docx import Document
    from docx.shared import Pt

    document = Document()
    document.add_heading(_text(data.get("title") or "Bài giảng AI"), level=0)

    meta_parts = []
    if _text(data.get("video_url")):
        meta_parts.append(f"Nguồn: {_text(data.get('video_url'))}")
    if _text(data.get("language")):
        meta_parts.append(f"Ngôn ngữ gốc: {_text(data.get('language'))}")
    if _text(data.get("target_language")):
        meta_parts.append(f"Ngôn ngữ dịch: {_text(data.get('target_language'))}")
    if _text(data.get("created_at") or data.get("cached_at")):
        meta_parts.append(f"Ngày tạo: {_text(data.get('created_at') or data.get('cached_at'))}")
    if meta_parts:
        meta_paragraph = document.add_paragraph(" | ".join(meta_parts))
        meta_paragraph.runs[0].font.size = Pt(9)

    document.add_heading("1. Tóm tắt bài giảng", level=1)
    document.add_paragraph(_text(data.get("summary") or "Chưa có tóm tắt cho bài giảng này."))

    document.add_heading("2. Các luận điểm chính", level=1)
    for point in _key_points(data) or ["Chưa có luận điểm."]:
        document.add_paragraph(point, style="List Bullet")

    for section in _sections(data):
        document.add_heading(_text(section.get("title") or "Phần nội dung"), level=2)
        time_range = f"{_fmt_time(section.get('start_sec'))} - {_fmt_time(section.get('end_sec'))}"
        document.add_paragraph(time_range).runs[0].italic = True
        if _text(section.get("summary")):
            document.add_paragraph(_text(section.get("summary")))
        for sub_point in section.get("key_points") or []:
            if _text(sub_point):
                document.add_paragraph(sub_point, style="List Bullet 2")

    document.add_heading("3. Thuật ngữ & công thức quan trọng", level=1)
    for term in _terms(data) or ["Chưa có thuật ngữ."]:
        document.add_paragraph(term, style="List Bullet")

    document.add_heading("4. Sơ đồ tư duy", level=1)
    mindmap_rows = flatten_mindmap(data.get("mindmap") or {})
    if mindmap_rows:
        for depth, text_value in mindmap_rows:
            style = "List Bullet" if depth == 0 else "List Bullet 2"
            document.add_paragraph(text_value, style=style)
    else:
        document.add_paragraph("Chưa có sơ đồ tư duy.")

    document.add_heading("5. Ngân hàng câu hỏi trắc nghiệm", level=1)
    quiz_items = _quiz(data)
    if quiz_items:
        for index, item in enumerate(quiz_items, start=1):
            document.add_paragraph().add_run(f"Câu {index}. {_text(item.get('question'))}").bold = True
            for opt in item.get("options") or []:
                if _text(opt):
                    document.add_paragraph(opt, style="List Bullet")
            answer_run = document.add_paragraph().add_run(
                f"Đáp án: {_text(item.get('correct_answer') or item.get('answer') or 'A')}"
            )
            answer_run.bold = True
            if _text(item.get("explanation")):
                document.add_paragraph(f"Giải thích: {_text(item.get('explanation'))}")
    else:
        document.add_paragraph("Chưa có câu hỏi trắc nghiệm.")

    document.add_heading("6. Phụ đề song ngữ đầy đủ", level=1)
    segments = _segments(data)
    if segments:
        table = document.add_table(rows=1, cols=3)
        table.style = "Table Grid"
        header_cells = table.rows[0].cells
        header_cells[0].text = "Mốc thời gian"
        header_cells[1].text = "Tiếng gốc"
        header_cells[2].text = "Tiếng dịch"
        for cell in header_cells:
            for run in cell.paragraphs[0].runs:
                run.bold = True
        for seg in segments:
            row = table.add_row().cells
            row[0].text = f"{_fmt_time(seg.get('start'))} - {_fmt_time(seg.get('end'))}"
            row[1].text = _text(seg.get("original_text") or seg.get("text"))
            row[2].text = _text(seg.get("translated_text"))
    else:
        document.add_paragraph("Chưa có dữ liệu phụ đề song ngữ.")

    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------
def build_markdown_text(data: Dict[str, Any]) -> str:
    lines: List[str] = []
    lines.append(f"# {_text(data.get('title') or 'Bài giảng AI')}")
    lines.append("")

    meta_parts = []
    if _text(data.get("video_url")):
        meta_parts.append(f"**Nguồn:** {_text(data.get('video_url'))}")
    if _text(data.get("language")):
        meta_parts.append(f"**Ngôn ngữ gốc:** {_text(data.get('language'))}")
    if _text(data.get("target_language")):
        meta_parts.append(f"**Ngôn ngữ dịch:** {_text(data.get('target_language'))}")
    if _text(data.get("created_at") or data.get("cached_at")):
        meta_parts.append(f"**Ngày tạo:** {_text(data.get('created_at') or data.get('cached_at'))}")
    if meta_parts:
        lines.append("  \n".join(meta_parts))
        lines.append("")

    lines.append("## 1. Tóm tắt bài giảng")
    lines.append("")
    lines.append(_text(data.get("summary") or "Chưa có tóm tắt cho bài giảng này."))
    lines.append("")

    lines.append("## 2. Các luận điểm chính")
    lines.append("")
    for point in _key_points(data) or ["Chưa có luận điểm."]:
        lines.append(f"- {point}")
    lines.append("")

    for section in _sections(data):
        lines.append(f"### {_text(section.get('title') or 'Phần nội dung')}")
        lines.append("")
        lines.append(f"*{_fmt_time(section.get('start_sec'))} - {_fmt_time(section.get('end_sec'))}*")
        lines.append("")
        if _text(section.get("summary")):
            lines.append(_text(section.get("summary")))
            lines.append("")
        for sub_point in section.get("key_points") or []:
            if _text(sub_point):
                lines.append(f"- {sub_point}")
        lines.append("")

    lines.append("## 3. Thuật ngữ & công thức quan trọng")
    lines.append("")
    for term in _terms(data) or ["Chưa có thuật ngữ."]:
        lines.append(f"- {term}")
    lines.append("")

    lines.append("## 4. Sơ đồ tư duy")
    lines.append("")
    mindmap_rows = flatten_mindmap(data.get("mindmap") or {})
    for depth, text_value in mindmap_rows:
        lines.append(f"{'  ' * depth}- {text_value}")
    if not mindmap_rows:
        lines.append("_Chưa có sơ đồ tư duy._")
    lines.append("")

    lines.append("## 5. Ngân hàng câu hỏi trắc nghiệm")
    lines.append("")
    quiz_items = _quiz(data)
    if quiz_items:
        for index, item in enumerate(quiz_items, start=1):
            lines.append(f"**Câu {index}. {_text(item.get('question'))}**")
            lines.append("")
            for opt in item.get("options") or []:
                if _text(opt):
                    lines.append(f"- {opt}")
            lines.append("")
            lines.append(f"> Đáp án: **{_text(item.get('correct_answer') or item.get('answer') or 'A')}**  ")
            if _text(item.get("explanation")):
                lines.append(f"> Giải thích: {_text(item.get('explanation'))}")
            lines.append("")
    else:
        lines.append("_Chưa có câu hỏi trắc nghiệm._")
        lines.append("")

    lines.append("## 6. Phụ đề song ngữ đầy đủ")
    lines.append("")
    segments = _segments(data)
    if segments:
        lines.append("| Mốc thời gian | Tiếng gốc | Tiếng dịch |")
        lines.append("| --- | --- | --- |")
        for seg in segments:
            original = _text(seg.get("original_text") or seg.get("text")).replace("|", "\\|").replace("\n", " ")
            translated = _text(seg.get("translated_text")).replace("|", "\\|").replace("\n", " ")
            time_range = f"{_fmt_time(seg.get('start'))} - {_fmt_time(seg.get('end'))}"
            lines.append(f"| {time_range} | {original} | {translated} |")
    else:
        lines.append("_Chưa có dữ liệu phụ đề song ngữ._")
    lines.append("")

    return "\n".join(lines)


def build_export_bytes(data: Dict[str, Any], fmt: str) -> bytes:
    fmt = (fmt or "pdf").lower()
    if fmt == "pdf":
        return build_pdf_bytes(data)
    if fmt == "docx":
        return build_docx_bytes(data)
    if fmt in ("md", "markdown"):
        return build_markdown_text(data).encode("utf-8")
    raise ValueError(f"Định dạng không hỗ trợ: {fmt}")
