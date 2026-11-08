import React, { useState } from 'react';
import {
  DynamicClassItem,
  DynamicSubjectItem,
  QuestionType,
  SubmittedQuestion,
} from '../types';
import { submitPublicQuestion, ADMIN_EMAIL } from '../services/submissionService';
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
}

export const SubmitQuestionModal: React.FC<SubmitQuestionModalProps> = ({
  isOpen,
  onClose,
  dynamicClasses,
  dynamicSubjects,
  currentUser,
  isBangla = true,
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
  const [year, setYear] = useState('2024');
  const [customYearMode, setCustomYearMode] = useState(false);
  const [customYearText, setCustomYearText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('MCQ');

  const stepYear = (delta: number) => {
    const currentNum = parseInt(year, 10);
    if (!isNaN(currentNum)) {
      setYear(String(currentNum + delta));
      setCustomYearMode(false);
    } else {
      setYear('2024');
    }
  };

  React.useEffect(() => {
    if (currentUser?.email) {
      setSubmitterEmail(currentUser.email);
    }
    if (currentUser?.displayName) {
      setSubmitterName(currentUser.displayName);
    }
  }, [currentUser, isOpen]);

  // Question details
  const [questionText, setQuestionText] = useState('');
  const [stimulus, setStimulus] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');
  const [option4, setOption4] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');

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
    const activeYear = (customYearMode ? customYearText : year).trim() || '2024';

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
      options:
        questionType === 'MCQ'
          ? [option1.trim(), option2.trim(), option3.trim(), option4.trim()].filter(Boolean)
          : undefined,
      correctAnswer: correctAnswer.trim() || undefined,
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
      const res = await submitPublicQuestion(payload);
      setSubmittedData(res);
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
                {isBangla ? 'প্রশ্ন আপলোড ও জমা দিন' : 'Upload & Submit Educational Question'}
              </h3>
              <p className="text-xs text-slate-500">
                {isBangla
                  ? 'আপনার প্রশ্নটি সরাসরি অ্যাডমিনের জিমেইলে নোটিফিকেশন হিসেবে পৌঁছে যাবে'
                  : `Notification will be automatically sent to Admin (${ADMIN_EMAIL})`}
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
                {isBangla ? 'প্রশ্নটি সফলভাবে জমা হয়েছে!' : 'Question Submitted Successfully!'}
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {isBangla
                  ? `আপনার দেওয়া প্রশ্নটি ক্লাউডে সংরক্ষিত হয়েছে এবং অ্যাডমিনের জিমেইলে (${ADMIN_EMAIL}) নোটিফিকেশন পাঠানো হয়েছে। অ্যাডমিন পর্যালোচনা করে প্রশ্ন ব্যাংকে এটি অনুমোদন করবেন।`
                  : `Your question has been securely recorded and dispatched to Admin (${ADMIN_EMAIL}) for review.`}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={submittedData.gmailComposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {isBangla ? 'অ্যাডমিনকে জিমেইলে সরাসরি জানান' : 'Open in Gmail to Notify Admin'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  {isBangla ? '+ আরেকটি প্রশ্ন জমা দিন' : '+ Submit Another Question'}
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
                      placeholder="e.g. কামাল হোসেন / শিক্ষক"
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

                {/* Year with Auto-Stepper: [← আগের বছর] [2024] [পরের বছর →] */}
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
                        placeholder="যেমন: 2024"
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
                    {['2026', '2025', '2024', '2023', '2022', '2020'].map((yr) => (
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isBangla ? 'প্রশ্নের ধরন (Question Type):' : 'Question Type:'}
                </label>
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

              {/* Question Text / Stimulus */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {questionType === 'CQ'
                    ? isBangla
                      ? 'সৃজনশীল উদ্দীপক (Stimulus) *'
                      : 'Stimulus Scenario *'
                    : isBangla
                    ? 'মূল প্রশ্ন (Question Text) *'
                    : 'Question Text *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={
                    questionType === 'CQ'
                      ? 'এখানে উদ্দীপকের বিবরণ লিখুন...'
                      : 'প্রশ্নের মূল বাক্য লিখুন...'
                  }
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* MCQ Options */}
              {questionType === 'MCQ' && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-700">
                    {isBangla ? 'চারটি বিকল্প (Options):' : 'MCQ Options:'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={option1}
                      onChange={(e) => setOption1(e.target.value)}
                      placeholder="ক. প্রথম বিকল্প"
                      className="text-xs border border-slate-300 rounded-xl p-2 bg-white"
                    />
                    <input
                      type="text"
                      value={option2}
                      onChange={(e) => setOption2(e.target.value)}
                      placeholder="খ. দ্বিতীয় বিকল্প"
                      className="text-xs border border-slate-300 rounded-xl p-2 bg-white"
                    />
                    <input
                      type="text"
                      value={option3}
                      onChange={(e) => setOption3(e.target.value)}
                      placeholder="গ. তৃতীয় বিকল্প"
                      className="text-xs border border-slate-300 rounded-xl p-2 bg-white"
                    />
                    <input
                      type="text"
                      value={option4}
                      onChange={(e) => setOption4(e.target.value)}
                      placeholder="ঘ. চতুর্থ বিকল্প"
                      className="text-xs border border-slate-300 rounded-xl p-2 bg-white"
                    />
                  </div>
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {isBangla ? 'সঠিক উত্তর (ঐচ্ছিক):' : 'Correct Answer (Optional):'}
                    </label>
                    <input
                      type="text"
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      placeholder="যেমন: খ / সঠিক উত্তরের টেক্সট"
                      className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white"
                    />
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

              {/* Additional Explanation */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {isBangla ? 'উত্তরমালা বা ব্যাখ্যা (ঐচ্ছিক):' : 'Answer Key / Explanation (Optional):'}
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="সংক্ষিপ্ত সমাধান বা উত্তর..."
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
                      ? 'জমা হচ্ছে...'
                      : 'Submitting...'
                    : isBangla
                    ? 'প্রশ্ন জমা দিন ও অ্যাডমিনকে পাঠান'
                    : 'Submit Question to Admin'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
