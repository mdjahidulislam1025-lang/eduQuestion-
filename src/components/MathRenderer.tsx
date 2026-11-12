import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content?: string;
  text?: string;
  className?: string;
}

/**
 * Maps unicode superscripts to standard ASCII characters
 */
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-',
  '⁼': '=',
  '⁽': '(',
  '⁾': ')',
  'ⁿ': 'n',
  'ⁱ': 'i',
};

/**
 * Checks if a string contains unicode superscripts
 */
function hasUnicodeSuperscripts(text: string): boolean {
  return /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]/.test(text);
}

/**
 * Converts unicode superscripts to HTML sub/sup friendly format or TeX
 */
function normalizeUnicodeSuperscripts(text: string): string {
  // Convert patterns like 10⁻¹⁸ to 10^{-18}
  return text.replace(/([0-9a-zA-Z]+)([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+)/g, (_, base, sups) => {
    const asciiSups = sups
      .split('')
      .map((ch: string) => SUPERSCRIPT_MAP[ch] || ch)
      .join('');
    return `$${base}^{${asciiSups}}$`;
  });
}

/**
 * Pre-cleans common paste artifacts in math/science questions
 * e.g., accidental leading closing bracket ") \(10^{-18}\)" -> "\(10^{-18}\)"
 */
function preCleanMathArtifacts(raw: string): string {
  if (!raw) return '';
  let str = raw;
  // If user copied e.g. ") \(10^{-18}\text{ m}\)" or ") 10^-18"
  str = str.replace(/^\s*[\)\.\•\-\*]+\s*(?=\\?\(|\$|10\^|10[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻])/, '');
  // Normalize unicode superscripts like 10⁻¹⁸ or ms⁻²
  if (hasUnicodeSuperscripts(str)) {
    str = normalizeUnicodeSuperscripts(str);
  }
  return str;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, text, className = '' }) => {
  const effectiveContent = content ?? text ?? '';

  const renderedElements = useMemo(() => {
    if (!effectiveContent) return null;

    const cleaned = preCleanMathArtifacts(effectiveContent);

    // Regex supports:
    // 1. $$ ... $$ (display)
    // 2. \[ ... \] (display)
    // 3. $ ... $ (inline)
    // 4. \( ... \) (inline)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$]+?\$|\\\([\s\S]*?\\\))/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(cleaned)) !== null) {
      // Text before formula
      if (match.index > lastIndex) {
        const textSegment = cleaned.substring(lastIndex, match.index);
        parts.push(
          <span key={`text-${lastIndex}`}>
            {textSegment}
          </span>
        );
      }

      const matchStr = match[0];
      let formula = '';
      let isDisplayMode = false;

      if (matchStr.startsWith('$$') && matchStr.endsWith('$$')) {
        isDisplayMode = true;
        formula = matchStr.slice(2, -2).trim();
      } else if (matchStr.startsWith('\\[') && matchStr.endsWith('\\]')) {
        isDisplayMode = true;
        formula = matchStr.slice(2, -2).trim();
      } else if (matchStr.startsWith('\\(') && matchStr.endsWith('\\)')) {
        isDisplayMode = false;
        formula = matchStr.slice(2, -2).trim();
      } else if (matchStr.startsWith('$') && matchStr.endsWith('$')) {
        isDisplayMode = false;
        formula = matchStr.slice(1, -1).trim();
      }

      try {
        const html = katex.renderToString(formula, {
          displayMode: isDisplayMode,
          throwOnError: false,
        });
        parts.push(
          <span
            key={`math-${match.index}`}
            dangerouslySetInnerHTML={{ __html: html }}
            className={isDisplayMode ? 'block my-2 overflow-x-auto text-center' : 'inline-block mx-0.5 align-middle'}
          />
        );
      } catch (err) {
        parts.push(
          <code key={`err-${match.index}`} className="text-red-500 font-mono text-xs">
            {matchStr}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < cleaned.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {cleaned.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  }, [effectiveContent]);

  return <span className={`math-rendered-content ${className}`}>{renderedElements}</span>;
};
