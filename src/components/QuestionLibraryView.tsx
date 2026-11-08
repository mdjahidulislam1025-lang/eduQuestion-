import React, { useState, useMemo } from 'react';
import {
  Question,
  QuestionType,
  UserRole,
  DynamicClassItem,
  DynamicSubjectItem,
} from '../types';
import { QuestionCard } from './QuestionCard';
import { MathRenderer } from './MathRenderer';
import {
  Library,
  Search,
  CheckSquare,
  Square,
  Plus,
  X,
  FileText,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

export const STANDARD_BOARDS = [
  'Dhaka Board',
  'Rajshahi Board',
  'Dinajpur Board',
  'Cumilla Board',
  'Chattogram Board',
  'Jashore Board',
  'Barishal Board',
  'Sylhet Board',
  'Mymensingh Board',
  'Madrasah Board',
  'Technical Board',
  'All Boards (সকল বোর্ড)',
  'শীর্ষ ক্যাডেট / মডেল স্কুল টেস্ট',
];

export const STANDARD_YEARS = [
  '2027',
  '2026',
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2019',
  '2018',
  '2017',
  '2016',
  '2015',
  '2014',
  '2013',
  '2012',
  '2010',
];

export const DEFAULT_CHAPTERS = [
  '১ম অধ্যায়',
  '২য় অধ্যায়',
  '৩য় অধ্যায়',
  '৪র্থ অধ্যায়',
  '৫ম অধ্যায়',
  '৬ষ্ঠ অধ্যায়',
  '৭ম অধ্যায়',
  '৮ম অধ্যায়',
  '৯ম অধ্যায়',
  '১০ম অধ্যায়',
  '১১শ অধ্যায়',
  '১২শ অধ্যায়',
  '১৩শ অধ্যায়',
  '১৪শ অধ্যায়',
  'সম্পূর্ণ বই / মডেল টেস্ট',
];

export const DEFAULT_SSC_SUBJECTS = [
  'Physics (পদার্থবিজ্ঞান)',
  'Chemistry (রসায়ন)',
  'Biology (জীববিজ্ঞান)',
  'Higher Mathematics (উচ্চতর গণিত)',
  'General Mathematics (সাধারণ গণিত)',
  'Bangla 1st Paper (বাংলা ১ম পত্র)',
  'Bangla 2nd Paper (বাংলা ২য় পত্র)',
  'English 1st Paper (ইংরেজি ১ম পত্র)',
  'English 2nd Paper (ইংরেজি ২য় পত্র)',
  'ICT (তথ্য ও যোগাযোগ প্রযুক্তি)',
  'Bangladesh and Global Studies (বিজিএস)',
  'Accounting (হিসাববিজ্ঞান)',
  'Finance & Banking (ফিন্যান্স ও ব্যাংকিং)',
  'Business Entrepreneurship (ব্যবসায় উদ্যোগ)',
  'Islam and Moral Education (ইসলাম শিক্ষা)',
  'Hindu Religion and Moral Education (হিন্দুধর্ম)',
  'General Science (সাধারণ বিজ্ঞান)',
  'Agricultural Studies (কৃষি শিক্ষা)',
  'Home Science (গার্হস্থ্য বিজ্ঞান)',
];

interface QuestionLibraryViewProps {
  questions: Question[];
  currentUserRole?: UserRole;
  isBangla?: boolean;
  dynamicClasses?: DynamicClassItem[];
  dynamicSubjects?: DynamicSubjectItem[];
  onAddQuestion?: (question: Question) => void;
  onUpdateQuestion: (question: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onAddToPaper: (question: Question) => void;
  onBulkAddToPaper?: (questions: Question[]) => void;
}

export const QuestionLibraryView: React.FC<QuestionLibraryViewProps> = ({
  questions,
  currentUserRole = 'OWNER',
  isBangla = true,
  dynamicClasses = [],
  dynamicSubjects = [],
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddToPaper,
  onBulkAddToPaper,
}) => {
  const isAdminOrOwner = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<QuestionType | 'ALL'>('ALL');
  const [selectedBoard, setSelectedBoard] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete confirmation modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Manual Add Question Modal (Admin/Owner only)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState<QuestionType>('CQ');
  const [newSubject, setNewSubject] = useState('Physics');
  const [customSubjectMode, setCustomSubjectMode] = useState(false);
  const [customSubjectText, setCustomSubjectText] = useState('');

  const [newChapter, setNewChapter] = useState('১ম অধ্যায়');
  const [customChapterMode, setCustomChapterMode] = useState(false);
  const [customChapterText, setCustomChapterText] = useState('');

  const [newBoard, setNewBoard] = useState('Dinajpur Board');
  const [customBoardMode, setCustomBoardMode] = useState(false);
  const [customBoardText, setCustomBoardText] = useState('');

  const [newYear, setNewYear] = useState('2024');
  const [customYearMode, setCustomYearMode] = useState(false);
  const [customYearText, setCustomYearText] = useState('');

  const [newMarks, setNewMarks] = useState<number>(10);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '', '', '']);
  const [newCorrectIdx, setNewCorrectIdx] = useState<number>(0);
  const [newAnswer, setNewAnswer] = useState('');
  const [newStimulus, setNewStimulus] = useState('');
  const [newPartA, setNewPartA] = useState('');
  const [newPartB, setNewPartB] = useState('');
  const [newPartC, setNewPartC] = useState('');
  const [newPartD, setNewPartD] = useState('');

  // Quick Year Stepper: jumps to previous year or next year
  const stepYear = (delta: number) => {
    const currentNum = parseInt(newYear, 10);
    if (!isNaN(currentNum)) {
      const nextNum = currentNum + delta;
      setNewYear(String(nextNum));
      setCustomYearMode(false);
    } else {
      setNewYear('2024');
    }
  };

  // Dynamically derive available categories/subjects from dynamicSubjects + existing questions
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    dynamicSubjects.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    questions.forEach((q) => {
      if (q.subject) set.add(q.subject);
    });
    return Array.from(set).sort();
  }, [dynamicSubjects, questions]);

  const availableChapters = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (selectedSubject === 'ALL' || q.subject === selectedSubject) {
        if (q.chapter) set.add(q.chapter);
      }
    });
    return Array.from(set).sort();
  }, [questions, selectedSubject]);

  const availableBoards = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.boardInfo?.boardName) set.add(q.boardInfo.boardName);
    });
    return Array.from(set).sort();
  }, [questions]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.boardInfo?.year) set.add(q.boardInfo.year);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [questions]);

  // Counts per type
  const mcqCount = useMemo(() => questions.filter((q) => q.questionType === 'MCQ').length, [questions]);
  const sqCount = useMemo(() => questions.filter((q) => q.questionType === 'SQ').length, [questions]);
  const cqCount = useMemo(() => questions.filter((q) => q.questionType === 'CQ').length, [questions]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedSubject !== 'ALL' && q.subject !== selectedSubject) return false;
      if (selectedChapter !== 'ALL' && q.chapter !== selectedChapter) return false;
      if (selectedType !== 'ALL' && q.questionType !== selectedType) return false;
      if (selectedBoard !== 'ALL' && q.boardInfo?.boardName !== selectedBoard) return false;
      if (selectedYear !== 'ALL' && q.boardInfo?.year !== selectedYear) return false;
      if (searchQuery.trim()) {
        const s = searchQuery.toLowerCase();
        const matchText = q.questionText?.toLowerCase().includes(s);
        const matchStimulus = q.stimulus?.toLowerCase().includes(s);
        const matchChapter = q.chapter?.toLowerCase().includes(s);
        const matchSubject = q.subject?.toLowerCase().includes(s);
        if (!matchText && !matchStimulus && !matchChapter && !matchSubject) return false;
      }
      return true;
    });
  }, [questions, selectedSubject, selectedChapter, selectedType, selectedBoard, selectedYear, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (filteredQuestions.length === 0) return;
    const allSelected = filteredQuestions.every((q) => selectedIds.has(q.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const handleBulkAdd = () => {
    if (!onBulkAddToPaper || selectedIds.size === 0) return;
    const selected = questions.filter((q) => selectedIds.has(q.id));
    onBulkAddToPaper(selected);
    setSelectedIds(new Set());
  };

  // List of subject options for modal dropdown (standard + existing)
  const modalSubjectOptions = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_SSC_SUBJECTS.forEach((s) => set.add(s));
    availableSubjects.forEach((s) => set.add(s));
    return Array.from(set);
  }, [availableSubjects]);

  // List of chapter options for modal dropdown
  const modalChapterOptions = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_CHAPTERS.forEach((c) => set.add(c));
    questions.forEach((q) => {
      if (q.chapter) set.add(q.chapter);
    });
    return Array.from(set);
  }, [questions]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddQuestion) return;

    const finalSubject = (customSubjectMode ? customSubjectText : newSubject).trim() || 'Physics';
    const finalChapter = (customChapterMode ? customChapterText : newChapter).trim() || '১ম অধ্যায়';
    const finalBoard = (customBoardMode ? customBoardText : newBoard).trim();
    const finalYear = (customYearMode ? customYearText : newYear).trim() || '2024';

    const newQ: Question = {
      id: `q-${Date.now()}`,
      classLevel: 'SSC',
      subject: finalSubject,
      chapter: finalChapter,
      questionType: newType,
      questionText: newType === 'CQ' ? 'সৃজনশীল প্রশ্ন' : newQuestionText.trim(),
      stimulus: newType === 'CQ' ? newStimulus.trim() : undefined,
      cqParts:
        newType === 'CQ'
          ? {
              partA: { question: newPartA.trim(), marks: 1 },
              partB: { question: newPartB.trim(), marks: 2 },
              partC: { question: newPartC.trim(), marks: 3 },
              partD: { question: newPartD.trim(), marks: 4 },
            }
          : undefined,
      options: newType === 'MCQ' ? newOptions : undefined,
      correctOptionIndex: newType === 'MCQ' ? newCorrectIdx : undefined,
      correctAnswer: newType === 'SQ' ? newAnswer.trim() : undefined,
      marks: newType === 'CQ' ? 10 : Number(newMarks) || 1,
      difficulty: 'Medium',
      sourceType: 'NCTB_BOARD_PATTERN',
      boardInfo: finalBoard
        ? {
            boardName: finalBoard,
            year: finalYear,
            examType: 'SSC Exam',
            isVerified: true,
          }
        : undefined,
      createdAt: new Date().toISOString(),
    };

    onAddQuestion(newQ);
    setShowAddModal(false);
    setNewQuestionText('');
    setNewStimulus('');
    setNewPartA('');
    setNewPartB('');
    setNewPartC('');
    setNewPartD('');
    setNewOptions(['', '', '', '']);
    setNewAnswer('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              {isBangla ? 'এসএসসি প্রশ্ন ব্যাংক (Question Bank)' : 'SSC Question Bank'}
            </h1>
            <p className="text-xs text-slate-500">
              {isBangla
                ? `মোট ${questions.length}টি সংরক্ষিত প্রশ্ন • বিষয়, অধ্যায় ও ধরন অনুযায়ী সাজানো`
                : `${questions.length} stored SSC questions organized by Subject, Chapter, Type, Board & Year`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedIds.size > 0 && onBulkAddToPaper && (
            <button
              onClick={handleBulkAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {isBangla
                ? `প্রশ্নপত্রে যোগ করুন (${selectedIds.size})`
                : `Add to Question Paper (${selectedIds.size})`}
            </button>
          )}

          {isAdminOrOwner && onAddQuestion && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              {isBangla ? 'নতুন প্রশ্ন যোগ করুন' : 'Add Question Manually'}
            </button>
          )}
        </div>
      </div>

      {/* Question Type Tabs (Only show types that exist) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedType('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedType === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isBangla ? `সকল প্রশ্ন (${questions.length})` : `All (${questions.length})`}
        </button>
        {mcqCount > 0 && (
          <button
            onClick={() => setSelectedType('MCQ')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedType === 'MCQ'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isBangla ? `বহুনির্বাচনী - MCQ (${mcqCount})` : `MCQ (${mcqCount})`}
          </button>
        )}
        {sqCount > 0 && (
          <button
            onClick={() => setSelectedType('SQ')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedType === 'SQ'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isBangla ? `সংক্ষিপ্ত প্রশ্ন - SQ (${sqCount})` : `Short Questions (${sqCount})`}
          </button>
        )}
        {cqCount > 0 && (
          <button
            onClick={() => setSelectedType('CQ')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedType === 'CQ'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isBangla ? `সৃজনশীল প্রশ্ন - CQ (${cqCount})` : `Creative Questions (${cqCount})`}
          </button>
        )}
      </div>

      {/* Filters Bar (Only showing subjects, chapters, boards, years that exist) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {isBangla ? 'এসএসসি বিষয়' : 'SSC Subject'}
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedChapter('ALL');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
            >
              <option value="ALL">{isBangla ? 'সকল বিষয়' : 'All Subjects'}</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {isBangla ? 'অধ্যায়' : 'Chapter'}
            </label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
            >
              <option value="ALL">{isBangla ? 'সকল অধ্যায়' : 'All Chapters'}</option>
              {availableChapters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {isBangla ? 'বোর্ড' : 'Board'}
            </label>
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
            >
              <option value="ALL">{isBangla ? 'সকল বোর্ড' : 'All Boards'}</option>
              {availableBoards.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {isBangla ? 'পরীক্ষার সাল' : 'Examination Year'}
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
            >
              <option value="ALL">{isBangla ? 'সকল সাল' : 'All Years'}</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBangla ? 'প্রশ্ন, বিষয় বা অধ্যায় দিয়ে খুঁজুন...' : 'Search questions, subjects, or chapters...'}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={toggleSelectAll}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedIds.has(q.id))
                ? isBangla
                  ? 'নির্বাচন বাতিল করুন'
                  : 'Deselect All'
                : isBangla
                ? 'সবগুলো নির্বাচন করুন'
                : 'Select All'}
            </span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">
              {isBangla ? 'কোনো প্রশ্ন পাওয়া যায়নি' : 'No questions match your filters'}
            </h3>
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isSelected = selectedIds.has(q.id);
            return (
              <div key={q.id} className="flex items-start gap-3">
                <button
                  onClick={() => toggleSelect(q.id)}
                  className="mt-5 text-blue-600 shrink-0"
                  title="Select question"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <QuestionCard
                    question={q}
                    onUpdate={onUpdateQuestion}
                    onDelete={(id) => setDeleteConfirmId(id)}
                    onAddToPaper={onAddToPaper}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                {isBangla ? 'প্রশ্নটি মুছে ফেলবেন?' : 'Delete Question?'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {isBangla
                ? 'আপনি কি নিশ্চিত যে এই প্রশ্নটি প্রশ্ন ব্যাংক থেকে স্থায়ীভাবে মুছে ফেলতে চান?'
                : 'Are you sure you want to permanently delete this question from the Question Bank?'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  onDeleteQuestion(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {isBangla ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Question Modal (Admin Only) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {isBangla ? 'নতুন এসএসসি প্রশ্ন যোগ করুন' : 'Add New SSC Question Manually'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Question Type (ধরন)</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const t = e.target.value as QuestionType;
                      setNewType(t);
                      setNewMarks(t === 'CQ' ? 10 : t === 'SQ' ? 2 : 1);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="MCQ">MCQ (বহুনির্বাচনী)</option>
                    <option value="SQ">SQ (সংক্ষিপ্ত প্রশ্ন)</option>
                    <option value="CQ">CQ (সৃজনশীল প্রশ্ন)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">SSC Subject (বিষয়)</label>
                    <button
                      type="button"
                      onClick={() => setCustomSubjectMode(!customSubjectMode)}
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      {customSubjectMode ? 'তালিকা থেকে পছন্দ' : '+ কাস্টম বিষয়'}
                    </button>
                  </div>
                  {customSubjectMode ? (
                    <input
                      type="text"
                      required
                      value={customSubjectText}
                      onChange={(e) => setCustomSubjectText(e.target.value)}
                      placeholder="যেমন: পৌরনীতি ও সুশাসন"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-blue-50/30 focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      value={newSubject}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setCustomSubjectMode(true);
                        } else {
                          setNewSubject(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    >
                      {modalSubjectOptions.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ কাস্টম বিষয় লিখুন...</option>
                    </select>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Chapter (অধ্যায়)</label>
                    <button
                      type="button"
                      onClick={() => setCustomChapterMode(!customChapterMode)}
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      {customChapterMode ? 'তালিকা থেকে পছন্দ' : '+ কাস্টম অধ্যায়'}
                    </button>
                  </div>
                  {customChapterMode ? (
                    <input
                      type="text"
                      required
                      value={customChapterText}
                      onChange={(e) => setCustomChapterText(e.target.value)}
                      placeholder="অধ্যায় ৪: কাজ, ক্ষমতা ও শক্তি"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs font-bangla bg-blue-50/30 focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      value={newChapter}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setCustomChapterMode(true);
                        } else {
                          setNewChapter(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bangla bg-white font-medium focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    >
                      {modalChapterOptions.map((chap) => (
                        <option key={chap} value={chap}>
                          {chap}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ কাস্টম অধ্যায় লিখুন...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Board, Year, and Marks with Previous/Next Year Stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                {/* Board Dropdown */}
                <div className="sm:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Board (বোর্ড - ঐচ্ছিক)</label>
                    <button
                      type="button"
                      onClick={() => setCustomBoardMode(!customBoardMode)}
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      {customBoardMode ? 'তালিকা থেকে পছন্দ' : '+ কাস্টম'}
                    </button>
                  </div>
                  {customBoardMode ? (
                    <input
                      type="text"
                      value={customBoardText}
                      onChange={(e) => setCustomBoardText(e.target.value)}
                      placeholder="কাস্টম বোর্ড বা স্কুলের নাম"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 text-xs bg-blue-50/30 focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      value={newBoard}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setCustomBoardMode(true);
                        } else {
                          setNewBoard(e.target.value);
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
                <div className="sm:col-span-5 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-2.5 rounded-2xl border border-blue-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Year (পরীক্ষার সাল/বছর)</span>
                    </label>
                    <span className="text-[11px] font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                      {customYearMode ? customYearText || '—' : newYear}
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
                      {/* Previous Year Button */}
                      <button
                        type="button"
                        onClick={() => stepYear(-1)}
                        title="আগের বছর নির্বাচন করুন"
                        className="px-2 py-1.5 bg-white hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold flex items-center gap-0.5 transition-all shadow-2xs active:scale-95 shrink-0"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>আগের বছর</span>
                      </button>

                      {/* Year Dropdown */}
                      <select
                        value={newYear}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setCustomYearMode(true);
                          } else {
                            setNewYear(e.target.value);
                          }
                        }}
                        className="flex-1 px-2 py-1.5 rounded-xl border border-blue-200 text-xs bg-white font-bold text-center text-blue-950 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      >
                        {STANDARD_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                        <option value="__CUSTOM__">+ কাস্টম সাল...</option>
                      </select>

                      {/* Next Year Button */}
                      <button
                        type="button"
                        onClick={() => stepYear(1)}
                        title="পরের বছর নির্বাচন করুন"
                        className="px-2 py-1.5 bg-white hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold flex items-center gap-0.5 transition-all shadow-2xs active:scale-95 shrink-0"
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
                          setNewYear(yr);
                          setCustomYearMode(false);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                          newYear === yr && !customYearMode
                            ? 'bg-blue-600 text-white shadow-2xs scale-105'
                            : 'bg-white/80 text-slate-600 hover:bg-blue-100 hover:text-blue-800 border border-slate-200/80'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Marks with preset buttons */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Marks (নম্বর)</label>
                  {newType === 'CQ' ? (
                    <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>১০ নম্বর</span>
                      <span className="text-[10px] text-slate-500 font-normal">সৃজনশীল নির্ধারিত</span>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={newMarks}
                        onChange={(e) => setNewMarks(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 4, 5, 10].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setNewMarks(m)}
                            className={`flex-1 py-0.5 text-[10px] font-bold rounded-md border transition-all ${
                              newMarks === m
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-200 border-slate-200'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {newType === 'CQ' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">উদ্দীপক (Stimulus) *</label>
                    <textarea
                      rows={3}
                      required
                      value={newStimulus}
                      onChange={(e) => setNewStimulus(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bangla"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ক (জ্ঞানমূলক - ১) *</label>
                      <input
                        type="text"
                        required
                        value={newPartA}
                        onChange={(e) => setNewPartA(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bangla"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">খ (অনুধাবন - ২) *</label>
                      <input
                        type="text"
                        required
                        value={newPartB}
                        onChange={(e) => setNewPartB(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bangla"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">গ (প্রয়োগ - ৩) *</label>
                      <input
                        type="text"
                        required
                        value={newPartC}
                        onChange={(e) => setNewPartC(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bangla"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ঘ (উচ্চতর দক্ষতা - ৪) *</label>
                      <input
                        type="text"
                        required
                        value={newPartD}
                        onChange={(e) => setNewPartD(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bangla"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Question Text *</label>
                    <textarea
                      rows={2}
                      required
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bangla"
                    />
                  </div>

                  {newType === 'MCQ' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {['ক', 'খ', 'গ', 'ঘ'].map((label, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={newCorrectIdx === idx}
                            onChange={() => setNewCorrectIdx(idx)}
                          />
                          <input
                            type="text"
                            required
                            value={newOptions[idx]}
                            onChange={(e) => {
                              const copy = [...newOptions];
                              copy[idx] = e.target.value;
                              setNewOptions(copy);
                            }}
                            placeholder={`অপশন ${label}`}
                            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bangla"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {newType === 'SQ' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Answer (Optional)</label>
                      <textarea
                        rows={2}
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bangla"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
