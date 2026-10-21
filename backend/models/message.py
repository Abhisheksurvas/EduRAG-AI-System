try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def dict(self):
            return self.__dict__
    Field = lambda default=None, **kwargs: default

from typing import Optional, List, Dict, Any
from datetime import datetime

class ConversationModel(BaseModel):
    id: str = Field(alias="_id", default="")
    studentId: str
    title: str = "New Study Conversation"
    language: Optional[str] = "English"
    marks: Optional[int] = 6
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class SourceRef(BaseModel):
    documentId: Optional[str] = ""
    filename: str
    pageNumber: int = 1
    unit: Optional[str] = ""
    chapter: Optional[str] = ""
    snippet: Optional[str] = ""

class MessageModel(BaseModel):
    id: str = Field(alias="_id", default="")
    studentId: str
    conversationId: str
    role: str  # user | assistant
    content: str
    studyMaterialAnswer: Optional[str] = None
    generalAiAnswer: Optional[str] = None
    answerMode: Optional[str] = "dual"  # dual | study_material | ai_knowledge
    marks: Optional[int] = 6
    language: Optional[str] = "English"
    documentIds: List[str] = Field(default_factory=list)
    attachedDocumentName: Optional[str] = None
    attachedDocumentType: Optional[str] = None
    sources: List[SourceRef] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
