import React, { useState } from 'react';
import { QuestionPaper, Question } from '../types';
import { MathRenderer } from './MathRenderer';
import { Printer, Download, FileText, CheckCircle, Eye, Settings, Image as ImageIcon } from 'lucide-react';
import { downloadExamPaperPdf, printExamPaperIsolated } from '../services/pdfPrintService';

interface ExamPaperViewProps {
  paper: QuestionPaper;
  onUpdatePaper?: (updated: QuestionPaper) => void;
}

export const ExamPaperView: React.FC<ExamPaperViewProps> = ({ paper, onUpdatePaper }) => {
  const [viewMode, setViewMode] = useState<'paper' | 'answers'>('paper');
  const [columnLayout, setColumnLayout] = useState<'single' | 'two-column'>('two-column');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('serif');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [showSettings, setShowSettings] = useState(false);

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handlePrint = () => {
    printExamPaperIsolated('printable-exam-paper');
  };

  const handleDownloadPdf = async (outputMode: 'question_paper' | 'complete' = 'question_paper') => {
    try {
      setIsPdfGenerating(true);
      if (outputMode === 'complete' && viewMode !== 'answers') {
        setViewMode('answers');
        await new Promise((r) => setTimeout(r, 200));
      }
      await downloadExamPaperPdf('printable-exam-paper', `${paper.title.replace(/\s+/g, '_')}_A4.pdf`);
      setDownloadSuccess(`PDF সফলভাবে ডাউনলোড হয়েছে (${outputMode === 'complete' ? 'উত্তরমালা সহ' : 'প্রশ্নপত্র'})`);
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err) {
      console.error('PDF generation error', err);
      // Fallback to print dialog if canvas rendering fails
      handlePrint();
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(paper, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${paper.title.replace(/\s+/g, '_')}_EduQuestionAI.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const fontClass = fontFamily === 'serif' ? 'font-serif-bangla' : 'font-bangla';
  const sizeClass =
    fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {downloadSuccess && (
        <div className="no-print p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {downloadSuccess}
          </span>
          <button onClick={() => setDownloadSuccess(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* Action Toolbar (Hidden during print) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('paper')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'paper'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" /> Preview Question Paper
          </button>
          <button
            onClick={() => setViewMode('answers')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'answers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckCircle className="w-4 h-4" /> Answer Sheet
          </button>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold">Format</span>
          </button>

          <button
            onClick={() => handleDownloadPdf(viewMode === 'answers' ? 'complete' : 'question_paper')}
            disabled={isPdfGenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isPdfGenerating ? 'Generating PDF...' : 'Download PDF'}
          </button>

          <button
            onClick={() => handlePrint()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-400" /> Print Question Paper
          </button>
        </div>
      </div>

      {/* Formatting Settings Drawer (Hidden during print) */}
      {showSettings && (
        <div className="no-print p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Layout Mode:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setColumnLayout('single')}
                className={`flex-1 py-1.5 rounded-lg border text-center font-medium ${
                  columnLayout === 'single'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                1 Column (Full Width)
              </button>
              <button
                onClick={() => setColumnLayout('two-column')}
                className={`flex-1 py-1.5 rounded-lg border text-center font-medium ${
                  columnLayout === 'two-column'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                2 Columns (Board Style)
              </button>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Bangla Typography:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFontFamily('serif')}
                className={`flex-1 py-1.5 rounded-lg border text-center font-medium ${
                  fontFamily === 'serif'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Traditional Serif (Academic)
              </button>
              <button
                onClick={() => setFontFamily('sans')}
                className={`flex-1 py-1.5 rounded-lg border text-center font-medium ${
                  fontFamily === 'sans'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Modern Clean
              </button>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Text Scaling:</label>
            <div className="flex gap-2">
              {(['sm', 'base', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  className={`flex-1 py-1.5 rounded-lg border text-center font-medium uppercase ${
                    fontSize === sz
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* The Printable A4 Paper Document Container */}
      <div className="flex justify-center">
        <div
          id="printable-exam-paper"
          className={`exam-page w-full max-w-[210mm] min-h-[297mm] print:min-h-0 print:max-w-none print:w-full print:p-0 print:border-none print:shadow-none bg-white border border-slate-300 shadow-xl p-8 sm:p-12 relative overflow-visible print:overflow-visible transition-all ${fontClass} ${sizeClass}`}
          style={{ boxSizing: 'border-box' }}
        >
          {/* Watermark Overlay (Printed on background) */}
          {paper.watermarkText && (
            <div
              className="watermark-overlay"
              style={{
                opacity: paper.watermarkOpacity !== undefined ? paper.watermarkOpacity : 0.08,
                transform:
                  paper.watermarkPosition === 'center'
                    ? 'translate(-50%, -50%)'
                    : 'translate(-50%, -50%) rotate(-30deg)',
              }}
            >
              <div className="text-6xl sm:text-7xl font-bold tracking-widest text-slate-900 uppercase">
                {paper.watermarkText}
              </div>
            </div>
          )}

          {/* Paper Header */}
          <div className="relative z-10 text-center border-b-2 border-slate-800 pb-3 mb-4 print:pb-2 print:mb-3">
            {/* Optional Logo */}
            {paper.logoUrl && (
              <div className="flex justify-center mb-2">
                <img
                  src={paper.logoUrl}
                  alt="Institution Logo"
                  className="w-16 h-16 object-contain"
                />
              </div>
            )}

            {paper.institutionName && (
              <h1 className="text-xl sm:text-2xl font-bold tracking-wide text-slate-900 mb-1">
                {paper.institutionName}
              </h1>
            )}
            {paper.institutionAddress && (
              <p className="text-xs text-slate-600 mb-1">{paper.institutionAddress}</p>
            )}

            {paper.title && (
              <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-2">
                {paper.title}
              </h2>
            )}

            {/* Meta Row: Class, Group, Subject, Subject Code, Academic Year, Date */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm font-semibold text-slate-800">
              {paper.classLevel && (
                <span>
                  <strong>শ্রেণি:</strong> {paper.classLevel}
                </span>
              )}
              {paper.group && (
                <span>
                  <strong>বিভাগ:</strong> {paper.group}
                </span>
              )}
              {paper.subject && (
                <span>
                  <strong>বিষয়:</strong> {paper.subject}
                </span>
              )}
              {paper.subjectCode && (
                <span>
                  <strong>বিষয় কোড:</strong> {paper.subjectCode}
                </span>
              )}
              {paper.academicYear && (
                <span>
                  <strong>শিক্ষাবর্ষ:</strong> {paper.academicYear}
                </span>
              )}
              {paper.examDate && (
                <span>
                  <strong>তারিখ:</strong> {paper.examDate}
                </span>
              )}
            </div>

            {/* Time & Marks Row */}
            {(paper.duration || paper.totalMarks !== undefined || paper.passMarks !== undefined) && (
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm font-bold border-t border-slate-300 pt-2 px-2 text-slate-900">
                <div>
                  {paper.duration && (
                    <>
                      সময়: <span>{paper.duration}</span>
                    </>
                  )}
                </div>
                {viewMode === 'answers' && (
                  <div className="bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full text-xs uppercase font-extrabold tracking-wider">
                    মডেল উত্তরমালা ও মূল্যায়ন নির্দেশিকা
                  </div>
                )}
                <div className="flex items-center gap-4">
                  {paper.totalMarks !== undefined && (
                    <span>
                      পূর্ণমান: <span>{paper.totalMarks}</span>
                    </span>
                  )}
                  {paper.passMarks !== undefined && paper.passMarks > 0 && (
                    <span>
                      পাস নম্বর: <span>{paper.passMarks}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Exam Instructions Banner */}
            {paper.instructions && paper.instructions.length > 0 && viewMode === 'paper' && (
              <div className="mt-2 text-xs italic text-slate-700 bg-slate-50 p-2 rounded-md border border-slate-200 text-left">
                <strong>নির্দেশনা:</strong> {paper.instructions.join(' ')}
              </div>
            )}
          </div>

          {/* Sections and Questions */}
          <div className="relative z-10 space-y-6 print:space-y-4">
            {paper.sections.map((section, sIdx) => (
              <div key={section.id || sIdx} className="section-block">
                {/* Section Header */}
                <div className="text-center my-3 print:my-2">
                  <span className="inline-block border-y-2 border-slate-700 py-1 px-6 font-bold text-base text-slate-900">
                    {section.titleBn || section.titleEn}
                  </span>
                  {section.instructions && viewMode === 'paper' && (
                    <p className="text-xs italic text-slate-600 mt-1 font-medium">
                      [{section.instructions}]
                    </p>
                  )}
                </div>

                {/* Questions Grid / Layout */}
                <div
                  className={
                    columnLayout === 'two-column'
                      ? 'columns-1 sm:columns-2 print:columns-2 gap-8 print:gap-6 [column-rule:1px_solid_#cbd5e1]'
                      : 'space-y-5 print:space-y-3'
                  }
                >
                  {section.questions.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      className="mb-5 print:mb-3 break-inside-avoid page-break-inside-avoid text-slate-900"
                    >
                      {viewMode === 'paper' ? (
                        /* Student Paper Question Rendering */
                        <div>
                          {/* Stimulus (উদ্দীপক) if CQ */}
                          {q.stimulus && (
                            <div className="p-2.5 bg-slate-50/80 border-l-2 border-slate-700 mb-2 text-xs leading-relaxed">
                              <MathRenderer content={q.stimulus} />
                            </div>
                          )}

                          {/* Diagram if attached (SVG or Image URL) */}
                          {(q.diagramSvg || q.diagramUrl) && (
                            <div className="my-2.5 flex flex-col items-center justify-center p-2 bg-slate-50/50 rounded-lg border border-slate-200/60 print:bg-transparent print:border-none">
                              {q.diagramSvg && (
                                <div
                                  className="max-w-full max-h-[160px]"
                                  dangerouslySetInnerHTML={{ __html: q.diagramSvg }}
                                />
                              )}
                              {q.diagramUrl && (
                                <img
                                  src={q.diagramUrl}
                                  alt={q.diagramCaption || 'Question Diagram'}
                                  className="max-w-full max-h-[160px] object-contain rounded-md"
                                />
                              )}
                              {q.diagramCaption && (
                                <span className="text-[10px] text-slate-500 italic mt-0.5 text-center">
                                  {q.diagramCaption}
                                </span>
                              )}
                            </div>
                          )}

                          {/* CQ Parts (ক, খ, গ, ঘ) */}
                          {q.questionType === 'CQ' && q.cqParts ? (
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between font-bold text-xs pb-1">
                                <span>{qIdx + 1} নম্বর প্রশ্ন:</span>
                                <span className="text-slate-600">১০</span>
                              </div>
                              <div className="flex items-start justify-between text-xs">
                                <span>
                                  <strong>ক.</strong>{' '}
                                  <MathRenderer content={q.cqParts.partA.question} />
                                </span>
                                <span className="ml-2 font-bold shrink-0">
                                  {q.cqParts.partA.marks}
                                </span>
                              </div>
                              <div className="flex items-start justify-between text-xs">
                                <span>
                                  <strong>খ.</strong>{' '}
                                  <MathRenderer content={q.cqParts.partB.question} />
                                </span>
                                <span className="ml-2 font-bold shrink-0">
                                  {q.cqParts.partB.marks}
                                </span>
                              </div>
                              <div className="flex items-start justify-between text-xs">
                                <span>
                                  <strong>গ.</strong>{' '}
                                  <MathRenderer content={q.cqParts.partC.question} />
                                </span>
                                <span className="ml-2 font-bold shrink-0">
                                  {q.cqParts.partC.marks}
                                </span>
                              </div>
                              <div className="flex items-start justify-between text-xs">
                                <span>
                                  <strong>ঘ.</strong>{' '}
                                  <MathRenderer content={q.cqParts.partD.question} />
                                </span>
                                <span className="ml-2 font-bold shrink-0">
                                  {q.cqParts.partD.marks}
                                </span>
                              </div>
                            </div>
                          ) : q.questionType === 'MCQ' && q.options ? (
                            /* MCQ Rendering */
                            <div className="text-xs space-y-1">
                              <div className="flex items-start justify-between font-medium">
                                <span>
                                  <strong>{qIdx + 1}.</strong> <MathRenderer content={q.questionText} />
                                </span>
                                <span className="font-bold ml-2 shrink-0">{q.marks}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 pl-4">
                                {q.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-1 text-[11px]">
                                    <span className="font-bold">
                                      ({['ক', 'খ', 'গ', 'ঘ'][optIdx] || optIdx + 1})
                                    </span>
                                    <MathRenderer content={opt} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            /* SQ Short Question Rendering */
                            <div className="flex items-start justify-between text-xs">
                              <span>
                                <strong>{qIdx + 1}.</strong> <MathRenderer content={q.questionText} />
                              </span>
                              <span className="font-bold ml-2 shrink-0">[{q.marks}]</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Answer Sheet / Teacher Evaluation Guide Rendering */
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                          <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex justify-between">
                            <span>
                              {qIdx + 1} নম্বর প্রশ্নের উত্তর ও সমাধান ({q.questionType})
                            </span>
                            <span>[পূর্ণমান: {q.marks}]</span>
                          </div>

                          {q.questionType === 'CQ' && q.cqParts ? (
                            <div className="space-y-1.5">
                              <div>
                                <span className="font-bold text-blue-900">
                                  ক ({q.cqParts.partA.marks} নম্বর):{' '}
                                </span>
                                <MathRenderer
                                  content={q.cqParts.partA.answer || 'সরাসরি প্রমিত সংজ্ঞা বা তথ্য।'}
                                />
                              </div>
                              <div>
                                <span className="font-bold text-blue-900">
                                  খ ({q.cqParts.partB.marks} নম্বর):{' '}
                                </span>
                                <MathRenderer
                                  content={
                                    q.cqParts.partB.answer ||
                                    'জ্ঞানমূলক অংশ ১ নম্বর + অনুধাবনমূলক বিশদ ব্যাখ্যা ১ নম্বর।'
                                  }
                                />
                              </div>
                              <div>
                                <span className="font-bold text-blue-900">
                                  গ ({q.cqParts.partC.marks} নম্বর):{' '}
                                </span>
                                <MathRenderer
                                  content={
                                    q.cqParts.partC.answer ||
                                    'উদ্দীপকের সাথে সংশ্লিষ্ট সূত্রের প্রয়োগ ও সঠিক গাণিতিক সমাধান।'
                                  }
                                />
                              </div>
                              <div>
                                <span className="font-bold text-blue-900">
                                  ঘ ({q.cqParts.partD.marks} নম্বর):{' '}
                                </span>
                                <MathRenderer
                                  content={
                                    q.cqParts.partD.answer ||
                                    'উচ্চতর দক্ষতা: যৌক্তিক মূল্যায়ন, তুলনামূলক বিশ্লেষণ এবং সিদ্ধান্ত।'
                                  }
                                />
                              </div>
                            </div>
                          ) : q.questionType === 'MCQ' ? (
                            <div>
                              <p className="font-bold text-emerald-800">
                                সঠিক উত্তর:{' '}
                                {q.correctAnswer ||
                                  (q.options && q.correctOptionIndex !== undefined
                                    ? q.options[q.correctOptionIndex]
                                    : 'ক')}
                              </p>
                              {q.explanation && (
                                <p className="text-slate-600 mt-1 italic">
                                  ব্যাখ্যা: {q.explanation}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="text-slate-800">
                                {q.correctAnswer || q.explanation || 'আদর্শ মডেল উত্তর ও মূল্যায়ন মানদণ্ড।'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Paper Footer */}
          <div className="mt-12 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500 flex justify-between items-center">
            <span>EduQuestion AI — Personal NCTB Examination Suite</span>
            <span>পৃষ্ঠা ১</span>
            <span>{paper.subject} • {paper.classLevel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
