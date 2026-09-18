import os
import hashlib
import logging
from typing import Optional, List, Dict, Any

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    firebase_admin = None
    credentials = None
    firestore = None

logger = logging.getLogger("uvicorn")

class FirebaseService:
    def __init__(self):
        self.db = None
        self.initialized = False

    def init_firebase(self):
        """Khởi tạo kết nối Firebase Admin SDK từ file serviceAccountKey.json"""
        if self.initialized and self.db is not None:
            return

        # Tìm file serviceAccountKey.json ở root hoặc thư mục backend-ai
        possible_paths = [
            os.path.join(os.getcwd(), "serviceAccountKey.json"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json"),
            os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"),
        ]

        key_path = None
        for p in possible_paths:
            if os.path.exists(p):
                key_path = p
                break

        if not key_path:
            logger.warning("Không tìm thấy file serviceAccountKey.json. Firebase chưa được kích hoạt.")
            return

        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
                logger.info("Khởi tạo Firebase Admin SDK thành công!")

            self.db = firestore.client()
            self.initialized = True
            logger.info("Kết nối Google Firebase Cloud Firestore THÀNH CÔNG! Sẵn sàng làm Kho Cache vĩnh cửu.")
        except Exception as e:
            logger.error(f"Lỗi khi kết nối tới Firebase: {e}")
            self.db = None

    @staticmethod
    def get_document_id(video_url: str) -> str:
        """Băm URL thành ID cố định an toàn cho Firestore Document ID"""
        return hashlib.md5(video_url.strip().encode("utf-8")).hexdigest()

    def get_lecture_cache(self, video_url: str) -> Optional[Dict[str, Any]]:
        """
        Tra cứu bài giảng trong Firebase Firestore Cache (0.01s).
        Nếu đã có -> trả về kết quả ngay, TIẾT KIỆM 100% TOKEN GEMINI!
        """
        if not self.db:
            self.init_firebase()
        if not self.db:
            return None

        try:
            doc_id = self.get_document_id(video_url)
            doc_ref = self.db.collection("lectures").document(doc_id)
            doc = doc_ref.get()

            if doc.exists:
                data = doc.to_dict()
                logger.info(f"Tìm thấy bài giảng trong FIREBASE CACHE: {video_url} (Tiết kiệm 100% Token!)")
                return data
        except Exception as e:
            logger.warning(f"Lỗi tra cứu Firebase Cache: {e}")

        return None

    def save_lecture_cache(self, video_url: str, lecture_data: Dict[str, Any]) -> bool:
        """
        Lưu toàn bộ phụ đề, mốc thời gian, bản tóm tắt và câu hỏi trắc nghiệm lên Firebase Firestore
        """
        if not self.db:
            self.init_firebase()
        if not self.db:
            return False

        try:
            doc_id = self.get_document_id(video_url)
            doc_ref = self.db.collection("lectures").document(doc_id)

            # Sao chép và lưu trữ
            save_payload = dict(lecture_data)
            save_payload["cached_at"] = firestore.SERVER_TIMESTAMP

            doc_ref.set(save_payload, merge=True)
            logger.info(f"Đã lưu trữ thành công bài giảng vào Firebase Firestore [ID: {doc_id}]")
            return True
        except Exception as e:
            logger.warning(f"Lỗi ghi dữ liệu vào Firebase Firestore: {e}")
            return False

    def get_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Lấy danh sách các bài giảng gần đây từ Firebase Firestore"""
        if not self.db:
            self.init_firebase()
        if not self.db:
            return []

        try:
            docs = self.db.collection("lectures").limit(limit).stream()
            history = []
            for doc in docs:
                data = doc.to_dict()
                history.append({
                    "video_url": data.get("video_url"),
                    "title": data.get("title"),
                    "duration_seconds": data.get("duration_seconds"),
                    "language": data.get("language"),
                    "summary": data.get("summary"),
                    "segments": data.get("segments", []),
                    "key_points": data.get("key_points", []),
                    "formulas_and_terms": data.get("formulas_and_terms", []),
                    "quiz": data.get("quiz", [])
                })
            return history
        except Exception as e:
            logger.warning(f"Lỗi lấy lịch sử Firebase: {e}")
            return []

firebase_service = FirebaseService()
