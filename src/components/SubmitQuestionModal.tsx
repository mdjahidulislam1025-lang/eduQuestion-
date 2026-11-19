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
  compressDiagramImage,
  cleanOptionPaste,
  parseSmartQuestionText,
  isMathSubject,
} from '../utils/questionMediaHelper';
import {
  X,
  Upload,
  CheckCircle2,
  Mail,
  Send,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Eye,
  Loader2,
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

export const SubmitQuestionModal: React.FC<SubmitQuestionModalProps> = ({
  isOpen,
  onClose,
  dynamicClasses,
  dynamicSubjects,
  currentUser,
  isBangla = true,
  onQuestionSubmitted,
}) => {
  const [submitterName, setSubmitterName] = useState(
    currentUser?.displayName || currentUser?.email?.split('@')[0] || ''
  );
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
  const [marks, setMarks] = useState<number>(1);

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
  const [isCompressingImage, setIsCompressingImage] = useState(false);

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
    } else if (currentUser?.email && !submitterName) {
      setSubmitterName(currentUser.email.split('@')[0]);
    }
  }, [currentUser, isOpen]);

  // Diagram file upload handler with compression
  const handleDiagramFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage(isBangla ? 'অনুগ্রহ করে শুধুমাত্র ছবি ফাইল নির্বাচন করুন।' : 'Please select an image file.');
      return;
    }

    setIsCompressingImage(true);
    setErrorMessage(null);
    try {
      const compressed = await compressDiagramImage(file);
      setDiagramUrl(compressed);
      setShowDiagramInput(true);
      if (!diagramCaption) {
        setDiagramCaption('চিত্র: প্রশ্নের উদ্দীপক বা চিত্র');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(isBangla ? 'ছবিটি প্রসেস করা যায়নি। অন্য ছবি চেষ্টা করুন।' : 'Failed to process image.');
    } finally {
      setIsCompressingImage(false);
      e.target.value = '';
    }
  };

  const handleApplyParsedMcq = () => {
    if (!rawTextToParse.trim()) return;
    const parsed = parseSmartQuestionText(rawTextToParse);
    if (parsed.questionText) setQuestionText(parsed.questionText);
    if (parsed.options[0]) setOption1(parsed.options[0]);
    if (parsed.options[1]) setOption2(parsed.options[1]);
    if (parsed.options[2]) setOption3(parsed.options[2]);
    if (parsed.options[3]) setOption4(parsed.options[3]);
    setCorrectOptionIdx(parsed.correctIdx);
    if (parsed.correctAnswer) setCorrectAnswer(parsed.correctAnswer);
    if (parsed.explanation) setExplanation(parsed.explanation);
    if (parsed.detectedBoard) {
      setBoard(parsed.detectedBoard);
      setCustomBoardMode(false);
    }
    if (parsed.detectedYear) {
      setYear(parsed.detectedYear);
      setCustomYearMode(false);
    }
    if (parsed.detectedChapter) {
      if (DEFAULT_CHAPTERS.includes(parsed.detectedChapter)) {
        setChapter(parsed.detectedChapter);
        setCustomChapterMode(false);
      } else {
        setCustomChapterText(parsed.detectedChapter);
        setCustomChapterMode(true);
      }
    }
    setShowQuickParser(false);
    setRawTextToParse('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (questionType === 'CQ') {
      if (!questionText.trim() && !stimulus.trim() && !diagramUrl.trim()) {
        setErrorMessage(
          isBangla
            ? 'অনুগ্রহ করে সৃজনশীল উদ্দীপক বা চিত্র যোগ করুন।'
            : 'Please enter stimulus text or attach a diagram.'
        );
        return;
      }
    } else {
      if (!questionText.trim() && !diagramUrl.trim()) {
        setErrorMessage(
          isBangla
            ? 'অনুগ্রহ করে মূল প্রশ্ন লিখুন বা চিত্র আপলোড করুন।'
            : 'Please enter question text or attach a diagram.'
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const activeName =
      submitterName.trim() ||
      currentUser?.displayName ||
      currentUser?.email?.split('@')[0] ||
      'অতিথি শিক্ষক';
    const activeSubject = subject === '__CUSTOM__' ? customSubject.trim() || 'General' : subject;
    const activeChapter = (customChapterMode ? customChapterText : chapter).trim();
    const activeBoard = (customBoardMode ? customBoardText : board).trim();
    const activeYear = (customYearMode ? customYearText : year).trim() || '2025';

    // Clean any copied prefix on submit
    const cleanedOptions = [option1, option2, option3, option4]
      .map((opt) => cleanOptionPaste(opt))
      .filter(Boolean);

    const activeCorrectAnswer =
      questionType === 'MCQ'
        ? correctAnswer.trim() || cleanedOptions[correctOptionIdx] || ['ক', 'খ', 'গ', 'ঘ'][correctOptionIdx]
        : correctAnswer.trim();

    const activeQuestionText =
      questionType === 'CQ'
        ? questionText.trim() || stimulus.trim() || 'সৃজনশীল প্রশ্ন'
        : questionText.trim();

    const activeStimulus =
      questionType === 'CQ'
        ? stimulus.trim() || questionText.trim() || undefined
        : stimulus.trim() || undefined;

    const payload: Omit<SubmittedQuestion, 'id' | 'createdAt' | 'status'> = {
      submitterName: activeName,
      submitterEmail: submitterEmail.trim() || undefined,
      submitterPhone: submitterPhone.trim() || undefined,
      classLevel,
      subject: activeSubject,
      chapter: activeChapter || undefined,
      questionType,
      questionText: activeQuestionText,
      stimulus: activeStimulus,
      options: questionType === 'MCQ' ? cleanedOptions : undefined,
      correctAnswer: activeCorrectAnswer || undefined,
      diagramUrl: diagramUrl.trim() || undefined,
      diagramCaption: diagramCaption.trim() || undefined,
      cqParts:
        questionType === 'CQ'
          ? isMathSubject(activeSubject)
            ? {
                partA: { question: partA.trim() || 'ক. প্রশ্ন', marks: 2 },
                partB: { question: partB.trim() || 'খ. প্রশ্ন', marks: 4 },
                partC: { question: partC.trim() || 'গ. প্রশ্ন', marks: 4 },
              }
            : {
                partA: { question: partA.trim() || 'জ্ঞানমূলক প্রশ্ন', marks: 1 },
                partB: { question: partB.trim() || 'অনুধাবনমূলক প্রশ্ন', marks: 2 },
                partC: { question: partC.trim() || 'প্রয়োগমূলক প্রশ্ন', marks: 3 },
                partD: { question: partD.trim() || 'উচ্চতর দক্ষতামূলক প্রশ্ন', marks: 4 },
              }
          : undefined,
      explanation: explanation.trim() || undefined,
      marks: questionType === 'CQ' ? 10 : Number(marks) || 1,
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
      // 1. Submit through submission service (creates Firestore submitted_questions + Admin log)
      const res = await submitPublicQuestion(payload);

      // 2. Also immediately create active QuestionBank item so it's instantly visible & permanent!
      const activeQuestion: Question = {
        id: `q_user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        classLevel,
        subject: activeSubject,
        chapter: activeChapter || 'সাধারণ অধ্যায়',
        questionType,
        questionText: activeQuestionText,
        stimulus: activeStimulus,
        options: questionType === 'MCQ' ? cleanedOptions : undefined,
        correctOptionIndex: questionType === 'MCQ' ? correctOptionIdx : undefined,
        correctAnswer: activeCorrectAnswer || undefined,
        diagramUrl: diagramUrl.trim() || undefined,
        diagramCaption: diagramCaption.trim() || undefined,
        cqParts: payload.cqParts,
        marks: questionType === 'CQ' ? 10 : Number(marks) || 1,
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

      await saveQuestionToCloud(activeQuestion);

      if (onQuestionSubmitted) {
        onQuestionSubmitted(activeQuestion);
      }

      setSubmittedData(res);
    } catch (err: any) {
      console.error('Upload question error:', err);
      setErrorMessage(
        err?.message || (isBangla ? 'প্রশ্ন সেভ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Failed to save question.')
      );
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

  const handleOptionPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
    idx: number
  ) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      // If user pasted a whole multi-line MCQ block into option 1, parse all!
      if (pasted.includes('\n') && (pasted.includes('ক)') || pasted.includes('খ)'))) {
        e.preventDefault();
        const parsed = parseSmartQuestionText(pasted);
        if (parsed.questionText && !questionText) setQuestionText(parsed.questionText);
        if (parsed.options[0]) setOption1(parsed.options[0]);
        if (parsed.options[1]) setOption2(parsed.options[1]);
        if (parsed.options[2]) setOption3(parsed.options[2]);
        if (parsed.options[3]) setOption4(parsed.options[3]);
        return;
      }

      const cleaned = cleanOptionPaste(pasted);
      if (cleaned !== pasted) {
        e.preventDefault();
        setter(cleaned);
        if (correctOptionIdx === idx) {
          setCorrectAnswer(cleaned);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isBangla ? 'সকল প্রকার প্রশ্ন ও চিত্র আপলোড' : 'Upload Question & Diagram'}
              </h3>
              <p className="text-xs text-slate-500">
                {isBangla
                  ? 'MCQ, CQ, SQ, চিত্র/ডায়াগ্রাম, 10⁻¹⁸ ও LaTeX সূত্রসহ স্থায়ীভাবে সংরক্ষণ করুন'
                  : 'Save MCQ, CQ, SQ with diagrams, exponents and LaTeX permanently'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {submittedData ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                {isBangla ? 'প্রশ্নটি সফলভাবে আপলোড ও সেভ হয়েছে!' : 'Question Saved Successfully!'}
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {isBangla
                  ? 'আপনার আপলোড করা প্রশ্নটি স্থায়ীভাবে প্রশ্ন ব্যাংকে এবং ক্লাউড ডাটাবেজে সংরক্ষিত হয়েছে। রিফ্রেশ দিলেও এটি থাকবে এবং যেকেউ প্রশ্নপত্র তৈরিতে ব্যবহার করতে পারবে।'
                  : 'Your question is permanently saved in the Question Bank and cloud database.'}
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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  {isBangla ? '+ আরেকটি প্রশ্ন আপলোড করুন' : '+ Submit Another Question'}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  {isBangla ? 'বন্ধ করুন' : 'Close'}
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

              {/* Submitter Info (optional, auto-populated) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700">
                    {isBangla ? 'আপলোডকারীর তথ্য' : 'Uploader Information'}
                  </div>
                  {currentUser?.email ? (
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-100/70 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                      {currentUser.email}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      সাধারণ ব্যবহারকারী
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isBangla ? 'আপনার নাম (ঐচ্ছিক)' : 'Your Name'}
                    </label>
                    <input
                      type="text"
                      value={submitterName}
                      onChange={(e) => setSubmitterName(e.target.value)}
                      placeholder="শিক্ষক / শিক্ষার্থীর নাম"
                      className="w-full text-xs border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isBangla ? 'ইমেইল (ঐচ্ছিক)' : 'Email'}
                    </label>
                    <input
                      type="email"
                      value={submitterEmail}
                      onChange={(e) => setSubmitterEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full text-xs border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isBangla ? 'মোবাইল (ঐচ্ছিক)' : 'Phone'}
                    </label>
                    <input
                      type="text"
                      value={submitterPhone}
                      onChange={(e) => setSubmitterPhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full text-xs border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Class & Subject & Chapter */}
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
                      {isBangla ? 'অধ্যায় (ঐচ্ছিক)' : 'Chapter'}
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
                      placeholder="e.g. ১ম অধ্যায়: ভৌত রাশি ও পরিমাপ"
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
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="যেমন: পদার্থবিজ্ঞান / পৌরনীতি"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Board & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
                <div className="sm:col-span-5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      {isBangla ? 'বোর্ড / পরীক্ষা (ঐচ্ছিক)' : 'Board'}
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
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-0.5 transition-all active:scale-95 shrink-0"
                      >
                        <span>পরের বছর</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

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

              {/* Question Type & Marks */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {isBangla ? 'প্রশ্নের ধরন (Question Type):' : 'Question Type:'}
                  </label>
                  {questionType === 'MCQ' && (
                    <button
                      type="button"
                      onClick={() => setShowQuickParser(!showQuickParser)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{showQuickParser ? 'ম্যানুয়াল ফর্ম' : '১-ক্লিকে পুরো MCQ পেস্ট করুন'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionType('MCQ');
                      setMarks(1);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      questionType === 'MCQ'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    MCQ (১ নম্বর / বহুনির্বাচনি)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionType('CQ');
                      setMarks(10);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      questionType === 'CQ'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    CQ (১০ নম্বর / সৃজনশীল)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionType('SQ');
                      setMarks(1);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      questionType === 'SQ'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    SQ (১ বা ২ নম্বর / সংক্ষিপ্ত)
                  </button>
                </div>

                {questionType !== 'CQ' && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] font-bold text-slate-600">প্রশ্নের নম্বর (Marks):</span>
                    {[1, 2, 3, 4, 5].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMarks(m)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          marks === m
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fast MCQ Smart Paste Box */}
              {showQuickParser && questionType === 'MCQ' && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      {isBangla ? 'এখানে পুরো প্রশ্ন + অপশন + উত্তর পেস্ট করুন:' : 'Paste Complete MCQ Text:'}
                    </span>
                    <span className="text-[10px] text-indigo-600">বোর্ড, সাল, অধ্যায় ও অপশন অটো আলাদা হবে</span>
                  </div>
                  <textarea
                    rows={5}
                    value={rawTextToParse}
                    onChange={(e) => setRawTextToParse(e.target.value)}
                    placeholder={`ঢাকা বোর্ড ২০২৫ (১ম অধ্যায় - MCQ)\n১. 1 am কত মিটার?\n• ক) 10⁻¹⁸ m\n• খ) 10⁻¹⁵ m\n• গ) 10⁻¹² m\n• ঘ) 10⁻¹⁰ m\n• সঠিক উত্তর: ক) 10⁻¹⁸ m (কারণ ১ অ্যাটোমিটার = 10⁻¹⁸ মিটার)।`}
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
                  rows={2}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={
                    questionType === 'CQ'
                      ? 'এখানে উদ্দীপকের বিস্তারিত বিবরণ লিখুন...'
                      : 'যেমন: 1 am কত মিটার? অথবা নিচের কোন রাশিটি স্কেলার?'
                  }
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Optional Stimulus for MCQ/SQ (e.g. "উদ্দীপকটি পড়ে ১ ও ২ নং প্রশ্নের উত্তর দাও") */}
              {questionType !== 'CQ' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {isBangla ? 'প্রশ্নের উদ্দীপক / অতিরিক্ত বিবরণ (যদি থাকে - ঐচ্ছিক):' : 'Stimulus / Passage (Optional):'}
                  </label>
                  <textarea
                    rows={2}
                    value={stimulus}
                    onChange={(e) => setStimulus(e.target.value)}
                    placeholder="যেমন: একটি বস্তুকে 20 m/s বেগে খাড়া উপরের দিকে নিক্ষেপ করা হলো..."
                    className="w-full text-xs border border-slate-200 rounded-xl p-2 font-bangla focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              )}

              {/* Diagram / Image Upload Section ("চিত্রসহ প্রশ্ন আপলোড") - Available for ALL types! */}
              <div className="bg-blue-50/40 p-3.5 rounded-2xl border border-blue-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>{isBangla ? 'চিত্র / ডায়াগ্রাম আপলোড (সকল প্রশ্নের জন্য)' : 'Diagram / Image Upload'}</span>
                  </label>
                  {!showDiagramInput && (
                    <button
                      type="button"
                      onClick={() => setShowDiagramInput(true)}
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg shadow-2xs transition-colors"
                    >
                      + চিত্র / ছবি যোগ করুন
                    </button>
                  )}
                </div>

                {showDiagramInput && (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors">
                        {isCompressingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span>{isCompressingImage ? 'প্রসেস হচ্ছে...' : 'ডিভাইস থেকে ছবি নিন'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDiagramFileUpload}
                          className="hidden"
                        />
                      </label>

                      <span className="text-[11px] text-slate-500">অথবা লিংক:</span>

                      <input
                        type="url"
                        value={diagramUrl.startsWith('data:') ? '' : diagramUrl}
                        onChange={(e) => setDiagramUrl(e.target.value)}
                        placeholder="https://example.com/diagram.png"
                        className="flex-1 min-w-[180px] text-xs border border-slate-300 rounded-xl p-2 bg-white focus:ring-2 focus:ring-blue-500"
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

                    <input
                      type="text"
                      value={diagramCaption}
                      onChange={(e) => setDiagramCaption(e.target.value)}
                      placeholder="চিত্রের ক্যাপশন (যেমন: চিত্র ১: চল তড়িৎ বর্তনী / জ্যামিতিক চিত্র)"
                      className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white focus:ring-2 focus:ring-blue-500"
                    />

                    {diagramUrl && (
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col items-center">
                        <img
                          src={diagramUrl}
                          alt="Question Diagram Preview"
                          className="max-h-44 max-w-full object-contain rounded-lg"
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
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-xs font-bold text-slate-700">
                      {isBangla ? 'চারটি বিকল্প (Options) ও সঠিক উত্তর:' : 'MCQ Options & Correct Answer:'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (সঠিক উত্তরের পাশের গোল বাটনে ক্লিক করুন)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { label: 'ক', val: option1, setter: setOption1, idx: 0, placeholder: '10⁻¹⁸ m বা \\(10^{-18}\\text{ m}\\)' },
                      { label: 'খ', val: option2, setter: setOption2, idx: 1, placeholder: '10⁻¹⁵ m' },
                      { label: 'গ', val: option3, setter: setOption3, idx: 2, placeholder: '10⁻¹² m' },
                      { label: 'ঘ', val: option4, setter: setOption4, idx: 3, placeholder: '10⁻¹⁰ m' },
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
                            setCorrectAnswer(cleanOptionPaste(val) || label);
                          }}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        <span className="font-bold text-xs text-slate-700 w-5 text-center shrink-0">{label})</span>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => {
                            setter(e.target.value);
                            if (correctOptionIdx === idx) {
                              setCorrectAnswer(cleanOptionPaste(e.target.value));
                            }
                          }}
                          onPaste={(e) => handleOptionPaste(e, setter, idx)}
                          placeholder={placeholder}
                          className="flex-1 min-w-0 text-xs border border-slate-200 rounded-lg p-1.5 bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      সঠিক উত্তর:{' '}
                      <strong className="text-emerald-700 font-bold">
                        {['ক', 'খ', 'গ', 'ঘ'][correctOptionIdx]}
                        {cleanOptionPaste([option1, option2, option3, option4][correctOptionIdx]) && (
                          <span>: {cleanOptionPaste([option1, option2, option3, option4][correctOptionIdx])}</span>
                        )}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {/* SQ Direct Answer */}
              {questionType === 'SQ' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isBangla ? 'সংক্ষিপ্ত প্রশ্নের উত্তর (ঐচ্ছিক):' : 'Short Answer (Optional):'}
                  </label>
                  <textarea
                    rows={2}
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="সংক্ষিপ্ত প্রশ্নের আদর্শ উত্তর..."
                    className="w-full text-xs border border-slate-300 rounded-xl p-2 font-bangla focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* CQ Parts */}
              {questionType === 'CQ' && (() => {
                const activeSubName = subject === '__CUSTOM__' ? customSubject : subject;
                const isMath = isMathSubject(activeSubName);
                return (
                  <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        {isMath
                          ? isBangla
                            ? 'গণিত সৃজনশীল প্রশ্নাবলি (৩টি প্রশ্ন: ক, খ, গ):'
                            : 'Math CQ Sub-questions (3 parts: 2, 4, 4):'
                          : isBangla
                          ? 'সৃজনশীল প্রশ্নাবলি (ক, খ, গ, ঘ):'
                          : 'CQ Sub-questions:'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        {isMath ? 'মানবণ্টন: ২ + ৪ + ৪ = ১০' : 'মানবণ্টন: ১ + ২ + ৩ + ৪ = ১০'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[11px] font-bold text-slate-600">
                          {isMath ? 'ক (২ নম্বর):' : 'ক. জ্ঞানমূলক (১ নম্বর):'}
                        </span>
                        <input
                          type="text"
                          value={partA}
                          onChange={(e) => setPartA(e.target.value)}
                          placeholder="ক. প্রশ্ন..."
                          className="w-full text-xs border border-slate-300 rounded-xl p-2 mt-0.5 bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-600">
                          {isMath ? 'খ (৪ নম্বর):' : 'খ. অনুধাবনমূলক (২ নম্বর):'}
                        </span>
                        <input
                          type="text"
                          value={partB}
                          onChange={(e) => setPartB(e.target.value)}
                          placeholder="খ. প্রশ্ন..."
                          className="w-full text-xs border border-slate-300 rounded-xl p-2 mt-0.5 bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-600">
                          {isMath ? 'গ (৪ নম্বর):' : 'গ. প্রয়োগমূলক (৩ নম্বর):'}
                        </span>
                        <input
                          type="text"
                          value={partC}
                          onChange={(e) => setPartC(e.target.value)}
                          placeholder="গ. প্রশ্ন..."
                          className="w-full text-xs border border-slate-300 rounded-xl p-2 mt-0.5 bg-white"
                        />
                      </div>
                      {!isMath && (
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
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Live Preview Box */}
              {(questionText.trim() || stimulus.trim() || option1 || diagramUrl || partA.trim()) && (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isBangla ? 'লাইভ প্রিভিউ (সূত্র ও চিত্রসহ):' : 'Live Preview:'}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-blue-100 text-xs text-slate-800 space-y-2">
                    {stimulus.trim() && questionType !== 'CQ' && (
                      <div className="p-2 bg-slate-50 rounded-lg border-l-2 border-blue-400 text-slate-700">
                        <MathRenderer content={stimulus} />
                      </div>
                    )}
                    {questionText.trim() && (
                      <div className="font-semibold">
                        <MathRenderer content={questionText} />
                      </div>
                    )}

                    {diagramUrl && (
                      <div className="flex flex-col items-center py-1">
                        <img src={diagramUrl} alt="Diagram" className="max-h-36 object-contain rounded-md" />
                        {diagramCaption && (
                          <span className="text-[10px] text-slate-500 italic mt-0.5">{diagramCaption}</span>
                        )}
                      </div>
                    )}

                    {questionType === 'CQ' && (() => {
                      const activeSubName = subject === '__CUSTOM__' ? customSubject : subject;
                      const isMath = isMathSubject(activeSubName);
                      return (
                        <div className="space-y-1 pt-1 text-slate-700">
                          {partA.trim() && (
                            <div className="flex justify-between gap-2">
                              <span>ক. <MathRenderer content={partA} /></span>
                              <span className="font-bold text-slate-500">[{isMath ? 2 : 1}]</span>
                            </div>
                          )}
                          {partB.trim() && (
                            <div className="flex justify-between gap-2">
                              <span>খ. <MathRenderer content={partB} /></span>
                              <span className="font-bold text-slate-500">[{isMath ? 4 : 2}]</span>
                            </div>
                          )}
                          {partC.trim() && (
                            <div className="flex justify-between gap-2">
                              <span>গ. <MathRenderer content={partC} /></span>
                              <span className="font-bold text-slate-500">[{isMath ? 4 : 3}]</span>
                            </div>
                          )}
                          {!isMath && partD.trim() && (
                            <div className="flex justify-between gap-2">
                              <span>ঘ. <MathRenderer content={partD} /></span>
                              <span className="font-bold text-slate-500">[4]</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {questionType === 'MCQ' && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-slate-700">
                        {[option1, option2, option3, option4].map((opt, idx) =>
                          opt ? (
                            <div key={idx} className={correctOptionIdx === idx ? 'text-emerald-700 font-bold' : ''}>
                              {['ক', 'খ', 'গ', 'ঘ'][idx]}) <MathRenderer content={cleanOptionPaste(opt)} />
                            </div>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Explanation */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {isBangla ? 'ব্যাখ্যা / সমাধান (ঐচ্ছিক):' : 'Explanation / Solution (Optional):'}
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
                  disabled={isSubmitting || isCompressingImage}
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
