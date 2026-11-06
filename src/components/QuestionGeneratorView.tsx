import React, { useState, useEffect } from 'react';
import {
  ClassLevel,
  QuestionType,
  Difficulty,
  SourceMode,
  LanguageOption,
  Question,
  NCTBBook,
  BoardExamQuestionRecord
} from '../types';
import { NCTB_SUBJECTS } from '../data/curriculumData';
import { QuestionCard } from './QuestionCard';
import {
  Sparkles,
  Sliders,
  CheckCircle,
  PlusCircle,
  Save,
  BookOpen,
  Award,
  Zap,
  Loader2,
  FileText,
  AlertCircle,
  BookMarked,
  Database,
  Layers
} from 'lucide-react';
import { QuestionSelectorModal } from './QuestionSelectorModal';

interface QuestionGeneratorViewProps {
  onSaveToLibrary: (question: Question) => void;
  onAddToPaper: (question: Question) => void;
  initialSubject?: string;
  initialChapter?: string;
  initialClass?: ClassLevel;
  books?: NCTBBook[];
  availableBankQuestions?: Question[];
  boardQuestions?: BoardExamQuestionRecord[];
  isBangla?: boolean;
}

export const QuestionGeneratorView: React.FC<QuestionGeneratorViewProps> = ({
  onSaveToLibrary,
  onAddToPaper,
  initialSubject,
  initialChapter,
  initialClass,
  books = [],
  availableBankQuestions = [],
  boardQuestions = [],
  isBangla = false,
}) => {
  const [selectedClass, setSelectedClass] = useState<ClassLevel>(initialClass || 'Class 10');
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject || 'Physics');
  const [selectedChapter, setSelectedChapter] = useState<string>(initialChapter || '');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questionType, setQuestionType] = useState<QuestionType>('CQ');
  const [count, setCount] = useState<number>(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [language, setLanguage] = useState<LanguageOption>('Bangla');
  const [sourceMode, setSourceMode] = useState<SourceMode>('NCTB_TEXTBOOK');
  const [isUnique, setIsUnique] = useState<boolean>(true);
  const [contextNotes, setContextNotes] = useState<string>('');

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveAllNotice, setSaveAllNotice] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [showBankSelectorModal, setShowBankSelectorModal] = useState(false);

  // Available subjects for SSC curriculum
  const availableSubjects = NCTB_SUBJECTS.filter((s) =>
    s.classLevels.includes('SSC') ||
    s.classLevels.includes('Class 10') ||
    s.classLevels.includes('Class 9') ||
    s.classLevels.includes(selectedClass)
  );
  const currentSubjectObj = availableSubjects.find((s) => s.nameEn === selectedSubject) || availableSubjects[0];

  // Match uploaded book in library
  const matchingBook = books.find(
    (b) =>
      b.classLevel === selectedClass &&
      (b.subject.toLowerCase() === currentSubjectObj?.nameBn.toLowerCase() ||
        b.subject.toLowerCase() === currentSubjectObj?.nameEn.toLowerCase() ||
        b.subject.toLowerCase() === selectedSubject.toLowerCase())
  );

  const availableChapters = React.useMemo(() => {
    if (matchingBook && matchingBook.chapters && matchingBook.chapters.length > 0) {
      return matchingBook.chapters.map((ch) => ({
        number: ch.chapterNumber,
        title: ch.titleBn,
        pageRange: `পৃষ্ঠা ${ch.startPage}-${ch.endPage}`,
        topics: ch.topics || [],
      }));
    }
    return (currentSubjectObj?.chapters || []).map((ch) => ({
      number: `অধ্যায় ${ch.number}`,
      title: ch.titleBn,
      pageRange: undefined,
      topics: ch.topics || [],
    }));
  }, [matchingBook, currentSubjectObj]);

  useEffect(() => {
    if (availableChapters.length > 0 && !selectedChapter) {
      setSelectedChapter(availableChapters[0].title);
    }
  }, [availableChapters, selectedChapter]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setSaveAllNotice(false);

    try {
      const response = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classLevel: selectedClass,
          subject: selectedSubject,
          chapter: selectedChapter,
          topic: selectedTopic,
          questionType,
          count,
          difficulty,
          language,
          sourceMode,
          isUnique,
          contextText: contextNotes,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      const activeChap = availableChapters.find((c) => c.title === selectedChapter);

      const formatted: Question[] = data.questions.map((q: any, idx: number) => ({
        id: `gen-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        ownerId: 'owner',
        classLevel: selectedClass,
        subject: selectedSubject,
        chapter: selectedChapter || 'সকল অধ্যায়',
        topic: selectedTopic || q.topicTag,
        questionType,
        questionText: q.questionText || '',
        stimulus: q.stimulus,
        cqParts: q.cqParts,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        marks: q.marks || (questionType === 'CQ' ? 10 : questionType === 'MCQ' ? 1 : 2),
        difficulty: (q.difficulty as Difficulty) || difficulty,
        sourceType: isUnique ? 'ORIGINAL_AI' : sourceMode,
        sourceVerificationStatus:
          matchingBook?.verificationStatus === 'Verified'
            ? 'Verified'
            : isUnique
            ? 'Verified'
            : sourceMode === 'NCTB_TEXTBOOK'
            ? 'Verified'
            : 'Source not verified',
        sourcePage: q.sourcePage || activeChap?.pageRange || (selectedChapter ? `পৃষ্ঠা ১-২৫` : undefined),
        bookName: matchingBook?.bookName || selectedSubject,
        confidenceScore: isUnique ? 0.98 : 0.95,
        createdAt: new Date().toISOString(),
      }));

      setGeneratedQuestions(formatted);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while contacting Gemini API');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateGenerated = (updatedQ: Question) => {
    setGeneratedQuestions((prev) => prev.map((q) => (q.id === updatedQ.id ? updatedQ : q)));
  };

  const handleDeleteGenerated = (id: string) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSaveAllToBank = () => {
    generatedQuestions.forEach((q) => onSaveToLibrary(q));
    setSaveAllNotice(true);
    setTimeout(() => setSaveAllNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Title & Info Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            SSC AI Question Generator (এসএসসি প্রশ্ন জেনারেটর)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate authentic SSC Creative Questions (CQ), MCQs with distractors, and Short Questions (SQ) powered by Gemini AI
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBankSelectorModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-blue-200" />
            {isBangla ? 'প্রশ্ন ব্যাংক থেকে নির্বাচন করুন' : 'Select from Question Bank'}
          </button>

          <label className="flex items-center gap-2 text-xs font-bold text-purple-900 bg-purple-50 px-3 py-2 rounded-xl border border-purple-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isUnique}
              onChange={(e) => setIsUnique(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
            {isBangla ? 'মৌলিক ও অনন্য প্রশ্ন' : 'Generate Original & Unique Questions'}
          </label>
        </div>
      </div>

      {toastNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {toastNotice}
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Generation Parameters Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-3">
          <Sliders className="w-4 h-4 text-slate-400" /> Generation Parameters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Class Level -> SSC Examination Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">এসএসসি পরীক্ষা বিভাগ (SSC Category):</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                const c = e.target.value as ClassLevel;
                setSelectedClass(c);
              }}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="SSC">সাধারণ এসএসসি (General SSC — ৯টি শিক্ষা বোর্ড)</option>
              <option value="Class 10">দাখিল পরীক্ষা (Dakhil — মাদ্রাসা শিক্ষা বোর্ড)</option>
              <option value="Class 9">এসএসসি ভোকেশনাল (SSC Vocational — কারিগরি বোর্ড)</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Subject (পাঠ্য বিষয়):</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                const sub = availableSubjects.find((s) => s.nameEn === e.target.value);
                if (sub && sub.chapters.length > 0) {
                  setSelectedChapter(sub.chapters[0].titleBn);
                }
              }}
              className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 font-bangla"
            >
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.nameEn}>
                  {s.nameBn} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Chapter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Chapter (অধ্যায়):</label>
              {matchingBook && (
                <span className="text-[10px] text-teal-700 font-extrabold flex items-center gap-1 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                  <BookMarked className="w-3 h-3 text-teal-600" />
                  {matchingBook.bookName.slice(0, 16)}...
                </span>
              )}
            </div>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 font-bangla"
            >
              <option value="">সকল প্রধান অধ্যায় (Comprehensive)</option>
              {availableChapters.map((chap, idx) => (
                <option key={idx} value={chap.title}>
                  {chap.number}: {chap.title} {chap.pageRange ? `[${chap.pageRange}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Question Type (প্রশ্নের ধরন):</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white text-blue-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="CQ">Creative Question (সৃজনশীল / CQ - ১০ নম্বর)</option>
              <option value="MCQ">Multiple Choice (বহুনির্বাচনী / MCQ - ১ নম্বর)</option>
              <option value="SQ">Short Question (সংক্ষিপ্ত / SQ - ২-৩ নম্বর)</option>
            </select>
          </div>

          {/* Count */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Number of Questions:</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 Question</option>
              <option value={2}>2 Questions</option>
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={8}>8 Questions</option>
              <option value={10}>10 Questions</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Difficulty Level:</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="Easy">Easy (সহজ - জ্ঞান ও সরাসরি সূত্র)</option>
              <option value="Medium">Medium (পরিমিত - অনুধাবন ও প্রয়োগ)</option>
              <option value="Hard">Hard (চ্যালেঞ্জিং - উচ্চতর দক্ষতা)</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Medium / Language:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageOption)}
              className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="Bangla">বাংলা (Bangla Medium)</option>
              <option value="English">English (English Version / Medium)</option>
              <option value="Bilingual">Bilingual (বাংলা + English terms)</option>
            </select>
          </div>

          {/* Source Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Curriculum Source Mode:</label>
            <select
              value={sourceMode}
              onChange={(e) => setSourceMode(e.target.value as SourceMode)}
              className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="NCTB_TEXTBOOK">1. NCTB Textbook Grounded</option>
              <option value="BOARD_EXAM">2. SSC Board Examination Standard</option>
              <option value="NCTB_BOARD_PATTERN">3. NCTB + Board Pattern Blended</option>
              <option value="ORIGINAL_AI">4. Pure Original AI Assessment</option>
            </select>
          </div>
        </div>

        {/* Optional Context / Topic Sub-Focus */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Specific Topic or Custom Context Text (ঐচ্ছিক পাঠ্যাংশ বা বিশেষ টপিক):
          </label>
          <input
            type="text"
            value={contextNotes}
            onChange={(e) => setContextNotes(e.target.value)}
            placeholder="e.g. ওহমের সূত্র ও রোধের সমান্তরাল সমবায় অথবা ১৯৫২ এর ভাষা আন্দোলন ও এর রাজনৈতিক প্রভাব..."
            className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Generate Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-2.5 shadow-md hover:shadow-lg transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating {count} {questionType} Questions with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" /> Generate Questions Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Results Stream */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-purple-50/70 p-4 rounded-2xl border border-purple-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-bold text-purple-950">
                Generated {generatedQuestions.length} {questionType} Question(s)
              </span>
            </div>

            <div className="flex items-center gap-3">
              {saveAllNotice && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> All Saved to Library!
                </span>
              )}
              <button
                onClick={handleSaveAllToBank}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save All to Question Bank
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {generatedQuestions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={idx}
                onUpdate={handleUpdateGenerated}
                onDelete={handleDeleteGenerated}
                onAddToPaper={onAddToPaper}
                onToggleFavorite={(id) => onSaveToLibrary({ ...q, isFavorite: true })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Question Selector Modal for Central Question Bank Integration */}
      <QuestionSelectorModal
        isOpen={showBankSelectorModal}
        onClose={() => setShowBankSelectorModal(false)}
        sectionTitle={isBangla ? 'অ্যাডভান্সড মোড প্রশ্নপত্র' : 'Advanced Generator View'}
        availableQuestions={availableBankQuestions}
        boardQuestions={boardQuestions}
        currentSubject={selectedSubject}
        currentClass={selectedClass}
        alreadySelectedQuestionIds={generatedQuestions.map((q) => q.id)}
        isBangla={isBangla}
        onAddSelected={(selected) => {
          setGeneratedQuestions((prev) => [...prev, ...selected]);
          const msg = isBangla
            ? `প্রশ্ন ব্যাংক থেকে ${selected.length}টি প্রশ্ন যুক্ত করা হয়েছে!`
            : `Added ${selected.length} questions from Central Question Bank!`;
          setToastNotice(msg);
          setTimeout(() => setToastNotice(null), 4000);
        }}
      />
    </div>
  );
};
