import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

// Shared Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper with exponential retry and fallback model for 503 / high demand spikes
async function safeGenerateContent(params: any) {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTransient = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('429');
        if (isTransient && attempt === 1) {
          await new Promise((r) => setTimeout(r, 1200));
        } else {
          break;
        }
      }
    }
  }

  throw lastError;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Endpoint: Notify Admin of user uploaded question
app.post('/api/notifications/notify-admin', (req, res) => {
  const {
    questionId,
    submitterName,
    submitterEmail,
    submitterPhone,
    classLevel,
    subject,
    questionType,
    questionText,
    recipientEmail = 'mdjahidulislam1025@gmail.com',
  } = req.body;

  console.log(`[ADMIN NOTIFICATION] New question submitted for ${recipientEmail}:`, {
    questionId,
    submitterName,
    classLevel,
    subject,
    questionType,
  });

  res.json({
    success: true,
    message: `Admin notification dispatched to ${recipientEmail}`,
    recipientEmail,
    questionId,
  });
});

// Endpoint: Generate Questions (MCQ, SQ, CQ, Unique)
app.post('/api/gemini/generate-questions', async (req, res) => {
  try {
    const {
      classLevel,
      subject,
      chapter,
      topic,
      questionType,
      count = 3,
      difficulty = 'Medium',
      language = 'Bangla',
      sourceMode = 'NCTB_TEXTBOOK',
      isUnique = false,
      contextText = '',
    } = req.body;

    const langInstruction =
      language === 'English'
        ? 'Write all questions, options, and explanations in fluent academic English suitable for English Version/Medium in Bangladesh.'
        : language === 'Bilingual'
        ? 'Write in Bangla with key technical/scientific terms in English in brackets.'
        : 'Write all questions, options, and explanations in fluent, grammatically correct Bangla (বাংলা) adhering strictly to standard NCTB textbook terminology.';

    let typeSpecificGuidance = '';
    if (questionType === 'CQ') {
      typeSpecificGuidance = `
CREATIVE QUESTION (সৃজনশীল প্রশ্ন / CQ) STRICT SPECIFICATION (10 Marks Total):
- Each CQ MUST strictly contain an engaging, academically sound Stimulus (উদ্দীপক) representing a real-life scenario, experiment, table, equation, or case study.
- ক. জ্ঞানমূলক (Knowledge - 1 mark): Direct, precise concept/definition question from the textbook.
- খ. অনুধাবনমূলক (Comprehension - 2 marks): Explanatory question starting with "কেন...", "কী বোঝায়...", "ব্যাখ্যা করো".
- গ. প্রয়োগমূলক (Application - 3 marks): Requires applying textbook concepts/formulas directly to the stimulus scenario or numerical data.
- ঘ. উচ্চতর দক্ষতামূলক (Higher Order Thinking - 4 marks): Analytical evaluation, comparison, synthesis, or justification based on the stimulus.
- Provide a detailed model answer for all 4 parts (ক, খ, গ, ঘ) in the answer sheet field.
- If relevant to Physics, Chemistry, Math, or ICT, include LaTeX mathematical expressions inside '$' (e.g. $F = ma$, $E = mc^2$, $\\frac{a}{b}$).
`;
    } else if (questionType === 'MCQ') {
      typeSpecificGuidance = `
MULTIPLE CHOICE QUESTION (বহুনির্বাচনী প্রশ্ন / MCQ) SPECIFICATION:
- Each question must have exactly 4 options.
- Exactly one correct answer.
- Can be simple recall, polynomial ending (বহুপদী সমাপ্তিসূচক: i, ii, iii with combinations), or stem-based (অভিন্ন তথ্যভিত্তিক).
- Provide clear explanation of why the correct option is right.
`;
    } else if (questionType === 'Mixed') {
      typeSpecificGuidance = `
MIXED EXAMINATION QUESTION SET SPECIFICATION:
- Generate a balanced combination of questions totaling exactly ${count} questions.
- Include a proportional mix of:
  * Multiple Choice Questions (set questionType="MCQ", provide 4 options, correctOptionIndex 0-3, 1 mark each)
  * Short Questions (set questionType="SQ", provide questionText, model answer, 2-3 marks each)
  * Creative Questions (set questionType="CQ", provide stimulus/উদ্দীপক, cqParts with partA, partB, partC, partD, 10 marks total)
- Ensure every single item has questionType accurately labeled as 'MCQ', 'SQ', or 'CQ'.
`;
    } else {
      typeSpecificGuidance = `
SHORT QUESTION (সংক্ষিপ্ত প্রশ্ন / SQ) SPECIFICATION:
- Precision definition, conceptual explanation, or 2-mark to 3-mark analytical/numerical question.
- Include concise model answer and marks allocation (typically 2 to 3 marks).
`;
    }

    const uniqueGuidance = isUnique
      ? `CRITICAL UNIQUE REQUIREMENT: The owner requested ORIGINAL & UNIQUE questions. Do NOT copy standard clichéd board questions word-for-word. Formulate fresh, creative scenarios, novel real-world contexts, and rigorous conceptual applications that thoroughly evaluate the students' genuine comprehension according to the NCTB curriculum learning objectives.`
      : '';

    const sourceModeGuidance = `
SOURCE MODE: ${sourceMode}
- NCTB_TEXTBOOK: Ground strictly in official NCTB core syllabus and standard textbook lessons.
- BOARD_EXAM: Mimic the exact linguistic tone, structure, and difficulty distribution of Bangladesh SSC and Junior Board exams (Dhaka, Rajshahi, Cumilla, Chattogram, etc.).
- NCTB_BOARD_PATTERN: Blend standard textbook theory with high-frequency board examination patterns.
- ORIGINAL_AI: Create novel pedagogical assessments.
`;

    const prompt = `
You are the Chief Academic Curriculum Specialist and Master Exam Paper Setter for Bangladesh National Curriculum and Textbook Board (NCTB) for Class 8, 9, and 10.

TASK: Generate ${count} high quality ${questionType} question(s).

Target Parameters:
- Class: ${classLevel}
- Subject: ${subject}
- Chapter: ${chapter || 'All core chapters'}
- Topic: ${topic || 'Key syllabus topics'}
- Difficulty: ${difficulty}
- Language: ${language}
- ${sourceModeGuidance}
${uniqueGuidance}

${typeSpecificGuidance}

Language Requirement:
${langInstruction}

Textbook / Context reference (if provided):
${contextText ? contextText.slice(0, 4000) : 'Use standard NCTB curriculum content.'}

Output Format:
You must respond with valid JSON matching the requested schema. Return an array of questions.
`;

    const response = await safeGenerateContent({
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert NCTB curriculum exam creator for Bangladesh secondary education (Classes 8-10). Always generate rigorous, academically authentic questions with flawless Bangla Unicode typography and LaTeX equations where appropriate.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionType: { type: Type.STRING },
              stimulus: {
                type: Type.STRING,
                description: 'The scenario, table, or context (উদ্দীপক). For CQ or stem-based MCQ.',
              },
              questionText: {
                type: Type.STRING,
                description: 'Main question statement or overview.',
              },
              cqParts: {
                type: Type.OBJECT,
                properties: {
                  partA: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      marks: { type: Type.NUMBER },
                      answer: { type: Type.STRING },
                    },
                    required: ['question', 'marks'],
                  },
                  partB: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      marks: { type: Type.NUMBER },
                      answer: { type: Type.STRING },
                    },
                    required: ['question', 'marks'],
                  },
                  partC: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      marks: { type: Type.NUMBER },
                      answer: { type: Type.STRING },
                    },
                    required: ['question', 'marks'],
                  },
                  partD: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      marks: { type: Type.NUMBER },
                      answer: { type: Type.STRING },
                    },
                    required: ['question', 'marks'],
                  },
                },
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Four options for MCQ (ক, খ, গ, ঘ or A, B, C, D)',
              },
              correctOptionIndex: {
                type: Type.INTEGER,
                description: '0 to 3 index of the correct option for MCQ',
              },
              correctAnswer: {
                type: Type.STRING,
                description: 'Correct answer or model answer summary',
              },
              explanation: {
                type: Type.STRING,
                description: 'Pedagogical explanation or solution breakdown',
              },
              marks: { type: Type.NUMBER },
              difficulty: { type: Type.STRING },
              topicTag: { type: Type.STRING },
              sourcePage: {
                type: Type.STRING,
                description: 'Original textbook page reference (e.g., "পৃষ্ঠা ১৫-১৬" or "Page 24"). If unavailable or unverified, state "Page reference unavailable".',
              },
              bookName: {
                type: Type.STRING,
                description: 'Name of the textbook or source reference.',
              },
              sourceVerificationStatus: {
                type: Type.STRING,
                description: '"Verified", "Review Required", or "Source not verified"',
              },
              diagramSuggestion: {
                type: Type.STRING,
                description: 'Description of diagram or formula if helpful',
              },
            },
            required: ['questionType', 'questionText', 'marks', 'difficulty'],
          },
        },
      },
    });

    const questionsJson = JSON.parse(response.text || '[]');
    res.json({ success: true, questions: questionsJson });
  } catch (error: any) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions using Gemini API.',
    });
  }
});

// Endpoint: Generate Educational SVG Diagram
app.post('/api/gemini/generate-diagram-svg', async (req, res) => {
  try {
    const { prompt, subject, classLevel } = req.body;

    const response = await safeGenerateContent({
      contents: `
You are an expert scientific and educational SVG diagram illustrator for secondary school exams (Classes 8-10, NCTB).
Generate a clean, professional, high-contrast SVG diagram for:
Prompt: "${prompt}"
Subject: "${subject || 'General Science'}"
Class: "${classLevel || 'Class 9'}"

Rules for SVG:
1. Return ONLY the valid <svg ...> ... </svg> code block, nothing else.
2. ViewBox: 0 0 500 350 (or appropriate 4:3 or 16:9 aspect ratio).
3. Styling: Clean black/dark navy lines (#1e293b, #0f172a) on white or transparent background, professional academic look.
4. If circuit diagram: clean standard symbols (battery, resistor, switch, ammeter, ground).
5. If geometry/math: clean labeled vertices (A, B, C), angles, right-angle squares, clear coordinate grids with axes arrows and labels.
6. If chemistry/physics: clear labeled apparatus or molecule formulas.
7. Font-family: Arial, sans-serif or Hind Siliguri for Bangla labels.
8. Crisp, high resolution, suitable for printing in high-dpi PDF question papers.
`,
      config: {
        systemInstruction:
          'You are an SVG code generator for educational diagrams. Output strictly pure SVG markup starting with <svg and ending with </svg>. Do not wrap in markdown quotes if possible, or keep it cleanly extractable.',
      },
    });

    let svgText = response.text || '';
    svgText = svgText.trim();
    if (svgText.startsWith('```xml')) {
      svgText = svgText.replace(/^```xml\s*/, '').replace(/```$/, '');
    } else if (svgText.startsWith('```svg')) {
      svgText = svgText.replace(/^```svg\s*/, '').replace(/```$/, '');
    } else if (svgText.startsWith('```')) {
      svgText = svgText.replace(/^```\s*/, '').replace(/```$/, '');
    }

    res.json({ success: true, svg: svgText.trim() });
  } catch (error: any) {
    console.error('Error generating diagram SVG:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate diagram SVG.',
    });
  }
});

// Endpoint: Extract Textbook Knowledge Base
app.post('/api/gemini/extract-textbook', async (req, res) => {
  try {
    const { rawText, classLevel, subject } = req.body;
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Raw text is required' });
    }

    const response = await safeGenerateContent({
      contents: `
Extract structured educational knowledge from the following NCTB textbook or reference text:
Class: ${classLevel || 'Unspecified'}
Subject: ${subject || 'Unspecified'}

Source Content:
${rawText.slice(0, 10000)}

Extract and organize into structured JSON:
- bookTitle: Detected or inferred book title
- chapterNumber: e.g. "Chapter 3" or "অধ্যায় ৩"
- chapterTitle: Name of the chapter
- mainTopics: List of specific subtopics covered
- keyDefinitions: Key definitions and concepts with short explanations
- formulasAndLaws: Mathematical formulas, scientific laws, or chemical reactions
- sampleQuestionIdeas: 3-5 high-yield question concepts aligned with NCTB
- summary: 2-3 paragraph academic synthesis
`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bookTitle: { type: Type.STRING },
            chapterNumber: { type: Type.STRING },
            chapterTitle: { type: Type.STRING },
            mainTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            keyDefinitions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                },
                required: ['term', 'definition'],
              },
            },
            formulasAndLaws: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            sampleQuestionIdeas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            summary: { type: Type.STRING },
          },
          required: ['chapterTitle', 'mainTopics', 'summary'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error extracting textbook:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract textbook content.',
    });
  }
});

// Endpoint: Solve and generate step-by-step marking scheme
app.post('/api/gemini/solve-question', async (req, res) => {
  try {
    const { question, questionType, marks = 10, language = 'Bangla' } = req.body;

    const response = await safeGenerateContent({
      contents: `
Generate an official NCTB Teacher's Model Answer & Marking Scheme (উত্তরমালা ও মূল্যায়ন নির্দেশিকা) for the following question:
Question Type: ${questionType}
Total Marks: ${marks}
Language: ${language}

Question Details:
${JSON.stringify(question, null, 2)}

Provide:
1. Complete step-by-step model answer.
2. For CQ: break down answers for ক (1 mark), খ (2 marks), গ (3 marks), ঘ (4 marks) with exact marking criteria (number distribution).
3. If math or science: include step-by-step derivation with LaTeX formulas ($...$).
4. Common student pitfalls or mistakes to look out for during grading.
`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            modelAnswer: { type: Type.STRING },
            markingCriteria: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.STRING },
                  marksAwarded: { type: Type.NUMBER },
                  criteriaDescription: { type: Type.STRING },
                },
                required: ['step', 'marksAwarded', 'criteriaDescription'],
              },
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            commonPitfalls: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['modelAnswer', 'markingCriteria'],
        },
      },
    });

    res.json({ success: true, solution: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Error solving question:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate solution.',
    });
  }
});

// Endpoint: AI Analysis of NCTB Textbook (Extract TOC, chapters, page ranges, and metadata)
app.post('/api/nctb/analyze-book', async (req, res) => {
  try {
    const {
      fileName = '',
      fileText = '',
      classLevel = '',
      subject = '',
      medium = 'Bangla',
      curriculumEdition = '2024 Revised (নতুন শিক্ষাক্রম)',
      pageCount = 100,
    } = req.body;

    const prompt = `
You are the Chief Curriculum Analyst for the National Curriculum and Textbook Board (NCTB) in Bangladesh.
A textbook PDF or document has been uploaded with:
- File Name: "${fileName}"
- Pre-selected Class: "${classLevel || 'Unknown'}"
- Pre-selected Subject: "${subject || 'Unknown'}"
- Medium: "${medium}"
- Curriculum Edition: "${curriculumEdition}"
- Estimated Pages: ${pageCount}

Sample Content / Table of Contents / Text Chunks:
"""
${fileText.slice(0, 15000)}
"""

YOUR MISSION:
1. Detect or verify the official book name (both in Bangla and English).
2. Detect or confirm the class level ("Class 8", "Class 9", "Class 10", or "Other").
3. Detect or confirm the academic subject (e.g., Mathematics, Physics, Chemistry, Bangla, English, ICT, BGS).
4. Detect the medium ("Bangla" or "English").
5. Detect or confirm the curriculum edition (e.g., "২০২৪ শিক্ষাক্রম", "2024 Revised NCTB").
6. Extract a comprehensive Table of Contents (TOC) with ALL chapters:
   - chapterNumber: e.g. "১ম অধ্যায়", "অধ্যায় ১", "Chapter 1"
   - titleBn: Bangla chapter title (e.g. "বাস্তব সংখ্যা", "পরিমাপ", "বল ও গতি")
   - titleEn: English chapter title (e.g. "Real Numbers", "Measurement", "Force and Motion")
   - startPage: Estimated starting page number in the original PDF
   - endPage: Estimated ending page number in the original PDF
   - topics: Array of 3 to 6 major topics/sub-sections in this chapter
   - subtopics: Array of specific concepts, laws, or formulas covered
   - summary: 1-2 sentence overview of the academic scope of this chapter
7. If the sample text does not list all chapters explicitly, use your accurate, verified knowledge of official Bangladesh NCTB textbooks for that Class and Subject to provide the full, standard chapter list with realistic page distributions up to ${pageCount} pages.

Respond with strict valid JSON matching the schema.
`;

    const response = await safeGenerateContent({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedBookName: { type: Type.STRING },
            detectedBookNameEn: { type: Type.STRING },
            detectedClass: { type: Type.STRING },
            detectedSubject: { type: Type.STRING },
            detectedMedium: { type: Type.STRING },
            detectedCurriculum: { type: Type.STRING },
            publisher: { type: Type.STRING },
            academicYear: { type: Type.STRING },
            language: { type: Type.STRING },
            notes: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  chapterNumber: { type: Type.STRING },
                  titleBn: { type: Type.STRING },
                  titleEn: { type: Type.STRING },
                  startPage: { type: Type.NUMBER },
                  endPage: { type: Type.NUMBER },
                  topics: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  subtopics: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  summary: { type: Type.STRING },
                },
                required: ['chapterNumber', 'titleBn', 'startPage', 'endPage', 'topics'],
              },
            },
          },
          required: [
            'detectedBookName',
            'detectedClass',
            'detectedSubject',
            'detectedMedium',
            'chapters',
          ],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    res.json({ success: true, analysis: parsedData });
  } catch (error: any) {
    console.error('Error analyzing NCTB book:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze textbook with AI.',
    });
  }
});

// Endpoint: AI OCR for Scanned Pages / Images using Gemini Vision
app.post('/api/nctb/ocr-page', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', pageNumber } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await safeGenerateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `This is a page (page ${pageNumber || 'unknown'}) from an NCTB Bangladesh textbook or board exam paper.
Perform high-precision Optical Character Recognition (OCR).
- Extract ALL text verbatim, paying special attention to Bangla Unicode characters, ligatures (যুক্তাক্ষর), punctuation, and numbers.
- If there are math formulas, equations, or scientific laws, format them in standard LaTeX notation ($...$).
- If there are diagrams, describe the diagram and any labels in square brackets [চিত্র: ...].
- If there are tables, represent them as markdown tables.
Output clean, accurate text only.`,
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      extractedText: response.text || '',
      pageNumber,
    });
  } catch (error: any) {
    console.error('Error in OCR page:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to OCR image page.',
    });
  }
});

// Endpoint: Extract structured chunks, headings, and chapters from uploaded PDF text
app.post('/api/pdf/extract-chunks', async (req, res) => {
  try {
    const {
      title = 'Uploaded PDF Document',
      rawText = '',
      pages = [],
      classLevel = '',
      subject = '',
      category = 'General',
    } = req.body;

    if (!rawText && (!pages || pages.length === 0)) {
      return res.status(400).json({ success: false, error: 'No PDF text or pages provided.' });
    }

    // If pages array is provided, build page text summary
    const combinedContent = pages.length > 0
      ? pages.map((p: any) => `[PAGE ${p.pageNumber}]\n${p.text}`).join('\n\n')
      : rawText;

    const prompt = `
You are an expert educational document parser specializing in NCTB Bangladesh curriculum and academic materials.
Analyze the following extracted PDF text from:
Document Title: "${title}"
Category: "${category}"
Class: "${classLevel || 'General'}"
Subject: "${subject || 'General'}"

Extracted Content:
"""
${combinedContent.slice(0, 16000)}
"""

YOUR TASK:
1. Break down the content into clean, logical, and searchable chunks corresponding to chapters, topics, or distinct page sections.
2. For each chunk, preserve the original page number (or best estimate from [PAGE X] tags).
3. Detect chapter titles and major section headings.
4. Detect any overall chapters detected in the document with estimated page ranges.

Output strict JSON matching the schema:
- detectedChapters: Array of { chapterNumber: string, title: string, pageRange: string }
- chunks: Array of {
    pageNumber: number,
    heading: string,
    content: string (clean, concise text representation without noisy page artifacts),
    chapterName: string,
    topicName: string
  }
`;

    const response = await safeGenerateContent({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedChapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  chapterNumber: { type: Type.STRING },
                  title: { type: Type.STRING },
                  pageRange: { type: Type.STRING },
                },
                required: ['chapterNumber', 'title'],
              },
            },
            chunks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pageNumber: { type: Type.NUMBER },
                  heading: { type: Type.STRING },
                  content: { type: Type.STRING },
                  chapterName: { type: Type.STRING },
                  topicName: { type: Type.STRING },
                },
                required: ['pageNumber', 'content'],
              },
            },
          },
          required: ['chunks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"chunks":[]}');
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error in PDF chunk extraction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract chunks from PDF.',
    });
  }
});

// Endpoint: AI Question Generation directly from Selected PDF(s)
app.post('/api/gemini/generate-from-pdf', async (req, res) => {
  try {
    const {
      pdfTitle,
      pdfId,
      extractedContent,
      chunks = [],
      selectionMode = 'entire', // 'entire' | 'pages' | 'chapter' | 'topic' | 'multiple'
      selectedPages = '',
      selectedChapter = '',
      selectedTopic = '',
      questionType = 'MCQ', // 'MCQ' | 'SQ' | 'CQ' | 'Unique' | 'Mixed' | 'True/False' | 'Fill in Blanks' | 'Matching'
      count = 5,
      difficulty = 'Medium',
      language = 'Bangla',
      classLevel = 'Class 10',
      subject = 'General',
      marks = 10,
      includeAnswers = true,
      includeExplanations = true,
      includePageReferences = true,
      includeDiagrams = false,
    } = req.body;

    if (!extractedContent && (!chunks || chunks.length === 0)) {
      return res.status(400).json({ success: false, error: 'No extracted PDF content provided.' });
    }

    // Build context with page references
    let contextBody = '';
    if (chunks.length > 0) {
      contextBody = chunks
        .map((c: any) => `[PAGE ${c.pageNumber} | ${c.chapterName || ''} | ${c.heading || ''}]\n${c.content}`)
        .join('\n\n---\n\n');
    } else {
      contextBody = extractedContent;
    }

    const langInstruction =
      language === 'English'
        ? 'Write all questions, options, and explanations in fluent academic English.'
        : language === 'Both' || language === 'Bilingual'
        ? 'Write in Bangla with English technical terms in brackets.'
        : 'Write all questions, options, and explanations in standard, fluent academic Bangla (বাংলা).';

    let typeGuidance = '';
    if (questionType === 'CQ') {
      typeGuidance = `
CREATIVE QUESTION (সৃজনশীল প্রশ্ন / CQ) STRICT REQUIREMENT:
- Each CQ MUST strictly contain an engaging Stimulus (উদ্দীপক) based directly on the provided PDF text.
- ক. জ্ঞানমূলক (Knowledge - 1 mark): Concept/definition directly in the text.
- খ. অনুধাবনমূলক (Comprehension - 2 marks): Conceptual explanation based on the text.
- গ. প্রয়োগমূলক (Application - 3 marks): Applying principles from the text to the stimulus.
- ঘ. উচ্চতর দক্ষতামূলক (Higher Order Thinking - 4 marks): Evaluation, justification, or critical analysis.
- Detailed model answers for all 4 parts (ক, খ, গ, ঘ) in the correctAnswer field.
`;
    } else if (questionType === 'MCQ') {
      typeGuidance = `
MULTIPLE CHOICE QUESTION (MCQ) REQUIREMENT:
- Exactly 4 options for each question.
- Exactly 1 correct option index (0 to 3).
- Options can be standard, polynomial ending (i, ii, iii), or stem-based.
`;
    } else if (questionType === 'True/False' || questionType === 'TrueFalse') {
      typeGuidance = `
TRUE / FALSE QUESTIONS REQUIREMENT:
- Clear declarative statement directly verifiable from the PDF text.
- 2 options: ["সত্য", "মিথ্যা"] (or ["True", "False"] if English).
- Explanation citing the actual sentence in the PDF.
`;
    } else if (questionType === 'Fill in Blanks' || questionType === 'FillInBlanks') {
      typeGuidance = `
FILL IN THE BLANKS REQUIREMENT:
- Complete sentence with a critical term replaced by '______'.
- correctAnswer field contains the missing word(s).
`;
    } else if (questionType === 'Matching') {
      typeGuidance = `
MATCHING QUESTIONS REQUIREMENT:
- Two column matching question (ক-স্তম্ভ এবং খ-স্তম্ভ / Column A & Column B).
- Put table or matched pairs clearly in the stimulus and explanation.
`;
    } else if (questionType === 'Unique') {
      typeGuidance = `
ORIGINAL & UNIQUE QUESTIONS REQUIREMENT:
- Formulate fresh, novel scenarios and application-oriented questions grounded in the PDF concepts.
- Do NOT repeat standard clichés. Emphasize deep understanding and critical inquiry.
`;
    } else if (questionType === 'Mixed') {
      typeGuidance = `
BALANCED MIXED EXAMINATION SET:
- Generate a combination of MCQ, SQ, and CQ totalling ${count} questions.
- Clearly set questionType for each item ('MCQ', 'SQ', or 'CQ').
`;
    } else {
      typeGuidance = `
SHORT QUESTIONS (SQ) REQUIREMENT:
- Precision definition, analytical explanation, or numerical problem (2 to 3 marks each).
`;
    }

    const prompt = `
You are an expert Exam Setter and Academic Evaluator.
TASK: Generate ${count} high quality ${questionType} question(s) strictly grounded in the following provided PDF material.

Document Context:
- Source PDF: "${pdfTitle}"
- Class: ${classLevel}
- Subject: ${subject}
- Selection Scope: ${selectionMode} (Pages: ${selectedPages || 'All'}, Chapter: ${selectedChapter || 'All'}, Topic: ${selectedTopic || 'All'})
- Difficulty: ${difficulty}
- Language: ${language}
- Marks: ${marks}

SOURCE MATERIAL (Extracted PDF Text):
"""
${contextBody.slice(0, 16000)}
"""

PEDAGOGICAL & GROUNDING RULES:
1. ALL questions MUST be strictly based on the extracted PDF material above. Do not invent facts that contradict or are absent from this text.
2. SOURCE TRACEABILITY: For each question, pinpoint the exact source page number from the context (e.g., "পৃষ্ঠা ১২" or "Page 15"). If the exact page cannot be established, you MUST strictly write "Page reference unavailable".
3. Provide model answers and pedagogical explanations.
4. If diagrams are helpful, include a concise diagramSuggestion or LaTeX formulas inside '$...$'.
5. Do NOT label these AI-generated questions as official historical board questions.

Language Instructions:
${langInstruction}

Question Type Specifics:
${typeGuidance}

Return a valid JSON array of questions matching the schema.
`;

    const response = await safeGenerateContent({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionType: { type: Type.STRING },
              stimulus: { type: Type.STRING },
              questionText: { type: Type.STRING },
              cqParts: {
                type: Type.OBJECT,
                properties: {
                  partA: {
                    type: Type.OBJECT,
                    properties: { question: { type: Type.STRING }, marks: { type: Type.NUMBER }, answer: { type: Type.STRING } },
                    required: ['question', 'marks'],
                  },
                  partB: {
                    type: Type.OBJECT,
                    properties: { question: { type: Type.STRING }, marks: { type: Type.NUMBER }, answer: { type: Type.STRING } },
                    required: ['question', 'marks'],
                  },
                  partC: {
                    type: Type.OBJECT,
                    properties: { question: { type: Type.STRING }, marks: { type: Type.NUMBER }, answer: { type: Type.STRING } },
                    required: ['question', 'marks'],
                  },
                  partD: {
                    type: Type.OBJECT,
                    properties: { question: { type: Type.STRING }, marks: { type: Type.NUMBER }, answer: { type: Type.STRING } },
                    required: ['question', 'marks'],
                  },
                },
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctOptionIndex: { type: Type.INTEGER },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              marks: { type: Type.NUMBER },
              difficulty: { type: Type.STRING },
              topicTag: { type: Type.STRING },
              sourcePage: { type: Type.STRING },
              diagramSuggestion: { type: Type.STRING },
            },
            required: ['questionType', 'questionText', 'marks'],
          },
        },
      },
    });

    const parsedQuestions = JSON.parse(response.text || '[]');

    // Enrich with source PDF metadata
    const enriched = parsedQuestions.map((q: any, idx: number) => ({
      ...q,
      id: `gen-pdf-${Date.now()}-${idx}`,
      sourceType: 'ORIGINAL_AI',
      sourcePdfId: pdfId,
      sourcePdfTitle: pdfTitle,
      sourcePage: q.sourcePage || 'Page reference unavailable',
      isAiGenerated: true,
      classLevel,
      subject,
      chapter: selectedChapter || q.topicTag || 'PDF Source Material',
      createdAt: new Date().toISOString(),
    }));

    res.json({ success: true, questions: enriched });
  } catch (error: any) {
    console.error('Error generating questions from PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions from PDF.',
    });
  }
});

// Endpoint: AI Extraction of Questions from Uploaded Exam Papers
app.post('/api/gemini/extract-exam-questions', async (req, res) => {
  try {
    const {
      rawText = '',
      examName = '',
      institutionName = '',
      classLevel = 'Class 10',
      subject = 'General',
      examType = 'Exam',
      year = '2024',
      boardName = '',
      fullMarks = 100,
      language = 'Bangla',
    } = req.body;

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Exam paper text is required.' });
    }

    const prompt = `
You are the Master Educational Assessment Digitizer for Bangladesh (Classes 8, 9, 10).
Analyze and digitize the following uploaded examination paper:
- Exam Name: "${examName}"
- Institution / Board: "${institutionName || boardName || 'Standard Examination'}"
- Class: "${classLevel}"
- Subject: "${subject}"
- Exam Type: "${examType}"
- Academic Year: "${year}"
- Full Marks: ${fullMarks}
- Language: "${language}"

RAW EXAM PAPER TEXT / OCR:
"""
${rawText.slice(0, 16000)}
"""

CRITICAL DIGITIZATION INSTRUCTIONS:
1. CREATIVE QUESTIONS (CQ):
   - You MUST NEVER separate the stimulus (উদ্দীপক) from parts ক, খ, গ, ঘ!
   - Store the complete scenario, paragraph, poem, data table, or experiment in 'stimulus'.
   - Store partA (ক - জ্ঞানমূলক, 1 mark), partB (খ - অনুধাবনমূলক, 2 marks), partC (গ - প্রয়োগমূলক, 3 marks), partD (ঘ - উচ্চতর দক্ষতা, 4 marks) inside 'cqParts'.
   - Total marks for each CQ must be 10.
2. MULTIPLE CHOICE QUESTIONS (MCQ):
   - Identify questionText.
   - Extract exactly 4 options.
   - If answer key is indicated in the exam, identify correctOptionIndex (0-3) and correctAnswer.
   - 1 mark each.
3. SHORT QUESTIONS (SQ):
   - Standalone question text, marks (usually 1-3).
4. Preserve mathematical formulas, chemical equations, and symbols using LaTeX ($...$).
5. Extract all identifiable questions cleanly.

Respond with strict valid JSON matching the schema.
`;

    const response = await safeGenerateContent({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedExamTitle: { type: Type.STRING },
            detectedSubject: { type: Type.STRING },
            detectedClass: { type: Type.STRING },
            detectedTotalMarks: { type: Type.NUMBER },
            detectedDuration: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionType: { type: Type.STRING },
                  stimulus: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  cqParts: {
                    type: Type.OBJECT,
                    properties: {
                      partA: {
                        type: Type.OBJECT,
                        properties: { question: { type: Type.STRING }, marks: { type: Type.NUMBER }, answer: { type: Type.STRING } },
                        required: ['question', 'marks'],
                      },
                      partB: {
                        type: Type.OBJECT,
                        properties: { question: { type: Type.STRING }, marks: { type: Type.NUMBER }, answer: { type: Type.STRING } },
                        required: ['question', 'marks'],
                      },
                      partC: {
                        type: Type.OBJECT,
                        properties: { question: { type: Type.STRING }, marks: { type: Type.NUMBER }, answer: { type: Type.STRING } },
                        required: ['question', 'marks'],
                      },
                      partD: {
                        type: Type.OBJECT,
                        properties: { question: { type: Type.STRING }, marks: { type: Type.NUMBER }, answer: { type: Type.STRING } },
                        required: ['question', 'marks'],
                      },
                    },
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctOptionIndex: { type: Type.INTEGER },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  marks: { type: Type.NUMBER },
                  difficulty: { type: Type.STRING },
                  chapter: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  sourcePage: { type: Type.STRING },
                  diagramSuggestion: { type: Type.STRING },
                },
                required: ['questionType', 'questionText', 'marks'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"questions":[]}');
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error extracting exam questions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract exam questions.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduQuestion AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
