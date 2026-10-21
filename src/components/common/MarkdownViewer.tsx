import React, { useState } from 'react';
import { Copy, Check, Calculator } from 'lucide-react';
import katex from 'katex';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

/**
 * Safely clean and render a LaTeX math formula using KaTeX with graceful fallback
 */
function cleanLatex(formula: string): string {
  let clean = (formula || '').trim();
  let changed = true;
  // Iteratively strip all enclosing LaTeX delimiters ($$, \[\], \(\), and $)
  while (changed) {
    changed = false;
    clean = clean.trim();
    if (clean.startsWith('$$') && clean.endsWith('$$') && clean.length >= 4) {
      clean = clean.slice(2, -2).trim();
      changed = true;
    } else if (clean.startsWith('\\[') && clean.endsWith('\\]') && clean.length >= 4) {
      clean = clean.slice(2, -2).trim();
      changed = true;
    } else if (clean.startsWith('\\(') && clean.endsWith('\\)') && clean.length >= 4) {
      clean = clean.slice(2, -2).trim();
      changed = true;
    } else if (clean.startsWith('$') && clean.endsWith('$') && clean.length >= 2) {
      clean = clean.slice(1, -1).trim();
      changed = true;
    }
  }
  return clean;
}

function renderKaTeX(formula: string, displayMode: boolean): { html: string; error?: boolean } {
  try {
    const cleanFormula = cleanLatex(formula);
    if (!cleanFormula) return { html: '', error: false };
    const html = katex.renderToString(cleanFormula, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
      trust: true,
    });
    const hasError = html.includes('katex-error');
    return { html, error: hasError };
  } catch (err) {
    console.warn('KaTeX render error for formula:', formula, err);
    return { html: formula, error: true };
  }
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = '' }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let currentList: { ordered: boolean; items: string[] } | null = null;
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let inDisplayMath = false;
  let displayMathLines: string[] = [];
  let blockIndex = 0;

  const flushList = () => {
    if (!currentList) return;
    const isOrdered = currentList.ordered;
    const items = currentList.items;
    currentList = null;

    elements.push(
      <div key={`list-${elements.length}`} className="my-2.5 pl-2 space-y-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2.5 text-xs md:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {isOrdered ? (
              <span className="shrink-0 w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center border border-indigo-200 dark:border-indigo-800 mt-0.5">
                {idx + 1}
              </span>
            ) : (
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-2" />
            )}
            <div className="flex-1 min-w-0">{renderInlineText(item)}</div>
          </div>
        ))}
      </div>
    );
  };

  const flushTable = () => {
    if (!currentTable) return;
    const { headers, rows } = currentTable;
    currentTable = null;

    elements.push(
      <div key={`table-${elements.length}`} className="my-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <table className="w-full text-left text-xs md:text-sm">
          <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-white font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              {headers.map((h, idx) => (
                <th key={idx} className="px-3.5 py-2.5 font-semibold">
                  {renderInlineText(h.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2 text-slate-700 dark:text-slate-300">
                    {renderInlineText(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const flushDisplayMath = () => {
    if (!inDisplayMath) return;
    const mathText = displayMathLines.join('\n').trim();
    inDisplayMath = false;
    displayMathLines = [];
    const idx = blockIndex++;

    const { html, error } = renderKaTeX(mathText, true);

    elements.push(
      <div
        key={`math-block-${elements.length}`}
        className="my-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs overflow-x-auto relative group"
      >
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-emerald-100 dark:border-emerald-950/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Mathematical Formula & Formulation</span>
          </div>
          <button
            onClick={() => copyToClipboard(mathText, idx)}
            className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
            title="Copy formula LaTeX"
          >
            {copiedIndex === idx ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="py-1 text-center overflow-x-auto">
          {!error ? (
            <div
              className="text-sm md:text-base leading-relaxed text-slate-900 dark:text-white"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <pre className="font-mono text-xs md:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {mathText}
            </pre>
          )}
        </div>
      </div>
    );
  };

  const flushCodeBlock = () => {
    if (!inCodeBlock) return;
    const codeText = codeBlockLines.join('\n');
    const lang = codeBlockLang.toLowerCase().trim();
    const idx = blockIndex++;
    inCodeBlock = false;
    codeBlockLines = [];

    // If code block is specifically tagged as math, latex, tex, or formula
    if (lang === 'latex' || lang === 'tex' || lang === 'math' || lang === 'formula') {
      const { html, error } = renderKaTeX(codeText, true);
      elements.push(
        <div
          key={`math-code-${elements.length}`}
          className="my-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs overflow-x-auto relative"
        >
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-emerald-100 dark:border-emerald-950/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Exam Mathematical Formula</span>
            </div>
            <button
              onClick={() => copyToClipboard(codeText, idx)}
              className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
            >
              {copiedIndex === idx ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="py-1 text-center overflow-x-auto">
            {!error ? (
              <div
                className="text-sm md:text-base leading-relaxed text-slate-900 dark:text-white"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="font-mono text-xs md:text-sm text-slate-800 dark:text-slate-200">
                {codeText}
              </pre>
            )}
          </div>
        </div>
      );
      return;
    }

    elements.push(
      <div
        key={`code-${elements.length}`}
        className="my-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 text-xs shadow-sm"
      >
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400">
          <span>{lang || 'code'}</span>
          <button
            onClick={() => copyToClipboard(codeText, idx)}
            className="flex items-center gap-1 hover:text-white transition cursor-pointer"
          >
            {copiedIndex === idx ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-3.5 overflow-x-auto font-mono text-xs leading-relaxed">
          <code>{codeText}</code>
        </pre>
      </div>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Multiline Display Math toggle: $$ ... $$ or \[ ... \] or \begin{equation/aligned}
    const isMathStart = trimmed === '$$' || trimmed === '\\[' || trimmed === '\\begin{equation}' || trimmed === '\\begin{aligned}' || trimmed === '\\begin{align*}';
    if (isMathStart) {
      if (inDisplayMath) {
        flushDisplayMath();
      } else {
        flushList();
        flushTable();
        inDisplayMath = true;
      }
      continue;
    }

    if (inDisplayMath) {
      const isMathEnd = trimmed === '$$' || trimmed.endsWith('$$') || trimmed === '\\]' || trimmed.endsWith('\\]') || trimmed === '\\end{equation}' || trimmed === '\\end{aligned}' || trimmed === '\\end{align*}';
      if (isMathEnd) {
        let closingLine = trimmed;
        if (closingLine.endsWith('$$')) closingLine = closingLine.slice(0, -2);
        else if (closingLine.endsWith('\\]')) closingLine = closingLine.slice(0, -2);
        else if (closingLine === '\\end{equation}' || closingLine === '\\end{aligned}' || closingLine === '\\end{align*}') closingLine = '';
        if (closingLine.trim()) displayMathLines.push(closingLine);
        flushDisplayMath();
      } else {
        displayMathLines.push(line);
      }
      continue;
    }

    // Single-line display math: $$ formula $$ or \[ formula \]
    const isSingleLineMath =
      (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) ||
      (trimmed.startsWith('\\[') && trimmed.endsWith('\\]') && trimmed.length > 4) ||
      (trimmed.startsWith('\\begin{') && (trimmed.includes('\\end{equation}') || trimmed.includes('\\end{aligned}')));

    if (isSingleLineMath) {
      flushList();
      flushTable();
      const formula = cleanLatex(trimmed);
      const { html, error } = renderKaTeX(formula, true);
      const idx = blockIndex++;
      elements.push(
        <div
          key={`math-single-${elements.length}`}
          className="my-3.5 p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-900/90 dark:via-slate-900 dark:to-emerald-950/20 border border-emerald-300/80 dark:border-emerald-800/60 shadow-xs overflow-x-auto relative group"
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-emerald-100 dark:border-emerald-950/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Mathematical Formula & Equation</span>
            </div>
            <button
              onClick={() => copyToClipboard(formula, idx)}
              className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              title="Copy LaTeX formula"
            >
              {copiedIndex === idx ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="py-2 text-center overflow-x-auto flex items-center justify-center min-h-[40px]">
            {!error ? (
              <div
                className="text-sm md:text-base leading-relaxed text-slate-900 dark:text-white"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="font-mono text-xs md:text-sm text-slate-800 dark:text-slate-200">
                {formula}
              </pre>
            )}
          </div>
        </div>
      );
      continue;
    }

    // Code block toggle
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeBlockLang = trimmed.replace(/^```/, '');
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // Check if delimiter row: | --- | --- |
      const isDelimiter = cells.every((c) => /^:?-+:?$/.test(c));

      if (isDelimiter) {
        // Just formatting delimiter row
        continue;
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else if (currentTable) {
      flushTable();
    }

    // Horizontal Rule
    if (/^(\s*[-*_]\s*){3,}$/.test(trimmed)) {
      flushList();
      flushTable();
      elements.push(
        <hr key={`hr-${elements.length}`} className="my-4 border-t border-slate-200 dark:border-slate-800" />
      );
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      flushList();
      flushTable();
      elements.push(
        <h5
          key={`h5-${elements.length}`}
          className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1"
        >
          {renderInlineText(line.replace(/^####\s+/, ''))}
        </h5>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      flushTable();
      elements.push(
        <h4
          key={`h4-${elements.length}`}
          className="text-xs md:text-sm font-extrabold text-slate-900 dark:text-white mt-3.5 mb-1.5 tracking-tight flex items-center gap-1.5"
        >
          {renderInlineText(line.replace(/^###\s+/, ''))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      flushTable();
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-sm md:text-base font-bold text-slate-900 dark:text-white mt-4 mb-2 tracking-tight"
        >
          {renderInlineText(line.replace(/^##\s+/, ''))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('# ')) {
      flushList();
      flushTable();
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white mt-4 mb-2 tracking-tight"
        >
          {renderInlineText(line.replace(/^#\s+/, ''))}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      flushTable();
      elements.push(
        <div
          key={`quote-${elements.length}`}
          className="my-3 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-500 text-xs md:text-sm text-slate-700 dark:text-slate-300 italic"
        >
          {renderInlineText(line.replace(/^>\s+/, ''))}
        </div>
      );
      continue;
    }

    // Unordered List
    if (/^\s*[-*•]\s+/.test(line)) {
      flushTable();
      const itemText = line.replace(/^\s*[-*•]\s+/, '');
      if (!currentList || currentList.ordered) {
        flushList();
        currentList = { ordered: false, items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Ordered List
    if (/^\s*\d+\.\s+/.test(line)) {
      flushTable();
      const itemText = line.replace(/^\s*\d+\.\s+/, '');
      if (!currentList || !currentList.ordered) {
        flushList();
        currentList = { ordered: true, items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Empty line
    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }

    // Standard Paragraph
    flushList();
    flushTable();
    elements.push(
      <p
        key={`p-${elements.length}`}
        className="my-1.5 text-xs md:text-sm leading-relaxed text-slate-800 dark:text-slate-200"
      >
        {renderInlineText(line)}
      </p>
    );
  }

  flushList();
  flushTable();
  flushCodeBlock();
  flushDisplayMath();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};

/**
 * Helper to parse bold, code spans, italics, and inline KaTeX math in text
 */
function renderInlineText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Tokenize regex for display math $$, \[ \], inline math \( \), $...$, code `...`, bold **...**, italic *...*
  const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\(.+?\\\)|(?<!\$)\$(?!\$)[^\$\n]+?\$(?!\$)|`[^`]+?`|\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    // Display math embedded inline: $$ formula $$ or \[ formula \]
    if ((token.startsWith('$$') && token.endsWith('$$') && token.length > 4) ||
        (token.startsWith('\\[') && token.endsWith('\\]') && token.length > 4)) {
      const formula = cleanLatex(token);
      const { html, error } = renderKaTeX(formula, true);
      parts.push(
        !error ? (
          <span
            key={`math-disp-${match.index}`}
            className="inline-block my-1 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-emerald-300/80 dark:border-emerald-800/60 align-middle text-slate-900 dark:text-white shadow-2xs font-serif"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <span
            key={`math-fallback-${match.index}`}
            className="font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold"
          >
            {formula}
          </span>
        )
      );
    }
    // Inline math: \( formula \) or $ formula $
    else if ((token.startsWith('\\(') && token.endsWith('\\)') && token.length > 4) ||
             (token.startsWith('$') && token.endsWith('$') && token.length > 2)) {
      const inner = cleanLatex(token);
      // Exclude simple currency like $50 or $10.99
      if (/^\d+(\.\d+)?$/.test(inner)) {
        parts.push(token);
      } else {
        const { html, error } = renderKaTeX(inner, false);
        parts.push(
          !error ? (
            <span
              key={`math-inline-${match.index}`}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 border border-emerald-200/60 dark:border-emerald-800/50 align-baseline text-[11px] md:text-xs font-serif leading-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <span
              key={`math-fallback-${match.index}`}
              className="font-mono text-xs px-1 rounded bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300"
            >
              {inner}
            </span>
          )
        );
      }
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`inline-${match.index}`}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] border border-slate-200 dark:border-slate-700"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`bold-${match.index}`} className="font-bold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`italic-${match.index}`} className="italic text-slate-700 dark:text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
