import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';
const OWNER_EMAIL = 'mdjahidulislam1025@gmail.com';

// Load Firebase Project ID from firebase-applet-config.json (never hardcoded wrong project)
let FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'kinetic-campus-9qk4z';
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const parsedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (parsedConfig?.projectId) {
      FIREBASE_PROJECT_ID = parsedConfig.projectId;
    }
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json, using fallback projectId:', FIREBASE_PROJECT_ID);
}

// ============================================================================
// 1. SECURITY HEADERS (Iframe-safe for AI Studio preview & Vercel deployment)
// ============================================================================
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Keep Google OAuth popup sign-in working cleanly while isolating cross-origin openers
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Strict JSON body size cap with malformed JSON error handling
app.use(express.json({ limit: '10mb' }));
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON request body.' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Payload exceeds maximum allowed size (10MB).' });
  }
  next(err);
});

// ============================================================================
// 2. CRYPTOGRAPHIC FIREBASE ID TOKEN VERIFICATION (Zero Admin-SDK IAM needed)
// ============================================================================
interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
}

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: Record<string, string> = {};
let certsExpireAt = 0;

async function fetchGooglePublicCerts(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && certsExpireAt > now && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }

  const resp = await fetch(GOOGLE_CERTS_URL);
  if (!resp.ok) {
    throw new Error(`Failed to fetch Firebase public certificates (${resp.status})`);
  }

  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

  const certs = (await resp.json()) as Record<string, string>;
  cachedCerts = certs;
  certsExpireAt = now + Math.max(60, maxAgeSec) * 1000;
  return certs;
}

function decodeBase64Url(str: string): Buffer {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLength), 'base64');
}

async function verifyFirebaseIdToken(idToken: string): Promise<AuthenticatedUser> {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 8192) {
    throw new Error('Malformed token');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT structure');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8'));
  const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8'));

  if (header?.alg !== 'RS256' || typeof header?.kid !== 'string' || !header.kid) {
    throw new Error('Unsupported JWT algorithm or missing key ID');
  }

  let certs = await fetchGooglePublicCerts(false);
  let pemCert = certs[header.kid];
  if (!pemCert) {
    certs = await fetchGooglePublicCerts(true);
    pemCert = certs[header.kid];
  }
  if (!pemCert) {
    throw new Error('Unknown signing key ID');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  const signature = decodeBase64Url(signatureB64);
  const isSignatureValid = verifier.verify(pemCert, signature);
  if (!isSignatureValid) {
    throw new Error('Invalid token signature');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

  if (payload?.aud !== FIREBASE_PROJECT_ID) {
    throw new Error('Token audience mismatch');
  }
  if (payload?.iss !== expectedIssuer) {
    throw new Error('Token issuer mismatch');
  }
  if (typeof payload?.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) {
    throw new Error('Invalid token subject');
  }
  if (typeof payload?.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Token expired');
  }
  if (typeof payload?.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Token issued in the future');
  }
  if (typeof payload?.auth_time !== 'number' || payload.auth_time > nowSec + 300) {
    throw new Error('Invalid auth_time');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : '',
    emailVerified: Boolean(payload.email_verified),
  };
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'অনুমতি নেই। এই ফিচারটি ব্যবহার করতে অনুগ্রহ করে লগইন করুন। (Authentication required)',
      });
    }

    const token = authHeader.slice(7).trim();
    const verifiedUser = await verifyFirebaseIdToken(token);
    req.authUser = verifiedUser;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'আপনার সেশন মেয়াদ শেষ বা টোকেন অবৈধ। দয়া করে আবার লগইন করুন। (Invalid or expired token)',
    });
  }
}

// ============================================================================
// 3. SLIDING-WINDOW IN-MEMORY RATE LIMITER (DDoS & Quota Protection)
// ============================================================================
interface RateBucket {
  timestamps: number[];
}

const rateLimitStores = new Map<string, RateBucket>();

// Periodically prune expired buckets to avoid memory leaks
setInterval(() => {
  const cutoff = Date.now() - 20 * 60 * 1000;
  for (const [key, bucket] of rateLimitStores.entries()) {
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);
    if (bucket.timestamps.length === 0) {
      rateLimitStores.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter(opts: {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
  perUser?: boolean;
}) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    const identity =
      opts.perUser && req.authUser?.uid ? `uid:${req.authUser.uid}` : `ip:${getClientIp(req)}`;
    const bucketKey = `${opts.keyPrefix}:${identity}`;

    let bucket = rateLimitStores.get(bucketKey);
    if (!bucket) {
      bucket = { timestamps: [] };
      rateLimitStores.set(bucketKey, bucket);
    }

    bucket.timestamps = bucket.timestamps.filter((ts) => ts > now - opts.windowMs);

    if (bucket.timestamps.length >= opts.maxRequests) {
      const oldest = bucket.timestamps[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('RateLimit-Limit', String(opts.maxRequests));
      res.setHeader('RateLimit-Remaining', '0');
      return res.status(429).json({
        success: false,
        error: `অতিরিক্ত অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে ${retryAfterSec} সেকেন্ড পর আবার চেষ্টা করুন। (Rate limit exceeded)`,
      });
    }

    bucket.timestamps.push(now);
    res.setHeader('RateLimit-Limit', String(opts.maxRequests));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, opts.maxRequests - bucket.timestamps.length)));
    next();
  };
}

const globalApiLimiter = createRateLimiter({
  keyPrefix: 'global',
  windowMs: 15 * 60 * 1000,
  maxRequests: 150,
  perUser: false,
});

const aiEndpointLimiter = createRateLimiter({
  keyPrefix: 'ai',
  windowMs: 15 * 60 * 1000,
  maxRequests: 35,
  perUser: true,
});

const notificationLimiter = createRateLimiter({
  keyPrefix: 'notif',
  windowMs: 15 * 60 * 1000,
  maxRequests: 12,
  perUser: true,
});

app.use('/api', globalApiLimiter);

// ============================================================================
// 4. INPUT VALIDATION & SANITIZATION HELPERS
// ============================================================================
function safeString(value: unknown, maxLength: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLength);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function safeParseJson<T>(rawText: string | undefined, fallback: T): T {
  if (!rawText || typeof rawText !== 'string') return fallback;
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBracket = cleaned.indexOf('[');
    const firstBrace = cleaned.indexOf('{');
    const startIdx =
      firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace) ? firstBracket : firstBrace;
    if (startIdx >= 0) {
      try {
        return JSON.parse(cleaned.slice(startIdx)) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

function sanitizeSvgServer(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  let svg = rawSvg.trim();
  if (svg.startsWith('```xml')) {
    svg = svg.replace(/^```xml\s*/i, '').replace(/```$/, '').trim();
  } else if (svg.startsWith('```svg')) {
    svg = svg.replace(/^```svg\s*/i, '').replace(/```$/, '').trim();
  } else if (svg.startsWith('```')) {
    svg = svg.replace(/^```\s*/, '').replace(/```$/, '').trim();
  }

  // Extract from <svg to </svg>
  const svgStart = svg.search(/<svg[\s>]/i);
  const svgEnd = svg.toLowerCase().lastIndexOf('</svg>');
  if (svgStart === -1 || svgEnd === -1) {
    return '';
  }
  svg = svg.slice(svgStart, svgEnd + 6);

  // Strip dangerous elements, event handlers, and scriptable URIs
  return svg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<(iframe|object|embed|link|meta|base|applet|audio|video)[^>]*?>([\s\S]*?<\/\1>)?/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|xlink:href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '');
}

function sendSafeServerError(res: Response, logLabel: string, error: any, publicFallback: string) {
  const errMsg = String(error?.message || '');
  console.error(`[API Error - ${logLabel}]`, errMsg);

  if (errMsg.includes('503') || errMsg.includes('high demand')) {
    return res.status(503).json({
      success: false,
      error: 'এআই সার্ভার বর্তমানে ব্যস্ত রয়েছে। কয়েক সেকেন্ড পর আবার চেষ্টা করুন। (Upstream service busy)',
    });
  }
  if (errMsg.includes('429') || errMsg.includes('quota')) {
    return res.status(429).json({
      success: false,
      error: 'API কোটা সাময়িকভাবে পূর্ণ হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
    });
  }

  return res.status(500).json({
    success: false,
    error: publicFallback,
  });
}

// ============================================================================
// 5. SHARED GEMINI CLIENT
// ============================================================================
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function safeGenerateContent(params: any) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Server AI configuration missing');
  }
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

// ============================================================================
// 6. API ROUTES
// ============================================================================

// Public minimal health check endpoint (no sensitive env or internal config leaked)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Endpoint: Notify Admin of user uploaded question (Requires Auth + Strict Recipient Lock)
app.post('/api/notifications/notify-admin', requireAuth, notificationLimiter, (req: AuthenticatedRequest, res) => {
  const questionId = safeString(req.body?.questionId, 128);
  const submitterName = safeString(req.body?.submitterName, 128, 'Educator');
  const submitterEmail = req.authUser?.email || safeString(req.body?.submitterEmail, 256);
  const classLevel = safeString(req.body?.classLevel, 64, 'SSC');
  const subject = safeString(req.body?.subject, 128);
  const questionType = safeString(req.body?.questionType, 32);

  if (!questionId || !subject || !questionType) {
    return res.status(400).json({
      success: false,
      error: 'questionId, subject, and questionType are required.',
    });
  }

  // Always lock admin notification target to OWNER_EMAIL (prevents email/relay spoofing)
  console.log(`[ADMIN NOTIFICATION] Question ${questionId} submitted by ${req.authUser?.uid}`, {
    submitterName,
    submitterEmail,
    classLevel,
    subject,
    questionType,
  });

  res.json({
    success: true,
    message: `Admin notification recorded for ${OWNER_EMAIL}`,
    recipientEmail: OWNER_EMAIL,
    questionId,
  });
});

// Endpoint: Generate Questions (MCQ, SQ, CQ, Unique)
app.post('/api/gemini/generate-questions', requireAuth, aiEndpointLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const classLevel = safeString(req.body?.classLevel, 64, 'Class 10');
    const subject = safeString(req.body?.subject, 128);
    const chapter = safeString(req.body?.chapter, 256);
    const topic = safeString(req.body?.topic, 256);
    const questionType = safeString(req.body?.questionType, 32, 'MCQ');
    const count = clampNumber(req.body?.count, 1, 15, 3);
    const difficulty = safeString(req.body?.difficulty, 32, 'Medium');
    const language = safeString(req.body?.language, 32, 'Bangla');
    const sourceMode = safeString(req.body?.sourceMode, 64, 'NCTB_TEXTBOOK');
    const isUnique = Boolean(req.body?.isUnique);
    const contextText = safeString(req.body?.contextText, 6000, '');

    if (!subject) {
      return res.status(400).json({ success: false, error: 'Subject is required.' });
    }

    const langInstruction =
      language === 'English'
        ? 'Write all questions, options, and explanations in fluent academic English suitable for English Version/Medium in Bangladesh.'
        : language === 'Bilingual'
        ? 'Write in Bangla with key technical/scientific terms in English in brackets.'
        : 'Write all questions, options, and explanations in fluent, grammatically correct Bangla (বাংলা) adhering strictly to standard NCTB textbook terminology.';

    const isMath = /math|গণিত/i.test(subject);

    let typeSpecificGuidance = '';
    if (questionType === 'CQ') {
      typeSpecificGuidance = isMath
        ? `
MATH CREATIVE QUESTION (গণিত সৃজনশীল প্রশ্ন / CQ) STRICT SPECIFICATION (3 Questions Only — Marks: 2, 4, 4 = 10 Total):
- Each Math CQ MUST strictly contain a mathematical Stimulus (উদ্দীপক: equations, geometric properties, algebraic relations, trigonometry, sets, or data).
- Generate ONLY 3 sub-questions (ক, খ, গ). DO NOT generate partD (ঘ)!
- ক (Part A - 2 marks): Short mathematical calculation, value determination, or simple demonstration.
- খ (Part B - 4 marks): Intermediate mathematical proof, algebraic/geometric derivation, or problem solving.
- গ (Part C - 4 marks): Comprehensive application, synthesis, or multi-step mathematical proof.
- Strict mark distribution: partA.marks = 2, partB.marks = 4, partC.marks = 4 (Total = 10). Omit partD completely.
- Provide detailed step-by-step LaTeX solutions inside '$' (e.g. $x^2 + \\frac{1}{x^2}$, $\\sin\\theta$).
`
        : `
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
  * Creative Questions (set questionType="CQ", provide stimulus/উদ্দীপক, ${
    isMath
      ? 'cqParts with ONLY 3 parts: partA (2 marks), partB (4 marks), partC (4 marks) — DO NOT include partD, 10 marks total'
      : 'cqParts with partA (1), partB (2), partC (3), partD (4), 10 marks total'
  })
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
                description:
                  'Original textbook page reference (e.g., "পৃষ্ঠা ১৫-১৬" or "Page 24"). If unavailable or unverified, state "Page reference unavailable".',
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

    const questionsJson = safeParseJson<any[]>(response.text, []);
    const normalizedQuestions = Array.isArray(questionsJson)
      ? questionsJson.map((q: any) => {
          if (isMath && (q.questionType === 'CQ' || q.cqParts)) {
            const cq = q.cqParts || {};
            const cleanedCq = {
              partA: { ...(cq.partA || { question: 'ক. প্রশ্ন' }), marks: 2 },
              partB: { ...(cq.partB || { question: 'খ. প্রশ্ন' }), marks: 4 },
              partC: { ...(cq.partC || { question: 'গ. প্রশ্ন' }), marks: 4 },
            };
            return { ...q, marks: 10, cqParts: cleanedCq };
          }
          return q;
        })
      : [];
    res.json({ success: true, questions: normalizedQuestions });
  } catch (error: any) {
    return sendSafeServerError(
      res,
      'generate-questions',
      error,
      'প্রশ্ন তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন। (Failed to generate questions)'
    );
  }
});

// Endpoint: Generate Educational SVG Diagram (with server-side XSS sanitization)
app.post('/api/gemini/generate-diagram-svg', requireAuth, aiEndpointLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const prompt = safeString(req.body?.prompt, 1000);
    const subject = safeString(req.body?.subject, 128, 'General Science');
    const classLevel = safeString(req.body?.classLevel, 64, 'Class 9');

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Diagram prompt is required.' });
    }

    const response = await safeGenerateContent({
      contents: `
You are an expert scientific and educational SVG diagram illustrator for secondary school exams (Classes 8-10, NCTB).
Generate a clean, professional, high-contrast SVG diagram for:
Prompt: "${prompt}"
Subject: "${subject}"
Class: "${classLevel}"

Rules for SVG:
1. Return ONLY the valid <svg ...> ... </svg> code block, nothing else.
2. ViewBox: 0 0 500 350 (or appropriate 4:3 or 16:9 aspect ratio).
3. Styling: Clean black/dark navy lines (#1e293b, #0f172a) on white or transparent background, professional academic look.
4. If circuit diagram: clean standard symbols (battery, resistor, switch, ammeter, ground).
5. If geometry/math: clean labeled vertices (A, B, C), angles, right-angle squares, clear coordinate grids with axes arrows and labels.
6. If chemistry/physics: clear labeled apparatus or molecule formulas.
7. Font-family: Arial, sans-serif or Hind Siliguri for Bangla labels.
8. Never include <script>, <foreignObject>, external URLs, or inline JavaScript event handlers.
`,
      config: {
        systemInstruction:
          'You are an SVG code generator for educational diagrams. Output strictly pure static SVG markup starting with <svg and ending with </svg>. Never include scripts or event attributes.',
      },
    });

    const sanitizedSvg = sanitizeSvgServer(response.text || '');
    if (!sanitizedSvg) {
      return res.status(502).json({
        success: false,
        error: 'Generated diagram was invalid or empty. Please refine your prompt.',
      });
    }

    res.json({ success: true, svg: sanitizedSvg });
  } catch (error: any) {
    return sendSafeServerError(
      res,
      'generate-diagram-svg',
      error,
      'ডায়াগ্রাম তৈরি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন। (Failed to generate diagram SVG)'
    );
  }
});

// Endpoint: Extract Textbook Knowledge Base
app.post('/api/gemini/extract-textbook', requireAuth, aiEndpointLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const rawText = safeString(req.body?.rawText, 20000);
    const classLevel = safeString(req.body?.classLevel, 64, 'Unspecified');
    const subject = safeString(req.body?.subject, 128, 'Unspecified');

    if (!rawText) {
      return res.status(400).json({ success: false, error: 'Raw text is required' });
    }

    const response = await safeGenerateContent({
      contents: `
Extract structured educational knowledge from the following NCTB textbook or reference text:
Class: ${classLevel}
Subject: ${subject}

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

    const parsed = safeParseJson<Record<string, any>>(response.text, {});
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    return sendSafeServerError(
      res,
      'extract-textbook',
      error,
      'পাঠ্যবইয়ের তথ্য বিশ্লেষণ করা যায়নি। (Failed to extract textbook content)'
    );
  }
});

// Endpoint: Solve and generate step-by-step marking scheme
app.post('/api/gemini/solve-question', requireAuth, aiEndpointLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const question = req.body?.question;
    if (!question || typeof question !== 'object') {
      return res.status(400).json({ success: false, error: 'Question object is required.' });
    }

    const questionSerialized = JSON.stringify(question).slice(0, 12000);
    const questionType = safeString(req.body?.questionType, 32, 'SQ');
    const marks = clampNumber(req.body?.marks, 1, 100, 10);
    const language = safeString(req.body?.language, 32, 'Bangla');
    const isMathSolve = /math|গণিত/i.test(safeString(question?.subject, 128));

    const response = await safeGenerateContent({
      contents: `
Generate an official NCTB Teacher's Model Answer & Marking Scheme (উত্তরমালা ও মূল্যায়ন নির্দেশিকা) for the following question:
Question Type: ${questionType}
Total Marks: ${marks}
Language: ${language}

Question Details:
${questionSerialized}

Provide:
1. Complete step-by-step model answer.
2. For CQ: ${
        isMathSolve
          ? 'break down answers for ONLY 3 parts: ক (2 marks), খ (4 marks), গ (4 marks) — total 10 marks.'
          : 'break down answers for ক (1 mark), খ (2 marks), গ (3 marks), ঘ (4 marks) with exact marking criteria (number distribution).'
      }
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

    const solution = safeParseJson<Record<string, any>>(response.text, {});
    res.json({ success: true, solution });
  } catch (error: any) {
    return sendSafeServerError(
      res,
      'solve-question',
      error,
      'প্রশ্নের উত্তর তৈরি করা যায়নি। (Failed to generate solution)'
    );
  }
});

// Endpoint: AI Analysis of NCTB Textbook (Extract TOC, chapters, page ranges, and metadata)
app.post('/api/nctb/analyze-book', requireAuth, aiEndpointLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const fileName = safeString(req.body?.fileName, 256);
    const fileText = safeString(req.body?.fileText, 20000);
    const classLevel = safeString(req.body?.classLevel, 64);
    const subject = safeString(req.body?.subject, 128);
    const medium = safeString(req.body?.medium, 32, 'Bangla');
    const curriculumEdition = safeString(req.body?.curriculumEdition, 128, '2024 Revised (নতুন শিক্ষাক্রম)');
    const pageCount = clampNumber(req.body?.pageCount, 1, 2000, 100);

    if (!fileName && !fileText) {
      return res.status(400).json({ success: false, error: 'Book filename or sample text is required.' });
    }

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

    const parsedData = safeParseJson<Record<string, any>>(response.text, {});
    res.json({ success: true, analysis: parsedData });
  } catch (error: any) {
    return sendSafeServerError(
      res,
      'nctb/analyze-book',
      error,
      'বইয়ের সূচিপত্র বিশ্লেষণ করা যায়নি। (Failed to analyze textbook with AI)'
    );
  }
});

// Endpoint: AI OCR for Scanned Pages / Images using Gemini Vision
const ALLOWED_OCR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

app.post('/api/nctb/ocr-page', requireAuth, aiEndpointLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const rawImage = req.body?.imageBase64;
    const mimeType = ALLOWED_OCR_MIME_TYPES.has(req.body?.mimeType) ? req.body.mimeType : 'image/jpeg';
    const pageNumber = req.body?.pageNumber ? clampNumber(req.body.pageNumber, 1, 5000, 1) : 'unknown';

    if (typeof rawImage !== 'string' || !rawImage.trim()) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    const cleanBase64 = rawImage.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/i, '').trim();
    if (!cleanBase64 || cleanBase64.length > 8_500_000) {
      return res.status(400).json({ success: false, error: 'Image payload invalid or exceeds size limit.' });
    }

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
              text: `This is a page (page ${pageNumber}) from an NCTB Bangladesh textbook or board exam paper.
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
    return sendSafeServerError(
      res,
      'nctb/ocr-page',
      error,
      'ছবি থেকে লেখা পড়া (OCR) যায়নি। (Failed to OCR image page)'
    );
  }
});

// Endpoint: Extract structured chunks, headings, and chapters from uploaded PDF text
app.post('/api/pdf/extract-chunks', requireAuth, aiEndpointLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const title = safeString(req.body?.title, 256, 'Uploaded PDF Document');
    const rawText = safeString(req.body?.rawText, 25000);
    const pages = Array.isArray(req.body?.pages) ? req.body.pages.slice(0, 50) : [];
    const classLevel = safeString(req.body?.classLevel, 64, 'General');
    const subject = safeString(req.body?.subject, 128, 'General');
    const category = safeString(req.body?.category, 64, 'General');

    if (!rawText && pages.length === 0) {
      return res.status(400).json({ success: false, error: 'No PDF text or pages provided.' });
    }

    const combinedContent =
      pages.length > 0
        ? pages
            .map((p: any) => `[PAGE ${clampNumber(p?.pageNumber, 1, 5000, 1)}]\n${safeString(p?.text, 4000)}`)
            .join('\n\n')
        : rawText;

    const prompt = `
You are an expert educational document parser specializing in NCTB Bangladesh curriculum and academic materials.
Analyze the following extracted PDF text from:
Document Title: "${title}"
Category: "${category}"
Class: "${classLevel}"
Subject: "${subject}"

Extracted Content:
"""
${combinedContent.slice(0, 16000)}
"""

YOUR TASK:
1. Break down the content into clean, logical, and searchable chunks corresponding to chapters, topics, or distinct page sections.
2. For each chunk, preserve the original page number (or best estimate from [PAGE X] tags).
3. Detect chapter titles and major section headings.
4. Detect any overall chapters detected in the document with estimated page ranges.

Output strict JSON matching the schema.
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

    const parsed = safeParseJson<Record<string, any>>(response.text, { chunks: [] });
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    return sendSafeServerError(
      res,
      'pdf/extract-chunks',
      error,
      'পিডিএফ বিশ্লেষণ করা যায়নি। (Failed to extract chunks from PDF)'
    );
  }
});

// Endpoint: AI Question Generation directly from Selected PDF(s)
app.post('/api/gemini/generate-from-pdf', requireAuth, aiEndpointLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const pdfTitle = safeString(req.body?.pdfTitle, 256, 'Uploaded PDF');
    const pdfId = safeString(req.body?.pdfId, 128);
    const extractedContent = safeString(req.body?.extractedContent, 25000);
    const chunks = Array.isArray(req.body?.chunks) ? req.body.chunks.slice(0, 60) : [];
    const selectionMode = safeString(req.body?.selectionMode, 32, 'entire');
    const selectedPages = safeString(req.body?.selectedPages, 128);
    const selectedChapter = safeString(req.body?.selectedChapter, 256);
    const selectedTopic = safeString(req.body?.selectedTopic, 256);
    const questionType = safeString(req.body?.questionType, 32, 'MCQ');
    const count = clampNumber(req.body?.count, 1, 15, 5);
    const difficulty = safeString(req.body?.difficulty, 32, 'Medium');
    const language = safeString(req.body?.language, 32, 'Bangla');
    const classLevel = safeString(req.body?.classLevel, 64, 'Class 10');
    const subject = safeString(req.body?.subject, 128, 'General');
    const marks = clampNumber(req.body?.marks, 1, 100, 10);

    if (!extractedContent && chunks.length === 0) {
      return res.status(400).json({ success: false, error: 'No extracted PDF content provided.' });
    }

    let contextBody = '';
    if (chunks.length > 0) {
      contextBody = chunks
        .map(
          (c: any) =>
            `[PAGE ${clampNumber(c?.pageNumber, 1, 5000, 1)} | ${safeString(c?.chapterName, 128)} | ${safeString(
              c?.heading,
              128
            )}]\n${safeString(c?.content, 4000)}`
        )
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

    const isMath = /math|গণিত/i.test(subject);

    let typeGuidance = '';
    if (questionType === 'CQ') {
      typeGuidance = isMath
        ? `
MATH CREATIVE QUESTION (গণিত সৃজনশীল প্রশ্ন / CQ) STRICT REQUIREMENT (3 Parts Only — 2, 4, 4 = 10 Marks):
- Each Math CQ MUST contain a mathematical Stimulus (উদ্দীপক) grounded in the provided PDF text.
- ONLY 3 sub-questions (ক, খ, গ). DO NOT include partD (ঘ)!
- ক (2 marks), খ (4 marks), গ (4 marks) — total 10 marks.
- Detailed model answers for parts ক, খ, গ in the answer fields.
`
        : `
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

    const parsedQuestions = safeParseJson<any[]>(response.text, []);

    const enriched = (Array.isArray(parsedQuestions) ? parsedQuestions : []).map((q: any, idx: number) => {
      const normalizedCqParts =
        isMath && (q.questionType === 'CQ' || q.cqParts) && q.cqParts
          ? {
              partA: { ...(q.cqParts.partA || { question: 'ক. প্রশ্ন' }), marks: 2 },
              partB: { ...(q.cqParts.partB || { question: 'খ. প্রশ্ন' }), marks: 4 },
              partC: { ...(q.cqParts.partC || { question: 'গ. প্রশ্ন' }), marks: 4 },
            }
          : q.cqParts;
      return {
        ...q,
        cqParts: normalizedCqParts,
        marks: isMath && (q.questionType === 'CQ' || q.cqParts) ? 10 : q.marks,
        id: `gen-pdf-${Date.now()}-${idx}`,
        ownerId: req.authUser?.uid,
        sourceType: 'ORIGINAL_AI',
        sourcePdfId: pdfId,
        sourcePdfTitle: pdfTitle,
        sourcePage: q.sourcePage || 'Page reference unavailable',
        isAiGenerated: true,
        classLevel,
        subject,
        chapter: selectedChapter || q.topicTag || 'PDF Source Material',
        createdAt: new Date().toISOString(),
      };
    });

    res.json({ success: true, questions: enriched });
  } catch (error: any) {
    return sendSafeServerError(
      res,
      'generate-from-pdf',
      error,
      'পিডিএফ থেকে প্রশ্ন তৈরি করা যায়নি। (Failed to generate questions from PDF)'
    );
  }
});

// Endpoint: AI Extraction of Questions from Uploaded Exam Papers
app.post('/api/gemini/extract-exam-questions', requireAuth, aiEndpointLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const rawText = safeString(req.body?.rawText, 25000);
    const examName = safeString(req.body?.examName, 256);
    const institutionName = safeString(req.body?.institutionName, 256);
    const classLevel = safeString(req.body?.classLevel, 64, 'Class 10');
    const subject = safeString(req.body?.subject, 128, 'General');
    const examType = safeString(req.body?.examType, 64, 'Exam');
    const year = safeString(req.body?.year, 16, '2024');
    const boardName = safeString(req.body?.boardName, 128);
    const fullMarks = clampNumber(req.body?.fullMarks, 1, 500, 100);
    const language = safeString(req.body?.language, 32, 'Bangla');

    if (!rawText) {
      return res.status(400).json({ success: false, error: 'Exam paper text is required.' });
    }

    const isMathExam = /math|গণিত/i.test(`${subject} ${examName}`);

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
   - You MUST NEVER separate the stimulus (উদ্দীপক) from its sub-questions!
   - Store the complete scenario, paragraph, poem, data table, or experiment in 'stimulus'.
   - ${
     isMathExam
       ? 'For MATHEMATICS / HIGHER MATH CQs, extract ONLY 3 sub-questions: partA (ক, 2 marks), partB (খ, 4 marks), partC (গ, 4 marks). DO NOT include partD!'
       : 'Store partA (ক - জ্ঞানমূলক, 1 mark), partB (খ - অনুধাবনমূলক, 2 marks), partC (গ - প্রয়োগমূলক, 3 marks), partD (ঘ - উচ্চতর দক্ষতা, 4 marks) inside \'cqParts\'. (Note: if the exam is Mathematics, use ONLY 3 parts: 2, 4, 4 and omit partD).'
   }
   - Total marks for each CQ must be 10.
2. MULTIPLE CHOICE QUESTIONS (MCQ):
   - Identify questionText.
   - Extract exactly 4 options.
   - If answer key is indicated in the exam, identify correctOptionIndex (0-3) and correctAnswer.
   - 1 mark each.
3. SHORT QUESTIONS (SQ):
   - Extract questionText, marks, and answer if provided.
4. DETECT CHAPTER/TOPIC & MATH FORMULAS:
   - Use standard LaTeX notation inside '$...$' for equations, fractions, exponents, and physics symbols.

Respond with strict valid JSON matching the schema.
`;

    const response = await safeGenerateContent({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedSubject: { type: Type.STRING },
            detectedClass: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionType: { type: Type.STRING },
                  stimulus: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  chapter: { type: Type.STRING },
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

    const parsed = safeParseJson<Record<string, any>>(response.text, { questions: [] });
    const isDetectedMath = isMathExam || /math|গণিত/i.test(parsed.detectedSubject || '');
    if (isDetectedMath && Array.isArray(parsed.questions)) {
      parsed.questions = parsed.questions.map((q: any) => {
        if (q.questionType === 'CQ' || q.cqParts) {
          const cq = q.cqParts || {};
          return {
            ...q,
            marks: 10,
            cqParts: {
              partA: { ...(cq.partA || { question: 'ক. প্রশ্ন' }), marks: 2 },
              partB: { ...(cq.partB || { question: 'খ. প্রশ্ন' }), marks: 4 },
              partC: { ...(cq.partC || { question: 'গ. প্রশ্ন' }), marks: 4 },
            },
          };
        }
        return q;
      });
    }
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    return sendSafeServerError(
      res,
      'extract-exam-questions',
      error,
      'পরীক্ষা পত্র থেকে প্রশ্ন আলাদা করা যায়নি। (Failed to extract exam questions)'
    );
  }
});

// Unknown /api/* routes return clean JSON 404 (prevents leaking SPA fallback on bad API paths)
app.all('/api/*', (_req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// Global fallback Express error handler (prevents leaking stack traces)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err?.message || err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const httpServer = http.createServer(app);

  if (!isProduction) {
    process.env.DISABLE_HMR = 'true';

    // When HMR is disabled in preview environments, Vite 8's default /@vite/client
    // still attempts a WebSocket connection to port 24678 and emits unhandled rejections.
    // Serve a clean no-HMR client shim that preserves CSS updates and React Refresh hooks
    // without opening any WebSocket.
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (!url || (url[0] !== '.' && url[0] !== '/')) return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`EduQuestion AI server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
