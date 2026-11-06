import React, { useState, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import {
  NCTBBook,
  NCTBBookChapter,
  ClassLevel,
  NCTBMedium,
  BookProcessingStatus,
  UserRole,
} from '../types';
import { NCTB_SUBJECTS } from '../data/curriculumData';
import { MathRenderer } from './MathRenderer';
import {
  BookOpen,
  Upload,
  FolderArchive,
  FileText,
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
  Layers,
  FileUp,
  X,
  ShieldCheck,
  BookMarked,
  Grid,
  List,
  Check,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface NCTBBookLibraryViewProps {
  books: NCTBBook[];
  currentUserRole: UserRole;
  isBangla: boolean;
  onAddBook: (book: NCTBBook) => void;
  onUpdateBook: (book: NCTBBook) => void;
  onDeleteBook: (bookId: string) => void;
  onSelectForGeneration?: (book: NCTBBook, chapter?: NCTBBookChapter) => void;
}

export const NCTBBookLibraryView: React.FC<NCTBBookLibraryViewProps> = ({
  books,
  currentUserRole,
  isBangla,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onSelectForGeneration,
}) => {
  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' || currentUserRole === 'EDITOR';

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedMedium, setSelectedMedium] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals & Drawers
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<'single' | 'multi' | 'zip'>('single');
  const [selectedBookForChapters, setSelectedBookForChapters] = useState<NCTBBook | null>(null);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<NCTBBook | null>(null);
  const [selectedBookForPreview, setSelectedBookForPreview] = useState<NCTBBook | null>(null);
  const [bookToDelete, setBookToDelete] = useState<NCTBBook | null>(null);

  // Single Upload Form
  const [singleClass, setSingleClass] = useState<ClassLevel | 'Class 6' | 'Class 7' | 'Other'>('Class 10');
  const [singleSubject, setSingleSubject] = useState('পদার্থবিজ্ঞান');
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [singleBookName, setSingleBookName] = useState('');
  const [singleMedium, setSingleMedium] = useState<NCTBMedium>('Bangla');
  const [singleEdition, setSingleEdition] = useState('২০২৪ শিক্ষাক্রম (2024 Revised)');
  const [singlePublisher, setSinglePublisher] = useState('জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB)');
  const [singleAcademicYear, setSingleAcademicYear] = useState('2025-2026');
  const [singleNotes, setSingleNotes] = useState('');
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [isProcessingSingle, setIsProcessingSingle] = useState(false);
  const [singleProgress, setSingleProgress] = useState(0);
  const [singleError, setSingleError] = useState<string | null>(null);

  // Confirmation Modal after AI auto-detection
  const [detectedBookProposal, setDetectedBookProposal] = useState<Partial<NCTBBook> | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Multi / ZIP Upload States
  const [batchQueue, setBatchQueue] = useState<{
    id: string;
    file: File;
    name: string;
    size: number;
    status: 'pending' | 'processing' | 'done' | 'failed';
    progress: number;
    error?: string;
  }[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Chapter edit inside chapter drawer
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [tempChapterForm, setTempChapterForm] = useState<Partial<NCTBBookChapter>>({});
  const [showAddChapterForm, setShowAddChapterForm] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState('');

  // Reprocessing state
  const [reprocessingBookId, setReprocessingBookId] = useState<string | null>(null);

  // Hidden file inputs
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);

  // Subjects list per class
  const availableSubjects = useMemo(() => {
    const list = new Set<string>();
    NCTB_SUBJECTS.forEach((s) => {
      list.add(s.nameBn);
      list.add(s.nameEn);
    });
    // Add existing books' subjects
    books.forEach((b) => list.add(b.subject));
    return Array.from(list);
  }, [books]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (selectedClass !== 'ALL' && b.classLevel !== selectedClass) return false;
      if (selectedSubject !== 'ALL' && b.subject !== selectedSubject) return false;
      if (selectedMedium !== 'ALL' && b.medium !== selectedMedium) return false;
      if (selectedStatus !== 'ALL' && b.processingStatus !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = b.bookName.toLowerCase().includes(q) || (b.bookNameEn && b.bookNameEn.toLowerCase().includes(q));
        const matchSubject = b.subject.toLowerCase().includes(q);
        const matchChapter = b.chapters?.some(
          (c) =>
            c.titleBn.toLowerCase().includes(q) ||
            c.titleEn.toLowerCase().includes(q) ||
            c.topics.some((t) => t.toLowerCase().includes(q))
        );
        if (!matchTitle && !matchSubject && !matchChapter) return false;
      }
      return true;
    });
  }, [books, selectedClass, selectedSubject, selectedMedium, selectedStatus, searchQuery]);

  // Stats calculation
  const totalChapters = useMemo(() => books.reduce((sum, b) => sum + (b.chapters?.length || 0), 0), [books]);
  const verifiedBooksCount = useMemo(() => books.filter((b) => b.verificationStatus === 'Verified').length, [books]);

  // AI Analysis of single textbook file
  const handleAnalyzeAndUploadSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFile) {
      setSingleError(isBangla ? 'অনুগ্রহ করে একটি পাঠ্যবই PDF বা ফাইল নির্বাচন করুন।' : 'Please select a textbook PDF file.');
      return;
    }

    setIsProcessingSingle(true);
    setSingleProgress(20);
    setSingleError(null);

    const subjectToUse = customSubjectInput.trim() || singleSubject;

    try {
      // Read initial slice or sample text from file
      let textSample = '';
      try {
        const textBuffer = await singleFile.slice(0, 50000).text();
        textSample = textBuffer.replace(/[\x00-\x08\x0E-\x1F]/g, ' ').slice(0, 8000);
      } catch {
        textSample = `${singleBookName || singleFile.name} textbook contents`;
      }

      setSingleProgress(50);

      // Call AI endpoint to detect TOC and metadata
      const res = await fetch('/api/nctb/analyze-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: singleFile.name,
          fileText: textSample,
          classLevel: singleClass,
          subject: subjectToUse,
          medium: singleMedium,
          curriculumEdition: singleEdition,
          pageCount: 120,
        }),
      });

      const data = await res.json();
      setSingleProgress(85);

      if (!data.success || !data.analysis) {
        throw new Error(data.error || 'AI analysis failed');
      }

      const analysis = data.analysis;

      // Create proposed book object
      const proposedChapters: NCTBBookChapter[] = (analysis.chapters || []).map((ch: any, idx: number) => ({
        id: `chap-${Date.now()}-${idx + 1}`,
        chapterNumber: ch.chapterNumber || `অধ্যায় ${idx + 1}`,
        titleBn: ch.titleBn || `অধ্যায় ${idx + 1}`,
        titleEn: ch.titleEn || `Chapter ${idx + 1}`,
        startPage: ch.startPage || (idx * 15 + 1),
        endPage: ch.endPage || (idx * 15 + 15),
        topics: ch.topics || ['মূল বিষয়বস্তু', 'ধারণা ও সূত্র'],
        subtopics: ch.subtopics || [],
        summary: ch.summary || '',
        isVerified: false,
      }));

      const proposal: Partial<NCTBBook> = {
        id: `book-${Date.now()}`,
        classLevel: (analysis.detectedClass as any) || singleClass,
        subject: analysis.detectedSubject || subjectToUse,
        bookName: singleBookName.trim() || analysis.detectedBookName || singleFile.name.replace(/\.pdf$/i, ''),
        bookNameEn: analysis.detectedBookNameEn || singleBookName,
        medium: (analysis.detectedMedium as any) || singleMedium,
        curriculumEdition: analysis.detectedCurriculum || singleEdition,
        publisher: analysis.publisher || singlePublisher,
        academicYear: analysis.academicYear || singleAcademicYear,
        language: singleMedium === 'English' ? 'English' : 'Bangla',
        notes: singleNotes || analysis.notes || 'Auto-processed via Gemini AI',
        fileName: singleFile.name,
        fileSize: singleFile.size,
        fileType: 'pdf',
        fileUrl: URL.createObjectURL(singleFile),
        pageCount: proposedChapters.length > 0 ? proposedChapters[proposedChapters.length - 1].endPage : 100,
        processingStatus: 'Needs Review',
        verificationStatus: 'Needs Review',
        chapters: proposedChapters,
        extractedTextSample: textSample.slice(0, 1000),
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auditLog: [
          {
            action: 'UPLOAD_AND_AI_ANALYZE',
            timestamp: new Date().toISOString(),
            user: currentUserRole,
            details: `Auto-detected ${proposedChapters.length} chapters from ${singleFile.name}.`,
          },
        ],
      };

      setSingleProgress(100);
      setDetectedBookProposal(proposal);
      setShowConfirmationModal(true);
    } catch (err: any) {
      console.error('Error uploading book:', err);
      setSingleError(err.message || 'Failed to process textbook file.');
    } finally {
      setIsProcessingSingle(false);
    }
  };

  // Confirm proposed book after auto-detection
  const handleConfirmProposedBook = () => {
    if (!detectedBookProposal) return;
    onAddBook(detectedBookProposal as NCTBBook);
    setShowConfirmationModal(false);
    setDetectedBookProposal(null);
    setUploadModalOpen(false);
    setSingleFile(null);
    setSingleBookName('');
    setCustomSubjectInput('');
    setSingleNotes('');
  };

  // Handle Multi-file selection
  const handleSelectMultiFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items = Array.from(files).map((f, i) => ({
      id: `queue-${Date.now()}-${i}`,
      file: f,
      name: f.name,
      size: f.size,
      status: 'pending' as const,
      progress: 0,
    }));
    setBatchQueue(items);
  };

  // Handle ZIP file upload and client-side extraction
  const handleSelectZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingBatch(true);
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);

      const extractedItems: {
        id: string;
        file: File;
        name: string;
        size: number;
        status: 'pending' | 'processing' | 'done' | 'failed';
        progress: number;
      }[] = [];

      let index = 0;
      for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
        if (!zipEntry.dir && (relativePath.endsWith('.pdf') || relativePath.endsWith('.jpg') || relativePath.endsWith('.png'))) {
          const blob = await zipEntry.async('blob');
          const cleanName = relativePath.split('/').pop() || `book-${index + 1}.pdf`;
          const extractedFile = new File([blob], cleanName, { type: blob.type || 'application/pdf' });

          extractedItems.push({
            id: `zip-item-${Date.now()}-${index++}`,
            file: extractedFile,
            name: cleanName,
            size: extractedFile.size,
            status: 'pending',
            progress: 0,
          });
        }
      }

      if (extractedItems.length === 0) {
        alert(isBangla ? 'ZIP ফাইলে কোনো গ্রহণযোগ্য PDF বা বই পাওয়া যায়নি।' : 'No valid PDF files found in the ZIP archive.');
        return;
      }

      setBatchQueue(extractedItems);
    } catch (err: any) {
      alert(isBangla ? `ZIP এক্সট্রাকশনে ত্রুটি: ${err.message}` : `Error reading ZIP file: ${err.message}`);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Process Batch Queue
  const handleProcessBatchQueue = async () => {
    if (batchQueue.length === 0) return;
    setIsProcessingBatch(true);

    for (let i = 0; i < batchQueue.length; i++) {
      const item = batchQueue[i];
      if (item.status === 'done') continue;

      setBatchQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'processing', progress: 30 } : q))
      );

      try {
        // Read text sample
        let textSample = '';
        try {
          const buffer = await item.file.slice(0, 30000).text();
          textSample = buffer.replace(/[\x00-\x08\x0E-\x1F]/g, ' ').slice(0, 5000);
        } catch {
          textSample = item.name;
        }

        setBatchQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: 60 } : q))
        );

        const res = await fetch('/api/nctb/analyze-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: item.name,
            fileText: textSample,
            pageCount: 100,
          }),
        });

        const data = await res.json();
        const analysis = data.analysis || {};

        const chapters: NCTBBookChapter[] = (analysis.chapters || []).map((ch: any, idx: number) => ({
          id: `chap-${Date.now()}-${idx + 1}`,
          chapterNumber: ch.chapterNumber || `অধ্যায় ${idx + 1}`,
          titleBn: ch.titleBn || `অধ্যায় ${idx + 1}`,
          titleEn: ch.titleEn || `Chapter ${idx + 1}`,
          startPage: ch.startPage || (idx * 15 + 1),
          endPage: ch.endPage || (idx * 15 + 15),
          topics: ch.topics || ['মূল পাঠ', 'অনুশীলনী'],
          subtopics: ch.subtopics || [],
          summary: ch.summary || '',
          isVerified: false,
        }));

        const newBook: NCTBBook = {
          id: `book-batch-${Date.now()}-${i}`,
          classLevel: (analysis.detectedClass as any) || 'Class 9',
          subject: analysis.detectedSubject || 'সাধারণ বিষয়',
          bookName: analysis.detectedBookName || item.name.replace(/\.[^/.]+$/, ''),
          bookNameEn: analysis.detectedBookNameEn || item.name,
          medium: (analysis.detectedMedium as any) || 'Bangla',
          curriculumEdition: analysis.detectedCurriculum || '২০২৪ শিক্ষাক্রম',
          publisher: 'জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB)',
          academicYear: '2025-2026',
          language: analysis.detectedMedium === 'English' ? 'English' : 'Bangla',
          fileName: item.name,
          fileSize: item.size,
          fileType: 'pdf',
          fileUrl: URL.createObjectURL(item.file),
          pageCount: chapters.length > 0 ? chapters[chapters.length - 1].endPage : 90,
          processingStatus: 'Processed',
          verificationStatus: 'Needs Review',
          chapters: chapters.length > 0 ? chapters : [
            {
              id: `chap-fallback-${Date.now()}`,
              chapterNumber: '১ম অধ্যায়',
              titleBn: 'মূল বিষয়বস্তু',
              titleEn: 'Core Syllabus Content',
              startPage: 1,
              endPage: 25,
              topics: ['অধ্যায়ের সারাংশ', 'জ্ঞান ও অনুধাবন'],
              isVerified: false,
            },
          ],
          uploadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          auditLog: [
            {
              action: 'BULK_UPLOAD_ANALYZED',
              timestamp: new Date().toISOString(),
              user: currentUserRole,
              details: `Uploaded via bulk batch: ${item.name}`,
            },
          ],
        };

        onAddBook(newBook);

        setBatchQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'done', progress: 100 } : q))
        );
      } catch (err: any) {
        setBatchQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'failed', error: err.message || 'Analysis failed' } : q
          )
        );
      }
    }

    setIsProcessingBatch(false);
  };

  // Reprocess existing book with Gemini AI
  const handleReprocessBook = async (book: NCTBBook) => {
    if (!canManage) return;
    setReprocessingBookId(book.id);

    try {
      const res = await fetch('/api/nctb/analyze-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: book.fileName,
          fileText: book.extractedTextSample || book.bookName,
          classLevel: book.classLevel,
          subject: book.subject,
          medium: book.medium,
          curriculumEdition: book.curriculumEdition,
          pageCount: book.pageCount || 100,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.analysis) {
        throw new Error(data.error || 'Failed to reprocess textbook');
      }

      const analysis = data.analysis;
      const updatedChapters: NCTBBookChapter[] = (analysis.chapters || []).map((ch: any, idx: number) => ({
        id: `chap-re-${Date.now()}-${idx + 1}`,
        chapterNumber: ch.chapterNumber || `অধ্যায় ${idx + 1}`,
        titleBn: ch.titleBn || `অধ্যায় ${idx + 1}`,
        titleEn: ch.titleEn || `Chapter ${idx + 1}`,
        startPage: ch.startPage || idx * 15 + 1,
        endPage: ch.endPage || idx * 15 + 15,
        topics: ch.topics || ['মূল বিষয়'],
        subtopics: ch.subtopics || [],
        summary: ch.summary || '',
        isVerified: false,
      }));

      const updatedBook: NCTBBook = {
        ...book,
        bookName: analysis.detectedBookName || book.bookName,
        bookNameEn: analysis.detectedBookNameEn || book.bookNameEn,
        chapters: updatedChapters.length > 0 ? updatedChapters : book.chapters,
        processingStatus: 'Processed',
        verificationStatus: 'Needs Review',
        updatedAt: new Date().toISOString(),
        auditLog: [
          ...(book.auditLog || []),
          {
            action: 'REPROCESSED_AI',
            timestamp: new Date().toISOString(),
            user: currentUserRole,
            details: `Reprocessed with Gemini AI. Found ${updatedChapters.length} chapters.`,
          },
        ],
      };

      onUpdateBook(updatedBook);
      if (selectedBookForChapters?.id === book.id) {
        setSelectedBookForChapters(updatedBook);
      }
      alert(isBangla ? 'বইটির এআই পুনর্মূল্যায়ন সফলভাবে সম্পন্ন হয়েছে!' : 'Textbook AI re-analysis completed!');
    } catch (err: any) {
      alert(isBangla ? `পুনর্মূল্যায়নে ব্যর্থ: ${err.message}` : `Reprocess failed: ${err.message}`);
    } finally {
      setReprocessingBookId(null);
    }
  };

  // Chapter inline actions
  const handleSaveInlineChapter = (book: NCTBBook) => {
    if (!tempChapterForm.titleBn?.trim()) return;

    let updatedChapters = [...book.chapters];
    if (editingChapterId) {
      updatedChapters = updatedChapters.map((c) =>
        c.id === editingChapterId
          ? ({
              ...c,
              ...tempChapterForm,
            } as NCTBBookChapter)
          : c
      );
    }

    const updatedBook: NCTBBook = {
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
      auditLog: [
        ...(book.auditLog || []),
        {
          action: 'EDIT_CHAPTER',
          timestamp: new Date().toISOString(),
          user: currentUserRole,
          details: `Edited chapter: ${tempChapterForm.titleBn}`,
        },
      ],
    };

    onUpdateBook(updatedBook);
    setSelectedBookForChapters(updatedBook);
    setEditingChapterId(null);
    setTempChapterForm({});
  };

  // Add new chapter manually
  const handleAddNewChapter = (book: NCTBBook) => {
    if (!tempChapterForm.titleBn?.trim()) return;

    const newChap: NCTBBookChapter = {
      id: `chap-${Date.now()}`,
      chapterNumber: tempChapterForm.chapterNumber || `অধ্যায় ${book.chapters.length + 1}`,
      titleBn: tempChapterForm.titleBn,
      titleEn: tempChapterForm.titleEn || tempChapterForm.titleBn,
      startPage: Number(tempChapterForm.startPage) || 1,
      endPage: Number(tempChapterForm.endPage) || 20,
      topics: tempChapterForm.topics && tempChapterForm.topics.length > 0 ? tempChapterForm.topics : ['সাধারণ বিষয়বস্তু'],
      subtopics: [],
      summary: tempChapterForm.summary || '',
      isVerified: true,
      verifiedBy: currentUserRole,
      verifiedAt: new Date().toISOString(),
    };

    const updatedBook: NCTBBook = {
      ...book,
      chapters: [...book.chapters, newChap],
      updatedAt: new Date().toISOString(),
      auditLog: [
        ...(book.auditLog || []),
        {
          action: 'ADD_CHAPTER',
          timestamp: new Date().toISOString(),
          user: currentUserRole,
          details: `Manually added chapter: ${newChap.titleBn}`,
        },
      ],
    };

    onUpdateBook(updatedBook);
    setSelectedBookForChapters(updatedBook);
    setShowAddChapterForm(false);
    setTempChapterForm({});
  };

  // Toggle chapter verification status
  const handleToggleChapterVerification = (book: NCTBBook, chapterId: string) => {
    if (!canManage) return;

    const updatedChapters = book.chapters.map((c) => {
      if (c.id === chapterId) {
        const nextState = !c.isVerified;
        return {
          ...c,
          isVerified: nextState,
          verifiedBy: nextState ? currentUserRole : undefined,
          verifiedAt: nextState ? new Date().toISOString() : undefined,
        };
      }
      return c;
    });

    const allVerified = updatedChapters.length > 0 && updatedChapters.every((c) => c.isVerified);

    const updatedBook: NCTBBook = {
      ...book,
      chapters: updatedChapters,
      verificationStatus: allVerified ? 'Verified' : 'Needs Review',
      processingStatus: allVerified ? 'Verified' : book.processingStatus,
      updatedAt: new Date().toISOString(),
    };

    onUpdateBook(updatedBook);
    setSelectedBookForChapters(updatedBook);
  };

  // Delete chapter
  const handleDeleteChapter = (book: NCTBBook, chapterId: string) => {
    if (!canManage) return;
    if (!confirm(isBangla ? 'আপনি কি নিশ্চিতভাবে এই অধ্যায়টি মুছে ফেলতে চান?' : 'Are you sure you want to delete this chapter?')) return;

    const updatedChapters = book.chapters.filter((c) => c.id !== chapterId);
    const updatedBook: NCTBBook = {
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
      auditLog: [
        ...(book.auditLog || []),
        {
          action: 'DELETE_CHAPTER',
          timestamp: new Date().toISOString(),
          user: currentUserRole,
          details: `Deleted chapter ID: ${chapterId}`,
        },
      ],
    };

    onUpdateBook(updatedBook);
    setSelectedBookForChapters(updatedBook);
  };

  // Delete book with confirmation and impact warning
  const handleConfirmDeleteBook = () => {
    if (!bookToDelete || !canManage) return;
    onDeleteBook(bookToDelete.id);
    setBookToDelete(null);
    if (selectedBookForChapters?.id === bookToDelete.id) {
      setSelectedBookForChapters(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-950/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-300/30 text-teal-200 text-xs font-bold tracking-wide">
              <BookOpen className="w-3.5 h-3.5 text-teal-300" />
              <span>{isBangla ? 'জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড' : 'NCTB Curriculum Repository'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{isBangla ? 'এনসিটিবি বইয়ের লাইব্রেরি' : 'NCTB Book Library'}</span>
            </h1>
            <p className="text-teal-100 text-sm leading-relaxed">
              {isBangla
                ? 'এসএসসি স্তর (৯ম ও ১০ম শ্রেণি) সকল এনসিটিবি মূল পাঠ্যবই সংরক্ষণ, বাল্ক আপলোড, অধ্যায়-ভিত্তিক সুনির্দিষ্ট পৃষ্ঠা রেফারেন্স এবং এআই প্রশ্ন জেনারেটর সংযোগ।'
                : 'Central repository for Bangladesh NCTB SSC (Classes 9-10) textbooks. Upload single books, multi-PDFs, or bulk ZIP files with automatic TOC extraction and page citation tracking.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-teal-200">
              <span className="flex items-center gap-1.5 font-bold">
                <BookMarked className="w-4 h-4 text-cyan-300" />
                {books.length} {isBangla ? 'টি সংরক্ষিত বই' : 'Textbooks'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-bold">
                <Layers className="w-4 h-4 text-emerald-300" />
                {totalChapters} {isBangla ? 'টি নিষ্কাশিত অধ্যায়' : 'Extracted Chapters'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-green-300" />
                {verifiedBooksCount} {isBangla ? 'টি সম্পূর্ণ যাচাইকৃত' : 'Fully Verified'}
              </span>
            </div>
          </div>

          {canManage && (
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => {
                  setUploadTab('single');
                  setUploadModalOpen(true);
                }}
                className="px-5 py-3 rounded-2xl bg-white text-teal-900 font-bold text-xs sm:text-sm hover:bg-teal-50 shadow-lg shadow-black/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Upload className="w-4 h-4 text-teal-700" />
                <span>{isBangla ? 'নতুন বই আপলোড করুন' : 'Upload Textbook'}</span>
              </button>
              <button
                onClick={() => {
                  setUploadTab('zip');
                  setUploadModalOpen(true);
                }}
                className="px-4 py-3 rounded-2xl bg-teal-700/60 hover:bg-teal-700 border border-teal-400/40 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
              >
                <FolderArchive className="w-4 h-4 text-cyan-300" />
                <span>{isBangla ? 'বাল্ক ZIP আপলোড' : 'Bulk ZIP Upload'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBangla ? 'বইয়ের নাম, অধ্যায়, বিষয় বা টপিক দিয়ে খুঁজুন...' : 'Search by book name, chapter, subject, or topic...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">{isBangla ? 'সকল এসএসসি পাঠ্যবই (All SSC)' : 'All SSC Textbooks'}</option>
              <option value="SSC">{isBangla ? 'এসএসসি পূর্ণাঙ্গ (SSC Complete)' : 'SSC Complete'}</option>
              <option value="Class 10">{isBangla ? '১০ম শ্রেণি (SSC Class 10)' : 'Class 10'}</option>
              <option value="Class 9">{isBangla ? '৯ম শ্রেণি (SSC Class 9)' : 'Class 9'}</option>
            </select>

            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[140px] truncate"
            >
              <option value="ALL">{isBangla ? 'সকল বিষয়' : 'All Subjects'}</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Medium Filter */}
            <select
              value={selectedMedium}
              onChange={(e) => setSelectedMedium(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">{isBangla ? 'সকল মাধ্যম' : 'All Mediums'}</option>
              <option value="Bangla">বাংলা ভার্সন</option>
              <option value="English">English Version</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">{isBangla ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
              <option value="Verified">{isBangla ? 'যাচাইকৃত (Verified)' : 'Verified'}</option>
              <option value="Needs Review">{isBangla ? 'পর্যালোচনা প্রয়োজন' : 'Needs Review'}</option>
              <option value="Processed">{isBangla ? 'প্রক্রিয়াজাত (Processed)' : 'Processed'}</option>
            </select>

            {/* Grid / Table Toggle */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="List/Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Books Display */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl mx-auto flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {isBangla ? 'কোনো পাঠ্যবই পাওয়া যায়নি' : 'No Textbooks Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isBangla
                ? 'আপনার দেওয়া ফিল্টারের সাথে মিল রেখে কোনো বই পাওয়া যায়নি। ফিল্টার রিসেট করুন অথবা নতুন বই আপলোড করুন।'
                : 'No textbooks match your search or filter criteria. Try resetting filters or upload a textbook.'}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => {
                setUploadTab('single');
                setUploadModalOpen(true);
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {isBangla ? 'বই আপলোড করুন' : 'Upload Textbook'}
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBooks.map((book) => {
            const isVerified = book.verificationStatus === 'Verified';
            const isReprocessing = reprocessingBookId === book.id;

            return (
              <div
                key={book.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-teal-300 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                {/* Card Top: Banner & Status */}
                <div>
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-teal-50/40 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 rounded-xl bg-gradient-to-tr from-teal-700 to-cyan-600 text-white flex flex-col items-center justify-center shadow-xs shrink-0">
                        <BookOpen className="w-6 h-6 text-teal-100" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-teal-200 mt-0.5">NCTB</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                            {book.classLevel}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                            {book.medium === 'English' ? 'English Ver.' : 'বাংলা মাধ্যম'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1 leading-tight group-hover:text-teal-700 transition-colors">
                          {book.bookName}
                        </h3>
                        {book.bookNameEn && book.bookNameEn !== book.bookName && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            {book.bookNameEn}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Verification Status Badge */}
                    <div className="shrink-0">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          {isBangla ? 'যাচাইকৃত' : 'Verified'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {isBangla ? 'পর্যালোচনা' : 'Review'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Details & Metadata */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{isBangla ? 'বিষয়:' : 'Subject:'}</span>
                        <span className="font-bold text-slate-800">{book.subject}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{isBangla ? 'অধ্যায় সংখ্যা:' : 'Chapters:'}</span>
                        <span className="font-bold text-teal-700">{book.chapters?.length || 0} টি অধ্যায়</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{isBangla ? 'শিক্ষাক্রম সংস্করণ:' : 'Edition:'}</span>
                        <span className="font-medium text-slate-700 truncate block">{book.curriculumEdition}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{isBangla ? 'মূল ফাইলের আকার:' : 'File Size:'}</span>
                        <span className="font-medium text-slate-700">
                          {book.fileSize ? `${(book.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'PDF'}
                        </span>
                      </div>
                    </div>

                    {/* Sample chapter previews */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {isBangla ? 'প্রধান অধ্যায়সমূহ (পৃষ্ঠা সূচি সহ):' : 'Key Chapters with Page Numbers:'}
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {book.chapters.slice(0, 3).map((ch) => (
                          <div
                            key={ch.id}
                            className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-slate-50 hover:bg-teal-50/50 text-slate-700"
                          >
                            <span className="truncate font-medium flex-1">
                              {ch.chapterNumber}: {ch.titleBn}
                            </span>
                            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/50 shrink-0 ml-1">
                              পৃষ্ঠা {ch.startPage}-{ch.endPage}
                            </span>
                          </div>
                        ))}
                        {book.chapters.length > 3 && (
                          <div className="text-[10px] text-teal-600 font-bold text-right pt-0.5">
                            +{book.chapters.length - 3} {isBangla ? 'টি অতিরিক্ত অধ্যায়' : 'more chapters'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedBookForChapters(book)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-teal-400 text-teal-800 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                      title="Manage Chapters and Topics"
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      <span>{isBangla ? 'অধ্যায় সূচি' : 'Chapters'}</span>
                    </button>

                    <button
                      onClick={() => setSelectedBookForPreview(book)}
                      className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-white rounded-lg transition-colors"
                      title={isBangla ? 'বই প্রিভিউ' : 'Preview Book'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {canManage && (
                      <button
                        onClick={() => handleReprocessBook(book)}
                        disabled={isReprocessing}
                        className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                        title={isBangla ? 'এআই দিয়ে পুনরায় বিশ্লেষণ করুন' : 'Reprocess with AI'}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin text-cyan-600' : ''}`} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {onSelectForGeneration && (
                      <button
                        onClick={() => onSelectForGeneration(book)}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                        title="Generate questions from this book"
                      >
                        <Sparkles className="w-3 h-3 text-cyan-200" />
                        <span>{isBangla ? 'প্রশ্ন তৈরি' : 'Generate'}</span>
                      </button>
                    )}

                    {canManage && (
                      <button
                        onClick={() => setBookToDelete(book)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title={isBangla ? 'বই মুছুন' : 'Delete Book'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="px-4 py-3">{isBangla ? 'বইয়ের নাম' : 'Book Name'}</th>
                  <th className="px-3 py-3">{isBangla ? 'শ্রেণি ও বিষয়' : 'Class & Subject'}</th>
                  <th className="px-3 py-3">{isBangla ? 'মাধ্যম' : 'Medium'}</th>
                  <th className="px-3 py-3">{isBangla ? 'অধ্যায়' : 'Chapters'}</th>
                  <th className="px-3 py-3">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="px-4 py-3 text-right">{isBangla ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-black shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div>{book.bookName}</div>
                          {book.bookNameEn && (
                            <div className="text-[10px] text-slate-400 font-normal">{book.bookNameEn}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-semibold text-slate-800">{book.subject}</span>
                      <span className="text-[10px] block text-slate-500 font-bold">{book.classLevel}</span>
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {book.medium === 'English' ? 'English Ver.' : 'বাংলা'}
                    </td>
                    <td className="px-3 py-3 font-bold text-teal-700">
                      {book.chapters?.length || 0} টি
                    </td>
                    <td className="px-3 py-3">
                      {book.verificationStatus === 'Verified' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-bold text-[10px]">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {isBangla ? 'যাচাইকৃত' : 'Verified'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                          <Clock className="w-2.5 h-2.5" />
                          {isBangla ? 'পর্যালোচনা' : 'Review'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => setSelectedBookForChapters(book)}
                        className="px-2 py-1 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-bold text-[11px]"
                      >
                        {isBangla ? 'অধ্যায় সূচি' : 'Chapters'}
                      </button>
                      {onSelectForGeneration && (
                        <button
                          onClick={() => onSelectForGeneration(book)}
                          className="px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold text-[11px]"
                        >
                          {isBangla ? 'প্রশ্ন জেনারেট' : 'Generate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Upload Modal (Single, Multi, ZIP) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {isBangla ? 'এনসিটিবি পাঠ্যবই আপলোড ও এআই প্রসেসিং' : 'Upload NCTB Textbook & AI Extraction'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isBangla ? 'পিডিএফ ফাইল, স্ক্যান কপি বা বাল্ক জিপ আপলোড করুন' : 'PDF, scanned copies, or bulk ZIP archive'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Upload Option Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setUploadTab('single')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  uploadTab === 'single' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isBangla ? 'একক বই আপলোড' : 'Single Book'}</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadTab('multi')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  uploadTab === 'multi' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>{isBangla ? 'বহু বই আপলোড' : 'Multiple Books'}</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadTab('zip')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  uploadTab === 'zip' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>{isBangla ? 'বাল্ক ZIP আপলোড' : 'Bulk ZIP Upload'}</span>
              </button>
            </div>

            {/* TAB CONTENT: Single Book Upload */}
            {uploadTab === 'single' && (
              <form onSubmit={handleAnalyzeAndUploadSingle} className="space-y-4">
                {singleError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{singleError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBangla ? 'শ্রেণি নির্বাচন করুন *' : 'Class Level *'}
                    </label>
                    <select
                      value={singleClass}
                      onChange={(e) => setSingleClass(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Class 10">১০ম শ্রেণি (SSC Class 10)</option>
                      <option value="Class 9">৯ম শ্রেণি (SSC Class 9)</option>
                      <option value="SSC">এসএসসি পূর্ণাঙ্গ (SSC Complete)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBangla ? 'বিষয় (Subject) *' : 'Subject *'}
                    </label>
                    <select
                      value={singleSubject}
                      onChange={(e) => setSingleSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {availableSubjects.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Subject Addition if needed */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {isBangla ? 'অথবা নতুন বিষয় লিখুন (ঐচ্ছিক):' : 'Or enter custom subject:'}
                  </label>
                  <input
                    type="text"
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    placeholder={isBangla ? 'যেমন: তথ্য ও যোগাযোগ প্রযুক্তি, জীববিজ্ঞান' : 'e.g. Higher Mathematics, Agriculture'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBangla ? 'বইয়ের নাম (ঐচ্ছিক - স্বয়ংক্রিয় ডিটেক্ট হবে):' : 'Book Name (Optional - AI detects):'}
                    </label>
                    <input
                      type="text"
                      value={singleBookName}
                      onChange={(e) => setSingleBookName(e.target.value)}
                      placeholder={isBangla ? 'যেমন: মাধ্যমিক পদার্থবিজ্ঞান' : 'e.g. Secondary Physics'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBangla ? 'মাধ্যম (Medium) *' : 'Medium *'}
                    </label>
                    <select
                      value={singleMedium}
                      onChange={(e) => setSingleMedium(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Bangla">বাংলা ভার্সন (Bangla Medium)</option>
                      <option value="English">ইংরেজি ভার্সন (English Version)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBangla ? 'শিক্ষাক্রম সংস্করণ (Edition):' : 'Curriculum Edition:'}
                    </label>
                    <input
                      type="text"
                      value={singleEdition}
                      onChange={(e) => setSingleEdition(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isBangla ? 'প্রকাশক (Publisher):' : 'Publisher:'}
                    </label>
                    <input
                      type="text"
                      value={singlePublisher}
                      onChange={(e) => setSinglePublisher(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* PDF File Drop Zone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBangla ? 'পাঠ্যবই PDF বা স্ক্যান কপি নির্বাচন করুন *' : 'Select Textbook PDF or Scanned File *'}
                  </label>
                  <input
                    type="file"
                    ref={singleFileInputRef}
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setSingleFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div
                    onClick={() => singleFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                      singleFile
                        ? 'border-teal-400 bg-teal-50/50'
                        : 'border-slate-300 hover:border-teal-400 bg-slate-50'
                    }`}
                  >
                    <FileText className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                    {singleFile ? (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-teal-900">{singleFile.name}</div>
                        <div className="text-[11px] text-teal-700">
                          {(singleFile.size / (1024 * 1024)).toFixed(2)} MB • {isBangla ? 'পরিবর্তন করতে ক্লিক করুন' : 'Click to replace'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-700">
                          {isBangla ? 'PDF ফাইল ড্রপ করুন অথবা নির্বাচন করতে ক্লিক করুন' : 'Drop textbook PDF or click to browse'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {isBangla ? 'PDF, Scanned PDF, JPG/PNG সমর্থিত' : 'Supports PDF, Scanned PDFs, Images'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isProcessingSingle && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-teal-50 border border-teal-200">
                    <div className="flex justify-between text-xs font-bold text-teal-900">
                      <span>{isBangla ? 'এআই পাঠ্যসূচি বিশ্লেষণ ও চ্যাপ্টার ডিটেকশন চলছে...' : 'AI Analyzing TOC & Chapters...'}</span>
                      <span>{singleProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-teal-200 overflow-hidden">
                      <div
                        className="h-full bg-teal-600 transition-all duration-300 rounded-full"
                        style={{ width: `${singleProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingSingle || !singleFile}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                    <span>{isBangla ? 'বিশ্লেষণ ও আপলোড' : 'Analyze & Upload'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB CONTENT: Multiple Books Upload */}
            {uploadTab === 'multi' && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={multiFileInputRef}
                  multiple
                  accept=".pdf"
                  onChange={(e) => handleSelectMultiFiles(e.target.files)}
                  className="hidden"
                />

                <div
                  onClick={() => multiFileInputRef.current?.click()}
                  className="border-2 border-dashed border-teal-400 bg-teal-50/30 rounded-2xl p-8 text-center cursor-pointer hover:bg-teal-50/60 transition-colors"
                >
                  <FileUp className="w-10 h-10 text-teal-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-800">
                    {isBangla ? 'একসাথে একাধিক PDF বই নির্বাচন করুন' : 'Select multiple textbook PDFs together'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isBangla ? '৮ম, ৯ম ও ১০ম শ্রেণির একাধিক বিষয়ের বই এক ক্লিকে কিউতে আনুন' : 'Select multiple files from your computer to batch process'}
                  </div>
                </div>

                {batchQueue.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    <div className="text-xs font-bold text-slate-700 flex justify-between">
                      <span>{isBangla ? 'আপলোড কিউ:' : 'Upload Queue:'}</span>
                      <span>{batchQueue.length} {isBangla ? 'টি ফাইল' : 'files'}</span>
                    </div>
                    {batchQueue.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-[280px]">
                          <div className="font-bold text-slate-800 truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {(item.size / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        </div>

                        <div>
                          {item.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                              {isBangla ? 'অপেক্ষমাণ' : 'Pending'}
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              {item.progress}%
                            </span>
                          )}
                          {item.status === 'done' && (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              {isBangla ? 'সম্পন্ন' : 'Done'}
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              {isBangla ? 'ব্যর্থ' : 'Failed'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchQueue([]);
                      setUploadModalOpen(false);
                    }}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {isBangla ? 'বন্ধ করুন' : 'Close'}
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessBatchQueue}
                    disabled={isProcessingBatch || batchQueue.length === 0}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                    <span>{isBangla ? 'সবগুলো প্রসেস করুন' : 'Process All Books'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Bulk ZIP Upload */}
            {uploadTab === 'zip' && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={zipFileInputRef}
                  accept=".zip"
                  onChange={handleSelectZipFile}
                  className="hidden"
                />

                <div
                  onClick={() => zipFileInputRef.current?.click()}
                  className="border-2 border-dashed border-teal-500 bg-teal-50/40 rounded-2xl p-8 text-center cursor-pointer hover:bg-teal-50 transition-colors"
                >
                  <FolderArchive className="w-12 h-12 text-teal-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-800">
                    {isBangla ? 'একটি পাঠ্যবই জিপ (.ZIP) আর্কাইভ আপলোড করুন' : 'Upload a Textbook ZIP Archive'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    {isBangla
                      ? 'জিপ ফাইলটি ব্রাউজারেই স্বয়ংক্রিয়ভাবে এক্সট্রাক্ট করে প্রতিটি পিডিএফকে পৃথক বই ও অধ্যায় হিসেবে প্রক্রিয়া করা হবে।'
                      : 'The ZIP file is extracted directly in your browser and each PDF is processed into verified chapters and topic indices.'}
                  </div>
                </div>

                {batchQueue.length > 0 && (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    <div className="text-xs font-bold text-slate-700 flex justify-between">
                      <span>{isBangla ? 'জিপ থেকে আনপ্যাককৃত বইসমূহ:' : 'Extracted from ZIP:'}</span>
                      <span>{batchQueue.length} {isBangla ? 'টি বই' : 'books'}</span>
                    </div>
                    {batchQueue.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-[280px]">
                          <div className="font-bold text-slate-800 truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {(item.size / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        </div>

                        <div>
                          {item.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                              {isBangla ? 'অপেক্ষমাণ' : 'Pending'}
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              {item.progress}%
                            </span>
                          )}
                          {item.status === 'done' && (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">
                              ✓ {isBangla ? 'সম্পন্ন' : 'Extracted'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchQueue([]);
                      setUploadModalOpen(false);
                    }}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessBatchQueue}
                    disabled={isProcessingBatch || batchQueue.length === 0}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                    <span>{isBangla ? 'জিপের সব বই বিশ্লেষণ করুন' : 'Process Extracted Books'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: User Confirmation Modal after AI Detection */}
      {showConfirmationModal && detectedBookProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {isBangla ? 'এআই চিহ্নিত বইয়ের তথ্য নিশ্চিত করুন' : 'Confirm AI-Detected Textbook Info'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isBangla ? 'সংরক্ষণের আগে প্রয়োজনে তথ্য পরিবর্তন করুন' : 'Review and verify details before saving to library'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {isBangla ? 'বইয়ের নাম (বাংলা):' : 'Book Name (Bangla):'}
                </label>
                <input
                  type="text"
                  value={detectedBookProposal.bookName || ''}
                  onChange={(e) =>
                    setDetectedBookProposal({ ...detectedBookProposal, bookName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {isBangla ? 'শ্রেণি (Class):' : 'Class:'}
                  </label>
                  <select
                    value={detectedBookProposal.classLevel || 'Class 10'}
                    onChange={(e) =>
                      setDetectedBookProposal({ ...detectedBookProposal, classLevel: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {isBangla ? 'বিষয় (Subject):' : 'Subject:'}
                  </label>
                  <input
                    type="text"
                    value={detectedBookProposal.subject || ''}
                    onChange={(e) =>
                      setDetectedBookProposal({ ...detectedBookProposal, subject: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50/70 border border-teal-200/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between font-bold text-teal-900">
                  <span>{isBangla ? 'নিষ্কাশিত অধ্যায়সমূহ:' : 'Extracted Chapters:'}</span>
                  <span className="bg-teal-200/60 text-teal-900 px-2 py-0.5 rounded text-[10px]">
                    {detectedBookProposal.chapters?.length || 0} টি
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {detectedBookProposal.chapters?.map((ch, idx) => (
                    <div
                      key={ch.id || idx}
                      className="p-1.5 rounded-lg bg-white border border-teal-100 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-semibold text-slate-800 truncate">
                        {ch.chapterNumber}: {ch.titleBn}
                      </span>
                      <span className="text-[10px] text-teal-700 font-bold shrink-0 ml-2">
                        পৃষ্ঠা {ch.startPage}-{ch.endPage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmationModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {isBangla ? 'পুনরায় এডিট' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmProposedBook}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isBangla ? 'তথ্য নিশ্চিত ও সংরক্ষণ করুন' : 'Confirm & Save to Library'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL 3: Chapter & Topic Management */}
      {selectedBookForChapters && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    {selectedBookForChapters.bookName}
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-teal-800">{selectedBookForChapters.classLevel}</span>
                    <span>•</span>
                    <span>{selectedBookForChapters.subject}</span>
                    <span>•</span>
                    <span className="font-bold text-teal-700">{selectedBookForChapters.chapters?.length || 0} টি অধ্যায়</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedBookForChapters(null);
                  setEditingChapterId(null);
                  setShowAddChapterForm(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-bar with Add Chapter button */}
            <div className="flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-600">
                {isBangla ? 'অধ্যায়সমূহ, পৃষ্ঠা পরিসীমা ও টপিক তালিকা:' : 'Chapters, Page Ranges & Topics:'}
              </span>
              {canManage && (
                <button
                  onClick={() => {
                    setTempChapterForm({
                      chapterNumber: `অধ্যায় ${(selectedBookForChapters.chapters?.length || 0) + 1}`,
                      titleBn: '',
                      titleEn: '',
                      startPage: (selectedBookForChapters.chapters?.length || 0) * 15 + 1,
                      endPage: (selectedBookForChapters.chapters?.length || 0) * 15 + 15,
                      topics: ['মূল বিষয়বস্তু'],
                    });
                    setShowAddChapterForm(true);
                  }}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold flex items-center gap-1 border border-teal-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBangla ? 'নতুন অধ্যায় যোগ করুন' : 'Add Missing Chapter'}</span>
                </button>
              )}
            </div>

            {/* Form to Add New Chapter */}
            {showAddChapterForm && (
              <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-2xl space-y-3 shrink-0 text-xs">
                <div className="font-bold text-teal-900">
                  {isBangla ? 'অনুপস্থিত নতুন অধ্যায় যুক্ত করুন:' : 'Add New Missing Chapter:'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={tempChapterForm.chapterNumber || ''}
                    onChange={(e) => setTempChapterForm({ ...tempChapterForm, chapterNumber: e.target.value })}
                    placeholder={isBangla ? 'অধ্যায় নম্বর (যেমন: ১ম অধ্যায়)' : 'Chapter #'}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    value={tempChapterForm.titleBn || ''}
                    onChange={(e) => setTempChapterForm({ ...tempChapterForm, titleBn: e.target.value })}
                    placeholder={isBangla ? 'অধ্যায়ের নাম (বাংলা) *' : 'Chapter Title (Bangla) *'}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white col-span-2"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">শুরুর পৃষ্ঠা (Start):</label>
                    <input
                      type="number"
                      value={tempChapterForm.startPage || 1}
                      onChange={(e) => setTempChapterForm({ ...tempChapterForm, startPage: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">শেষ পৃষ্ঠা (End):</label>
                    <input
                      type="number"
                      value={tempChapterForm.endPage || 20}
                      onChange={(e) => setTempChapterForm({ ...tempChapterForm, endPage: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">টপিক (কমা দিয়ে আলাদা করুন):</label>
                    <input
                      type="text"
                      placeholder="টপিক ১, টপিক ২, সূত্র ও সমীকরণ"
                      onChange={(e) =>
                        setTempChapterForm({
                          ...tempChapterForm,
                          topics: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddChapterForm(false)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 bg-white"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddNewChapter(selectedBookForChapters)}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                  >
                    {isBangla ? 'সংরক্ষণ' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {selectedBookForChapters.chapters?.map((chapter) => {
                const isEditing = editingChapterId === chapter.id;

                return (
                  <div
                    key={chapter.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-300 transition-all space-y-2"
                  >
                    {isEditing ? (
                      /* Inline Chapter Edit Form */
                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={tempChapterForm.chapterNumber || ''}
                            onChange={(e) =>
                              setTempChapterForm({ ...tempChapterForm, chapterNumber: e.target.value })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                          />
                          <input
                            type="text"
                            value={tempChapterForm.titleBn || ''}
                            onChange={(e) =>
                              setTempChapterForm({ ...tempChapterForm, titleBn: e.target.value })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold col-span-2"
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold">শুরুর পৃষ্ঠা:</span>
                            <input
                              type="number"
                              value={tempChapterForm.startPage || 1}
                              onChange={(e) =>
                                setTempChapterForm({ ...tempChapterForm, startPage: Number(e.target.value) })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold">শেষ পৃষ্ঠা:</span>
                            <input
                              type="number"
                              value={tempChapterForm.endPage || 1}
                              onChange={(e) =>
                                setTempChapterForm({ ...tempChapterForm, endPage: Number(e.target.value) })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                          <div className="col-span-2 flex items-end gap-2">
                            <button
                              onClick={() => handleSaveInlineChapter(selectedBookForChapters)}
                              className="px-4 py-1.5 bg-teal-600 text-white rounded-lg font-bold"
                            >
                              {isBangla ? 'সম্পন্ন' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingChapterId(null)}
                              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg bg-white"
                            >
                              {isBangla ? 'বাতিল' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Chapter Normal View */
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-black text-teal-900 bg-teal-100 px-2 py-0.5 rounded-md">
                              {chapter.chapterNumber}
                            </span>
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                              {chapter.titleBn}
                            </h4>
                            {chapter.titleEn && chapter.titleEn !== chapter.titleBn && (
                              <span className="text-slate-400 text-xs">({chapter.titleEn})</span>
                            )}
                            <span className="text-[10px] font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                              পৃষ্ঠা {chapter.startPage}-{chapter.endPage}
                            </span>
                          </div>

                          {/* Topics Chips */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {chapter.topics?.map((topic, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Chapter Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Toggle Verification */}
                          <button
                            onClick={() => handleToggleChapterVerification(selectedBookForChapters, chapter.id)}
                            className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${
                              chapter.isVerified
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-green-700'
                            }`}
                            title={chapter.isVerified ? 'Mark as Unverified' : 'Mark as Verified'}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${chapter.isVerified ? 'text-green-600' : 'text-slate-400'}`} />
                            <span className="hidden sm:inline">
                              {chapter.isVerified ? (isBangla ? 'যাচাইকৃত' : 'Verified') : (isBangla ? 'যাচাই করুন' : 'Verify')}
                            </span>
                          </button>

                          {canManage && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingChapterId(chapter.id);
                                  setTempChapterForm({
                                    chapterNumber: chapter.chapterNumber,
                                    titleBn: chapter.titleBn,
                                    titleEn: chapter.titleEn,
                                    startPage: chapter.startPage,
                                    endPage: chapter.endPage,
                                    topics: chapter.topics,
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-white rounded-lg transition-colors"
                                title="Edit Chapter"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteChapter(selectedBookForChapters, chapter.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Chapter"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Audit History Log Footer */}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {isBangla ? 'সর্বশেষ আপডেট:' : 'Last Updated:'}{' '}
                {new Date(selectedBookForChapters.updatedAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => setSelectedBookForChapters(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                {isBangla ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PDF Preview */}
      {selectedBookForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {selectedBookForPreview.bookName}
                  </h3>
                  <div className="text-xs text-slate-500">
                    {selectedBookForPreview.classLevel} • {selectedBookForPreview.subject} • {selectedBookForPreview.curriculumEdition}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedBookForPreview(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex flex-col items-center justify-center p-4 text-center">
              {selectedBookForPreview.fileUrl ? (
                <iframe
                  src={selectedBookForPreview.fileUrl}
                  title={selectedBookForPreview.bookName}
                  className="w-full h-full rounded-xl border border-slate-200"
                />
              ) : (
                <div className="space-y-3 max-w-md">
                  <FileText className="w-12 h-12 text-teal-600 mx-auto" />
                  <div className="font-bold text-slate-800 text-sm">
                    {isBangla ? 'বইয়ের সূচিপত্র ও নিষ্কাশিত জ্ঞান ভাণ্ডার' : 'Textbook Syllabus & Extracted Knowledge'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedBookForPreview.extractedTextSample || 'Official NCTB approved textbook curriculum.'}
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-left max-h-48 overflow-y-auto space-y-1">
                    <span className="font-bold text-slate-700 block">সূচিপত্র:</span>
                    {selectedBookForPreview.chapters?.map((ch, i) => (
                      <div key={i} className="flex justify-between text-slate-600">
                        <span>{ch.chapterNumber}: {ch.titleBn}</span>
                        <span className="font-bold text-teal-700">পৃষ্ঠা {ch.startPage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-400">
                {selectedBookForPreview.publisher}
              </span>
              <button
                onClick={() => setSelectedBookForPreview(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                {isBangla ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Confirmation & Impact Warning */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                {isBangla ? 'পাঠ্যবইটি মুছে ফেলতে চান?' : 'Delete This Textbook?'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                "{bookToDelete.bookName}"
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{isBangla ? 'গুরুত্বপূর্ণ সতর্কতা (Impact Warning):' : 'Impact Warning:'}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {isBangla
                  ? 'এই বইটি মুছে ফেললে এর সাথে সম্পর্কিত সমস্ত অধ্যায়, টপিক সূচি এবং পৃষ্ঠা রেফারেন্স ডাটা মুছে যাবে। ইতোমধ্যে তৈরি হওয়া পরীক্ষা পত্র অপরিবর্তিত থাকবে।'
                  : 'Deleting this textbook removes its extracted chapter indices and page references. Existing generated exam papers will retain their text.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBookToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmDeleteBook}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBangla ? 'মুছে ফেলুন' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
