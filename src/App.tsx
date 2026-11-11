import React, { useState, useEffect, useMemo } from 'react';
import {
  Question,
  QuestionPaper,
  UserProfile,
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  ActivityLogRecord,
  UserRole,
  DynamicClassItem,
  DynamicSubjectItem,
  ExamPresetItem,
  UserExamConfiguration,
} from './types';
import {
  DEFAULT_CLASSES,
  DEFAULT_SUBJECTS,
  DEFAULT_EXAM_PRESETS,
  loadDynamicClasses,
  saveDynamicClass,
  deleteDynamicClass,
  loadDynamicSubjects,
  saveDynamicSubject,
  deleteDynamicSubject,
  loadExamPresets,
  saveExamPreset,
  deleteExamPreset,
  loadUserConfigurations,
  saveUserConfiguration,
  deleteUserConfiguration,
} from './services/examConfigService';
import { AUTHENTIC_NCTB_QUESTIONS } from './data/authenticNctbQuestions';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection
} from './lib/firebase';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import {
  organizeQuestionsIntoSections,
  addQuestionsToPaperSections,
} from './services/sectionOrganizer';

// Views
import { QuestionLibraryView } from './components/QuestionLibraryView';
import { CreateQuestionPaperView } from './components/CreateQuestionPaperView';
import { ExamPaperView } from './components/ExamPaperView';
import { SettingsView } from './components/SettingsView';
import { WorkspaceMembersView } from './components/WorkspaceMembersView';
import { AdminConfigManager } from './components/AdminConfigManager';
import { AdminDashboardView } from './components/AdminDashboardView';
import { SubmitQuestionModal } from './components/SubmitQuestionModal';

// Services
import { loadWorkspaceBranding, saveWorkspaceBranding } from './services/brandingService';
import { loadSubmittedQuestions } from './services/submissionService';

// Icons
import {
  Library,
  FileText,
  Settings,
  LogOut,
  LogIn,
  Menu,
  X,
  Printer,
  User,
  PlusCircle,
  Languages,
  Shield,
  ShieldCheck,
  Layers,
  Trash2,
  Eye,
  Edit3,
  BookOpen,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  ExternalLink,
  Upload,
  GraduationCap
} from 'lucide-react';
import {
  recordPageView,
  subscribeToViewCount,
  formatBengaliNumber
} from './services/siteStatsService';

const OWNER_EMAIL = 'mdjahidulislam1025@gmail.com';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Email / Password form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Bilingual state (Bangla / English)
  const [isBangla, setIsBangla] = useState<boolean>(true);

  // Navigation & Modals
  const [activeView, setActiveView] = useState<string>('library');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submitQuestionModalOpen, setSubmitQuestionModalOpen] = useState(false);
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);

  // Live Website Visitor & View Counter State (Automatically recorded on every link open)
  const [totalViews, setTotalViews] = useState<number>(1025);

  // Workspace & RBAC State
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>({
    id: 'ws-main',
    name: 'আইডিয়াল একাডেমিক ওয়ার্কস্পেস',
    ownerId: 'owner-jahidul',
    ownerEmail: OWNER_EMAIL,
    institutionName: 'মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ',
    institutionAddress: 'মতিঝিল, ঢাকা-১০০০',
    logoUrl: '',
    watermarkText: 'IDEAL SCHOOL',
    watermarkOpacity: 0.08,
    watermarkPosition: 'diagonal',
    headerAlignment: 'center',
    fontChoice: 'bangla-serif',
    defaultLanguage: 'Bangla',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [members, setMembers] = useState<WorkspaceMember[]>([
    {
      id: 'mem-1',
      workspaceId: 'ws-main',
      userId: 'owner-jahidul',
      userEmail: OWNER_EMAIL,
      displayName: 'Md. Jahidul Islam',
      role: 'OWNER',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem-2',
      workspaceId: 'ws-main',
      userId: 'editor-kamal',
      userEmail: 'science.dept@school.edu.bd',
      displayName: 'Senior Physics Examiner',
      role: 'EDITOR',
      invitedBy: OWNER_EMAIL,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [dynamicClasses, setDynamicClasses] = useState<DynamicClassItem[]>(DEFAULT_CLASSES);
  const [dynamicSubjects, setDynamicSubjects] = useState<DynamicSubjectItem[]>(DEFAULT_SUBJECTS);
  const [examPresets, setExamPresets] = useState<ExamPresetItem[]>(DEFAULT_EXAM_PRESETS);
  const [userConfigurations, setUserConfigurations] = useState<UserExamConfiguration[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cls, subs, presets, configs] = await Promise.all([
          loadDynamicClasses(),
          loadDynamicSubjects(),
          loadExamPresets(),
          loadUserConfigurations(currentUser?.uid || 'guest'),
        ]);
        if (!mounted) return;
        setDynamicClasses(cls);
        setDynamicSubjects(subs);
        setExamPresets(presets);
        setUserConfigurations(configs);
      } catch (err) {
        console.error('Failed to load exam configurations:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([
    {
      id: 'inv-1',
      workspaceId: 'ws-main',
      email: 'examiner.math@dhaka.edu.bd',
      role: 'EDITOR',
      invitedBy: OWNER_EMAIL,
      token: 'tok-math-examiner-2026',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
  ]);

  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([
    {
      id: 'log-1',
      workspaceId: 'ws-main',
      userId: 'owner-jahidul',
      userEmail: OWNER_EMAIL,
      action: 'SYSTEM_BOOT',
      entityType: 'WORKSPACE',
      details: 'EduQuestion AI workspace initialized with NCTB curriculum.',
      createdAt: new Date().toISOString(),
    },
  ]);

  // Data Stores
  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const saved = localStorage.getItem('edu_questions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse local questions', e);
    }
    return AUTHENTIC_NCTB_QUESTIONS;
  });
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    uid: 'owner',
    email: OWNER_EMAIL,
    displayName: 'Md. Jahidul Islam',
    institutionName: 'মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ',
    institutionAddress: 'মতিঝিল, ঢাকা-১০০০',
    watermarkText: 'IDEAL SCHOOL',
    watermarkOpacity: 0.08,
    defaultLanguage: 'Bangla',
  });

  // Current editing / preview paper
  const [currentEditingPaper, setCurrentEditingPaper] = useState<QuestionPaper | null>(null);

  // Question Selector Modal state
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string>('');

  // Super admin check: ONLY mdjahidulislam1025@gmail.com has admin dashboard privileges
  const isSuperAdminOwner = currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  // Determine current active user role in workspace
  const currentUserRole: UserRole = (() => {
    if (!currentUser) return 'VIEWER';
    if (isSuperAdminOwner) return 'OWNER';
    const match = members.find((m) => m.userId === currentUser.uid || m.userEmail?.toLowerCase() === currentUser.email?.toLowerCase());
    return match?.role || 'EDITOR'; // Signed-in users can edit papers & submit questions
  })();

  const logActivity = (action: string, entityType: string, details: string) => {
    const newLog: ActivityLogRecord = {
      id: `log-${Date.now()}`,
      workspaceId: currentWorkspace.id,
      userId: currentUser?.uid || 'owner',
      userEmail: currentUser?.email || OWNER_EMAIL,
      action,
      entityType,
      details,
      createdAt: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  // Initial load
  useEffect(() => {
    testFirestoreConnection();

    // 1. Authoritative Cloud & Local Workspace Branding Load
    loadWorkspaceBranding().then((ws) => {
      setCurrentWorkspace(ws);
      setUserProfile((prev) => ({
        ...prev,
        institutionName: ws.institutionName,
        institutionAddress: ws.institutionAddress,
        logoUrl: ws.logoUrl,
        watermarkText: ws.watermarkText,
        watermarkOpacity: ws.watermarkOpacity,
      }));
    });

    // 2. Count pending user submissions for Admin Dashboard
    loadSubmittedQuestions().then((list) => {
      setPendingSubmissionsCount(list.filter((s) => s.status === 'PENDING').length);
    });

    const cachedQuestions = localStorage.getItem('edu_questions');
    const cachedPapers = localStorage.getItem('edu_papers');

    if (cachedQuestions) {
      try {
        setQuestions(JSON.parse(cachedQuestions));
      } catch (e) {
        console.error(e);
      }
    } else {
      const initialSeed: Question[] = [
        {
          id: 'seed-phy-cq1',
          classLevel: 'Class 10',
          subject: 'Physics',
          chapter: 'কাজ, ক্ষমতা ও শক্তি',
          questionType: 'CQ',
          questionText: 'পদার্থবিজ্ঞান সৃজনশীল উদ্দীপক',
          stimulus: '৫০ কেজি ভরের একজন দৌড়বিদ স্থির অবস্থা থেকে ২ ms⁻² সুষম ত্বরণে ১০ সেকেন্ড দৌড়ালেন। এরপর তিনি একটি ৬০ মিটার উঁচু পাহাড়ে ৫ মিনিটে উঠলেন। [g = 9.8 ms⁻²]',
          cqParts: {
            partA: { question: 'ক. কর্মদক্ষতা কাকে বলে?', marks: 1, answer: 'লভ্য কার্যকর শক্তি ও মোট প্রদত্ত শক্তির অনুপাত।' },
            partB: { question: 'খ. চলন্ত বাস হঠাৎ ব্রেক কষলে যাত্রীরা সামনের দিকে ঝুঁকে পড়েন কেন?', marks: 2, answer: 'গতি জড়তার কারণে।' },
            partC: { question: 'গ. দৌড় শুরুর ১০ সেকেন্ড পর দৌড়বিদের গতিশক্তি নির্ণয় করো।', marks: 3, answer: 'গতিশক্তি Ek = 10,000 J = 10 kJ।' },
            partD: { question: 'ঘ. পাহাড়ে ওঠার ক্ষেত্রে দৌড়বিদের ব্যয়িত ক্ষমতা গাণিতিকভাবে বিশ্লেষণ করো।', marks: 4, answer: 'ব্যয়িত ক্ষমতা P = 98 Watt।' },
          },
          marks: 10,
          difficulty: 'Medium',
          sourceType: 'BOARD_EXAM',
          sourceVerificationStatus: 'Verified',
          isFavorite: true,
          boardInfo: { boardName: 'Dhaka Board', year: '2024', examType: 'SSC Exam', isVerified: true },
          createdAt: new Date().toISOString(),
        },
      ];
      setQuestions(initialSeed);
      localStorage.setItem('edu_questions', JSON.stringify(initialSeed));
    }

    if (cachedPapers) {
      try {
        setPapers(JSON.parse(cachedPapers));
      } catch (e) {
        console.error(e);
      }
    } else {
      const initialPaper: QuestionPaper = {
        id: 'paper-ssc-pretest-2026',
        ownerId: 'owner',
        title: 'প্রাক-নির্বাচনী পরীক্ষা ২০২৬ (Pre-Test Examination)',
        institutionName: 'মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ',
        institutionAddress: 'মতিঝিল, ঢাকা-১০০০',
        classLevel: 'Class 10',
        subject: 'পদার্থবিজ্ঞান (Physics)',
        subjectCode: '136',
        totalMarks: 70,
        duration: '২ ঘণ্টা ৩০ মিনিট',
        examDate: '১৫/১১/২০২৬',
        instructions: [
          '১. ডান পাশের সংখ্যা প্রশ্নের পূর্ণমান নির্দেশক।',
          '২. ক-বিভাগ থেকে অন্তত ২টি এবং খ-বিভাগ থেকে অন্তত ২টি করে মোট ৭টি সৃজনশীল প্রশ্নের উত্তর দাও।',
        ],
        watermarkText: 'IDEAL SCHOOL',
        watermarkOpacity: 0.08,
        sections: [
          {
            id: 'sec-1',
            titleBn: 'ক-বিভাগ: সৃজনশীল প্রশ্ন (বল, গতি ও শক্তি)',
            titleEn: 'Section A: Creative Questions',
            instructions: 'যেকোনো ৪টি প্রশ্নের উত্তর দাও। প্রতিটির মান ১০।',
            questions: [
              {
                id: 'paper-q1',
                classLevel: 'Class 10',
                subject: 'Physics',
                chapter: 'কাজ, ক্ষমতা ও শক্তি',
                questionType: 'CQ',
                questionText: 'পদার্থবিজ্ঞান সৃজনশীল উদ্দীপক',
                stimulus: '৫০ কেজি ভরের একজন দৌড়বিদ স্থির অবস্থা থেকে ২ ms⁻² সুষম ত্বরণে ১০ সেকেন্ড দৌড়ালেন। এরপর তিনি একটি ৬০ মিটার উঁচু পাহাড়ে ৫ মিনিটে উঠলেন। [g = 9.8 ms⁻²]',
                cqParts: {
                  partA: { question: 'ক. কর্মদক্ষতা কাকে বলে?', marks: 1, answer: 'লভ্য কার্যকর শক্তি ও মোট প্রদত্ত শক্তির অনুপাত।' },
                  partB: { question: 'খ. চলন্ত বাস হঠাৎ ব্রেক কষলে যাত্রীরা সামনের দিকে ঝুঁকে পড়েন কেন?', marks: 2, answer: 'গতি জড়তার কারণে।' },
                  partC: { question: 'গ. দৌড় শুরুর ১০ সেকেন্ড পর দৌড়বিদের গতিশক্তি নির্ণয় করো।', marks: 3, answer: 'গতিশক্তি Ek = 10,000 J = 10 kJ।' },
                  partD: { question: 'ঘ. পাহাড়ে ওঠার ক্ষেত্রে দৌড়বিদের ব্যয়িত ক্ষমতা গাণিতিকভাবে বিশ্লেষণ করো।', marks: 4, answer: 'ব্যয়িত ক্ষমতা P = 98 Watt।' },
                },
                marks: 10,
                difficulty: 'Medium',
                sourceType: 'BOARD_EXAM',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
      };
      setPapers([initialPaper]);
      setCurrentEditingPaper(initialPaper);
      localStorage.setItem('edu_papers', JSON.stringify([initialPaper]));
    }

    // Handle redirect result if user returned from Google redirect sign-in (mobile browsers)
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          setCurrentUser(result.user);
          setShowAuthModal(false);
          setAuthLoading(false);
          logActivity('USER_LOGIN', 'AUTH', `User ${result.user.email} signed in via Google redirect.`);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in error:', err);
        setAuthError(formatAuthError(err));
      });

    // Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        logActivity('USER_LOGIN', 'AUTH', `User ${user.email} signed in.`);
      }
    });

    // Record page view automatically whenever this website link is opened
    recordPageView().then((count) => {
      setTotalViews(count);
    });

    const unsubscribeViews = subscribeToViewCount((count) => {
      setTotalViews(count);
    });

    return () => {
      unsubscribe();
      unsubscribeViews();
    };
  }, []);

  // In-app browser detection (Facebook/Messenger/Instagram/WhatsApp webview)
  const isInAppBrowser = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    return /FBAN|FBAV|Instagram|Line|Twitter|MicroMessenger|musical_ly/i.test(ua);
  }, []);

  // Format auth errors with Bengali explanations and exact domain guidance
  const formatAuthError = (err: any): string => {
    const code = (err?.code || '').toLowerCase();
    const msg = (err?.message || '').toLowerCase();
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

    if (code.includes('unauthorized-domain') || msg.includes('unauthorized-domain')) {
      return `ডোমেইন অনুমোদিত নয় (auth/unauthorized-domain): আপনি বর্তমানে "${currentHost}" ডোমেইনে আছেন। Firebase Console (Project: kinetic-campus-9qk4z) -> Authentication -> Settings -> Authorized Domains-এ গিয়ে "${currentHost}" ডোমেইনটি যুক্ত (Add Domain) করুন। অথবা নিচে "অফলাইন এডমিন হিসেবে প্রবেশ" বাটনে ক্লিক করে কাজ চালিয়ে যান।`;
    }
    if (code.includes('popup-blocked') || msg.includes('popup-blocked')) {
      return 'মোবাইল ব্রাউজারে পপ-আপ উইন্ডো ব্লক করা হয়েছে। দয়া করে নিচের "মোবাইলে Redirect দিয়ে লগইন" বাটনে চাপুন অথবা ব্রাউজারের পপ-আপ চালু করুন।';
    }
    if (
      code.includes('popup-closed-by-user') ||
      code.includes('cancelled-popup-request') ||
      msg.includes('popup-closed-by-user') ||
      msg.includes('cancelled-popup-request')
    ) {
      return 'গুগল সাইন-ইন উইন্ডোটি সম্পন্ন হওয়ার আগেই বন্ধ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
    }
    if (code.includes('disallowed_useragent') || msg.includes('disallowed_useragent')) {
      return 'এই ব্রাউজারটি (যেমন Messenger বা Facebook WebView) গুগল লগইন সাপোর্ট করে না। দয়া করে উপরে ডানদিকের তিনটি ডটে (⋮) ক্লিক করে "Open in Chrome" বা "Open in Safari" দিয়ে ওপেন করুন।';
    }
    if (code.includes('email-already-in-use') || msg.includes('email-already-in-use')) {
      return `এই ইমেইলটিতে (${authEmail}) ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে! নিচে "Already registered? Sign In" মোড অন করা হয়েছে। অনুগ্রহ করে পাসওয়ার্ড দিয়ে সাইন-ইন করুন অথবা "Continue with Google" ব্যবহার করুন।`;
    }
    if (
      code.includes('invalid-credential') ||
      code.includes('wrong-password') ||
      msg.includes('invalid-credential') ||
      msg.includes('wrong-password')
    ) {
      return 'ভুল পাসওয়ার্ড অথবা এই ইমেইলে এখনো পাসওয়ার্ড সেট করা হয়নি। আপনি যদি পূর্বে গুগল দিয়ে অ্যাকাউন্ট খুলে থাকেন, তবে "Continue with Google" দিয়ে লগইন করুন অথবা নিচে "পাসওয়ার্ড সেট / রিসেট করুন" বাটনে চাপুন।';
    }
    if (code.includes('user-not-found') || msg.includes('user-not-found')) {
      return 'এই ইমেইলে কোনো পাসওয়ার্ড অ্যাকাউন্ট পাওয়া যায়নি। আপনি যদি গুগল দিয়ে অ্যাকাউন্ট খুলে থাকেন, তবে "Continue with Google" বাটনে ক্লিক করুন।';
    }
    if (code.includes('network-request-failed') || msg.includes('network-request-failed')) {
      return 'ইন্টারনেট সংযোগে সমস্যা দেখা দিয়েছে। আপনার মোবাইলের ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।';
    }
    return err?.message || 'Authentication failed. Please try again.';
  };

  // Save changes helper
  const handleSaveQuestions = (updated: Question[]) => {
    setQuestions(updated);
    localStorage.setItem('edu_questions', JSON.stringify(updated));
  };

  const handleSavePapers = (updated: QuestionPaper[]) => {
    setPapers(updated);
    localStorage.setItem('edu_papers', JSON.stringify(updated));
  };

  const handleUpdateWorkspaceBranding = async (updates: Partial<Workspace>) => {
    const updated = await saveWorkspaceBranding(updates);
    setCurrentWorkspace(updated);
    setUserProfile((prev) => ({
      ...prev,
      institutionName: updated.institutionName,
      institutionAddress: updated.institutionAddress,
      logoUrl: updated.logoUrl,
      watermarkText: updated.watermarkText,
      watermarkOpacity: updated.watermarkOpacity,
      defaultLanguage: updated.defaultLanguage || prev.defaultLanguage,
    }));
    logActivity('UPDATE_BRANDING', 'WORKSPACE', 'Updated institutional branding & watermarks in Cloud & Local.');
  };

  // Google Login (with mobile popup fallback & redirect support)
  const handleGoogleSignIn = async (useRedirect = false) => {
    setAuthError(null);
    setResetSuccess(null);
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // If user chooses redirect, or is inside in-app browser on mobile
      if (useRedirect || (isMobile && isInAppBrowser)) {
        await signInWithRedirect(auth, provider);
        return;
      }

      try {
        const result = await signInWithPopup(auth, provider);
        setCurrentUser(result.user);
        setShowAuthModal(false);
      } catch (popupErr: any) {
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/cancelled-popup-request'
        ) {
          // Automatic fallback to redirect for mobile devices where popup was blocked
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }
    } catch (err: any) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  // Send Password Reset / Setup Email
  const handleSendPasswordReset = async () => {
    if (!authEmail.trim()) {
      setAuthError('পাসওয়ার্ড সেট বা রিসেট লিংক পেতে অনুগ্রহ করে Email ঘরে আপনার ইমেইলটি লিখুন।');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setResetSuccess(null);
    try {
      await sendPasswordResetEmail(auth, authEmail.trim());
      setResetSuccess(`আপনার (${authEmail.trim()}) ইমেইলে একটি পাসওয়ার্ড সেট/রিসেট লিংক পাঠানো হয়েছে! ইনবক্স চেক করে পাসওয়ার্ড সেট করে নিন।`);
    } catch (err: any) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  // Email / Password Auth
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setResetSuccess(null);
    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        const res = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        setCurrentUser(res.user);
      } else {
        try {
          const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
          setCurrentUser(res.user);
        } catch (signUpErr: any) {
          const isEmailInUse =
            signUpErr?.code === 'auth/email-already-in-use' ||
            signUpErr?.message?.includes('email-already-in-use');

          if (isEmailInUse) {
            setAuthMode('signin');
            try {
              // Attempt to sign in directly with the provided password
              const signInRes = await signInWithEmailAndPassword(auth, authEmail, authPassword);
              setCurrentUser(signInRes.user);
            } catch {
              setAuthError(
                `এই ইমেইলটি (${authEmail}) ইতিমধ্যে নিবন্ধিত আছে। মোডটি পরিবর্তন করে "Sign In" করা হয়েছে। অনুগ্রহ করে আপনার পাসওয়ার্ড দিয়ে লগইন করুন অথবা "Continue with Google" বাটনে চাপুন।`
              );
              return;
            }
          } else {
            throw signUpErr;
          }
        }
      }
      setShowAuthModal(false);
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  // Workspace Actions
  const handleInviteMember = (email: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER') => {
    const newInvitation: WorkspaceInvitation = {
      id: `inv-${Date.now()}`,
      workspaceId: currentWorkspace.id,
      email,
      role,
      invitedBy: currentUser?.email || OWNER_EMAIL,
      token: `inv-tok-${Math.random().toString(36).substr(2, 8)}`,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    setInvitations((prev) => [newInvitation, ...prev]);
    logActivity('INVITE_MEMBER', 'WORKSPACE', `Invited ${email} as ${role}.`);
  };

  const handleChangeMemberRole = (memberId: string, newRole: UserRole) => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    logActivity('CHANGE_ROLE', 'MEMBER', `Changed member role to ${newRole}.`);
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    logActivity('REMOVE_MEMBER', 'MEMBER', `Removed member ${memberId}.`);
  };

  const handleTransferOwnership = (targetUserId: string) => {
    const target = members.find((m) => m.userId === targetUserId);
    if (!target) return;

    setCurrentWorkspace((prev) => ({
      ...prev,
      ownerId: target.userId,
      ownerEmail: target.userEmail,
    }));

    setMembers((prev) =>
      prev.map((m) => {
        if (m.userId === targetUserId) return { ...m, role: 'OWNER' };
        if (m.role === 'OWNER') return { ...m, role: 'ADMIN' };
        return m;
      })
    );
    logActivity('TRANSFER_OWNERSHIP', 'WORKSPACE', `Transferred ownership to ${target.userEmail}.`);
  };

  // Question & Paper handlers
  const handleAddQuestionToLibrary = (q: Question) => {
    const exists = questions.some((item) => item.id === q.id);
    let updated: Question[];
    if (exists) {
      updated = questions.map((item) => (item.id === q.id ? q : item));
    } else {
      updated = [q, ...questions];
    }
    handleSaveQuestions(updated);
    logActivity('SAVE_QUESTION', 'QUESTION', `Saved question: ${q.questionType} for ${q.subject}.`);
  };

  const handleAddQuestionToActivePaper = (q: Question) => {
    handleBulkAddQuestionsToActivePaper([q]);
  };

  const handleBulkAddQuestionsToActivePaper = (newQs: Question[]) => {
    if (!newQs || newQs.length === 0) return;

    if (!currentEditingPaper) {
      const initialSections = organizeQuestionsIntoSections(newQs);
      const totalMarks = newQs.reduce((sum, item) => sum + (Number(item.marks) || 0), 0);
      const primarySubject = newQs[0]?.subject || 'Physics';
      const primaryClass = newQs[0]?.classLevel || 'SSC';

      const newPaper: QuestionPaper = {
        id: `paper-${Date.now()}`,
        ownerId: currentUser?.uid || 'owner',
        title: `${primarySubject} পরীক্ষা পত্র ২০২৬`,
        institutionName: currentWorkspace.institutionName || 'বাংলাদেশ মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড',
        institutionAddress: currentWorkspace.institutionAddress,
        classLevel: primaryClass,
        subject: primarySubject,
        subjectCode: '100',
        totalMarks: totalMarks,
        duration: '২ ঘণ্টা ৩০ মিনিট',
        instructions: ['১. ডান পাশের সংখ্যা প্রশ্নের পূর্ণমান নির্দেশক।', '২. প্রতিটি বিভাগের নির্দেশনা অনুযায়ী উত্তর দাও।'],
        watermarkText: currentWorkspace.watermarkText,
        watermarkOpacity: currentWorkspace.watermarkOpacity,
        sections: initialSections,
        createdAt: new Date().toISOString(),
      };
      setCurrentEditingPaper(newPaper);
      handleSavePapers([newPaper, ...papers]);
      logActivity('ADD_TO_PAPER', 'PAPER', `Created paper with ${newQs.length} questions organized into separate sections.`);
      return;
    }

    const updatedSections = addQuestionsToPaperSections(currentEditingPaper.sections, newQs);
    const allQuestions = updatedSections.flatMap((s) => s.questions || []);
    const calculatedTotalMarks = allQuestions.reduce((sum, item) => sum + (Number(item.marks) || 0), 0);

    const updatedPaper: QuestionPaper = {
      ...currentEditingPaper,
      sections: updatedSections,
      totalMarks: calculatedTotalMarks,
      updatedAt: new Date().toISOString(),
    };

    setCurrentEditingPaper(updatedPaper);
    handleSavePapers(papers.map((p) => (p.id === updatedPaper.id ? updatedPaper : p)));
    logActivity('ADD_TO_PAPER', 'PAPER', `Added ${newQs.length} questions into distinct sections for ${currentEditingPaper.title}.`);
  };

  const handleSaveActivePaper = async (paper: QuestionPaper) => {
    setCurrentEditingPaper(paper);
    const exists = papers.some((p) => p.id === paper.id);
    let updatedPapers: QuestionPaper[];
    if (exists) {
      updatedPapers = papers.map((p) => (p.id === paper.id ? paper : p));
    } else {
      updatedPapers = [paper, ...papers];
    }
    handleSavePapers(updatedPapers);

    if (currentUser) {
      try {
        await setDoc(doc(db, 'question_papers', paper.id), {
          ...paper,
          ownerId: currentUser.uid,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `question_papers/${paper.id}`);
      }
    }
    logActivity('SAVE_PAPER', 'PAPER', `Saved examination paper ${paper.title}.`);
  };

  const handleCreateNewPaper = () => {
    const freshPaper: QuestionPaper = {
      id: `paper-${Date.now()}`,
      ownerId: currentUser?.uid || 'owner',
      title: isBangla ? 'নতুন পরীক্ষা পত্র ২০২৬' : 'New Examination Paper 2026',
      institutionName: currentWorkspace.institutionName,
      institutionAddress: currentWorkspace.institutionAddress,
      classLevel: 'Class 10',
      subject: 'পদার্থবিজ্ঞান',
      subjectCode: '136',
      totalMarks: 70,
      duration: '২ ঘণ্টা ৩০ মিনিট',
      instructions: [
        '১. ডান পাশের সংখ্যা প্রশ্নের পূর্ণমান নির্দেশক।',
        '২. যেকোনো ৭টি প্রশ্নের উত্তর দাও।',
      ],
      watermarkText: currentWorkspace.watermarkText,
      watermarkOpacity: currentWorkspace.watermarkOpacity,
      sections: [
        {
          id: `sec-${Date.now()}-1`,
          titleBn: 'ক-বিভাগ: সৃজনশীল প্রশ্ন',
          titleEn: 'Section A: Creative Questions',
          instructions: 'প্রতিটি প্রশ্নের মান ১০।',
          questions: [],
        },
      ],
      createdAt: new Date().toISOString(),
    };
    setCurrentEditingPaper(freshPaper);
    handleSavePapers([freshPaper, ...papers]);
    setActiveView('create-paper');
  };

  // Only and exclusively mdjahidulislam1025@gmail.com can see and access the Admin Dashboard
  const isUserAdminOrOwner = isSuperAdminOwner;

  const navigationItems = [
    { id: 'library', label: 'Question Bank', labelBn: 'প্রশ্ন ব্যাংক', icon: Library },
    { id: 'create-paper', label: 'Create Question Paper', labelBn: 'প্রশ্নপত্র তৈরি করুন', icon: Layers },
    { id: 'saved-papers', label: 'Saved Question Papers', labelBn: 'সংরক্ষিত প্রশ্নপত্র', icon: FileText },
    ...(isUserAdminOrOwner
      ? [
          {
            id: 'admin-dashboard',
            label: 'Admin Dashboard',
            labelBn: 'অ্যাডমিন ড্যাশবোর্ড',
            icon: ShieldCheck,
            badge: pendingSubmissionsCount > 0 ? pendingSubmissionsCount : undefined,
          },
        ]
      : []),
    { id: 'profile', label: 'My Profile', labelBn: 'আমার প্রোফাইল', icon: User },
    { id: 'settings', label: 'Settings', labelBn: 'সেটিংস', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900">
      {/* Top Navbar */}
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => setActiveView('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <BookOpen className="w-5 h-5 text-cyan-200" />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">
                  EduQuestion <span className="text-blue-600 font-extrabold">AI</span>
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-extrabold tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  SSC ONLY • বাংলাদেশ শিক্ষাবোর্ড
                </span>
              </div>
            </div>

            {/* Creator Attribution Badge in Desktop Header */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-full text-[11px] font-semibold text-slate-700 shadow-2xs">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Created by <strong className="text-blue-900 font-bold">JAHIDUL ISLAM</strong> • IIT, University of Dhaka
              </span>
            </div>
          </div>

          {/* Right Controls: View Counter, Language Switcher, Action, Role, Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Website View Counter (Automatically tracked on every link open) */}
            <div
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-800 shadow-2xs select-none"
              title={isBangla ? 'ওয়েবসাইট লিংক ওপেন করলেই ভিউ স্বয়ংক্রিয়ভাবে যুক্ত হয়' : 'Website views automatically recorded on link open'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] font-extrabold text-slate-900">
                {isBangla ? `ভিউ: ${formatBengaliNumber(totalViews)}` : `Views: ${totalViews.toLocaleString()}`}
              </span>
            </div>

            {/* Bilingual Toggle Button (BN / EN) */}
            <button
              onClick={() => setIsBangla(!isBangla)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 text-slate-700 transition-colors"
              title="Toggle Language / ভাষা পরিবর্তন করুন"
            >
              <Languages className="w-3.5 h-3.5 text-blue-600" />
              <span className={isBangla ? 'text-blue-700 font-black' : 'text-slate-400'}>বাং</span>
              <span className="text-slate-300">/</span>
              <span className={!isBangla ? 'text-blue-700 font-black' : 'text-slate-400'}>EN</span>
            </button>

            {/* Public Upload Question Button (Available for all visitors & Vercel users) */}
            <button
              onClick={() => setSubmitQuestionModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-emerald-600/20"
              title="নতুন প্রশ্ন আপলোড করুন (এডমিনকে নোটিফাই করা হবে)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isBangla ? 'প্রশ্ন আপলোড করুন' : 'Upload Question'}</span>
            </button>

            <button
              onClick={handleCreateNewPaper}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {isBangla ? 'নতুন পরীক্ষা পত্র' : 'New Exam Paper'}
            </button>

            {currentEditingPaper && (
              <button
                onClick={() => setActiveView('preview')}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                {isBangla ? 'প্রিন্ট / PDF' : 'Print A4'}
              </button>
            )}

            {/* Auth / Profile Area */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.displayName || 'Authorized Member'}
                  </div>
                  <div className="text-[10px] text-blue-600 font-semibold leading-tight flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" /> {currentUserRole}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                {isBangla ? 'লগইন' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sub-Header Banner with Creator Attribution & Views */}
      <div className="no-print lg:hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white px-3 py-1.5 text-[11px] flex items-center justify-between border-b border-indigo-900/50 shadow-inner">
        <div className="flex items-center gap-1.5 truncate">
          <GraduationCap className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
          <span className="truncate">
            Created by <strong className="text-white font-bold">JAHIDUL ISLAM</strong> • IIT, University of Dhaka
          </span>
        </div>
        <div
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-cyan-200 text-[10px] font-bold shrink-0"
          title="ওয়েবসাইট লিংক ওপেন করলেই ভিউ স্বয়ংক্রিয়ভাবে যুক্ত হয়"
        >
          <Eye className="w-3 h-3 text-cyan-300" />
          <span>{formatBengaliNumber(totalViews)} ভিউ</span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="no-print hidden lg:block w-64 shrink-0">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs sticky top-24 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>{isBangla ? 'নেভিগেশন মেনু' : 'Exam Suite Menu'}</span>
              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                {currentUserRole}
              </span>
            </div>

            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const badge = (item as any).badge;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="flex-1 text-left truncate">
                    {isBangla ? item.labelBn : item.label}
                  </span>
                  {badge !== undefined && badge > 0 && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                        isActive ? 'bg-white text-blue-700' : 'bg-amber-500 text-white shadow-xs'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Quick Stats Widget */}
            <div className="pt-3 mt-3 border-t border-slate-100 px-3 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-500">
                <span>{isBangla ? 'সংরক্ষিত প্রশ্ন:' : 'Saved Questions:'}</span>
                <span className="font-bold text-slate-800">{questions.length}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{isBangla ? 'পরীক্ষা পত্র:' : 'Exam Papers:'}</span>
                <span className="font-bold text-blue-700">{papers.length}</span>
              </div>
            </div>

            {/* Creator Attribution & Interactive Live View Counter Widget */}
            <div className="pt-3 mt-3 border-t border-slate-100 space-y-2.5">
              {/* Automatic Live View Counter Display */}
              <div
                className="w-full text-left p-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/50 shadow-2xs"
                title="ওয়েবসাইট লিংক ওপেন করলেই ভিউ স্বয়ংক্রিয়ভাবে কাউন্ট হয়"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wide text-blue-700 uppercase">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    {isBangla ? 'ওয়েবসাইট ভিউ' : 'Live Site Views'}
                  </div>
                  <span className="text-[9px] text-emerald-700 font-extrabold bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full">
                    স্বয়ংক্রিয়
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>{formatBengaliNumber(totalViews)}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {isBangla ? 'জন দেখেছেন' : 'total visitors'}
                  </span>
                </div>
              </div>

              {/* Creator Attribution Card */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xs">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[10px] uppercase tracking-wider mb-1">
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                  <span>Created by</span>
                </div>
                <div className="font-extrabold text-white text-xs tracking-tight">
                  JAHIDUL ISLAM
                </div>
                <div className="text-[11px] text-slate-300 font-medium mt-0.5">
                  IIT, University of Dhaka
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="no-print lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full p-5 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-base">EduQuestion AI</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    const badge = (item as any).badge;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveView(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1 text-left">{isBangla ? item.labelBn : item.label}</span>
                        {badge !== undefined && badge > 0 && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                              isActive ? 'bg-white text-blue-700' : 'bg-amber-500 text-white'
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Drawer Footer: View Counter & Creator Attribution */}
              <div className="pt-4 border-t border-slate-100 space-y-2 mt-4">
                <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>{isBangla ? 'ওয়েবসাইট ভিউ:' : 'Site Views:'}</span>
                  </div>
                  <span className="font-black text-sm">{formatBengaliNumber(totalViews)}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 text-white text-[11px]">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[10px] uppercase">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Created by</span>
                  </div>
                  <div className="font-extrabold text-white text-xs mt-0.5">JAHIDUL ISLAM</div>
                  <div className="text-[10px] text-slate-300">IIT, University of Dhaka</div>
                </div>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Dynamic Center Main Area */}
        <main className="flex-1 min-w-0">
          {activeView === 'library' && (
            <QuestionLibraryView
              questions={questions}
              currentUserRole={currentUserRole}
              isBangla={isBangla}
              dynamicClasses={dynamicClasses}
              dynamicSubjects={dynamicSubjects}
              onAddQuestion={(newQ) => {
                const updated = [newQ, ...questions];
                handleSaveQuestions(updated);
                logActivity('ADD_QUESTION', 'QUESTION', `Added question ${newQ.id}`);
              }}
              onUpdateQuestion={(q) => {
                const updated = questions.map((item) => (item.id === q.id ? q : item));
                handleSaveQuestions(updated);
                logActivity('UPDATE_QUESTION', 'QUESTION', `Updated question: ${q.id}`);
              }}
              onDeleteQuestion={(id) => {
                const updated = questions.filter((item) => item.id !== id);
                handleSaveQuestions(updated);
                logActivity('DELETE_QUESTION', 'QUESTION', `Deleted question: ${id}`);
              }}
              onAddToPaper={(q) => {
                handleAddQuestionToActivePaper(q);
                setActiveView('create-paper');
              }}
              onBulkAddToPaper={(selected) => {
                handleBulkAddQuestionsToActivePaper(selected);
                setActiveView('create-paper');
              }}
            />
          )}

          {activeView === 'create-paper' && (
            currentEditingPaper ? (
              <CreateQuestionPaperView
                questions={questions}
                paper={currentEditingPaper}
                isBangla={isBangla}
                dynamicClasses={dynamicClasses}
                dynamicSubjects={dynamicSubjects}
                examPresets={examPresets}
                userConfigurations={userConfigurations}
                onSavePaper={handleSaveActivePaper}
                onPreviewPaper={(updatedPaper) => {
                  setCurrentEditingPaper(updatedPaper);
                  setActiveView('preview');
                }}
                onAddCustomSubject={async (sub) => {
                  await saveDynamicSubject(sub);
                  setDynamicSubjects((prev) => [...prev, sub]);
                }}
                onAddCustomExamPreset={async (preset) => {
                  await saveExamPreset(preset);
                  setExamPresets((prev) => [...prev, preset]);
                }}
                onSaveUserConfig={async (cfg) => {
                  await saveUserConfiguration(cfg);
                  setUserConfigurations((prev) => [cfg, ...prev.filter((c) => c.id !== cfg.id)]);
                }}
                onDeleteUserConfig={async (id) => {
                  await deleteUserConfiguration(id);
                  setUserConfigurations((prev) => prev.filter((c) => c.id !== id));
                }}
              />
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800 text-base mb-1">
                  {isBangla ? 'কোনো পরীক্ষা পত্র নির্বাচিত নেই' : 'No Examination Paper Selected'}
                </h3>
                <button
                  onClick={handleCreateNewPaper}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 mt-3"
                >
                  <PlusCircle className="w-4 h-4" /> {isBangla ? 'নতুন পরীক্ষা পত্র তৈরি করুন' : 'Create New Paper'}
                </button>
              </div>
            )
          )}

          {activeView === 'preview' && (
            currentEditingPaper ? (
              <div className="space-y-4">
                <div className="no-print flex items-center justify-between">
                  <button
                    onClick={() => setActiveView('create-paper')}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
                  >
                    ← {isBangla ? 'এডিটরে ফিরে যান' : 'Back to Paper Editor'}
                  </button>
                </div>
                <ExamPaperView paper={currentEditingPaper} />
              </div>
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                <Printer className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800 text-base mb-1">
                  {isBangla ? 'প্রিন্ট করার মতো কোনো পত্র নেই' : 'No Paper Ready to Print'}
                </h3>
                <button
                  onClick={handleCreateNewPaper}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 mt-2"
                >
                  <PlusCircle className="w-4 h-4" /> {isBangla ? 'পরীক্ষা পত্র তৈরি করুন' : 'Create Paper'}
                </button>
              </div>
            )
          )}

          {activeView === 'saved-papers' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                    {isBangla ? 'সংরক্ষিত প্রশ্নপত্র (Saved Question Papers)' : 'Saved Question Papers'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {isBangla
                      ? `মোট ${papers.length}টি সংরক্ষিত এসএসসি প্রশ্নপত্র`
                      : `${papers.length} saved SSC examination papers`}
                  </p>
                </div>
                <button
                  onClick={handleCreateNewPaper}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  {isBangla ? 'নতুন প্রশ্নপত্র তৈরি করুন' : 'Create New Paper'}
                </button>
              </div>

              {papers.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-700">
                    {isBangla ? 'কোনো সংরক্ষিত প্রশ্নপত্র নেই' : 'No saved question papers yet'}
                  </h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {papers.map((p) => {
                    const qCount = p.sections.reduce((acc, s) => acc + s.questions.length, 0);
                    return (
                      <div
                        key={p.id}
                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-4 hover:border-blue-300 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1">
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              SSC • {p.subject}
                            </span>
                            <span>{p.examDate || '২০২৬'}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-base">{p.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{p.institutionName}</p>
                          <div className="flex items-center gap-3 mt-3 text-xs font-semibold text-slate-700">
                            <span>{isBangla ? `প্রশ্ন: ${qCount}টি` : `Questions: ${qCount}`}</span>
                            <span>•</span>
                            <span>{isBangla ? `পূর্ণমান: ${p.totalMarks}` : `Total Marks: ${p.totalMarks}`}</span>
                            <span>•</span>
                            <span>{p.duration}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setCurrentEditingPaper(p);
                              setActiveView('create-paper');
                            }}
                            className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> {isBangla ? 'সম্পাদনা' : 'Edit'}
                          </button>
                          <button
                            onClick={() => {
                              setCurrentEditingPaper(p);
                              setActiveView('preview');
                            }}
                            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> {isBangla ? 'প্রিভিউ ও PDF' : 'Preview & PDF'}
                          </button>
                          <button
                            onClick={() => {
                              const updated = papers.filter((item) => item.id !== p.id);
                              handleSavePapers(updated);
                              if (currentEditingPaper?.id === p.id) {
                                setCurrentEditingPaper(updated[0] || null);
                              }
                            }}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-rose-600"
                            title="Delete Paper"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeView === 'admin-dashboard' && (
            isSuperAdminOwner ? (
              <AdminDashboardView
                allQuestions={questions}
                allPapers={papers}
                workspace={currentWorkspace}
                dynamicClasses={dynamicClasses}
                dynamicSubjects={dynamicSubjects}
                examPresets={examPresets}
                isBangla={isBangla}
                onQuestionApproved={(q) => {
                  handleAddQuestionToLibrary(q);
                  loadSubmittedQuestions().then((list) => {
                    setPendingSubmissionsCount(list.filter((s) => s.status === 'PENDING').length);
                  });
                }}
                onUpdateWorkspace={async (ws) => {
                  await handleUpdateWorkspaceBranding(ws);
                }}
                onSaveClass={async (cls) => {
                  await saveDynamicClass(cls);
                  setDynamicClasses((prev) => {
                    const exists = prev.some((c) => c.id === cls.id);
                    return exists ? prev.map((c) => (c.id === cls.id ? cls : c)) : [...prev, cls];
                  });
                }}
                onDeleteClass={async (id) => {
                  await deleteDynamicClass(id);
                  setDynamicClasses((prev) => prev.filter((c) => c.id !== id));
                }}
                onSaveSubject={async (sub) => {
                  await saveDynamicSubject(sub);
                  setDynamicSubjects((prev) => {
                    const exists = prev.some((s) => s.id === sub.id);
                    return exists ? prev.map((s) => (s.id === sub.id ? sub : s)) : [...prev, sub];
                  });
                }}
                onDeleteSubject={async (id) => {
                  await deleteDynamicSubject(id);
                  setDynamicSubjects((prev) => prev.filter((s) => s.id !== id));
                }}
                onSaveExamPreset={async (ex) => {
                  await saveExamPreset(ex);
                  setExamPresets((prev) => [...prev, ex]);
                }}
                onDeleteExamPreset={async (id) => {
                  await deleteExamPreset(id);
                  setExamPresets((prev) => prev.filter((e) => e.id !== id));
                }}
              />
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-rose-200 max-w-xl mx-auto shadow-xs">
                <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 text-lg mb-1">
                  {isBangla ? 'অ্যাডমিন অনুমতি প্রয়োজন' : 'Admin Access Restricted'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {isBangla
                    ? `এই ড্যাশবোর্ডটি শুধুমাত্র প্রধান অ্যাডমিন (${OWNER_EMAIL}) এর জন্য সংরক্ষিত। আপনি প্রশ্ন ব্যাংক ব্রাউজ করতে পারেন অথবা নতুন প্রশ্ন আপলোড করতে পারেন।`
                    : `This control panel is strictly restricted to ${OWNER_EMAIL}. You can browse questions or upload questions.`}
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setActiveView('library')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                  >
                    {isBangla ? 'প্রশ্ন ব্যাংকে ফিরে যান' : 'Back to Question Bank'}
                  </button>
                  <button
                    onClick={() => setSubmitQuestionModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> {isBangla ? 'প্রশ্ন আপলোড করুন' : 'Upload Question'}
                  </button>
                </div>
              </div>
            )
          )}

          {activeView === 'profile' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-2xl">
                  {currentUser?.displayName ? currentUser.displayName[0] : (userProfile.displayName || 'U')[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {currentUser?.displayName || userProfile.displayName}
                  </h2>
                  <p className="text-xs text-slate-500">{currentUser?.email || userProfile.email}</p>
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                    <Shield className="w-3 h-3" /> Role: {isSuperAdminOwner ? 'OWNER / SUPER ADMIN' : 'TEACHER / CONTRIBUTOR'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Institution Name</div>
                  <div className="font-bold text-slate-800 mt-1 text-sm">{userProfile.institutionName}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Institution Address</div>
                  <div className="font-bold text-slate-800 mt-1 text-sm">{userProfile.institutionAddress || 'Dhaka, Bangladesh'}</div>
                </div>
              </div>

              <div className="pt-2">
                {currentUser ? (
                  <button
                    onClick={handleSignOut}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" /> Sign In with Google / Email
                  </button>
                )}
              </div>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="space-y-8">
              <SettingsView
                userProfile={userProfile}
                onUpdateProfile={async (p) => {
                  setUserProfile(p);
                  await handleUpdateWorkspaceBranding({
                    institutionName: p.institutionName,
                    institutionAddress: p.institutionAddress,
                    logoUrl: p.logoUrl,
                    watermarkText: p.watermarkText,
                    watermarkOpacity: p.watermarkOpacity,
                    defaultLanguage: p.defaultLanguage,
                  });
                }}
                allQuestions={questions}
                allPapers={papers}
                allTextbooks={[]}
                allBoardQuestions={[]}
                onRestoreBackup={(backup) => {
                  if (backup.questions) handleSaveQuestions(backup.questions);
                  if (backup.papers) handleSavePapers(backup.papers);
                }}
                onSignOut={currentUser ? handleSignOut : undefined}
              />

              {isSuperAdminOwner && (
                <>
                  <AdminConfigManager
                    dynamicClasses={dynamicClasses}
                    dynamicSubjects={dynamicSubjects}
                    examPresets={examPresets}
                    onSaveClass={async (cls) => {
                      await saveDynamicClass(cls);
                      setDynamicClasses((prev) => {
                        const exists = prev.some((c) => c.id === cls.id);
                        return exists ? prev.map((c) => (c.id === cls.id ? cls : c)) : [...prev, cls];
                      });
                    }}
                    onDeleteClass={async (id) => {
                      await deleteDynamicClass(id);
                      setDynamicClasses((prev) => prev.filter((c) => c.id !== id));
                    }}
                    onSaveSubject={async (sub) => {
                      await saveDynamicSubject(sub);
                      setDynamicSubjects((prev) => {
                        const exists = prev.some((s) => s.id === sub.id);
                        return exists ? prev.map((s) => (s.id === sub.id ? sub : s)) : [...prev, sub];
                      });
                    }}
                    onDeleteSubject={async (id) => {
                      await deleteDynamicSubject(id);
                      setDynamicSubjects((prev) => prev.filter((s) => s.id !== id));
                    }}
                    onSaveExamPreset={async (ex) => {
                      await saveExamPreset(ex);
                      setExamPresets((prev) => [...prev, ex]);
                    }}
                    onDeleteExamPreset={async (id) => {
                      await deleteExamPreset(id);
                      setExamPresets((prev) => prev.filter((e) => e.id !== id));
                    }}
                  />
                  <WorkspaceMembersView
                    workspace={currentWorkspace}
                    members={members}
                    invitations={invitations}
                    activityLogs={activityLogs}
                    currentUserRole={currentUserRole}
                    currentUserId={currentUser?.uid || 'owner-jahidul'}
                    onInviteMember={handleInviteMember}
                    onChangeRole={handleChangeMemberRole}
                    onRemoveMember={handleRemoveMember}
                    onTransferOwnership={handleTransferOwnership}
                    isBangla={isBangla}
                  />
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 text-center border-b border-slate-100 bg-slate-50">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-md mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {isBangla ? 'ওয়ার্কস্পেস অ্যাকাউন্টে প্রবেশ' : 'Workspace Account Sign In'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isBangla ? 'গুগল বা অনুমোদিত ইমেইল দিয়ে লগইন করুন' : 'Sign in with Google or authorized credentials'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* In-app browser warning banner */}
              {isInAppBrowser && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong>সতর্কতা:</strong> আপনি ফেসবুক/মেসেঞ্জারের ইন-অ্যাপ ব্রাউজারে আছেন। গুগল লগইন সম্পন্ন করতে উপরে (⋮) চাপ দিয়ে <strong>"Open in Chrome"</strong> বা <strong>"Open in Safari"</strong> নির্বাচন করে সাইটটি খুলুন।
                  </div>
                </div>
              )}

              {/* Error Box */}
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div>{authError}</div>
                    {authError.includes('unauthorized-domain') && (
                      <div className="pt-2 border-t border-rose-200 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              navigator.clipboard.writeText(window.location.hostname);
                              setResetSuccess(`ডোমেইন কপি হয়েছে: ${window.location.hostname} (Firebase Console -> Authorized Domains এ পেস্ট করুন)`);
                            }
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[10px] font-bold flex items-center gap-1"
                        >
                          📋 ডোমেইন কপি করুন ({typeof window !== 'undefined' ? window.location.hostname : ''})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Temporary offline admin bypass for testing on preview domain
                            setCurrentUser({
                              uid: 'owner-jahidul',
                              email: OWNER_EMAIL,
                              displayName: 'Md. Jahidul Islam (Admin)',
                            } as any);
                            setShowAuthModal(false);
                            setAuthError(null);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold"
                        >
                          🛡️ অফলাইন এডমিন হিসেবে প্রবেশ করুন (Bypass)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Success Box */}
              {resetSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div className="flex-1">{resetSuccess}</div>
                </div>
              )}

              {/* Google Sign In Options */}
              {/* Google Sign In Options */}
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => handleGoogleSignIn(false)}
                  className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  {authLoading ? 'Signing in...' : 'Continue with Google (যেকোনো জিমেইল দিয়ে লগইন)'}
                </button>

                {/* Mobile Direct Redirect Fallback Button */}
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => handleGoogleSignIn(true)}
                  className="w-full text-center text-[11px] text-blue-600 hover:text-blue-800 font-semibold py-1 hover:underline flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> মোবাইলে পপ-আপ না খুললে: Redirect দিয়ে লগইন করুন
                </button>
              </div>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase">অথবা ইমেইল ও পাসওয়ার্ড</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthError(null);
                    setResetSuccess(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    authMode === 'signin'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  লগইন (Sign In)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError(null);
                    setResetSuccess(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    authMode === 'signup'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  নতুন একাউন্ট (Sign Up)
                </button>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {authMode === 'signin' ? 'আপনার ইমেইল:' : 'আপনার ব্যক্তিগত ইমেইল বা জিমেইল:'}
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@example.com (e.g. yourname@gmail.com)"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Password:</label>
                    {authMode === 'signin' && (
                      <button
                        type="button"
                        onClick={handleSendPasswordReset}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        title="Send Password Reset/Setup link to your email"
                      >
                        <KeyRound className="w-3 h-3" /> পাসওয়ার্ড ভুলে গেছেন?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="•••••••• (কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড)"
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {authLoading
                    ? 'অনুগ্রহ করে অপেক্ষা করুন...'
                    : authMode === 'signin'
                    ? 'লগইন করুন (Sign In)'
                    : 'নতুন অ্যাকাউন্ট তৈরি করুন (Create Account)'}
                </button>
              </form>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                <strong>মোবাইল ইউজারদের জন্য পরামর্শ:</strong> গুগল লগইনে সমস্যা হলে উপরে <em>"পাসওয়ার্ড সেট / রিসেট করুন"</em> বাটনে চাপ দিন। আপনার জিমেইল ইনবক্সে পাসওয়ার্ড বানানোর লিংক চলে যাবে। একবার পাসওয়ার্ড বানিয়ে নিলে যেকোনো মোবাইল থেকে খুব সহজে Email ও Password দিয়ে সরাসরি লগইন করতে পারবেন।
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Public Submit Question Modal (For visitors & users on Vercel) */}
      <SubmitQuestionModal
        isOpen={submitQuestionModalOpen}
        onClose={() => setSubmitQuestionModalOpen(false)}
        dynamicClasses={dynamicClasses}
        dynamicSubjects={dynamicSubjects}
        currentUser={currentUser}
        isBangla={isBangla}
      />

      {/* Universal Academic Footer with Creator Attribution & Live Clickable View Counter */}
      <footer className="no-print mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Creator Attribution */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <GraduationCap className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 justify-center md:justify-start">
                <span>Created by <strong className="text-blue-700 font-extrabold">JAHIDUL ISLAM</strong></span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-700 font-semibold hidden sm:inline">IIT, University of Dhaka</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Institute of Information Technology (IIT), University of Dhaka • EduQuestion AI System
              </div>
            </div>
          </div>

          {/* Live Automatic View Counter & Action Button */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs select-none"
              title={isBangla ? 'ওয়েবসাইট লিংক ওপেন করলেই ভিউ স্বয়ংক্রিয়ভাবে ক্লাউডে যুক্ত হয়' : 'Website views automatically recorded on link open'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Eye className="w-4 h-4 text-blue-600" />
              <span className="text-slate-600">{isBangla ? 'সর্বমোট ভিউ:' : 'Total Site Views:'}</span>
              <span className="text-blue-900 font-black text-sm">{formatBengaliNumber(totalViews)}</span>
            </div>

            <button
              onClick={() => setSubmitQuestionModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isBangla ? 'প্রশ্ন সাবমিট করুন' : 'Submit Question'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
