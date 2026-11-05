import os
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from urllib.parse import urlsplit

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

        base_dir = os.path.dirname(os.path.dirname(__file__))
        possible_paths = []

        # Ưu tiên đường dẫn cấu hình tường minh (Docker mount file vào /app/secrets).
        env_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "").strip()
        if env_path:
            possible_paths.append(env_path)
            if not os.path.isabs(env_path):
                possible_paths.append(os.path.join(base_dir, env_path))
                possible_paths.append(os.path.join(os.getcwd(), env_path))

        # Fallback: tìm serviceAccountKey.json ở thư mục làm việc hoặc src/backend-ai
        possible_paths.extend(
            [
                os.path.join(os.getcwd(), "serviceAccountKey.json"),
                os.path.join(base_dir, "serviceAccountKey.json"),
                os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"),
            ]
        )

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

    def get_referenced_media_filenames(self) -> Optional[set]:
        """Trả về tên các file upload còn được bài giảng/media_owners tham chiếu.

        ``None`` nghĩa là không đọc được Firestore; khi đó vòng dọn dẹp phải bỏ
        qua uploads để tránh xoá nhầm file đang dùng.
        """
        if not self.db:
            self.init_firebase()
        if not self.db:
            return None
        try:
            names = set()
            for collection_name in ("lectures", "media_owners"):
                for doc in self.db.collection(collection_name).stream():
                    data = doc.to_dict() or {}
                    for field in ("media_url", "media_stream_url"):
                        value = data.get(field)
                        if not value:
                            continue
                        path = urlsplit(str(value)).path
                        if "/uploads/" not in path:
                            continue
                        name = os.path.basename(path)
                        if name:
                            names.add(name)
            return names
        except Exception as exc:
            logger.warning("Không đọc được danh sách media đang dùng: %s", exc)
            return None

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

    @staticmethod
    def _history_item(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Chuẩn hoá một document Firestore thành mục lịch sử trả về client."""
        v_url = data.get("video_url")
        if not v_url:
            return None

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

        return {
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
        }

    def get_history(
        self,
        limit: int = 25,
        owner_id: Optional[str] = None,
        offset: int = 0,
    ) -> tuple[List[Dict[str, Any]], bool]:
        """Lấy một trang lịch sử bài giảng của user, mới nhất trước.

        Ưu tiên truy vấn có thứ tự ở phía server (``cached_at`` giảm dần) để
        không tải cả collection vào RAM. Dữ liệu cũ thiếu ``cached_at`` (hoặc
        thiếu composite index) sẽ được xử lý bằng fallback quét giới hạn và
        sắp xếp trong bộ nhớ; chạy ``scripts/backfill_cached_at.py`` để chuyển
        hoàn toàn sang đường truy vấn nhanh.
        """
        if not self.db:
            self.init_firebase()
        if not self.db:
            return [], False

        try:
            limit = max(1, min(int(limit or 25), 100))
            offset = max(0, int(offset or 0))

            if not owner_id:
                return [], False

            server_items: List[Dict[str, Any]] = []
            server_ok = False
            try:
                docs = list(
                    self.db.collection("lectures")
                    .where("owner_id", "==", owner_id)
                    .order_by("cached_at", direction="DESCENDING")
                    .offset(offset)
                    .limit(limit + 1)
                    .stream()
                )
                server_ok = True
            except Exception as exc:
                # Thiếu index/trường cached_at: dùng đường fallback bên dưới.
                logger.info(f"Chưa dùng được truy vấn lịch sử có thứ tự: {exc}")
                docs = []

            if server_ok:
                seen_server = set()
                for doc in docs:
                    item = self._history_item(doc.to_dict() or {})
                    if not item or item["video_url"] in seen_server:
                        continue
                    seen_server.add(item["video_url"])
                    server_items.append(item)
                if server_items:
                    return server_items[:limit], len(server_items) > limit

            # Fallback: dữ liệu cũ chưa có cached_at hoặc Firestore chưa có index.
            query = self.db.collection("lectures").where("owner_id", "==", owner_id)
            # Lấy dư để bù các bản ghi trùng URL và biết còn trang sau hay không.
            fetch_limit = min(1000, (offset + limit + 1) * 2)
            docs = list(query.limit(fetch_limit).stream())
            docs.sort(
                key=lambda d: str(
                    (d.to_dict() or {}).get("cached_at")
                    or (d.to_dict() or {}).get("created_at")
                    or ""
                ),
                reverse=True,
            )

            history = []
            seen_urls = set()
            for doc in docs:
                item = self._history_item(doc.to_dict() or {})
                if not item or item["video_url"] in seen_urls:
                    continue
                seen_urls.add(item["video_url"])
                history.append(item)
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

    def list_deleted_users(self, limit: int = 50) -> list:
        """Trả về danh sách rút gọn các tài khoản đang bị xoá mềm."""
        if not self.db:
            self.init_firebase()
        if not self.db:
            return []

        cap = max(1, min(int(limit or 50), 200))
        users = {}
        try:
            # Truy vấn cả hai dấu hiệu để không bỏ sót dữ liệu cũ chỉ có
            # account_status="deleted" (trước khi thêm trường deleted).
            queries = [
                self.db.collection("users").where("deleted", "==", True),
                self.db.collection("users").where("account_status", "==", "deleted"),
            ]
            for query in queries:
                for doc in query.limit(cap).stream():
                    data = doc.to_dict() or {}
                    users[doc.id] = {
                        "id": doc.id,
                        "email": data.get("email"),
                        "display_name": data.get("display_name"),
                        "auth_provider": data.get("auth_provider") or "password",
                        "deleted_at": data.get("deleted_at"),
                        "account_status": data.get("account_status") or "deleted",
                    }
                    if len(users) >= cap:
                        break
                if len(users) >= cap:
                    break
        except Exception as exc:
            logger.warning("Không đọc được danh sách tài khoản đã xoá: %s", exc)
            return []
        return list(users.values())[:cap]

    @staticmethod
    def _count_query(query) -> Optional[int]:
        """Đếm bằng aggregation của Firestore; trả None nếu SDK/DB không hỗ trợ."""
        try:
            result = query.count().get()
            return int(result[0][0].value)
        except Exception as exc:
            logger.warning("Không đếm được tài liệu Firestore: %s", exc)
            return None

    def count_collection(self, collection_name: str) -> Optional[int]:
        """Số tài liệu trong collection, dùng count() thay vì tải toàn bộ."""
        if not self.db:
            self.init_firebase()
        if not self.db:
            return None
        return self._count_query(self.db.collection(collection_name))

    def count_deleted_users(self) -> Optional[int]:
        """Số tài khoản xoá mềm (hỗ trợ cả dữ liệu cũ chỉ có account_status)."""
        if not self.db:
            self.init_firebase()
        if not self.db:
            return None
        counts = []
        for field, value in (("deleted", True), ("account_status", "deleted")):
            try:
                try:
                    from google.cloud.firestore_v1.base_query import FieldFilter

                    query = self.db.collection("users").where(
                        filter=FieldFilter(field, "==", value)
                    )
                except ImportError:
                    query = self.db.collection("users").where(field, "==", value)
            except Exception as exc:
                logger.warning("Không tạo được truy vấn đếm tài khoản: %s", exc)
                continue
            count = self._count_query(query)
            if count is not None:
                counts.append(count)
        return max(counts) if counts else None

    def restore_user_account(self, user_id: str) -> Dict[str, Any]:
        """Khôi phục tài khoản xoá mềm bằng cách xoá các dấu hiệu vô hiệu hoá."""
        if not self.db:
            self.init_firebase()
        if not self.db:
            return {"restored": False, "reason": "firebase_unavailable"}

        user_ref = self.db.collection("users").document(user_id)
        snapshot = user_ref.get()
        if not snapshot.exists:
            return {"restored": False, "reason": "not_found"}

        data = snapshot.to_dict() or {}
        if not (data.get("deleted") or data.get("deleted_at") or data.get("account_status") == "deleted"):
            return {"restored": False, "reason": "not_deleted"}

        try:
            user_ref.update(
                {
                    "deleted": False,
                    "deleted_at": None,
                    "account_status": "active",
                }
            )
        except Exception as exc:
            logger.warning("Không khôi phục được tài khoản %s: %s", user_id, exc)
            return {"restored": False, "reason": "update_failed"}

        logger.info("Đã khôi phục tài khoản %s", user_id)
        return {
            "restored": True,
            "user": {
                "id": user_id,
                "email": data.get("email"),
                "display_name": data.get("display_name"),
                "auth_provider": data.get("auth_provider") or "password",
            },
        }

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
                    "token_version": int(user.get("token_version") or 0) + 1,
                    "refresh_sessions": [],
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

