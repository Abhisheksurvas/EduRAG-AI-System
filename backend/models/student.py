try:
    from pydantic import BaseModel, EmailStr, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def dict(self):
            return self.__dict__
    Field = lambda default=None, **kwargs: default
    EmailStr = str

from typing import Optional
from datetime import datetime

class StudentBase(BaseModel):
    name: str
    email: EmailStr
    rollNo: Optional[str] = ""
    semester: Optional[str] = ""
    year: Optional[str] = ""
    branch: Optional[str] = ""
    avatar: Optional[str] = ""
    goals: Optional[str] = ""

class StudentCreate(StudentBase):
    password: str

class StudentLogin(BaseModel):
    email: EmailStr
    password: str

class StudentInDB(StudentBase):
    id: str = Field(alias="_id")
    password: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class StudentResponse(StudentBase):
    id: str
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
