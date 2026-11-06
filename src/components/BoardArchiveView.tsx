import React, { useState } from 'react';
import { BoardExamQuestionRecord, Question, ClassLevel, QuestionType } from '../types';
import { BANGLADESH_BOARDS, BOARD_EXAM_YEARS, NCTB_SUBJECTS } from '../data/curriculumData';
import { MathRenderer } from './MathRenderer';
import {
  Award,
  Search,
  Filter,
  PlusCircle,
  FileCheck,
  CheckCircle,
  BookOpen,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BoardArchiveViewProps {
  boardQuestions: BoardExamQuestionRecord[];
  onAddToPaper: (question: Question) => void;
  onSaveToLibrary: (question: Question) => void;
  onAddBoardQuestion: (record: BoardExamQuestionRecord) => void;
}

export const BoardArchiveView: React.FC<BoardArchiveViewProps> = ({
  boardQuestions,
  onAddToPaper,
  onSaveToLibrary,
  onAddBoardQuestion,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'General SSC' | 'Dakhil' | 'SSC Vocational'>('ALL');
  const [selectedBoard, setSelectedBoard] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<QuestionType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New Question Form state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newBoard, setNewBoard] = useState<string>('Dhaka Board');
  const [newCategory, setNewCategory] = useState<'General SSC' | 'Dakhil' | 'SSC Vocational'>('General SSC');
  const [newYear, setNewYear] = useState<string>('2024');
  const [newClass, setNewClass] = useState<ClassLevel>('SSC');
  const [newSubject, setNewSubject] = useState<string>('Physics');
  const [newChapter, setNewChapter] = useState<string>('কাজ, ক্ষমতা ও শক্তি');
  const [newType, setNewType] = useState<QuestionType>('CQ');
  const [newStimulus, setNewStimulus] = useState<string>('');
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [newMarks, setNewMarks] = useState<number>(10);
  const [newSourceFile, setNewSourceFile] = useState<string>('SSC_Exam_Board_Paper.pdf');

  // Filter questions - Strictly SSC-only with category filtering
  const filtered = boardQuestions.filter((q) => {
    // Only SSC or Class 9-10 questions
    if ((q.classLevel as string) === 'Class 8') return false;

    // Category filter: General SSC, Dakhil, SSC Vocational
    if (selectedCategory !== 'ALL') {
      const isMadrasah = q.boardName.toLowerCase().includes('madrasah') || q.examType.toLowerCase().includes('dakhil') || q.sscCategory === 'Dakhil';
      const isTechnical = q.boardName.toLowerCase().includes('technical') || q.examType.toLowerCase().includes('vocational') || q.sscCategory === 'SSC Vocational';
      
      if (selectedCategory === 'Dakhil' && !isMadrasah) return false;
      if (selectedCategory === 'SSC Vocational' && !isTechnical) return false;
      if (selectedCategory === 'General SSC' && (isMadrasah || isTechnical)) return false;
    }

    if (selectedBoard !== 'ALL' && q.boardName !== selectedBoard) return false;
    if (selectedYear !== 'ALL' && q.examYear !== selectedYear) return false;
    if (selectedSubject !== 'ALL' && q.subject !== selectedSubject) return false;
    if (selectedType !== 'ALL' && q.questionType !== selectedType) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchText = q.questionText.toLowerCase().includes(query);
      const matchStimulus = q.stimulus?.toLowerCase().includes(query);
      const matchChapter = q.chapter.toLowerCase().includes(query);
      if (!matchText && !matchStimulus && !matchChapter) return false;
    }
    return true;
  });

  const handleConvertAndAdd = (record: BoardExamQuestionRecord, target: 'paper' | 'library') => {
    const questionObj: Question = {
      id: `bq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      ownerId: 'owner',
      classLevel: record.classLevel,
      subject: record.subject,
      chapter: record.chapter,
      questionType: record.questionType,
      questionText: record.questionText,
      stimulus: record.stimulus,
      cqParts: record.cqParts,
      options: record.options,
      correctAnswer: record.correctAnswer,
      explanation: record.explanation,
      marks: record.marks,
      difficulty: record.difficulty,
      sourceType: 'BOARD_EXAM',
      boardInfo: {
        boardName: record.boardName,
        year: record.examYear,
        examType: record.examType,
        isVerified: record.isVerified,
      },
      createdAt: new Date().toISOString(),
    };

    if (target === 'paper') {
      onAddToPaper(questionObj);
    } else {
      onSaveToLibrary(questionObj);
    }
  };

  const handleCreateRecord = () => {
    if (!newQuestionText.trim() && !newStimulus.trim()) return;

    const newRecord: BoardExamQuestionRecord = {
      id: `board-custom-${Date.now()}`,
      boardName: newBoard,
      examYear: newYear,
      examType: 'SSC Examination',
      classLevel: newClass,
      subject: newSubject,
      chapter: newChapter,
      questionType: newType,
      questionText: newQuestionText || `${newSubject} Board Question (${newBoard} ${newYear})`,
      stimulus: newStimulus,
      marks: newMarks,
      difficulty: 'Medium',
      isVerified: true,
      sourceFile: newSourceFile,
      createdAt: new Date().toISOString(),
    };

    onAddBoardQuestion(newRecord);
    setShowAddModal(false);
    setNewStimulus('');
    setNewQuestionText('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            Verified Board Question Archive (বাংলাদেশ শিক্ষা বোর্ড আর্কাইভ)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Genuine verified questions from SSC & Junior Board exams (Dhaka, Rajshahi, Cumilla, Chattogram, etc.)
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
        >
          <FileCheck className="w-4 h-4" /> Archive New Board Question
        </button>
      </div>

      {/* 11 BANGLADESH BOARDS STATUS MATRIX (Requirement 2 & Part 2) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            এসএসসি শিক্ষাবোর্ড আর্কাইভ স্ট্যাটাস (SSC Education Board Archive — All 11 Boards)
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            ৯টি সাধারণ বোর্ড • ১টি মাদ্রাসা বোর্ড (Dakhil) • ১টি কারিগরি বোর্ড (Vocational)
          </span>
        </div>

        {/* Category Pills: General SSC / Dakhil / SSC Vocational */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
          <span className="text-xs font-bold text-slate-600 mr-1">পরীক্ষার ক্যাটাগরি:</span>
          {(['ALL', 'General SSC', 'Dakhil', 'SSC Vocational'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedBoard('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL'
                ? 'সকল ক্যাটাগরি (All SSC)'
                : cat === 'General SSC'
                ? 'সাধারণ এসএসসি (General SSC)'
                : cat === 'Dakhil'
                ? 'মাদ্রাসা দাখিল (Dakhil)'
                : 'কারিগরি ভোকেশনাল (SSC Vocational)'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {BANGLADESH_BOARDS.map((board) => {
            const count = boardQuestions.filter(
              (q) => q.boardName === board.nameEn || q.boardName.toLowerCase().includes(board.id)
            ).length;
            const isSelected = selectedBoard === board.nameEn;

            return (
              <button
                key={board.id}
                onClick={() => setSelectedBoard(isSelected ? 'ALL' : board.nameEn)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                    : count > 0
                    ? 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                    : 'border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-slate-900 truncate">
                    {board.nameBn}
                  </span>
                  {count > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      {count}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1 rounded">
                      পেন্ডিং
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">{board.nameEn}</span>
                  {count > 0 ? (
                    <span className="text-emerald-600 font-bold">আর্কাইভড</span>
                  ) : (
                    <span className="text-slate-400">আপলোড অপেক্ষমাণ</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2 md:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Board Selection */}
        <div>
          <select
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Boards (সকল বোর্ড)</option>
            {BANGLADESH_BOARDS.map((b) => (
              <option key={b.id} value={b.nameEn}>
                {b.nameBn} ({b.nameEn})
              </option>
            ))}
          </select>
        </div>

        {/* Year Selection */}
        <div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Years (সকল সন)</option>
            {BOARD_EXAM_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Selection */}
        <div>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Subjects (সকল বিষয়)</option>
            {NCTB_SUBJECTS.map((s) => (
              <option key={s.id} value={s.nameEn}>
                {s.nameBn}
              </option>
            ))}
          </select>
        </div>

        {/* Type Selection */}
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Types (CQ / MCQ / SQ)</option>
            <option value="CQ">Creative Questions (CQ)</option>
            <option value="MCQ">Multiple Choice (MCQ)</option>
            <option value="SQ">Short Questions (SQ)</option>
          </select>
        </div>
      </div>

      {/* Board Questions List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700 text-sm">No board questions match your criteria</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select different boards or examination years to view archived questions.
            </p>
          </div>
        ) : (
          filtered.map((record) => {
            const isExpanded = expandedId === record.id;

            return (
              <div
                key={record.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 font-bangla"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      {record.boardName} • {record.examYear}
                    </span>
                    {/* Explicit Examination Category Indicator (Requirement 2) */}
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        record.boardName.toLowerCase().includes('madrasah') || record.examType.toLowerCase().includes('dakhil')
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : record.boardName.toLowerCase().includes('technical') || record.examType.toLowerCase().includes('vocational')
                          ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-200'
                      }`}
                    >
                      {record.boardName.toLowerCase().includes('madrasah') || record.examType.toLowerCase().includes('dakhil')
                        ? 'দাখিল (Dakhil)'
                        : record.boardName.toLowerCase().includes('technical') || record.examType.toLowerCase().includes('vocational')
                        ? 'ভোকেশনাল (Vocational)'
                        : 'সাধারণ এসএসসি (General SSC)'}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                      {record.subject}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                      {record.questionType}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{record.chapter}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                      [মান: {record.marks}]
                    </span>
                    <button
                      onClick={() => handleConvertAndAdd(record, 'paper')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add to Exam Paper
                    </button>
                    <button
                      onClick={() => handleConvertAndAdd(record, 'library')}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      Save to Bank
                    </button>
                  </div>
                </div>

                {/* Question Body */}
                <div className="space-y-3">
                  {/* Stimulus */}
                  {record.stimulus && (
                    <div className="p-3.5 bg-slate-50 border-l-4 border-emerald-500 rounded-r-xl text-slate-800 text-sm leading-relaxed">
                      <span className="font-bold text-emerald-900 block mb-1 text-xs uppercase tracking-wider">
                        উদ্দীপক / Stimulus:
                      </span>
                      <MathRenderer content={record.stimulus} />
                    </div>
                  )}

                  {/* CQ 4 Parts */}
                  {record.questionType === 'CQ' && record.cqParts && (
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-start text-sm">
                        <span>
                          <strong>ক.</strong> <MathRenderer content={record.cqParts.partA.question} />
                        </span>
                        <span className="font-bold text-slate-500 ml-3">১</span>
                      </div>
                      <div className="flex justify-between items-start text-sm">
                        <span>
                          <strong>খ.</strong> <MathRenderer content={record.cqParts.partB.question} />
                        </span>
                        <span className="font-bold text-slate-500 ml-3">২</span>
                      </div>
                      <div className="flex justify-between items-start text-sm">
                        <span>
                          <strong>গ.</strong> <MathRenderer content={record.cqParts.partC.question} />
                        </span>
                        <span className="font-bold text-slate-500 ml-3">৩</span>
                      </div>
                      <div className="flex justify-between items-start text-sm">
                        <span>
                          <strong>ঘ.</strong> <MathRenderer content={record.cqParts.partD.question} />
                        </span>
                        <span className="font-bold text-slate-500 ml-3">৪</span>
                      </div>
                    </div>
                  )}

                  {/* MCQ Options */}
                  {record.questionType === 'MCQ' && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-900">
                        <MathRenderer content={record.questionText} />
                      </div>
                      {record.options && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {record.options.map((opt, oIdx) => (
                            <div key={oIdx} className="p-2 bg-slate-50 rounded-lg text-xs border border-slate-200">
                              <span className="font-bold mr-1">
                                ({['ক', 'খ', 'গ', 'ঘ'][oIdx] || oIdx + 1})
                              </span>
                              <MathRenderer content={opt} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Accordion for Model Answer */}
                  <div className="pt-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Hide Official Model Answer
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> View Official Model Answer & Marking Scheme
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2 text-xs text-slate-800 animate-fadeIn">
                        {record.questionType === 'CQ' && record.cqParts ? (
                          <div className="space-y-2">
                            <p>
                              <strong>ক-এর উত্তর:</strong> <MathRenderer content={record.cqParts.partA.answer || ''} />
                            </p>
                            <p>
                              <strong>খ-এর উত্তর:</strong> <MathRenderer content={record.cqParts.partB.answer || ''} />
                            </p>
                            <p>
                              <strong>গ-এর উত্তর:</strong> <MathRenderer content={record.cqParts.partC.answer || ''} />
                            </p>
                            <p>
                              <strong>ঘ-এর উত্তর:</strong> <MathRenderer content={record.cqParts.partD.answer || ''} />
                            </p>
                          </div>
                        ) : (
                          <p>
                            <strong>উত্তর:</strong> {record.correctAnswer || record.explanation}
                          </p>
                        )}
                        {record.sourceFile && (
                          <p className="text-[11px] text-slate-500 pt-1 border-t border-emerald-200">
                            Verified Source: {record.sourceFile}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Archive New Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Archive Verified Board Question</h3>
                  <p className="text-xs text-slate-500">Record genuine question papers from SSC or Junior exams</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Education Board:</label>
                  <select
                    value={newBoard}
                    onChange={(e) => setNewBoard(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white"
                  >
                    {BANGLADESH_BOARDS.map((b) => (
                      <option key={b.id} value={b.nameEn}>
                        {b.nameBn} ({b.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Examination Year:</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white"
                  >
                    {BOARD_EXAM_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject:</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white"
                  >
                    {NCTB_SUBJECTS.map((s) => (
                      <option key={s.id} value={s.nameEn}>
                        {s.nameBn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Question Type:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as QuestionType)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white"
                  >
                    <option value="CQ">Creative Question (CQ)</option>
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="SQ">Short Question (SQ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chapter Name:</label>
                <input
                  type="text"
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  উদ্দীপক (Stimulus / Scenario / Data):
                </label>
                <textarea
                  rows={3}
                  value={newStimulus}
                  onChange={(e) => setNewStimulus(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Question Text / Statement:
                </label>
                <textarea
                  rows={2}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRecord}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Save to Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
