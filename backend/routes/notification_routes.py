from fastapi import APIRouter, Depends
from backend.models.store import DBStore
from backend.middleware.auth import require_auth

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("")
async def get_notifications(student_id: str = Depends(require_auth)):
    notifs = DBStore.find_notifications_by_student(student_id)
    return {
        "success": True,
        "notifications": notifs
    }

@router.put("/{notif_id}/read")
async def mark_read(notif_id: str, student_id: str = Depends(require_auth)):
    DBStore.mark_notification_read(notif_id, student_id)
    return {
        "success": True,
        "message": "Notification marked as read."
    }

@router.put("/read-all")
async def mark_all_read(student_id: str = Depends(require_auth)):
    count = DBStore.mark_all_notifications_read(student_id)
    return {
        "success": True,
        "updatedCount": count
    }
