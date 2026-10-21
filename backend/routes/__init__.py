from backend.routes.auth_routes import router as auth_router
from backend.routes.document_routes import router as document_router
from backend.routes.chat_routes import router as chat_router
from backend.routes.notes_routes import router as notes_router
from backend.routes.quiz_routes import router as quiz_router
from backend.routes.dashboard_routes import router as dashboard_router
from backend.routes.notification_routes import router as notification_router
from backend.routes.profile_routes import router as profile_router
from backend.routes.search_routes import search_router
from backend.routes.health_routes import router as health_router

__all__ = [
    "auth_router",
    "document_router",
    "chat_router",
    "notes_router",
    "quiz_router",
    "dashboard_router",
    "notification_router",
    "profile_router",
    "search_router",
    "health_router",
]
