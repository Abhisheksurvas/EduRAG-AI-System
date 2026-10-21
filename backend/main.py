import os
import sys
from pathlib import Path

# Ensure root workspace and backend directories are in sys.path
_current_dir = Path(__file__).resolve().parent
_project_root = _current_dir.parent
for _path in [str(_project_root), str(_current_dir)]:
    if _path not in sys.path:
        sys.path.insert(0, _path)

# Also update PYTHONPATH so uvicorn reloader subprocesses inherit the path
os.environ["PYTHONPATH"] = f"{_project_root}{os.pathsep}{os.environ.get('PYTHONPATH', '')}"

# Ensure console supports UTF-8 on Windows
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment variables from .env in project root or current dir
try:
    from dotenv import load_dotenv
    if (_project_root / ".env").exists():
        load_dotenv(_project_root / ".env")
    elif (_current_dir / ".env").exists():
        load_dotenv(_current_dir / ".env")
    else:
        load_dotenv()
except ImportError:
    pass

from backend.config.db import connect_mongodb, get_mongo_status
from backend.routes.auth_routes import router as auth_router
from backend.routes.document_routes import router as doc_router
from backend.routes.chat_routes import router as chat_router
from backend.routes.notes_routes import router as notes_router
from backend.routes.quiz_routes import router as quiz_router
from backend.routes.dashboard_routes import router as dashboard_router
from backend.routes.notification_routes import router as notif_router
from backend.routes.profile_routes import router as profile_router
from backend.routes.search_routes import search_router
from backend.routes.health_routes import router as health_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[EduRAG AI Python] Starting backend server...")
    connected = connect_mongodb()
    status = get_mongo_status()
    print(f"[Database Status] Mongo connected: {status['connected']} ({status['status']})")
    yield

app = FastAPI(
    title="EduRAG AI Python Backend",
    description="Multilingual RAG exam study assistant API powered by FastAPI, MongoDB Atlas, and Google Gemini.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(doc_router)
app.include_router(chat_router)
app.include_router(notes_router)
app.include_router(quiz_router)
app.include_router(notif_router)
app.include_router(profile_router)
app.include_router(search_router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[Server Error] {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": str(exc) or "Internal server error."}
    )

if __name__ == "__main__":
    # Prevent collision with Node.js frontend server (which defaults to 3000)
    raw_port = os.getenv("PYTHON_PORT") or os.getenv("BACKEND_PORT")
    if not raw_port:
        env_port = os.getenv("PORT", "8000")
        port = 8000 if env_port == "3000" else int(env_port)
    else:
        port = int(raw_port)

    print(f"[EduRAG AI Python] Starting Uvicorn on http://0.0.0.0:{port} (docs: http://localhost:{port}/docs)")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True, app_dir=str(_project_root))
