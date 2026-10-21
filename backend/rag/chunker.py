import re
from typing import List, Dict, Any

class DocumentChunker:
    @staticmethod
    def chunk_text(
        text: str,
        chunk_size: int = 800,
        overlap: int = 150
    ) -> List[Dict[str, Any]]:
        if not text or not text.strip():
            return []

        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks: List[Dict[str, Any]] = []

        current_text = ""
        page_num = 1
        current_unit = ""
        current_chapter = ""

        for para in paragraphs:
            # Detect unit / chapter headers
            if re.search(r"unit\s+\d+", para, re.I):
                current_unit = para[:60]
            if re.search(r"chapter\s+\d+", para, re.I):
                current_chapter = para[:60]

            if len(current_text) + len(para) > chunk_size and len(current_text) > 0:
                chunks.append({
                    "text": current_text.strip(),
                    "pageNumber": page_num,
                    "unit": current_unit,
                    "chapter": current_chapter,
                })
                # Overlap
                current_text = current_text[-overlap:] + "\n\n" + para
                if len(chunks) % 3 == 0:
                    page_num += 1
            else:
                current_text = (current_text + "\n\n" + para).strip()

        if current_text.strip():
            chunks.append({
                "text": current_text.strip(),
                "pageNumber": page_num,
                "unit": current_unit,
                "chapter": current_chapter,
            })

        return chunks
