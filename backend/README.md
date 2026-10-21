# EduRAG AI - Python Backend

High-performance, multilingual Retrieval-Augmented Generation (RAG) backend implemented in Python with **FastAPI**, **PyMongo**, and **Google GenAI Python SDK**.

---

## 🛠️ Tech Stack
- **Web Framework**: [FastAPI](https://fastapi.tiangolo.com/) with asynchronous ASGI endpoints
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) via PyMongo with in-memory JSON persistence fallback (`.edurag_data/store.json`)
- **AI Engine**: [Google GenAI Python SDK](https://github.com/google-gemini/generative-ai-python) (`google-genai`) with priority model fallback:
  - `gemini-3.1-flash-lite` (fastest latency and active free-tier quota)
  - `gemini-flash-latest`
  - `gemini-3.8-flash`
  - `gemini-3.1-pro-preview`
  - Resilient offline syllabus synthesizer fallback for 429 quota exhaustion
- **Authentication**: JWT (`pyjwt`) and password hashing (`bcrypt`)
- **Document Processing**: `pypdf`, `python-docx`, and custom paragraph/sentence overlap chunking

---

## 📂 Project Structure

```
backend/
├── main.py                     # FastAPI application entry point
├── requirements.txt            # Python dependencies
├── config/
│   ├── __init__.py
│   └── db.py                   # MongoDB Atlas connection & status manager
├── models/
│   ├── __init__.py
│   ├── student.py              # Student models
│   ├── document.py             # Document model
│   ├── document_chunk.py       # Chunk model
│   ├── conversation.py         # Conversation model
│   ├── message.py              # Message model
│   ├── note.py                 # Notes model
│   ├── quiz.py                 # Quiz model
│   ├── notification.py         # Notification model
│   └── store.py                # Dual-layer DBStore (PyMongo + local store.json)
├── middleware/
│   ├── __init__.py
│   └── auth.py                 # JWT Bearer token authentication dependency
├── services/
│   ├── __init__.py
│   ├── gemini_service.py       # Google GenAI SDK integration with multi-model fallback
│   └── sample_docs_service.py  # Seed sample ML, NLP, and RSA notes
├── rag/
│   ├── __init__.py
│   ├── embedding.py            # Vector embeddings & cosine similarity
│   ├── chunker.py              # Document text chunking with overlap
│   ├── extractor.py            # PDF/DOCX/TXT text extraction
│   ├── retrieval.py            # Hybrid vector + keyword RAG search
│   ├── study_material_generator.py # Section 1 grounded answer generator with LaTeX formulas
│   ├── ai_knowledge_generator.py    # Section 2 general AI knowledge answer generator
│   ├── notes_generator.py      # Revision summary & flashcard generator
│   └── quiz_generator.py       # MCQ quiz bank generator
├── controllers/
│   ├── __init__.py
│   ├── auth_controller.py
│   ├── chat_controller.py
│   ├── document_controller.py
│   ├── dashboard_controller.py
│   ├── quiz_controller.py
│   ├── notes_controller.py
│   ├── notification_controller.py
│   ├── profile_controller.py
│   ├── search_controller.py
│   └── health_controller.py
├── utils/
│   ├── __init__.py
│   └── polyfills.py            # Polyfills and environment compatibility helpers
└── routes/
    ├── __init__.py
    ├── auth_routes.py          # /api/auth (register, login, me)
    ├── document_routes.py      # /api/documents (upload, list, delete, chunks)
    ├── chat_routes.py          # /api/chat (message, regenerate, history)
    ├── notes_routes.py         # /api/notes (generate, list, update)
    ├── quiz_routes.py          # /api/quiz (generate, submit)
    ├── dashboard_routes.py     # /api/dashboard/metrics
    ├── notification_routes.py  # /api/notifications
    ├── profile_routes.py       # /api/profile
    ├── search_routes.py        # /api/search
    └── health_routes.py        # /api/health
```

---

## 🚀 Running the Python Backend

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Configure Environment Variables
Set your environment variables in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=your_mongodb_atlas_connection_string_here
MONGODB_DB_NAME=EduRAG_AI_DB
JWT_SECRET=your_jwt_secret_key_here
PORT=8000
```

### 3. Start the FastAPI Server
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive Swagger documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 🧪 Testing with Python
```bash
python3 -c "
from backend.rag.embedding import EmbeddingService
v1 = EmbeddingService.generate_embedding('Precision and Recall')
v2 = EmbeddingService.generate_embedding('Classification Metrics')
print('Cosine Similarity:', EmbeddingService.cosine_similarity(v1, v2))
"
```
