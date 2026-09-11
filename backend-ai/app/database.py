import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger("uvicorn")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    try:
        logger.info(f"Đang kết nối tới MongoDB: {settings.MONGODB_URI} ...")
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        # Test kết nối ping
        await db_instance.client.admin.command('ping')
        logger.info("Kết nối MongoDB thành công!")
    except Exception as e:
        logger.warning(f"Chưa kết nối được MongoDB ({e}). Hệ thống sẽ chạy ở chế độ Local In-Memory Cache.")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        logger.info("Đã đóng kết nối MongoDB.")
