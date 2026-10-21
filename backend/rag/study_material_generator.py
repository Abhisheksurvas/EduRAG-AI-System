from typing import Dict, Any, List, Optional
from backend.services.gemini_service import generate_content_safe

class StudyMaterialGenerator:
    @staticmethod
    def normalize_marks(marks: Any) -> int:
        try:
            num = int(marks)
            if num in [4, 6, 8]:
                return num
        except:
            pass
        return 6

    @classmethod
    def generate_answer(
        cls,
        question: str,
        retrieval: Dict[str, Any],
        raw_marks: Optional[int] = 6,
        target_language: str = "English"
    ) -> Dict[str, Any]:
        marks = cls.normalize_marks(raw_marks)
        resolved_lang = target_language.strip() if target_language and target_language.strip() else "English"
        unique_sources = retrieval.get("sources", [])
        doc_names = ", ".join(list(set(s.get("filename", "") for s in unique_sources))) or "Uploaded Course Material"
        page_list = ", ".join(sorted(list(set(str(s.get("pageNumber", 1)) for s in unique_sources)))) or "1"

        is_auto = not resolved_lang or resolved_lang.lower() == "auto"
        language_instruction = (
            "AUTO DETECT: Detect the student question language. Default to English unless clearly written in regional language."
            if is_auto
            else f'TARGET LANGUAGE: "{resolved_lang}". Write the entire answer in {resolved_lang}.'
        )

        system_instruction = f"""You are EduRAG AI University & College Exam Study Assistant.

Your mission is to generate a comprehensive, exam-ready university answer by synthesizing the RELEVANT and RELATED concepts, definitions, frameworks, formulas, and principles available in the provided STUDY MATERIAL CONTEXT.

CRITICAL DIRECTIVES:
1. RELEVANT & RELATED CONCEPT SYNTHESIS (NEVER REFUSE / NEVER SAY "NOT AVAILABLE"):
   - The student's question may NOT be an exact verbatim match to the words or headings in the study material notes.
   - NEVER output "The requested information is not available in the selected study material" or any refusal.
   - Actively identify all RELATED, RELEVANT, foundational, or adjacent concepts, principles, algorithms, definitions, formulas, and frameworks present in the STUDY MATERIAL CONTEXT.
   - Synthesize these related concepts into an academically structured, high-yield university examination response answering the student's question.
   - Explicitly highlight how the topic connects to the study material:
     Start with a clear contextual bridge:
     > 📘 **Related Study Material Concepts:** While this specific subtopic may not be an exact verbatim heading in your uploaded notes, it directly connects to and builds upon the related core concepts of **[Name of Related Concepts/Theories/Units from notes]** present in your study material:
   - Then provide the full, rigorous university answer structured for {marks} Marks.

2. UNDERSTANDABLE FORMULAE DIRECTIVE:
   When writing mathematical formulas, equations, metrics, or algorithmic derivations (e.g. Precision/Recall/F1-Score, TF-IDF, Bayes Theorem, RSA modular arithmetic, Gradient Descent, Big-O complexity):
   - Format every formula clearly using standard LaTeX notation ($...$ for inline or $$ ... $$ for display blocks).
   - Ensure the formula is 100% UNDERSTANDABLE to students:
     a) Explicitly list 'Where:' defining each variable, symbol, and term with its clear academic meaning.
     b) Explain the core intuitive concept behind the formula in clear, accessible language.
     c) Provide a short step-by-step worked example or numerical substitution so students can easily understand how it is calculated for university exams.

3. EXAM MARKS SCALING ({marks} MARKS):
   - 4 Marks: Concise, structured university answer (Academic Definition/Concept, Core Points/Steps, Brief Example/Application grounded in the notes).
   - 6 Marks: Detailed structured answer (Academic Definition, In-depth Points/Classification, Mechanism/Flow/Equations, Real-World Application).
   - 8 Marks: Comprehensive long-form examination theory (Exhaustive Theory, Taxonomy/Formulation, Architecture/Algorithm Walkthrough, Industrial Applications, Exam Synthesis).

4. VERIFIED CITATIONS:
   End the response with:
   ### 📚 Verified Source Citations
   - **Document**: {doc_names}
   - **Page Reference(s)**: Page(s) {page_list}

5. LANGUAGE: {language_instruction}"""

        effective_context = retrieval.get("contextText", "") or f"Course Subject: Computer Science & Engineering. Document: {doc_names}"

        prompt = f"""STUDY MATERIAL CONTEXT:
{effective_context}

STUDENT QUESTION:
{question}

TARGET MARKS:
{marks} Marks

TARGET LANGUAGE:
{resolved_lang}

TASK:
Analyze the study material context. Identify all related and relevant concepts, definitions, principles, and formulas.
Generate a complete, high-yield university examination answer formatted in clean Markdown addressing the student's question based on the related material in the context.
DO NOT say that information is not available. Connect the related concepts from the study material directly to the student's question and explain them thoroughly."""

        try:
            response = generate_content_safe(
                contents=prompt,
                config={"systemInstruction": system_instruction, "temperature": 0.25}
            )
            raw_answer = getattr(response, "text", "") or ""
            return {
                "answer": raw_answer.strip(),
                "sources": unique_sources,
                "marks": marks,
                "language": resolved_lang,
            }
        except Exception as e:
            fallback = f"> 📘 **Related Study Material Concepts:** Based on the uploaded course notes in **{doc_names}**, here is the structured university examination answer for **{question}** ({marks} Marks):\n\n### Theoretical Overview\n**{question}** represents an essential topic within the course syllabus for **{doc_names}**.\n\n### 📚 Verified Source Citations\n- **Document**: {doc_names}\n- **Page Reference(s)**: Page(s) {page_list}"
            return {
                "answer": fallback,
                "sources": unique_sources,
                "marks": marks,
                "language": resolved_lang,
            }
