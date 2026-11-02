import os
import hashlib
import logging
from datetime import datetime, timezone
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

        # Tìm file serviceAccountKey.json ở thư mục làm việc hoặc trong src/backend-ai
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

    def register_media_owner(self, user_id: str, media_url: str) -> bool:
        """Lưu quyền sở hữu file upload để cấp lại media token sau này."""
        if not self.db:
            self.init_firebase()
        if not self.db:
            return False
        try:
            doc_id = self.get_document_id(f"{user_id}:{media_url}")
            self.db.collection("media_owners").document(doc_id).set(
                {
                    "owner_id": user_id,
                    "media_url": media_url,
                    "created_at": firestore.SERVER_TIMESTAMP,
                },
                merge=True,
            )
            return True
        except Exception as exc:
            logger.warning("Không lưu được quyền sở hữu media: %s", exc)
            return False

    def user_owns_media(self, user_id: str, media_url: str) -> bool:
        """Kiểm tra file media thuộc sở hữu người dùng (bảng media_owners hoặc lectures)."""
        if not self.db:
            self.init_firebase()
        if not self.db:
            return False
        try:
            doc_id = self.get_document_id(f"{user_id}:{media_url}")
            if self.db.collection("media_owners").document(doc_id).get().exists:
                return True
        except Exception as exc:
            logger.warning("Không đọc được media_owners: %s", exc)

        try:
            owned = list(
                self.db.collection("lectures")
                .where("owner_id", "==", user_id)
                .where("media_url", "==", media_url)
                .limit(1)
                .stream()
            )
            return bool(owned)
        except Exception as exc:
            logger.error("Không kiểm tra được quyền sở hữu media: %s", exc)
            return False

    # Các trường chỉ thuộc về một người dùng, không được trả ra từ cache toàn cục.
    PRIVATE_CACHE_FIELDS = {
        "owner_id",
        "folder",
        "tags",
        "media_url",
        "media_stream_url",
        "media_access_token",
        "preview_url",
    }

    @classmethod
    def _public_cache_view(cls, data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not data:
            return None
        return {key: value for key, value in data.items() if key not in cls.PRIVATE_CACHE_FIELDS}

    def get_lecture_cache(self, video_url: str, owner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Tra cứu bài giảng trong Firebase Firestore Cache (0.01s).

        Khi có ``owner_id``, chỉ đọc tài liệu của chính người dùng đó — không
        fallback sang bản cache toàn cục để tránh lộ dữ liệu giữa các tài khoản.
        """
        if not self.db:
            self.init_firebase()
        if not self.db:
            return None

        try:
            base_doc_id = self.get_document_id(video_url)
            if owner_id:
                doc = self.db.collection("lectures").document(f"{owner_id}_{base_doc_id}").get()
                if doc.exists:
                    data = doc.to_dict()
                    logger.info(f"Tìm thấy bài giảng trong FIREBASE CACHE (Owner: {owner_id}): {video_url}")
                    return data
            else:
                doc = self.db.collection("lectures").document(base_doc_id).get()
                if doc.exists:
                    logger.info(f"Tìm thấy bài giảng trong FIREBASE CACHE: {video_url}")
                    return self._public_cache_view(doc.to_dict())

            # Query theo video_url nếu doc_id có định dạng khác (dữ liệu cũ).
            try:
                from google.cloud.firestore_v1.base_query import FieldFilter
                query = self.db.collection("lectures").where(filter=FieldFilter("video_url", "==", video_url))
                if owner_id:
                    query = query.where(filter=FieldFilter("owner_id", "==", owner_id))
            except Exception:
                query = self.db.collection("lectures").where("video_url", "==", video_url)
                if owner_id:
                    query = query.where("owner_id", "==", owner_id)
            docs = list(query.limit(1).stream())
            if docs:
                data = docs[0].to_dict()
                logger.info(f"Tìm thấy bài giảng qua Query FIREBASE CACHE: {video_url}")
                return data if owner_id else self._public_cache_view(data)
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
            owner_id = lecture_data.get("owner_id")
            base_doc_id = self.get_document_id(video_url)
            doc_id = f"{owner_id}_{base_doc_id}" if owner_id else base_doc_id
            doc_ref = self.db.collection("lectures").document(doc_id)

            # Sao chép và lưu trữ
            save_payload = dict(lecture_data)
            save_payload["cached_at"] = firestore.SERVER_TIMESTAMP

            doc_ref.set(save_payload, merge=True)
            # Bản cache toàn cục chỉ giữ nội dung suy ra từ video công khai,
            # không chứa owner/folder/tags hay URL media riêng của người dùng.
            if owner_id:
                try:
                    global_cache_payload = {
                        key: value for key, value in save_payload.items()
                        if key not in self.PRIVATE_CACHE_FIELDS
                    }
                    self.db.collection("lectures").document(base_doc_id).set(global_cache_payload, merge=True)
                except Exception:
                    pass
            logger.info(f"Đã lưu trữ thành công bài giảng vào Firebase Firestore [ID: {doc_id}] (Owner: {owner_id})")
            return True
        except Exception as e:
            logger.warning(f"Lỗi ghi dữ liệu vào Firebase Firestore: {e}")
            return False

    def get_history(
        self,
        limit: int = 25,
        owner_id: Optional[str] = None,
        offset: int = 0,
    ) -> tuple[List[Dict[str, Any]], bool]:
        """Lấy một trang lịch sử bài giảng của user, mới nhất trước.

        Firestore không sắp xếp theo ``cached_at`` nếu thiếu composite index,
        nên lấy thêm ``offset + limit + 1`` bản ghi rồi sắp xếp/khử trùng lặp
        trong bộ nhớ. Trả về ``(items, has_more)``.
        """
        if not self.db:
            self.init_firebase()
        if not self.db:
            return [], False

        try:
            limit = max(1, min(int(limit or 25), 100))
            offset = max(0, int(offset or 0))

            query = self.db.collection("lectures")
            if owner_id:
                query = query.where("owner_id", "==", owner_id)
            else:
                return [], False

            # Lấy dư để bù các bản ghi trùng URL và biết còn trang sau hay không.
            fetch_limit = min(1000, (offset + limit + 1) * 2)
            docs = list(query.limit(fetch_limit).stream())
            def _sort_key(d):
                data = d.to_dict()
                return str(data.get("cached_at") or data.get("created_at") or "")
            docs.sort(key=_sort_key, reverse=True)

            history = []
            seen_urls = set()
            for doc in docs:
                data = doc.to_dict()
                v_url = data.get("video_url")
                # Lọc khử trùng lặp theo URL
                if not v_url or v_url in seen_urls:
                    continue
                seen_urls.add(v_url)

                raw_q = data.get("quiz", [])
                clean_q = [
                    item if isinstance(item, dict) else {
                        "question": str(item).strip(),
                        "options": ["A. Hoàn toàn đồng ý", "B. Cần thêm cơ sở", "C. Không đồng ý", "D. Ý kiến khác"],
                        "correct_answer": "A",
                        "answer": "A",
                        "explanation": "Câu hỏi ôn tập từ bài giảng."
                    }
                    for item in raw_q
                ] if isinstance(raw_q, list) else []
                history.append({
                    "video_url": data.get("video_url"),
                    "media_url": data.get("media_url") or data.get("media_stream_url"),
                    "media_stream_url": data.get("media_stream_url") or data.get("media_url"),
                    "title": data.get("title"),
                    "duration_seconds": data.get("duration_seconds"),
                    "language": data.get("language"),
                    "summary": data.get("summary"),
                    "segments": data.get("segments", []),
                    "key_points": data.get("key_points", []),
                    "formulas_and_terms": data.get("formulas_and_terms", []),
                    "sections": data.get("sections", []),
                    "quiz": clean_q,
                    "quiz_target": data.get("quiz_target"),
                    "folder": data.get("folder") or "Bài giảng chung",
                    "tags": data.get("tags") or ["Bài giảng"],
                    "owner_id": data.get("owner_id"),
                })
                if len(history) >= offset + limit + 1:
                    break

            has_more = len(history) > offset + limit
            return history[offset:offset + limit], has_more
        except Exception as e:
            logger.warning(f"Lỗi lấy lịch sử Firebase: {e}")
            return [], False

    def delete_lecture(self, video_url: str, owner_id: Optional[str] = None) -> bool:
        """Xóa bài giảng của user khỏi Firebase Firestore"""
        if not self.db:
            self.init_firebase()
        if not self.db:
            return False

        try:
            base_id = self.get_document_id(video_url)
            doc_id = f"{owner_id}_{base_id}" if owner_id else base_id
            doc_ref = self.db.collection("lectures").document(doc_id)
            doc = doc_ref.get()

            deleted = False
            if doc.exists and (not owner_id or doc.to_dict().get("owner_id") == owner_id):
                doc_ref.delete()
                logger.info(f"Đã xóa thành công bài giảng khỏi Firebase Firestore [ID: {doc_id}]")
                deleted = True

            # Đồng thời kiểm tra nếu base_id cũng đang mang owner_id của user này thì gỡ bỏ
            if base_id != doc_id:
                base_ref = self.db.collection("lectures").document(base_id)
                base_doc = base_ref.get()
                if base_doc.exists and base_doc.to_dict().get("owner_id") == owner_id:
                    try:
                        base_ref.update({"owner_id": firestore.DELETE_FIELD})
                        logger.info(f"Đã gỡ owner_id khỏi bản cache chung [ID: {base_id}]")
                        deleted = True
                    except Exception:
                        pass

            return deleted or doc.exists
        except Exception as e:
            logger.warning(f"Lỗi khi xóa bài giảng khỏi Firebase Firestore: {e}")
            return False

    def export_user_data(self, user_id: str) -> Dict[str, Any]:
        """Xuất toàn bộ bài giảng và quyền media thuộc về một người dùng."""
        if not self.db:
            self.init_firebase()
        if not self.db:
            return {"lectures": [], "media_owners": []}

        lectures: List[Dict[str, Any]] = []
        media_owners: List[Dict[str, Any]] = []
        try:
            for doc in self.db.collection("lectures").where("owner_id", "==", user_id).stream():
                data = doc.to_dict()
                data.pop("password_hash", None)
                lectures.append(data)
        except Exception as exc:
            logger.warning("Không xuất được danh sách bài giảng: %s", exc)
        try:
            for doc in self.db.collection("media_owners").where("owner_id", "==", user_id).stream():
                media_owners.append(doc.to_dict())
        except Exception as exc:
            logger.warning("Không xuất được danh sách media: %s", exc)

        return {"lectures": lectures, "media_owners": media_owners}

    def soft_delete_user_data(self, user_id: str) -> Dict[str, Any]:
        """Vô hiệu hoá tài khoản (xoá mềm), giữ nguyên toàn bộ dữ liệu.

        Chỉ đánh dấu ``deleted/deleted_at/account_status`` trên tài liệu người
        dùng. Bài giảng, quyền media và file upload vẫn được giữ lại để quản
        trị viên có thể khôi phục hoặc tra cứu khi cần.
        """
        if not self.db:
            self.init_firebase()
        if not self.db:
            return {
                "deleted": False,
                "soft": True,
                "lectures": 0,
                "media_owners": 0,
            }

        retained = {"lectures": 0, "media_owners": 0}
        for collection_name in ("lectures", "media_owners"):
            try:
                retained[collection_name] = len(
                    list(
                        self.db.collection(collection_name)
                        .where("owner_id", "==", user_id)
                        .stream()
                    )
                )
            except Exception as exc:
                logger.warning(
                    "Không đếm được %s của %s: %s", collection_name, user_id, exc
                )

        user_ref = self.db.collection("users").document(user_id)
        snapshot = user_ref.get()
        if not snapshot.exists:
            return {"deleted": False, "soft": True, **retained}

        user = snapshot.to_dict() or {}
        if user.get("deleted") or user.get("deleted_at"):
            return {
                "deleted": True,
                "soft": True,
                "already_deleted": True,
                **retained,
            }

        deleted_at = datetime.now(timezone.utc).isoformat()
        try:
            user_ref.update(
                {
                    "deleted": True,
                    "deleted_at": deleted_at,
                    "account_status": "deleted",
                }
            )
        except Exception as exc:
            logger.warning("Không vô hiệu hoá được tài khoản %s: %s", user_id, exc)
            return {"deleted": False, "soft": True, **retained}

        logger.info(
            "Đã vô hiệu hoá tài khoản %s (giữ lại %s bài giảng, %s media)",
            user_id,
            retained["lectures"],
            retained["media_owners"],
        )
        return {
            "deleted": True,
            "soft": True,
            "deleted_at": deleted_at,
            **retained,
        }


firebase_service = FirebaseService()

