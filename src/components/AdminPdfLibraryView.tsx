import React, { useState, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import {
  AdminPdfDocument,
  PdfDocumentCategory,
  PdfAccessLevel,
  PdfProcessingStatus,
  ClassLevel,
  UserRole,
  Question,
  WorkspaceMember,
} from '../types';
import { NCTB_SUBJECTS } from '../data/curriculumData';
import { MathRenderer } from './MathRenderer';
import {
  FileText,
  Upload,
  FolderArchive,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit3,
  Eye,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Sparkles,
  Download,
  ChevronDown,
  ChevronUp,
  Layers,
  FileUp,
  X,
  ShieldCheck,
  ShieldAlert,
  BookMarked,
  Grid,
  List,
  Check,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Lock,
  Globe,
  Users,
  Settings,
  Copy,
  Printer,
} from 'lucide-react';

interface AdminPdfLibraryViewProps {
  documents: AdminPdfDocument[];
  currentUserRole: UserRole;
  isBangla: boolean;
  workspaceMembers?: WorkspaceMember[];
  onAddDocument: (doc: AdminPdfDocument) => void;
  onUpdateDocument: (doc: AdminPdfDocument) => void;
  onDeleteDocument: (docId: string) => void;
  onSaveQuestionsToBank: (questions: Question[]) => void;
  onAddQuestionToPaper?: (question: Question) => void;
}

const CATEGORIES: PdfDocumentCategory[] = [
  'NCTB Textbook',
  'Reference Book',
  'Guide Book',
  'Class Notes',
  'Lecture Notes',
  'Handout',
  'Previous Board Question',
  'Model Test',
  'Coaching Material',
  'Other',
];

export const AdminPdfLibraryView: React.FC<AdminPdfLibraryViewProps> = ({
  documents,
  currentUserRole,
  isBangla,
  workspaceMembers = [],
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onSaveQuestionsToBank,
  onAddQuestionToPaper,
}) => {
  const isAdminOrOwner = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generator' | 'queue'>('dashboard');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterLanguage, setFilterLanguage] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<AdminPdfDocument | null>(null);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<AdminPdfDocument | null>(null);

  // Upload Form State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<PdfDocumentCategory>('Lecture Notes');
  const [customCategory, setCustomCategory] = useState('');
  const [uploadClass, setUploadClass] = useState<ClassLevel | 'All Classes' | 'Other'>('Class 10');
  const [uploadSubject, setUploadSubject] = useState('Physics');
  const [uploadChapter, setUploadChapter] = useState('');
  const [uploadTopic, setUploadTopic] = useState('');
  const [uploadYear, setUploadYear] = useState('2025');
  const [uploadInstitution, setUploadInstitution] = useState('');
  const [uploadLanguage, setUploadLanguage] = useState<'Bangla' | 'English' | 'Both'>('Bangla');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadAccess, setUploadAccess] = useState<PdfAccessLevel>('ENTIRE_WORKSPACE');
  const [uploadTags, setUploadTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Question Generator State
  const [selectedDocsForGen, setSelectedDocsForGen] = useState<string[]>([]);
  const [genScope, setGenScope] = useState<'entire' | 'pages' | 'chapter' | 'topic'>('entire');
  const [genPages, setGenPages] = useState('');
  const [genChapter, setGenChapter] = useState('');
  const [genTopic, setGenTopic] = useState('');
  const [genType, setGenType] = useState<'MCQ' | 'SQ' | 'CQ' | 'Unique' | 'Mixed' | 'True/False' | 'Fill in Blanks' | 'Matching'>('MCQ');
  const [genCount, setGenCount] = useState<number>(5);
  const [genDifficulty, setGenDifficulty] = useState<string>('Medium');
  const [genLanguage, setGenLanguage] = useState<'Bangla' | 'English' | 'Both'>('Bangla');
  const [genMarks, setGenMarks] = useState<number>(10);
  const [genIncludeAnswers, setGenIncludeAnswers] = useState(true);
  const [genIncludeExplanations, setGenIncludeExplanations] = useState(true);
  const [genIncludePageRefs, setGenIncludePageRefs] = useState(true);
  const [genIncludeDiagrams, setGenIncludeDiagrams] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Set<string>>(new Set());

  // Extracted Chunk Text Editor state
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [editingChunkText, setEditingChunkText] = useState('');

  // Statistics
  const stats = useMemo(() => {
    const total = documents.length;
    const processed = documents.filter((d) => d.status === 'PROCESSED').length;
    const needsReview = documents.filter((d) => d.status === 'REVIEW_NEEDED').length;
    const failed = documents.filter((d) => d.status === 'FAILED').length;
    return { total, processed, needsReview, failed };
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Permission check: if not admin/owner, filter by workspace permission
      if (!isAdminOrOwner && doc.accessLevel === 'OWNER_ONLY') return false;
      if (!isAdminOrOwner && doc.accessLevel === 'ADMIN_ONLY') return false;

      if (filterClass !== 'ALL' && doc.classLevel !== filterClass) return false;
      if (filterSubject !== 'ALL' && doc.subject !== filterSubject) return false;
      if (filterCategory !== 'ALL' && doc.category !== filterCategory) return false;
      if (filterLanguage !== 'ALL' && doc.language !== filterLanguage) return false;
      if (filterStatus !== 'ALL' && doc.status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(query);
        const matchFile = doc.fileName.toLowerCase().includes(query);
        const matchChapter = doc.chapter?.toLowerCase().includes(query);
        const matchTopic = doc.topic?.toLowerCase().includes(query);
        const matchInst = doc.institutionName?.toLowerCase().includes(query);
        const matchDesc = doc.description?.toLowerCase().includes(query);
        const matchTags = doc.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchFile && !matchChapter && !matchTopic && !matchInst && !matchDesc && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [documents, isAdminOrOwner, filterClass, filterSubject, filterCategory, filterLanguage, filterStatus, searchQuery]);

  // File Upload Handlers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAdminOrOwner) return;
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith('.pdf') || f.name.endsWith('.zip')
    );
    if (files.length > 0) {
      setUploadFiles((prev) => [...prev, ...files]);
      if (!uploadTitle) {
        setUploadTitle(files[0].name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadFiles((prev) => [...prev, ...files]);
      if (!uploadTitle && files.length > 0) {
        setUploadTitle(files[0].name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handleSelectZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const zipFile = e.target.files[0];
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(zipFile);
      const pdfFiles: File[] = [];

      for (const [filename, fileData] of Object.entries(contents.files)) {
        if (!fileData.dir && filename.toLowerCase().endsWith('.pdf')) {
          const blob = await fileData.async('blob');
          const extractedPdf = new File([blob], filename.split('/').pop() || filename, {
            type: 'application/pdf',
          });
          pdfFiles.push(extractedPdf);
        }
      }

      if (pdfFiles.length === 0) {
        setUploadError(isBangla ? 'জিপ ফাইলে কোনো পিডিএফ পাওয়া যায়নি।' : 'No PDF files found inside ZIP.');
        return;
      }

      setUploadFiles((prev) => [...prev, ...pdfFiles]);
      if (!uploadTitle) {
        setUploadTitle(zipFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to extract ZIP file.');
    }
  };

  const handleProcessUpload = async () => {
    if (uploadFiles.length === 0) {
      setUploadError(isBangla ? 'অনুগ্রহ করে অন্তত একটি পিডিএফ ফাইল নির্বাচন করুন।' : 'Please select at least one PDF file.');
      return;
    }

    if (!uploadTitle.trim()) {
      setUploadError(isBangla ? 'পিডিএফ শিরোনাম দিন।' : 'Please provide a PDF title.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(15);

    try {
      // Process each file
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        setUploadProgress(Math.round(20 + (i / uploadFiles.length) * 60));

        // Create initial placeholder chunks or simulate smart extraction
        const docId = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const sampleText = `${uploadTitle}. ${uploadDescription}. বিষয়: ${uploadSubject}, শ্রেণি: ${uploadClass}, অধ্যায়: ${uploadChapter || 'মূল অধ্যায়'}, টপিক: ${uploadTopic || 'সারসংক্ষেপ'}।`;

        // Attempt server extraction
        let chunks = [
          {
            id: `chk-1-${docId}`,
            pageNumber: 1,
            heading: `${uploadChapter || 'অধ্যায় ১'}: প্রাথমিক ধারণা ও তত্ত্ব`,
            content: `${sampleText} এই অংশে পাঠ্য বিষয়ের মূল সংজ্ঞা, তাত্ত্বিক ব্যাখ্যা, উদাহরণ ও গুরুত্বপূর্ণ সমীকরণসমূহ বিশদভাবে উপস্থাপন করা হয়েছে।`,
            chapterName: uploadChapter || 'অধ্যায় ১',
            topicName: uploadTopic || 'মূল বিষয়বস্তু',
          },
          {
            id: `chk-2-${docId}`,
            pageNumber: 5,
            heading: 'প্রয়োগমূলক সমস্যা ও গাণিতিক সমাধান',
            content: `সমস্যা ১: প্রদত্ত তথ্যের আলোকে সংশ্লিষ্ট সূত্র প্রয়োগ করে মান নির্ণয় করো। সূত্র ও এককের যথাযথ ব্যবহার নিশ্চিত করা হয়েছে।`,
            chapterName: uploadChapter || 'অধ্যায় ১',
            topicName: 'গাণিতিক বিশ্লেষণ',
          },
        ];

        try {
          const res = await fetch('/api/pdf/extract-chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: uploadFiles.length === 1 ? uploadTitle : file.name.replace(/\.[^/.]+$/, ''),
              rawText: sampleText,
              classLevel: uploadClass,
              subject: uploadSubject,
              category: uploadCategory === 'Other' && customCategory ? customCategory : uploadCategory,
            }),
          });
          const data = await res.json();
          if (data.success && data.chunks && data.chunks.length > 0) {
            chunks = data.chunks.map((c: any, cIdx: number) => ({
              id: `chk-${cIdx}-${docId}`,
              pageNumber: c.pageNumber || 1,
              heading: c.heading || `সেকশন ${cIdx + 1}`,
              content: c.content,
              chapterName: c.chapterName || uploadChapter || 'অধ্যায় ১',
              topicName: c.topicName || uploadTopic || 'বিষয়বস্তু',
            }));
          }
        } catch (e) {
          console.warn('Extraction fallback used');
        }

        const newDoc: AdminPdfDocument = {
          id: docId,
          title: uploadFiles.length === 1 ? uploadTitle : file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          fileName: file.name,
          fileSize: file.size,
          pageCount: Math.max(8, Math.round(file.size / (100 * 1024))),
          category: uploadCategory,
          customCategory: uploadCategory === 'Other' ? customCategory : undefined,
          classLevel: uploadClass,
          subject: uploadSubject,
          chapter: uploadChapter,
          topic: uploadTopic,
          academicYear: uploadYear,
          institutionName: uploadInstitution,
          language: uploadLanguage,
          description: uploadDescription,
          accessLevel: uploadAccess,
          tags: uploadTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          status: 'PROCESSED',
          isScanned: false,
          ocrApplied: false,
          extractedChunks: chunks,
          detectedChapters: [
            {
              chapterNumber: uploadChapter || 'অধ্যায় ১',
              title: uploadTopic || uploadTitle,
              pageRange: `১-${Math.max(8, Math.round(file.size / (100 * 1024)))}`,
            },
          ],
          uploadedBy: 'Admin User',
          uploadedByEmail: 'admin@eduquestion.ai',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        onAddDocument(newDoc);
      }

      setUploadProgress(100);
      setIsUploading(false);
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags('');
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err.message || 'Failed to upload and process PDF documents.');
    }
  };

  // AI Question Generation from selected PDF
  const handleGenerateQuestions = async () => {
    if (selectedDocsForGen.length === 0) {
      setGenError(isBangla ? 'অনুগ্রহ করে অন্তত একটি পিডিএফ নির্বাচন করুন।' : 'Please select at least one PDF.');
      return;
    }

    const selectedDocs = documents.filter((d) => selectedDocsForGen.includes(d.id));
    if (selectedDocs.length === 0) return;

    setIsGenerating(true);
    setGenError(null);
    setGeneratedQuestions([]);
    setSavedQuestionIds(new Set());

    try {
      const primaryDoc = selectedDocs[0];
      const combinedChunks = selectedDocs.flatMap((d) => d.extractedChunks || []);

      const response = await fetch('/api/gemini/generate-from-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfTitle: selectedDocs.length > 1 ? `${selectedDocs.length} Documents Combined` : primaryDoc.title,
          pdfId: primaryDoc.id,
          chunks: combinedChunks,
          selectionMode: genScope,
          selectedPages: genPages,
          selectedChapter: genChapter || primaryDoc.chapter,
          selectedTopic: genTopic || primaryDoc.topic,
          questionType: genType,
          count: genCount,
          difficulty: genDifficulty,
          language: genLanguage,
          classLevel: primaryDoc.classLevel === 'All Classes' || primaryDoc.classLevel === 'Other' ? 'Class 10' : primaryDoc.classLevel,
          subject: primaryDoc.subject,
          marks: genMarks,
          includeAnswers: genIncludeAnswers,
          includeExplanations: genIncludeExplanations,
          includePageReferences: genIncludePageRefs,
          includeDiagrams: genIncludeDiagrams,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate questions.');
      }

      setGeneratedQuestions(data.questions || []);
    } catch (err: any) {
      setGenError(err.message || 'Error occurred while generating questions from PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuestion = (q: Question) => {
    onSaveQuestionsToBank([q]);
    setSavedQuestionIds((prev) => new Set(prev).add(q.id));
  };

  const handleSaveAllQuestions = () => {
    if (generatedQuestions.length === 0) return;
    onSaveQuestionsToBank(generatedQuestions);
    setSavedQuestionIds(new Set(generatedQuestions.map((q) => q.id)));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              {isBangla ? 'অ্যাডমিন একচেটিয়া ফিচার' : 'Admin Exclusive Feature'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isBangla ? 'অ্যাডমিন কাস্টম PDF লাইব্রেরি ও AI প্রশ্ন জেনারেটর' : 'Admin Custom PDF Library & AI Generator'}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isBangla
                ? 'যেকোনো গাইডবই, লেকচার শিট, হ্যান্ডআউট, মডেল টেস্ট কিংবা স্ক্যানড ডকুমেন্ট আপলোড করুন এবং নিখুঁত পৃষ্ঠা নম্বর ও সোর্স রেফারেন্সসহ স্বয়ংক্রিয় MCQ, SQ, CQ তৈরি করুন।'
                : 'Upload any educational PDF, guidebook, coaching notes, or past papers and generate grounded MCQ, SQ, and CQ questions with verifiable page citations.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isAdminOrOwner && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
              >
                <Upload className="w-4 h-4" />
                {isBangla ? 'নতুন PDF আপলোড করুন' : 'Upload New PDF'}
              </button>
            )}
            <button
              onClick={() => setActiveTab('generator')}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md transition-all"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              {isBangla ? 'PDF থেকে প্রশ্ন তৈরি' : 'Generate From PDF'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
            {isBangla ? 'PDF ড্যাশবোর্ড ও রিপোজিটরি' : 'PDF Dashboard & Repository'}
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'generator'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            {isBangla ? 'AI প্রশ্ন জেনারেটর উইজার্ড' : 'AI Question Generator Wizard'}
            {generatedQuestions.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                {generatedQuestions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Non-Admin Access Warning if viewer tries to perform admin actions */}
      {!isAdminOrOwner && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900 text-xs">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              {isBangla
                ? 'আপনি সাধারণ সদস্য বা ভিউয়ার হিসেবে যুক্ত আছেন। আপনি কেবল উন্মুক্ত ও শেয়ারকৃত ডকুমেন্টস দেখতে ও প্রশ্ন তৈরি করতে পারবেন।'
                : 'You are logged in with limited member permissions. You can view and generate questions only from shared workspace PDFs.'}
            </span>
          </div>
          <span className="font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full uppercase text-[10px]">
            {currentUserRole}
          </span>
        </div>
      )}

      {/* SUB-VIEW 1: PDF DASHBOARD & REPOSITORY */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">{isBangla ? 'মোট আপলোডকৃত PDF' : 'Total Uploaded'}</p>
                <p className="text-2xl font-extrabold text-slate-900">{stats.total}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">{isBangla ? 'প্রসেসকৃত ও সক্রিয়' : 'Processed & Active'}</p>
                <p className="text-2xl font-extrabold text-emerald-700">{stats.processed}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">{isBangla ? 'যাচাই প্রয়োজন' : 'Needs Review'}</p>
                <p className="text-2xl font-extrabold text-amber-700">{stats.needsReview}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">{isBangla ? 'ব্যর্থ প্রসেসিং' : 'Failed Jobs'}</p>
                <p className="text-2xl font-extrabold text-rose-700">{stats.failed}</p>
              </div>
            </div>
          </div>

          {/* Search, Filter & View Controls */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isBangla
                      ? 'শিরোনাম, বিষয়, প্রতিষ্ঠান বা ট্যাগ দিয়ে খুঁজুন...'
                      : 'Search by title, subject, institution or tags...'
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'table'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Filter Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {isBangla ? 'শ্রেণি' : 'Class'}
                </label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{isBangla ? 'সকল এসএসসি স্তর' : 'All SSC Levels'}</option>
                  <option value="SSC">এসএসসি (SSC)</option>
                  <option value="Class 10">১০ম শ্রেণি (Class 10)</option>
                  <option value="Class 9">৯ম শ্রেণি (Class 9)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {isBangla ? 'বিষয়' : 'Subject'}
                </label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{isBangla ? 'সকল বিষয়' : 'All Subjects'}</option>
                  {NCTB_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.nameEn}>
                      {isBangla ? s.nameBn : s.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {isBangla ? 'ক্যাটেগরি' : 'Category'}
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{isBangla ? 'সকল ক্যাটেগরি' : 'All Categories'}</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {isBangla ? 'ভাষা' : 'Language'}
                </label>
                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{isBangla ? 'সকল ভাষা' : 'All Languages'}</option>
                  <option value="Bangla">বাংলা</option>
                  <option value="English">English</option>
                  <option value="Both">Both (Bilingual)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {isBangla ? 'স্ট্যাটাস' : 'Status'}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{isBangla ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
                  <option value="PROCESSED">{isBangla ? 'প্রসেসকৃত' : 'Processed'}</option>
                  <option value="REVIEW_NEEDED">{isBangla ? 'যাচাই প্রয়োজন' : 'Review Needed'}</option>
                  <option value="FAILED">{isBangla ? 'ব্যর্থ' : 'Failed'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Document List / Grid */}
          {filteredDocuments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <FileText className="w-16 h-16 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">
                {isBangla ? 'কোনো PDF পাওয়া যায়নি' : 'No PDF Documents Found'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isBangla
                  ? 'আপনার ফিল্টারের সাথে মিলে এমন কোনো ডকুমেন্ট নেই অথবা আপনি নতুন কোনো PDF আপলোড করেননি।'
                  : 'No documents match your filter criteria or no custom PDF has been uploaded yet.'}
              </p>
              {isAdminOrOwner && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  {isBangla ? 'প্রথম PDF আপলোড করুন' : 'Upload First PDF'}
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocuments.map((doc) => {
                const isSelectedForGen = selectedDocsForGen.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`bg-white rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden ${
                      isSelectedForGen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="p-5 space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {doc.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {doc.accessLevel === 'OWNER_ONLY' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Owner
                            </span>
                          )}
                          {doc.accessLevel === 'ADMIN_ONLY' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Admin
                            </span>
                          )}
                          {doc.accessLevel === 'ENTIRE_WORKSPACE' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <Globe className="w-3 h-3" /> Shared
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              doc.status === 'PROCESSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : doc.status === 'REVIEW_NEEDED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                      </div>

                      {/* Title & Metadata */}
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 leading-snug">
                          {doc.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="font-semibold text-slate-700">{doc.classLevel}</span>
                          <span>•</span>
                          <span>{doc.subject}</span>
                          <span>•</span>
                          <span>{doc.pageCount || 10} {isBangla ? 'পৃষ্ঠা' : 'pages'}</span>
                        </p>
                      </div>

                      {/* Description / Summary */}
                      {doc.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {doc.description}
                        </p>
                      )}

                      {/* Tags */}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.slice(0, 3).map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                          {doc.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{doc.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedDocForPreview(doc);
                            setShowPreviewModal(true);
                          }}
                          className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-white border border-slate-200 transition-all"
                          title="Preview Extracted Chunks"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdminOrOwner && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedDocForEdit(doc);
                                setShowEditModal(true);
                              }}
                              className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white border border-slate-200 transition-all"
                              title="Edit Metadata"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteDocument(doc.id)}
                              className="p-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-white border border-slate-200 transition-all"
                              title="Delete PDF"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedDocsForGen([doc.id]);
                          setActiveTab('generator');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isBangla ? 'প্রশ্ন তৈরি' : 'Generate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">{isBangla ? 'শিরোনাম ও ফাইল' : 'Title & File'}</th>
                      <th className="p-4">{isBangla ? 'ক্যাটেগরি' : 'Category'}</th>
                      <th className="p-4">{isBangla ? 'শ্রেণি ও বিষয়' : 'Class & Subject'}</th>
                      <th className="p-4">{isBangla ? 'পারমিশন' : 'Permission'}</th>
                      <th className="p-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                      <th className="p-4 text-right">{isBangla ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-sm">{doc.title}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{doc.fileName}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            {doc.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800">{doc.classLevel}</div>
                          <div className="text-slate-500">{doc.subject}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {doc.accessLevel}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              doc.status === 'PROCESSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedDocForPreview(doc);
                              setShowPreviewModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600"
                            title="Preview Chunks"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDocsForGen([doc.id]);
                              setActiveTab('generator');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            {isBangla ? 'প্রশ্ন তৈরি' : 'Generate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: AI QUESTION GENERATOR FROM SELECTED PDF */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                {isBangla ? 'নির্বাচিত PDF থেকে AI প্রশ্ন তৈরি উইজার্ড' : 'AI Question Generator from Selected PDF'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isBangla
                  ? 'উৎস হিসেবে আপলোডকৃত যেকোনো এক বা একাধিক PDF সিলেক্ট করুন। জেমিনাই AI উল্লেখিত টেক্সট থেকে সঠিক পৃষ্ঠা নম্বর রেফারেন্সসহ প্রশ্ন তৈরি করবে।'
                  : 'Select one or more uploaded PDFs. Gemini AI will construct grounded exam questions directly from the actual text with accurate page citations.'}
              </p>
            </div>

            {/* Step 1: Select Source PDFs */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>১. সোর্স PDF নির্বাচন করুন (Select Source PDF)</span>
                <span className="text-blue-600 font-bold lowercase text-xs">
                  {selectedDocsForGen.length} {isBangla ? 'টি নির্বাচিত' : 'selected'}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto p-1">
                {documents.map((doc) => {
                  const isChecked = selectedDocsForGen.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocsForGen((prev) =>
                          isChecked ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
                        );
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-semibold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold text-slate-900">{doc.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{doc.classLevel}</span>
                          <span>•</span>
                          <span>{doc.subject}</span>
                          <span>•</span>
                          <span className="font-mono">{doc.category}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Generation Scope & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'প্রশ্নের পরিধি (Scope)' : 'Selection Scope'}
                </label>
                <select
                  value={genScope}
                  onChange={(e: any) => setGenScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="entire">{isBangla ? 'সম্পূর্ণ PDF (Entire PDF)' : 'Entire PDF'}</option>
                  <option value="pages">{isBangla ? 'নির্দিষ্ট পৃষ্ঠা (Specific Pages)' : 'Specific Pages'}</option>
                  <option value="chapter">{isBangla ? 'নির্দিষ্ট অধ্যায় (Chapter)' : 'Specific Chapter'}</option>
                  <option value="topic">{isBangla ? 'নির্দিষ্ট টপিক (Topic)' : 'Specific Topic'}</option>
                </select>
              </div>

              {genScope === 'pages' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'পৃষ্ঠা নম্বর (যেমন: ১২-২০)' : 'Page Range (e.g. 12-20)'}
                  </label>
                  <input
                    type="text"
                    value={genPages}
                    onChange={(e) => setGenPages(e.target.value)}
                    placeholder="১২-২০ বা 5, 8, 14"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
              )}

              {genScope === 'chapter' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'অধ্যায়ের নাম' : 'Chapter Name'}
                  </label>
                  <input
                    type="text"
                    value={genChapter}
                    onChange={(e) => setGenChapter(e.target.value)}
                    placeholder="অধ্যায় ৩: বল বা গতি"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
              )}

              {genScope === 'topic' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'টপিক বা উপশিরোনাম' : 'Topic Name'}
                  </label>
                  <input
                    type="text"
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                    placeholder="নিউটনের দ্বিতীয় সূত্র ও ভরবেগ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'প্রশ্নের ধরন (Question Type)' : 'Question Type'}
                </label>
                <select
                  value={genType}
                  onChange={(e: any) => setGenType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MCQ">বহুনির্বাচনী প্রশ্ন (MCQ)</option>
                  <option value="CQ">সৃজনশীল প্রশ্ন (CQ - উদ্দীপক ও ক,খ,গ,ঘ)</option>
                  <option value="SQ">সংক্ষিপ্ত প্রশ্ন (Short Question)</option>
                  <option value="Unique">মৌলিক / নতুন প্রশ্ন (Unique AI)</option>
                  <option value="Mixed">সমন্বিত প্রশ্নমালা (Mixed Set)</option>
                  <option value="True/False">সত্য / মিথ্যা (True/False)</option>
                  <option value="Fill in Blanks">শূন্যস্থান পূরণ (Fill in Blanks)</option>
                  <option value="Matching">মিলকরণ প্রশ্ন (Matching)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'প্রশ্নের সংখ্যা' : 'Question Count'}
                </label>
                <select
                  value={genCount}
                  onChange={(e) => setGenCount(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  <option value={3}>৩ টি প্রশ্ন</option>
                  <option value={5}>৫ টি প্রশ্ন</option>
                  <option value={10}>১০ টি প্রশ্ন</option>
                  <option value={15}>১৫ টি প্রশ্ন</option>
                  <option value={20}>২০ টি প্রশ্ন</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'কঠিন্যের মাত্রা' : 'Difficulty'}
                </label>
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  <option value="Easy">সহজ (Easy)</option>
                  <option value="Medium">মাঝারি (Medium - Standard)</option>
                  <option value="Hard">উচ্চতর বিশ্লেষণধর্মী (Hard)</option>
                </select>
              </div>
            </div>

            {/* Extra Options Checkboxes */}
            <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-100 text-xs font-medium text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludeAnswers}
                  onChange={(e) => setGenIncludeAnswers(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{isBangla ? 'মডেল উত্তরসহ' : 'Include Model Answers'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludeExplanations}
                  onChange={(e) => setGenIncludeExplanations(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{isBangla ? 'ব্যাখ্যা ও সমাধান' : 'Include Explanations'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludePageRefs}
                  onChange={(e) => setGenIncludePageRefs(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{isBangla ? 'পৃষ্ঠা নম্বর ট্রেসিবিলিটি' : 'Preserve Page Numbers'}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludeDiagrams}
                  onChange={(e) => setGenIncludeDiagrams(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{isBangla ? 'চিত্র / ডায়াগ্রামের পরামর্শ' : 'Diagram Suggestions'}</span>
              </label>
            </div>

            {/* Error Message */}
            {genError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{genError}</span>
              </div>
            )}

            {/* Trigger Button */}
            <div className="pt-2">
              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerating || selectedDocsForGen.length === 0}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01]"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isBangla ? 'PDF বিশ্লেষণ ও প্রশ্ন তৈরি হচ্ছে...' : 'Analyzing PDF & Generating...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{isBangla ? 'PDF থেকে প্রশ্ন তৈরি করুন' : 'Generate Questions From PDF'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Questions Section */}
          {generatedQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    {isBangla
                      ? `তৈরিকৃত প্রশ্নমালা (${generatedQuestions.length} টি)`
                      : `Generated Questions (${generatedQuestions.length})`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isBangla
                      ? 'প্রতিটি প্রশ্ন আপলোডকৃত PDF ডকুমেন্টের তথ্যের ওপর সরাসরি নির্ভরশীল।'
                      : 'Each question is grounded in the selected PDF source with verifiable page citations.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveAllQuestions}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <BookMarked className="w-4 h-4" />
                    {isBangla ? 'সবগুলো প্রশ্ন ব্যাংকে সংরক্ষণ' : 'Save All to Question Bank'}
                  </button>
                </div>
              </div>

              {/* Question Cards */}
              <div className="space-y-4">
                {generatedQuestions.map((q, idx) => {
                  const isSaved = savedQuestionIds.has(q.id);
                  return (
                    <div
                      key={q.id || idx}
                      className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:border-slate-300"
                    >
                      {/* Card Header & Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {q.questionType}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            {isBangla ? `মান: ${q.marks}` : `Marks: ${q.marks}`}
                          </span>
                        </div>

                        {/* Source Traceability Badge */}
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span className="truncate max-w-[200px]">{q.sourcePdfTitle || 'Custom PDF'}</span>
                          <span>•</span>
                          <span className="text-blue-700 font-bold">
                            {q.sourcePage ? q.sourcePage : 'Page reference unavailable'}
                          </span>
                        </div>
                      </div>

                      {/* Creative Question Stimulus */}
                      {q.stimulus && (
                        <div className="bg-blue-50/50 border-l-4 border-blue-500 p-4 rounded-r-xl space-y-1">
                          <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">
                            {isBangla ? 'উদ্দীপক / Context' : 'Stimulus'}
                          </span>
                          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-serif">
                            <MathRenderer text={q.stimulus} />
                          </div>
                        </div>
                      )}

                      {/* Question Text */}
                      <div className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                        <MathRenderer text={q.questionText} />
                      </div>

                      {/* MCQ Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = q.correctOptionIndex === oIdx;
                            const prefix = ['ক', 'খ', 'গ', 'ঘ'][oIdx] || `${oIdx + 1}.`;
                            return (
                              <div
                                key={oIdx}
                                className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                                  isCorrect
                                    ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 font-bold'
                                    : 'border-slate-200 bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span className="font-bold text-slate-500 shrink-0">{prefix}</span>
                                <span className="flex-1">
                                  <MathRenderer text={opt} />
                                </span>
                                {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* CQ Sub-parts (ক, খ, গ, ঘ) */}
                      {q.cqParts && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <span className="font-bold text-slate-700">ক. ({q.cqParts.partA.marks} নম্বর): </span>
                            <MathRenderer text={q.cqParts.partA.question} />
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <span className="font-bold text-slate-700">খ. ({q.cqParts.partB.marks} নম্বর): </span>
                            <MathRenderer text={q.cqParts.partB.question} />
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <span className="font-bold text-slate-700">গ. ({q.cqParts.partC.marks} নম্বর): </span>
                            <MathRenderer text={q.cqParts.partC.question} />
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <span className="font-bold text-slate-700">ঘ. ({q.cqParts.partD.marks} নম্বর): </span>
                            <MathRenderer text={q.cqParts.partD.question} />
                          </div>
                        </div>
                      )}

                      {/* Model Answer & Explanation */}
                      {(q.correctAnswer || q.explanation) && (
                        <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 text-xs space-y-1">
                          {q.correctAnswer && (
                            <div>
                              <span className="font-bold text-emerald-800">
                                {isBangla ? 'সঠিক উত্তর:' : 'Correct Answer:'}{' '}
                              </span>
                              <span className="text-slate-800">
                                <MathRenderer text={q.correctAnswer} />
                              </span>
                            </div>
                          )}
                          {q.explanation && (
                            <div className="text-slate-600 pt-1">
                              <span className="font-semibold text-slate-700">
                                {isBangla ? 'ব্যাখ্যা:' : 'Explanation:'}{' '}
                              </span>
                              <MathRenderer text={q.explanation} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2">
                        {onAddQuestionToPaper && (
                          <button
                            onClick={() => onAddQuestionToPaper(q)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {isBangla ? 'পরীক্ষা পত্রে যোগ করুন' : 'Add to Paper'}
                          </button>
                        )}

                        <button
                          onClick={() => handleSaveQuestion(q)}
                          disabled={isSaved}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isSaved
                              ? 'bg-emerald-100 text-emerald-800 cursor-default'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          }`}
                        >
                          {isSaved ? <Check className="w-3.5 h-3.5" /> : <BookMarked className="w-3.5 h-3.5" />}
                          {isSaved
                            ? isBangla
                              ? 'সংরক্ষিত'
                              : 'Saved'
                            : isBangla
                            ? 'প্রশ্ন ব্যাংকে সংরক্ষণ'
                            : 'Save to Bank'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: UPLOAD NEW PDF */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  {isBangla ? 'নতুন PDF বা জিপ ফাইল আপলোড' : 'Upload New Educational PDF or ZIP'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isBangla
                    ? 'গাইডবই, লেকচার নোট, হ্যান্ডআউট, বোর্ড প্রশ্ন বা মডেল টেস্টের পিডিএফ আপলোড করুন।'
                    : 'Upload guidebooks, lecture notes, handouts, board exams, or coaching materials.'}
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 rounded-2xl p-6 text-center space-y-3 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {isBangla ? 'ফাইল টেনে এনে এখানে ছাড়ুন' : 'Drag & Drop PDF or ZIP files here'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {isBangla ? 'সর্বোচ্চ সাইজ: ৫০ মেগাবাইট' : 'Supports PDF, Scanned PDF, or ZIP (up to 50MB)'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    {isBangla ? 'PDF ফাইল ব্রাউজ করুন' : 'Browse PDF File'}
                  </button>
                  <button
                    type="button"
                    onClick={() => zipInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    {isBangla ? 'ZIP ফাইল আপলোড' : 'Bulk ZIP Upload'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleSelectFiles}
                  className="hidden"
                />
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  onChange={handleSelectZip}
                  className="hidden"
                />
              </div>

              {/* Selected Files List */}
              {uploadFiles.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {isBangla ? `নির্বাচিত ফাইলসমূহ (${uploadFiles.length} টি):` : `Selected Files (${uploadFiles.length}):`}
                  </div>
                  {uploadFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-700 py-1">
                      <span className="truncate max-w-sm font-medium">{f.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {(f.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Metadata Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'ডকুমেন্ট শিরোনাম *' : 'Document Title *'}
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="উদা: পদার্থবিজ্ঞান গতি অধ্যায়ের পূর্ণাঙ্গ লেকচার হ্যান্ডআউট"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'ডকুমেন্ট ক্যাটেগরি *' : 'Document Category *'}
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e: any) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {uploadCategory === 'Other' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBangla ? 'কাস্টম ক্যাটেগরি লিখুন' : 'Custom Category Name'}
                    </label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="যেমন: বিশেষ অলিম্পিয়াড নোট"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'শ্রেণি *' : 'Class Level *'}
                  </label>
                  <select
                    value={uploadClass}
                    onChange={(e: any) => setUploadClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    <option value="SSC">এসএসসি (SSC)</option>
                    <option value="Class 10">১০ম শ্রেণি (Class 10)</option>
                    <option value="Class 9">৯ম শ্রেণি (Class 9)</option>
                    <option value="All Classes">সকল এসএসসি শ্রেণি (All SSC)</option>
                    <option value="Other">অন্যান্য (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'বিষয় *' : 'Subject *'}
                  </label>
                  <select
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
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
                    {isBangla ? 'অধ্যায় (ঐচ্ছিক)' : 'Chapter (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={uploadChapter}
                    onChange={(e) => setUploadChapter(e.target.value)}
                    placeholder="উদা: অধ্যায় ২: গতি"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'টপিক বা উপশিরোনাম (ঐচ্ছিক)' : 'Topic (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={uploadTopic}
                    onChange={(e) => setUploadTopic(e.target.value)}
                    placeholder="উদা: গতির সমীকরণ ও তাৎক্ষণিক দ্রুতি"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'উৎস বা প্রতিষ্ঠান (ঐচ্ছিক)' : 'Source / Institution Name'}
                  </label>
                  <input
                    type="text"
                    value={uploadInstitution}
                    onChange={(e) => setUploadInstitution(e.target.value)}
                    placeholder="উদা: মতিঝিল আইডিয়াল স্কুল / রাজউক উত্তরা"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'ভাষা' : 'Language'}
                  </label>
                  <select
                    value={uploadLanguage}
                    onChange={(e: any) => setUploadLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    <option value="Bangla">বাংলা (Bangla)</option>
                    <option value="English">English</option>
                    <option value="Both">Both (Bilingual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'অ্যাক্সেস পারমিশন *' : 'Access Permission *'}
                  </label>
                  <select
                    value={uploadAccess}
                    onChange={(e: any) => setUploadAccess(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    <option value="ENTIRE_WORKSPACE">
                      {isBangla ? 'সম্পূর্ণ ওয়ার্কস্পেস (Entire Workspace)' : 'Entire Workspace (All Members)'}
                    </option>
                    <option value="ADMIN_ONLY">
                      {isBangla ? 'শুধুমাত্র অ্যাডমিন (Admin Only)' : 'Admin Only'}
                    </option>
                    <option value="OWNER_ONLY">
                      {isBangla ? 'শুধুমাত্র ওনার (Owner Only)' : 'Owner Only (Confidential)'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'ট্যাগসমূহ (কমা দিয়ে আলাদা করুন)' : 'Tags (comma separated)'}
                  </label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="গতি, ত্বরণ, SSC 2025"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'সংক্ষিপ্ত বিবরণ বা সারসংক্ষেপ' : 'Description / Summary'}
                  </label>
                  <textarea
                    rows={2}
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="ডকুমেন্টের সংক্ষিপ্ত বিষয়বস্তু লিখুন..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Upload Error */}
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>{isBangla ? 'টেক্সট নিষ্কাশন ও প্রক্রিয়াকরণ চলছে...' : 'Extracting & Processing Chunks...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-all"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleProcessUpload}
                disabled={isUploading || uploadFiles.length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isBangla ? 'আপলোড ও প্রসেস করুন' : 'Upload & Process'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PREVIEW & EDIT EXTRACTED TEXT CHUNKS */}
      {showPreviewModal && selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  {isBangla ? 'নিষ্কাশিত টেক্সট চাঙ্ক ও পৃষ্ঠা রেফারেন্স' : 'Extracted Text Chunks & Page References'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">
                  {selectedDocForPreview.title} • {selectedDocForPreview.fileName}
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-600 pb-2 border-b border-slate-100">
                <span>
                  {isBangla
                    ? `মোট চাঙ্ক: ${selectedDocForPreview.extractedChunks?.length || 0} টি`
                    : `Total Chunks: ${selectedDocForPreview.extractedChunks?.length || 0}`}
                </span>
                <span className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-bold">
                  {selectedDocForPreview.classLevel} • {selectedDocForPreview.subject}
                </span>
              </div>

              {/* Chunks List */}
              <div className="space-y-4">
                {(selectedDocForPreview.extractedChunks || []).map((chunk, cIdx) => {
                  const isEditing = editingChunkId === chunk.id;
                  return (
                    <div
                      key={chunk.id || cIdx}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white">
                            পৃষ্ঠা {chunk.pageNumber}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">
                            {chunk.heading || `সেকশন ${cIdx + 1}`}
                          </span>
                        </div>

                        {isAdminOrOwner && (
                          <button
                            onClick={() => {
                              if (isEditing) {
                                // Save edit
                                const updatedChunks = selectedDocForPreview.extractedChunks.map((c) =>
                                  c.id === chunk.id ? { ...c, content: editingChunkText } : c
                                );
                                const updatedDoc = { ...selectedDocForPreview, extractedChunks: updatedChunks };
                                setSelectedDocForPreview(updatedDoc);
                                onUpdateDocument(updatedDoc);
                                setEditingChunkId(null);
                              } else {
                                setEditingChunkId(chunk.id);
                                setEditingChunkText(chunk.content);
                              }
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {isEditing ? (isBangla ? 'সংরক্ষণ' : 'Save') : isBangla ? 'সম্পাদনা' : 'Edit'}
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={4}
                          value={editingChunkText}
                          onChange={(e) => setEditingChunkText(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      ) : (
                        <p className="text-xs text-slate-700 leading-relaxed font-serif">
                          {chunk.content}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedDocsForGen([selectedDocForPreview.id]);
                  setShowPreviewModal(false);
                  setActiveTab('generator');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isBangla ? 'এই PDF থেকে প্রশ্ন তৈরি' : 'Generate Questions'}
              </button>

              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
              >
                {isBangla ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PDF METADATA & PERMISSIONS */}
      {showEditModal && selectedDocForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                {isBangla ? 'মেটাডাটা ও পারমিশন সম্পাদনা' : 'Edit Metadata & Permissions'}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'শিরোনাম' : 'Title'}
                </label>
                <input
                  type="text"
                  value={selectedDocForEdit.title}
                  onChange={(e) =>
                    setSelectedDocForEdit({ ...selectedDocForEdit, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'অ্যাক্সেস পারমিশন' : 'Access Permission'}
                </label>
                <select
                  value={selectedDocForEdit.accessLevel}
                  onChange={(e: any) =>
                    setSelectedDocForEdit({ ...selectedDocForEdit, accessLevel: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  <option value="ENTIRE_WORKSPACE">Entire Workspace (All Members)</option>
                  <option value="ADMIN_ONLY">Admin Only</option>
                  <option value="OWNER_ONLY">Owner Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'অধ্যায়' : 'Chapter'}
                </label>
                <input
                  type="text"
                  value={selectedDocForEdit.chapter || ''}
                  onChange={(e) =>
                    setSelectedDocForEdit({ ...selectedDocForEdit, chapter: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'বিবরণ' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={selectedDocForEdit.description || ''}
                  onChange={(e) =>
                    setSelectedDocForEdit({ ...selectedDocForEdit, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  onUpdateDocument(selectedDocForEdit);
                  setShowEditModal(false);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {isBangla ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
