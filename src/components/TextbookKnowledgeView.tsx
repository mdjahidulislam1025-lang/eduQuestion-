import React, { useState } from 'react';
import { TextbookKnowledgeItem, ClassLevel } from '../types';
import { NCTB_SUBJECTS } from '../data/curriculumData';
import { MathRenderer } from './MathRenderer';
import {
  BookOpen,
  Upload,
  Search,
  Sparkles,
  FileText,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  BookmarkCheck,
  Hash
} from 'lucide-react';

interface TextbookKnowledgeViewProps {
  textbooks: TextbookKnowledgeItem[];
  onAddTextbook: (item: TextbookKnowledgeItem) => void;
  onSelectForGeneration: (subject: string, chapter: string, classLevel: ClassLevel) => void;
}

export const TextbookKnowledgeView: React.FC<TextbookKnowledgeViewProps> = ({
  textbooks,
  onAddTextbook,
  onSelectForGeneration,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassLevel | 'ALL'>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload / Extract Form State
  const [formClass, setFormClass] = useState<ClassLevel>('Class 10');
  const [formSubject, setFormSubject] = useState<string>('Physics');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formEdition, setFormEdition] = useState<string>('2024-2026 NCTB Edition');
  const [formRawText, setFormRawText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Filtered list
  const filteredTextbooks = textbooks.filter((book) => {
    if (selectedClass !== 'ALL' && book.classLevel !== selectedClass) return false;
    if (selectedSubject !== 'ALL' && book.subject !== selectedSubject) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = book.title.toLowerCase().includes(q);
      const matchChapter = book.chapters.some(
        (c) =>
          c.chapterTitle.toLowerCase().includes(q) ||
          c.mainTopics.some((t) => t.toLowerCase().includes(q)) ||
          c.summary.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchChapter) return false;
    }
    return true;
  });

  const handleProcessTextbook = async () => {
    if (!formRawText.trim()) return;
    setIsExtracting(true);
    setExtractError(null);

    try {
      const res = await fetch('/api/gemini/extract-textbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: formRawText,
          classLevel: formClass,
          subject: formSubject,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract knowledge base');
      }

      const extracted = data.data;
      const newBook: TextbookKnowledgeItem = {
        id: `tb-${Date.now()}`,
        ownerId: 'owner',
        title: formTitle || extracted.bookTitle || `${formSubject} Textbook (${formClass})`,
        classLevel: formClass,
        subject: formSubject,
        editionYear: formEdition,
        chapters: [
          {
            chapterNumber: extracted.chapterNumber || 'অধ্যায় ১',
            chapterTitle: extracted.chapterTitle || 'মূল বিষয়বস্তু',
            mainTopics: extracted.mainTopics || [],
            keyDefinitions: extracted.keyDefinitions || [],
            formulasAndLaws: extracted.formulasAndLaws || [],
            sampleQuestionIdeas: extracted.sampleQuestionIdeas || [],
            summary: extracted.summary || '',
          },
        ],
        rawNotes: formRawText.slice(0, 1000),
        createdAt: new Date().toISOString(),
      };

      onAddTextbook(newBook);
      setShowUploadModal(false);
      setFormRawText('');
      setFormTitle('');
    } catch (err: any) {
      setExtractError(err.message || 'Error parsing textbook text');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            NCTB Textbook Knowledge Base & Document Repository
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Search textbook chapters, scientific definitions, laws, and generate questions grounded strictly in official syllabus
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Upload className="w-4 h-4" /> Import Textbook / Extract OCR Text
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters, topics, definitions, formulas..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Class:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value as any)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All SSC Classes</option>
            <option value="SSC">SSC (Complete)</option>
            <option value="Class 10">Class 10</option>
            <option value="Class 9">Class 9</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Subject:</span>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Subjects</option>
            {NCTB_SUBJECTS.map((s) => (
              <option key={s.id} value={s.nameEn}>
                {s.nameBn} ({s.nameEn})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Textbooks List */}
      <div className="space-y-4">
        {filteredTextbooks.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700 text-sm">No textbook entries match your filters</h3>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search or click "Import Textbook" above to add new curriculum chapters.
            </p>
          </div>
        ) : (
          filteredTextbooks.map((book) => (
            <div
              key={book.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-blue-300"
            >
              <div className="p-5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{book.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded-md">
                        {book.classLevel}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-blue-700">{book.subject}</span>
                      <span>•</span>
                      <span>{book.editionYear}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  {book.chapters.length} Documented Chapters
                </div>
              </div>

              {/* Chapters List */}
              <div className="p-5 space-y-4 font-bangla">
                {book.chapters.map((chap, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md mr-2">
                          {chap.chapterNumber}
                        </span>
                        <span className="font-bold text-slate-800 text-base">
                          {chap.chapterTitle}
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          onSelectForGeneration(book.subject, chap.chapterTitle, book.classLevel)
                        }
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Generate Exam Questions
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {chap.summary}
                    </p>

                    {/* Topics Tags */}
                    {chap.mainTopics.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Key Subtopics (পাঠ্যসূচি):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {chap.mainTopics.map((topic, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Formulas and Key Definitions */}
                    {chap.formulasAndLaws && chap.formulasAndLaws.length > 0 && (
                      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl mb-3">
                        <span className="text-xs font-bold text-amber-900 block mb-1">
                          Core Formulas & Physical Laws (সূত্রাবলি ও নিয়ম):
                        </span>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-800">
                          {chap.formulasAndLaws.map((f, fIdx) => (
                            <span key={fIdx} className="bg-white px-2.5 py-1 rounded-md border border-amber-200 font-medium">
                              <MathRenderer content={f} />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {chap.keyDefinitions && chap.keyDefinitions.length > 0 && (
                      <div className="space-y-1 text-xs text-slate-700">
                        {chap.keyDefinitions.slice(0, 3).map((def, dIdx) => (
                          <div key={dIdx} className="flex items-start gap-1.5">
                            <BookmarkCheck className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                            <span>
                              <strong>{def.term}:</strong> {def.definition}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload & Knowledge Base Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Import NCTB Textbook Chapter or Scanned OCR Text
                  </h3>
                  <p className="text-xs text-slate-500">
                    AI analyzes concepts, definitions, formulas, and builds a searchable syllabus record
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class:</label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value as ClassLevel)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white"
                  >
                    <option value="Class 10">Class 10 (SSC)</option>
                    <option value="Class 9">Class 9 (SSC)</option>
                    <option value="SSC">SSC Complete</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject:</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Book or Chapter Title (Optional):
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. পদার্থবিজ্ঞান - কাজ, ক্ষমতা ও শক্তি (অধ্যায় ৪)"
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 font-bangla"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Textbook Content / Scanned OCR / Lesson Text:
                </label>
                <textarea
                  rows={8}
                  value={formRawText}
                  onChange={(e) => setFormRawText(e.target.value)}
                  placeholder="এখানে পাঠ্যপুস্তকের অধ্যায়ের লেখা বা ওসিআর টেক্সট পেস্ট করুন... (Paste chapter paragraphs, theorems, equations or definitions from NCTB PDF)"
                  className="w-full text-sm border border-slate-300 rounded-xl p-3 font-bangla focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {extractError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
                  {extractError}
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
                onClick={handleProcessTextbook}
                disabled={isExtracting || !formRawText.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing & Extracting Knowledge...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Extract & Store in Knowledge Base
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
