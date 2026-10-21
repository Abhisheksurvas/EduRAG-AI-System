import os
from typing import Optional, Dict, Any
from datetime import datetime
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

class MongoManager:
    client: Optional[Any] = None
    db_name: str = os.getenv("MONGODB_DB_NAME", "EduRAG_AI_DB")
    status: Dict[str, Any] = {
        "connected": False,
        "status": "disconnected",
        "uriConfigured": False,
        "dbName": os.getenv("MONGODB_DB_NAME", "EduRAG_AI_DB"),
        "host": None,
        "error": None,
        "lastChecked": datetime.utcnow().isoformat(),
    }

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        cls.status["lastChecked"] = datetime.utcnow().isoformat()
        if cls.client:
            try:
                cls.client.admin.command('ping')
                cls.status["connected"] = True
                cls.status["status"] = "connected"
                cls.status["host"] = cls.client.address[0] if cls.client.address else "MongoDB Atlas"
            except Exception as e:
                cls.status["connected"] = False
                cls.status["status"] = "error"
                cls.status["error"] = str(e)
        return cls.status

    @classmethod
    def connect(cls, custom_uri: Optional[str] = None) -> bool:
        uri = custom_uri or os.getenv("MONGODB_URI")
        cls.db_name = os.getenv("MONGODB_DB_NAME", "EduRAG_AI_DB")

        if not uri:
            cls.status["uriConfigured"] = False
            cls.status["status"] = "disconnected"
            cls.status["error"] = "MONGODB_URI not provided in environment variables."
            return False

        if MongoClient is None:
            cls.status["uriConfigured"] = True
            cls.status["status"] = "disconnected"
            cls.status["error"] = "pymongo driver not installed. Install via pip install pymongo."
            return False

        cls.status["uriConfigured"] = True
        cls.status["status"] = "connecting"
        cls.status["dbName"] = cls.db_name

        try:
            cls.client = MongoClient(uri, serverSelectionTimeoutMS=4000)
            cls.client.admin.command('ping')
            cls.status["connected"] = True
            cls.status["status"] = "connected"
            cls.status["host"] = cls.client.address[0] if cls.client.address else "MongoDB Atlas"
            cls.status["error"] = None
            print(f"[MongoDB Atlas Python] Connected successfully to: {cls.status['host']}")
            return True
        except Exception as e:
            cls.status["connected"] = False
            cls.status["status"] = "error"
            cls.status["error"] = str(e)
            print(f"[MongoDB Atlas Python] Connection failed, using in-memory store: {e}")
            cls.client = None
            return False

    @classmethod
    def get_database(cls):
        if cls.client:
            return cls.client[cls.db_name]
        return None

def get_mongo_status() -> Dict[str, Any]:
    return MongoManager.get_status()

def connect_mongodb(custom_uri: Optional[str] = None) -> bool:
    return MongoManager.connect(custom_uri)

def get_db():
    return MongoManager.get_database()
