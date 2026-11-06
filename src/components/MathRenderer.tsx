import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content?: string;
  text?: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, text, className = '' }) => {
  const effectiveContent = content ?? text ?? '';
  const renderedElements = useMemo(() => {
    if (!effectiveContent) return null;

    // Check if there are math blocks ($$..$$ or $..$)
    const parts: React.ReactNode[] = [];
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(effectiveContent)) !== null) {
      // Text before formula
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {effectiveContent.substring(lastIndex, match.index)}
          </span>
        );
      }

      const matchStr = match[0];
      const isDisplayMode = matchStr.startsWith('$$');
      const formula = isDisplayMode
        ? matchStr.slice(2, -2).trim()
        : matchStr.slice(1, -1).trim();

      try {
        const html = katex.renderToString(formula, {
          displayMode: isDisplayMode,
          throwOnError: false,
        });
        parts.push(
          <span
            key={`math-${match.index}`}
            dangerouslySetInnerHTML={{ __html: html }}
            className={isDisplayMode ? 'block my-2 overflow-x-auto text-center' : 'inline-block mx-0.5'}
          />
        );
      } catch (err) {
        parts.push(<code key={`err-${match.index}`} className="text-red-500">{matchStr}</code>);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < effectiveContent.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {effectiveContent.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  }, [effectiveContent]);

  return <span className={`math-rendered-content ${className}`}>{renderedElements}</span>;
};
