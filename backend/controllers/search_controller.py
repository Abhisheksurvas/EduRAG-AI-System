from typing import Dict, Any
from backend.models.store import DBStore

class SearchController:
    @staticmethod
    def search(student_id: str, query: str) -> Dict[str, Any]:
        results = DBStore.global_search(student_id, query)
        return {
            "success": True,
            "query": query,
            "results": results,
        }
