import { ExtractedPage } from './extractor.js';

export interface ChunkMetadata {
  studentId: string;
  documentId: string;
  filename: string;
  pageNumber: number;
  unit: string;
  chapter: string;
  chunkIndex: number;
  text: string;
}

export class DocumentChunker {
  /**
   * Split pages into overlapping semantic chunks with preserved metadata
   */
  static chunkDocument(
    pages: ExtractedPage[],
    metadata: { studentId: string; documentId: string; filename: string },
    options: { chunkSize?: number; overlap?: number } = {}
  ): ChunkMetadata[] {
    const chunkSize = options.chunkSize || 600;
    const overlap = options.overlap || 80;
    const chunks: ChunkMetadata[] = [];
    let globalChunkIndex = 0;

    let currentDetectedUnit = '';
    let currentDetectedChapter = '';

    for (const page of pages) {
      const pageText = page.text.trim();
      if (!pageText) continue;

      // Detect Unit or Module headers
      const unitMatch = pageText.match(/(?:Unit|Module|Part)\s*[-:]?\s*([0-9IVX]+[^\n\r]*)/i);
      if (unitMatch) {
        currentDetectedUnit = unitMatch[0].trim();
      }

      // Detect Chapter or Section headers
      const chapterMatch = pageText.match(/(?:Chapter|Section|\d+\.\d+)\s*[-:]?\s*([0-9A-Za-z\s]{3,40})/i);
      if (chapterMatch) {
        currentDetectedChapter = chapterMatch[0].trim();
      }

      // Split page text into sentences/paragraphs
      const paragraphs = pageText.split(/(?<=[.?!])\s+(?=[A-Z0-9])|\n+/);
      let currentChunkText = '';

      for (const para of paragraphs) {
        const cleanPara = para.trim();
        if (!cleanPara) continue;

        if (currentChunkText.length + cleanPara.length > chunkSize && currentChunkText.length > 0) {
          chunks.push({
            studentId: metadata.studentId,
            documentId: metadata.documentId,
            filename: metadata.filename,
            pageNumber: page.pageNumber,
            unit: currentDetectedUnit || `Unit 1`,
            chapter: currentDetectedChapter || `Topic ${page.pageNumber}`,
            chunkIndex: globalChunkIndex++,
            text: currentChunkText.trim(),
          });

          // Carry over overlap
          const words = currentChunkText.split(/\s+/);
          const overlapWords = words.slice(-Math.min(words.length, 12)).join(' ');
          currentChunkText = overlapWords + ' ' + cleanPara;
        } else {
          currentChunkText = currentChunkText ? `${currentChunkText} ${cleanPara}` : cleanPara;
        }
      }

      if (currentChunkText.trim().length > 30) {
        chunks.push({
          studentId: metadata.studentId,
          documentId: metadata.documentId,
          filename: metadata.filename,
          pageNumber: page.pageNumber,
          unit: currentDetectedUnit || `Unit 1`,
          chapter: currentDetectedChapter || `Topic ${page.pageNumber}`,
          chunkIndex: globalChunkIndex++,
          text: currentChunkText.trim(),
        });
      }
    }

    // Safety fallback: if no chunks were created, create one chunk from all pages
    if (chunks.length === 0 && pages.length > 0) {
      chunks.push({
        studentId: metadata.studentId,
        documentId: metadata.documentId,
        filename: metadata.filename,
        pageNumber: 1,
        unit: 'Unit 1',
        chapter: 'General Overview',
        chunkIndex: 0,
        text: pages.map((p) => p.text).join('\n\n').slice(0, 1000),
      });
    }

    return chunks;
  }
}
