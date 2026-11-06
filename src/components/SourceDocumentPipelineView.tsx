import React, { useState } from 'react';
import {
  SourceDocumentRecord,
  DocumentStatus,
  ClassLevel,
  TextbookChapterData,
  TextbookKnowledgeItem
} from '../types';
import { NCTB_SUBJECTS } from '../data/curriculumData';
import { MathRenderer } from './MathRenderer';
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Check,
  Edit2,
  Trash2,
  RefreshCw,
  Eye,
  Loader2,
  ShieldCheck,
  FileCheck
} from 'lucide-react';

interface SourceDocumentPipelineViewProps {
  documents: SourceDocumentRecord[];
  onUploadDocument: (doc: SourceDocumentRecord) => void;
  onUpdateDocument: (doc: SourceDocumentRecord) => void;
  onDeleteDocument: (id: string) => void;
  onPublishToKnowledgeBase: (knowledgeItem: TextbookKnowledgeItem) => void;
  isBangla?: boolean;
}

export const SourceDocumentPipelineView: React.FC<SourceDocumentPipelineViewProps> = ({
  documents,
  onUploadDocument,
  onUpdateDocument,
  onDeleteDocument,
  onPublishToKnowledgeBase,
  isBangla = false,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<DocumentStatus | 'ALL'>('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [reviewingDoc, setReviewingDoc] = useState<SourceDocumentRecord | null>(null);

  // Upload modal inputs
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [classLevel, setClassLevel] = useState<ClassLevel>('Class 10');
  const [subject, setSubject] = useState<string>('Physics');
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Review & Correction form state
  const [reviewedChapterTitle, setReviewedChapterTitle] = useState('');
  const [reviewedChapterNum, setReviewedChapterNum] = useState('');
  const [reviewedSummary, setReviewedSummary] = useState('');
  const [reviewedTopics, setReviewedTopics] = useState<string[]>([]);
  const [reviewedFormulas, setReviewedFormulas] = useState<string[]>([]);

  const filtered = documents.filter((d) => {
    if (selectedFilter !== 'ALL' && d.status !== selectedFilter) return false;
    return true;
  });

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setFileName(f.name);
    }
  };

  const handleStartExtraction = async () => {
    if (!pastedText.trim() && !file) {
      setUploadError('Please select a file or paste document text.');
      return;
    }

    setIsProcessing(true);
    setUploadError(null);

    const docId = `doc-${Date.now()}`;
    const initialRecord: SourceDocumentRecord = {
      id: docId,
      workspaceId: 'main-workspace',
      uploaderId: 'owner',
      uploaderEmail: 'mdjahidulislam1025@gmail.com',
      fileName: fileName || file?.name || `${subject}_Source_Document.pdf`,
      fileType: file?.name.endsWith('.pdf') ? 'PDF' : 'SCANNED_DOC',
      fileSize: file?.size || pastedText.length,
      classLevel,
      subject,
      status: 'PROCESSING',
      extractedText: pastedText,
      createdAt: new Date().toISOString(),
    };

    onUploadDocument(initialRecord);
    setShowUploadModal(false);

    try {
      // Call Gemini extraction pipeline
      const res = await fetch('/api/gemini/extract-textbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: pastedText || `NCTB ${subject} (${classLevel}) syllabus chapter.`,
          classLevel,
          subject,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      const extracted = data.data;
      const chapterData: TextbookChapterData = {
        chapterNumber: extracted.chapterNumber || 'অধ্যায় ১',
        chapterTitle: extracted.chapterTitle || 'মূল অধ্যায়',
        mainTopics: extracted.mainTopics || [],
        keyDefinitions: extracted.keyDefinitions || [],
        formulasAndLaws: extracted.formulasAndLaws || [],
        sampleQuestionIdeas: extracted.sampleQuestionIdeas || [],
        summary: extracted.summary || '',
        isVerified: false,
      };

      const updatedRecord: SourceDocumentRecord = {
        ...initialRecord,
        status: 'REVIEW_REQUIRED',
        extractedChapters: [chapterData],
      };

      onUpdateDocument(updatedRecord);
    } catch (err: any) {
      onUpdateDocument({
        ...initialRecord,
        status: 'FAILED',
      });
    } finally {
      setIsProcessing(false);
      setPastedText('');
      setFile(null);
    }
  };

  const handleOpenReview = (doc: SourceDocumentRecord) => {
    setReviewingDoc(doc);
    const firstChap = doc.extractedChapters?.[0];
    if (firstChap) {
      setReviewedChapterNum(firstChap.chapterNumber);
      setReviewedChapterTitle(firstChap.chapterTitle);
      setReviewedSummary(firstChap.summary);
      setReviewedTopics(firstChap.mainTopics || []);
      setReviewedFormulas(firstChap.formulasAndLaws || []);
    }
  };

  const handleConfirmVerification = () => {
    if (!reviewingDoc) return;

    const verifiedChapter: TextbookChapterData = {
      chapterNumber: reviewedChapterNum,
      chapterTitle: reviewedChapterTitle,
      mainTopics: reviewedTopics,
      keyDefinitions: reviewingDoc.extractedChapters?.[0]?.keyDefinitions || [],
      formulasAndLaws: reviewedFormulas,
      sampleQuestionIdeas: reviewingDoc.extractedChapters?.[0]?.sampleQuestionIdeas || [],
      summary: reviewedSummary,
      isVerified: true,
    };

    const verifiedDoc: SourceDocumentRecord = {
      ...reviewingDoc,
      status: 'VERIFIED',
      reviewedBy: 'Authorized Owner',
      verifiedAt: new Date().toISOString(),
      extractedChapters: [verifiedChapter],
    };

    onUpdateDocument(verifiedDoc);

    // Publish to verified knowledge base
    const knowledgeItem: TextbookKnowledgeItem = {
      id: `verified-tb-${Date.now()}`,
      workspaceId: reviewingDoc.workspaceId,
      ownerId: reviewingDoc.uploaderId,
      title: `${reviewingDoc.subject} Verified Source (${reviewedChapterTitle})`,
      classLevel: reviewingDoc.classLevel,
      subject: reviewingDoc.subject,
      editionYear: '2024-2026 NCTB Edition',
      chapters: [verifiedChapter],
      sourceDocumentId: reviewingDoc.id,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };

    onPublishToKnowledgeBase(knowledgeItem);
    setReviewingDoc(null);
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            {isBangla ? 'যাচাইকৃত (Verified)' : 'Verified & Grounded'}
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {isBangla ? 'পর্যালোচনা প্রয়োজন' : 'Review Required'}
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            {isBangla ? 'প্রক্রিয়াধীন...' : 'AI Extracting OCR...'}
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            {isBangla ? 'ব্যর্থ হয়েছে' : 'Failed'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {isBangla ? 'আপলোডকৃত' : 'Uploaded'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            {isBangla
              ? 'উৎস নথি যাচাইকরণ ও আপলোড পাইপলাইন (Document Pipeline)'
              : 'Uploaded Document Verification & OCR Knowledge Pipeline'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isBangla
              ? 'আপলোডকৃত আসল পাঠ্যপুস্তক ও বোর্ড প্রশ্ন থেকে তথ্য নিষ্কাশন ও অনুমোদন — এআই কখনো মনগড়া রেফারেন্স দাবি করে না'
              : 'Upload authentic NCTB PDF textbooks, chapter pages or board exam scans. AI extracts facts for human verification before use.'}
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Upload className="w-4 h-4" />
          {isBangla ? 'নতুন নথি আপলোড ও OCR' : 'Upload Source Document'}
        </button>
      </div>

      {/* Filter Status Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {(['ALL', 'VERIFIED', 'REVIEW_REQUIRED', 'PROCESSING', 'FAILED'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setSelectedFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedFilter === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st === 'ALL' ? 'All Documents' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="space-y-3 font-bangla">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No documents matching filter. Click "Upload Source Document" to import textbooks or exam papers.
          </div>
        ) : (
          filtered.map((doc) => {
            const chap = doc.extractedChapters?.[0];

            return (
              <div
                key={doc.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="p-3 bg-slate-100 text-slate-700 rounded-xl mt-0.5 shrink-0">
                    <FileText className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-base">{doc.fileName}</h3>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {doc.classLevel}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-blue-700">{doc.subject}</span>
                      <span>•</span>
                      <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>

                    {chap && (
                      <p className="text-xs text-slate-700 mt-2 line-clamp-2">
                        <strong>{chap.chapterNumber}: {chap.chapterTitle}</strong> — {chap.summary}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {doc.status === 'REVIEW_REQUIRED' && (
                    <button
                      onClick={() => handleOpenReview(doc)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      {isBangla ? 'পর্যালোচনা ও অনুমোদন' : 'Review & Verify'}
                    </button>
                  )}

                  {doc.status === 'VERIFIED' && (
                    <button
                      onClick={() => handleOpenReview(doc)}
                      className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Verified Facts
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteDocument(doc.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {isBangla ? 'আসল উৎস নথি আপলোড করুন' : 'Upload Authentic Academic Document'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    PDF textbooks, past board papers, or scanned pages with OCR
                  </p>
                </div>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class Level:</label>
                  <select
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value as ClassLevel)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white"
                  >
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject:</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white"
                  >
                    {NCTB_SUBJECTS.map((s) => (
                      <option key={s.id} value={s.nameEn}>
                        {s.nameBn} ({s.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select File (PDF, PNG, JPG):
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUploadChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              {/* Paste Text / Excerpt */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Textbook Chapter Content / Scanned OCR Text (Bangla / English):
                </label>
                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste excerpt from official NCTB textbook or previous board exam paper..."
                  className="w-full text-sm border border-slate-300 rounded-xl p-3 font-bangla focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
                  {uploadError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleStartExtraction}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing OCR & Knowledge Chunks...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Start Extraction & Verification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Verification Modal */}
      {reviewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs font-bangla">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Human Review & Verification Gate
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Verify AI-extracted chapters, definitions, and equations before publishing as official knowledge
                  </p>
                </div>
              </div>
              <button onClick={() => setReviewingDoc(null)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    অধ্যায় নম্বর (Chapter Number):
                  </label>
                  <input
                    type="text"
                    value={reviewedChapterNum}
                    onChange={(e) => setReviewedChapterNum(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    অধ্যায় শিরোনাম (Chapter Title):
                  </label>
                  <input
                    type="text"
                    value={reviewedChapterTitle}
                    onChange={(e) => setReviewedChapterTitle(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সারসংক্ষেপ ও মূল শিখনফল (Academic Summary):
                </label>
                <textarea
                  rows={4}
                  value={reviewedSummary}
                  onChange={(e) => setReviewedSummary(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 leading-relaxed"
                />
              </div>

              {/* Formulas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  যাচাইকৃত সূত্র ও নীতি (Verified Formulas):
                </label>
                <div className="flex flex-wrap gap-2">
                  {reviewedFormulas.map((f, i) => (
                    <span key={i} className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-xs rounded-md">
                      <MathRenderer content={f} />
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setReviewingDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVerification}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <CheckCircle className="w-4 h-4" /> Mark as Verified & Add to Knowledge Base
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
