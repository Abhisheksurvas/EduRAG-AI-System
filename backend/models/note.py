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

class NoteModel(BaseModel):
    id: str = Field(alias="_id", default="")
    studentId: str
    documentId: str
    title: str
    content: str
    promptType: str = "Revision Summary"
    unit: Optional[str] = ""
    chapter: Optional[str] = ""
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correctAnswer: int
    explanation: Optional[str] = ""

class QuizModel(BaseModel):
    id: str = Field(alias="_id", default="")
    studentId: str
    documentId: str
    title: str
    questions: List[QuizQuestion]
    totalMarks: int = 10
    score: Optional[int] = None
    completed: bool = False
    userAnswers: Optional[List[int]] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class NotificationModel(BaseModel):
    id: str = Field(alias="_id", default="")
    studentId: str
    title: str
    message: str
    type: str = "info"  # info | success | warning
    read: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
