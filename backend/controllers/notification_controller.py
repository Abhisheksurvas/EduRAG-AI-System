from typing import Dict, Any
from backend.models.store import DBStore

class NotificationController:
    @staticmethod
    def get_notifications(student_id: str) -> Dict[str, Any]:
        notifications = DBStore.find_notifications_by_student(student_id)
        unread_count = DBStore.count_unread_notifications(student_id)
        return {
            "success": True,
            "notifications": notifications,
            "unreadCount": unread_count,
        }

    @staticmethod
    def mark_as_read(notif_id: str, student_id: str) -> Dict[str, Any]:
        updated = DBStore.mark_notification_read(notif_id, student_id)
        if not updated:
            return {"success": False, "message": "Notification not found."}
        return {"success": True, "notification": updated}

    @staticmethod
    def mark_all_as_read(student_id: str) -> Dict[str, Any]:
        DBStore.mark_all_notifications_read(student_id)
        return {"success": True, "message": "All notifications marked as read."}

    @staticmethod
    def delete_notification(notif_id: str, student_id: str) -> Dict[str, Any]:
        DBStore.delete_notification(notif_id, student_id)
        return {"success": True, "message": "Notification deleted."}

    @staticmethod
    def delete_all_notifications(student_id: str) -> Dict[str, Any]:
        DBStore.delete_all_notifications(student_id)
        return {"success": True, "message": "All notifications cleared."}
