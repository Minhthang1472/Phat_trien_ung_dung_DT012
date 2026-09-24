import os
import glob
import tempfile
import yt_dlp
import logging

logger = logging.getLogger("uvicorn")

class AudioService:
    @staticmethod
    def extract_audio_from_url(video_url: str, duration_limit_sec: int = None, start_time_sec: float = 0) -> dict:
        """
        Bóc tách stream âm thanh từ link video (YouTube, Drive, etc.) mà không tải toàn bộ video nặng.
        Trả về: filepath âm thanh tạm và thông tin metadata (title, duration)
        """
        temp_dir = tempfile.gettempdir()
        out_template = os.path.join(temp_dir, "%(id)s.%(ext)s")

        ydl_opts = {
            'format': 'bestaudio/best',
            'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'outtmpl': out_template,
            'quiet': True,
            'no_warnings': True,
        }

        # Nếu truyền số giây giới hạn thì cấu hình FFmpeg chỉ lấy đúng số giây đầu
        if duration_limit_sec and duration_limit_sec > 0:
            # Ask yt-dlp/ffmpeg for only the upcoming playback range. This avoids
            # downloading a whole lecture every time the lookahead buffer advances.
            ydl_opts['download_ranges'] = yt_dlp.utils.download_range_func(
                None,
                [(start_time_sec, start_time_sec + duration_limit_sec)],
            )
            ydl_opts['force_keyframes_at_cuts'] = True

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info(f"Đang phân tích thông tin từ URL: {video_url} (Giới hạn: {duration_limit_sec or 'Toàn bộ'} giây)")
            info = ydl.extract_info(video_url, download=True)
            video_id = info.get('id', 'temp_audio')
            title = info.get('title', 'Bài giảng không tên')
            duration = info.get('duration', 0)
            
            # File wav được FFmpeg xuất ra
            wav_candidates = glob.glob(os.path.join(temp_dir, f"{video_id}*.wav"))
            audio_path = max(wav_candidates, key=os.path.getmtime) if wav_candidates else os.path.join(temp_dir, f"{video_id}.wav")
            
            return {
                "audio_path": audio_path,
                "title": title,
                "duration": duration,
                "video_id": video_id
            }

    @staticmethod
    def extract_audio_from_file(file_bytes: bytes, filename: str, duration_limit_sec: int = None) -> dict:
        """
        Tiếp nhận file âm thanh/video upload trực tiếp từ máy (mp3, wav, mp4, m4a, flac...),
        chuyển đổi và chuẩn hóa thành file WAV 16kHz Mono tối ưu nhất cho mô hình Whisper.
        """
        import subprocess
        import uuid

        temp_dir = tempfile.gettempdir()
        file_ext = os.path.splitext(filename)[1] or ".mp4"
        raw_temp_path = os.path.join(temp_dir, f"raw_{uuid.uuid4().hex[:8]}{file_ext}")
        out_wav_path = os.path.join(temp_dir, f"proc_{uuid.uuid4().hex[:8]}.wav")

        # Lưu file tạm từ bytes
        with open(raw_temp_path, "wb") as f:
            f.write(file_bytes)

        # Chạy FFmpeg chuẩn hóa 16kHz mono
        cmd = ["ffmpeg", "-y", "-i", raw_temp_path]
        if duration_limit_sec and duration_limit_sec > 0:
            cmd.extend(["-t", str(duration_limit_sec)])
        cmd.extend(["-ar", "16000", "-ac", "1", out_wav_path])

        try:
            logger.info(f"Đang chuẩn hóa audio từ file upload: {filename} bằng FFmpeg...")
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        finally:
            if os.path.exists(raw_temp_path):
                try: os.remove(raw_temp_path)
                except Exception: pass

        return {
            "audio_path": out_wav_path,
            "title": os.path.splitext(filename)[0],
            "duration": 0,
            "video_id": f"upload_{uuid.uuid4().hex[:8]}"
        }

audio_service = AudioService()
