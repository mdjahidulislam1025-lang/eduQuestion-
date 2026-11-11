import React, { useState, useEffect } from 'react';
import {
  Question,
  QuestionPaper,
  SubmittedQuestion,
  AdminNotification,
  DynamicClassItem,
  DynamicSubjectItem,
  ExamPresetItem,
  Workspace,
} from '../types';
import {
  loadSubmittedQuestions,
  approveSubmittedQuestion,
  rejectSubmittedQuestion,
  loadAdminNotifications,
  ADMIN_EMAIL,
} from '../services/submissionService';
import { saveWorkspaceBranding } from '../services/brandingService';
import { AdminConfigManager } from './AdminConfigManager';
import { MathRenderer } from './MathRenderer';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  User,
  Phone,
  BookOpen,
  FileText,
  Layers,
  Settings,
  Bell,
  RefreshCw,
  ExternalLink,
  Save,
  Check,
  Building,
  AlertTriangle,
  Send,
  Trash2,
  Upload,
  Eye,
  GraduationCap,
} from 'lucide-react';
import {
  subscribeToViewCount,
  formatBengaliNumber,
} from '../services/siteStatsService';

interface AdminDashboardViewProps {
  allQuestions: Question[];
  allPapers: QuestionPaper[];
  workspace: Workspace;
  dynamicClasses: DynamicClassItem[];
  dynamicSubjects: DynamicSubjectItem[];
  examPresets: ExamPresetItem[];
  isBangla?: boolean;
  onQuestionApproved: (question: Question) => void;
  onUpdateWorkspace: (updated: Workspace) => void;
  onSaveClass: (item: DynamicClassItem) => Promise<void>;
  onDeleteClass: (id: string) => Promise<void>;
  onSaveSubject: (item: DynamicSubjectItem) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
  onSaveExamPreset: (item: ExamPresetItem) => Promise<void>;
  onDeleteExamPreset: (id: string) => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  allQuestions,
  allPapers,
  workspace,
  dynamicClasses,
  dynamicSubjects,
  examPresets,
  isBangla = true,
  onQuestionApproved,
  onUpdateWorkspace,
  onSaveClass,
  onDeleteClass,
  onSaveSubject,
  onDeleteSubject,
  onSaveExamPreset,
  onDeleteExamPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'branding' | 'configs' | 'notifications'>(
    'submissions'
  );

  // Submissions State
  const [submissions, setSubmissions] = useState<SubmittedQuestion[]>([]);
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  // Branding State
  const [brandingDraft, setBrandingDraft] = useState<Workspace>(workspace);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSavedNotice, setBrandingSavedNotice] = useState(false);

  // Sync draft when workspace prop changes
  useEffect(() => {
    setBrandingDraft(workspace);
  }, [workspace]);

  // Load Submissions & Notifications
  const refreshSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const list = await loadSubmittedQuestions();
      setSubmissions(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const refreshNotifications = async () => {
    setIsLoadingNotifs(true);
    try {
      const list = await loadAdminNotifications();
      setNotifications(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  // Site Views Counter State
  const [siteViews, setSiteViews] = useState<number>(1025);

  useEffect(() => {
    refreshSubmissions();
    refreshNotifications();
    const unsub = subscribeToViewCount((count) => {
      setSiteViews(count);
    });
    return () => unsub();
  }, []);

  // Filtered Submissions
  const filteredSubmissions = submissions.filter((s) => {
    if (submissionFilter === 'ALL') return true;
    return s.status === submissionFilter;
  });

  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;

  // Handle Approve
  const handleApprove = async (sub: SubmittedQuestion) => {
    setProcessingId(sub.id);
    try {
      const approvedQ = await approveSubmittedQuestion(sub);
      onQuestionApproved(approvedQ);
      setSubmissions((prev) =>
        prev.map((item) => (item.id === sub.id ? { ...item, status: 'APPROVED' as const } : item))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject
  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectSubmittedQuestion(id);
      setSubmissions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'REJECTED' as const } : item))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Save Branding
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    try {
      const updated = await saveWorkspaceBranding(brandingDraft);
      onUpdateWorkspace(updated);
      setBrandingSavedNotice(true);
      setTimeout(() => setBrandingSavedNotice(false), 3500);
    } catch (err) {
      console.error('Failed to save branding:', err);
    } finally {
      setIsSavingBranding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Admin Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isBangla ? 'মাস্টার অ্যাডমিন কন্ট্রোল সেন্টার' : 'Master Admin Control Center'}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {isBangla ? 'এডুকোয়েশ্চেন এআই — কেন্দ্রীয় অ্যাডমিন ড্যাশবোর্ড' : 'EduQuestion AI Central Admin Dashboard'}
            </h1>
            <p className="text-xs text-slate-300 flex items-center gap-1.5">
              <span>অ্যাডমিন জিমেইল:</span>
              <strong className="text-emerald-300 font-mono">{ADMIN_EMAIL}</strong>
              <span className="text-slate-400">• Vercel লাইভ ক্লাউড ডাটাবেস সক্রিয়</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                refreshSubmissions();
                refreshNotifications();
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubmissions ? 'animate-spin' : ''}`} />
              {isBangla ? 'ডাটা রিফ্রেশ করুন' : 'Refresh Data'}
            </button>

            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                ADMIN_EMAIL
              )}&su=${encodeURIComponent('[EduQuestion AI] Admin Notification Center')}&body=${encodeURIComponent(
                'অ্যাডমিন ড্যাশবোর্ড টেস্ট মেসেজ।'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              {isBangla ? 'জিমেইল ইনবক্স খুলুন' : 'Open Gmail Inbox'}
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>

        {/* Creator Attribution Ribbon */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-cyan-300" />
            <span>Created by <strong className="text-white font-bold">JAHIDUL ISLAM</strong></span>
            <span className="text-blue-300">•</span>
            <span className="text-blue-200">IIT, University of Dhaka</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-[11px]">
            <span>মোট ভিজিটর ভিউ: <strong className="text-cyan-300 font-bold">{formatBengaliNumber(siteViews)} জন</strong></span>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Live Site Visitors / Views */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/80 p-4 rounded-2xl border border-indigo-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-900">
              {isBangla ? 'ওয়েবসাইট মোট ভিউ' : 'Total Site Views'}
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-950">{formatBengaliNumber(siteViews)}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              লাইভ
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">রিয়েল-টাইম ভিজিটর কাউন্টার</p>
        </div>

        {/* Pending Submissions */}
        <div
          onClick={() => setActiveTab('submissions')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            pendingCount > 0
              ? 'bg-amber-50/70 border-amber-300 shadow-sm ring-1 ring-amber-400'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">
              {isBangla ? 'পেন্ডিং ইউজার প্রশ্ন' : 'Pending Submissions'}
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-800">{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-200/80 px-2 py-0.5 rounded-full animate-pulse">
                অনুমোদন বাকি
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Vercel লিংক থেকে ইউজারদের জমা দেওয়া প্রশ্ন</p>
        </div>

        {/* Total Questions */}
        <div
          onClick={() => setActiveTab('submissions')}
          className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">
              {isBangla ? 'প্রশ্ন ব্যাংকে মোট প্রশ্ন' : 'Total in Question Bank'}
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-blue-900">{allQuestions.length}</span>
          <p className="text-[11px] text-slate-500 mt-1">সক্রিয় ও ব্যবহারযোগ্য প্রশ্নের সংগ্রহ</p>
        </div>

        {/* Total Papers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">
              {isBangla ? 'তৈরিকৃত পরীক্ষা পত্র' : 'Generated Papers'}
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-emerald-900">{allPapers.length}</span>
          <p className="text-[11px] text-slate-500 mt-1">ডাউনলোড ও প্রিন্ট উপযোগী প্রশ্নপত্র</p>
        </div>

        {/* Active Subjects & Classes */}
        <div
          onClick={() => setActiveTab('configs')}
          className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">
              {isBangla ? 'সক্রিয় শ্রেণি ও বিষয়' : 'Classes & Subjects'}
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-indigo-900">
            {dynamicClasses.length} / {dynamicSubjects.length}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">ডাইনামিক ও কাস্টম বিষয় কনফিগারেশন</p>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'submissions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          {isBangla ? 'ইউজারদের আপলোডকৃত প্রশ্ন' : 'User Submissions'}
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'branding'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          {isBangla ? 'প্রতিষ্ঠান ও ব্র্যান্ডিং সেটিংস' : 'Institution & Branding'}
        </button>

        <button
          onClick={() => setActiveTab('configs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'configs'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          {isBangla ? 'শ্রেণি, বিষয় ও পরীক্ষা প্রিসেট' : 'Classes, Subjects & Presets'}
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'notifications'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          {isBangla ? 'জিমেইল নোটিফিকেশন হিস্ট্রি' : 'Gmail Notifications'}
          {notifications.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: User Submissions */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Submissions Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 mr-1">
                {isBangla ? 'ফিল্টার করুন:' : 'Filter:'}
              </span>
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSubmissionFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    submissionFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'PENDING'
                    ? `পেন্ডিং (${pendingCount})`
                    : st === 'APPROVED'
                    ? 'অনুমোদিত'
                    : st === 'REJECTED'
                    ? 'প্রত্যাখ্যাত'
                    : 'সবগুলো'}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500">
              মোট প্রদর্শিত: <strong>{filteredSubmissions.length}</strong> টি প্রশ্ন
            </div>
          </div>

          {/* Submissions List */}
          {isLoadingSubmissions ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              সাবমিশনগুলো লোড হচ্ছে...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">
                {submissionFilter === 'PENDING'
                  ? 'বর্তমানে কোনো পেন্ডিং প্রশ্ন জমা নেই'
                  : 'কোনো প্রশ্ন পাওয়া যায়নি'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                আপনার Vercel লিংক দিয়ে যে কেউ উপরে "প্রশ্ন আপলোড করুন" বাটনে ক্লিক করে প্রশ্ন জমা দিতে পারবেন।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((sub) => {
                const isProcessing = processingId === sub.id;
                return (
                  <div
                    key={sub.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                      sub.status === 'PENDING'
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : sub.status === 'APPROVED'
                        ? 'border-emerald-200'
                        : 'border-slate-200 opacity-75'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            sub.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : sub.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sub.status === 'PENDING'
                            ? 'পেন্ডিং পর্যালোচনা'
                            : sub.status === 'APPROVED'
                            ? 'অনুমোদিত'
                            : 'প্রত্যাখ্যাত'}
                        </span>

                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                          {sub.classLevel}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                          {sub.subject}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold">
                          {sub.questionType}
                        </span>
                        {sub.chapter && (
                          <span className="text-xs text-slate-500 font-medium">অধ্যায়: {sub.chapter}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(sub.createdAt).toLocaleString('bn-BD')}</span>
                      </div>
                    </div>

                    {/* Submitter Info Card */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 mb-3 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>আপলোডকারী: {sub.submitterName}</span>
                      </div>
                      {sub.submitterEmail && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sub.submitterEmail}</span>
                        </div>
                      )}
                      {sub.submitterPhone && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sub.submitterPhone}</span>
                        </div>
                      )}
                      <div className="ml-auto text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> নোটিফিকেশন পাঠানো হয়েছে: {ADMIN_EMAIL}
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="space-y-2 mb-4">
                      {sub.stimulus && (
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs sm:text-sm font-bangla text-slate-800">
                          <strong>উদ্দীপক:</strong> <MathRenderer content={sub.stimulus} />
                        </div>
                      )}

                      <div className="text-xs sm:text-sm font-bangla text-slate-900 leading-relaxed">
                        <MathRenderer content={sub.questionText} />
                      </div>

                      {/* MCQ Options */}
                      {sub.questionType === 'MCQ' && sub.options && sub.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                          {sub.options.map((opt, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg border ${
                                sub.correctAnswer === opt || sub.correctAnswer?.startsWith(['ক', 'খ', 'গ', 'ঘ'][idx])
                                  ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              {['ক', 'খ', 'গ', 'ঘ'][idx]}. <MathRenderer content={opt} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* CQ Parts */}
                      {sub.questionType === 'CQ' && sub.cqParts && (
                        <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-100 text-xs">
                          <div className="flex justify-between p-1.5 bg-slate-50 rounded-lg">
                            <span>ক. <MathRenderer content={sub.cqParts.partA.question} /></span>
                            <span className="font-bold text-blue-600">[{sub.cqParts.partA.marks}]</span>
                          </div>
                          <div className="flex justify-between p-1.5 bg-slate-50 rounded-lg">
                            <span>খ. <MathRenderer content={sub.cqParts.partB.question} /></span>
                            <span className="font-bold text-blue-600">[{sub.cqParts.partB.marks}]</span>
                          </div>
                          <div className="flex justify-between p-1.5 bg-slate-50 rounded-lg">
                            <span>গ. <MathRenderer content={sub.cqParts.partC.question} /></span>
                            <span className="font-bold text-blue-600">[{sub.cqParts.partC.marks}]</span>
                          </div>
                          <div className="flex justify-between p-1.5 bg-slate-50 rounded-lg">
                            <span>ঘ. <MathRenderer content={sub.cqParts.partD.question} /></span>
                            <span className="font-bold text-blue-600">[{sub.cqParts.partD.marks}]</span>
                          </div>
                        </div>
                      )}

                      {sub.correctAnswer && (
                        <div className="text-xs text-emerald-800 font-semibold bg-emerald-50 p-2 rounded-lg mt-1">
                          সঠিক উত্তর: {sub.correctAnswer}
                        </div>
                      )}
                    </div>

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                      <div className="text-[11px] text-slate-400">
                        আইডি: <span className="font-mono">{sub.id}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {sub.submitterEmail && (
                          <a
                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                              sub.submitterEmail
                            )}&su=${encodeURIComponent(
                              `[EduQuestion AI] আপনার জমা দেওয়া প্রশ্নের আপডেট (${sub.subject})`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Mail className="w-3.5 h-3.5 text-blue-600" />
                            ইউজারকে ইমেইল
                          </a>
                        )}

                        {sub.status !== 'REJECTED' && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleReject(sub.id)}
                            className="px-3.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {isBangla ? 'প্রত্যাখ্যান' : 'Reject'}
                          </button>
                        )}

                        {sub.status !== 'APPROVED' && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(sub)}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {isProcessing
                              ? 'অনুমোদন হচ্ছে...'
                              : isBangla
                              ? 'প্রশ্ন ব্যাংকে অনুমোদন করুন'
                              : 'Approve to Question Bank'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Institutional Branding & Watermark Configuration */}
      {activeTab === 'branding' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                {isBangla
                  ? 'প্রতিষ্ঠান হেডার ও ওয়াটারমার্ক সেটিংস (ক্লাউড ও ডিভাইস সিঙ্ক)'
                  : 'Institutional Header & Watermark Cloud Settings'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                এখানে যা পরিবর্তন করবেন তা সরাসরি Firebase Firestore ও লোকাল স্টোরেজে স্থায়ীভাবে সংরক্ষিত থাকবে
              </p>
            </div>

            {brandingSavedNotice && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {isBangla ? 'সফলভাবে ক্লাউডে সংরক্ষিত হয়েছে!' : 'Successfully Saved to Cloud!'}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'ডিফল্ট প্রতিষ্ঠানের নাম (Institution Name):' : 'Default Institution Name:'}
                </label>
                <input
                  type="text"
                  required
                  value={brandingDraft.institutionName || ''}
                  onChange={(e) =>
                    setBrandingDraft({ ...brandingDraft, institutionName: e.target.value })
                  }
                  placeholder="যেমন: মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ"
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'প্রতিষ্ঠানের ঠিকানা (Address / City):' : 'Institution Address / City:'}
                </label>
                <input
                  type="text"
                  value={brandingDraft.institutionAddress || ''}
                  onChange={(e) =>
                    setBrandingDraft({ ...brandingDraft, institutionAddress: e.target.value })
                  }
                  placeholder="যেমন: মতিঝিল, ঢাকা-১০০০"
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-2.5 font-bangla focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'প্রতিষ্ঠানের লোগো URL (Logo Image URL):' : 'Logo Image URL:'}
                </label>
                <input
                  type="text"
                  value={brandingDraft.logoUrl || ''}
                  onChange={(e) =>
                    setBrandingDraft({ ...brandingDraft, logoUrl: e.target.value })
                  }
                  placeholder="https://example.com/logo.png"
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'ডিফল্ট ওয়াটারমার্ক টেক্সট (Watermark Text):' : 'Default Watermark Text:'}
                </label>
                <input
                  type="text"
                  value={brandingDraft.watermarkText || ''}
                  onChange={(e) =>
                    setBrandingDraft({ ...brandingDraft, watermarkText: e.target.value })
                  }
                  placeholder="যেমন: IDEAL SCHOOL / CONFIDENTIAL"
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-2.5 uppercase focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>{isBangla ? 'ওয়াটারমার্ক অপাসিটি / ঘনত্ব (Watermark Opacity):' : 'Watermark Opacity:'}</span>
                <span className="text-blue-600 font-mono">
                  {Math.round((brandingDraft.watermarkOpacity ?? 0.08) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.25"
                step="0.01"
                value={brandingDraft.watermarkOpacity ?? 0.08}
                onChange={(e) =>
                  setBrandingDraft({
                    ...brandingDraft,
                    watermarkOpacity: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSavingBranding}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSavingBranding
                  ? isBangla
                    ? 'ক্লাউডে সেভ হচ্ছে...'
                    : 'Saving to Cloud...'
                  : isBangla
                  ? 'সব তথ্য ক্লাউডে সংরক্ষণ করুন (Save Branding)'
                  : 'Save Branding Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Classes, Subjects & Presets Management */}
      {activeTab === 'configs' && (
        <AdminConfigManager
          dynamicClasses={dynamicClasses}
          dynamicSubjects={dynamicSubjects}
          examPresets={examPresets}
          onSaveClass={onSaveClass}
          onDeleteClass={onDeleteClass}
          onSaveSubject={onSaveSubject}
          onDeleteSubject={onDeleteSubject}
          onSaveExamPreset={onSaveExamPreset}
          onDeleteExamPreset={onDeleteExamPreset}
        />
      )}

      {/* TAB 4: Notifications History */}
      {activeTab === 'notifications' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                {isBangla ? 'জিমেইল নোটিফিকেশন লগ (Recipient: ' : 'Notification Log ('}
                <span className="text-emerald-700 font-mono text-xs">{ADMIN_EMAIL}</span>)
              </h3>
              <p className="text-xs text-slate-500">
                ইউজাররা Vercel লিংক থেকে কোনো প্রশ্ন আপলোড করলে তা স্বয়ংক্রিয়ভাবে এখানে ও জিমেইলে রেকর্ড হয়
              </p>
            </div>

            <button
              onClick={refreshNotifications}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingNotifs ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              এখনো কোনো নোটিফিকেশন জমা পড়েনি।
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>{notif.title}</span>
                    </div>
                    <p className="text-slate-600">{notif.message}</p>
                    {notif.data?.questionText && (
                      <div className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200 mt-1 max-w-xl">
                        "{notif.data.questionText}..."
                      </div>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    <div>{new Date(notif.createdAt).toLocaleString('bn-BD')}</div>
                    <div className="text-emerald-600 font-semibold mt-1">প্রাপক: {notif.recipientEmail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
