# EDURAG AI
## Education Retrieval-Augmented Generation System
### Final-Year College Engineering Project

---

## 📖 Overview
**EDURAG AI** is a production-grade full-stack Education Retrieval-Augmented Generation (RAG) platform built for engineering college students. It solves hallucination and general-knowledge bias by splitting AI responses into **two independent sections**:
1. **Section 1: Based on Study Material** — strictly grounded in uploaded student materials (PDF, DOCX, PPTX, TXT) with exact page citations, or explicitly returning `"The requested information is not available in the selected study material."`
2. **Section 2: Based on AI — Final Answer** — high-yield ChatGPT-style conceptual breakdown using general Gemini knowledge.

In addition, EduRAG AI provides a **Dynamic Notes Generator**, **Verified Quiz Center**, **Student Data Isolation**, and **Persistent MongoDB Atlas Storage**.

---

## 🛠️ Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React icons
- **Backend**: Node.js (v22), Express.js, TypeScript (`tsx`), REST API
- **Database**: MongoDB Atlas via Mongoose
- **AI & RAG Engine**: Google `@google/genai` SDK (`gemini-3.8-flash` & `gemini-embedding-2-preview`)
- **Document Extractors**:
  - PDF: `pdf-parse` (preserving real page numbers)
  - DOCX: `mammoth` (paragraph pagination)
  - PPTX: `adm-zip` (parsing XML slide text per slide)
  - TXT: UTF-8 buffer parser

---

## 📁 Complete Project Structure
```
EduRAG-AI/
├── .env.example                  # Environment configuration template
├── README.md                     # Comprehensive project documentation
├── package.json                  # Full-stack dependencies and scripts
├── server.ts                     # Unified Express server & Vite middleware
├── tsconfig.json                 # TypeScript compiler configuration
├── vite.config.ts                # Vite build and plugin setup
│
├── backend/
│   └── src/
│       ├── config/
│       │   └── db.ts             # MongoDB Atlas connection & health monitoring
│       ├── controllers/
│       │   ├── authController.ts         # Student register, login, profile me
│       │   ├── dashboardController.ts    # Aggregated metrics from MongoDB
│       │   ├── documentController.ts     # Upload, extraction, chunking, delete
│       │   ├── chatController.ts         # Dual-mode RAG Q&A, chat history
│       │   ├── notesController.ts        # Dynamic notes generation & export
│       │   ├── quizController.ts         # Verified quiz generation & scoring
│       │   ├── notificationController.ts # Alerts & unread counts
│       │   ├── profileController.ts      # Student academic metadata
│       │   ├── searchController.ts       # Student-isolated global search
│       │   └── healthController.ts       # Health endpoint & live Atlas connector
│       ├── middleware/
│       │   └── auth.ts           # JWT authentication & student data isolation
│       ├── models/
│       │   ├── Student.ts        # Student collection schema
│       │   ├── Document.ts       # Documents collection schema
│       │   ├── DocumentChunk.ts  # Chunk vectors & page metadata
│       │   ├── Conversation.ts   # Chat conversation threads
│       │   ├── Message.ts        # Dual-mode message storage & source refs
│       │   ├── Note.ts           # Saved generated study notes
│       │   ├── Quiz.ts           # Saved grounded quizzes & scores
│       │   ├── Notification.ts   # Student notification alerts
│       │   └── store.ts          # Storage adapter with Atlas & persistence
│       ├── rag/
│       │   ├── extractor.ts      # Multi-format parser (PDF, DOCX, PPTX, TXT)
│       │   ├── chunker.ts        # Overlapping chunker retaining page numbers
│       │   ├── embedding.ts      # Gemini vector embeddings & cosine similarity
│       │   ├── retrieval.ts      # Hybrid vector + keyword semantic search
│       │   ├── studyMaterialGenerator.ts # Section 1 grounded answer generator
│       │   ├── aiKnowledgeGenerator.ts   # Section 2 general AI answer generator
│       │   ├── notesGenerator.ts # Notes synthesis engine
│       │   └── quizGenerator.ts  # Grounded quiz generator with validation
│       ├── routes/               # Express REST route definitions
│       └── services/
│           └── gemini.ts         # GoogleGenAI initialization & telemetry
│
└── src/                          # React Frontend
    ├── components/
    │   ├── common/
    │   │   ├── GlobalSearchModal.tsx
    │   │   └── MongoStatusModal.tsx
    │   ├── documents/
    │   │   └── DocumentManagerModal.tsx
    │   └── layout/
    │       ├── Navbar.tsx
    │       ├── Sidebar.tsx
    │       └── StudentLayout.tsx
    ├── contexts/
    │   ├── AuthContext.tsx
    │   ├── ThemeContext.tsx
    │   └── ToastContext.tsx
    ├── pages/
    │   ├── AiAssistantPage.tsx   # ChatGPT-style dual-mode study chat
    │   ├── DashboardPage.tsx     # Student home dashboard
    │   ├── LoginPage.tsx         # Student login
    │   ├── NotesPage.tsx         # Notes generator & export
    │   ├── NotificationsPage.tsx # Notification feed
    │   ├── ProfilePage.tsx       # Student profile manager
    │   ├── QuizCenterPage.tsx    # Grounded interactive quiz taker
    │   └── RegisterPage.tsx      # Student registration
    ├── services/
    │   └── api.ts                # Frontend HTTP client & token handling
    ├── types/
    │   └── index.ts              # Shared TypeScript interfaces
    ├── App.tsx                   # Main SPA router
    ├── index.css                 # Global Tailwind CSS
    └── main.tsx                  # React DOM mount point
```

---

## 🔐 Environment Variables
Create a `.env` file in the project root:
```env
# Gemini API Key (for embeddings and chat generation)
GEMINI_API_KEY="your-google-ai-studio-gemini-key"

# MongoDB Atlas Cluster Connection String
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB_NAME="EduRAG_AI_DB"

# JWT Secret for Student Authentication
JWT_SECRET="edurag-ai-super-secret-key-2026"

# Server Port
PORT=3000
```

---

## 🍃 MongoDB Atlas Setup Instructions
1. Log in to [MongoDB Cloud](https://cloud.mongodb.com/).
2. Create a Free **M0 Shared Cluster**.
3. Under **Database Access**, create a database user (e.g., `edurag_admin`) with password.
4. Under **Network Access**, add IP Access List entry `0.0.0.0/0` (Allow access from anywhere).
5. In your Cluster Overview, click **Connect** → **Drivers** (Node.js).
6. Copy the connection string and paste it into `MONGODB_URI` in `.env` or in the in-app **MongoDB Atlas Config** modal.
7. The database name is set to `EduRAG_AI_DB`.

---

## 🚀 How to Run the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Full-Stack Development Server
Runs Express backend and Vite frontend with hot reload on port 3000:
```bash
npm run dev
```

### 3. Production Build & Start
```bash
npm run build
npm start
```
Open your browser at `http://localhost:3000`.

---

## 🌐 API Endpoint Reference

### Authentication
- `POST /api/auth/register` — Register student account
- `POST /api/auth/login` — Sign in and receive JWT token
- `POST /api/auth/logout` — End student session
- `GET /api/auth/me` — Get authenticated student profile

### Dashboard
- `GET /api/dashboard` — Aggregated counts and recent materials

### Document Management
- `POST /api/documents/upload` — Multipart upload (PDF, DOCX, PPTX, TXT) with automatic RAG indexing
- `GET /api/documents` — List uploaded materials
- `GET /api/documents/:id` — Retrieve specific document
- `DELETE /api/documents/:id` — Delete document and associated vector chunks
- `DELETE /api/documents` — Clear all student documents

### AI Study Assistant (RAG)
- `GET /api/chat/conversations` — Load student chat threads
- `POST /api/chat/conversations` — Start a new chat
- `GET /api/chat/conversations/:id` — Get conversation messages
- `PUT /api/chat/conversations/:id` — Rename conversation
- `DELETE /api/chat/conversations/:id` — Delete conversation & history
- `POST /api/chat/message` — Dual-mode query generation (Section 1 Grounded + Section 2 AI Knowledge)
- `PUT /api/chat/message/:id` — Edit previous question and regenerate answers

### Notes Generator
- `POST /api/notes/generate` — Generate structured notes from document context
- `GET /api/notes` — List saved notes
- `GET /api/notes/:id` — View specific note
- `PUT /api/notes/:id` — Edit note content
- `DELETE /api/notes/:id` — Delete note
- `GET /api/notes/:id/export?format=txt|docx|pdf` — Export note file

### Quiz Center
- `POST /api/quiz/generate` — Generate validated MCQs grounded strictly in document
- `GET /api/quiz` — List unattempted and completed quizzes
- `GET /api/quiz/:id` — Get quiz details and questions
- `POST /api/quiz/:id/submit` — Submit answers and calculate score
- `POST /api/quiz/:id/retry` — Reset quiz for re-attempt
- `DELETE /api/quiz/:id` — Delete quiz

### Notifications & Search
- `GET /api/notifications` — Retrieve student alerts and unread count
- `PUT /api/notifications/:id/read` — Mark notification read
- `PUT /api/notifications/read-all` — Mark all read
- `GET /api/search?q=...` — Search student documents, notes, quizzes, chats

### Health & Connectivity
- `GET /api/health` — Database and Gemini engine status
- `POST /api/health/connect-mongo` — Test and connect live MongoDB Atlas cluster

---

## 🧠 How RAG Works in EduRAG AI

```
Uploaded Study Material (PDF, DOCX, PPTX, TXT)
                      ↓
Document Text Extraction (Preserves Page & Slide Numbers)
                      ↓
Text Cleaning & Overlapping Chunks (~600 chars)
                      ↓
Gemini Vector Embeddings (gemini-embedding-2-preview)
                      ↓
Document Chunks Stored in MongoDB (document_chunks collection)
                      ↓
[Student Asks a Question]
                      ↓
Hybrid Search (Vector Cosine Similarity + Keyword Match)
                      ↓
Top Relevant Chunks Retrieved with Relevance Check
                      ↓
           ┌──────────┴──────────┐
           ▼                     ▼
SECTION 1: GROUNDED ANSWER    SECTION 2: FINAL AI ANSWER
- Strictly from context        - ChatGPT-style synthesis
- If absent: "The requested    - Headings, steps, formulas
  information is not           - General Gemini intelligence
  available in the selected
  study material."
- Exact Source References
  (Doc name & real Page #)
```

---

## 🗄️ MongoDB Collections Schema

1. **`students`**: Academic profile, hashed password, roll number, branch, semester, goals.
2. **`documents`**: File metadata, total pages, file size, status (`processing`, `ready`, `failed`), progress percentage.
3. **`document_chunks`**: Document ID, student ID, page number, unit, chapter, chunk index, text, 3072-dim embedding vector.
4. **`conversations`**: Chat thread title, creation date, updated date.
5. **`messages`**: Dual answer fields (`studyMaterialAnswer` & `generalAiAnswer`), role, sources array with real page numbers.
6. **`notes`**: Generated title, document reference, unit, chapter, prompt type, full markdown content.
7. **`quizzes`**: Title, topic, difficulty (`Easy`, `Medium`, `Hard`), questions array (with 4 options, correct answer index, explanation, source page), score, completion status.
8. **`notifications`**: Type (`system`, `quiz`, `document`, `notes`), message, read status.

---

## 🔒 Student Data Isolation
Every single database query enforces:
```ts
const studentId = req.studentId; // Extracted securely from verified JWT
```
Student A can never view, query, edit, or delete documents, chats, notes, quizzes, or notifications belonging to Student B.

---

## 🧪 Comprehensive Verification Checklist
1. **Registration & Login**: Register a new student account, verify bcrypt password hashing and token generation.
2. **MongoDB Connection**: Verify `/api/health` reports status `connected`.
3. **Document Upload**: Upload PDF, DOCX, PPTX, or TXT. Verify status transitions from `processing` to `ready`.
4. **Targeted Document Selector**: Attach a specific document to chat input or leave unattached to search all ready materials.
5. **Two Answer Modes**:
   - Verify Section 1 cites the exact source page from the uploaded material.
   - If asking an unrelated question (e.g., asking about Quantum Computing on a Calculus PDF), verify Section 1 returns `"The requested information is not available in the selected study material."`
   - Verify Section 2 provides a complete, helpful general knowledge explanation.
6. **Dynamic Notes Generator**: Select a document, pick "Five key takeaways" or "10 flashcards", generate and export as TXT/DOCX/PDF.
7. **Verified Quiz Center**: Generate 5 Medium MCQs. Test taking the quiz, submitting, and viewing score with source page verification.
8. **Fullscreen Mode**: Toggle fullscreen in AI Assistant — verify main sidebar hides while chat history panel and input remain fixed.
9. **Dark Mode**: Toggle theme and verify persistent dark mode styling across all student views.
