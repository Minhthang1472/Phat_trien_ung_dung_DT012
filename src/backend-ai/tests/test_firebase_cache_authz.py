from app.firebase_database import FirebaseService


class FakeDoc:
    def __init__(self, data):
        self._data = data
        self.exists = data is not None

    def to_dict(self):
        return dict(self._data or {})


class FakeDocRef:
    def __init__(self, store, doc_id):
        self._store = store
        self._doc_id = doc_id

    def get(self):
        return FakeDoc(self._store.get(self._doc_id))

    def set(self, payload, merge=False):
        if merge and self._doc_id in self._store:
            merged = dict(self._store[self._doc_id])
            merged.update(payload)
            self._store[self._doc_id] = merged
        else:
            self._store[self._doc_id] = dict(payload)


class FakeQuery:
    def __init__(self, docs=None):
        self._docs = docs or []

    def where(self, *args, **kwargs):
        return self

    def limit(self, *_args):
        return self

    def stream(self):
        return iter(self._docs)


class FakeCollection:
    def __init__(self, store):
        self._store = store

    def document(self, doc_id):
        return FakeDocRef(self._store, doc_id)

    def where(self, *args, **kwargs):
        return FakeQuery()


class FakeDB:
    def __init__(self):
        self.collections = {}

    def collection(self, name):
        return FakeCollection(self.collections.setdefault(name, {}))


def _lecture(owner_id="user-1"):
    return {
        "video_url": "https://youtu.be/abc123",
        "owner_id": owner_id,
        "title": "Bài giảng",
        "summary": "Tóm tắt",
        "media_url": "/uploads/private.mp4",
        "media_access_token": "secret-token",
        "folder": "Thư mục riêng",
        "tags": ["riêng-tư"],
        "segments": [{"start": 0, "end": 1, "text": "Xin chào"}],
    }


def test_owner_cache_does_not_fall_back_to_global_document():
    service = FirebaseService()
    service.db = FakeDB()
    url = _lecture()["video_url"]
    base_doc_id = service.get_document_id(url)

    service.db.collection("lectures").document(base_doc_id).set(
        {"video_url": url, "summary": "Bản toàn cục", "segments": []}
    )

    assert service.get_lecture_cache(url, owner_id="user-2") is None


def test_owner_cache_returns_owner_document_only():
    service = FirebaseService()
    service.db = FakeDB()
    url = _lecture()["video_url"]
    base_doc_id = service.get_document_id(url)
    lectures = service.db.collection("lectures")

    lectures.document(base_doc_id).set({"video_url": url, "summary": "Bản toàn cục"})
    lectures.document(f"user-1_{base_doc_id}").set(_lecture())

    assert service.get_lecture_cache(url, owner_id="user-1")["summary"] == "Tóm tắt"
    assert service.get_lecture_cache(url, owner_id="user-2") is None


def test_global_cache_view_strips_private_fields():
    service = FirebaseService()
    service.db = FakeDB()
    url = _lecture()["video_url"]
    base_doc_id = service.get_document_id(url)
    service.db.collection("lectures").document(base_doc_id).set(_lecture())

    data = service.get_lecture_cache(url)

    assert data["summary"] == "Tóm tắt"
    assert "owner_id" not in data
    assert "media_url" not in data
    assert "media_access_token" not in data
    assert "folder" not in data
    assert "tags" not in data


def test_saved_global_copy_has_no_private_metadata():
    service = FirebaseService()
    service.db = FakeDB()
    url = _lecture()["video_url"]

    assert service.save_lecture_cache(url, _lecture()) is True

    base_doc_id = service.get_document_id(url)
    global_doc = service.db.collection("lectures").document(base_doc_id).get().to_dict()
    owner_doc = service.db.collection("lectures").document(f"user-1_{base_doc_id}").get().to_dict()

    assert owner_doc["owner_id"] == "user-1"
    assert owner_doc["media_url"] == "/uploads/private.mp4"
    assert "owner_id" not in global_doc
    assert "media_url" not in global_doc
    assert "media_access_token" not in global_doc
    assert "folder" not in global_doc
    assert "tags" not in global_doc
