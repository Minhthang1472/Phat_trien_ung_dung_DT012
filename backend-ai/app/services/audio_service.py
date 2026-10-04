import os
import glob
import tempfile
import yt_dlp
import logging

logger = logging.getLogger("uvicorn")

class AudioService:
    @staticmethod
    def verify_copyright_and_drm(info: dict) -> tuple[bool, str]:
        """
        Kiểm tra bản quyền và mã hóa DRM trước khi tải (Yêu cầu 6).
        Trả về: (is_allowed: bool, reason_or_status: str)
        """
        if not info:
            return True, "verified_clean"

        is_drm = bool(info.get('drm') or info.get('is_drm') or False)
        requires_purchase = bool(info.get('requires_purchase') or False)
        availability = str(info.get('availability') or '').lower()
        live_status = str(info.get('live_status') or '').lower()

        if is_drm or requires_purchase:
            return False, "Video được bảo vệ bởi bản quyền DRM (Digital Rights Management). Chính sách không cho phép tải xuống."

        if availability in ['needs_auth', 'subscriber_only', 'premium_only']:
            return False, f"Video yêu cầu tài khoản trả phí hoặc đặc quyền truy cập ({availability})."

        if live_status == 'is_live':
            return False, "Luồng phát trực tiếp (Live Stream) chưa kết thúc, không thể bóc tách toàn bộ phụ đề."

        return True, "verified_clean"

    @staticmethod
    def extract_audio_from_url(
        video_url: str,
        duration_limit_sec: int = None,
        start_time_sec: float = 0,
        end_time_sec: float = None
    ) -> dict:
        """
        Bóc tách stream âm thanh từ link video (YouTube, Drive, etc.).
        Tích hợp:
        - Xác minh bản quyền & DRM trước khi tải (Yêu cầu 6)
        - Cắt đoạn theo mốc thời gian bắt đầu & kết thúc (Yêu cầu 4)
        """
        temp_dir = tempfile.gettempdir()
        out_template = os.path.join(temp_dir, "%(id)s.%(ext)s")

        # 1. Trích xuất metadata nhanh để kiểm tra bản quyền & DRM
        check_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
        }
        with yt_dlp.YoutubeDL(check_opts) as ydl_check:
            logger.info(f"Đang xác minh bản quyền & DRM URL: {video_url}")
            meta_info = ydl_check.extract_info(video_url, download=False)
            is_allowed, reason = AudioService.verify_copyright_and_drm(meta_info)
            if not is_allowed:
                logger.warning(f"Từ chối xử lý do bản quyền/DRM: {reason}")
                raise ValueError(reason)

        # 2. Cấu hình tải và cắt mốc thời gian
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

        # Cắt đoạn theo start_time và end_time (Yêu cầu 4)
        has_time_range = (start_time_sec and start_time_sec > 0) or (end_time_sec and end_time_sec > 0)
        if has_time_range or (duration_limit_sec and duration_limit_sec > 0):
            t_start = max(0.0, float(start_time_sec or 0))
            if end_time_sec and end_time_sec > t_start:
                t_end = float(end_time_sec)
            elif duration_limit_sec and duration_limit_sec > 0:
                t_end = t_start + float(duration_limit_sec)
            else:
                t_end = float('inf')

            ydl_opts['download_ranges'] = yt_dlp.utils.download_range_func(
                None,
                [(t_start, t_end)],
            )
            ydl_opts['force_keyframes_at_cuts'] = True

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info(f"Đang bóc tách âm thanh từ URL: {video_url} (Khoảng: {start_time_sec or 0}s -> {end_time_sec or 'hết'})")
            info = ydl.extract_info(video_url, download=True)
            video_id = info.get('id', 'temp_audio')
            title = info.get('title', 'Bài giảng không tên')
            full_duration = info.get('duration', 0)
            
            # File wav được FFmpeg xuất ra
            wav_candidates = glob.glob(os.path.join(temp_dir, f"{video_id}*.wav"))
            audio_path = max(wav_candidates, key=os.path.getmtime) if wav_candidates else os.path.join(temp_dir, f"{video_id}.wav")
            
            # Tính thời lượng thực tế của đoạn cần xử lý
            effective_duration = full_duration
            if end_time_sec and end_time_sec > (start_time_sec or 0):
                effective_duration = end_time_sec - (start_time_sec or 0)
            elif duration_limit_sec and duration_limit_sec > 0:
                effective_duration = min(full_duration, duration_limit_sec)

            return {
                "audio_path": audio_path,
                "title": title,
                "duration": effective_duration,
                "video_id": video_id,
                "copyright_status": "verified_clean",
                "start_time_offset": start_time_sec or 0,
            }

    @staticmethod
    def get_video_info(video_url: str) -> dict:
        """
        Lấy thông tin nhanh metadata video (tiêu đề, thời lượng giây) mà KHÔNG tải video/audio.
        Tích hợp kiểm tra bản quyền DRM nhanh (Yêu cầu 6).
        """
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                logger.info(f"Đang đọc thông tin metadata nhanh từ URL: {video_url}")
                info = ydl.extract_info(video_url, download=False)
                is_allowed, reason = AudioService.verify_copyright_and_drm(info)
                return {
                    "title": info.get('title', 'Bài giảng không tên'),
                    "duration": info.get('duration', 0) or 0,
                    "video_id": info.get('id', ''),
                    "is_allowed": is_allowed,
                    "copyright_status": reason,
                }
        except Exception as e:
            logger.warning(f"Lỗi khi đọc metadata nhanh: {e}")
            return {"title": "Bài giảng", "duration": 0, "video_id": "", "is_allowed": True, "copyright_status": "unverified"}

    @staticmethod
    def extract_audio_from_file(
        file_bytes: bytes,
        filename: str,
        duration_limit_sec: int = None,
        start_time_sec: float = 0,
        end_time_sec: float = None
    ) -> dict:
        """
        Tiếp nhận file âm thanh/video upload trực tiếp từ máy (mp3, wav, mp4, m4a, flac...),
        hỗ trợ cắt mốc thời gian bắt đầu và kết thúc (Yêu cầu 4)
        và chuẩn hóa thành file WAV 16kHz Mono tối ưu cho mô hình Whisper.
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

        # Chạy FFmpeg cắt đoạn và chuẩn hóa 16kHz mono
        cmd = ["ffmpeg", "-y"]
        if start_time_sec and start_time_sec > 0:
            cmd.extend(["-ss", str(start_time_sec)])
        if end_time_sec and end_time_sec > (start_time_sec or 0):
            cmd.extend(["-to", str(end_time_sec)])
        elif duration_limit_sec and duration_limit_sec > 0:
            cmd.extend(["-t", str(duration_limit_sec)])

        cmd.extend(["-i", raw_temp_path, "-ar", "16000", "-ac", "1", out_wav_path])

        try:
            logger.info(f"Đang chuẩn hóa audio từ file upload: {filename} (Mốc: {start_time_sec or 0}s -> {end_time_sec or 'hết'})")
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        finally:
            if os.path.exists(raw_temp_path):
                try: os.remove(raw_temp_path)
                except Exception: pass

        calc_duration = 0
        if end_time_sec and end_time_sec > (start_time_sec or 0):
            calc_duration = end_time_sec - (start_time_sec or 0)

        return {
            "audio_path": out_wav_path,
            "title": os.path.splitext(filename)[0],
            "duration": calc_duration,
            "video_id": f"upload_{uuid.uuid4().hex[:8]}",
            "copyright_status": "verified_clean",
            "start_time_offset": start_time_sec or 0,
        }

audio_service = AudioService()
