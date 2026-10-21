import re
from typing import List, Dict, Any, Optional
from backend.models.store import DBStore
from backend.rag.embedding import EmbeddingService

class RAGRetriever:
    @staticmethod
    def retrieve_relevant_chunks(
        student_id: str,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 5,
        min_relevance_threshold: float = 0.05
    ) -> Dict[str, Any]:
        all_chunks = DBStore.find_chunks(student_id, document_ids)

        if (not all_chunks or len(all_chunks) == 0) and document_ids and len(document_ids) > 0:
            all_chunks = DBStore.find_chunks(student_id)

        if not all_chunks or len(all_chunks) == 0:
            try:
                from backend.services.sample_docs_service import SampleDocsService
                SampleDocsService.seed_sample_documents_for_student(student_id)
                all_chunks = DBStore.find_chunks(student_id)
            except Exception as e:
                print(f"Failed to auto-seed in Python retriever: {e}")

        if not all_chunks or len(all_chunks) == 0:
            return {
                "chunks": [],
                "topScore": 0,
                "isRelevant": False,
                "contextText": "",
                "sources": []
            }

        query_embedding = EmbeddingService.generate_embedding(query)

        raw_words = [w.lower() for w in re.findall(r"\w+", query) if len(w) >= 2]
        expanded_words = set(raw_words)
        q_lower = query.lower()

        if "ml" in raw_words or "machine learning" in q_lower:
            expanded_words.update(["machine", "learning"])
        if "nlp" in raw_words or "natural language" in q_lower:
            expanded_words.update(["natural", "language", "processing"])
        if "rsa" in raw_words or "encryption" in q_lower:
            expanded_words.update(["encryption", "keys", "modulus", "ciphers"])

        stop_words = {
            "explain", "what", "is", "are", "the", "and", "for", "in", "of", "to", "a", "an",
            "marks", "exam", "format", "question", "with", "how", "describe", "briefly",
            "give", "write", "provide", "sample", "pattern", "university", "college"
        }
        content_words = [w for w in expanded_words if w not in stop_words]
        keywords_to_match = content_words if len(content_words) > 0 else list(expanded_words)

        scored_chunks = []
        for chunk in all_chunks:
            chunk_embedding = chunk.get("embedding") or EmbeddingService.generate_embedding(chunk.get("text", ""))
            vector_score = EmbeddingService.cosine_similarity(query_embedding, chunk_embedding)

            chunk_text_lower = chunk.get("text", "").lower()
            keyword_hits = sum(1 for word in keywords_to_match if word in chunk_text_lower)
            keyword_score = (keyword_hits / len(keywords_to_match)) if len(keywords_to_match) > 0 else 0.0

            phrase_bonus = 0.0
            for i in range(len(raw_words) - 1):
                w1, w2 = raw_words[i], raw_words[i+1]
                if w1 not in stop_words and w2 not in stop_words:
                    if f"{w1} {w2}" in chunk_text_lower:
                        phrase_bonus += 0.15
            phrase_bonus = min(0.3, phrase_bonus)

            combined_score = min(1.0, vector_score * 0.55 + keyword_score * 0.35 + phrase_bonus)

            scored_chunks.append({
                "chunkId": str(chunk.get("_id", "")),
                "documentId": str(chunk.get("documentId", "")),
                "filename": chunk.get("filename", "Course Notes"),
                "pageNumber": chunk.get("pageNumber", 1),
                "unit": chunk.get("unit", ""),
                "chapter": chunk.get("chapter", ""),
                "text": chunk.get("text", ""),
                "score": combined_score,
            })

        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        top_chunks = scored_chunks[:top_k]
        top_score = top_chunks[0]["score"] if len(top_chunks) > 0 else 0.0

        context_parts = []
        for i, c in enumerate(top_chunks):
            header = f"[Source {i+1}: {c['filename']} | Page {c['pageNumber']} | {c['chapter'] or c['unit'] or 'Content'}]"
            context_parts.append(f"{header}\n{c['text']}")
        context_text = "\n\n---\n\n".join(context_parts)

        sources_map = {}
        for c in top_chunks:
            key = f"{c['filename']}_{c['pageNumber']}"
            if key not in sources_map:
                sources_map[key] = {
                    "documentId": c["documentId"],
                    "filename": c["filename"],
                    "pageNumber": c["pageNumber"],
                    "unit": c["unit"],
                    "chapter": c["chapter"],
                    "snippet": c["text"][:150] + "...",
                }

        return {
            "chunks": top_chunks,
            "topScore": top_score,
            "isRelevant": len(top_chunks) > 0,
            "contextText": context_text,
            "sources": list(sources_map.values())
        }
