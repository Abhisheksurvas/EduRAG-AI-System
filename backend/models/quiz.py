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

from typing import Optional, List
from datetime import datetime

class QuizQuestion(BaseModel):
    questionNumber: Optional[int] = 1
    question: str
    options: List[str]
    correctAnswer: int
    explanation: Optional[str] = ""
    sourcePage: Optional[int] = None
    selectedAnswer: Optional[int] = None

class QuizModel(BaseModel):
    id: str = Field(alias="_id", default="")
    studentId: str
    documentId: Optional[str] = ""
    documentName: Optional[str] = ""
    title: str = "Exam Practice Quiz"
    topic: Optional[str] = "General"
    difficulty: str = "Medium"
    questionCount: int = 5
    timeLimit: int = 10
    questions: List[QuizQuestion] = Field(default_factory=list)
    status: str = "unattempted"  # unattempted | in_progress | completed
    score: int = 0
    totalAnswered: int = 0
    completedAt: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
