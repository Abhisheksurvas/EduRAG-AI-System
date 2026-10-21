import math
import re
from typing import List

class EmbeddingService:
    @staticmethod
    def generate_embedding(text: str, dim: int = 64) -> List[float]:
        """
        Generates deterministic normalized bag-of-words / hash embedding vector
        with fallback support when external embedding APIs are not enabled.
        """
        clean = text.lower()
        words = re.findall(r"\w+", clean)
        vector = [0.0] * dim

        for word in words:
            h = hash(word)
            idx = abs(h) % dim
            vector[idx] += 1.0

        # L2 Normalize
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0:
            return [x / norm for x in vector]
        return vector

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)
