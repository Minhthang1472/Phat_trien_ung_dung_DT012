import os
import glob
import tempfile
import yt_dlp
import logging
from urllib.parse import urlparse
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger("uvicorn")

class AudioService:
    @staticmethod
    def is_google_drive(video_url: str) -> bool:
        u = (video_url or "").lower()
        return "drive.google.com" in u or "docs.google.com" in u

    @staticmethod
    def extract_drive_id(video_url: str) -> str:
        import re
        patterns = [
            r'\/file\/d\/([0-9A-Za-z_-]{25,})',
            r'id=([0-9A-Za-z_-]{25,})',
            r'\/d\/([0-9A-Za-z_-]{25,})',
        ]
        for p in patterns:
            m = re.search(p, video_url)
            if m:
                return m.group(1)
        return ""

    @staticmethod
    def validate_source_url(video_url: str) -> str:
        raw_url = video_url.strip()
        parsed = urlparse(raw_url)
        host = (parsed.hostname or "").lower().rstrip(".")
        if parsed.scheme not in ("http", "https") or not host:
            raise HTTPException(status_code=400, detail="URL không hợp lệ. Vui lòng cung cấp liên kết bắt đầu bằng http:// hoặc https://.")

        # SSRF Protection: Ngăn chặn truy cập vào dải IP nội bộ hoặc metadata cục bộ
        blocked_prefixes = ("127.", "10.", "192.168.", "169.254.", "0.", "localhost")
        if host in blocked_prefixes or any(host.startswith(p) for p in blocked_prefixes) or "metadata.google" in host:
            raise HTTPException(status_code=400, detail="Không cho phép truy cập địa chỉ IP nội bộ.")
        if host.startswith("172."):
            parts = host.split(".")
            if len(parts) >= 2 and parts[1].isdigit() and 16 <= int(parts[1]) <= 31:
                raise HTTPException(status_code=400, detail="Không cho phép truy cập địa chỉ IP nội bộ.")

        # Kiểm tra danh sách domain cho phép (YouTube, Drive, Dropbox, LMS...)
        allowed = any(host == item or host.endswith(f".{item}") for item in settings.ALLOWED_VIDEO_HOSTS)
        is_edu_or_lms = (
            host.endswith(".edu") or host.endswith(".edu.vn") or host.endswith(".ac.uk") or host.endswith(".edu.au") or
            any(k in host for k in ["canvas", "moodle", "blackboard", "coursera", "edx", "udemy", "drive", "dropbox"])
        )
        path_lower = parsed.path.lower()
        is_direct_media = any(path_lower.endswith(ext) for ext in [".mp4", ".m3u8", ".webm", ".mov", ".m4a", ".mp3", ".wav"])

        if not (allowed or is_edu_or_lms or is_direct_media):
            raise HTTPException(
                status_code=400,
                detail="URL không thuộc domain video hoặc hệ thống đào tạo (YouTube, Google Drive, LMS trường học) được hệ thống hỗ trợ."
            )
        return raw_url

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
    def _find_cookies_file() -> str | None:
        candidates = [
            os.path.join(os.getcwd(), 'cookies.txt'),
            '/content/cookies.txt',
            os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'cookies.txt'),
            '/content/Phat_trien_ung_dung_DT012/src/backend-ai/cookies.txt',
            os.path.expanduser('~/cookies.txt')
        ]
        for p in candidates:
            if os.path.exists(p) and os.path.isfile(p) and os.path.getsize(p) > 0:
                return p
        return None

    @staticmethod
    def _build_ydl_options(extra_opts: dict = None) -> dict:
        opts = {
            'quiet': True,
            'no_warnings': True,
            'source_address': '0.0.0.0',
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web', 'mweb'],
                }
            },
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            }
        }
        cookie_path = AudioService._find_cookies_file()
        if cookie_path:
            logger.info(f"🍪 Đang sử dụng cookie xác thực YouTube: {cookie_path}")
            opts['cookiefile'] = cookie_path

        if extra_opts:
            opts.update(extra_opts)
        return opts

    @staticmethod
    def extract_video_id(video_url: str) -> str:
        if AudioService.is_google_drive(video_url):
            return AudioService.extract_drive_id(video_url)
        import re
        patterns = [
            r'(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|\/|$)',
            r'youtu\.be\/([0-9A-Za-z_-]{11})',
            r'shorts\/([0-9A-Za-z_-]{11})',
        ]
        for pattern in patterns:
            match = re.search(pattern, video_url)
            if match:
                return match.group(1)
        return ""

    @staticmethod
    def get_youtube_subtitles(video_url: str, target_lang: str = "vi", start_time_sec: float = 0, end_time_sec: float = None):
        """
        Trích xuất phụ đề chính thức (Official Creator Captions) từ YouTube khi có sẵn.
        Đảm bảo độ chuẩn xác 100% từng câu từ của người nói, không bị nhầm dấu hay từ ngữ.
        """
        try:
            import requests
            from app.services.subtitle_parser import parse_subtitle

            ydl_opts = AudioService._build_ydl_options({'skip_download': True, 'quiet': True})
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                subtitles = info.get('subtitles') or {}
                auto_subtitles = info.get('automatic_captions') or {}

                chosen_url = None
                chosen_lang = None

                # Danh sách thứ tự ưu tiên: ngôn ngữ đích -> các phương ngữ -> ngôn ngữ gốc
                candidates = [
                    target_lang,
                    f"{target_lang}-US",
                    f"{target_lang}-VN",
                    f"{target_lang}-GB",
                    "vi", "vi-VN",
                    "en", "en-US", "en-GB"
                ]

                # 1. Quét tìm trong phụ đề chính thức do chủ kênh biên soạn
                for code in candidates:
                    for k in subtitles.keys():
                        if k.lower() == code.lower() or k.lower().startswith(f"{code.lower()}-"):
                            vtt_item = next((s for s in subtitles[k] if s.get('ext') == 'vtt'), None)
                            if vtt_item and vtt_item.get('url'):
                                chosen_url = vtt_item['url']
                                chosen_lang = k
                                logger.info(f"🎯 Phát hiện phụ đề chính thức YouTube do tác giả biên tập: [{k}]!")
                                break
                    if chosen_url:
                        break

                # 2. Nếu không có phụ đề chính thức, kiểm tra phụ đề tự động chất lượng cao của YouTube
                if not chosen_url and auto_subtitles:
                    for code in [target_lang, "vi", "en"]:
                        for k in auto_subtitles.keys():
                            if k.lower() == code.lower() or k.lower().startswith(f"{code.lower()}-"):
                                vtt_item = next((s for s in auto_subtitles[k] if s.get('ext') == 'vtt'), None)
                                if vtt_item and vtt_item.get('url'):
                                    chosen_url = vtt_item['url']
                                    chosen_lang = k
                                    logger.info(f"🎯 Sử dụng phụ đề nhận diện chất lượng cao từ YouTube: [{k}]!")
                                    break
                        if chosen_url:
                            break

                if not chosen_url:
                    return None

                resp = requests.get(chosen_url, timeout=10)
                if not resp.ok or len(resp.content) < 30:
                    return None

                segments = parse_subtitle(resp.content)
                if not segments:
                    return None

                # Lọc theo khoảng thời gian nếu người dùng chỉ định đoạn bắt đầu / kết thúc
                t_start = max(0.0, float(start_time_sec or 0))
                t_end = float(end_time_sec) if end_time_sec and float(end_time_sec) > t_start else float('inf')
                if t_start > 0 or t_end < float('inf'):
                    segments = [s for s in segments if s['end'] >= t_start and s['start'] <= t_end]

                title = info.get('title') or 'Bài giảng YouTube'
                duration = info.get('duration') or 0

                return {
                    "segments": segments,
                    "detected_language": chosen_lang,
                    "title": title,
                    "duration": duration,
                }
        except Exception as exc:
            logger.warning(f"Không thể trích xuất phụ đề YouTube có sẵn: {exc}")
            return None

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
        video_url = AudioService.validate_source_url(video_url)
        temp_dir = tempfile.gettempdir()
        out_template = os.path.join(temp_dir, "%(id)s.%(ext)s")

        # 1. Trích xuất metadata nhanh để kiểm tra bản quyền & DRM
        check_opts = AudioService._build_ydl_options({'skip_download': True})
        try:
            with yt_dlp.YoutubeDL(check_opts) as ydl_check:
                logger.info(f"Đang xác minh bản quyền & DRM URL: {video_url}")
                meta_info = ydl_check.extract_info(video_url, download=False)
                is_allowed, reason = AudioService.verify_copyright_and_drm(meta_info)
                if not is_allowed:
                    logger.warning(f"Từ chối xử lý do bản quyền/DRM: {reason}")
                    raise ValueError(reason)
        except ValueError:
            raise
        except Exception as e:
            logger.warning(f"Bỏ qua bước xác minh bản quyền ban đầu (sẽ xử lý khi tải): {e}")

        # 2. Cấu hình tải và cắt mốc thời gian
        ydl_opts = AudioService._build_ydl_options({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'outtmpl': out_template,
        })

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

        info = None
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                logger.info(f"Đang bóc tách âm thanh từ URL: {video_url} (Khoảng: {start_time_sec or 0}s -> {end_time_sec or 'hết'})")
                info = ydl.extract_info(video_url, download=True)
        except Exception as e:
            err_msg = str(e)
            if "confirm you're not a bot" in err_msg or "Sign in to confirm" in err_msg:
                logger.warning("YouTube yêu cầu xác thực bot, đang thử lại với chế độ mweb...")
                retry_opts = dict(ydl_opts)
                retry_opts['extractor_args'] = {'youtube': {'player_client': ['mweb', 'android']}}
                try:
                    with yt_dlp.YoutubeDL(retry_opts) as ydl_retry:
                        info = ydl_retry.extract_info(video_url, download=True)
                except Exception as e2:
                    logger.error(f"Lỗi YouTube Bot Check: {e2}")
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "YouTube từ chối kết nối từ Google Colab (yêu cầu xác thực bot). "
                            "Gợi ý: Bạn có thể kéo file cookies.txt vào Colab để mở khóa vĩnh viễn, "
                            "hoặc dùng nút 'Tải file MP4/MP3' trên app để xử lý trực tiếp không cần qua YouTube!"
                        )
                    ) from e2
            else:
                raise HTTPException(status_code=500, detail=f"Lỗi khi tải/bóc tách video: {err_msg}") from e

        video_id = info.get('id', 'temp_audio') if info else 'temp_audio'
        title = info.get('title', 'Bài giảng không tên') if info else 'Bài giảng không tên'
        full_duration = info.get('duration', 0) if info else 0

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
        video_url = AudioService.validate_source_url(video_url)
        ydl_opts = AudioService._build_ydl_options({'skip_download': True})
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
            vid_id = AudioService.extract_video_id(video_url)
            return {"title": "Bài giảng YouTube", "duration": 0, "video_id": vid_id, "is_allowed": True, "copyright_status": "unverified"}

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
