"""
SCRIPT KHỞI TẠO CƠ SỞ DỮ LIỆU & ĐÁNH CHỈ MỤC (INDEXES) CHO MONGODB
Mục tiêu Tuần 1 - 2:
- Khởi tạo 4 collection cốt lõi: users, lectures, subtitles, summaries
- Đánh chỉ mục (Indexes) để tối ưu hóa tốc độ truy vấn cache video và tìm kiếm phụ đề
"""

import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_db")

async def init_database():
    logger.info(f"Đang kết nối tới MongoDB: {settings.MONGODB_URI}...")
    client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client[settings.DATABASE_NAME]

    try:
        await client.admin.command('ping')
        logger.info("✅ Kết nối MongoDB thành công!")
    except Exception as e:
        logger.error(f"❌ Không thể kết nối MongoDB: {e}")
        logger.info("Gợi ý: Hãy kiểm tra MONGODB_URI trong file .env hoặc đảm bảo MongoDB đã bật.")
        return

    logger.info("Đang thiết lập Collections và Chỉ mục (Indexes)...")

    # 1. Collection 'users'
    # Đánh unique index cho email
    await db["users"].create_index("email", unique=True)
    logger.info("-> Đã tạo index cho collection 'users' (email unique)")

    # 2. Collection 'lectures'
    # Đánh index cho video_url để tra cứu Cache trong 0.01 giây
    await db["lectures"].create_index("video_url", unique=True)
    await db["lectures"].create_index("created_at")
    logger.info("-> Đã tạo index cho collection 'lectures' (video_url unique, created_at)")

    # 3. Collection 'subtitles'
    # Đánh index cho lecture_id để query phụ đề theo bài giảng siêu nhanh
    await db["subtitles"].create_index("lecture_id")
    logger.info("-> Đã tạo index cho collection 'subtitles' (lecture_id)")

    # 4. Collection 'summaries'
    # Đánh index cho lecture_id
    await db["summaries"].create_index("lecture_id")
    logger.info("-> Đã tạo index cho collection 'summaries' (lecture_id)")

    logger.info("🎉 Hoàn tất khởi tạo CSDL và Indexes cho hệ thống!")
    client.close()

if __name__ == "__main__":
    asyncio.run(init_database())
