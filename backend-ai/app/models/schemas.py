from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SubtitleSegment(BaseModel):
    id: int
    start: float = Field(..., description="Thời gian bắt đầu (giây)")
    end: float = Field(..., description="Thời gian kết thúc (giây)")
    text: str = Field(..., description="Nội dung phụ đề chính")
    original_text: Optional[str] = Field(None, description="Văn bản phụ đề ngôn ngữ gốc")
    translated_text: Optional[str] = Field(None, description="Văn bản phụ đề đã dịch")

class ProcessVideoRequest(BaseModel):
    video_url: str = Field(..., description="Đường dẫn URL video bài giảng (YouTube, Drive, LMS)")
    max_duration_seconds: Optional[int] = Field(None, description="Số giây tối đa muốn xử lý thử nghiệm (ví dụ: 10, 30, 60). Để trống hoặc null để xử lý 100% toàn bộ video.")
    source_language: Optional[str] = Field("auto", description="Ngôn ngữ gốc của video bài giảng")
    target_language: Optional[str] = Field("vi", description="Ngôn ngữ phụ đề muốn xuất ra (vi, en, ja, zh, ko...)")
    include_quiz: Optional[bool] = Field(True, description="Tùy chọn tạo câu hỏi trắc nghiệm ôn tập hay không")

class LookaheadSubtitleRequest(BaseModel):
    video_url: str = Field(..., description="URL video dang phat tren trinh duyet")
    start_seconds: float = Field(..., ge=0, description="Moc bat dau cua cua so audio")
    window_seconds: float = Field(15, gt=0, le=20, description="Do dai cua so dem phu de")
    source_language: Optional[str] = Field("auto")
    target_language: Optional[str] = Field("vi")


class BurnSubtitlesRequest(BaseModel):
    media_url: str = Field(..., description="Duong dan /uploads cua video da tai len")
    segments: List[SubtitleSegment] = Field(..., min_length=1)


class ProcessVideoResponse(BaseModel):
    video_url: str
    media_url: Optional[str] = None
    title: str
    duration_seconds: float
    language: str
    detected_language: Optional[str] = None
    segments: List[SubtitleSegment]
    summary: Optional[str] = None
    key_points: Optional[List[str]] = []
    formulas_and_terms: Optional[List[str]] = []
    quiz: Optional[List[dict]] = []
