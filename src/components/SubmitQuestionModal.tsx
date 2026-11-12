import React, { useState, useEffect } from 'react';
import {
  DynamicClassItem,
  DynamicSubjectItem,
  QuestionType,
  SubmittedQuestion,
  Question,
} from '../types';
import { submitPublicQuestion, ADMIN_EMAIL } from '../services/submissionService';
import { saveQuestionToCloud } from '../services/questionBankService';
import { MathRenderer } from './MathRenderer';
import {
  X,
  Upload,
  CheckCircle2,
  Mail,
  Send,
  HelpCircle,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  STANDARD_BOARDS,
  STANDARD_YEARS,
  DEFAULT_CHAPTERS,
} from './QuestionLibraryView';

interface SubmitQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dynamicClasses: DynamicClassItem[];
  dynamicSubjects: DynamicSubjectItem[];
  currentUser?: { displayName?: string | null; email?: string | null } | null;
  isBangla?: boolean;
  onQuestionSubmitted?: (question: Question) => void;
}

/**
 * Strips accidental pasted prefixes like "ক)", "খ)", ")", "a)", "• ক)"
 */
function cleanOptionText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^[\s\•\-\*]*[\(]?\s*[কখগঘabcdABCD1234]\s*[\)\.\:\-]\s*/, '')
    .replace(/^[\s\)]+\s*/, '')
    .trim();
}

/**
 * Parses raw copied MCQ text into individual fields
 */
function parseRawMcqText(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let qText = '';
  let optA = '';
  let optB = '';
  let optC = '';
  let optD = '';
  let correct = '';
  let expl = '';

  for (const line of lines) {
    if (/^(সঠিক\s*উত্তর|উত্তর|Answer|Ans)[\s\:\-]+/i.test(line)) {
      const parts = line.replace(/^(সঠিক\s*উত্তর|উত্তর|Answer|Ans)[\s\:\-]+/i, '').trim();
      correct = parts;
      if (parts.includes('(') && parts.includes(')')) {
        const matchExpl = parts.match(/\((.*?)\)/);
        if (matchExpl) {
          expl = matchExpl[1];
        }
      }
    } else if (/^[\•\-\*]?\s*[\(]?\s*(ক|a|1)[\)\.\:\-]/i.test(line)) {
      optA = cleanOptionText(line);
    } else if (/^[\•\-\*]?\s*[\(]?\s*(খ|b|2)[\)\.\:\-]/i.test(line)) {
      optB = cleanOptionText(line);
    } else if (/^[\•\-\*]?\s*[\(]?\s*(গ|c|3)[\)\.\:\-]/i.test(line)) {
      optC = cleanOptionText(line);
    } else if (/^[\•\-\*]?\s*[\(]?\s*(ঘ|d|4)[\)\.\:\-]/i.test(line)) {
      optD = cleanOptionText(line);
    } else if (!qText && !line.includes('MCQ') && !line.includes('অধ্যায়') && !line.includes('বোর্ড')) {
      // Strip leading serial number e.g. "১. " or "1. "
      qText = line.replace(/^[\d১-৯]+[\.\:\-]\s*/, '').trim();
    }
  }

  return { qText, optA, optB, optC, optD, correct, expl };
}

export const SubmitQuestionModal: React.FC<SubmitQuestionModalProps> = ({
  isOpen,
  onClose,
  dynamicClasses,
  dynamicSubjects,
  currentUser,
  isBangla = true,
  onQuestionSubmitted,
}) => {
  const [submitterName, setSubmitterName] = useState(currentUser?.displayName || '');
  const [submitterEmail, setSubmitterEmail] = useState(currentUser?.email || '');
  const [submitterPhone, setSubmitterPhone] = useState('');
  const [classLevel, setClassLevel] = useState(dynamicClasses[0]?.name || 'SSC');
  const [subject, setSubject] = useState(dynamicSubjects[0]?.name || 'Physics');
  const [customSubject, setCustomSubject] = useState('');
  const [chapter, setChapter] = useState(DEFAULT_CHAPTERS[0]);
  const [customChapterMode, setCustomChapterMode] = useState(false);
  const [customChapterText, setCustomChapterText] = useState('');
  const [board, setBoard] = useState('Dhaka Board');
  const [customBoardMode, setCustomBoardMode] = useState(false);
  const [customBoardText, setCustomBoardText] = useState('');
  const [year, setYear] = useState('2025');
  const [customYearMode, setCustomYearMode] = useState(false);
  const [customYearText, setCustomYearText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('MCQ');

  // Question details
  const [questionText, setQuestionText] = useState('');
  const [stimulus, setStimulus] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');
  const [option4, setOption4] = useState('');
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(0);
  const [correctAnswer, setCorrectAnswer] = useState('');

  // Diagram / Image Upload
  const [diagramUrl, setDiagramUrl] = useState('');
  const [diagramCaption, setDiagramCaption] = useState('');
  const [showDiagramInput, setShowDiagramInput] = useState(false);

  // Fast paste helper
  const [showQuickParser, setShowQuickParser] = useState(false);
  const [rawTextToParse, setRawTextToParse] = useState('');

  // CQ parts
  const [partA, setPartA] = useState('');
  const [partB, setPartB] = useState('');
  const [partC, setPartC] = useState('');
  const [partD, setPartD] = useState('');

  const [explanation, setExplanation] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    question: SubmittedQuestion;
    gmailComposeUrl: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stepYear = (delta: number) => {
    const currentNum = parseInt(year, 10);
    if (!isNaN(currentNum)) {
      setYear(String(currentNum + delta));
      setCustomYearMode(false);
    } else {
      setYear('2025');
    }
  };

  useEffect(() => {
    if (currentUser?.email) {
      setSubmitterEmail(currentUser.email);
    }
    if (currentUser?.displayName) {
      setSubmitterName(currentUser.displayName);
    }
  }, [currentUser, isOpen]);

  // Diagram file upload handler
  const handleDiagramFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage(isBangla ? 'অনুগ্রহ করে শুধুমাত্র ছবি ফাইল নির্বাচন করুন।' : 'Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setDiagramUrl(result);
        setShowDiagramInput(true);
        if (!diagramCaption) {
          setDiagramCaption('চিত্র: প্রশ্নের উদ্দীপক বা চিত্র');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyParsedMcq = () => {
    if (!rawTextToParse.trim()) return;
    const parsed = parseRawMcqText(rawTextToParse);
    if (parsed.qText) setQuestionText(parsed.qText);
    if (parsed.optA) setOption1(parsed.optA);
    if (parsed.optB) setOption2(parsed.optB);
    if (parsed.optC) setOption3(parsed.optC);
    if (parsed.optD) setOption4(parsed.optD);
    if (parsed.correct) {
      setCorrectAnswer(parsed.correct);
      if (parsed.correct.includes('ক') || parsed.correct.toLowerCase().includes('a')) setCorrectOptionIdx(0);
      else if (parsed.correct.includes('খ') || parsed.correct.toLowerCase().includes('b')) setCorrectOptionIdx(1);
      else if (parsed.correct.includes('গ') || parsed.correct.toLowerCase().includes('c')) setCorrectOptionIdx(2);
      else if (parsed.correct.includes('ঘ') || parsed.correct.toLowerCase().includes('d')) setCorrectOptionIdx(3);
    }
    if (parsed.expl) setExplanation(parsed.expl);
    setShowQuickParser(false);
    setRawTextToParse('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitterName.trim()) {
      setErrorMessage(isBangla ? 'অনুগ্রহ করে আপনার নাম লিখুন।' : 'Please enter your name.');
      return;
    }
    if (!questionText.trim()) {
      setErrorMessage(
        isBangla
          ? 'অনুগ্রহ করে মূল প্রশ্ন বা উদ্দীপক লিখুন।'
          : 'Please enter question text or stimulus.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const activeSubject = subject === '__CUSTOM__' ? customSubject.trim() || 'General' : subject;
    const activeChapter = (customChapterMode ? customChapterText : chapter).trim();
    const activeBoard = (customBoardMode ? customBoardText : board).trim();
    const activeYear = (customYearMode ? customYearText : year).trim() || '2025';

    // Resolved options
    const rawOptions = [option1, option2, option3, option4];
    const cleanedOptions = rawOptions.map(cleanOptionText).filter(Boolean);

    const activeCorrectAnswer =
      questionType === 'MCQ'
        ? correctAnswer.trim() || cleanedOptions[correctOptionIdx] || `বিকল্প ${['ক', 'খ', 'গ', 'ঘ'][correctOptionIdx]}`
        : correctAnswer.trim();

    const payload: Omit<SubmittedQuestion, 'id' | 'createdAt' | 'status'> = {
      submitterName: submitterName.trim(),
      submitterEmail: submitterEmail.trim() || undefined,
      submitterPhone: submitterPhone.trim() || undefined,
      classLevel,
      subject: activeSubject,
      chapter: activeChapter || undefined,
      questionType,
      questionText: questionText.trim(),
      stimulus: stimulus.trim() || undefined,
      options: questionType === 'MCQ' ? cleanedOptions : undefined,
      correctAnswer: activeCorrectAnswer || undefined,
      diagramUrl: diagramUrl.trim() || undefined,
      diagramCaption: diagramCaption.trim() || undefined,
      cqParts:
        questionType === 'CQ'
          ? {
              partA: { question: partA.trim() || 'জ্ঞানমূলক প্রশ্ন', marks: 1 },
              partB: { question: partB.trim() || 'অনুধাবনমূলক প্রশ্ন', marks: 2 },
              partC: { question: partC.trim() || 'প্রয়োগমূলক প্রশ্ন', marks: 3 },
              partD: { question: partD.trim() || 'উচ্চতর দক্ষতামূলক প্রশ্ন', marks: 4 },
            }
          : undefined,
      explanation: explanation.trim() || undefined,
      marks: questionType === 'CQ' ? 10 : 1,
      boardInfo: activeBoard
        ? {
            boardName: activeBoard,
            year: activeYear,
            examType: 'SSC Exam',
            isVerified: true,
          }
        : undefined,
    };

    try {
      // 1. Submit through submission service (creates Firestore submitted_questions + Gmail notification)
      const res = await submitPublicQuestion(payload);
      setSubmittedData(res);

      // 2. Also immediately turn this question into an active QuestionBank item so it is instantly usable & persistent!
      const activeQuestion: Question = {
        id: `q_user_${Date.now()}`,
        classLevel,
        subject: activeSubject,
        chapter: activeChapter || 'সাধারণ অধ্যায়',
        questionType,
        questionText: questionText.trim(),
        stimulus: stimulus.trim() || undefined,
        options: questionType === 'MCQ' ? cleanedOptions : undefined,
        correctOptionIndex: questionType === 'MCQ' ? correctOptionIdx : undefined,
        correctAnswer: activeCorrectAnswer || undefined,
        diagramUrl: diagramUrl.trim() || undefined,
        diagramCaption: diagramCaption.trim() || undefined,
        cqParts: payload.cqParts,
        marks: questionType === 'CQ' ? 10 : 1,
        difficulty: 'Medium',
        sourceType: 'COMMUNITY',
        boardInfo: payload.boardInfo
          ? {
              boardName: payload.boardInfo.boardName,
              year: payload.boardInfo.year,
              examType: payload.boardInfo.examType || 'SSC Exam',
              isVerified: true,
            }
          : undefined,
        explanation: explanation.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      // Save directly to cloud and local cache so refresh never loses it!
      await saveQuestionToCloud(activeQuestion);

      if (onQuestionSubmitted) {
        onQuestionSubmitted(activeQuestion);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Question submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuestionText('');
    setStimulus('');
    setOption1('');
    setOption2('');
    setOption3('');
    setOption4('');
    setCorrectAnswer('');
    setCorrectOptionIdx(0);
    setDiagramUrl('');
    setDiagramCaption('');
    setShowDiagramInput(false);
    setPartA('');
    setPartB('');
    setPartC('');
    setPartD('');
    setExplanation('');
    setSubmittedData(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isBangla ? 'প্রশ্ন আপলোড ও স্থায়ী সংরক্ষণ' : 'Upload & Permanently Save Question'}
              </h3>
              <p className="text-xs text-slate-500">
                {isBangla
                  ? 'চিত্র, গাণিতিক সূত্র (10⁻¹⁸, LaTeX) সহ সকল ধরনের প্রশ্ন আপলোড করুন'
                  : `Upload questions with diagrams, LaTeX and formulas - automatically synced to admin`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submittedData ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                {isBangla ? 'প্রশ্নটি সফলভাবে আপলোড ও ক্লাউডে সেভ হয়েছে!' : 'Question Saved Successfully!'}
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {isBangla
                  ? `আপনার দেওয়া প্রশ্নটি ক্লাউড ডাটাবেজে স্থায়ীভাবে সংরক্ষিত হয়েছে। রিফ্রেশ দিলেও এটি প্রশ্ন ব্যাংকে থাকবে এবং যেকেউ এটি দিয়ে প্রশ্নপত্র তৈরি করতে পারবে।`
                  : `Your question has been permanently saved to the Question Bank and Firestore database.`}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={submittedData.gmailComposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {isBangla ? 'অ্যাডমিনকে জিমেইলে জানান' : 'Notify Admin via Gmail'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  {isBangla ? '+ আরেকটি প্রশ্ন আপলোড করুন' : '+ Submit Another Question'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submitter Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700">
                    {isBangla ? 'আপনার পরিচিতি (Submitter Information)' : 'Submitter Information'}
                  </div>
                  {currentUser?.email ? (
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-100/70 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                      {currentUser.email}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      গেস্ট / সাধারণ ইউজার
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isBangla ? 'আপনার নাম *' : 'Your Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={submitterName}
                      onChange={(e) => setSubmitterName(e.target.value)}
                      placeholder="e.g. মো. জাহিদুল ইসলাম / শিক্ষক"
                      className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isBangla ? 'ইমেইল (ঐচ্ছিক)' : 'Email (Optional)'}
                    </label>
                    <input
                      type="email"
                      value={submitterEmail}
                      onChange={(e) => setSubmitterEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isBangla ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Phone (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={submitterPhone}
                      onChange={(e) => setSubmitterPhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Class & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'শ্রেণি (Class)' : 'Class'}
                  </label>
                  <select
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    {dynamicClasses.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'বিষয় (Subject)' : 'Subject'}
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    {dynamicSubjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ কাস্টম বিষয় লিখুন</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      {isBangla ? 'অধ্যায় (ঐচ্ছিক)' : 'Chapter (Optional)'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomChapterMode(!customChapterMode)}
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      {customChapterMode ? 'তালিকা' : '+ কাস্টম'}
                    </button>
                  </div>
                  {customChapterMode ? (
                    <input
                      type="text"
                      value={customChapterText}
                      onChange={(e) => setCustomChapterText(e.target.value)}
                      placeholder="e.g. গতি / ১ম অধ্যায়"
                      className="w-full text-xs border border-blue-300 rounded-xl p-2.5 bg-blue-50/30 focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      value={chapter}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setCustomChapterMode(true);
                        } else {
                          setChapter(e.target.value);
                        }
                      }}
                      className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      {DEFAULT_CHAPTERS.map((chap) => (
                        <option key={chap} value={chap}>
                          {chap}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ কাস্টম অধ্যায় টাইপ করুন...</option>
                    </select>
                  )}
                </div>
              </div>

              {subject === '__CUSTOM__' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'কাস্টম বিষয়ের নাম:' : 'Custom Subject Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="যেমন: পৌরনীতি ও নাগরিকতা"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Board and Year Auto-Selection with Stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
                {/* Board Dropdown */}
                <div className="sm:col-span-5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      {isBangla ? 'বোর্ড / পরীক্ষা (ঐচ্ছিক)' : 'Board (Optional)'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomBoardMode(!customBoardMode)}
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      {customBoardMode ? 'তালিকা' : '+ কাস্টম'}
                    </button>
                  </div>
                  {customBoardMode ? (
                    <input
                      type="text"
                      value={customBoardText}
                      onChange={(e) => setCustomBoardText(e.target.value)}
                      placeholder="কাস্টম বোর্ড বা স্কুলের নাম"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      value={board}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setCustomBoardMode(true);
                        } else {
                          setBoard(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    >
                      <option value="">বোর্ড ছাড়া / সাধারণ প্রশ্ন</option>
                      {STANDARD_BOARDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ কাস্টম বোর্ড লিখুন...</option>
                    </select>
                  )}
                </div>

                {/* Year with Auto-Stepper */}
                <div className="sm:col-span-7 bg-white p-2 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isBangla ? 'সাল / বছর (Year)' : 'Exam Year'}</span>
                    </label>
                    <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {customYearMode ? customYearText || '—' : year}
                    </span>
                  </div>

                  {customYearMode ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customYearText}
                        onChange={(e) => setCustomYearText(e.target.value)}
                        placeholder="যেমন: 2025"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-blue-300 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomYearMode(false)}
                        className="px-2.5 py-1.5 text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium"
                      >
                        লিস্ট
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => stepYear(-1)}
                        title="আগের বছর নির্বাচন করুন"
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-0.5 transition-all active:scale-95 shrink-0"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>আগের বছর</span>
                      </button>

                      <select
                        value={year}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setCustomYearMode(true);
                          } else {
                            setYear(e.target.value);
                          }
                        }}
                        className="flex-1 px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white font-bold text-center text-blue-950 focus:ring-2 focus:ring-blue-500"
                      >
                        {STANDARD_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                        <option value="__CUSTOM__">+ কাস্টম সাল...</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => stepYear(1)}
                        title="পরের বছর নির্বাচন করুন"
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-0.5 transition-all active:scale-95 shrink-0"
                      >
                        <span>পরের বছর</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Quick Year Selection Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-0.5">
                    {['2027', '2026', '2025', '2024', '2023', '2022'].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setYear(yr);
                          setCustomYearMode(false);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                          year === yr && !customYearMode
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Question Type Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {isBangla ? 'প্রশ্নের ধরন (Question Type):' : 'Question Type:'}
                  </label>
                  {questionType === 'MCQ' && (
                    <button
                      type="button"
                      onClick={() => setShowQuickParser(!showQuickParser)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{showQuickParser ? 'ম্যানুয়াল ইনপুট' : 'দ্রুত সম্পূর্ণ MCQ পেস্ট করুন'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionType('MCQ')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      questionType === 'MCQ'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    MCQ (বহুনির্বাচনি)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionType('CQ')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      questionType === 'CQ'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    CQ (সৃজনশীল)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionType('SQ')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      questionType === 'SQ'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    SQ (সংক্ষিপ্ত প্রশ্ন)
                  </button>
                </div>
              </div>

              {/* Fast MCQ Smart Paste Box */}
              {showQuickParser && questionType === 'MCQ' && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      {isBangla ? 'এখানে পুরো MCQ প্রশ্নটি একসাথে পেস্ট করুন:' : 'Paste Complete MCQ Text:'}
                    </span>
                    <span className="text-[10px] text-indigo-600">১ ক্লিকে প্রশ্ন ও অপশন আলাদা হয়ে যাবে</span>
                  </div>
                  <textarea
                    rows={4}
                    value={rawTextToParse}
                    onChange={(e) => setRawTextToParse(e.target.value)}
                    placeholder={`১. 1 am কত মিটার?\n• ক) 10⁻¹⁸ m\n• খ) 10⁻¹⁵ m\n• গ) 10⁻¹² m\n• ঘ) 10⁻¹⁰ m\n• সঠিক উত্তর: ক) 10⁻¹⁸ m (কারণ ১ অ্যাটোমিটার = 10⁻¹⁸ মিটার)`}
                    className="w-full text-xs p-2.5 rounded-xl border border-indigo-200 bg-white font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickParser(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyParsedMcq}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                    >
                      স্বয়ংক্রিয়ভাবে ফর্ম পূরণ করুন
                    </button>
                  </div>
                </div>
              )}

              {/* Question Text / Stimulus */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {questionType === 'CQ'
                    ? isBangla
                      ? 'সৃজনশীল উদ্দীপক (Stimulus Scenario) *'
                      : 'Stimulus Scenario *'
                    : isBangla
                    ? 'মূল প্রশ্ন (Question Text) *'
                    : 'Question Text *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={
                    questionType === 'CQ'
                      ? 'এখানে উদ্দীপকের বিস্তারিত বিবরণ লিখুন...'
                      : 'যেমন: ১. 1 am কত মিটার? অথবা 50 kg ভরের বস্তুর ত্বরণ...'
                  }
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Diagram / Image Upload Section ("চিত্রসহ প্রশ্ন আপলোড") */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>{isBangla ? 'চিত্র / ডায়াগ্রাম সংযুক্তি (ঐচ্ছিক)' : 'Diagram / Image (Optional)'}</span>
                  </label>
                  {!showDiagramInput && (
                    <button
                      type="button"
                      onClick={() => setShowDiagramInput(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                    >
                      + চিত্র বা ছবি যোগ করুন
                    </button>
                  )}
                </div>

                {showDiagramInput && (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* File chooser */}
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>ডিভাইস থেকে ছবি আপলোড করুন</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDiagramFileUpload}
                          className="hidden"
                        />
                      </label>

                      <span className="text-xs text-slate-400">অথবা ছবির লিংক দিন:</span>

                      <input
                        type="url"
                        value={diagramUrl.startsWith('data:') ? '' : diagramUrl}
                        onChange={(e) => setDiagramUrl(e.target.value)}
                        placeholder="https://example.com/diagram.png"
                        className="flex-1 min-w-[200px] text-xs border border-slate-300 rounded-xl p-2 bg-white focus:ring-2 focus:ring-blue-500"
                      />

                      {diagramUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setDiagramUrl('');
                            setDiagramCaption('');
                          }}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="চিত্র মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Diagram Caption */}
                    <div>
                      <input
                        type="text"
                        value={diagramCaption}
                        onChange={(e) => setDiagramCaption(e.target.value)}
                        placeholder="চিত্রের ক্যাপশন (যেমন: চিত্র ১: চল তড়িৎ বর্তনী / ভেক্টর চিত্র)"
                        className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Preview of Diagram */}
                    {diagramUrl && (
                      <div className="p-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center">
                        <img
                          src={diagramUrl}
                          alt="Question Diagram Preview"
                          className="max-h-40 max-w-full object-contain rounded-lg"
                        />
                        {diagramCaption && (
                          <span className="text-[11px] text-slate-500 italic mt-1">{diagramCaption}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MCQ Options */}
              {questionType === 'MCQ' && (
                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {isBangla ? 'চারটি বিকল্প (Options) ও সঠিক উত্তর নির্বাচন:' : 'MCQ Options & Correct Answer:'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (গোল বাটনে ক্লিক করে সঠিক উত্তর চিহ্নিত করুন)
                    </span>
                  </div>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { label: 'ক', val: option1, setter: setOption1, idx: 0, placeholder: 'ক) 10⁻¹⁸ m' },
                      { label: 'খ', val: option2, setter: setOption2, idx: 1, placeholder: 'খ) 10⁻¹⁵ m' },
                      { label: 'গ', val: option3, setter: setOption3, idx: 2, placeholder: 'গ) 10⁻¹² m' },
                      { label: 'ঘ', val: option4, setter: setOption4, idx: 3, placeholder: 'ঘ) 10⁻¹⁰ m' },
                    ].map(({ label, val, setter, idx, placeholder }) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                          correctOptionIdx === idx
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="correctOptionRadio"
                          checked={correctOptionIdx === idx}
                          onChange={() => {
                            setCorrectOptionIdx(idx);
                            setCorrectAnswer(cleanOptionText(val) || label);
                          }}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="font-bold text-xs text-slate-700 w-5 text-center">{label})</span>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => {
                            const cleaned = cleanOptionText(e.target.value);
                            setter(cleaned);
                            if (correctOptionIdx === idx) {
                              setCorrectAnswer(cleaned);
                            }
                          }}
                          placeholder={placeholder}
                          className="flex-1 text-xs border border-slate-200 rounded-lg p-1.5 bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      নির্বাচিত সঠিক উত্তর:{' '}
                      <strong className="text-emerald-700 font-bold">
                        {['ক', 'খ', 'গ', 'ঘ'][correctOptionIdx]}
                        {cleanOptionText([option1, option2, option3, option4][correctOptionIdx]) && (
                          <span>: {cleanOptionText([option1, option2, option3, option4][correctOptionIdx])}</span>
                        )}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {/* CQ Parts */}
              {questionType === 'CQ' && (
                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-700">
                    {isBangla ? 'সৃজনশীল প্রশ্নাবলি (ক, খ, গ, ঘ):' : 'CQ Sub-questions:'}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600">ক. জ্ঞানমূলক (১ নম্বর):</span>
                      <input
                        type="text"
                        value={partA}
                        onChange={(e) => setPartA(e.target.value)}
                        placeholder="ক. প্রশ্ন..."
                        className="w-full text-xs border border-slate-300 rounded-xl p-2 mt-0.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600">খ. অনুধাবনমূলক (২ নম্বর):</span>
                      <input
                        type="text"
                        value={partB}
                        onChange={(e) => setPartB(e.target.value)}
                        placeholder="খ. প্রশ্ন..."
                        className="w-full text-xs border border-slate-300 rounded-xl p-2 mt-0.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600">গ. প্রয়োগমূলক (৩ নম্বর):</span>
                      <input
                        type="text"
                        value={partC}
                        onChange={(e) => setPartC(e.target.value)}
                        placeholder="গ. প্রশ্ন..."
                        className="w-full text-xs border border-slate-300 rounded-xl p-2 mt-0.5 bg-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-600">ঘ. উচ্চতর দক্ষতামূলক (৪ নম্বর):</span>
                      <input
                        type="text"
                        value={partD}
                        onChange={(e) => setPartD(e.target.value)}
                        placeholder="ঘ. প্রশ্ন..."
                        className="w-full text-xs border border-slate-300 rounded-xl p-2 mt-0.5 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Preview Box */}
              {(questionText.trim() || option1 || diagramUrl) && (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isBangla ? 'প্রশ্নের লাইভ প্রিভিউ (LaTeX ও গাণিতিক রূপ):' : 'Live Preview:'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100 text-xs text-slate-800 space-y-2">
                    <div className="font-semibold">
                      <MathRenderer content={questionText} />
                    </div>

                    {diagramUrl && (
                      <div className="flex flex-col items-center py-1">
                        <img src={diagramUrl} alt="Diagram" className="max-h-36 object-contain rounded-md" />
                        {diagramCaption && (
                          <span className="text-[10px] text-slate-500 italic mt-0.5">{diagramCaption}</span>
                        )}
                      </div>
                    )}

                    {questionType === 'MCQ' && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-slate-700">
                        {option1 && (
                          <div className={correctOptionIdx === 0 ? 'text-emerald-700 font-bold' : ''}>
                            ক) <MathRenderer content={cleanOptionText(option1)} />
                          </div>
                        )}
                        {option2 && (
                          <div className={correctOptionIdx === 1 ? 'text-emerald-700 font-bold' : ''}>
                            খ) <MathRenderer content={cleanOptionText(option2)} />
                          </div>
                        )}
                        {option3 && (
                          <div className={correctOptionIdx === 2 ? 'text-emerald-700 font-bold' : ''}>
                            গ) <MathRenderer content={cleanOptionText(option3)} />
                          </div>
                        )}
                        {option4 && (
                          <div className={correctOptionIdx === 3 ? 'text-emerald-700 font-bold' : ''}>
                            ঘ) <MathRenderer content={cleanOptionText(option4)} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Explanation */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {isBangla ? 'উত্তরমালা বা ব্যাখ্যা (ঐচ্ছিক):' : 'Answer Key / Explanation (Optional):'}
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="যেমন: কারণ ১ অ্যাটোমিটার (am) = 10⁻¹⁸ মিটার।"
                  className="w-full text-xs border border-slate-300 rounded-xl p-2 font-bangla focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting
                    ? isBangla
                      ? 'সংরক্ষণ হচ্ছে...'
                      : 'Saving...'
                    : isBangla
                    ? 'প্রশ্ন আপলোড ও সেভ করুন'
                    : 'Save & Publish Question'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
