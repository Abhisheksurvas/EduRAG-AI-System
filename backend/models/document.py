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

class DocumentModel(BaseModel):
    id: str = Field(alias="_id", default="")
    studentId: str
    originalName: str
    fileType: str
    fileSize: int
    totalChunks: int = 0
    status: str = "ready"  # ready | processing | error
    pageCount: int = 1
    courseSubject: Optional[str] = "Computer Science"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class DocumentChunkModel(BaseModel):
    id: str = Field(alias="_id", default="")
    documentId: str
    studentId: str
    filename: str
    pageNumber: int = 1
    chunkIndex: int = 0
    unit: Optional[str] = ""
    chapter: Optional[str] = ""
    text: str
    embedding: List[float] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
