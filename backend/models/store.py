import os
import json
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime

try:
    from bson import ObjectId
except ImportError:
    class ObjectId:  # type: ignore
        def __init__(self, val=None):
            self.val = str(val) if val else str(uuid.uuid4())
        def __repr__(self):
            return self.val
        def __str__(self):
            return self.val
        def __eq__(self, other):
            return str(self) == str(other)

from backend.config.db import get_db

DATA_DIR = os.path.abspath(os.path.join(os.getcwd(), ".edurag_data"))
DATA_FILE = os.path.join(DATA_DIR, "store.json")

class DBStore:
    _memory: Dict[str, List[Dict[str, Any]]] = {
        "students": [],
        "documents": [],
        "document_chunks": [],
        "conversations": [],
        "messages": [],
        "notes": [],
        "quizzes": [],
        "notifications": []
    }
    _initialized: bool = False

    @classmethod
    def _init_local_store(cls):
        if cls._initialized:
            return
        os.makedirs(DATA_DIR, exist_ok=True)
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k in cls._memory:
                        cls._memory[k] = data.get(k, [])
            except Exception as e:
                print(f"Failed to read local store: {e}")
        cls._initialized = True

    @classmethod
    def _save_local_store(cls):
        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(cls._memory, f, default=str, indent=2)
        except Exception as e:
            print(f"Failed to save local store: {e}")

    @classmethod
    def _clean_doc(cls, doc: Any) -> Any:
        if not doc:
            return None
        if isinstance(doc, dict):
            clean = dict(doc)
            if "_id" in clean:
                clean["_id"] = str(clean["_id"])
                clean["id"] = clean["_id"]
            return clean
        return doc

    # ---------------- Student ----------------
    @classmethod
    def create_student(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        record = dict(data)
        record["createdAt"] = datetime.utcnow().isoformat()
        record["updatedAt"] = datetime.utcnow().isoformat()

        if db is not None:
            res = db.students.insert_one(record)
            record["_id"] = str(res.inserted_id)
            return cls._clean_doc(record)

        cls._init_local_store()
        record["_id"] = str(uuid.uuid4())
        cls._memory["students"].append(record)
        cls._save_local_store()
        return cls._clean_doc(record)

    @classmethod
    def find_student_by_email(cls, email: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            doc = db.students.find_one({"email": email.lower().strip()})
            return cls._clean_doc(doc)

        cls._init_local_store()
        for s in cls._memory["students"]:
            if s.get("email", "").lower().strip() == email.lower().strip():
                return cls._clean_doc(s)
        return None

    @classmethod
    def find_student_by_id(cls, student_id: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            try:
                doc = db.students.find_one({"_id": ObjectId(student_id)})
            except:
                doc = db.students.find_one({"_id": student_id})
            return cls._clean_doc(doc)

        cls._init_local_store()
        for s in cls._memory["students"]:
            if str(s.get("_id")) == str(student_id):
                return cls._clean_doc(s)
        return None

    @classmethod
    def update_student(cls, student_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = get_db()
        updates["updatedAt"] = datetime.utcnow().isoformat()

        if db is not None:
            try:
                q = {"_id": ObjectId(student_id)}
            except:
                q = {"_id": student_id}
            db.students.update_one(q, {"$set": updates})
            return cls.find_student_by_id(student_id)

        cls._init_local_store()
        for s in cls._memory["students"]:
            if str(s.get("_id")) == str(student_id):
                s.update(updates)
                cls._save_local_store()
                return cls._clean_doc(s)
        return None

    # ---------------- Documents & Chunks ----------------
    @classmethod
    def create_document(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        record = dict(data)
        record["createdAt"] = datetime.utcnow().isoformat()
        record["updatedAt"] = datetime.utcnow().isoformat()

        if db is not None:
            res = db.documents.insert_one(record)
            record["_id"] = str(res.inserted_id)
            return cls._clean_doc(record)

        cls._init_local_store()
        record["_id"] = str(uuid.uuid4())
        cls._memory["documents"].append(record)
        cls._save_local_store()
        return cls._clean_doc(record)

    @classmethod
    def find_documents_by_student(cls, student_id: str) -> List[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            docs = list(db.documents.find({"studentId": student_id}).sort("createdAt", -1))
            return [cls._clean_doc(d) for d in docs]

        cls._init_local_store()
        return [cls._clean_doc(d) for d in cls._memory["documents"] if str(d.get("studentId")) == str(student_id)]

    @classmethod
    def find_document_by_id(cls, doc_id: str, student_id: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(doc_id), "studentId": student_id}
            except:
                q = {"_id": doc_id, "studentId": student_id}
            return cls._clean_doc(db.documents.find_one(q))

        cls._init_local_store()
        for d in cls._memory["documents"]:
            if str(d.get("_id")) == str(doc_id) and str(d.get("studentId")) == str(student_id):
                return cls._clean_doc(d)
        return None

    @classmethod
    def delete_document(cls, doc_id: str, student_id: str) -> bool:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(doc_id), "studentId": student_id}
            except:
                q = {"_id": doc_id, "studentId": student_id}
            db.documents.delete_one(q)
            db.document_chunks.delete_many({"documentId": doc_id, "studentId": student_id})
            return True

        cls._init_local_store()
        cls._memory["documents"] = [d for d in cls._memory["documents"] if not (str(d.get("_id")) == str(doc_id) and str(d.get("studentId")) == str(student_id))]
        cls._memory["document_chunks"] = [c for c in cls._memory["document_chunks"] if not (str(c.get("documentId")) == str(doc_id) and str(c.get("studentId")) == str(student_id))]
        cls._save_local_store()
        return True

    @classmethod
    def create_chunks(cls, chunks: List[Dict[str, Any]]) -> int:
        if not chunks:
            return 0
        db = get_db()
        records = [dict(c) for c in chunks]
        now = datetime.utcnow().isoformat()
        for r in records:
            r["createdAt"] = now

        if db is not None:
            res = db.document_chunks.insert_many(records)
            return len(res.inserted_ids)

        cls._init_local_store()
        for r in records:
            r["_id"] = str(uuid.uuid4())
            cls._memory["document_chunks"].append(r)
        cls._save_local_store()
        return len(records)

    @classmethod
    def find_chunks(cls, student_id: str, document_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        query: Dict[str, Any] = {"studentId": student_id}
        if document_ids and len(document_ids) > 0:
            query["documentId"] = {"$in": document_ids}

        if db is not None:
            return [cls._clean_doc(c) for c in db.document_chunks.find(query)]

        cls._init_local_store()
        matched = []
        for c in cls._memory["document_chunks"]:
            if str(c.get("studentId")) == str(student_id):
                if not document_ids or str(c.get("documentId")) in document_ids:
                    matched.append(cls._clean_doc(c))
        return matched

    # ---------------- Conversations & Messages ----------------
    @classmethod
    def create_conversation(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        record = dict(data)
        record["createdAt"] = datetime.utcnow().isoformat()
        record["updatedAt"] = datetime.utcnow().isoformat()

        if db is not None:
            res = db.conversations.insert_one(record)
            record["_id"] = str(res.inserted_id)
            return cls._clean_doc(record)

        cls._init_local_store()
        record["_id"] = str(uuid.uuid4())
        cls._memory["conversations"].append(record)
        cls._save_local_store()
        return cls._clean_doc(record)

    @classmethod
    def find_conversations_by_student(cls, student_id: str) -> List[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            return [cls._clean_doc(c) for c in db.conversations.find({"studentId": student_id}).sort("updatedAt", -1)]

        cls._init_local_store()
        return [cls._clean_doc(c) for c in cls._memory["conversations"] if str(c.get("studentId")) == str(student_id)]

    @classmethod
    def find_conversation_by_id(cls, conv_id: str, student_id: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(conv_id), "studentId": student_id}
            except:
                q = {"_id": conv_id, "studentId": student_id}
            return cls._clean_doc(db.conversations.find_one(q))

        cls._init_local_store()
        for c in cls._memory["conversations"]:
            if str(c.get("_id")) == str(conv_id) and str(c.get("studentId")) == str(student_id):
                return cls._clean_doc(c)
        return None

    @classmethod
    def update_conversation(cls, conv_id: str, student_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = get_db()
        updates["updatedAt"] = datetime.utcnow().isoformat()

        if db is not None:
            try:
                q = {"_id": ObjectId(conv_id), "studentId": student_id}
            except:
                q = {"_id": conv_id, "studentId": student_id}
            db.conversations.update_one(q, {"$set": updates})
            return cls.find_conversation_by_id(conv_id, student_id)

        cls._init_local_store()
        for c in cls._memory["conversations"]:
            if str(c.get("_id")) == str(conv_id) and str(c.get("studentId")) == str(student_id):
                c.update(updates)
                cls._save_local_store()
                return cls._clean_doc(c)
        return None

    @classmethod
    def delete_conversation(cls, conv_id: str, student_id: str) -> bool:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(conv_id), "studentId": student_id}
            except:
                q = {"_id": conv_id, "studentId": student_id}
            db.conversations.delete_one(q)
            db.messages.delete_many({"conversationId": conv_id, "studentId": student_id})
            return True

        cls._init_local_store()
        cls._memory["conversations"] = [c for c in cls._memory["conversations"] if not (str(c.get("_id")) == str(conv_id) and str(c.get("studentId")) == str(student_id))]
        cls._memory["messages"] = [m for m in cls._memory["messages"] if not (str(m.get("conversationId")) == str(conv_id) and str(m.get("studentId")) == str(student_id))]
        cls._save_local_store()
        return True

    @classmethod
    def create_message(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        record = dict(data)
        record["createdAt"] = datetime.utcnow().isoformat()

        if db is not None:
            res = db.messages.insert_one(record)
            record["_id"] = str(res.inserted_id)
            try:
                db.conversations.update_one({"_id": ObjectId(record["conversationId"])}, {"$set": {"updatedAt": datetime.utcnow().isoformat()}})
            except:
                db.conversations.update_one({"_id": record["conversationId"]}, {"$set": {"updatedAt": datetime.utcnow().isoformat()}})
            return cls._clean_doc(record)

        cls._init_local_store()
        record["_id"] = str(uuid.uuid4())
        cls._memory["messages"].append(record)
        cls._save_local_store()
        return cls._clean_doc(record)

    @classmethod
    def find_messages_by_conversation(cls, conv_id: str, student_id: str) -> List[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            return [cls._clean_doc(m) for m in db.messages.find({"conversationId": conv_id, "studentId": student_id}).sort("createdAt", 1)]

        cls._init_local_store()
        return [cls._clean_doc(m) for m in cls._memory["messages"] if str(m.get("conversationId")) == str(conv_id) and str(m.get("studentId")) == str(student_id)]

    @classmethod
    def find_message_by_id(cls, msg_id: str, student_id: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(msg_id), "studentId": student_id}
            except:
                q = {"_id": msg_id, "studentId": student_id}
            return cls._clean_doc(db.messages.find_one(q))

        cls._init_local_store()
        for m in cls._memory["messages"]:
            if str(m.get("_id")) == str(msg_id) and str(m.get("studentId")) == str(student_id):
                return cls._clean_doc(m)
        return None

    @classmethod
    def update_message(cls, msg_id: str, student_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(msg_id), "studentId": student_id}
            except:
                q = {"_id": msg_id, "studentId": student_id}
            db.messages.update_one(q, {"$set": updates})
            return cls.find_message_by_id(msg_id, student_id)

        cls._init_local_store()
        for m in cls._memory["messages"]:
            if str(m.get("_id")) == str(msg_id) and str(m.get("studentId")) == str(student_id):
                m.update(updates)
                cls._save_local_store()
                return cls._clean_doc(m)
        return None

    # ---------------- Notes ----------------
    @classmethod
    def create_note(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        record = dict(data)
        record["createdAt"] = datetime.utcnow().isoformat()
        record["updatedAt"] = datetime.utcnow().isoformat()

        if db is not None:
            res = db.notes.insert_one(record)
            record["_id"] = str(res.inserted_id)
            return cls._clean_doc(record)

        cls._init_local_store()
        record["_id"] = str(uuid.uuid4())
        cls._memory["notes"].append(record)
        cls._save_local_store()
        return cls._clean_doc(record)

    @classmethod
    def find_notes_by_student(cls, student_id: str) -> List[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            return [cls._clean_doc(n) for n in db.notes.find({"studentId": student_id}).sort("createdAt", -1)]

        cls._init_local_store()
        return [cls._clean_doc(n) for n in cls._memory["notes"] if str(n.get("studentId")) == str(student_id)]

    @classmethod
    def find_note_by_id(cls, note_id: str, student_id: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(note_id), "studentId": student_id}
            except:
                q = {"_id": note_id, "studentId": student_id}
            return cls._clean_doc(db.notes.find_one(q))

        cls._init_local_store()
        for n in cls._memory["notes"]:
            if str(n.get("_id")) == str(note_id) and str(n.get("studentId")) == str(student_id):
                return cls._clean_doc(n)
        return None

    @classmethod
    def update_note(cls, note_id: str, student_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = get_db()
        updates["updatedAt"] = datetime.utcnow().isoformat()
        if db is not None:
            try:
                q = {"_id": ObjectId(note_id), "studentId": student_id}
            except:
                q = {"_id": note_id, "studentId": student_id}
            db.notes.update_one(q, {"$set": updates})
            return cls.find_note_by_id(note_id, student_id)

        cls._init_local_store()
        for n in cls._memory["notes"]:
            if str(n.get("_id")) == str(note_id) and str(n.get("studentId")) == str(student_id):
                n.update(updates)
                cls._save_local_store()
                return cls._clean_doc(n)
        return None

    @classmethod
    def delete_note(cls, note_id: str, student_id: str) -> bool:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(note_id), "studentId": student_id}
            except:
                q = {"_id": note_id, "studentId": student_id}
            db.notes.delete_one(q)
            return True

        cls._init_local_store()
        cls._memory["notes"] = [n for n in cls._memory["notes"] if not (str(n.get("_id")) == str(note_id) and str(n.get("studentId")) == str(student_id))]
        cls._save_local_store()
        return True

    # ---------------- Quizzes ----------------
    @classmethod
    def create_quiz(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        record = dict(data)
        record["createdAt"] = datetime.utcnow().isoformat()

        if db is not None:
            res = db.quizzes.insert_one(record)
            record["_id"] = str(res.inserted_id)
            return cls._clean_doc(record)

        cls._init_local_store()
        record["_id"] = str(uuid.uuid4())
        cls._memory["quizzes"].append(record)
        cls._save_local_store()
        return cls._clean_doc(record)

    @classmethod
    def find_quizzes_by_student(cls, student_id: str) -> List[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            return [cls._clean_doc(q) for q in db.quizzes.find({"studentId": student_id}).sort("createdAt", -1)]

        cls._init_local_store()
        return [cls._clean_doc(q) for q in cls._memory["quizzes"] if str(q.get("studentId")) == str(student_id)]

    @classmethod
    def find_quiz_by_id(cls, quiz_id: str, student_id: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(quiz_id), "studentId": student_id}
            except:
                q = {"_id": quiz_id, "studentId": student_id}
            return cls._clean_doc(db.quizzes.find_one(q))

        cls._init_local_store()
        for q in cls._memory["quizzes"]:
            if str(q.get("_id")) == str(quiz_id) and str(q.get("studentId")) == str(student_id):
                return cls._clean_doc(q)
        return None

    @classmethod
    def update_quiz(cls, quiz_id: str, student_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(quiz_id), "studentId": student_id}
            except:
                q = {"_id": quiz_id, "studentId": student_id}
            db.quizzes.update_one(q, {"$set": updates})
            return cls.find_quiz_by_id(quiz_id, student_id)

        cls._init_local_store()
        for q in cls._memory["quizzes"]:
            if str(q.get("_id")) == str(quiz_id) and str(q.get("studentId")) == str(student_id):
                q.update(updates)
                cls._save_local_store()
                return cls._clean_doc(q)
        return None

    # ---------------- Notifications ----------------
    @classmethod
    def create_notification(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        record = dict(data)
        record["createdAt"] = datetime.utcnow().isoformat()
        record["read"] = record.get("read", False)

        if db is not None:
            res = db.notifications.insert_one(record)
            record["_id"] = str(res.inserted_id)
            return cls._clean_doc(record)

        cls._init_local_store()
        record["_id"] = str(uuid.uuid4())
        cls._memory["notifications"].append(record)
        cls._save_local_store()
        return cls._clean_doc(record)

    @classmethod
    def find_notifications_by_student(cls, student_id: str) -> List[Dict[str, Any]]:
        db = get_db()
        if db is not None:
            return [cls._clean_doc(n) for n in db.notifications.find({"studentId": student_id}).sort("createdAt", -1)]

        cls._init_local_store()
        return [cls._clean_doc(n) for n in cls._memory["notifications"] if str(n.get("studentId")) == str(student_id)]

    @classmethod
    def mark_notification_read(cls, notif_id: str, student_id: str) -> bool:
        db = get_db()
        if db is not None:
            try:
                q = {"_id": ObjectId(notif_id), "studentId": student_id}
            except:
                q = {"_id": notif_id, "studentId": student_id}
            db.notifications.update_one(q, {"$set": {"read": True}})
            return True

        cls._init_local_store()
        for n in cls._memory["notifications"]:
            if str(n.get("_id")) == str(notif_id) and str(n.get("studentId")) == str(student_id):
                n["read"] = True
                cls._save_local_store()
                return True
        return False

    @classmethod
    def mark_all_notifications_read(cls, student_id: str) -> int:
        db = get_db()
        if db is not None:
            res = db.notifications.update_many({"studentId": student_id, "read": False}, {"$set": {"read": True}})
            return res.modified_count

        cls._init_local_store()
        count = 0
        for n in cls._memory["notifications"]:
            if str(n.get("studentId")) == str(student_id) and not n.get("read", False):
                n["read"] = True
                count += 1
        cls._save_local_store()
        return count
