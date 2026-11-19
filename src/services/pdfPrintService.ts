import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type PdfOutputType = 'question_paper' | 'answer_sheet' | 'mcq_key' | 'complete';

export interface PdfPrintOptions {
  outputType: PdfOutputType;
  columnLayout?: 'single' | 'two-column';
  fontFamily?: 'serif' | 'sans';
  fontSize?: 'sm' | 'base' | 'lg';
  includeWatermark?: boolean;
  includeLogo?: boolean;
  includeSourceRef?: boolean;
  institutionName?: string;
  examName?: string;
  academicYear?: string;
  duration?: string;
  totalMarks?: number;
}

const MODERN_COLOR_FN_PREFIXES = ['oklch(', 'oklab(', 'color-mix(', 'lab(', 'lch(', 'light-dark('];
const MODERN_COLOR_REGEX = /\b(oklch|oklab|color-mix|lab|lch|light-dark)\s*\(/i;

let sharedColorCtx: CanvasRenderingContext2D | null = null;
function getColorCtx(): CanvasRenderingContext2D | null {
  if (sharedColorCtx) return sharedColorCtx;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  sharedColorCtx = c.getContext('2d');
  return sharedColorCtx;
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * Pure-JS fallback converter for CSS Color Level 4 oklch(...) and oklab(...) -> rgb()/rgba()
 */
function parseOklabOrOklch(expr: string): string | null {
  const trimmed = expr.trim();
  const isOklch = /^oklch\(/i.test(trimmed);
  const isOklab = /^oklab\(/i.test(trimmed);
  if (!isOklch && !isOklab) return null;

  const inner = trimmed.slice(trimmed.indexOf('(') + 1, trimmed.lastIndexOf(')')).trim();
  const [colorPart, alphaPart] = inner.split('/').map((s) => s.trim());
  const tokens = colorPart.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;

  const parseNum = (tok: string, pctScale = 1): number => {
    if (tok.toLowerCase() === 'none') return 0;
    if (tok.endsWith('%')) return (parseFloat(tok) / 100) * pctScale;
    return parseFloat(tok);
  };

  const L = parseNum(tokens[0], 1);
  let a: number;
  let b: number;

  if (isOklab) {
    a = parseNum(tokens[1], 0.4);
    b = parseNum(tokens[2], 0.4);
  } else {
    const C = parseNum(tokens[1], 0.4);
    const hRaw = tokens[2].toLowerCase();
    let hDeg = 0;
    if (hRaw !== 'none') {
      if (hRaw.endsWith('rad')) hDeg = (parseFloat(hRaw) * 180) / Math.PI;
      else if (hRaw.endsWith('turn')) hDeg = parseFloat(hRaw) * 360;
      else if (hRaw.endsWith('grad')) hDeg = parseFloat(hRaw) * 0.9;
      else hDeg = parseFloat(hRaw);
    }
    const hRad = (hDeg * Math.PI) / 180;
    a = C * Math.cos(hRad);
    b = C * Math.sin(hRad);
  }

  if ([L, a, b].some((n) => Number.isNaN(n))) return null;

  // Oklab -> LMS -> Linear sRGB -> sRGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (c: number) => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const r = clamp255(toSrgb(rLin) * 255);
  const g = clamp255(toSrgb(gLin) * 255);
  const bl = clamp255(toSrgb(bLin) * 255);

  if (alphaPart !== undefined) {
    const alpha = alphaPart.endsWith('%') ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart);
    if (!Number.isNaN(alpha) && alpha < 1) {
      return `rgba(${r}, ${g}, ${bl}, ${Math.max(0, Math.min(1, alpha))})`;
    }
  }
  return `rgb(${r}, ${g}, ${bl})`;
}

/**
 * Converts any CSS color value (including oklch, oklab, color-mix) to safe rgb()/rgba()/#hex for html2canvas
 */
export function cssColorToSafeRgb(value: string, fallback = 'rgb(15, 23, 42)'): string {
  if (!value || !MODERN_COLOR_REGEX.test(value)) {
    return value;
  }

  // Try Canvas 2D parser (resolves oklch/oklab/color-mix in modern Chromium/Firefox/Safari)
  const ctx = getColorCtx();
  if (ctx) {
    ctx.fillStyle = '#010203';
    ctx.fillStyle = value;
    const normalized = ctx.fillStyle;
    if (
      normalized &&
      normalized !== '#010203' &&
      !MODERN_COLOR_REGEX.test(normalized)
    ) {
      return normalized;
    }
  }

  // Pure-JS Oklab/Oklch fallback
  const mathRgb = parseOklabOrOklch(value);
  if (mathRgb) return mathRgb;

  return fallback;
}

/**
 * Scans CSS text and replaces every balanced modern color function call (oklch, oklab, color-mix, etc.)
 * with html2canvas-safe rgb()/rgba() values so html2canvas CSS parsing never throws.
 */
function sanitizeCssModernColors(cssText: string): string {
  if (!cssText || !MODERN_COLOR_REGEX.test(cssText)) return cssText;

  // Strip @property rules that Tailwind v4 emits (unused by html2canvas)
  let cleaned = cssText.replace(/@property\s+[^{]+\{[^}]*\}/g, '');

  const lower = cleaned.toLowerCase();
  let result = '';
  let i = 0;

  while (i < cleaned.length) {
    let matchedPrefix: string | null = null;
    for (const prefix of MODERN_COLOR_FN_PREFIXES) {
      if (lower.startsWith(prefix, i)) {
        // Ensure word boundary before function name
        const prevChar = i > 0 ? cleaned[i - 1] : ' ';
        if (!/[a-zA-Z0-9_-]/.test(prevChar)) {
          matchedPrefix = prefix;
          break;
        }
      }
    }

    if (!matchedPrefix) {
      result += cleaned[i];
      i++;
      continue;
    }

    // Walk balanced parentheses to extract the full function call
    const openIdx = i + matchedPrefix.length - 1;
    let depth = 0;
    let endIdx = openIdx;
    while (endIdx < cleaned.length) {
      if (cleaned[endIdx] === '(') depth++;
      else if (cleaned[endIdx] === ')') {
        depth--;
        if (depth === 0) break;
      }
      endIdx++;
    }

    const expr = cleaned.slice(i, endIdx + 1);
    if (/var\(/i.test(expr) || /currentColor/i.test(expr)) {
      // Dynamic CSS variable inside color-mix/oklch — fall back to neutral slate/transparent safely
      result += /transparent/i.test(expr) ? 'rgba(15, 23, 42, 0.1)' : 'rgb(15, 23, 42)';
    } else {
      result += cssColorToSafeRgb(expr, 'rgb(15, 23, 42)');
    }
    i = endIdx + 1;
  }

  return result;
}

/**
 * Ensures all Google Fonts and KaTeX stylesheets are injected into a target document
 */
export function injectPrintStyles(doc: Document): void {
  const styleId = 'eduquestion-print-styles';
  if (doc.getElementById(styleId)) return;

  const linkGoogle = doc.createElement('link');
  linkGoogle.rel = 'stylesheet';
  linkGoogle.href =
    'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@400;600;700&display=swap';
  doc.head.appendChild(linkGoogle);

  const linkKatex = doc.createElement('link');
  linkKatex.rel = 'stylesheet';
  linkKatex.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  doc.head.appendChild(linkKatex);

  const styleEl = doc.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    @page {
      size: A4 portrait;
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Noto Serif Bengali', 'Hind Siliguri', serif;
      font-size: 10.5pt;
      line-height: 1.5;
    }
    .no-print, .pdf-hide {
      display: none !important;
    }
    .print-a4-page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
    }
    .section-block, .section-container, .page-break-inside-avoid {
      break-inside: auto !important;
      page-break-inside: auto !important;
    }
    .cq-block, .mcq-block, .sq-block {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 10pt;
    }
    .katex {
      font-size: 1.05em !important;
    }
    .katex-display {
      margin: 0.3em 0 !important;
      overflow: visible !important;
    }
  `;
  doc.head.appendChild(styleEl);
}

/**
 * Sanitizes all stylesheets and computed element styles in html2canvas's cloned document
 * so Tailwind CSS v4 oklch()/oklab()/color-mix() colors never break PDF generation.
 */
function prepareClonedDocumentForHtml2Canvas(
  clonedDoc: Document,
  origRoot: HTMLElement,
  clonedRoot: HTMLElement
): void {
  // 1. Convert any same-origin stylesheet <link> (except KaTeX / Google Fonts) into sanitized inline <style>
  const clonedLinks = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
  for (const link of clonedLinks) {
    const href = link.getAttribute('href') || '';
    if (/katex|fonts\.googleapis/i.test(href)) continue;

    // Match loaded rules from live document.styleSheets
    let matchedCss = '';
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (sheet.href && (sheet.href === href || sheet.href.endsWith(href))) {
          matchedCss = Array.from(sheet.cssRules)
            .map((r) => r.cssText)
            .join('\n');
          break;
        }
      } catch {
        // Cross-origin stylesheet — skip reading rules directly
      }
    }

    if (matchedCss) {
      const styleReplacement = clonedDoc.createElement('style');
      styleReplacement.textContent = sanitizeCssModernColors(matchedCss);
      link.parentNode?.replaceChild(styleReplacement, link);
    } else if (!href.startsWith('http')) {
      // Remove unreachable local CSS link that might contain raw oklch if cssRules unavailable
      link.remove();
    }
  }

  // 2. Sanitize every <style> element in clonedDoc (including Tailwind v4 dev style tags)
  const clonedStyles = Array.from(clonedDoc.querySelectorAll('style'));
  for (const styleEl of clonedStyles) {
    if (styleEl.textContent && MODERN_COLOR_REGEX.test(styleEl.textContent)) {
      styleEl.textContent = sanitizeCssModernColors(styleEl.textContent);
    }
  }

  // 3. Unwrap / reveal offscreen or sr-only ancestors of clonedRoot so target is never 1px/clipped
  let ancestor: HTMLElement | null = clonedRoot.parentElement;
  while (ancestor && ancestor !== clonedDoc.body && ancestor !== clonedDoc.documentElement) {
    ancestor.classList.remove('sr-only', 'overflow-hidden', 'overflow-x-hidden');
    ancestor.style.position = 'static';
    ancestor.style.left = 'auto';
    ancestor.style.top = 'auto';
    ancestor.style.width = 'auto';
    ancestor.style.height = 'auto';
    ancestor.style.maxWidth = 'none';
    ancestor.style.maxHeight = 'none';
    ancestor.style.overflow = 'visible';
    ancestor.style.clip = 'auto';
    ancestor.style.clipPath = 'none';
    ancestor.style.opacity = '1';
    ancestor.style.whiteSpace = 'normal';
    ancestor.style.transform = 'none';
    ancestor = ancestor.parentElement;
  }

  // 4. Configure clonedRoot for crisp A4 portrait capture
  clonedRoot.classList.remove('overflow-x-hidden', 'overflow-hidden', 'shadow-xl', 'shadow-md');
  clonedRoot.style.boxShadow = 'none';
  clonedRoot.style.border = 'none';
  clonedRoot.style.width = '794px';
  clonedRoot.style.maxWidth = '794px';
  clonedRoot.style.minHeight = '0';
  clonedRoot.style.height = 'auto';
  clonedRoot.style.overflow = 'visible';
  clonedRoot.style.padding = '28px 36px';
  clonedRoot.style.margin = '0 auto';
  clonedRoot.style.backgroundColor = '#ffffff';
  clonedRoot.style.color = '#0f172a';
  clonedRoot.style.whiteSpace = 'normal';

  // 5. Walk original and cloned DOM trees in parallel to lock computed rgb() colors and hide .no-print / .pdf-hide
  const colorProps: Array<keyof CSSStyleDeclaration> = [
    'color',
    'backgroundColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
    'columnRuleColor',
    'fill',
    'stroke',
  ];

  const origElements: Element[] = [origRoot, ...Array.from(origRoot.querySelectorAll('*'))];
  const clonedElements: Element[] = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll('*'))];
  const count = Math.min(origElements.length, clonedElements.length);

  for (let idx = 0; idx < count; idx++) {
    const origEl = origElements[idx];
    const clonedEl = clonedElements[idx] as HTMLElement | SVGElement;

    if (
      clonedEl.classList?.contains('no-print') ||
      clonedEl.classList?.contains('pdf-hide')
    ) {
      (clonedEl as HTMLElement).style.display = 'none';
      continue;
    }

    const cs = window.getComputedStyle(origEl);
    const styleTarget = (clonedEl as HTMLElement).style;
    if (!styleTarget) continue;

    // Normalize any modern color strings in computed color properties to rgb()/rgba()
    for (const prop of colorProps) {
      const val = cs[prop] as string;
      if (val && MODERN_COLOR_REGEX.test(val)) {
        (styleTarget as any)[prop] = cssColorToSafeRgb(val);
      }
    }

    if (cs.boxShadow && MODERN_COLOR_REGEX.test(cs.boxShadow)) {
      styleTarget.boxShadow = sanitizeCssModernColors(cs.boxShadow);
    }
    if (cs.textShadow && MODERN_COLOR_REGEX.test(cs.textShadow)) {
      styleTarget.textShadow = sanitizeCssModernColors(cs.textShadow);
    }
    if (cs.backgroundImage && MODERN_COLOR_REGEX.test(cs.backgroundImage)) {
      styleTarget.backgroundImage = sanitizeCssModernColors(cs.backgroundImage);
    }

    // Ensure images never taint canvas with bad crossOrigin handling
    if (clonedEl.tagName === 'IMG') {
      const imgEl = clonedEl as HTMLImageElement;
      const src = imgEl.getAttribute('src') || '';
      if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
        imgEl.crossOrigin = 'anonymous';
      }
    }
  }
}

/**
 * Triggers a reliable file download across desktop & mobile browsers
 */
function triggerBlobDownload(blob: Blob, fileName: string): void {
  const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/**
 * Downloads high-fidelity A4 PDF using html2canvas & jsPDF without browser print headers/footers
 */
export async function downloadExamPaperPdf(
  elementId: string,
  fileName = 'Exam_Paper_A4.pdf',
  onProgress?: (status: string) => void
): Promise<void> {
  const target = document.getElementById(elementId);
  if (!target) {
    throw new Error(`Target printable element with id "${elementId}" was not found.`);
  }

  onProgress?.('প্রস্তুতি চলছে: ফন্ট এবং গাণিতিক সমীকরণ লোড হচ্ছে...');

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  await new Promise((resolve) => setTimeout(resolve, 250));

  onProgress?.('উচ্চ রেজোলিউশন ক্যানভাসে রেন্ডার হচ্ছে...');

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 794,
    ignoreElements: (el) =>
      Boolean(el.classList?.contains('no-print') || el.classList?.contains('pdf-hide')),
    onclone: (clonedDoc) => {
      injectPrintStyles(clonedDoc);
      const clonedEl = clonedDoc.getElementById(elementId);
      if (clonedEl) {
        prepareClonedDocumentForHtml2Canvas(clonedDoc, target, clonedEl);
      }
    },
  });

  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error('Rendered PDF canvas is empty.');
  }

  onProgress?.('A4 মাল্টি-পেজ PDF তৈরি হচ্ছে...');

  const imgData = canvas.toDataURL('image/jpeg', 0.96);

  // A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const marginTop = 10;
  const marginBottom = 10;
  const printableHeight = pdfHeight - marginTop - marginBottom;

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let pageIndex = 0;

  while (heightLeft > 2) {
    if (pageIndex > 0) {
      pdf.addPage();
    }
    const yOffset = marginTop - pageIndex * printableHeight;
    pdf.addImage(imgData, 'JPEG', 0, yOffset, imgWidth, imgHeight, undefined, 'FAST');

    // Mask top and bottom margins cleanly so no clipped lines bleed across page breaks
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pdfWidth, marginTop, 'F');
    pdf.rect(0, pdfHeight - marginBottom, pdfWidth, marginBottom, 'F');

    heightLeft -= printableHeight;
    pageIndex++;
  }

  onProgress?.('PDF ডাউনলোড শুরু হচ্ছে...');
  const pdfBlob = pdf.output('blob');
  triggerBlobDownload(pdfBlob, fileName);
  onProgress?.('সফলভাবে ডাউনলোড সম্পন্ন হয়েছে!');
}

let activePrintCleanup: (() => void) | null = null;

/**
 * Prints the exam paper using a dedicated body-level print stage (#edu-print-stage)
 * and synchronous window.print() inside the user gesture so desktop & mobile browsers
 * never block or drop the print dialog, while @page margin: 0 suppresses browser headers/footers.
 */
export function printExamPaperIsolated(elementId: string): void {
  if (activePrintCleanup) {
    activePrintCleanup();
  }

  const target = document.getElementById(elementId);
  if (!target) {
    window.print();
    return;
  }

  // Remove any leftover print stage or legacy iframe
  document.getElementById('edu-print-stage')?.remove();
  document.getElementById('edu-print-iframe')?.remove();

  const stage = document.createElement('div');
  stage.id = 'edu-print-stage';

  const clonedTarget = target.cloneNode(true) as HTMLElement;
  clonedTarget.querySelectorAll('.no-print, .pdf-hide, script').forEach((el) => el.remove());
  clonedTarget.style.width = '100%';
  clonedTarget.style.maxWidth = '100%';
  clonedTarget.style.minHeight = '0';
  clonedTarget.style.height = 'auto';
  clonedTarget.style.overflow = 'visible';
  clonedTarget.style.margin = '0';
  clonedTarget.style.padding = '0';
  clonedTarget.style.border = 'none';
  clonedTarget.style.boxShadow = 'none';
  clonedTarget.style.position = 'relative';
  clonedTarget.style.opacity = '1';

  const table = document.createElement('table');
  table.className = 'print-page-table';

  const thead = document.createElement('thead');
  const theadRow = document.createElement('tr');
  const theadCell = document.createElement('td');
  const topSpacer = document.createElement('div');
  topSpacer.className = 'print-page-spacer-top';
  theadCell.appendChild(topSpacer);
  theadRow.appendChild(theadCell);
  thead.appendChild(theadRow);

  const tbody = document.createElement('tbody');
  const tbodyRow = document.createElement('tr');
  const tbodyCell = document.createElement('td');
  tbodyCell.className = 'print-page-body';
  tbodyCell.appendChild(clonedTarget);
  tbodyRow.appendChild(tbodyCell);
  tbody.appendChild(tbodyRow);

  const tfoot = document.createElement('tfoot');
  const tfootRow = document.createElement('tr');
  const tfootCell = document.createElement('td');
  const bottomSpacer = document.createElement('div');
  bottomSpacer.className = 'print-page-spacer-bottom';
  tfootCell.appendChild(bottomSpacer);
  tfootRow.appendChild(tfootCell);
  tfoot.appendChild(tfootRow);

  table.appendChild(thead);
  table.appendChild(tbody);
  table.appendChild(tfoot);
  stage.appendChild(table);
  document.body.appendChild(stage);

  const originalTitle = document.title;
  document.title = '\u00A0';
  document.body.classList.add('edu-printing-active');

  let cleanedUp = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    document.body.classList.remove('edu-printing-active');
    stage.remove();
    document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
    if (activePrintCleanup === cleanup) {
      activePrintCleanup = null;
    }
  };

  activePrintCleanup = cleanup;
  window.addEventListener('afterprint', cleanup, { once: true });
  fallbackTimer = setTimeout(cleanup, 60000);

  try {
    window.focus();
    window.print();
  } catch (err) {
    console.error('window.print() failed:', err);
    cleanup();
  }
}
