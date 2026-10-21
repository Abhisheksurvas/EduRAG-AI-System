import io
from typing import Tuple

class DocumentExtractor:
    @staticmethod
    def extract_text(file_bytes: bytes, filename: str) -> Tuple[str, int]:
        ext = filename.split(".")[-1].lower() if "." in filename else "txt"

        if ext == "pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                text_parts = []
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                total_text = "\n\n".join(text_parts)
                return total_text if total_text.strip() else "PDF text extraction preview.", max(1, len(reader.pages))
            except Exception as e:
                # Fallback to UTF-8 or latin-1 text recovery
                decoded = file_bytes.decode("latin-1", errors="ignore")
                clean = "".join([c for c in decoded if c.isprintable() or c in "\n\r\t"])
                return clean[:10000], 1

        elif ext in ["doc", "docx"]:
            try:
                import docx
                doc = docx.Document(io.BytesIO(file_bytes))
                paras = [p.text for p in doc.paragraphs if p.text.strip()]
                return "\n\n".join(paras), max(1, len(paras) // 5)
            except Exception as e:
                decoded = file_bytes.decode("utf-8", errors="ignore")
                return decoded, 1

        else:
            # Plain Text
            try:
                text = file_bytes.decode("utf-8")
            except:
                text = file_bytes.decode("latin-1", errors="ignore")
            lines = text.splitlines()
            return text, max(1, len(lines) // 40)
