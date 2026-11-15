import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content?: string;
  text?: string;
  className?: string;
}

const SUPERSCRIPT_CHAR_MAP: Record<string, string> = {
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

const SUBSCRIPT_CHAR_MAP: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  '₊': '+',
  '₋': '-',
};

/**
 * Cleans stray leading closing paren copied before LaTeX e.g. ") \(10^{-18}\text{ m}\)"
 */
function preCleanMathArtifacts(raw: string): string {
  if (!raw) return '';
  return raw.replace(/^\s*\)\s*(?=\\?\(|\$)/, '');
}

/**
 * Renders plain text segments with automatic support for unicode superscripts/subscripts
 * (e.g. 10⁻¹⁸, H₂O) and caret exponents (e.g. 10^-18, 10^{-18}, ms^-2).
 */
function renderPlainSegment(segment: string, keyPrefix: string): React.ReactNode {
  const tokenRegex = /([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+|[₀₁₂₃₄₅₆₇₈₉₊₋]+|\^(?:\{[^}]+\}|[+-]?\d+|[a-zA-Z]))/g;
  if (!tokenRegex.test(segment)) {
    return <span key={keyPrefix}>{segment}</span>;
  }

  tokenRegex.lastIndex = 0;
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRegex.exec(segment)) !== null) {
    if (m.index > lastIdx) {
      nodes.push(<React.Fragment key={`${keyPrefix}-t-${lastIdx}`}>{segment.slice(lastIdx, m.index)}</React.Fragment>);
    }

    const tok = m[0];
    if (tok.startsWith('^')) {
      const exp = tok.slice(1).replace(/^\{|\}$/g, '');
      nodes.push(
        <sup key={`${keyPrefix}-sup-${m.index}`} className="text-[0.72em] leading-none font-semibold">
          {exp}
        </sup>
      );
    } else if (/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]/.test(tok)) {
      const ascii = tok
        .split('')
        .map((c) => SUPERSCRIPT_CHAR_MAP[c] || c)
        .join('');
      nodes.push(
        <sup key={`${keyPrefix}-usup-${m.index}`} className="text-[0.72em] leading-none font-semibold">
          {ascii}
        </sup>
      );
    } else {
      const ascii = tok
        .split('')
        .map((c) => SUBSCRIPT_CHAR_MAP[c] || c)
        .join('');
      nodes.push(
        <sub key={`${keyPrefix}-usub-${m.index}`} className="text-[0.72em] leading-none font-semibold">
          {ascii}
        </sub>
      );
    }

    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < segment.length) {
    nodes.push(<React.Fragment key={`${keyPrefix}-t-${lastIdx}`}>{segment.slice(lastIdx)}</React.Fragment>);
  }

  return <span key={keyPrefix}>{nodes}</span>;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, text, className = '' }) => {
  const effectiveContent = content ?? text ?? '';

  const renderedElements = useMemo(() => {
    if (!effectiveContent) return null;

    const cleaned = preCleanMathArtifacts(effectiveContent);

    // Supports $$...$$, \[...\], $...$, and \(...\)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$]+?\$|\\\([\s\S]*?\\\))/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(cleaned)) !== null) {
      if (match.index > lastIndex) {
        const textSegment = cleaned.substring(lastIndex, match.index);
        parts.push(renderPlainSegment(textSegment, `text-${lastIndex}`));
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
      } catch {
        parts.push(
          <code key={`err-${match.index}`} className="text-red-500 font-mono text-xs">
            {matchStr}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < cleaned.length) {
      parts.push(renderPlainSegment(cleaned.substring(lastIndex), `text-${lastIndex}`));
    }

    return parts;
  }, [effectiveContent]);

  return <span className={`math-rendered-content ${className}`}>{renderedElements}</span>;
};
