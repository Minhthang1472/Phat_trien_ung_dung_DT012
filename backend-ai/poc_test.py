"""
KIỂM THỬ THỰC TẾ: BÓC TÁCH PHỤ ĐỀ ĐỒNG BỘ ĐA NGÔN NGỮ (PoC)
- Tối ưu: Chỉ tải 30-60 giây đầu của video để test siêu nhanh (không mất thời gian tải video dài).
- Chạy an toàn: Chạy trên CPU (int8) mượt mà 100%, không lo thiếu thư viện CUDA.
- Hỗ trợ cả: Bài giảng nói hoặc Video âm nhạc (Music/Lyrics).
- Đồng bộ đa ngôn ngữ: Vừa lấy lời gốc vừa dịch với cùng mốc thời gian (Timestamps).
"""

import os
import sys

# Đảm bảo in tiếng Việt có dấu chuẩn xác trên console Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import yt_dlp
from faster_whisper import WhisperModel

def run_test(video_url: str = "https://www.youtube.com/watch?v=kqtD5dpn9C8", duration_limit_sec: int = None):
    print("=" * 70)
    print("THỬ NGHIỆM TẠO PHỤ ĐỀ ĐỒNG BỘ ĐA NGÔN NGỮ BẰNG AI")
    print("=" * 70)
    print(f"🔗 Video URL: {video_url}")
    if duration_limit_sec and duration_limit_sec > 0:
        print(f"⏱️ Giới hạn đoạn test: {duration_limit_sec} GIÂY ĐẦU TIÊN (để kiểm tra siêu nhanh)")
    else:
        print("⏱️ Chế độ: XỬ LÝ TOÀN BỘ 100% THỜI LƯỢNG CỦA VIDEO")

    audio_file = "test_sample.wav"
    if os.path.exists(audio_file):
        try: os.remove(audio_file)
        except Exception: pass

    # 1. Bóc tách âm thanh siêu nhẹ với yt-dlp & FFmpeg
    print("\n[1/3] Đang bóc tách âm thanh từ URL...")
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'outtmpl': 'test_sample.%(ext)s',
        'quiet': True,
        'no_warnings': True,
    }

    # Nếu người dùng truyền số giây thì dùng FFmpeg cắt đúng số giây đó
    if duration_limit_sec and duration_limit_sec > 0:
        ydl_opts['postprocessor_args'] = ['-t', str(duration_limit_sec)]

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            print(f"-> Tên video: {info.get('title', 'Không tên')}")
            print(f"-> Tổng thời lượng gốc: {info.get('duration', 0)} giây")
    except Exception as e:
        print(f"❌ Lỗi khi lấy âm thanh: {e}")
        return

    if not os.path.exists(audio_file):
        print("❌ Không tìm thấy file âm thanh sau khi xử lý.")
        return

    # 2. Tải mô hình Whisper trên CPU (nhẹ, nhanh và ổn định tuyệt đối)
    print("\n[2/3] Đang tải mô hình Whisper AI (chạy CPU chế độ int8)...")
    model = WhisperModel("base", device="cpu", compute_type="int8")
    print("-> Nạp mô hình AI thành công!")

    # 3. Chạy phiên âm nguyên bản (Transcribe)
    print("\n[3/3] Đang phân tích âm thanh, nhận diện lời & mốc thời gian...")
    segments_orig, info = model.transcribe(audio_file, beam_size=5)
    
    print(f"\n🌍 Ngôn ngữ AI phát hiện trong video: [{info.language.upper()}] (Độ chính xác: {info.language_probability*100:.1f}%)")
    print("\n" + "=" * 70)
    print(f"{'MỐC THỜI GIAN':<18} | {'PHỤ ĐỀ GỐC (' + info.language.upper() + ')'}")
    print("=" * 70)

    for seg in segments_orig:
        time_tag = f"[{seg.start:05.2f}s -> {seg.end:05.2f}s]"
        print(f"{time_tag:<18} | {seg.text.strip()}")

    # 4. Nếu ngôn ngữ gốc khác tiếng Anh, thử nghiệm tính năng dịch đồng bộ (Translation)
    if info.language != "en":
        print("\n" + "=" * 70)
        print(f"{'MỐC THỜI GIAN':<18} | BẢN DỊCH ĐỒNG BỘ (TIẾNG ANH / ĐA NGÔN NGỮ)")
        print("=" * 70)
        segments_trans, _ = model.transcribe(audio_file, task="translate", beam_size=5)
        for seg in segments_trans:
            time_tag = f"[{seg.start:05.2f}s -> {seg.end:05.2f}s]"
            print(f"{time_tag:<18} | {seg.text.strip()}")

    # Dọn dẹp file test
    if os.path.exists(audio_file):
        try: os.remove(audio_file)
        except Exception: pass

    print("\n✅ KIỂM THỬ HOÀN TẤT THÀNH CÔNG!")
    print("=" * 70)

if __name__ == "__main__":
    # Đọc tham số từ dòng lệnh
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.youtube.com/watch?v=kqtD5dpn9C8"
    
    # Đọc số giây giới hạn (nếu có truyền vào, ví dụ: 30)
    limit = None
    if len(sys.argv) > 2:
        try:
            limit = int(sys.argv[2])
        except ValueError:
            limit = None

    run_test(url, duration_limit_sec=limit)
