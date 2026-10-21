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

from typing import Optional
from datetime import datetime

class NotificationModel(BaseModel):
    id: str = Field(alias="_id", default="")
    studentId: str
    type: str = "system"  # system | quiz | document | notes
    title: str
    message: str
    read: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
