from fastapi import APIRouter
from backend.config.db import get_mongo_status
from backend.services.gemini_service import is_gemini_configured

router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("")
async def health_check():
    mongo = get_mongo_status()
    gemini_ready = is_gemini_configured()
    return {
        "status": "healthy",
        "service": "EduRAG AI Backend (Python)",
        "database": mongo,
        "gemini": {
            "configured": gemini_ready,
            "models": ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"]
        }
    }

from pydantic import BaseModel
from typing import Optional
from backend.controllers.health_controller import HealthController

class MongoConnectPayload(BaseModel):
    mongoUri: str
    dbName: Optional[str] = ""

@router.post("/connect-mongo")
async def connect_mongo(payload: MongoConnectPayload):
    return HealthController.connect_mongo(payload.mongoUri, payload.dbName or "")
