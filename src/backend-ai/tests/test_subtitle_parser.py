from app.services.subtitle_parser import parse_subtitle


SRT = """1
00:00:00,000 --> 00:00:02,500
Xin chào các bạn

2
00:00:02,500 --> 00:00:05,000
Đây là bài giảng đầu tiên
"""

VTT = """WEBVTT

NOTE đây là ghi chú

00:00:01.000 --> 00:00:03.000
Dòng phụ đề tiếng Việt

00:00:03.000 --> 00:00:06.500
Second line
"""


def test_parse_srt_segments():
    segments = parse_subtitle(SRT.encode("utf-8"))
    assert len(segments) == 2
    assert segments[0]["start"] == 0.0
    assert segments[0]["end"] == 2.5
    assert segments[0]["text"] == "Xin chào các bạn"
    assert segments[0]["original_text"] == "Xin chào các bạn"
    assert segments[1]["start"] == 2.5


def test_parse_webvtt_skips_metadata():
    segments = parse_subtitle(VTT.encode("utf-8"))
    assert len(segments) == 2
    assert segments[0]["text"] == "Dòng phụ đề tiếng Việt"
    assert segments[1]["end"] == 6.5


def test_parse_subtitle_handles_bom_and_crlf():
    content = "\ufeff1\r\n00:00:00,000 --> 00:00:01,000\r\nNội dung\r\n".encode("utf-8")
    segments = parse_subtitle(content)
    assert len(segments) == 1
    assert segments[0]["text"] == "Nội dung"


def test_parse_subtitle_ignores_garbage():
    assert parse_subtitle(b"khong co timing nao ca") == []
