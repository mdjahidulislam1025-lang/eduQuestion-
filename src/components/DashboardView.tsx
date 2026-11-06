import React from 'react';
import { Question, QuestionPaper } from '../types';
import {
  Sparkles,
  FileText,
  Library,
  BookOpen,
  Award,
  Layers,
  CheckCircle,
  TrendingUp,
  Bookmark,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Zap,
  FileUp
} from 'lucide-react';

interface DashboardViewProps {
  questions: Question[];
  papers: QuestionPaper[];
  onNavigate: (view: string, presetType?: 'MCQ' | 'SQ' | 'CQ' | 'Mixed') => void;
  onOpenPaper: (paper: QuestionPaper) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  questions,
  papers,
  onNavigate,
  onOpenPaper,
}) => {
  // Statistics calculations (SSC Focused)
  const totalQuestions = questions.length;
  const cqCount = questions.filter((q) => q.questionType === 'CQ').length;
  const mcqCount = questions.filter((q) => q.questionType === 'MCQ').length;
  const sqCount = questions.filter((q) => q.questionType === 'SQ').length;

  const generalSscCount = questions.filter(
    (q) => !q.sscCategory || q.sscCategory === 'General SSC' || (!q.boardInfo?.boardName.toLowerCase().includes('madrasah') && !q.boardInfo?.boardName.toLowerCase().includes('technical'))
  ).length;
  const dakhilCount = questions.filter(
    (q) => q.sscCategory === 'Dakhil' || q.boardInfo?.boardName.toLowerCase().includes('madrasah') || q.boardInfo?.examType.toLowerCase().includes('dakhil')
  ).length;
  const vocationalCount = questions.filter(
    (q) => q.sscCategory === 'SSC Vocational' || q.boardInfo?.boardName.toLowerCase().includes('technical') || q.boardInfo?.examType.toLowerCase().includes('vocational')
  ).length;

  const favorites = questions.filter((q) => q.isFavorite);

  // Subject distribution
  const subjectCounts: Record<string, number> = {};
  questions.forEach((q) => {
    subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Easy Mode Hero Banner & 4 Quick Action Cards */}
      <div className="bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-blue-500/20 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/30 text-cyan-300 text-xs font-bold mb-2 border border-blue-400/30">
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              Easy Mode • ঝটপট প্রশ্ন ও PDF জেনারেটর
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Easy Mode — Generate Questions & Download PDF Quickly
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              শ্রেণি ও বিষয় নির্বাচন করে এক ক্লিকেই তৈরি করুন প্রশ্নপত্র এবং সরাসরি প্রিন্ট বা A4 PDF ডাউনলোড করুন।
            </p>
          </div>
          <button
            onClick={() => onNavigate('easy-mode')}
            className="self-start md:self-auto px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all shrink-0 cursor-pointer"
          >
            <span>ইজি মোড চালু করুন</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Large Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('easy-mode', 'MCQ')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition-all hover:scale-[1.02] cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/30 text-blue-300 flex items-center justify-center mb-3 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-sm text-white flex items-center justify-between">
              <span>Generate MCQ</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-xs text-blue-200 mt-0.5">বহুনির্বাচনী প্রশ্ন তৈরি ও উত্তরপত্র</div>
          </button>

          <button
            onClick={() => onNavigate('easy-mode', 'SQ')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition-all hover:scale-[1.02] cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center mb-3 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-sm text-white flex items-center justify-between">
              <span>Generate SQ</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-xs text-indigo-200 mt-0.5">সংক্ষিপ্ত প্রশ্ন ও মডেল উত্তর</div>
          </button>

          <button
            onClick={() => onNavigate('easy-mode', 'CQ')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition-all hover:scale-[1.02] cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/30 text-amber-300 flex items-center justify-center mb-3 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-sm text-white flex items-center justify-between">
              <span>Generate CQ</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-xs text-amber-200 mt-0.5">উদ্দীপকসহ সৃজনশীল প্রশ্ন (১০ মান)</div>
          </button>

          <button
            onClick={() => onNavigate('easy-mode', 'Mixed')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition-all hover:scale-[1.02] cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/30 text-emerald-300 flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-sm text-white flex items-center justify-between">
              <span>Generate Mixed</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-xs text-emerald-200 mt-0.5">MCQ + SQ + CQ সমন্বিত পরীক্ষা</div>
          </button>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-7 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 text-xs font-semibold mb-3 border border-blue-400/30">
            <ShieldCheck className="w-3.5 h-3.5" /> NCTB Curriculum (Classes 8, 9, 10) • AI Question Bank
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            EduQuestion AI — Personal Examination Suite
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Generate authentic Creative Questions (সৃজনশীল), MCQs with detailed explanations, and create print-ready A4 examination papers with custom logo and watermark.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => onNavigate('generator')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" /> Advanced Generator
            </button>
            <button
              onClick={() => onNavigate('library')}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-blue-400/40 shadow-lg transition-all cursor-pointer"
            >
              <Library className="w-4 h-4 text-cyan-300" /> কেন্দ্রীয় প্রশ্ন ব্যাংক ও রিপোজিটরি
            </button>
            <button
              onClick={() => onNavigate('builder')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/20 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-cyan-300" /> Build Exam Paper
            </button>
            <button
              onClick={() => onNavigate('admin-pdf-library')}
              className="px-4 py-2.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/40 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileUp className="w-4 h-4 text-purple-300" /> অ্যাডমিন PDF
            </button>
            <button
              onClick={() => onNavigate('nctb-books')}
              className="px-4 py-2.5 bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-400/40 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-teal-300" /> এনসিটিবি লাইব্রেরি
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Questions</span>
            <Library className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalQuestions}</div>
          <p className="text-[11px] text-slate-500 mt-1">Across all 8 subjects</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">CQ Questions</span>
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-900">{cqCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">ক, খ, গ, ঘ উদ্দীপকভিত্তিক</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">MCQ & SQ</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900">{mcqCount + sqCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">{mcqCount} MCQs • {sqCount} Short Qs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Exam Papers</span>
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900">{papers.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Ready for PDF download</p>
        </div>
      </div>

      {/* Main Grid: Breakdown & Recent Examination Papers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Papers & Curriculum Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Examination Papers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Recent Examination Papers
              </h3>
              <button
                onClick={() => onNavigate('builder')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Create New Paper <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {papers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No examination papers generated yet. Click "Build Exam Paper" to start.
              </div>
            ) : (
              <div className="space-y-3">
                {papers.map((p) => {
                  const qCount = p.sections.reduce((acc, s) => acc + s.questions.length, 0);

                  return (
                    <div
                      key={p.id}
                      onClick={() => onOpenPaper(p)}
                      className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                          {p.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {p.classLevel}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-blue-600">{p.subject}</span>
                          <span>•</span>
                          <span>{qCount} Questions</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">Marks: {p.totalMarks}</span>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                        Open Paper <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SSC Examination Category Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> এসএসসি পরীক্ষা ও ক্যাটাগরি বিশ্লেষণ (SSC Examination Distribution)
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-blue-50/70 text-center border border-blue-200">
                <span className="text-xs font-bold text-blue-900 block">সাধারণ এসএসসি (General)</span>
                <span className="text-lg font-black text-blue-800">{generalSscCount} Qs</span>
                <span className="text-[10px] text-blue-600 block mt-0.5">৯টি সাধারণ শিক্ষা বোর্ড</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/70 text-center border border-amber-200">
                <span className="text-xs font-bold text-amber-900 block">দাখিল (Dakhil)</span>
                <span className="text-lg font-black text-amber-800">{dakhilCount} Qs</span>
                <span className="text-[10px] text-amber-600 block mt-0.5">মাদ্রাসা শিক্ষা বোর্ড</span>
              </div>
              <div className="p-4 rounded-xl bg-cyan-50/70 text-center border border-cyan-200">
                <span className="text-xs font-bold text-cyan-900 block">ভোকেশনাল (Vocational)</span>
                <span className="text-lg font-black text-cyan-800">{vocationalCount} Qs</span>
                <span className="text-[10px] text-cyan-600 block mt-0.5">কারিগরি শিক্ষা বোর্ড</span>
              </div>
            </div>

            {/* Subject bars */}
            <div className="space-y-2">
              {Object.entries(subjectCounts).map(([subj, count]) => {
                const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
                return (
                  <div key={subj} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>{subj}</span>
                      <span>{count} Qs ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Shortcuts & Favorite Questions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-slate-400 mb-3">
              Quick Shortcuts
            </h3>

            <button
              onClick={() => onNavigate('generator')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left flex items-center gap-3 text-slate-700 group"
            >
              <div className="p-2 bg-purple-100 text-purple-700 rounded-lg group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Generate Questions</div>
                <div className="text-[11px] text-slate-500">MCQ, SQ, CQ via Gemini AI</div>
              </div>
            </button>

            <button
              onClick={() => onNavigate('library')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left flex items-center gap-3 text-slate-700 group"
            >
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:scale-105 transition-transform">
                <Library className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Question Library</div>
                <div className="text-[11px] text-slate-500">Filter and search all saved items</div>
              </div>
            </button>

            <button
              onClick={() => onNavigate('textbooks')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left flex items-center gap-3 text-slate-700 group"
            >
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Textbook Knowledge Base</div>
                <div className="text-[11px] text-slate-500">NCTB books, OCR & formulas</div>
              </div>
            </button>

            <button
              onClick={() => onNavigate('board-archive')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all text-left flex items-center gap-3 text-slate-700 group"
            >
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg group-hover:scale-105 transition-transform">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Board Question Archive</div>
                <div className="text-[11px] text-slate-500">10 Bangladesh Education Boards</div>
              </div>
            </button>
          </div>

          {/* Favorite Questions Bookmark */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4 text-amber-500 fill-current" /> Favorite High-Yield Questions
            </h3>

            {favorites.length === 0 ? (
              <p className="text-xs text-slate-400">
                Bookmark top questions in Question Bank to see them pinned here.
              </p>
            ) : (
              <div className="space-y-2.5">
                {favorites.slice(0, 4).map((fav) => (
                  <div
                    key={fav.id}
                    className="p-3 bg-amber-50/40 border border-amber-200/60 rounded-xl text-xs font-bangla"
                  >
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                      <span className="font-bold text-amber-900">{fav.subject}</span>
                      <span>{fav.questionType}</span>
                    </div>
                    <p className="text-slate-800 line-clamp-2">
                      {fav.stimulus || fav.questionText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
