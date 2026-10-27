from fastapi import APIRouter, Depends, HTTPException, Query
from app.firebase_database import firebase_service
from app.core.dependencies import get_current_user, get_optional_user

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
@router.get("/")
async def get_lecture_history(limit: int = 25, user=Depends(get_optional_user)):
    """
    Lấy danh sách các bài giảng của riêng người dùng từ Google Firebase Firestore Cloud
    """
    if not user:
        return {
            "items": [],
            "total": 0,
            "storage": "Google Firebase Firestore Cloud"
        }
    items = firebase_service.get_history(limit=limit, owner_id=user["id"])

    return {
        "items": items,
        "total": len(items),
        "storage": "Google Firebase Firestore Cloud",
        "owner_id": user["id"]
    }


@router.delete("")
@router.delete("/")
async def delete_lecture_history(
    video_url: str = Query(..., description="URL video bài giảng cần xóa"),
    user=Depends(get_current_user),
):
    """
    Xóa bài giảng khỏi kho lưu trữ Google Firebase Firestore Cloud
    """
    success = firebase_service.delete_lecture(video_url, owner_id=user["id"])
    if not success:
        raise HTTPException(status_code=500, detail="Không thể xóa bài giảng khỏi CSDL.")
    return {"status": "success", "message": "Đã xóa bài giảng thành công."}
