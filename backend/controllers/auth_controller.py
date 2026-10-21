from typing import Dict, Any
from backend.models.store import DBStore
from backend.middleware.auth import hash_password, compare_password, generate_token

class AuthController:
    @staticmethod
    def register(name: str, email: str, password: str, **kwargs) -> Dict[str, Any]:
        existing = DBStore.find_student_by_email(email)
        if existing:
            raise ValueError("Student account with this email already exists.")

        student_data = {
            "name": name.strip(),
            "email": email.lower().strip(),
            "password": hash_password(password),
            **kwargs
        }
        student = DBStore.create_student(student_data)
        token = generate_token(student["_id"])
        clean_student = dict(student)
        clean_student.pop("password", None)
        return {"student": clean_student, "token": token}

    @staticmethod
    def login(email: str, password: str) -> Dict[str, Any]:
        student = DBStore.find_student_by_email(email)
        if not student or not compare_password(password, student.get("password", "")):
            raise ValueError("Invalid email or password.")
        token = generate_token(student["_id"])
        clean_student = dict(student)
        clean_student.pop("password", None)
        return {"student": clean_student, "token": token}
