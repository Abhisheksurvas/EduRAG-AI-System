import os
from datetime import datetime
from typing import Dict, Any
from backend.config.db import get_mongo_status, connect_mongodb
from backend.services.gemini_service import is_gemini_configured

class HealthController:
    @staticmethod
    def check() -> Dict[str, Any]:
        mongo = get_mongo_status()
        gemini = is_gemini_configured()

        return {
            "status": "ok",
            "server": "running",
            "timestamp": datetime.utcnow().isoformat(),
            "database": {
                "connected": mongo.get("connected", False),
                "status": mongo.get("status", "disconnected"),
                "dbName": mongo.get("dbName", ""),
                "host": mongo.get("host", "Atlas / Local"),
                "uriConfigured": mongo.get("uriConfigured", False),
                "error": mongo.get("error", None),
            },
            "ai": {
                "geminiConfigured": gemini,
                "model": "gemini-3.1-flash-lite",
                "embeddingModel": "gemini-embedding-2-preview",
            },
            "environment": os.getenv("NODE_ENV", "development"),
        }

    @staticmethod
    def connect_mongo(mongo_uri: str, db_name: str = "") -> Dict[str, Any]:
        if not mongo_uri or not mongo_uri.strip():
            return {"success": False, "message": "MONGODB_URI is required."}

        if db_name:
            os.environ["MONGODB_DB_NAME"] = db_name.strip()

        connected = connect_mongodb(mongo_uri.strip())
        status = get_mongo_status()

        if connected:
            return {
                "success": True,
                "message": "Successfully connected to MongoDB Atlas!",
                "status": status,
            }
        else:
            return {
                "success": False,
                "message": status.get("error") or "Failed to connect to MongoDB Atlas.",
                "status": status,
            }
