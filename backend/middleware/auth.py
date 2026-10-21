import os
from typing import Optional, Dict, Any
try:
    from fastapi import Request, HTTPException, Security, Depends
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
except ImportError:
    class Request: pass  # type: ignore
    class HTTPException(Exception):  # type: ignore
        def __init__(self, status_code=500, detail=""):
            self.status_code = status_code
            self.detail = detail
    Security = lambda default=None, **kwargs: default  # type: ignore
    Depends = lambda default=None, **kwargs: default  # type: ignore
    class HTTPBearer:  # type: ignore
        def __init__(self, *args, **kwargs): pass
    class HTTPAuthorizationCredentials:  # type: ignore
        credentials = ""

try:
    import jwt
except ImportError:
    jwt = None  # type: ignore

try:
    import bcrypt
except ImportError:
    bcrypt = None  # type: ignore

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

JWT_SECRET = os.getenv("JWT_SECRET", "edurag-ai-super-secret-jwt-key-2025")
JWT_EXPIRES_IN = "7d"
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def compare_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except:
        return False

def generate_token(student_id: str) -> str:
    payload = {
        "studentId": student_id,
        "id": student_id,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except:
        return None

async def require_auth(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication required. Please log in.")
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or not (payload.get("studentId") or payload.get("id")):
        raise HTTPException(status_code=401, detail="Invalid or expired authentication session.")
    return str(payload.get("studentId") or payload.get("id"))
