import '../utils/polyfills.js';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import { generateContentSafe, isGeminiConfigured } from '../services/gemini.js';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  fullText: string;
  totalPages: number;
  pages: ExtractedPage[];
}

export class DocumentExtractor {
  /**
   * Extract text from PDF buffer preserving real page numbers
   */
  static async extractPDF(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const parser = new PDFParse({ data: buffer });
      const result: any = await parser.getText();
      const totalPages = result.total || (result.pages ? result.pages.length : 1);
      const pages: ExtractedPage[] = [];

      if (Array.isArray(result.pages) && result.pages.length > 0) {
        for (const p of result.pages) {
          const cleanText = (p.text || '').trim();
          if (cleanText) {
            pages.push({
              pageNumber: p.num || pages.length + 1,
              text: cleanText,
            });
          }
        }
      }

      // If pages array is empty, fallback to fullText
      let fullText = (result.text || pages.map((p) => p.text).join('\n\n')).trim();

      await parser.destroy?.();

      // OCR & multilingual language recognition for scanned / image-based PDFs
      if (fullText.length < 50 && buffer.length > 0 && isGeminiConfigured()) {
        try {
          const ocrPrompt =
            'Extract and transcribe all text, formulas, headings, diagrams, and notes from this scanned PDF document with complete accuracy. Support all languages including English, Hindi, Marathi, Tamil, Telugu, Gujarati, Bengali, and other regional languages. Preserve technical definitions, equations, and tables. Separate distinct pages with "--- Page <number> ---" markers.';

          const ocrResponse = await generateContentSafe({
            contents: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: buffer.toString('base64'),
                },
              },
              { text: ocrPrompt },
            ],
          });

          const ocrText = (ocrResponse?.text || '').trim();
          if (ocrText && ocrText.length > fullText.length) {
            fullText = ocrText;
            const pageRegex = /(?:^|\n)(?:[-=]{3,}\s*Page\s*(\d+)\s*[-=]{3,})/i;
            const parts = ocrText.split(pageRegex);
            if (parts.length > 2) {
              pages.length = 0;
              for (let i = 1; i < parts.length; i += 2) {
                const pNum = parseInt(parts[i], 10) || Math.floor(i / 2) + 1;
                const pText = (parts[i + 1] || '').trim();
                if (pText) {
                  pages.push({ pageNumber: pNum, text: pText });
                }
              }
            }
          }
        } catch (ocrErr) {
          console.warn('OCR processing fallback encountered note:', ocrErr);
        }
      }

      if (pages.length === 0 && fullText) {
        pages.push({ pageNumber: 1, text: fullText });
      }

      return {
        fullText,
        totalPages: Math.max(totalPages, pages.length || 1),
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText || 'Empty document' }],
      };
    } catch (error: any) {
      console.error('Error parsing PDF:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX buffer
   */
  static async extractDOCX(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      const cleanText = (value || '').trim();

      // DOCX doesn't have fixed pagination, split into realistic pages by paragraphs / word chunks
      const paragraphs = cleanText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
      const pages: ExtractedPage[] = [];
      let currentPageText: string[] = [];
      let currentWordCount = 0;
      let pageNum = 1;

      for (const p of paragraphs) {
        const words = p.split(/\s+/).length;
        if (currentWordCount + words > 450 && currentPageText.length > 0) {
          pages.push({
            pageNumber: pageNum++,
            text: currentPageText.join('\n\n'),
          });
          currentPageText = [p];
          currentWordCount = words;
        } else {
          currentPageText.push(p);
          currentWordCount += words;
        }
      }

      if (currentPageText.length > 0) {
        pages.push({
          pageNumber: pageNum,
          text: currentPageText.join('\n\n'),
        });
      }

      return {
        fullText: cleanText,
        totalPages: Math.max(pages.length, 1),
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: cleanText || 'Empty document' }],
      };
    } catch (error: any) {
      console.error('Error parsing DOCX:', error);
      throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
  }

  /**
   * Extract text from PPTX buffer slide by slide
   */
  static async extractPPTX(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      // Find all slide XML files
      const slideEntries = entries
        .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName))
        .sort((a, b) => {
          const numA = parseInt(a.entryName.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
          const numB = parseInt(b.entryName.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
          return numA - numB;
        });

      const pages: ExtractedPage[] = [];

      for (let i = 0; i < slideEntries.length; i++) {
        const entry = slideEntries[i];
        const xml = entry.getData().toString('utf8');
        // Extract text tags <a:t>...</a:t>
        const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
        const slideText = matches
          .map((m) => m.replace(/<[^>]+>/g, '').trim())
          .filter((t) => t.length > 0)
          .join(' ');

        if (slideText) {
          pages.push({
            pageNumber: i + 1, // Slide 1 = Page 1
            text: slideText,
          });
        }
      }

      const fullText = pages.map((p) => `Slide ${p.pageNumber}: ${p.text}`).join('\n\n');

      return {
        fullText,
        totalPages: Math.max(slideEntries.length, pages.length || 1),
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText || 'Empty presentation' }],
      };
    } catch (error: any) {
      console.error('Error parsing PPTX:', error);
      throw new Error(`Failed to extract text from PPTX: ${error.message}`);
    }
  }

  /**
   * Extract text from TXT buffer
   */
  static async extractTXT(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const text = buffer.toString('utf-8').trim();
      // Look for page markers like "Page 1" or "--- Page 1 ---"
      const pageSplit = text.split(/(?:^|\n)(?:[-=]{3,}\s*(?:Page|Slide)\s*(\d+)\s*[-=]{3,})/i);

      const pages: ExtractedPage[] = [];
      if (pageSplit.length > 2) {
        for (let i = 1; i < pageSplit.length; i += 2) {
          const pageNum = parseInt(pageSplit[i], 10) || Math.floor(i / 2) + 1;
          const pageContent = (pageSplit[i + 1] || '').trim();
          if (pageContent) {
            pages.push({ pageNumber: pageNum, text: pageContent });
          }
        }
      }

      if (pages.length === 0) {
        // Divide by paragraphs ~400 words per page
        const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
        let currentPageText: string[] = [];
        let currentWordCount = 0;
        let pageNum = 1;

        for (const p of paragraphs) {
          const words = p.split(/\s+/).length;
          if (currentWordCount + words > 400 && currentPageText.length > 0) {
            pages.push({ pageNumber: pageNum++, text: currentPageText.join('\n\n') });
            currentPageText = [p];
            currentWordCount = words;
          } else {
            currentPageText.push(p);
            currentWordCount += words;
          }
        }
        if (currentPageText.length > 0) {
          pages.push({ pageNumber: pageNum, text: currentPageText.join('\n\n') });
        }
      }

      return {
        fullText: text,
        totalPages: Math.max(pages.length, 1),
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: text || 'Empty text file' }],
      };
    } catch (error: any) {
      console.error('Error parsing TXT:', error);
      throw new Error(`Failed to extract text from TXT: ${error.message}`);
    }
  }

  /**
   * Master dispatcher for extracting by mime type or file extension
   */
  static async extract(
    buffer: Buffer,
    filename: string,
    mimeType?: string
  ): Promise<ExtractionResult> {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (ext === 'pdf' || mimeType === 'application/pdf') {
      return await this.extractPDF(buffer);
    }
    if (
      ext === 'docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return await this.extractDOCX(buffer);
    }
    if (
      ext === 'pptx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      return await this.extractPPTX(buffer);
    }
    if (ext === 'txt' || mimeType === 'text/plain') {
      return await this.extractTXT(buffer);
    }

    throw new Error(`Unsupported file type: .${ext}. Please upload a PDF, DOCX, PPTX, or TXT file.`);
  }
}
