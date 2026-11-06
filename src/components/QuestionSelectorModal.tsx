import React, { useState, useMemo } from 'react';
import { Question, BoardExamQuestionRecord, ClassLevel, QuestionType } from '../types';
import { NCTB_SUBJECTS, BANGLADESH_BOARDS, BOARD_EXAM_YEARS } from '../data/curriculumData';
import { MathRenderer } from './MathRenderer';
import {
  X,
  Search,
  CheckSquare,
  Square,
  Award,
  BookOpen,
  Plus,
  Layers,
  Filter,
  FileText,
  Check,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface QuestionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string;
  availableQuestions: Question[];
  boardQuestions: BoardExamQuestionRecord[];
  onAddSelected: (questions: Question[]) => void;
  currentSubject?: string;
  currentClass?: ClassLevel | string;
  alreadySelectedQuestionIds?: string[];
  isBangla?: boolean;
}

export const QuestionSelectorModal: React.FC<QuestionSelectorModalProps> = ({
  isOpen,
  onClose,
  sectionTitle,
  availableQuestions,
  boardQuestions,
  onAddSelected,
  currentSubject,
  currentClass,
  alreadySelectedQuestionIds = [],
  isBangla = true,
}) => {
  // Filters
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState<
    'all' | 'verified' | 'nctb' | 'exam_paper' | 'board' | 'ai' | 'pdf'
  >('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(currentClass || 'ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(currentSubject || 'ALL');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<QuestionType | 'ALL'>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');

  // Selected state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Convert board questions into compatible Question format
  const formattedBoardQuestions: Question[] = useMemo(() => {
    return boardQuestions.map((b) => ({
      id: b.id,
      ownerId: 'owner',
      classLevel: b.classLevel,
      subject: b.subject,
      chapter: b.chapter,
      questionType: b.questionType,
      questionText: b.questionText,
      stimulus: b.stimulus,
      cqParts: b.cqParts,
      options: b.options,
      correctAnswer: b.correctAnswer,
      marks: b.marks,
      difficulty: b.difficulty,
      sourceType: 'BOARD_EXAM',
      sourceVerificationStatus: b.isVerified ? 'Verified' : 'Review Required',
      boardInfo: {
        boardName: b.boardName,
        year: b.examYear,
        examType: b.examType,
        isVerified: b.isVerified,
      },
      sources: [
        {
          id: `src-${b.id}`,
          sourceName: `${b.boardName} ${b.examYear}`,
          sourceType: 'BOARD_ARCHIVE',
          institutionOrBoard: b.boardName,
          year: b.examYear,
          examType: b.examType,
          addedAt: b.createdAt,
        },
      ],
      createdAt: b.createdAt,
    }));
  }, [boardQuestions]);

  // Combined master pool
  const masterQuestions = useMemo(() => {
    const bankIds = new Set(availableQuestions.map((q) => q.id));
    const nonDuplicatedBoard = formattedBoardQuestions.filter((b) => !bankIds.has(b.id));
    return [...availableQuestions, ...nonDuplicatedBoard];
  }, [availableQuestions, formattedBoardQuestions]);

  // Unique chapters for current subject
  const availableChapters = useMemo(() => {
    const chapters = new Set<string>();
    masterQuestions.forEach((q) => {
      if (selectedSubjectFilter === 'ALL' || q.subject.toLowerCase() === selectedSubjectFilter.toLowerCase()) {
        if (q.chapter && q.chapter.trim() && q.chapter !== 'সকল অধ্যায়') {
          chapters.add(q.chapter.trim());
        }
      }
    });
    return Array.from(chapters);
  }, [masterQuestions, selectedSubjectFilter]);

  // Filtered pool
  const filtered = useMemo(() => {
    return masterQuestions.filter((q) => {
      // Source Category Filter
      if (selectedSource === 'verified') {
        const isVer =
          q.sourceVerificationStatus === 'Verified' ||
          q.reviewStatus === 'APPROVED' ||
          q.boardInfo?.isVerified === true;
        if (!isVer) return false;
      } else if (selectedSource === 'nctb') {
        const isNctb =
          q.sourceType === 'NCTB_TEXTBOOK' ||
          !!q.bookName ||
          q.sources?.some((s) => s.sourceType === 'NCTB_BOOK');
        if (!isNctb) return false;
      } else if (selectedSource === 'exam_paper') {
        const isExam =
          q.sources?.some((s) => s.sourceType === 'EXAM_PAPER') ||
          q.sourceType === 'NCTB_BOARD_PATTERN';
        if (!isExam) return false;
      } else if (selectedSource === 'board') {
        const isBoard =
          q.sourceType === 'BOARD_EXAM' ||
          !!q.boardInfo ||
          q.sources?.some((s) => s.sourceType === 'BOARD_ARCHIVE');
        if (!isBoard) return false;
      } else if (selectedSource === 'ai') {
        const isAi = q.isAiGenerated || q.sourceType === 'ORIGINAL_AI';
        if (!isAi) return false;
      } else if (selectedSource === 'pdf') {
        const isPdf =
          !!q.sourcePdfId ||
          !!q.sourcePdfTitle ||
          q.sources?.some((s) => s.sourceType === 'ADMIN_PDF');
        if (!isPdf) return false;
      }

      // Class
      if (selectedClassFilter !== 'ALL' && q.classLevel !== selectedClassFilter) return false;

      // Subject
      if (selectedSubjectFilter !== 'ALL' && q.subject.toLowerCase() !== selectedSubjectFilter.toLowerCase())
        return false;

      // Chapter
      if (selectedChapterFilter !== 'ALL') {
        if (!q.chapter || !q.chapter.toLowerCase().includes(selectedChapterFilter.toLowerCase())) {
          return false;
        }
      }

      // Type
      if (selectedTypeFilter !== 'ALL' && q.questionType !== selectedTypeFilter) return false;

      // Year
      if (selectedYearFilter !== 'ALL') {
        const matchBoardYear = q.boardInfo?.year === selectedYearFilter;
        const matchSourceYear = q.sources?.some((s) => s.year === selectedYearFilter);
        if (!matchBoardYear && !matchSourceYear) return false;
      }

      // Search Query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchText = q.questionText.toLowerCase().includes(query);
        const matchStimulus = q.stimulus?.toLowerCase().includes(query);
        const matchChapter = q.chapter?.toLowerCase().includes(query);
        const matchTopic = q.topic?.toLowerCase().includes(query);
        const matchPdf = q.sourcePdfTitle?.toLowerCase().includes(query);
        const matchBook = q.bookName?.toLowerCase().includes(query);
        const matchBoard = q.boardInfo?.boardName.toLowerCase().includes(query);
        const matchSources = q.sources?.some(
          (s) =>
            s.sourceName.toLowerCase().includes(query) ||
            s.institutionOrBoard?.toLowerCase().includes(query)
        );
        const matchOptions = q.options?.some((opt) => opt.toLowerCase().includes(query));
        const matchCq = q.cqParts
          ? q.cqParts.partA.question.toLowerCase().includes(query) ||
            q.cqParts.partB.question.toLowerCase().includes(query) ||
            q.cqParts.partC.question.toLowerCase().includes(query) ||
            q.cqParts.partD.question.toLowerCase().includes(query)
          : false;

        if (
          !matchText &&
          !matchStimulus &&
          !matchChapter &&
          !matchTopic &&
          !matchPdf &&
          !matchBook &&
          !matchBoard &&
          !matchSources &&
          !matchOptions &&
          !matchCq
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    masterQuestions,
    selectedSource,
    selectedClassFilter,
    selectedSubjectFilter,
    selectedChapterFilter,
    selectedTypeFilter,
    selectedYearFilter,
    search,
  ]);

  if (!isOpen) return null;

  // Set of IDs already inside the examination paper
  const existingIdSet = new Set(alreadySelectedQuestionIds);

  const toggleSelect = (q: Question) => {
    if (existingIdSet.has(q.id)) return; // Prevent duplicate selection in the same paper
    const next = new Set(selectedIds);
    if (next.has(q.id)) {
      next.delete(q.id);
    } else {
      next.add(q.id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllFiltered = () => {
    const selectable = filtered.filter((q) => !existingIdSet.has(q.id));
    if (selectedIds.size === selectable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map((q) => q.id)));
    }
  };

  // Calculate total marks of currently selected questions
  const totalSelectedMarks = useMemo(() => {
    let sum = 0;
    masterQuestions.forEach((q) => {
      if (selectedIds.has(q.id)) {
        sum += q.marks || (q.questionType === 'CQ' ? 10 : q.questionType === 'SQ' ? 2 : 1);
      }
    });
    return sum;
  }, [masterQuestions, selectedIds]);

  const handleConfirm = () => {
    const selected = masterQuestions.filter((q) => selectedIds.has(q.id));
    onAddSelected(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-6 font-bangla">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              {isBangla ? 'প্রশ্ন ব্যাংক থেকে পরীক্ষা পত্রে নির্বাচন' : 'Select from Central Question Bank'}
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              {isBangla
                ? `টার্গেট সেকশন: "${sectionTitle}" • সংরক্ষিত প্রশ্ন ব্যাংক ও বোর্ড আর্কাইভ থেকে প্রশ্ন চয়ন করুন`
                : `Target Section: "${sectionTitle}" • Select and reuse pre-verified questions`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3 font-sans">
          {/* Top Source Switcher & Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedSource('all')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  selectedSource === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isBangla ? 'সকল প্রশ্ন' : 'All Sources'} ({masterQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource('verified')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  selectedSource === 'verified'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✓ {isBangla ? 'যাচাইকৃত' : 'Verified'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource('nctb')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  selectedSource === 'nctb'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📖 {isBangla ? 'NCTB পাঠ্যবই' : 'NCTB Books'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource('exam_paper')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  selectedSource === 'exam_paper'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📝 {isBangla ? 'স্কুল/টেস্ট পরীক্ষা' : 'Exam Papers'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource('board')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  selectedSource === 'board'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏛️ {isBangla ? 'বোর্ড পরীক্ষা' : 'Board Archive'} ({boardQuestions.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource('ai')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  selectedSource === 'ai'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✨ {isBangla ? 'মৌলিক এআই' : 'AI-Generated'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource('pdf')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  selectedSource === 'pdf'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📄 {isBangla ? 'পিডিএফ নথি' : 'From PDFs'}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isBangla ? 'কী-ওয়ার্ড বা উদ্দীপক খুঁজুন...' : 'Search questions, chapter, topic...'}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bangla"
              />
            </div>
          </div>

          {/* Quick Dropdown Filters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            <div>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 font-semibold"
              >
                <option value="ALL">{isBangla ? 'সকল শ্রেণি' : 'All Classes'}</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
              </select>
            </div>

            <div>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 font-semibold font-bangla"
              >
                <option value="ALL">{isBangla ? 'সকল বিষয়' : 'All Subjects'}</option>
                {NCTB_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.nameEn}>
                    {isBangla ? s.nameBn : s.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedChapterFilter}
                onChange={(e) => setSelectedChapterFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 font-semibold font-bangla"
              >
                <option value="ALL">{isBangla ? 'সকল অধ্যায়' : 'All Chapters'}</option>
                {availableChapters.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedTypeFilter}
                onChange={(e: any) => setSelectedTypeFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 font-semibold"
              >
                <option value="ALL">{isBangla ? 'সকল ধরন' : 'All Types'}</option>
                <option value="CQ">সৃজনশীল (CQ)</option>
                <option value="MCQ">বহুনির্বাচনী (MCQ)</option>
                <option value="SQ">সংক্ষিপ্ত (SQ)</option>
              </select>
            </div>

            <div>
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 font-semibold"
              >
                <option value="ALL">{isBangla ? 'সকল বছর' : 'All Years'}</option>
                {BOARD_EXAM_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Stats & Select All */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <button
              onClick={handleSelectAllFiltered}
              className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-blue-600 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>{isBangla ? 'দৃশ্যমান সব নির্বাচন করুন' : 'Select All Filtered'}</span>
            </button>
            <span className="font-semibold">
              {isBangla
                ? `${filtered.length} টি প্রশ্ন পাওয়া গেছে`
                : `${filtered.length} questions matching`}
            </span>
          </div>
        </div>

        {/* Question Selector List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 font-bangla">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p>{isBangla ? 'ফিল্টারের সাথে মিলে এমন কোনো প্রশ্ন পাওয়া যায়নি।' : 'No matching questions found in selected source.'}</p>
            </div>
          ) : (
            filtered.map((q) => {
              const isChecked = selectedIds.has(q.id);
              const isAlreadyInPaper = existingIdSet.has(q.id);

              return (
                <div
                  key={q.id}
                  onClick={() => !isAlreadyInPaper && toggleSelect(q)}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    isAlreadyInPaper
                      ? 'border-slate-200 bg-slate-100/60 opacity-60 cursor-not-allowed'
                      : isChecked
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs cursor-pointer ring-1 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer shadow-2xs'
                  }`}
                >
                  <div className="mt-1 text-blue-600 shrink-0 font-sans">
                    {isAlreadyInPaper ? (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                        {isBangla ? 'যুক্ত আছে' : 'In Paper'}
                      </span>
                    ) : isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    {/* Top Metadata Badges */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-sans">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        {q.questionType}
                      </span>
                      <span className="text-blue-700 font-bold font-bangla">{q.subject}</span>
                      <span className="text-slate-500 font-bangla">• {q.chapter}</span>

                      {/* Source Citation Badges */}
                      {q.boardInfo && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          🏛️ {q.boardInfo.boardName} {q.boardInfo.year}
                        </span>
                      )}
                      {q.sourcePdfTitle && (
                        <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-full font-bold text-[10px] truncate max-w-[150px]">
                          📄 {q.sourcePdfTitle}
                        </span>
                      )}
                      {q.timesUsed !== undefined && q.timesUsed > 0 && (
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          ব্যবহৃত: {q.timesUsed} বার
                        </span>
                      )}

                      <span className="font-extrabold text-slate-800 ml-auto bg-slate-100 px-2 py-0.5 rounded">
                        [{q.marks || (q.questionType === 'CQ' ? 10 : 2)} মার্কস]
                      </span>
                    </div>

                    {/* Stimulus / Uddipok for CQ */}
                    {q.stimulus && (
                      <div className="text-xs text-slate-800 bg-slate-50 border-l-3 border-blue-500 p-2.5 rounded-r-xl line-clamp-3 leading-relaxed">
                        <span className="font-bold text-blue-900 block mb-0.5 text-[10px] uppercase">উদ্দীপক:</span>
                        <MathRenderer content={q.stimulus} />
                      </div>
                    )}

                    {/* Question Statement */}
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                      <MathRenderer content={q.questionText} />
                    </div>

                    {/* CQ 4 Parts Snippet */}
                    {q.questionType === 'CQ' && q.cqParts && (
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700 pt-1">
                        <div className="truncate">ক. <MathRenderer content={q.cqParts.partA.question} /></div>
                        <div className="truncate">খ. <MathRenderer content={q.cqParts.partB.question} /></div>
                        <div className="truncate">গ. <MathRenderer content={q.cqParts.partC.question} /></div>
                        <div className="truncate">ঘ. <MathRenderer content={q.cqParts.partD.question} /></div>
                      </div>
                    )}

                    {/* MCQ Options Snippet */}
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pt-1">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="truncate">
                            <span className="font-bold">{['ক', 'খ', 'গ', 'ঘ'][oIdx] || `${oIdx + 1}.`}</span> <MathRenderer content={opt} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Marks Total & Add Button */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between font-sans">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-800">
              {isBangla ? `${selectedIds.size} টি প্রশ্ন নির্বাচিত` : `${selectedIds.size} questions selected`}
            </span>
            {selectedIds.size > 0 && (
              <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                {isBangla ? `মোট মান: ${totalSelectedMarks}` : `Total Marks: ${totalSelectedMarks}`}
              </span>
            )}
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              {isBangla
                ? `নির্বাচিত প্রশ্ন যোগ করুন (${selectedIds.size})`
                : `Add Selected Questions (${selectedIds.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
