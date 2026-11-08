import React, { useState, useMemo } from 'react';
import {
  Question,
  QuestionPaper,
  PaperSection,
  QuestionType,
  DynamicClassItem,
  DynamicSubjectItem,
  ExamPresetItem,
  UserExamConfiguration,
} from '../types';
import { MathRenderer } from './MathRenderer';
import { downloadExamPaperPdf, printExamPaperIsolated } from '../services/pdfPrintService';
import {
  organizeQuestionsIntoSections,
  addQuestionsToPaperSections,
} from '../services/sectionOrganizer';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Edit3,
  Check,
  X,
  Eye,
  Download,
  Printer,
  Save,
  Search,
  Filter,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Bookmark,
  FolderPlus,
} from 'lucide-react';

interface CreateQuestionPaperViewProps {
  questions: Question[];
  paper: QuestionPaper;
  isBangla: boolean;
  dynamicClasses: DynamicClassItem[];
  dynamicSubjects: DynamicSubjectItem[];
  examPresets: ExamPresetItem[];
  userConfigurations: UserExamConfiguration[];
  onSavePaper: (paper: QuestionPaper) => Promise<void>;
  onPreviewPaper: (paper: QuestionPaper) => void;
  onAddCustomSubject: (subject: DynamicSubjectItem) => Promise<void>;
  onAddCustomExamPreset: (preset: ExamPresetItem) => Promise<void>;
  onSaveUserConfig: (config: UserExamConfiguration) => Promise<void>;
  onDeleteUserConfig: (id: string) => Promise<void>;
}

export const CreateQuestionPaperView: React.FC<CreateQuestionPaperViewProps> = ({
  questions,
  paper,
  isBangla,
  dynamicClasses,
  dynamicSubjects,
  examPresets,
  userConfigurations,
  onSavePaper,
  onPreviewPaper,
  onAddCustomSubject,
  onAddCustomExamPreset,
  onSaveUserConfig,
  onDeleteUserConfig,
}) => {
  const [step, setStep] = useState<'select' | 'editor'>(
    paper.sections.some((s) => s.questions.length > 0) ? 'editor' : 'select'
  );
  const [currentPaper, setCurrentPaper] = useState<QuestionPaper>(paper);

  // Question Bank Filter States (only show options that actually exist in `questions`)
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<QuestionType | 'ALL'>('ALL');
  const [selectedBoard, setSelectedBoard] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Checkbox selection state
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Inline editing state in Editor
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editMarks, setEditMarks] = useState<number>(1);

  // Save & PDF feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  // Custom Subject Modal State
  const [showCustomSubjectModal, setShowCustomSubjectModal] = useState(false);
  const [customSubName, setCustomSubName] = useState('');
  const [customSubCode, setCustomSubCode] = useState('');
  const [customSubClass, setCustomSubClass] = useState(currentPaper.classLevel || 'SSC');
  const [customSubGroup, setCustomSubGroup] = useState('');
  const [customSubDesc, setCustomSubDesc] = useState('');
  const [customSubError, setCustomSubError] = useState('');

  // Custom Exam Name State
  const [showCustomExamInput, setShowCustomExamInput] = useState(false);
  const [customExamName, setCustomExamName] = useState('');

  const handleSaveCustomSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = customSubName.trim();
    if (!trimmedName) {
      setCustomSubError(isBangla ? 'বিষয়ের নাম আবশ্যক' : 'Subject Name is required');
      return;
    }
    const targetClass = customSubClass || currentPaper.classLevel || 'SSC';
    // Prevent duplicate subject names within the same class
    const isDuplicate = dynamicSubjects.some(
      (s) =>
        s.name.toLowerCase() === trimmedName.toLowerCase() &&
        (s.classLevel || 'SSC').toLowerCase() === targetClass.toLowerCase()
    );
    if (isDuplicate) {
      setCustomSubError(
        isBangla
          ? `"${targetClass}" শ্রেণিতে "${trimmedName}" বিষয়টি ইতিমধ্যে রয়েছে!`
          : `Subject "${trimmedName}" already exists in "${targetClass}"!`
      );
      return;
    }

    const newSubject: DynamicSubjectItem = {
      id: `sub_${Date.now()}`,
      name: trimmedName,
      code: customSubCode.trim() || undefined,
      classLevel: targetClass,
      group: customSubGroup.trim() || undefined,
      description: customSubDesc.trim() || undefined,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    await onAddCustomSubject(newSubject);
    setCurrentPaper((prev) => ({
      ...prev,
      subject: newSubject.name,
      subjectCode: newSubject.code || prev.subjectCode,
      classLevel: targetClass,
      group: newSubject.group || prev.group,
    }));
    setSelectedSubject(newSubject.name);
    setCustomSubName('');
    setCustomSubCode('');
    setCustomSubGroup('');
    setCustomSubDesc('');
    setCustomSubError('');
    setShowCustomSubjectModal(false);
  };

  const handleApplyConfig = (cfg: UserExamConfiguration) => {
    setCurrentPaper((prev) => ({
      ...prev,
      institutionName: cfg.institutionName || prev.institutionName,
      classLevel: cfg.classLevel || prev.classLevel,
      group: cfg.group || '',
      subject: cfg.subject || prev.subject,
      title: cfg.examName || prev.title,
      academicYear: cfg.academicYear || prev.academicYear,
      duration: cfg.duration || prev.duration,
      totalMarks: cfg.fullMarks || prev.totalMarks,
      passMarks: cfg.passMarks,
      language: cfg.language || 'Bangla',
    }));
    if (cfg.subject) {
      setSelectedSubject(cfg.subject);
    }
  };

  const handleSaveCurrentConfig = async () => {
    const newCfg: UserExamConfiguration = {
      id: `cfg_${Date.now()}`,
      userId: 'current-user',
      configName: `${currentPaper.classLevel || 'SSC'} - ${currentPaper.subject || 'Subject'}`,
      institutionName: currentPaper.institutionName || 'আদর্শ শিক্ষাপ্রতিষ্ঠান',
      classLevel: currentPaper.classLevel || 'SSC',
      group: currentPaper.group || undefined,
      subject: currentPaper.subject || 'Physics',
      examName: currentPaper.title || 'Model Test',
      academicYear: currentPaper.academicYear || '2026',
      duration: currentPaper.duration || '২ ঘণ্টা ৩০ মিনিট',
      fullMarks: calculatedTotalMarks > 0 ? calculatedTotalMarks : currentPaper.totalMarks || 100,
      passMarks: currentPaper.passMarks,
      language: currentPaper.language || 'Bangla',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveUserConfig(newCfg);
    setConfigSavedNotice(true);
    setTimeout(() => setConfigSavedNotice(false), 2500);
  };

  // Dynamically derive available filter options from dynamicSubjects + existing questions
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

  const availableTypes = useMemo(() => {
    const set = new Set<QuestionType>();
    questions.forEach((q) => {
      if (q.questionType) set.add(q.questionType);
    });
    return Array.from(set);
  }, [questions]);

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
        if (!matchText && !matchStimulus && !matchChapter) return false;
      }
      return true;
    });
  }, [questions, selectedSubject, selectedChapter, selectedType, selectedBoard, selectedYear, searchQuery]);

  // Flat list of selected questions in currentPaper
  const paperQuestions: Question[] = useMemo(() => {
    return currentPaper.sections.flatMap((s) => s.questions);
  }, [currentPaper]);

  // Automatically calculate total marks
  const calculatedTotalMarks = useMemo(() => {
    return paperQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  }, [paperQuestions]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (filteredQuestions.length === 0) return;
    const allSelected = filteredQuestions.every((q) => checkedIds.has(q.id));
    if (allSelected) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        filteredQuestions.forEach((q) => next.delete(q.id));
        return next;
      });
    } else {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        filteredQuestions.forEach((q) => next.add(q.id));
        return next;
      });
    }
  };

  const handleAddSelectedToPaper = () => {
    const selectedToAdd = questions.filter((q) => checkedIds.has(q.id));
    if (selectedToAdd.length === 0) return;

    const existingIds = new Set(paperQuestions.map((q) => q.id));
    const newQuestions = selectedToAdd.filter((q) => !existingIds.has(q.id));
    if (newQuestions.length === 0) {
      setCheckedIds(new Set());
      setStep('editor');
      return;
    }

    const updatedSections = addQuestionsToPaperSections(currentPaper.sections, newQuestions);
    const allQs = updatedSections.flatMap((s) => s.questions || []);
    const newTotalMarks = allQs.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

    setCurrentPaper((prev) => ({
      ...prev,
      subject: selectedSubject !== 'ALL' ? selectedSubject : prev.subject,
      totalMarks: newTotalMarks,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    }));

    setCheckedIds(new Set());
    setStep('editor');
  };

  const updatePaperQuestions = (updatedQuestions: Question[]) => {
    const newSections = organizeQuestionsIntoSections(updatedQuestions);
    const newTotalMarks = updatedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    setCurrentPaper((prev) => ({
      ...prev,
      totalMarks: newTotalMarks,
      sections: newSections,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= paperQuestions.length) return;
    const copy = [...paperQuestions];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIndex, 0, moved);
    updatePaperQuestions(copy);
  };

  const handleRemoveQuestion = (id: string) => {
    const remaining = paperQuestions.filter((q) => q.id !== id);
    updatePaperQuestions(remaining);
  };

  const startEditQuestion = (q: Question) => {
    setEditingQId(q.id);
    setEditText(q.questionType === 'CQ' && q.stimulus ? q.stimulus : q.questionText);
    setEditMarks(q.marks);
  };

  const saveEditQuestion = (q: Question) => {
    const updated = paperQuestions.map((item) => {
      if (item.id !== q.id) return item;
      if (item.questionType === 'CQ' && item.stimulus) {
        return { ...item, stimulus: editText, marks: Number(editMarks) || item.marks };
      }
      return { ...item, questionText: editText, marks: Number(editMarks) || item.marks };
    });
    updatePaperQuestions(updated);
    setEditingQId(null);
  };

  const handleHeaderChange = (field: keyof QuestionPaper, value: any) => {
    setCurrentPaper((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const paperToSave = {
        ...currentPaper,
        totalMarks: calculatedTotalMarks,
      };
      await onSavePaper(paperToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDirectDownloadPdf = async () => {
    try {
      setIsPdfGenerating(true);
      await downloadExamPaperPdf(
        'editor-printable-preview',
        `${(currentPaper.title || 'SSC_Question_Paper').replace(/\s+/g, '_')}.pdf`
      );
    } catch (err) {
      console.error('PDF download error:', err);
      printExamPaperIsolated('editor-printable-preview');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleDirectPrint = () => {
    printExamPaperIsolated('editor-printable-preview');
  };

  return (
    <div className="space-y-6">
      {/* Top Step Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {isBangla ? 'প্রশ্নপত্র তৈরি করুন (Create Question Paper)' : 'Create Question Paper'}
          </h1>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'প্রশ্ন ব্যাংক থেকে বিদ্যমান প্রশ্ন নির্বাচন করুন এবং এসএসসি পরীক্ষার প্রশ্নপত্র সাজান'
              : 'Select existing questions from the Question Bank and arrange your SSC examination paper'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep('select')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              step === 'select'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>1. {isBangla ? 'প্রশ্ন নির্বাচন' : 'Select Questions'}</span>
          </button>
          <button
            onClick={() => setStep('editor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              step === 'editor'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>
              2. {isBangla ? 'প্রশ্নপত্র এডিটর' : 'Paper Editor'} ({paperQuestions.length})
            </span>
          </button>
        </div>
      </div>

      {/* STEP 1: SELECT QUESTIONS FROM QUESTION BANK */}
      {step === 'select' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* SSC Subject */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
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
                  {availableSubjects.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chapter (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {isBangla ? 'অধ্যায় (ঐচ্ছিক)' : 'Chapter (Optional)'}
                </label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
                >
                  <option value="ALL">{isBangla ? 'সকল অধ্যায়' : 'All Chapters'}</option>
                  {availableChapters.map((chap) => (
                    <option key={chap} value={chap}>
                      {chap}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {isBangla ? 'প্রশ্নের ধরন' : 'Question Type'}
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
                >
                  <option value="ALL">{isBangla ? 'সকল ধরন (MCQ, SQ, CQ)' : 'All Types'}</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>
                      {t === 'MCQ'
                        ? 'MCQ (বহুনির্বাচনী)'
                        : t === 'SQ'
                        ? 'SQ (সংক্ষিপ্ত প্রশ্ন)'
                        : 'CQ (সৃজনশীল প্রশ্ন)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Board */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
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

              {/* Year */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
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

            {/* Search + Bulk Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isBangla ? 'প্রশ্ন বা অধ্যায় খুঁজুন...' : 'Search questions or chapters...'}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAllFiltered}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isBangla ? 'সবগুলো নির্বাচন করুন' : 'Select All'}</span>
                </button>

                <button
                  onClick={handleAddSelectedToPaper}
                  disabled={checkedIds.size === 0}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isBangla
                      ? `নির্বাচিত প্রশ্ন যোগ করুন (${checkedIds.size})`
                      : `Add Selected to Paper (${checkedIds.size})`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Questions List with Checkboxes */}
          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  {isBangla ? 'কোনো প্রশ্ন পাওয়া যায়নি' : 'No matching questions found in Question Bank'}
                </p>
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const isChecked = checkedIds.has(q.id);
                const alreadyInPaper = paperQuestions.some((pq) => pq.id === q.id);

                return (
                  <div
                    key={q.id}
                    onClick={() => toggleCheck(q.id)}
                    className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isChecked
                        ? 'border-blue-500 bg-blue-50/30 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="pt-0.5 text-blue-600 shrink-0">
                      {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                          {q.questionType}
                        </span>
                        <span className="font-bold text-slate-700">{q.subject}</span>
                        {q.chapter && <span className="text-slate-500">• {q.chapter}</span>}
                        {q.boardInfo?.boardName && (
                          <span className="text-emerald-700 font-semibold">
                            • {q.boardInfo.boardName} {q.boardInfo.year}
                          </span>
                        )}
                        <span className="ml-auto font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {isBangla ? `মান: ${q.marks}` : `Marks: ${q.marks}`}
                        </span>
                        {alreadyInPaper && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            {isBangla ? 'যুক্ত আছে' : 'Added'}
                          </span>
                        )}
                      </div>

                      {q.questionType === 'CQ' && q.stimulus ? (
                        <div className="text-xs sm:text-sm text-slate-800 font-bangla space-y-1">
                          <div className="p-2.5 bg-slate-50 rounded-xl border-l-2 border-slate-400">
                            <MathRenderer content={q.stimulus} />
                          </div>
                          {q.cqParts && (
                            <div className="pl-2 space-y-0.5 text-xs text-slate-700">
                              <div>ক. <MathRenderer content={q.cqParts.partA.question} /> ({q.cqParts.partA.marks})</div>
                              <div>খ. <MathRenderer content={q.cqParts.partB.question} /> ({q.cqParts.partB.marks})</div>
                              <div>গ. <MathRenderer content={q.cqParts.partC.question} /> ({q.cqParts.partC.marks})</div>
                              <div>ঘ. <MathRenderer content={q.cqParts.partD.question} /> ({q.cqParts.partD.marks})</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm text-slate-800 font-bangla">
                          <MathRenderer content={q.questionText} />
                          {q.questionType === 'MCQ' && q.options && (
                            <div className="grid grid-cols-2 gap-1.5 mt-2 text-xs text-slate-600">
                              {q.options.map((opt, idx) => (
                                <div key={idx}>
                                  {['ক', 'খ', 'গ', 'ঘ'][idx]}. <MathRenderer content={opt} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* STEP 2: SIMPLE QUESTION PAPER EDITOR */}
      {step === 'editor' && (
        <div className="space-y-6">
          {/* Saved Configurations Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  {isBangla ? 'সংরক্ষিত কনফিগারেশন (Saved Configurations)' : 'Saved Configurations'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {configSavedNotice && (
                  <span className="text-xs font-bold text-emerald-600">
                    {isBangla ? 'কনফিগারেশন সংরক্ষিত হয়েছে!' : 'Configuration Saved!'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveCurrentConfig}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isBangla ? 'বর্তমান তথ্য সংরক্ষণ করুন' : 'Save Current Config'}
                </button>
              </div>
            </div>

            {userConfigurations.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {userConfigurations.map((cfg) => (
                  <div
                    key={cfg.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyConfig(cfg)}
                      className="font-bold text-slate-800 hover:text-emerald-700 text-left"
                      title={isBangla ? 'ক্লিক করে লোড করুন' : 'Click to load configuration'}
                    >
                      {cfg.classLevel} • {cfg.subject} ({cfg.examName})
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteUserConfig(cfg.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                      title={isBangla ? 'মুছে ফেলুন' : 'Remove'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {isBangla
                  ? 'আপনার ব্যবহৃত শ্রেণি, বিষয় ও পরীক্ষার তথ্য সংরক্ষণ করে পরবর্তীতে দ্রুত ব্যবহার করুন।'
                  : 'Save your frequently used Class, Subject, and Exam settings for quick reuse.'}
              </p>
            )}
          </div>

          {/* Paper Metadata Form (12 Fields) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800">
                {isBangla ? 'পরীক্ষার তথ্য (Question Paper Information)' : 'Question Paper Information'}
              </h2>
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> {isBangla ? 'সংরক্ষিত হয়েছে' : 'Saved'}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : isBangla ? 'সংরক্ষণ করুন' : 'Save Paper'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Institution Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? '১. প্রতিষ্ঠানের নাম (Institution Name)' : '1. Institution Name'}
                </label>
                <input
                  type="text"
                  value={currentPaper.institutionName}
                  onChange={(e) => handleHeaderChange('institutionName', e.target.value)}
                  placeholder="যেমন: মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bangla"
                />
              </div>

              {/* 2. Class (Dynamic) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? '২. শ্রেণি (Class)' : '2. Class'}
                </label>
                <select
                  value={currentPaper.classLevel}
                  onChange={(e) => handleHeaderChange('classLevel', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-700"
                >
                  {dynamicClasses.map((cls) => (
                    <option key={cls.id} value={cls.name}>
                      {cls.name}
                    </option>
                  ))}
                  {!dynamicClasses.some((c) => c.name === currentPaper.classLevel) && (
                    <option value={currentPaper.classLevel}>{currentPaper.classLevel}</option>
                  )}
                </select>
              </div>

              {/* 3. Group (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? '৩. বিভাগ (Group - ঐচ্ছিক)' : '3. Group (Optional)'}
                </label>
                <input
                  type="text"
                  value={currentPaper.group || ''}
                  onChange={(e) => handleHeaderChange('group', e.target.value)}
                  placeholder="যেমন: বিজ্ঞান / মানবিক / ব্যবসায় শিক্ষা"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bangla"
                />
              </div>

              {/* 4. Subject + 5. + Add Custom Subject */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {isBangla ? '৪. বিষয় (Subject)' : '4. Subject'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSubClass(currentPaper.classLevel || 'SSC');
                      setCustomSubError('');
                      setShowCustomSubjectModal(true);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> + Add Custom Subject
                  </button>
                </div>
                <select
                  value={currentPaper.subject}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = dynamicSubjects.find((s) => s.name === val);
                    setCurrentPaper((prev) => ({
                      ...prev,
                      subject: val,
                      subjectCode: matched?.code || prev.subjectCode,
                    }));
                    setSelectedSubject(val);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bangla"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                  {!availableSubjects.includes(currentPaper.subject) && currentPaper.subject && (
                    <option value={currentPaper.subject}>{currentPaper.subject}</option>
                  )}
                </select>
              </div>

              {/* 6. Exam Name (Presets + Custom Exam Name) */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {isBangla ? '৫. পরীক্ষার নাম (Exam Name)' : '5. Exam Name'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomExamInput((prev) => !prev)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    {showCustomExamInput
                      ? isBangla
                        ? 'তালিকা থেকে বেছে নিন'
                        : 'Choose from Presets'
                      : '+ Custom Exam Name'}
                  </button>
                </div>
                {showCustomExamInput ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customExamName || currentPaper.title}
                      onChange={(e) => {
                        setCustomExamName(e.target.value);
                        handleHeaderChange('title', e.target.value);
                      }}
                      placeholder="কাস্টম পরীক্ষার নাম লিখুন..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bangla"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const name = (customExamName || currentPaper.title).trim();
                        if (name) {
                          await onAddCustomExamPreset({
                            id: `exam_${Date.now()}`,
                            name,
                            isCustom: true,
                            createdAt: new Date().toISOString(),
                          });
                          setShowCustomExamInput(false);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shrink-0"
                    >
                      {isBangla ? 'সংরক্ষণ' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <select
                    value={currentPaper.title}
                    onChange={(e) => handleHeaderChange('title', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bangla"
                  >
                    {examPresets.map((ex) => (
                      <option key={ex.id} value={ex.name}>
                        {ex.name}
                      </option>
                    ))}
                    {!examPresets.some((ex) => ex.name === currentPaper.title) && currentPaper.title && (
                      <option value={currentPaper.title}>{currentPaper.title}</option>
                    )}
                  </select>
                )}
              </div>

              {/* 7. Academic Year */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? '৬. শিক্ষাবর্ষ (Academic Year)' : '6. Academic Year'}
                </label>
                <input
                  type="text"
                  value={currentPaper.academicYear || ''}
                  onChange={(e) => handleHeaderChange('academicYear', e.target.value)}
                  placeholder="২০২৬"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
                />
              </div>

              {/* 8. Exam Date (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? '৭. পরীক্ষার তারিখ (Exam Date - ঐচ্ছিক)' : '7. Exam Date (Optional)'}
                </label>
                <input
                  type="text"
                  value={currentPaper.examDate || ''}
                  onChange={(e) => handleHeaderChange('examDate', e.target.value)}
                  placeholder="যেমন: ১৫ নভেম্বর ২০২৬"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
                />
              </div>

              {/* 9. Examination Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? '৮. সময় (Examination Time)' : '8. Examination Time'}
                </label>
                <input
                  type="text"
                  value={currentPaper.duration}
                  onChange={(e) => handleHeaderChange('duration', e.target.value)}
                  placeholder="২ ঘণ্টা ৩০ মিনিট"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bangla"
                />
              </div>

              {/* 10. Full Marks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? '৯. পূর্ণমান (Full Marks)' : '9. Full Marks'}
                </label>
                <input
                  type="number"
                  value={currentPaper.totalMarks || calculatedTotalMarks}
                  onChange={(e) =>
                    setCurrentPaper((prev) => ({ ...prev, totalMarks: Number(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold"
                />
              </div>

              {/* 11. Pass Marks (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? '১০. পাস নম্বর (Pass Marks - ঐচ্ছিক)' : '10. Pass Marks (Optional)'}
                </label>
                <input
                  type="number"
                  value={currentPaper.passMarks || ''}
                  onChange={(e) =>
                    setCurrentPaper((prev) => ({
                      ...prev,
                      passMarks: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="৩৩"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
                />
              </div>

              {/* 12. Language */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? '১১. ভাষা (Language)' : '11. Language'}
                </label>
                <select
                  value={currentPaper.language || 'Bangla'}
                  onChange={(e) => handleHeaderChange('language', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold"
                >
                  <option value="Bangla">Bangla (বাংলা)</option>
                  <option value="English">English</option>
                  <option value="Both">Both (বাংলা ও ইংরেজি)</option>
                </select>
              </div>
            </div>

            {/* Total Marks & Essential Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">
                  {isBangla ? 'মোট প্রশ্ন:' : 'Total Questions:'}{' '}
                  <span className="text-blue-600">{paperQuestions.length}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-bold text-slate-700">
                  {isBangla ? 'মোট পূর্ণমান (Total Marks):' : 'Total Marks:'}{' '}
                  <span className="text-emerald-700 font-black text-sm">{calculatedTotalMarks}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => onPreviewPaper({ ...currentPaper, totalMarks: calculatedTotalMarks })}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4 text-blue-600" /> Preview Question Paper
                </button>

                <button
                  onClick={handleDirectDownloadPdf}
                  disabled={isPdfGenerating || paperQuestions.length === 0}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" /> {isPdfGenerating ? 'Generating...' : 'Download PDF'}
                </button>

                <button
                  onClick={handleDirectPrint}
                  disabled={paperQuestions.length === 0}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4 text-emerald-400" /> Print Question Paper
                </button>
              </div>
            </div>
          </div>

          {/* Selected Questions List (Rearrange, Edit Text/Marks, Remove) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {isBangla ? 'নির্বাচিত প্রশ্নসমূহ (সাজান ও সম্পাদনা করুন)' : 'Selected Questions (Arrange & Edit)'}
              </h3>
              <button
                onClick={() => setStep('select')}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {isBangla ? 'আরও প্রশ্ন যোগ করুন' : 'Add More Questions'}
              </button>
            </div>

            {paperQuestions.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500 mb-3">
                  {isBangla ? 'এখনো কোনো প্রশ্ন যোগ করা হয়নি।' : 'No questions added yet.'}
                </p>
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  {isBangla ? 'প্রশ্ন ব্যাংক থেকে নির্বাচন করুন' : 'Select from Question Bank'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {currentPaper.sections.map((section, sIdx) => {
                  const sectionMarks = section.questions.reduce((sum, item) => sum + (Number(item.marks) || 0), 0);
                  return (
                    <div key={section.id || sIdx} className="space-y-3">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-3 rounded-2xl border border-blue-200/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                            {['ক', 'খ', 'গ', 'ঘ', 'ঙ'][sIdx] || sIdx + 1}
                          </span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                              {section.titleBn || section.titleEn}
                            </h4>
                            {section.instructions && (
                              <p className="text-[11px] text-slate-600 italic">
                                [{section.instructions}]
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-blue-700 bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs">
                          {section.questions.length}টি প্রশ্ন • {sectionMarks} নম্বর
                        </span>
                      </div>

                      <div className="space-y-3 pl-2 sm:pl-3 border-l-2 border-blue-100">
                        {section.questions.map((q, qInSecIdx) => {
                          const globalIdx = paperQuestions.findIndex((item) => item.id === q.id);
                          const isEditing = editingQId === q.id;
                          return (
                            <div
                              key={q.id}
                              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4"
                            >
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-black text-blue-700">#{qInSecIdx + 1}</span>
                                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                                    {q.questionType}
                                  </span>
                                  <span className="text-slate-500 font-semibold">
                                    {isBangla ? `মান: ${q.marks}` : `Marks: ${q.marks}`}
                                  </span>
                                </div>

                                {isEditing ? (
                                  <div className="space-y-2">
                                    <textarea
                                      rows={3}
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      className="w-full p-2.5 rounded-xl border border-blue-300 text-xs sm:text-sm font-bangla bg-white"
                                    />
                                    <div className="flex items-center gap-3">
                                      <label className="text-xs font-bold text-slate-700">
                                        {isBangla ? 'মান (Marks):' : 'Marks:'}
                                      </label>
                                      <input
                                        type="number"
                                        value={editMarks}
                                        onChange={(e) => setEditMarks(Number(e.target.value))}
                                        className="w-20 px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                                      />
                                      <button
                                        onClick={() => saveEditQuestion(q)}
                                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                                      >
                                        <Check className="w-3.5 h-3.5" /> Save
                                      </button>
                                      <button
                                        onClick={() => setEditingQId(null)}
                                        className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs sm:text-sm text-slate-800 font-bangla">
                                    {q.questionType === 'CQ' && q.stimulus ? (
                                      <div className="space-y-1">
                                        <div className="p-2 bg-white rounded-lg border-l-2 border-slate-400">
                                          <MathRenderer content={q.stimulus} />
                                        </div>
                                        {q.cqParts && (
                                          <div className="pl-2 text-xs text-slate-700 space-y-0.5">
                                            <div>ক. <MathRenderer content={q.cqParts.partA.question} /> ({q.cqParts.partA.marks})</div>
                                            <div>খ. <MathRenderer content={q.cqParts.partB.question} /> ({q.cqParts.partB.marks})</div>
                                            <div>গ. <MathRenderer content={q.cqParts.partC.question} /> ({q.cqParts.partC.marks})</div>
                                            <div>ঘ. <MathRenderer content={q.cqParts.partD.question} /> ({q.cqParts.partD.marks})</div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div>
                                        <MathRenderer content={q.questionText} />
                                        {q.questionType === 'MCQ' && q.options && (
                                          <div className="grid grid-cols-2 gap-1 mt-1.5 text-xs text-slate-600">
                                            {q.options.map((opt, oIdx) => (
                                              <div key={oIdx}>
                                                {['ক', 'খ', 'গ', 'ঘ'][oIdx]}. <MathRenderer content={opt} />
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Controls: Up, Down, Edit, Remove */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleMoveQuestion(globalIdx, 'up')}
                                  disabled={globalIdx <= 0}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600"
                                  title="Move Up"
                                >
                                  <MoveUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMoveQuestion(globalIdx, 'down')}
                                  disabled={globalIdx >= paperQuestions.length - 1}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600"
                                  title="Move Down"
                                >
                                  <MoveDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => startEditQuestion(q)}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-blue-600"
                                  title="Edit Text & Marks"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveQuestion(q.id)}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-600"
                                  title="Remove Question"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hidden/Offscreen A4 Printable Element for Direct Download & Print */}
          <div className="sr-only" aria-hidden="true">
            <div
              id="editor-printable-preview"
              className="bg-white text-slate-900 p-6 sm:p-8 font-serif-bangla text-sm print:p-0 print:border-none print:shadow-none"
              style={{ width: '100%', maxWidth: '794px' }}
            >
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4 print:pb-2 print:mb-3">
                {currentPaper.institutionName && (
                  <h1 className="text-xl font-bold">{currentPaper.institutionName}</h1>
                )}
                {currentPaper.title && (
                  <div className="text-sm font-bold mt-0.5">{currentPaper.title}</div>
                )}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 text-xs font-semibold mt-1">
                  {currentPaper.classLevel && <span>শ্রেণি: {currentPaper.classLevel}</span>}
                  {currentPaper.group && <span>বিভাগ: {currentPaper.group}</span>}
                  {currentPaper.subject && <span>বিষয়: {currentPaper.subject}</span>}
                  {currentPaper.subjectCode && <span>বিষয় কোড: {currentPaper.subjectCode}</span>}
                  {currentPaper.academicYear && <span>শিক্ষাবর্ষ: {currentPaper.academicYear}</span>}
                  {currentPaper.examDate && <span>তারিখ: {currentPaper.examDate}</span>}
                </div>
                <div className="flex justify-between items-center text-xs font-bold mt-2 pt-2 border-t border-slate-300">
                  <span>{currentPaper.duration ? `সময়: ${currentPaper.duration}` : ''}</span>
                  <div className="flex items-center gap-3">
                    <span>পূর্ণমান: {calculatedTotalMarks || currentPaper.totalMarks}</span>
                    {currentPaper.passMarks !== undefined && currentPaper.passMarks > 0 && (
                      <span>পাস নম্বর: {currentPaper.passMarks}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sections with separated headers for CQ, SQ, MCQ */}
              <div className="space-y-6 print:space-y-4">
                {currentPaper.sections.map((sec, sIdx) => (
                  <div key={sec.id || sIdx} className="section-block">
                    <div className="text-center my-3 print:my-2 pb-1 border-b border-slate-700">
                      <span className="font-bold text-sm text-slate-900">
                        {sec.titleBn || sec.titleEn}
                      </span>
                      {sec.instructions && (
                        <p className="text-xs italic text-slate-600 mt-0.5">
                          [{sec.instructions}]
                        </p>
                      )}
                    </div>

                    <div className="space-y-4 print:space-y-3">
                      {sec.questions.map((q, idx) => (
                        <div key={q.id || idx} className="cq-block print:mb-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <span className="font-bold mr-1.5">{idx + 1}।</span>
                              {q.questionType === 'CQ' && q.stimulus ? (
                                <span>
                                  <MathRenderer content={q.stimulus} />
                                </span>
                              ) : (
                                <span>
                                  <MathRenderer content={q.questionText} />
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-xs shrink-0">[{q.marks}]</span>
                          </div>

                          {q.questionType === 'MCQ' && q.options && (
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 pl-5 mt-1 text-xs">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx}>
                                  {['ক', 'খ', 'গ', 'ঘ'][oIdx]}) <MathRenderer content={opt} />
                                </div>
                              ))}
                            </div>
                          )}

                          {q.questionType === 'CQ' && q.cqParts && (
                            <div className="pl-5 mt-1.5 space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>ক. <MathRenderer content={q.cqParts.partA.question} /></span>
                                <span className="font-semibold">{q.cqParts.partA.marks}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>খ. <MathRenderer content={q.cqParts.partB.question} /></span>
                                <span className="font-semibold">{q.cqParts.partB.marks}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>গ. <MathRenderer content={q.cqParts.partC.question} /></span>
                                <span className="font-semibold">{q.cqParts.partC.marks}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>ঘ. <MathRenderer content={q.cqParts.partD.question} /></span>
                                <span className="font-semibold">{q.cqParts.partD.marks}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* + Add Custom Subject Modal */}
      {showCustomSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {isBangla ? '+ নতুন কাস্টম বিষয় যোগ করুন' : '+ Add Custom Subject'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomSubject} className="space-y-3">
              {customSubError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {customSubError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'বিষয়ের নাম (Subject Name) *' : 'Subject Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={customSubName}
                  onChange={(e) => setCustomSubName(e.target.value)}
                  placeholder="যেমন: Agriculture Studies / কৃষি শিক্ষা"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'বিষয় কোড (ঐচ্ছিক)' : 'Subject Code (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={customSubCode}
                    onChange={(e) => setCustomSubCode(e.target.value)}
                    placeholder="যেমন: ১৩৪"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'শ্রেণি (Class)' : 'Class'}
                  </label>
                  <select
                    value={customSubClass}
                    onChange={(e) => setCustomSubClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold"
                  >
                    {dynamicClasses.map((cls) => (
                      <option key={cls.id} value={cls.name}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'বিভাগ (Group - ঐচ্ছিক)' : 'Group (Optional)'}
                </label>
                <input
                  type="text"
                  value={customSubGroup}
                  onChange={(e) => setCustomSubGroup(e.target.value)}
                  placeholder="যেমন: বিজ্ঞান / সাধারণ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'বিবরণ (Description - ঐচ্ছিক)' : 'Description (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={customSubDesc}
                  onChange={(e) => setCustomSubDesc(e.target.value)}
                  placeholder="সংক্ষিপ্ত বিবরণ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomSubjectModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  {isBangla ? 'বিষয় সংরক্ষণ করুন' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
