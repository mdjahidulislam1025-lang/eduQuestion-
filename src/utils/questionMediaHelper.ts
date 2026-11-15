/**
 * Compresses an uploaded image file (PNG/JPG/WebP/SVG) so it stays crisp for diagrams
 * while remaining well under Firestore's 1MB document size limit.
 */
export async function compressDiagramImage(file: File): Promise<string> {
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('SVG file reading failed'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Failed to read image file'));
        return;
      }

      // If already very small (< 140 KB), return as-is to keep original lossless crispness
      if (dataUrl.length < 180_000) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 960;
        const MAX_HEIGHT = 720;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // White background in case of transparent PNG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let compressed = canvas.toDataURL('image/jpeg', 0.82);
        // If still large (> 500 KB), reduce quality further
        if (compressed.length > 500_000) {
          compressed = canvas.toDataURL('image/jpeg', 0.65);
        }
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Safely strips copied option prefixes like "ক)", "• ক)", "(ক)", "a)", ") \(10^{-18}\)"
 * WITHOUT breaking decimal numbers like "1.5" or "10⁻¹⁸".
 */
export function cleanOptionPaste(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();
  // Remove leading bullet symbols
  text = text.replace(/^[•\-*]+\s*/, '');
  // Remove stray leading closing paren like ") \(10^{-18}\)" or ") 10⁻¹⁸"
  text = text.replace(/^\)\s*/, '');
  // Remove option labels: ক), খ), গ), ঘ), (ক), a), b), c), d), A), B), C), D)
  text = text.replace(/^[(\[]?\s*[কখগঘabcdABCD]\s*[).:\-\]]\s*/u, '');
  // Remove numeric option markers ONLY when followed by ')' or ':' or whitespace after '.' (never "1.5")
  text = text.replace(/^[(\[]?\s*[1-4১-৪]\s*[):\]]\s*/u, '');
  text = text.replace(/^[1-4১-৪]\.\s+/u, '');
  return text.trim();
}

export interface ParsedQuestionResult {
  questionText: string;
  options: [string, string, string, string];
  correctIdx: number;
  correctAnswer: string;
  explanation: string;
  detectedBoard?: string;
  detectedYear?: string;
  detectedChapter?: string;
}

const BOARD_MAP: Array<[RegExp, string]> = [
  [/ঢাকা|dhaka/i, 'Dhaka Board'],
  [/রাজশাহী|rajshahi/i, 'Rajshahi Board'],
  [/দিনাজপুর|dinajpur/i, 'Dinajpur Board'],
  [/কুমিল্লা|cumilla|comilla/i, 'Cumilla Board'],
  [/চট্টগ্রাম|chattogram|chittagong/i, 'Chattogram Board'],
  [/যশোর|jashore|jessore/i, 'Jashore Board'],
  [/বরিশাল|barishal|barisal/i, 'Barishal Board'],
  [/সিলেট|sylhet/i, 'Sylhet Board'],
  [/ময়মনসিংহ|ময়মনসিংহ|mymensingh/i, 'Mymensingh Board'],
  [/মাদ্রাসা|madrasah/i, 'Madrasah Board'],
  [/কারিগরি|technical/i, 'Technical Board'],
  [/সকল বোর্ড|all board/i, 'All Boards (সকল বোর্ড)'],
];

function bnToEnDigits(str: string): string {
  const map: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  return str.replace(/[০-৯]/g, (d) => map[d] || d);
}

/**
 * Parses copied Bengali/English MCQ block (even with board/year header & explanation)
 */
export function parseSmartQuestionText(raw: string): ParsedQuestionResult {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let questionText = '';
  let optA = '';
  let optB = '';
  let optC = '';
  let optD = '';
  let correctIdx = 0;
  let correctAnswer = '';
  let explanation = '';
  let detectedBoard: string | undefined;
  let detectedYear: string | undefined;
  let detectedChapter: string | undefined;

  for (const line of lines) {
    // Header metadata detection (e.g. "ঢাকা বোর্ড ২০২৫ (১ম অধ্যায় - MCQ)")
    if (/বোর্ড|board/i.test(line) && !questionText) {
      for (const [regex, boardName] of BOARD_MAP) {
        if (regex.test(line)) {
          detectedBoard = boardName;
          break;
        }
      }
      const yearMatch = bnToEnDigits(line).match(/\b(20\d{2})\b/);
      if (yearMatch) {
        detectedYear = yearMatch[1];
      }
      const chapMatch = line.match(/([০-৯\d]+(?:ম|য়|থ|ষ্ঠ|শ)?\s*(?:অধ্যায়|অধ্যায়))/i);
      if (chapMatch) {
        detectedChapter = chapMatch[1].replace('অধ্যায়', 'অধ্যায়');
      }
      continue;
    }

    // Answer line detection
    if (/^[\•\-\*]?\s*(সঠিক\s*উত্তর|উত্তর|Answer|Ans)\s*[\:\-]/i.test(line)) {
      const afterColon = line
        .replace(/^[\•\-\*]?\s*(সঠিক\s*উত্তর|উত্তর|Answer|Ans)\s*[\:\-]\s*/i, '')
        .trim();
      const parenMatch = afterColon.match(/\(([^)]+)\)\s*।?$/);
      if (parenMatch) {
        explanation = parenMatch[1].trim();
      }
      const coreAns = afterColon.replace(/\(([^)]+)\)\s*।?$/, '').trim();
      if (/^[কa1][\)\.\:\s]/i.test(coreAns) || coreAns === 'ক') correctIdx = 0;
      else if (/^[খb2][\)\.\:\s]/i.test(coreAns) || coreAns === 'খ') correctIdx = 1;
      else if (/^[গc3][\)\.\:\s]/i.test(coreAns) || coreAns === 'গ') correctIdx = 2;
      else if (/^[ঘd4][\)\.\:\s]/i.test(coreAns) || coreAns === 'ঘ') correctIdx = 3;
      correctAnswer = cleanOptionPaste(coreAns) || coreAns;
      continue;
    }

    // Option lines
    if (/^[\•\-\*]?\s*[\(\[]?\s*(ক|a)\s*[\)\.\:\-\]]/i.test(line)) {
      optA = cleanOptionPaste(line);
      continue;
    }
    if (/^[\•\-\*]?\s*[\(\[]?\s*(খ|b)\s*[\)\.\:\-\]]/i.test(line)) {
      optB = cleanOptionPaste(line);
      continue;
    }
    if (/^[\•\-\*]?\s*[\(\[]?\s*(গ|c)\s*[\)\.\:\-\]]/i.test(line)) {
      optC = cleanOptionPaste(line);
      continue;
    }
    if (/^[\•\-\*]?\s*[\(\[]?\s*(ঘ|d)\s*[\)\.\:\-\]]/i.test(line)) {
      optD = cleanOptionPaste(line);
      continue;
    }

    // Question stem (strip leading "১. ", "1. ", "১) ", "1) ")
    const cleanedLine = line.replace(/^[০-৯\d]+[\.\)\:\-]\s*/, '').trim();
    if (cleanedLine) {
      questionText = questionText ? `${questionText}\n${cleanedLine}` : cleanedLine;
    }
  }

  return {
    questionText,
    options: [optA, optB, optC, optD],
    correctIdx,
    correctAnswer,
    explanation,
    detectedBoard,
    detectedYear,
    detectedChapter,
  };
}
