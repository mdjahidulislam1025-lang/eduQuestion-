import { collection, doc, getDocs, setDoc, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { SubmittedQuestion, AdminNotification, Question } from '../types';

export const ADMIN_EMAIL = 'mdjahidulislam1025@gmail.com';

/**
 * Submits a question by any user or visitor via the shared/Vercel link.
 * Saves to Firestore and prepares notification for Admin's Gmail.
 */
export async function submitPublicQuestion(
  data: Omit<SubmittedQuestion, 'id' | 'createdAt' | 'status'>
): Promise<{ question: SubmittedQuestion; gmailComposeUrl: string }> {
  const id = `sub_q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newSubmission: SubmittedQuestion = {
    ...data,
    id,
    status: 'PENDING',
    notifiedAdminEmail: ADMIN_EMAIL,
    createdAt: now,
  };

  // 1. Cache locally
  try {
    const cached = localStorage.getItem('edu_submitted_questions');
    const list: SubmittedQuestion[] = cached ? JSON.parse(cached) : [];
    localStorage.setItem('edu_submitted_questions', JSON.stringify([newSubmission, ...list]));
  } catch (e) {
    console.warn('Local cache save failed', e);
  }

  // 2. Persist to Firestore `submitted_questions`
  try {
    await setDoc(doc(db, 'submitted_questions', id), newSubmission);
  } catch (err) {
    console.warn('Firestore submission save warning:', err);
  }

  // 3. Create Admin In-App & Email Notification Record
  const notificationId = `notif_${Date.now()}`;
  const notification: AdminNotification = {
    id: notificationId,
    type: 'QUESTION_SUBMITTED',
    title: `নতুন প্রশ্ন জমা দিয়েছেন: ${data.submitterName || 'একজন ইউজার'}`,
    message: `শ্রেণি: ${data.classLevel} | বিষয়: ${data.subject} | টাইপ: ${data.questionType}`,
    recipientEmail: ADMIN_EMAIL,
    data: {
      questionId: id,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      submitterPhone: data.submitterPhone,
      subject: data.subject,
      classLevel: data.classLevel,
      questionText: data.questionText?.substring(0, 150),
    },
    isRead: false,
    createdAt: now,
  };

  try {
    await setDoc(doc(db, 'admin_notifications', notificationId), notification);
  } catch (err) {
    console.warn('Failed to save admin notification document:', err);
  }

  // 4. Also notify server backend if online
  try {
    fetch('/api/notifications/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: id,
        submitterName: data.submitterName,
        submitterEmail: data.submitterEmail,
        submitterPhone: data.submitterPhone,
        classLevel: data.classLevel,
        subject: data.subject,
        questionType: data.questionType,
        questionText: data.questionText,
        recipientEmail: ADMIN_EMAIL,
      }),
    }).catch(() => {
      // Non-blocking background call
    });
  } catch {
    // Ignore fetch error
  }

  // 5. Generate Gmail Compose URL for direct 1-click notification
  const gmailSubject = encodeURIComponent(`[EduQuestion AI] নতুন প্রশ্ন আপলোড করেছেন: ${data.submitterName || 'ইউজার'} (${data.subject})`);
  const gmailBody = encodeURIComponent(
    `প্রিয় অ্যাডমিন,\n\nEduQuestion AI ওয়েবসাইটে আপনার Vercel লিংক থেকে একজন ইউজার নতুন প্রশ্ন আপলোড করেছেন:\n\n` +
      `নাম: ${data.submitterName || 'অজ্ঞাত'}\n` +
      `ইমেইল: ${data.submitterEmail || 'দেওয়া হয়নি'}\n` +
      `মোবাইল: ${data.submitterPhone || 'দেওয়া হয়নি'}\n` +
      `শ্রেণি: ${data.classLevel}\n` +
      `বিষয়: ${data.subject}\n` +
      `প্রশ্ন টাইপ: ${data.questionType}\n\n` +
      `প্রশ্ন:\n${data.questionText}\n\n` +
      (data.correctAnswer ? `সঠিক উত্তর: ${data.correctAnswer}\n` : '') +
      `\nআপনি অ্যাডমিন ড্যাশবোর্ডে গিয়ে এই প্রশ্নটি এক ক্লিকে অনুমোদন (Approve) বা সম্পাদনা করতে পারেন।`
  );

  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    ADMIN_EMAIL
  )}&su=${gmailSubject}&body=${gmailBody}`;

  return { question: newSubmission, gmailComposeUrl };
}

/**
 * Loads all submitted questions for the Admin Dashboard.
 */
export async function loadSubmittedQuestions(): Promise<SubmittedQuestion[]> {
  // 1. Try local cache first
  let list: SubmittedQuestion[] = [];
  try {
    const cached = localStorage.getItem('edu_submitted_questions');
    if (cached) {
      list = JSON.parse(cached);
    }
  } catch (e) {
    console.warn(e);
  }

  // 2. Load from Firestore
  try {
    const q = query(collection(db, 'submitted_questions'), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = snap.docs.map((d) => d.data() as SubmittedQuestion);
      localStorage.setItem('edu_submitted_questions', JSON.stringify(list));
    }
  } catch (err) {
    // If index or offline, try plain collection get
    try {
      const snap = await getDocs(collection(db, 'submitted_questions'));
      if (!snap.empty) {
        list = snap.docs.map((d) => d.data() as SubmittedQuestion);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        localStorage.setItem('edu_submitted_questions', JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Failed to fetch submitted questions from Firestore:', e);
    }
  }

  return list;
}

/**
 * Approves a submitted question and turns it into a verified Question for the Question Bank.
 */
export async function approveSubmittedQuestion(
  submitted: SubmittedQuestion
): Promise<Question> {
  const verifiedQuestion: Question = {
    id: `q_approved_${submitted.id}`,
    classLevel: submitted.classLevel,
    subject: submitted.subject,
    chapter: submitted.chapter || 'সাধারণ অধ্যায়',
    questionType: submitted.questionType,
    questionText: submitted.questionText,
    stimulus: submitted.stimulus,
    options: submitted.options,
    correctAnswer: submitted.correctAnswer,
    cqParts: submitted.cqParts,
    diagramUrl: submitted.diagramUrl,
    diagramCaption: submitted.diagramCaption,
    marks: submitted.marks || (submitted.questionType === 'CQ' ? 10 : 1),
    difficulty: 'Medium',
    sourceType: 'COMMUNITY',
    sourceVerificationStatus: 'Verified',
    verifiedBy: auth.currentUser?.email || ADMIN_EMAIL,
    verifiedAt: new Date().toISOString(),
    isFavorite: false,
    createdAt: new Date().toISOString(),
  };

  // 1. Update status in submitted_questions
  try {
    await updateDoc(doc(db, 'submitted_questions', submitted.id), {
      status: 'APPROVED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: auth.currentUser?.email || ADMIN_EMAIL,
    });
  } catch (err) {
    console.warn('Failed to update submission status in Firestore', err);
  }

  // 2. Save approved question into Firestore `saved_questions`
  try {
    await setDoc(doc(db, 'saved_questions', verifiedQuestion.id), verifiedQuestion);
  } catch (err) {
    console.warn('Failed to save approved question in Firestore', err);
  }

  // 3. Update local cache
  try {
    const cached = localStorage.getItem('edu_submitted_questions');
    if (cached) {
      const list: SubmittedQuestion[] = JSON.parse(cached);
      const updated = list.map((item) =>
        item.id === submitted.id ? { ...item, status: 'APPROVED' as const } : item
      );
      localStorage.setItem('edu_submitted_questions', JSON.stringify(updated));
    }
  } catch (e) {
    console.warn(e);
  }

  return verifiedQuestion;
}

/**
 * Rejects a submitted question.
 */
export async function rejectSubmittedQuestion(id: string, notes?: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'submitted_questions', id), {
      status: 'REJECTED',
      adminNotes: notes || 'Rejected by Admin',
      reviewedAt: new Date().toISOString(),
      reviewedBy: auth.currentUser?.email || ADMIN_EMAIL,
    });
  } catch (err) {
    console.warn('Failed to reject submission in Firestore', err);
  }

  try {
    const cached = localStorage.getItem('edu_submitted_questions');
    if (cached) {
      const list: SubmittedQuestion[] = JSON.parse(cached);
      const updated = list.map((item) =>
        item.id === id ? { ...item, status: 'REJECTED' as const, adminNotes: notes } : item
      );
      localStorage.setItem('edu_submitted_questions', JSON.stringify(updated));
    }
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Loads Admin Notifications.
 */
export async function loadAdminNotifications(): Promise<AdminNotification[]> {
  try {
    const snap = await getDocs(collection(db, 'admin_notifications'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as AdminNotification);
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('Could not load admin notifications:', err);
  }
  return [];
}
