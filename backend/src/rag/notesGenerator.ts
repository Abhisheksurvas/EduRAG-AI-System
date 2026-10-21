import { generateContentSafe, isGeminiConfigured } from '../services/gemini.js';
import { DBStore } from '../models/store.js';

export interface GenerateNotesParams {
  studentId: string;
  documentId: string;
  unit?: string;
  chapter?: string;
  promptType: string;
  customPrompt?: string;
}

export class NotesGenerator {
  static getPromptInstruction(promptType: string, customPrompt?: string): string {
    switch (promptType) {
      case 'Chapter Summary':
        return 'Generate an exhaustive, well-structured Chapter Summary strictly from the study material. Break down the core theoretical concepts, major subsections, logical progression, and conclusions.';
      case 'Key Points':
        return 'Extract and elaborate on all essential Key Points and high-yield insights from the study material. For each point, provide a clear explanation and academic significance.';
      case 'Definitions':
        return 'Extract all critical terminology, technical keywords, formal principles, and glossary definitions from the study material with precise explanations grounded in the text.';
      case 'Formula Sheet':
        return `Compile a comprehensive, highly-structured, and 100% UNDERSTANDABLE Formula Sheet detailing all mathematical expressions, equations, theorems, laws, performance metrics, and quantitative algorithms derived from or related to the study material.

MANDATORY CRITERIA FOR AN UNDERSTANDABLE FORMULA SHEET:
1. At the very top, provide a **Quick-Glance Formula Reference Table** summarizing each Formula Name, its Key Equation ($...$), and Exam Application.
2. For EVERY single formula or equation, you MUST follow this crystal-clear 5-step format:
   ### [Number]. [Formula / Metric Name]
   - **Mathematical Equation:** (Render using a standalone LaTeX display block on its own line):
   $$
   [Clean LaTeX Formula]
   $$
   - 💡 **Intuitive Understanding & Purpose:** Explain in plain English what this formula actually computes, why it is used, and the physical / mathematical intuition behind it (make it easily understandable for college students).
   - 📋 **Variable & Parameter Breakdown:**
     - **$symbol$**: Exact academic definition, meaning, and units or valid range.
   - ⚠️ **Key Assumptions, Conditions & Constraints:** When to apply this formula and any critical edge cases or conditions.
   - 🧮 **Step-by-Step Worked Example:** A clear numerical walkthrough substituting real sample numbers to show students exactly how to compute the result in university examinations.

If the course material is Computer Science, AI/ML, NLP, Networks, Software, or Electronics, extract and clearly formulate all relevant mathematical definitions, evaluation metrics (Accuracy, Precision, Recall, F1-Score, Cross-Entropy Loss, Bayes Theorem, Perplexity, Entropy), cryptographic operations (RSA modular arithmetic), Big-O asymptotic complexities, or network calculations.`;
      case 'Five key takeaways':
        return 'Extract and elaborate on exactly 5 vital key takeaways from the study material. For each takeaway, provide an in-depth conceptual summary, importance, and practical application.';
      case 'Beginner explanation':
        return 'Explain all the core concepts in this study material for an absolute beginner or first-year student. Use intuitive real-world analogies, simplified diagrams in ASCII/markdown, and step-by-step logic.';
      case 'Meeting minutes draft':
        return 'Format the study material into formal academic lecture / seminar review notes, including discussion agenda, major theoretical decisions, action points, and review assignments.';
      case '10 flashcards':
        return 'Generate exactly 10 comprehensive study flashcards from the text. Format each as: **Flashcard [N]**\n**Q:** [Question testing deep understanding]\n**A:** [Clear, precise, complete answer derived from the notes].';
      case 'Timeline / milestones':
        return 'Construct a chronological timeline or structured conceptual milestone roadmap mapping out the historical evolution, phase stages, or execution sequence described in the material.';
      case 'Compare options':
        return 'Identify key algorithms, methodologies, or approaches in this study material and create an exhaustive comparative analysis table followed by pros, cons, complexity metrics, and trade-offs.';
      case 'Custom prompt':
        return customPrompt && customPrompt.trim().length > 0
          ? customPrompt.trim()
          : 'Generate comprehensive revision notes covering all definitions, principles, and critical formulas.';
      default:
        return 'Generate a high-yield exam revision guide covering all definitions, key formulas, and exam questions from the material.';
    }
  }

  static async generateNotes(params: GenerateNotesParams): Promise<{ title: string; content: string }> {
    // 1. Retrieve chunks belonging to this document and student
    const chunks = await DBStore.findChunks(params.studentId, [params.documentId]);

    if (!chunks || chunks.length === 0) {
      throw new Error('No readable text chunks found in the selected study material. Please verify document status.');
    }

    // Filter by unit or chapter if supplied
    let targetChunks = chunks;
    if (params.chapter && params.chapter.trim()) {
      const chapterLower = params.chapter.toLowerCase().trim();
      const filtered = chunks.filter(
        (c) =>
          c.chapter?.toLowerCase().includes(chapterLower) ||
          c.unit?.toLowerCase().includes(chapterLower) ||
          c.text.toLowerCase().includes(chapterLower)
      );
      if (filtered.length > 0) {
        targetChunks = filtered;
      } else {
        // Fallback to all document chunks to synthesize related material
        targetChunks = chunks;
      }
    }

    // Clip context
    const contextText = targetChunks
      .slice(0, 15)
      .map((c, i) => `[Source Page ${c.pageNumber}]:\n${c.text}`)
      .join('\n\n---\n\n');

    const doc = await DBStore.findDocumentById(params.documentId, params.studentId);
    const docName = doc?.originalName || 'Study Material';
    const directive = this.getPromptInstruction(params.promptType, params.customPrompt);

    if (!isGeminiConfigured()) {
      return {
        title: `${params.promptType} - ${docName}`,
        content: `# Notes: ${docName}\n\n## Overview\nGenerated from ${targetChunks.length} sections of ${docName}.\n\n### Content Excerpts\n${contextText.slice(0, 1000)}...`,
      };
    }

    const systemInstruction = `You are EduRAG AI Notes Engine.
You synthesize and generate clean, highly-readable revision notes for college engineering students from their uploaded study material.
CRITICAL GROUNDING & CLARITY INSTRUCTIONS:
1. Generate notes from the supplied study material context.
2. Even if a specific keyword or heading is not an exact verbatim match, synthesize the related and relevant concepts, definitions, principles, and formulas present in the study material into clear revision notes.
3. NEVER return "This information is not available in the selected study material". Connect the related topics to synthesize high-yield notes.
4. FORMULA SHEET SPECIAL INSTRUCTIONS:
   - When generating a Formula Sheet, ensure every formula is formatted using proper LaTeX $$ ... $$ display blocks on their own lines so KaTeX can render them cleanly.
   - Formulas must be 100% UNDERSTANDABLE to students: always explain the intuitive concept behind the formula, define every variable with clear symbols ($x, y, \theta$), note assumptions, and provide a short worked numerical example.
5. Use clear headings, bullet points, callout blocks, math notation, and bold terminology.`;

    const userPrompt = `DOCUMENT TITLE: ${docName}
UNIT/TOPIC: ${params.unit || 'All Units'} | ${params.chapter || 'All Chapters'}
PROMPT GOAL: ${params.promptType}
SPECIFIC DIRECTIVE:
${directive}

STUDY MATERIAL CONTEXT:
${contextText}

Generate high-yield, structured, complete notes now.`;

    try {
      const response: any = await generateContentSafe({
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const content = (response.text || '').trim();
      const title = `${params.promptType} • ${params.chapter || docName.replace(/\.[^/.]+$/, '')}`;

      return {
        title,
        content: content || `# Study Notes\n\n${directive}`,
      };
    } catch (err: any) {
      console.error('Notes generation error:', err);
      throw new Error(`Failed to generate notes with AI: ${err.message}`);
    }
  }
}
