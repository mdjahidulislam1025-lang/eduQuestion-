import React, { useState, useEffect } from 'react';
import {
  ClassLevel,
  Difficulty,
  LanguageOption,
  Question,
  QuestionPaper,
  Workspace,
  NCTBBook,
  AdminPdfDocument,
  UserRole,
  BoardExamQuestionRecord
} from '../types';
import { NCTB_SUBJECTS } from '../data/curriculumData';
import { MathRenderer } from './MathRenderer';
import { QuestionSelectorModal } from './QuestionSelectorModal';
import { downloadExamPaperPdf, printExamPaperIsolated } from '../services/pdfPrintService';
import {
  Zap,
  Sparkles,
  Printer,
  Layers,
  BookOpen,
  Library,
  CheckCircle,
  HelpCircle,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  X,
  FileText,
  AlertCircle,
  Loader2,
  BookMarked,
  Download
} from 'lucide-react';

interface EasyModeViewProps {
  onSaveToQuestionBank: (questions: Question[]) => void;
  onOpenInPaperBuilder: (paper: QuestionPaper) => void;
  workspace: Workspace;
  isBangla?: boolean;
  initialPresetType?: 'MCQ' | 'SQ' | 'CQ' | 'Mixed';
  nctbBooks?: NCTBBook[];
  adminPdfs?: AdminPdfDocument[];
  currentUserRole?: UserRole;
  availableBankQuestions?: Question[];
  boardQuestions?: BoardExamQuestionRecord[];
}

interface EasyModePreferences {
  classLevel: ClassLevel;
  subject: string;
  chapter: string;
  questionType: 'MCQ' | 'SQ' | 'CQ' | 'Mixed';
  count: number;
  difficulty: Difficulty | 'Mixed';
  language: LanguageOption;
  includeAnswers: boolean;
  includeExplanations: boolean;
  isUnique: boolean;
}

const PREF_KEY = 'edu_easy_mode_prefs';

export const EasyModeView: React.FC<EasyModeViewProps> = ({
  onSaveToQuestionBank,
  onOpenInPaperBuilder,
  workspace,
  isBangla = true,
  initialPresetType,
  nctbBooks = [],
  adminPdfs = [],
  currentUserRole = 'OWNER',
  availableBankQuestions = [],
  boardQuestions = [],
}) => {
  // Load saved preferences or defaults
  const savedPrefs = (() => {
    try {
      const data = localStorage.getItem(PREF_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  const [showBankSelectorModal, setShowBankSelectorModal] = useState(false);

  // Question Source State
  const [questionSource, setQuestionSource] = useState<'NCTB_BOOKS' | 'ADMIN_PDFS' | 'BOTH'>('NCTB_BOOKS');
  const [selectedAdminPdfId, setSelectedAdminPdfId] = useState<string>('');

  const [selectedClass, setSelectedClass] = useState<ClassLevel>(
    savedPrefs?.classLevel || 'Class 10'
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(
    savedPrefs?.subject || 'Physics'
  );
  const [selectedChapter, setSelectedChapter] = useState<string>(
    savedPrefs?.chapter || ''
  );
  const [questionType, setQuestionType] = useState<'MCQ' | 'SQ' | 'CQ' | 'Mixed'>(
    initialPresetType || savedPrefs?.questionType || 'MCQ'
  );
  const [count, setCount] = useState<number>(savedPrefs?.count || 10);
  const [customCount, setCustomCount] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Optional settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty | 'Mixed'>(
    savedPrefs?.difficulty || 'Medium'
  );
  const [language, setLanguage] = useState<LanguageOption>(
    savedPrefs?.language || 'Bangla'
  );
  const [includeAnswers, setIncludeAnswers] = useState<boolean>(
    savedPrefs?.includeAnswers ?? true
  );
  const [includeExplanations, setIncludeExplanations] = useState<boolean>(
    savedPrefs?.includeExplanations ?? true
  );
  const [isUnique, setIsUnique] = useState<boolean>(savedPrefs?.isUnique ?? true);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Inline editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editDraftText, setEditDraftText] = useState('');
  const [editDraftStimulus, setEditDraftStimulus] = useState('');

  // Success notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PDF / Print Modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPrintMode, setPdfPrintMode] = useState<'paper' | 'paper_and_answers' | 'answers_only'>('paper');
  const [examTitle, setExamTitle] = useState('শ্রেণি মূল্যায়ন পরীক্ষা ২০২৬');
  const [examDuration, setExamDuration] = useState('৪০ মিনিট');

  // Filter subjects for SSC curriculum
  const availableSubjects = NCTB_SUBJECTS.filter((s) =>
    s.classLevels.includes('SSC') ||
    s.classLevels.includes('Class 10') ||
    s.classLevels.includes('Class 9') ||
    s.classLevels.includes(selectedClass)
  );
  const currentSubjectObj =
    availableSubjects.find((s) => s.nameEn === selectedSubject) ||
    availableSubjects[0] ||
    NCTB_SUBJECTS[0];

  const [selectedTextbookId, setSelectedTextbookId] = useState<string>('');

  // Books available for this class from NCTB Book Library
  const classBooks = nctbBooks.filter((b) => b.classLevel === selectedClass);
  const matchingBook = classBooks.find(
    (b) =>
      (selectedTextbookId && b.id === selectedTextbookId) ||
      b.subject.toLowerCase() === currentSubjectObj.nameBn.toLowerCase() ||
      b.subject.toLowerCase() === currentSubjectObj.nameEn.toLowerCase()
  ) || classBooks[0];

  // Available chapters from verified NCTB textbook or fallback to curriculum syllabus
  const availableChapters = React.useMemo(() => {
    if (matchingBook && matchingBook.chapters && matchingBook.chapters.length > 0) {
      return matchingBook.chapters.map((ch) => ({
        number: ch.chapterNumber,
        title: ch.titleBn,
        pageRange: `পৃষ্ঠা ${ch.startPage}-${ch.endPage}`,
        topics: ch.topics || [],
      }));
    }
    return currentSubjectObj.chapters.map((ch) => ({
      number: `অধ্যায় ${ch.number}`,
      title: ch.titleBn,
      pageRange: undefined,
      topics: ch.topics || [],
    }));
  }, [matchingBook, currentSubjectObj]);

  // Admin PDFs accessible to the current user for this class
  const accessibleAdminPdfs = React.useMemo(() => {
    return (adminPdfs || []).filter((doc) => {
      if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
        if (doc.accessLevel === 'OWNER_ONLY' || doc.accessLevel === 'ADMIN_ONLY') return false;
      }
      if (doc.classLevel !== 'All Classes' && doc.classLevel !== selectedClass) return false;
      return true;
    });
  }, [adminPdfs, currentUserRole, selectedClass]);

  // Auto-adjust subject & chapter if class changes
  useEffect(() => {
    if (!availableSubjects.some((s) => s.nameEn === selectedSubject)) {
      if (availableSubjects[0]) {
        setSelectedSubject(availableSubjects[0].nameEn);
        if (availableSubjects[0].chapters[0]) {
          setSelectedChapter(availableSubjects[0].chapters[0].titleBn);
        }
      }
    }
  }, [selectedClass]);

  // Auto-adjust chapter if subject changes
  useEffect(() => {
    if (availableChapters.length > 0) {
      if (!availableChapters.some((c) => c.title === selectedChapter)) {
        setSelectedChapter(availableChapters[0].title);
      }
    } else {
      setSelectedChapter('');
    }
  }, [selectedSubject, availableChapters]);

  // Persist preferences to localStorage
  useEffect(() => {
    const prefs: EasyModePreferences = {
      classLevel: selectedClass,
      subject: selectedSubject,
      chapter: selectedChapter,
      questionType,
      count,
      difficulty,
      language,
      includeAnswers,
      includeExplanations,
      isUnique,
    };
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save easy mode prefs', e);
    }
  }, [
    selectedClass,
    selectedSubject,
    selectedChapter,
    questionType,
    count,
    difficulty,
    language,
    includeAnswers,
    includeExplanations,
    isUnique,
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Quick Preset handler
  const handleApplyPreset = (preset: {
    type: 'MCQ' | 'SQ' | 'CQ' | 'Mixed';
    count: number;
    title: string;
  }) => {
    setQuestionType(preset.type);
    setCount(preset.count);
    setCustomCount('');
    showToast(`${preset.title} preset loaded!`);
  };

  // Main Generation Handler
  const handleGenerate = async (overrideParams?: {
    type?: 'MCQ' | 'SQ' | 'CQ' | 'Mixed';
    count?: number;
  }) => {
    const targetType = overrideParams?.type || questionType;
    const targetCount = overrideParams?.count || count;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      let response;
      const targetPdf = accessibleAdminPdfs.find((p) => p.id === selectedAdminPdfId) || accessibleAdminPdfs[0];

      if (questionSource === 'ADMIN_PDFS' && targetPdf) {
        response = await fetch('/api/gemini/generate-from-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfTitle: targetPdf.title,
            pdfId: targetPdf.id,
            chunks: targetPdf.extractedChunks || [],
            selectionMode: 'entire',
            questionType: targetType,
            count: targetCount,
            difficulty: difficulty === 'Mixed' ? 'Medium' : difficulty,
            language,
            classLevel: selectedClass,
            subject: currentSubjectObj.nameEn,
            marks: targetType === 'CQ' ? 10 : 2,
            includeAnswers,
            includeExplanations,
            includePageReferences: true,
          }),
        });
      } else {
        response = await fetch('/api/gemini/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classLevel: selectedClass,
            subject: currentSubjectObj.nameEn,
            chapter: selectedChapter,
            topic: selectedTopic || currentSubjectObj.chapters.find((c) => c.titleBn === selectedChapter)?.topics[0] || '',
            questionType: targetType,
            count: targetCount,
            difficulty: difficulty === 'Mixed' ? 'Medium' : difficulty,
            language,
            sourceMode: questionSource === 'BOTH' ? 'NCTB_BOARD_PATTERN' : 'NCTB_TEXTBOOK',
            isUnique,
            contextText: targetPdf?.extractedChunks?.map((c) => c.content).join('\n') || '',
          }),
        });
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate questions. Please retry.');
      }

      const activeChapter = availableChapters.find((c) => c.title === selectedChapter);

      const formatted: Question[] = (data.questions || []).map(
        (q: any, idx: number) => ({
          id: `easy-q-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          classLevel: selectedClass,
          subject: currentSubjectObj.nameEn,
          chapter: selectedChapter || 'সকল অধ্যায়',
          topic: q.topicTag || selectedTopic,
          questionType: q.questionType || (targetType === 'Mixed' ? 'MCQ' : targetType),
          questionText: q.questionText || '',
          stimulus: q.stimulus || '',
          cqParts: q.cqParts,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          marks: q.marks || (q.questionType === 'CQ' ? 10 : q.questionType === 'SQ' ? 2 : 1),
          difficulty: q.difficulty || (difficulty === 'Mixed' ? 'Medium' : difficulty),
          sourceType: questionSource === 'ADMIN_PDFS' ? 'ORIGINAL_AI' : 'NCTB_TEXTBOOK',
          sourcePdfTitle: targetPdf?.title,
          sourcePdfId: targetPdf?.id,
          sourcePage: q.sourcePage || (targetPdf ? 'Page reference unavailable' : activeChapter?.pageRange || undefined),
          bookName: targetPdf?.title || matchingBook?.bookName || `${currentSubjectObj.nameBn} পাঠ্যবই`,
          sourceVerificationStatus: matchingBook?.verificationStatus === 'Verified' ? 'Verified' : 'Review Required',
          createdAt: new Date().toISOString(),
        })
      );

      setGeneratedQuestions(formatted);
      setSelectedIds(new Set(formatted.map((q) => q.id)));
      showToast(
        isBangla
          ? `${formatted.length}টি প্রশ্ন সফলভাবে তৈরি হয়েছে!`
          : `Generated ${formatted.length} questions successfully!`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred while contacting AI generator.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate single question
  const handleRegenerateSingle = async (questionId: string) => {
    const qIndex = generatedQuestions.findIndex((q) => q.id === questionId);
    if (qIndex === -1) return;
    const targetQ = generatedQuestions[qIndex];

    setRegeneratingId(questionId);
    try {
      const response = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classLevel: targetQ.classLevel,
          subject: targetQ.subject,
          chapter: targetQ.chapter,
          questionType: targetQ.questionType,
          count: 1,
          difficulty: targetQ.difficulty,
          language,
          sourceMode: 'ORIGINAL_AI',
          isUnique: true,
        }),
      });

      const data = await response.json();
      if (data.success && data.questions && data.questions[0]) {
        const fresh = data.questions[0];
        const updatedQ: Question = {
          ...targetQ,
          id: `easy-q-${Date.now()}-regen`,
          questionText: fresh.questionText,
          stimulus: fresh.stimulus || '',
          cqParts: fresh.cqParts,
          options: fresh.options,
          correctOptionIndex: fresh.correctOptionIndex,
          correctAnswer: fresh.correctAnswer,
          explanation: fresh.explanation,
          marks: fresh.marks || targetQ.marks,
        };

        const updatedList = [...generatedQuestions];
        updatedList[qIndex] = updatedQ;
        setGeneratedQuestions(updatedList);

        if (selectedIds.has(questionId)) {
          const nextSet = new Set(selectedIds);
          nextSet.delete(questionId);
          nextSet.add(updatedQ.id);
          setSelectedIds(nextSet);
        }

        showToast(isBangla ? 'প্রশ্নটি পরিবর্তন করা হয়েছে!' : 'Question regenerated!');
      }
    } catch (err: any) {
      showToast(err.message || 'Regeneration failed');
    } finally {
      setRegeneratingId(null);
    }
  };

  // Reorder questions
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= generatedQuestions.length) return;

    const list = [...generatedQuestions];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setGeneratedQuestions(list);
  };

  // Delete question
  const handleDeleteQuestion = (id: string) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast(isBangla ? 'প্রশ্ন মুছে ফেলা হয়েছে' : 'Question removed');
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === generatedQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(generatedQuestions.map((q) => q.id)));
    }
  };

  // Inline editing commit
  const handleStartEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditDraftText(q.questionText);
    setEditDraftStimulus(q.stimulus || '');
  };

  const handleSaveEdit = (qId: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? { ...q, questionText: editDraftText, stimulus: editDraftStimulus }
          : q
      )
    );
    setEditingQuestionId(null);
    showToast(isBangla ? 'প্রশ্ন আপডেট হয়েছে' : 'Question updated');
  };

  // Save selected to Question Bank
  const handleSaveSelectedToBank = () => {
    const toSave = generatedQuestions.filter((q) => selectedIds.has(q.id));
    if (toSave.length === 0) {
      showToast(isBangla ? 'অনুগ্রহ করে প্রশ্ন নির্বাচন করুন' : 'Please select at least one question');
      return;
    }
    onSaveToQuestionBank(toSave);
    showToast(
      isBangla
        ? `${toSave.length}টি প্রশ্ন প্রশ্ন ব্যাংকে সংরক্ষিত হয়েছে!`
        : `Saved ${toSave.length} questions to Question Bank!`
    );
  };

  // Transfer to Advanced Paper Builder
  const handleTransferToBuilder = () => {
    const activeQList = generatedQuestions.filter((q) =>
      selectedIds.size > 0 ? selectedIds.has(q.id) : true
    );
    if (activeQList.length === 0) {
      showToast(isBangla ? 'কোনো প্রশ্ন পাওয়া যায়নি' : 'No questions to build paper');
      return;
    }

    const totalMarks = activeQList.reduce((acc, q) => acc + (q.marks || 1), 0);

    const newPaper: QuestionPaper = {
      id: `paper-easy-${Date.now()}`,
      ownerId: 'owner',
      title: `${currentSubjectObj.nameBn} - ${examTitle}`,
      institutionName: workspace.institutionName || 'মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ',
      institutionAddress: workspace.institutionAddress || 'ঢাকা, বাংলাদেশ',
      classLevel: selectedClass,
      subject: `${currentSubjectObj.nameBn} (${currentSubjectObj.nameEn})`,
      subjectCode: currentSubjectObj.code,
      totalMarks,
      duration: examDuration,
      examDate: new Date().toLocaleDateString('bn-BD'),
      instructions: [
        '১. ডান পাশের সংখ্যা প্রশ্নের পূর্ণমান নির্দেশক।',
        '২. সকল প্রশ্নের উত্তর দেওয়া আবশ্যক।',
      ],
      watermarkText: workspace.watermarkText || 'EduQuestion AI',
      watermarkOpacity: workspace.watermarkOpacity || 0.08,
      watermarkPosition: workspace.watermarkPosition || 'diagonal',
      sections: [
        {
          id: `sec-easy-${Date.now()}`,
          titleBn: 'ক-বিভাগ: মূল পরীক্ষা প্রশ্নাবলী',
          titleEn: 'Section A: Examination Questions',
          instructions: `মোট প্রশ্ন: ${activeQList.length}টি | পূর্ণমান: ${totalMarks}`,
          questions: activeQList,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    onOpenInPaperBuilder(newPaper);
  };

  // Calculate active questions & total marks
  const activeQuestions = generatedQuestions.filter((q) =>
    selectedIds.size > 0 ? selectedIds.has(q.id) : true
  );
  const totalCalculatedMarks = activeQuestions.reduce(
    (acc, q) => acc + (q.marks || (q.questionType === 'CQ' ? 10 : 1)),
    0
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white p-6 sm:p-7 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-cyan-200 text-xs font-bold mb-3 border border-white/20">
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            {isBangla ? 'ইজি মোড — দ্রুত প্রশ্ন ও PDF' : 'Easy Mode — Fast Generator'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isBangla
              ? 'ঝটপট প্রশ্ন তৈরি করুন ও সরাসরি প্রিন্ট / PDF ডাউনলোড করুন'
              : 'Generate Questions & Download Print-Ready PDF in Minutes'}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
            {isBangla
              ? 'শ্রেণি, বিষয় ও অধ্যায় সিলেক্ট করে এক ক্লিকে MCQ, SQ বা সৃজনশীল প্রশ্ন তৈরি করুন। তাৎক্ষণিক সম্পাদনা করে সরাসরি A4 ফরম্যাটে প্রিন্ট নিন।'
              : 'Pick Class, Subject, and Chapter to quickly generate MCQ, Short, or Creative questions with verified answer keys.'}
          </p>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/15 text-xs">
            <span className="text-blue-200 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> {isBangla ? 'কুইক প্রিসেট:' : 'Quick Presets:'}
            </span>
            <button
              onClick={() => handleApplyPreset({ type: 'MCQ', count: 10, title: '10 MCQ' })}
              className="px-3 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-white font-medium transition-colors"
            >
              ⚡ 10 MCQ
            </button>
            <button
              onClick={() => handleApplyPreset({ type: 'MCQ', count: 20, title: '20 MCQ Model' })}
              className="px-3 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-white font-medium transition-colors"
            >
              🎯 20 MCQ
            </button>
            <button
              onClick={() => handleApplyPreset({ type: 'CQ', count: 4, title: '4 CQ Test' })}
              className="px-3 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-white font-medium transition-colors"
            >
              📝 4 CQ (৪০ মার্ক)
            </button>
            <button
              onClick={() => handleApplyPreset({ type: 'CQ', count: 7, title: '7 CQ Full' })}
              className="px-3 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-white font-medium transition-colors"
            >
              🏆 7 CQ (৭০ মার্ক)
            </button>
            <button
              onClick={() => handleApplyPreset({ type: 'Mixed', count: 10, title: 'Mixed Exam' })}
              className="px-3 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-white font-medium transition-colors"
            >
              🔮 Mixed Exam (MCQ+SQ+CQ)
            </button>
            <button
              type="button"
              onClick={() => setShowBankSelectorModal(true)}
              className="px-3.5 py-1 bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-400/40 text-emerald-200 rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Library className="w-3.5 h-3.5 text-emerald-300" />
              {isBangla ? 'প্রশ্ন ব্যাংক থেকে নির্বাচন' : 'Select from Question Bank'}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Large Action Cards (Presets) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            type: 'MCQ' as const,
            titleBn: 'বহুনির্বাচনী প্রশ্ন (MCQ)',
            titleEn: 'Multiple Choice (MCQ)',
            subtitleBn: '৪টি অপশন ও সঠিক উত্তর',
            color: 'border-blue-200 bg-blue-50/60 text-blue-900',
            activeColor: 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20',
            icon: CheckCircle,
          },
          {
            type: 'SQ' as const,
            titleBn: 'সংক্ষিপ্ত প্রশ্ন (SQ)',
            titleEn: 'Short Questions (SQ)',
            subtitleBn: '২-৩ মার্কের অনুধাবনমূলক প্রশ্ন',
            color: 'border-indigo-200 bg-indigo-50/60 text-indigo-900',
            activeColor: 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20',
            icon: HelpCircle,
          },
          {
            type: 'CQ' as const,
            titleBn: 'সৃজনশীল প্রশ্ন (CQ)',
            titleEn: 'Creative Questions (CQ)',
            subtitleBn: 'উদ্দীপকসহ ক, খ, গ, ঘ (১০ মার্ক)',
            color: 'border-amber-200 bg-amber-50/60 text-amber-900',
            activeColor: 'border-amber-600 bg-amber-600 text-white shadow-md shadow-amber-500/20',
            icon: FileText,
          },
          {
            type: 'Mixed' as const,
            titleBn: 'সমন্বিত পরীক্ষা (Mixed)',
            titleEn: 'Mixed Assessment',
            subtitleBn: 'MCQ, SQ এবং CQ এর সমন্বয়',
            color: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
            activeColor: 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
            icon: Sparkles,
          },
        ].map((item) => {
          const isSelected = questionType === item.type;
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              onClick={() => {
                setQuestionType(item.type);
                if (item.type === 'CQ' && count > 10) setCount(4);
              }}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                isSelected ? item.activeColor : `${item.color} hover:border-blue-400 hover:shadow-xs`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-xs'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {isSelected && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-blue-700">
                    Selected
                  </span>
                )}
              </div>
              <div className="font-bold text-sm sm:text-base leading-snug">
                {isBangla ? item.titleBn : item.titleEn}
              </div>
              <div
                className={`text-[11px] mt-1 ${
                  isSelected ? 'text-white/80' : 'text-slate-500'
                }`}
              >
                {item.subtitleBn}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Single-Page Generator Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              1
            </span>
            <h2 className="font-bold text-slate-800 text-base">
              {isBangla ? 'পাঠ্যক্রম ও প্রশ্ন নির্বাচন' : 'Curriculum & Question Setup'}
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {isBangla ? 'এনসিটিবি পাঠ্যক্রম অনুমোদিত' : 'NCTB Curriculum Verified'}
          </span>
        </div>

        {/* Question Source Toggle: NCTB Books | Admin Uploaded PDFs | Both */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              {isBangla ? 'প্রশ্নের উৎস নির্বাচন (Question Source):' : 'Question Source Selection:'}
            </label>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-xs">
              <button
                type="button"
                onClick={() => setQuestionSource('NCTB_BOOKS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  questionSource === 'NCTB_BOOKS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📚 {isBangla ? 'NCTB পাঠ্যবই' : 'NCTB Books'}
              </button>
              <button
                type="button"
                onClick={() => setQuestionSource('ADMIN_PDFS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  questionSource === 'ADMIN_PDFS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📄 {isBangla ? 'অ্যাডমিন আপলোডকৃত PDF' : 'Admin Uploaded PDFs'}
              </button>
              <button
                type="button"
                onClick={() => setQuestionSource('BOTH')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  questionSource === 'BOTH'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✨ {isBangla ? 'উভয় উৎস (Both)' : 'Both Sources'}
              </button>
            </div>
          </div>

          {/* Accessible Admin PDF Selector if Admin or Both is selected */}
          {questionSource !== 'NCTB_BOOKS' && (
            <div className="pt-2 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 shrink-0">
                {isBangla ? 'নির্দিষ্ট PDF নির্বাচন করুন:' : 'Select Specific Admin PDF:'}
              </span>
              <select
                value={selectedAdminPdfId}
                onChange={(e) => setSelectedAdminPdfId(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {accessibleAdminPdfs.length > 0
                    ? isBangla
                      ? 'সকল উপলব্ধ অ্যাডমিন PDF থেকে (যেকোনো উপযুক্ত)'
                      : 'All Available Workspace PDFs'
                    : isBangla
                    ? 'কোনো অনুমোদিত PDF পাওয়া যায়নি'
                    : 'No accessible PDFs for this class'}
                </option>
                {accessibleAdminPdfs.map((pdf) => (
                  <option key={pdf.id} value={pdf.id}>
                    {pdf.title} ({pdf.category} • {pdf.subject})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SSC Examination Category Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isBangla ? 'এসএসসি ক্যাটাগরি (SSC Category)' : 'SSC Examination'} <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-center">
              {[
                { id: 'SSC' as ClassLevel, labelBn: 'সাধারণ SSC', labelEn: 'General SSC' },
                { id: 'Class 10' as ClassLevel, labelBn: 'দাখিল', labelEn: 'Dakhil' },
                { id: 'Class 9' as ClassLevel, labelBn: 'ভোকেশনাল', labelEn: 'Vocational' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClass(c.id)}
                  className={`py-2 px-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    selectedClass === c.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {isBangla ? c.labelBn : c.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isBangla ? 'বিষয় (Subject)' : 'Subject'} <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.nameEn}>
                  {sub.nameBn} ({sub.nameEn}) - কোড: {sub.code}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isBangla ? 'অধ্যায় (Chapter)' : 'Chapter'} <span className="text-rose-500">*</span>
              </label>
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">
                {isBangla ? 'সকল মূল অধ্যায় (পুরো বই)' : 'All Core Chapters (Full Book)'}
              </option>
              {availableChapters.map((ch, idx) => (
                <option key={idx} value={ch.title}>
                  {ch.number}: {ch.title} {ch.pageRange ? `[${ch.pageRange}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Question Count Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isBangla ? 'প্রশ্নের সংখ্যা (Count)' : 'Questions Count'} <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-1.5">
              {[5, 10, 15, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setCount(num);
                    setCustomCount('');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    count === num && !customCount
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {num}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="50"
                placeholder="অন্যান্য"
                value={customCount}
                onChange={(e) => {
                  setCustomCount(e.target.value);
                  const parsed = parseInt(e.target.value);
                  if (parsed > 0) setCount(parsed);
                }}
                className={`w-16 px-2 py-2 rounded-xl text-xs font-bold border text-center ${
                  customCount ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200 bg-slate-50'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Settings */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isBangla ? 'ঐচ্ছিক ও উন্নত সেটিংস' : 'Optional & Advanced Settings'}</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs animate-in fade-in">
              {/* Difficulty */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  {isBangla ? 'কঠিন্যের মাত্রা (Difficulty)' : 'Difficulty'}
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800"
                >
                  <option value="Easy">Easy (সহজ - ৪০% জ্ঞান/অনুধাবন)</option>
                  <option value="Medium">Medium (মাঝারি - আদর্শ বোর্ড মান)</option>
                  <option value="Hard">Hard (কঠিন - উচ্চতর দক্ষতা ও বিশ্লেষণ)</option>
                  <option value="Mixed">Mixed (মিশ্রিত - ৫০% সহজ, ৩০% মাঝারি, ২০% কঠিন)</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  {isBangla ? 'ভাষা (Language)' : 'Language'}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800"
                >
                  <option value="Bangla">বাংলা (Bangla Version)</option>
                  <option value="English">English (English Version)</option>
                  <option value="Bilingual">দ্বিভাষিক (Bilingual Technical Terms)</option>
                </select>
              </div>

              {/* Topic */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  {isBangla ? 'সুনির্দিষ্ট টপিক (ঐচ্ছিক)' : 'Specific Topic (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="যেমন: গতির সমীকরণ, ত্বরণ..."
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Checkbox Toggles */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAnswers}
                    onChange={(e) => setIncludeAnswers(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">
                    {isBangla ? 'উত্তরমালা অন্তর্ভুক্ত করুন' : 'Include Answer Key'}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExplanations}
                    onChange={(e) => setIncludeExplanations(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">
                    {isBangla ? 'ব্যাখ্যা ও সমাধান যোগ করুন' : 'Include Explanations'}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnique}
                    onChange={(e) => setIsUnique(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-blue-700">
                    {isBangla ? 'মৌলিক ও নতুন প্রশ্ন (Original AI)' : 'Original Unique Questions'}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Generate Button Area */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>
              {isBangla ? 'নির্বাচিত বিষয়:' : 'Selected:'}{' '}
              <strong className="text-slate-800">{currentSubjectObj.nameBn}</strong> •{' '}
              {selectedChapter || 'সকল অধ্যায়'} •{' '}
              <strong className="text-blue-700">{count}টি প্রশ্ন ({questionType})</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {generatedQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                {isBangla ? 'পুনরায় তৈরি করুন' : 'Generate Again'}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className="px-7 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-extrabold flex items-center gap-2.5 shadow-lg shadow-blue-500/25 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isBangla ? 'প্রশ্ন তৈরি হচ্ছে (AI)...' : 'Generating Questions...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>
                    {isBangla
                      ? `ঝটপট ${count}টি প্রশ্ন তৈরি করুন`
                      : `Generate ${count} Questions Now`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong>{isBangla ? 'ত্রুটি ঘটেছে:' : 'Error:'}</strong> {errorMsg}
            </div>
          </div>
        )}
      </div>

      {/* Generated Questions Section (shows immediately below) */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-4">
          {/* Action Toolbar above question list */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === generatedQuestions.length &&
                    generatedQuestions.length > 0
                  }
                  onChange={handleSelectAll}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>
                  {isBangla ? 'সবগুলো নির্বাচন করুন' : 'Select All'} ({selectedIds.size}/
                  {generatedQuestions.length})
                </span>
              </label>

              <span className="text-slate-300">|</span>

              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                {isBangla ? 'মোট নম্বর:' : 'Total Marks:'} {totalCalculatedMarks}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveSelectedToBank}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-blue-600" />
                {isBangla ? 'প্রশ্ন ব্যাংকে সংরক্ষণ' : 'Save to Bank'}
              </button>

              <button
                type="button"
                onClick={handleTransferToBuilder}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                {isBangla ? 'অ্যাডভান্সড বিল্ডারে খুলুন' : 'Open in Paper Builder'}
              </button>

              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                {isBangla ? 'এক ক্লিকে PDF ডাউনলোড / প্রিন্ট' : 'One-Click Download / Print PDF'}
              </button>
            </div>
          </div>

          {/* Question List Cards */}
          <div className="space-y-4">
            {generatedQuestions.map((q, idx) => {
              const isSelected = selectedIds.has(q.id);
              const isEditing = editingQuestionId === q.id;
              const isRegenerating = regeneratingId === q.id;

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-blue-400 shadow-xs ring-1 ring-blue-500/10'
                      : 'border-slate-200 opacity-60'
                  }`}
                >
                  {/* Card Header */}
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(q.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-extrabold text-xs text-slate-800">
                        {isBangla ? `প্রশ্ন ${idx + 1}` : `Q#${idx + 1}`}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-700">
                        {q.questionType}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {q.marks} {isBangla ? 'নম্বর' : 'Marks'}
                      </span>
                      {q.difficulty && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {q.difficulty}
                        </span>
                      )}

                      {/* Source Citation Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        <BookOpen className="w-3 h-3 text-teal-600" />
                        <span>{q.bookName || q.subject}</span>
                        <span>•</span>
                        <span>{q.sourcePage ? `পৃষ্ঠা ${q.sourcePage}` : 'Page reference unavailable'}</span>
                      </span>
                    </div>

                    {/* Action buttons per question */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, 'down')}
                        disabled={idx === generatedQuestions.length - 1}
                        title="Move Down"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateSingle(q.id)}
                        disabled={isRegenerating}
                        title="Regenerate this question with AI"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCcw
                          className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => (isEditing ? handleSaveEdit(q.id) : handleStartEdit(q))}
                        title="Edit question text"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        {isEditing ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Edit3 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        title="Delete question"
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3.5 text-slate-800">
                    {/* Editing Form */}
                    {isEditing ? (
                      <div className="space-y-3 text-xs">
                        {q.stimulus !== undefined && (
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">
                              উদ্দীপক (Stimulus):
                            </label>
                            <textarea
                              rows={2}
                              value={editDraftStimulus}
                              onChange={(e) => setEditDraftStimulus(e.target.value)}
                              className="w-full p-2 border rounded-xl font-medium"
                            />
                          </div>
                        )}
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">
                            মূল প্রশ্ন (Question Text):
                          </label>
                          <textarea
                            rows={2}
                            value={editDraftText}
                            onChange={(e) => setEditDraftText(e.target.value)}
                            className="w-full p-2 border rounded-xl font-medium"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(q.id)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingQuestionId(null)}
                            className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Stimulus (উদ্দীপক) if present */}
                        {q.stimulus && (
                          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-slate-800 leading-relaxed">
                            <span className="font-bold text-blue-900 block mb-1">
                              উদ্দীপক / দৃশ্যপট:
                            </span>
                            <MathRenderer content={q.stimulus} />
                          </div>
                        )}

                        {/* Question Text */}
                        <div className="text-sm font-semibold leading-relaxed">
                          <MathRenderer content={q.questionText} />
                        </div>

                        {/* MCQ Options */}
                        {q.questionType === 'MCQ' && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = q.correctOptionIndex === oIdx;
                              const optionLabels = ['ক', 'খ', 'গ', 'ঘ'];
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                                    isCorrect && includeAnswers
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span className="font-bold shrink-0">
                                    {optionLabels[oIdx] || String.fromCharCode(65 + oIdx)}.
                                  </span>
                                  <div className="flex-1">
                                    <MathRenderer content={opt} />
                                  </div>
                                  {isCorrect && includeAnswers && (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* CQ Parts (ক, খ, গ, ঘ) */}
                        {q.questionType === 'CQ' && q.cqParts && (
                          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                            {[
                              { label: 'ক (জ্ঞানমূলক)', part: q.cqParts.partA, mark: 1 },
                              { label: 'খ (অনুধাবনমূলক)', part: q.cqParts.partB, mark: 2 },
                              { label: 'গ (প্রয়োগমূলক)', part: q.cqParts.partC, mark: 3 },
                              { label: 'ঘ (উচ্চতর দক্ষতামূলক)', part: q.cqParts.partD, mark: 4 },
                            ].map((pItem, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="font-medium text-slate-800">
                                    <span className="font-bold text-blue-700 mr-1.5">
                                      {pItem.label}:
                                    </span>
                                    <MathRenderer content={pItem.part?.question || ''} />
                                  </div>
                                  <span className="font-bold text-slate-500 shrink-0">
                                    [{pItem.mark}]
                                  </span>
                                </div>
                                {includeAnswers && pItem.part?.answer && (
                                  <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[11px] text-emerald-800">
                                    <span className="font-bold">নমুনা উত্তর: </span>
                                    <MathRenderer content={pItem.part.answer} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* SQ Answer */}
                        {q.questionType === 'SQ' && includeAnswers && q.correctAnswer && (
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                            <span className="font-bold block mb-0.5">আদর্শ উত্তর (Model Answer):</span>
                            <MathRenderer content={q.correctAnswer} />
                          </div>
                        )}

                        {/* Explanation */}
                        {includeExplanations && q.explanation && (
                          <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                            <span className="font-bold block mb-0.5">ব্যাখ্যা (Explanation):</span>
                            <MathRenderer content={q.explanation} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Floating PDF Download Bar */}
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-bold text-base flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>
                  {isBangla
                    ? `${activeQuestions.length}টি প্রশ্ন প্রস্তুত (${totalCalculatedMarks} নম্বর)`
                    : `${activeQuestions.length} questions ready (${totalCalculatedMarks} marks)`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBangla
                  ? 'সরাসরি প্রিন্ট বা PDF ডাউনলোড করুন অথবা প্রশ্ন ব্যাংকে সংরক্ষণ করুন'
                  : 'Ready for instant print / PDF download or export to Question Bank'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveSelectedToBank}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 inline mr-1.5" />
                {isBangla ? 'সংরক্ষণ করুন' : 'Save Questions'}
              </button>

              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-white" />
                {isBangla ? 'PDF ডাউনলোড / প্রিন্ট করুন' : 'Download / Print PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONE-CLICK PDF PRINT / DOWNLOAD MODAL */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {isBangla ? 'পরীক্ষার প্রশ্নপত্র প্রিন্ট ও PDF প্রস্তুতি' : 'Exam Paper Print & PDF'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    A4 Page Ready • Bangla Typography • KaTeX Equations
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Settings Bar */}
            <div className="no-print p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">প্রিন্ট মোড (Output Mode):</label>
                <select
                  value={pdfPrintMode}
                  onChange={(e) => setPdfPrintMode(e.target.value as any)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800"
                >
                  <option value="paper">১. শুধুমাত্র প্রশ্নপত্র (Question Paper Only)</option>
                  <option value="paper_and_answers">২. প্রশ্নপত্র + উত্তরপত্র (Paper + Answers)</option>
                  <option value="answers_only">৩. শুধুমাত্র উত্তরপত্র (Answer Key Only)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">পরীক্ষার নাম (Exam Title):</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">পরীক্ষার সময় (Duration):</label>
                <input
                  type="text"
                  value={examDuration}
                  onChange={(e) => setExamDuration(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Printable Preview Container */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100 flex justify-center">
              <div
                id="easy-printable-paper"
                className="bg-white w-full max-w-[794px] min-h-[1123px] p-8 sm:p-12 shadow-md border border-slate-200 relative text-slate-900 font-serif-bangla leading-relaxed"
              >
                {/* Optional Watermark */}
                {workspace.watermarkText && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none z-0">
                    <span
                      style={{
                        opacity: workspace.watermarkOpacity || 0.08,
                        transform:
                          workspace.watermarkPosition === 'diagonal'
                            ? 'rotate(-35deg)'
                            : 'none',
                      }}
                      className="text-5xl sm:text-7xl font-black text-slate-800 uppercase tracking-widest text-center"
                    >
                      {workspace.watermarkText}
                    </span>
                  </div>
                )}

                {/* Relative Wrapper for Paper Content */}
                <div className="relative z-10 space-y-5">
                  {/* Institutional Header */}
                  <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                    {workspace.logoUrl && (
                      <div className="flex justify-center mb-1">
                        <img
                          src={workspace.logoUrl}
                          alt="Logo"
                          className="h-14 w-auto object-contain"
                        />
                      </div>
                    )}
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 font-serif-bangla">
                      {workspace.institutionName || 'মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ'}
                    </h2>
                    {workspace.institutionAddress && (
                      <p className="text-xs text-slate-600 font-sans">
                        {workspace.institutionAddress}
                      </p>
                    )}
                    <div className="inline-block px-4 py-0.5 mt-1 border-y border-slate-800 text-sm font-bold text-slate-900">
                      {examTitle}
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-2 text-slate-800 font-sans">
                      <div>
                        শ্রেণি: <span className="font-semibold">{selectedClass}</span>
                      </div>
                      <div>
                        বিষয়: <span className="font-semibold">{currentSubjectObj.nameBn}</span> (কোড: {currentSubjectObj.code})
                      </div>
                      <div>
                        সময়: <span className="font-semibold">{examDuration}</span>
                      </div>
                      <div>
                        পূর্ণমান: <span className="font-semibold">{totalCalculatedMarks}</span>
                      </div>
                    </div>
                  </div>

                  {/* General Instructions */}
                  <div className="text-xs text-slate-700 italic border-b border-slate-200 pb-2 flex justify-between font-sans">
                    <span>* ডান পাশের সংখ্যা প্রশ্নের পূর্ণমান নির্দেশক।</span>
                    <span>অধ্যায়: {selectedChapter || 'সম্পূর্ণ সিলেবাস'}</span>
                  </div>

                  {/* SECTION 1: QUESTION PAPER */}
                  {pdfPrintMode !== 'answers_only' && (
                    <div className="space-y-5">
                      {activeQuestions.map((q, qIndex) => (
                        <div key={q.id} className="text-xs space-y-2 break-inside-avoid">
                          {/* Stimulus */}
                          {q.stimulus && (
                            <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800">
                              <span className="font-bold underline mr-1">উদ্দীপক:</span>
                              <MathRenderer content={q.stimulus} />
                            </div>
                          )}

                          {/* Question text & marks */}
                          <div className="flex justify-between items-baseline gap-2 font-semibold">
                            <div className="flex-1">
                              <span className="font-bold mr-1.5">{qIndex + 1}.</span>
                              <MathRenderer content={q.questionText} />
                            </div>
                            <span className="font-bold shrink-0">[{q.marks}]</span>
                          </div>

                          {/* MCQ Options */}
                          {q.questionType === 'MCQ' && q.options && (
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 pl-4 pt-1">
                              {q.options.map((opt, oIdx) => {
                                const labels = ['(ক)', '(খ)', '(গ)', '(ঘ)'];
                                return (
                                  <div key={oIdx} className="flex items-start gap-1">
                                    <span className="font-bold shrink-0">{labels[oIdx]}</span>
                                    <span>
                                      <MathRenderer content={opt} />
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* CQ Subparts */}
                          {q.questionType === 'CQ' && q.cqParts && (
                            <div className="space-y-1.5 pl-4 pt-1">
                              {[
                                { prefix: 'ক.', part: q.cqParts.partA, marks: 1 },
                                { prefix: 'খ.', part: q.cqParts.partB, marks: 2 },
                                { prefix: 'গ.', part: q.cqParts.partC, marks: 3 },
                                { prefix: 'ঘ.', part: q.cqParts.partD, marks: 4 },
                              ].map((sub, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="flex justify-between items-baseline gap-2"
                                >
                                  <div>
                                    <span className="font-bold mr-1">{sub.prefix}</span>
                                    <MathRenderer content={sub.part?.question || ''} />
                                  </div>
                                  <span className="font-bold shrink-0">[{sub.marks}]</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* SECTION 2: ANSWER KEY & SCHEME */}
                  {(pdfPrintMode === 'paper_and_answers' || pdfPrintMode === 'answers_only') && (
                    <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-400 space-y-4 break-before-page">
                      <div className="text-center pb-2">
                        <span className="px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-wider font-sans">
                          উত্তরমালা ও মূল্যায়ন নির্দেশিকা (Answer Key & Rubrics)
                        </span>
                      </div>

                      <div className="space-y-4">
                        {activeQuestions.map((q, qIndex) => (
                          <div
                            key={`ans-${q.id}`}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 break-inside-avoid"
                          >
                            <div className="font-bold text-slate-900">
                              প্রশ্ন {qIndex + 1} ({q.questionType}):
                            </div>

                            {q.questionType === 'MCQ' && (
                              <div className="text-emerald-800 font-semibold pl-2">
                                সঠিক উত্তর: অপশন{' '}
                                {['ক', 'খ', 'গ', 'ঘ'][q.correctOptionIndex ?? 0]} —{' '}
                                {q.options?.[q.correctOptionIndex ?? 0]}
                                {q.explanation && (
                                  <div className="text-slate-600 text-[11px] font-normal mt-0.5">
                                    ব্যাখ্যা: {q.explanation}
                                  </div>
                                )}
                              </div>
                            )}

                            {q.questionType === 'CQ' && q.cqParts && (
                              <div className="space-y-1 pl-2 text-slate-800">
                                <div>
                                  <strong>ক (১ নম্বর):</strong> {q.cqParts.partA?.answer || 'সঠিক সংজ্ঞার্থ।'}
                                </div>
                                <div>
                                  <strong>খ (২ নম্বর):</strong> {q.cqParts.partB?.answer || 'ব্যাখ্যামূলক উত্তর।'}
                                </div>
                                <div>
                                  <strong>গ (৩ নম্বর):</strong> {q.cqParts.partC?.answer || 'গাণিতিক/প্রয়োগিক সমাধান।'}
                                </div>
                                <div>
                                  <strong>ঘ (৪ নম্বর):</strong> {q.cqParts.partD?.answer || 'উচ্চতর দক্ষতা বিশ্লেষণ।'}
                                </div>
                              </div>
                            )}

                            {q.questionType === 'SQ' && (
                              <div className="pl-2 text-slate-800">
                                <strong>নমুনা উত্তর:</strong> {q.correctAnswer || q.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Document Footer */}
                  <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 font-sans">
                    EduQuestion AI • বাংলাদেশ জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB) • A4 Print Ready
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="no-print p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                মুদ্রণের সময় ব্রাউজারের প্রিন্ট ডায়ালগে <strong>"Save as PDF"</strong> নির্বাচন করুন।
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  বন্ধ করুন (Close)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await downloadExamPaperPdf(
                      'easy-printable-paper',
                      `${examTitle.replace(/\s+/g, '_')}_${selectedClass}_A4.pdf`
                    );
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                  title="A4 সাইজের হাই-রেজোলিউশন PDF ফাইল সরাসরি ডাউনলোড করুন"
                >
                  <Download className="w-4 h-4" />
                  PDF ডাউনলোড (A4)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    printExamPaperIsolated('easy-printable-paper');
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  সরাসরি প্রিন্ট / Print Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Selector Modal for Central Question Bank Integration */}
      <QuestionSelectorModal
        isOpen={showBankSelectorModal}
        onClose={() => setShowBankSelectorModal(false)}
        sectionTitle={isBangla ? 'ইজি মোড প্রশ্নপত্র' : 'Easy Mode Paper'}
        availableQuestions={availableBankQuestions}
        boardQuestions={boardQuestions}
        currentSubject={currentSubjectObj.nameEn}
        currentClass={selectedClass}
        alreadySelectedQuestionIds={generatedQuestions.map((q) => q.id)}
        isBangla={isBangla}
        onAddSelected={(selected) => {
          setGeneratedQuestions((prev) => [...prev, ...selected]);
          setSelectedIds((prev) => new Set([...prev, ...selected.map((q) => q.id)]));
          showToast(
            isBangla
              ? `${selected.length}টি প্রশ্ন ব্যাংক থেকে সফলভাবে যোগ করা হয়েছে!`
              : `Added ${selected.length} questions from Central Question Bank!`
          );
        }}
      />
    </div>
  );
};
