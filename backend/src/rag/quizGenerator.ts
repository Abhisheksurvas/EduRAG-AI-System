import { Type } from '@google/genai';
import { generateContentSafe, isGeminiConfigured } from '../services/gemini.js';
import { DBStore } from '../models/store.js';
import { IQuizQuestion } from '../models/Quiz.js';

export interface GenerateQuizParams {
  studentId: string;
  documentId: string;
  topic?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
  timeLimit?: number;
}

export class QuizGenerator {
  /**
   * Generates dynamic quiz questions strictly grounded in the selected document material
   */
  static async generateQuiz(params: GenerateQuizParams): Promise<{
    title: string;
    topic: string;
    questions: IQuizQuestion[];
  }> {
    // 1. Fetch chunks belonging to this document
    const chunks = await DBStore.findChunks(params.studentId, [params.documentId]);

    if (!chunks || chunks.length === 0) {
      throw new Error('No readable content chunks found in the selected study material. Ensure the document is in Ready status.');
    }

    const doc = await DBStore.findDocumentById(params.documentId, params.studentId);
    const docName = doc?.originalName || 'Study Material';

    // Filter by topic if specified
    let targetChunks = chunks;
    if (params.topic && params.topic.trim()) {
      const topicLower = params.topic.toLowerCase().trim();
      const filtered = chunks.filter(
        (c) =>
          c.chapter?.toLowerCase().includes(topicLower) ||
          c.unit?.toLowerCase().includes(topicLower) ||
          c.text.toLowerCase().includes(topicLower)
      );
      if (filtered.length > 0) {
        targetChunks = filtered;
      } else {
        throw new Error('The requested topic was not found in the selected study material.');
      }
    }

    // Prepare context with explicit page tags
    const contextText = targetChunks
      .slice(0, 15)
      .map((c) => `[Page ${c.pageNumber}]: ${c.text}`)
      .join('\n\n---\n\n');

    const requestedCount = Math.min(Math.max(params.questionCount || 5, 1), 20);
    const effectiveTopic = params.topic?.trim() || docName.replace(/\.[^/.]+$/, '');

    if (!isGeminiConfigured()) {
      throw new Error('GEMINI_API_KEY is required to generate dynamic RAG quizzes.');
    }

    const systemInstruction = `You are EduRAG AI Quiz Architect.
Your task is to generate challenging, high-quality multiple choice exam questions for college engineering students.
STRICT GROUNDING REQUIREMENT:
Every single question, option, correct answer, and explanation MUST be directly grounded in and answerable ONLY using the supplied study material context.
Do NOT introduce external topics.
If a concept is not mentioned in the text, do not ask questions about it.
Ensure all 4 options are plausible, but exactly 1 is unambiguously correct according to the context.
Return sourcePage as an integer matching the [Page N] marker where the answer was found.`;

    const userPrompt = `STUDY MATERIAL CONTEXT:
${contextText}

REQUIREMENTS:
- Topic: ${effectiveTopic}
- Difficulty: ${params.difficulty}
- Generate exactly ${requestedCount} multiple choice questions.
- Each question must have exactly 4 options.
- correctAnswer must be the 0-based index (0, 1, 2, or 3) of the correct option.
- Include a comprehensive explanation citing the principle and context.
- Identify the exact sourcePage (integer) from the text.`;

    try {
      const response: any = await generateContentSafe({
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionNumber: { type: Type.INTEGER },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctAnswer: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                sourcePage: { type: Type.INTEGER },
              },
              required: ['questionNumber', 'question', 'options', 'correctAnswer', 'explanation'],
            },
          },
          temperature: 0.2, // low temperature for grounding consistency
        },
      });

      const parsed: any[] = JSON.parse(response.text || '[]');
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('The AI model did not produce structured questions from the study material.');
      }

      // QUIZ VALIDATION:
      // Verify that every question is grounded in the retrieved chunks
      const validatedQuestions: IQuizQuestion[] = [];
      const fullContextLower = contextText.toLowerCase();

      for (let i = 0; i < parsed.length; i++) {
        const q = parsed[i];
        if (!q.question || !Array.isArray(q.options) || q.options.length < 4) continue;

        const keyWords = q.question
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w: string) => w.length > 3);

        const matchCount = keyWords.filter((w: string) => fullContextLower.includes(w)).length;
        const relevanceRatio = keyWords.length > 0 ? matchCount / keyWords.length : 1;

        if (relevanceRatio >= 0.3 || keyWords.length <= 2) {
          validatedQuestions.push({
            questionNumber: validatedQuestions.length + 1,
            question: q.question.trim(),
            options: q.options.slice(0, 4).map((opt: any) => String(opt).trim()),
            correctAnswer: Math.min(Math.max(Number(q.correctAnswer) || 0, 0), 3),
            explanation: q.explanation ? String(q.explanation).trim() : 'Validated from study material.',
            sourcePage: Number(q.sourcePage) || targetChunks[0]?.pageNumber || 1,
            selectedAnswer: null,
          });
        }
      }

      if (validatedQuestions.length === 0) {
        throw new Error('Could not validate generated questions against the study material text.');
      }

      return {
        title: `${effectiveTopic} - ${params.difficulty} Quiz`,
        topic: effectiveTopic,
        questions: validatedQuestions,
      };
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      throw new Error(`Failed to generate validated quiz: ${err.message}`);
    }
  }
}
