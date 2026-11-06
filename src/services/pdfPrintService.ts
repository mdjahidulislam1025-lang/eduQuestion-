import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QuestionPaper, Question } from '../types';

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
      margin: 12mm 15mm 15mm 15mm;
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
    .print-a4-page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      background: white;
      position: relative;
    }
    .cq-block, .mcq-block, .sq-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 12pt;
    }
    .stimulus-box {
      border-left: 2pt solid #0f172a;
      padding: 4pt 8pt;
      background-color: #f8fafc;
      margin-bottom: 6pt;
    }
    .page-break {
      break-before: page;
      page-break-before: always;
    }
    .watermark-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 52pt;
      font-weight: 800;
      color: rgba(15, 23, 42, 0.06);
      pointer-events: none;
      user-select: none;
      z-index: 0;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .two-column-layout {
      column-count: 2;
      column-gap: 20pt;
      column-rule: 1px solid #e2e8f0;
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
 * Downloads high-fidelity A4 PDF using html2canvas & jsPDF
 */
export async function downloadExamPaperPdf(
  elementId: string,
  fileName = 'EduQuestionAI_ExamPaper.pdf',
  onProgress?: (status: string) => void
): Promise<void> {
  const target = document.getElementById(elementId);
  if (!target) {
    throw new Error(`Target printable element with id "${elementId}" was not found.`);
  }

  onProgress?.('প্রস্তুতি চলছে: ফন্ট এবং গাণিতিক সমীকরণ লোড হচ্ছে...');

  // Wait for web fonts (Noto Serif Bengali, Hind Siliguri) to be ready
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // Brief timeout to ensure MathRenderer KaTeX rendering has completed in DOM
  await new Promise((resolve) => setTimeout(resolve, 350));

  onProgress?.('উচ্চ রেজোলিউশন ক্যানভাসে রেন্ডার হচ্ছে...');

  const canvas = await html2canvas(target, {
    scale: 2, // High resolution for crisp Bengali & English typography
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 794,
    onclone: (clonedDoc) => {
      injectPrintStyles(clonedDoc);
      const clonedEl = clonedDoc.getElementById(elementId);
      if (clonedEl) {
        clonedEl.style.boxShadow = 'none';
        clonedEl.style.border = 'none';
        clonedEl.style.width = '794px';
        clonedEl.style.maxWidth = '794px';
        clonedEl.style.padding = '28px 36px';
        clonedEl.style.margin = '0 auto';
        clonedEl.style.backgroundColor = '#ffffff';
      }
    },
  });

  onProgress?.('A4 মাল্টি-পেজ PDF তৈরি হচ্ছে...');

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

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

  while (heightLeft > 0) {
    if (pageIndex > 0) {
      pdf.addPage();
    }
    const yOffset = marginTop - pageIndex * printableHeight;
    pdf.addImage(imgData, 'JPEG', 0, yOffset, imgWidth, imgHeight, undefined, 'FAST');

    // Mask top and bottom margins with white rectangles so sliced content never bleeds into margins
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pdfWidth, marginTop, 'F');
    pdf.rect(0, pdfHeight - marginBottom, pdfWidth, marginBottom, 'F');

    heightLeft -= printableHeight;
    pageIndex++;
  }

  onProgress?.('PDF ডাউনলোড শুরু হচ্ছে...');
  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  onProgress?.('সফলভাবে ডাউনলোড সম্পন্ন হয়েছে!');
}

/**
 * Prints the exam paper using an isolated clean hidden iframe to prevent outer UI interference
 */
export function printExamPaperIsolated(elementId: string): void {
  const target = document.getElementById(elementId);
  if (!target) {
    window.print();
    return;
  }

  const existingIframe = document.getElementById('edu-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'edu-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return;
  }

  // Collect all active stylesheets & style tags from main document so Tailwind + KaTeX + Fonts work
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n');

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="bn">
      <head>
        <meta charset="utf-8" />
        <title>EduQuestion AI — SSC Question Paper</title>
        ${headStyles}
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
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
          .no-print {
            display: none !important;
          }
          .cq-block, .mcq-block, .sq-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 12pt;
          }
          .page-break {
            break-before: page;
            page-break-before: always;
          }
          .katex {
            font-size: 1.05em !important;
          }
          .katex-display {
            margin: 0.3em 0 !important;
            overflow: visible !important;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${target.outerHTML}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  const triggerPrint = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.print()', e);
        window.print();
      }
    }, 500);
  };

  if (iframe.contentWindow) {
    iframe.contentWindow.onload = triggerPrint;
    // Fallback in case onload already fired
    setTimeout(triggerPrint, 800);
  }
}
