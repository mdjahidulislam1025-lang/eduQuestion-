import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  DynamicClassItem,
  DynamicSubjectItem,
  ExamPresetItem,
  UserExamConfiguration,
} from '../types';

export const DEFAULT_CLASSES: DynamicClassItem[] = [
  { id: 'cls-6', name: 'Class 6', nameBn: '৬ষ্ঠ শ্রেণি', isDefault: true, createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'cls-7', name: 'Class 7', nameBn: '৭ম শ্রেণি', isDefault: true, createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'cls-8', name: 'Class 8', nameBn: '৮ম শ্রেণি', isDefault: true, createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'cls-9', name: 'Class 9', nameBn: '৯ম শ্রেণি', isDefault: true, createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'cls-10', name: 'Class 10', nameBn: '১০ম শ্রেণি', isDefault: true, createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'cls-ssc', name: 'SSC', nameBn: 'এসএসসি (SSC)', isDefault: true, createdAt: '2025-01-01T00:00:00.000Z' },
];

export const DEFAULT_SUBJECTS: DynamicSubjectItem[] = [
  { id: 'subj-bangla-1', name: 'Bangla 1st Paper', nameBn: 'বাংলা ১ম পত্র', code: '101', classLevel: 'SSC', group: 'General', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-bangla-2', name: 'Bangla 2nd Paper', nameBn: 'বাংলা ২য় পত্র', code: '102', classLevel: 'SSC', group: 'General', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-eng-1', name: 'English 1st Paper', nameBn: 'English 1st Paper', code: '107', classLevel: 'SSC', group: 'General', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-eng-2', name: 'English 2nd Paper', nameBn: 'English 2nd Paper', code: '108', classLevel: 'SSC', group: 'General', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-math', name: 'Mathematics', nameBn: 'সাধারণ গণিত', code: '109', classLevel: 'SSC', group: 'General', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-hmath', name: 'Higher Mathematics', nameBn: 'উচ্চতর গণিত', code: '126', classLevel: 'SSC', group: 'Science', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-phy', name: 'Physics', nameBn: 'পদার্থবিজ্ঞান', code: '136', classLevel: 'SSC', group: 'Science', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-chem', name: 'Chemistry', nameBn: 'রসায়ন', code: '137', classLevel: 'SSC', group: 'Science', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-bio', name: 'Biology', nameBn: 'জীববিজ্ঞান', code: '138', classLevel: 'SSC', group: 'Science', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-ict', name: 'ICT', nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি', code: '154', classLevel: 'SSC', group: 'General', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-bgs', name: 'Bangladesh and Global Studies', nameBn: 'বাংলাদেশ ও বিশ্বপরিচয়', code: '150', classLevel: 'SSC', group: 'General', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-acc', name: 'Accounting', nameBn: 'হিসাববিজ্ঞান', code: '146', classLevel: 'SSC', group: 'Commerce', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-fin', name: 'Finance and Banking', nameBn: 'ফিন্যান্স ও ব্যাংকিং', code: '152', classLevel: 'SSC', group: 'Commerce', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-bus', name: 'Business Entrepreneurship', nameBn: 'ব্যবসায় উদ্যোগ', code: '143', classLevel: 'SSC', group: 'Commerce', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'subj-rel', name: 'Religion and Moral Education', nameBn: 'ধর্ম ও নৈতিক শিক্ষা', code: '111', classLevel: 'SSC', group: 'General', createdAt: '2025-01-01T00:00:00.000Z' },
];

export const DEFAULT_EXAM_PRESETS: ExamPresetItem[] = [
  { id: 'exam-1st-term', name: 'First Term Examination', nameBn: 'প্রথম সাময়িক পরীক্ষা', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'exam-2nd-term', name: 'Second Term Examination', nameBn: 'দ্বিতীয় সাময়িক পরীক্ষা', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'exam-half-yearly', name: 'Half-Yearly Examination', nameBn: 'অর্ধবার্ষিক পরীক্ষা', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'exam-annual', name: 'Annual Examination', nameBn: 'বার্ষিক পরীক্ষা', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'exam-model', name: 'Model Test Examination', nameBn: 'মডেল টেস্ট পরীক্ষা', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'exam-test', name: 'Test Examination', nameBn: 'নির্বাচনী পরীক্ষা (Test)', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'exam-pretest', name: 'Pre-Test Examination', nameBn: 'প্রাক-নির্বাচনী পরীক্ষা (Pre-Test)', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'exam-selection', name: 'Selection Examination', nameBn: 'বাছাই পরীক্ষা', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'exam-weekly', name: 'Weekly Test', nameBn: 'সাপ্তাহিক পরীক্ষা', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'exam-monthly', name: 'Monthly Test', nameBn: 'মাসিক পরীক্ষা', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'exam-final', name: 'Final Examination', nameBn: 'চূড়ান্ত পরীক্ষা', createdAt: '2025-01-01T00:00:00.000Z' },
];

export async function loadDynamicClasses(): Promise<DynamicClassItem[]> {
  try {
    const cached = localStorage.getItem('edu_classes');
    let list: DynamicClassItem[] = cached ? JSON.parse(cached) : DEFAULT_CLASSES;
    if (auth.currentUser) {
      const snap = await getDocs(collection(db, 'classes'));
      if (!snap.empty) {
        const remote = snap.docs.map((d) => d.data() as DynamicClassItem);
        const map = new Map<string, DynamicClassItem>();
        list.forEach((c) => map.set(c.id, c));
        remote.forEach((c) => map.set(c.id, c));
        list = Array.from(map.values());
        localStorage.setItem('edu_classes', JSON.stringify(list));
      }
    }
    return list;
  } catch {
    return DEFAULT_CLASSES;
  }
}

export async function saveDynamicClass(item: DynamicClassItem): Promise<void> {
  const current = await loadDynamicClasses();
  const updated = current.some((c) => c.id === item.id)
    ? current.map((c) => (c.id === item.id ? item : c))
    : [...current, item];
  localStorage.setItem('edu_classes', JSON.stringify(updated));
  if (auth.currentUser) {
    await setDoc(doc(db, 'classes', item.id), {
      ...item,
      createdBy: auth.currentUser.uid,
    });
  }
}

export async function deleteDynamicClass(id: string): Promise<void> {
  const current = await loadDynamicClasses();
  const updated = current.filter((c) => c.id !== id);
  localStorage.setItem('edu_classes', JSON.stringify(updated));
  if (auth.currentUser) {
    await deleteDoc(doc(db, 'classes', id));
  }
}

export async function loadDynamicSubjects(): Promise<DynamicSubjectItem[]> {
  try {
    const cached = localStorage.getItem('edu_subjects');
    let list: DynamicSubjectItem[] = cached ? JSON.parse(cached) : DEFAULT_SUBJECTS;
    if (auth.currentUser) {
      const snap = await getDocs(collection(db, 'subjects'));
      if (!snap.empty) {
        const remote = snap.docs.map((d) => d.data() as DynamicSubjectItem);
        const map = new Map<string, DynamicSubjectItem>();
        list.forEach((s) => map.set(s.id, s));
        remote.forEach((s) => map.set(s.id, s));
        list = Array.from(map.values());
        localStorage.setItem('edu_subjects', JSON.stringify(list));
      }
    }
    return list;
  } catch {
    return DEFAULT_SUBJECTS;
  }
}

export async function saveDynamicSubject(item: DynamicSubjectItem): Promise<void> {
  const current = await loadDynamicSubjects();
  const updated = current.some((s) => s.id === item.id)
    ? current.map((s) => (s.id === item.id ? item : s))
    : [...current, item];
  localStorage.setItem('edu_subjects', JSON.stringify(updated));
  if (auth.currentUser) {
    await setDoc(doc(db, 'subjects', item.id), {
      ...item,
      createdBy: auth.currentUser.uid,
    });
  }
}

export async function deleteDynamicSubject(id: string): Promise<void> {
  const current = await loadDynamicSubjects();
  const updated = current.filter((s) => s.id !== id);
  localStorage.setItem('edu_subjects', JSON.stringify(updated));
  if (auth.currentUser) {
    await deleteDoc(doc(db, 'subjects', id));
  }
}

export async function loadExamPresets(): Promise<ExamPresetItem[]> {
  try {
    const cached = localStorage.getItem('edu_exam_presets');
    let list: ExamPresetItem[] = cached ? JSON.parse(cached) : DEFAULT_EXAM_PRESETS;
    if (auth.currentUser) {
      const snap = await getDocs(collection(db, 'examPresets'));
      if (!snap.empty) {
        const remote = snap.docs.map((d) => d.data() as ExamPresetItem);
        const map = new Map<string, ExamPresetItem>();
        list.forEach((p) => map.set(p.id, p));
        remote.forEach((p) => map.set(p.id, p));
        list = Array.from(map.values());
        localStorage.setItem('edu_exam_presets', JSON.stringify(list));
      }
    }
    return list;
  } catch {
    return DEFAULT_EXAM_PRESETS;
  }
}

export async function saveExamPreset(item: ExamPresetItem): Promise<void> {
  const current = await loadExamPresets();
  const updated = current.some((p) => p.id === item.id)
    ? current.map((p) => (p.id === item.id ? item : p))
    : [...current, item];
  localStorage.setItem('edu_exam_presets', JSON.stringify(updated));
  if (auth.currentUser) {
    await setDoc(doc(db, 'examPresets', item.id), {
      ...item,
      createdBy: auth.currentUser.uid,
    });
  }
}

export async function deleteExamPreset(id: string): Promise<void> {
  const current = await loadExamPresets();
  const updated = current.filter((p) => p.id !== id);
  localStorage.setItem('edu_exam_presets', JSON.stringify(updated));
  if (auth.currentUser) {
    await deleteDoc(doc(db, 'examPresets', id));
  }
}

export async function loadUserConfigurations(userId: string): Promise<UserExamConfiguration[]> {
  try {
    const cached = localStorage.getItem('edu_user_configs');
    let list: UserExamConfiguration[] = cached ? JSON.parse(cached) : [];
    if (auth.currentUser) {
      const q = auth.currentUser.email
        ? query(collection(db, 'userConfigurations'), where('userEmail', '==', auth.currentUser.email))
        : query(collection(db, 'userConfigurations'), where('userId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        list = snap.docs.map((d) => d.data() as UserExamConfiguration);
        localStorage.setItem('edu_user_configs', JSON.stringify(list));
      }
    }
    return list;
  } catch {
    return [];
  }
}

export async function saveUserConfiguration(config: UserExamConfiguration): Promise<void> {
  const enrichedConfig = {
    ...config,
    userId: auth.currentUser?.uid || config.userId || 'owner-jahidul',
    userEmail: auth.currentUser?.email || 'mdjahidulislam1025@gmail.com',
  };
  const cached = localStorage.getItem('edu_user_configs');
  const list: UserExamConfiguration[] = cached ? JSON.parse(cached) : [];
  const updated = list.some((c) => c.id === enrichedConfig.id)
    ? list.map((c) => (c.id === enrichedConfig.id ? enrichedConfig : c))
    : [enrichedConfig, ...list];
  localStorage.setItem('edu_user_configs', JSON.stringify(updated));
  if (auth.currentUser) {
    await setDoc(doc(db, 'userConfigurations', enrichedConfig.id), enrichedConfig);
  }
}

export async function deleteUserConfiguration(id: string): Promise<void> {
  const cached = localStorage.getItem('edu_user_configs');
  const list: UserExamConfiguration[] = cached ? JSON.parse(cached) : [];
  const updated = list.filter((c) => c.id !== id);
  localStorage.setItem('edu_user_configs', JSON.stringify(updated));
  if (auth.currentUser) {
    await deleteDoc(doc(db, 'userConfigurations', id));
  }
}
