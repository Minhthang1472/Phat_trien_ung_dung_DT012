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

class ProcessVideoResponse(BaseModel):
    video_url: str
    title: str
    duration_seconds: float
    language: str
    segments: List[SubtitleSegment]
    summary: Optional[str] = None
    key_points: Optional[List[str]] = []
    formulas_and_terms: Optional[List[str]] = []
    quiz: Optional[List[dict]] = []
