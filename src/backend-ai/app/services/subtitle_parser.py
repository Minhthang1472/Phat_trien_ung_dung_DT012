import re
from typing import Any, Dict, List


TIMING_LINE = re.compile(
    r"(?P<start>\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*"
    r"(?P<end>\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})"
)


def _to_seconds(value: str) -> float:
    hours, minutes, seconds = value.replace(",", ".").split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def parse_subtitle(content: bytes) -> List[Dict[str, Any]]:
    """Parse SRT or WebVTT while preserving timestamps supplied by the user."""
    text = content.decode("utf-8-sig", errors="replace").replace("\r\n", "\n")
    lines = text.split("\n")
    segments: List[Dict[str, Any]] = []
    index = 0

    while index < len(lines):
        line = lines[index].strip()
        if not line or line == "WEBVTT" or line.startswith(("NOTE", "STYLE", "REGION")):
            index += 1
            continue
        timing_match = TIMING_LINE.search(line)
        if not timing_match:
            index += 1
            continue

        index += 1
        caption_lines = []
        while index < len(lines) and lines[index].strip():
            caption_lines.append(lines[index].strip())
            index += 1
        caption = "\n".join(caption_lines).strip()
        if caption:
            segments.append({
                "id": len(segments),
                "start": _to_seconds(timing_match.group("start")),
                "end": _to_seconds(timing_match.group("end")),
                "text": caption,
                "original_text": caption,
            })
    return segments
