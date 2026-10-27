from typing import List, Dict, Any

class SubtitleExporter:
    @staticmethod
    def format_timestamp(seconds: float, decimal_sep: str = ",") -> str:
        """
        Chuyển đổi số giây thành định dạng HH:MM:SS,mmm (SRT) hoặc HH:MM:SS.mmm (VTT)
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int(round((seconds - int(seconds)) * 1000))
        if millis >= 1000:
            millis = 999

        return f"{hours:02d}:{minutes:02d}:{secs:02d}{decimal_sep}{millis:03d}"

    def to_srt(self, segments: List[Dict[str, Any]]) -> str:
        """
        Chuyển đổi danh sách mốc thời gian thành định dạng SubRip (.srt)
        Tương thích: VLC Player, Windows Media, Premiere, CapCut, v.v.
        """
        srt_blocks = []
        for idx, seg in enumerate(segments, start=1):
            start_str = self.format_timestamp(seg.get("start", 0.0), decimal_sep=",")
            end_str = self.format_timestamp(seg.get("end", 0.0), decimal_sep=",")
            text = seg.get("text", "").strip()

            srt_blocks.append(f"{idx}\n{start_str} --> {end_str}\n{text}\n")

        return "\n".join(srt_blocks)

    def to_vtt(self, segments: List[Dict[str, Any]]) -> str:
        """
        Chuyển đổi danh sách mốc thời gian thành định dạng WebVTT (.vtt)
        Tương thích: Thẻ HTML5 <track>, Trình duyệt Web, Chrome Extension, YouTube.
        """
        vtt_blocks = ["WEBVTT\n"]
        for idx, seg in enumerate(segments, start=1):
            start_str = self.format_timestamp(seg.get("start", 0.0), decimal_sep=".")
            end_str = self.format_timestamp(seg.get("end", 0.0), decimal_sep=".")
            text = seg.get("text", "").strip()

            vtt_blocks.append(f"{idx}\n{start_str} --> {end_str}\n{text}\n")

        return "\n".join(vtt_blocks)

subtitle_exporter = SubtitleExporter()
