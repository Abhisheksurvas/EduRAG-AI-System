from typing import Dict, Any, Optional
from backend.models.store import DBStore
from backend.services.gemini_service import generate_content_safe

class NotesGenerator:
    @staticmethod
    def get_prompt_instruction(prompt_type: str, custom_prompt: Optional[str] = None) -> str:
        if custom_prompt and custom_prompt.strip():
            return f"Custom Directive: {custom_prompt.strip()}"
        pt = prompt_type.lower()
        if "flashcard" in pt:
            return "Generate 8-12 high-yield Question & Answer flashcards in Q: / A: format."
        if "formula" in pt or "equation" in pt:
            return (
                "Compile a comprehensive, highly-structured, and 100% UNDERSTANDABLE Formula Sheet detailing all mathematical expressions, "
                "equations, theorems, laws, performance metrics, and quantitative algorithms derived from or related to the study material.\n\n"
                "MANDATORY CRITERIA FOR AN UNDERSTANDABLE FORMULA SHEET:\n"
                "1. At the top, provide a Quick-Glance Formula Reference Table summarizing Formula Name, Key Equation ($...$), and Exam Application.\n"
                "2. For EVERY formula, follow this 5-step format:\n"
                "   ### [Number]. [Formula / Metric Name]\n"
                "   - Mathematical Equation: (Render using a standalone LaTeX display block on its own line: $$ ... $$)\n"
                "   - 💡 Intuitive Understanding & Purpose: Plain English explanation of what it computes and why it is used.\n"
                "   - 📋 Variable & Parameter Breakdown: Define every symbol ($x, y, \\theta$), its meaning, and units.\n"
                "   - ⚠️ Key Assumptions & Conditions: When this formula applies and boundary constraints.\n"
                "   - 🧮 Step-by-Step Worked Example: A numerical walkthrough substituting sample values to show how to calculate it in exams.\n\n"
                "If Computer Science, AI/ML, NLP, Networks, or Electronics, extract all metrics (Precision, Recall, F1, Loss, Bayes, Entropy), "
                "cryptographic operations (RSA), and Big-O complexities."
            )
        if "takeaway" in pt:
            return "Generate bulleted key takeaways, core exam definitions, and must-know summary points."
        return "Synthesize an exhaustive, highly structured revision study guide with headings, bullet points, and key concepts."

    @classmethod
    def generate_notes(cls, params: Dict[str, Any]) -> Dict[str, str]:
        student_id = params["studentId"]
        doc_id = params["documentId"]
        prompt_type = params.get("promptType", "Revision Summary")
        chapter = params.get("chapter", "")
        unit = params.get("unit", "")
        custom_prompt = params.get("customPrompt")

        chunks = DBStore.find_chunks(student_id, [doc_id])
        if not chunks:
            chunks = DBStore.find_chunks(student_id)

        target_chunks = chunks
        if chapter and chapter.strip():
            c_low = chapter.lower().strip()
            filtered = [c for c in chunks if c_low in c.get("chapter", "").lower() or c_low in c.get("unit", "").lower() or c_low in c.get("text", "").lower()]
            if filtered:
                target_chunks = filtered

        context_text = "\n\n---\n\n".join([f"[Source Page {c.get('pageNumber', 1)}]:\n{c.get('text', '')}" for c in target_chunks[:15]])
        doc = DBStore.find_document_by_id(doc_id, student_id)
        doc_name = doc.get("originalName", "Study Material") if doc else "Study Material"
        directive = cls.get_prompt_instruction(prompt_type, custom_prompt)

        system_instruction = """You are EduRAG AI Notes Engine.
You synthesize and generate clean, highly-readable revision notes for college engineering students from their uploaded study material.
CRITICAL GROUNDING & CLARITY INSTRUCTIONS:
1. Generate notes from the supplied study material context.
2. Even if a specific keyword or heading is not an exact verbatim match, synthesize related and relevant concepts, definitions, principles, and formulas present in the study material.
3. NEVER return "This information is not available in the selected study material". Connect the related topics to synthesize high-yield notes.
4. FORMULA SHEET SPECIAL INSTRUCTIONS:
   - When generating a Formula Sheet, ensure every formula is formatted using proper LaTeX $$ ... $$ display blocks on their own lines so KaTeX can render them cleanly.
   - Formulas must be 100% UNDERSTANDABLE to students: always explain the intuitive concept behind the formula, define every variable with clear symbols ($x, y, \\theta$), note assumptions, and provide a short worked numerical example.
5. Use clear headings, bullet points, callout blocks, math notation, and bold terminology."""

        user_prompt = f"""DOCUMENT TITLE: {doc_name}
UNIT/TOPIC: {unit or 'All Units'} | {chapter or 'All Chapters'}
PROMPT GOAL: {prompt_type}
SPECIFIC DIRECTIVE:
{directive}

STUDY MATERIAL CONTEXT:
{context_text}

Generate high-yield, structured, complete notes now."""

        try:
            response = generate_content_safe(
                contents=user_prompt,
                config={"systemInstruction": system_instruction, "temperature": 0.3}
            )
            content = getattr(response, "text", "") or ""
            title = f"{prompt_type} • {chapter or doc_name.rsplit('.', 1)[0]}"
            return {
                "title": title,
                "content": content.strip() or f"# Study Notes: {doc_name}\n\n{directive}"
            }
        except Exception as e:
            return {
                "title": f"{prompt_type} • {doc_name}",
                "content": f"# Notes: {doc_name}\n\nGenerated from course materials.\n\n### Content Highlights\n{context_text[:1000]}"
            }
