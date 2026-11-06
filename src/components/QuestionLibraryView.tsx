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
} from 'lucide-react';

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
  const [newType, setNewType] = useState<QuestionType>('MCQ');
  const [newSubject, setNewSubject] = useState('Physics');
  const [newChapter, setNewChapter] = useState('');
  const [newBoard, setNewBoard] = useState('Dhaka Board');
  const [newYear, setNewYear] = useState('2025');
  const [newMarks, setNewMarks] = useState<number>(1);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '', '', '']);
  const [newCorrectIdx, setNewCorrectIdx] = useState<number>(0);
  const [newAnswer, setNewAnswer] = useState('');
  const [newStimulus, setNewStimulus] = useState('');
  const [newPartA, setNewPartA] = useState('');
  const [newPartB, setNewPartB] = useState('');
  const [newPartC, setNewPartC] = useState('');
  const [newPartD, setNewPartD] = useState('');

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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddQuestion) return;

    const newQ: Question = {
      id: `q-${Date.now()}`,
      classLevel: 'SSC',
      subject: newSubject.trim() || 'Physics',
      chapter: newChapter.trim() || 'অধ্যায় ১',
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
      boardInfo: newBoard
        ? {
            boardName: newBoard,
            year: newYear || '2025',
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Question Type</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const t = e.target.value as QuestionType;
                      setNewType(t);
                      setNewMarks(t === 'CQ' ? 10 : t === 'SQ' ? 2 : 1);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  >
                    <option value="MCQ">MCQ (বহুনির্বাচনী)</option>
                    <option value="SQ">SQ (সংক্ষিপ্ত প্রশ্ন)</option>
                    <option value="CQ">CQ (সৃজনশীল প্রশ্ন)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SSC Subject</label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Physics / পদার্থবিজ্ঞান"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chapter</label>
                  <input
                    type="text"
                    required
                    value={newChapter}
                    onChange={(e) => setNewChapter(e.target.value)}
                    placeholder="অধ্যায় ৪: কাজ, ক্ষমতা ও শক্তি"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bangla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Board (Optional)</label>
                  <input
                    type="text"
                    value={newBoard}
                    onChange={(e) => setNewBoard(e.target.value)}
                    placeholder="Dhaka Board"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year (Optional)</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="2025"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marks</label>
                  <input
                    type="number"
                    value={newType === 'CQ' ? 10 : newMarks}
                    onChange={(e) => setNewMarks(Number(e.target.value))}
                    disabled={newType === 'CQ'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
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
