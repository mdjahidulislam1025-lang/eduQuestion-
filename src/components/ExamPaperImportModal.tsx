import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import {
  Question,
  ExamType,
  QuestionImportItem,
  QuestionImportStatus,
  ClassLevel,
  ExamPaperImportRecord,
  QuestionSourceRef,
} from '../types';
import { BANGLADESH_BOARDS, BOARD_EXAM_YEARS, NCTB_SUBJECTS } from '../data/curriculumData';
import { MathRenderer } from './MathRenderer';
import {
  FileUp,
  Upload,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  X,
  FileText,
  Check,
  Trash2,
  Edit3,
  Copy,
  FolderArchive,
  RefreshCw,
  Search,
  BookOpen,
  HelpCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface ExamPaperImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingQuestions: Question[];
  isBangla?: boolean;
  onImportComplete: (approvedQuestions: Question[], importRecord: ExamPaperImportRecord) => void;
  onLinkDuplicateSource?: (targetQuestionId: string, newSource: QuestionSourceRef) => void;
}

const EXAM_TYPES: ExamType[] = [
  'Test Exam',
  'Pre-Test',
  'Half-Yearly',
  'Annual Exam',
  'Model Test',
  'Board Exam',
  'Class Test',
  'Weekly Exam',
  'Monthly Exam',
  'Admission Test',
  'Other',
];

export const ExamPaperImportModal: React.FC<ExamPaperImportModalProps> = ({
  isOpen,
  onClose,
  existingQuestions,
  isBangla = true,
  onImportComplete,
  onLinkDuplicateSource,
}) => {
  // Wizard steps: 'upload' -> 'extracting' -> 'review'
  const [currentStep, setCurrentStep] = useState<'upload' | 'extracting' | 'review'>('upload');

  // Input mode: 'file' | 'text' | 'zip'
  const [inputMode, setInputMode] = useState<'file' | 'text' | 'zip'>('file');

  // Form State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawTextPasted, setRawTextPasted] = useState('');

  // Exam Metadata
  const [examName, setExamName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [classLevel, setClassLevel] = useState<ClassLevel>('Class 10');
  const [subject, setSubject] = useState('Physics');
  const [examType, setExamType] = useState<ExamType>('Test Exam');
  const [year, setYear] = useState('2024');
  const [boardName, setBoardName] = useState('Dhaka Board');
  const [fullMarks, setFullMarks] = useState<number>(75);
  const [language, setLanguage] = useState<'Bangla' | 'English' | 'Bilingual'>('Bangla');

  // Extraction & Processing State
  const [extractedQuestions, setExtractedQuestions] = useState<QuestionImportItem[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Review & Edit State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<QuestionImportItem | null>(null);

  if (!isOpen) return null;

  // Similarity calculator for duplicate detection
  const calculateDuplicateScore = (text1: string, text2: string): number => {
    const clean = (s: string) =>
      new Set(
        s
          .toLowerCase()
          .replace(/[^\w\s\u0980-\u09FF]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 2)
      );
    const s1 = clean(text1);
    const s2 = clean(text2);
    if (s1.size === 0 || s2.size === 0) return 0;
    let intersect = 0;
    s1.forEach((w) => {
      if (s2.has(w)) intersect++;
    });
    return Math.round((intersect / (s1.size + s2.size - intersect)) * 100);
  };

  // Run AI Question Extraction
  const handleStartExtraction = async () => {
    let textToAnalyze = rawTextPasted;

    if (inputMode === 'file' && uploadedFile) {
      if (!examName) {
        setExamName(uploadedFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
      textToAnalyze = `Examination Paper: ${uploadedFile.name}\nExam: ${examName || 'Assessment'}\nInstitution: ${institutionName}\nSubject: ${subject}\nClass: ${classLevel}\nYear: ${year}`;
    }

    if (!textToAnalyze.trim()) {
      setExtractionError(
        isBangla
          ? 'অনুগ্রহ করে পরীক্ষা পত্রের টেক্সট লিখুন অথবা ফাইল আপলোড করুন।'
          : 'Please upload a file or paste question paper text.'
      );
      return;
    }

    setIsProcessing(true);
    setExtractionError(null);
    setCurrentStep('extracting');
    setStatusMessage(isBangla ? 'পরীক্ষা পত্র বিশ্লেষণ ও প্রশ্নপত্র পৃথকীকরণ চলছে...' : 'Analyzing exam paper and digitizing questions...');

    try {
      const response = await fetch('/api/gemini/extract-exam-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: textToAnalyze,
          examName: examName || `${subject} ${examType}`,
          institutionName: institutionName || boardName,
          classLevel,
          subject,
          examType,
          year,
          boardName,
          fullMarks,
          language,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract questions.');
      }

      const rawItems = data.questions || [];

      // Run duplicate detection against existing Question Bank
      const processed: QuestionImportItem[] = rawItems.map((item: any, idx: number) => {
        const fullItemText = `${item.stimulus || ''} ${item.questionText || ''}`;
        let highestScore = 0;
        let matchQuestionId: string | undefined;

        for (const existing of existingQuestions) {
          if (existing.subject === subject) {
            const existingText = `${existing.stimulus || ''} ${existing.questionText}`;
            const score = calculateDuplicateScore(fullItemText, existingText);
            if (score > highestScore) {
              highestScore = score;
              matchQuestionId = existing.id;
            }
          }
        }

        const isDuplicate = highestScore >= 70;
        const initialStatus: QuestionImportStatus = isDuplicate
          ? 'DUPLICATE'
          : highestScore >= 45
          ? 'NEEDS_REVIEW'
          : 'EXTRACTED';

        const sourceRef: QuestionSourceRef = {
          id: `src-${Date.now()}-${idx}`,
          sourceName: examName || `${institutionName || boardName} ${examType}`,
          sourceType: examType === 'Board Exam' ? 'BOARD_ARCHIVE' : 'EXAM_PAPER',
          institutionOrBoard: institutionName || boardName,
          year,
          examType,
          addedAt: new Date().toISOString(),
        };

        return {
          ...item,
          id: `imp-${Date.now()}-${idx}`,
          classLevel,
          subject,
          chapter: item.chapter || 'অধ্যায় ১',
          difficulty: item.difficulty || 'Medium',
          sourceType: examType === 'Board Exam' ? 'BOARD_EXAM' : 'ORIGINAL_AI',
          sources: [sourceRef],
          timesUsed: 0,
          importStatus: initialStatus,
          duplicateScore: highestScore,
          duplicateMatchQuestionId: matchQuestionId,
          officialAnswer: item.correctAnswer || (item.options ? item.options[item.correctOptionIndex || 0] : ''),
          adminVerifiedAnswer: item.correctAnswer || '',
          aiSuggestedAnswer: item.explanation || '',
          reviewStatus: isDuplicate ? 'NEEDS_REVIEW' : 'APPROVED',
          createdAt: new Date().toISOString(),
        };
      });

      setExtractedQuestions(processed);
      setCurrentStep('review');
    } catch (err: any) {
      setExtractionError(err.message || 'Error occurred during extraction.');
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle item status
  const handleUpdateStatus = (idx: number, status: QuestionImportStatus) => {
    setExtractedQuestions((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, importStatus: status } : item))
    );
  };

  // Link as duplicate source
  const handleLinkAsSource = (item: QuestionImportItem) => {
    if (!item.duplicateMatchQuestionId || !item.sources || item.sources.length === 0) return;
    if (onLinkDuplicateSource) {
      onLinkDuplicateSource(item.duplicateMatchQuestionId, item.sources[0]);
    }
    // Mark as linked duplicate
    setExtractedQuestions((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, importStatus: 'APPROVED' } : q))
    );
  };

  // Finalize Import
  const handleFinalizeImport = () => {
    const approved = extractedQuestions.filter((q) => q.importStatus === 'APPROVED' || q.importStatus === 'EXTRACTED');
    if (approved.length === 0) {
      alert(isBangla ? 'অন্তত একটি প্রশ্ন অনুমোদন (Approve) করুন।' : 'Please approve at least one question.');
      return;
    }

    const record: ExamPaperImportRecord = {
      id: `record-${Date.now()}`,
      examName: examName || `${subject} Examination`,
      institutionName: institutionName || boardName,
      classLevel,
      subject,
      examType,
      academicYear: year,
      examYear: year,
      boardName,
      fullMarks,
      language,
      fileName: uploadedFile?.name || 'Manual_Exam_Import.txt',
      status: approved.length === extractedQuestions.length ? 'APPROVED' : 'PARTIALLY_APPROVED',
      extractedQuestions,
      totalExtractedCount: extractedQuestions.length,
      approvedCount: approved.length,
      uploadedBy: 'Admin User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onImportComplete(approved, record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {isBangla ? 'পরীক্ষা পত্র থেকে প্রশ্ন ইমপোর্ট উইজার্ড' : 'Exam Paper Question Import Wizard'}
              </h3>
              <p className="text-xs text-slate-500">
                {isBangla
                  ? 'বোর্ড পরীক্ষা, স্কুল টেস্ট বা মডেল টেস্ট পেপার থেকে স্বয়ংক্রিয়ভাবে উদ্দীপক ও প্রশ্ন সংরক্ষণ করুন।'
                  : 'Digitize past board exams or school test papers with intact stimulus and sub-parts.'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: UPLOAD & METADATA */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              {/* Mode Selector */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit text-xs font-bold">
                <button
                  onClick={() => setInputMode('file')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    inputMode === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isBangla ? 'PDF / ছবি ফাইল' : 'PDF / Image File'}
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    inputMode === 'text' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isBangla ? 'সরাসরি টেক্সট পেস্ট' : 'Paste Raw Text'}
                </button>
              </div>

              {/* File Upload Box */}
              {inputMode === 'file' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 rounded-2xl p-6 text-center space-y-3 cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {uploadedFile ? uploadedFile.name : isBangla ? 'পরীক্ষা পত্রের PDF বা স্ক্যান ছবি নির্বাচন করুন' : 'Click to upload Exam PDF or scanned image'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {uploadedFile
                        ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`
                        : isBangla
                        ? 'সাপোর্ট: PDF, JPEG, PNG (বোর্ড প্রশ্ন বা টেস্ট পেপারের পাতার ছবি)'
                        : 'Supports PDF, JPEG, PNG pages'}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadedFile(e.target.files[0]);
                        if (!examName) {
                          setExamName(e.target.files[0].name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
                        }
                      }
                    }}
                    className="hidden"
                  />
                </div>
              )}

              {/* Text Input Area */}
              {inputMode === 'text' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'প্রশ্নপত্রের টেক্সট পেস্ট করুন' : 'Paste Exam Paper Text'}
                  </label>
                  <textarea
                    rows={6}
                    value={rawTextPasted}
                    onChange={(e) => setRawTextPasted(e.target.value)}
                    placeholder={
                      isBangla
                        ? '১. উদ্দীপকটি পড়ো এবং নিচের প্রশ্নগুলোর উত্তর দাও...\nক. জ্ঞানমূলক প্রশ্ন\nখ. অনুধাবনমূলক প্রশ্ন\nগ. প্রয়োগমূলক প্রশ্ন\nঘ. উচ্চতর দক্ষতামূলক প্রশ্ন'
                        : 'Paste raw exam questions here...'
                    }
                    className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-serif"
                  />
                </div>
              )}

              {/* Metadata Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'পরীক্ষার নাম *' : 'Exam Name *'}
                  </label>
                  <input
                    type="text"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="উদা: এসএসসি টেস্ট পরীক্ষা ২০২৪ / বার্ষিক মূল্যায়ন"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'পরীক্ষার ধরন *' : 'Exam Type *'}
                  </label>
                  <select
                    value={examType}
                    onChange={(e: any) => setExamType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'প্রতিষ্ঠান / বোর্ড নাম' : 'Institution / Board Name'}
                  </label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="উদা: রাজউক উত্তরা মডেল কলেজ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>

                {examType === 'Board Exam' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBangla ? 'শিক্ষা বোর্ড' : 'Education Board'}
                    </label>
                    <select
                      value={boardName}
                      onChange={(e) => setBoardName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                    >
                      {BANGLADESH_BOARDS.map((b) => (
                        <option key={b.id} value={b.nameEn}>
                          {isBangla ? b.nameBn : b.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'শ্রেণি *' : 'Class Level *'}
                  </label>
                  <select
                    value={classLevel}
                    onChange={(e: any) => setClassLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'বিষয় *' : 'Subject *'}
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    {NCTB_SUBJECTS.map((s) => (
                      <option key={s.id} value={s.nameEn}>
                        {isBangla ? s.nameBn : s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'বছর' : 'Year'}
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    {BOARD_EXAM_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'পূর্ণমান' : 'Full Marks'}
                  </label>
                  <input
                    type="number"
                    value={fullMarks}
                    onChange={(e) => setFullMarks(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  />
                </div>
              </div>

              {/* Error Message */}
              {extractionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{extractionError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: EXTRACTING PROGRESS */}
          {currentStep === 'extracting' && (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center animate-pulse">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800">{statusMessage}</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isBangla
                  ? 'উদ্দীপক ও ক, খ, গ, ঘ অংশের অবিচ্ছেদ্য সম্পর্ক নিশ্চিত করা হচ্ছে এবং ডুপ্লিকেট প্রশ্ন স্ক্যান করা হচ্ছে...'
                  : 'Preserving CQ stimulus structure and scanning against existing question bank for duplicates...'}
              </p>
            </div>
          )}

          {/* STEP 3: REVIEW & APPROVAL SCREEN */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    {isBangla
                      ? `নিষ্কাশিত প্রশ্নসমূহ (${extractedQuestions.length} টি)`
                      : `Extracted Questions (${extractedQuestions.length})`}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isBangla
                      ? 'প্রতিটি প্রশ্ন যাচাই করে অনুমোদন (Approve) করুন। ডুপ্লিকেট চিহ্নিত হলে নতুন উৎস হিসেবে লিঙ্ক করুন।'
                      : 'Review each item. Questions with high similarity can be linked as additional sources.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setExtractedQuestions((prev) =>
                        prev.map((q) => ({ ...q, importStatus: 'APPROVED' }))
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold"
                  >
                    {isBangla ? 'সবগুলো অনুমোদন' : 'Approve All'}
                  </button>
                </div>
              </div>

              {/* Extracted Questions List */}
              <div className="space-y-4">
                {extractedQuestions.map((q, idx) => {
                  const isDup = q.importStatus === 'DUPLICATE' || (q.duplicateScore && q.duplicateScore >= 60);

                  return (
                    <div
                      key={q.id || idx}
                      className={`p-5 rounded-2xl border space-y-3 transition-all ${
                        q.importStatus === 'APPROVED'
                          ? 'bg-white border-emerald-300 ring-1 ring-emerald-400/20'
                          : q.importStatus === 'REJECTED'
                          ? 'bg-slate-50/70 border-slate-200 opacity-60'
                          : isDup
                          ? 'bg-amber-50/40 border-amber-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                            {q.questionType}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">{q.marks} নম্বর</span>
                        </div>

                        {/* Status Badges & Duplicate Alert */}
                        <div className="flex items-center gap-2">
                          {isDup && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {isBangla
                                ? `প্রশ্ন ব্যাংকে সাদৃশ্য: ${q.duplicateScore}%`
                                : `Duplicate Match: ${q.duplicateScore}%`}
                            </span>
                          )}

                          <select
                            value={q.importStatus}
                            onChange={(e: any) => handleUpdateStatus(idx, e.target.value)}
                            className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 font-bold bg-white"
                          >
                            <option value="EXTRACTED">Extracted</option>
                            <option value="APPROVED">Approved (অনুমোদিত)</option>
                            <option value="NEEDS_REVIEW">Needs Review</option>
                            <option value="REJECTED">Reject (বাতিল)</option>
                          </select>
                        </div>
                      </div>

                      {/* Creative Stimulus */}
                      {q.stimulus && (
                        <div className="bg-blue-50/50 border-l-4 border-blue-500 p-3 rounded-r-xl space-y-1">
                          <span className="text-[10px] font-bold uppercase text-blue-700">উদ্দীপক:</span>
                          <div className="text-xs text-slate-800 font-serif leading-relaxed">
                            <MathRenderer text={q.stimulus} />
                          </div>
                        </div>
                      )}

                      {/* Question Text */}
                      <div className="text-sm font-bold text-slate-900">
                        <MathRenderer text={q.questionText} />
                      </div>

                      {/* CQ Parts */}
                      {q.cqParts && (
                        <div className="space-y-1.5 pt-1 text-xs">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="font-bold text-slate-700">ক. ({q.cqParts.partA.marks} মান): </span>
                            <MathRenderer text={q.cqParts.partA.question} />
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="font-bold text-slate-700">খ. ({q.cqParts.partB.marks} মান): </span>
                            <MathRenderer text={q.cqParts.partB.question} />
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="font-bold text-slate-700">গ. ({q.cqParts.partC.marks} মান): </span>
                            <MathRenderer text={q.cqParts.partC.question} />
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="font-bold text-slate-700">ঘ. ({q.cqParts.partD.marks} মান): </span>
                            <MathRenderer text={q.cqParts.partD.question} />
                          </div>
                        </div>
                      )}

                      {/* Duplicate Actions */}
                      {isDup && q.duplicateMatchQuestionId && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-3 text-xs">
                          <span className="text-amber-900 font-medium">
                            {isBangla
                              ? 'এই প্রশ্নটি ইতিমধ্যে প্রশ্ন ব্যাংকে রয়েছে। ডুপ্লিকেট তৈরি না করে নতুন উৎস হিসেবে যোগ করতে চান?'
                              : 'This question exists in repository. Link as additional exam source?'}
                          </span>
                          <button
                            onClick={() => handleLinkAsSource(q)}
                            className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs shrink-0"
                          >
                            {isBangla ? 'উৎস লিঙ্ক করুন' : 'Link Source'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {currentStep === 'review' ? (
            <button
              onClick={() => setCurrentStep('upload')}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold"
            >
              {isBangla ? 'ফিরে যান' : 'Back to Upload'}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold"
            >
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>
          )}

          {currentStep === 'upload' ? (
            <button
              onClick={handleStartExtraction}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              <Sparkles className="w-4 h-4" />
              {isBangla ? 'প্রশ্ন নিষ্কাশন শুরু করুন' : 'Start Extraction'}
            </button>
          ) : currentStep === 'review' ? (
            <button
              onClick={handleFinalizeImport}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
            >
              <Check className="w-4 h-4" />
              {isBangla ? 'অনুমোদিত প্রশ্ন সংরক্ষণ করুন' : 'Finalize & Import to Bank'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
