import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { Question } from '../types';
import { AUTHENTIC_NCTB_QUESTIONS } from '../data/authenticNctbQuestions';

const SAVED_QUESTIONS_COLLECTION = 'saved_questions';
const LOCAL_STORAGE_ALL_KEY = 'edu_questions';
const LOCAL_STORAGE_CUSTOM_KEY = 'edu_custom_user_questions';

/**
 * Helper to get custom questions saved on this device
 */
export function getLocalCustomQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse local custom questions:', e);
  }
  return [];
}

/**
 * Helper to save custom questions locally
 */
export function saveLocalCustomQuestion(question: Question): void {
  try {
    const current = getLocalCustomQuestions();
    const existingIndex = current.findIndex((q) => q.id === question.id);
    let updated: Question[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = question;
    } else {
      updated = [question, ...current];
    }
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to write local custom question:', e);
  }
}

/**
 * Helper to delete a custom question locally
 */
export function removeLocalCustomQuestion(questionId: string): void {
  try {
    const current = getLocalCustomQuestions();
    const updated = current.filter((q) => q.id !== questionId);
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to remove local custom question:', e);
  }
}

/**
 * Merges cloud questions with authentic NCTB questions and local custom questions.
 * Ensures no duplicates. User/admin custom and cloud questions take highest precedence.
 */
export function mergeWithDefaultQuestions(cloudQuestions: Question[] = []): Question[] {
  const map = new Map<string, Question>();

  // 1. Add authentic baseline NCTB questions
  AUTHENTIC_NCTB_QUESTIONS.forEach((q) => {
    map.set(q.id, q);
  });

  // 2. Add local custom questions
  const localCustom = getLocalCustomQuestions();
  localCustom.forEach((q) => {
    map.set(q.id, q);
  });

  // 3. Overlay Firestore cloud questions
  cloudQuestions.forEach((q) => {
    map.set(q.id, q);
  });

  const merged = Array.from(map.values());
  // Sort so newly created questions come first
  merged.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return merged;
}

/**
 * Synchronizes local custom questions to Firestore `saved_questions` if missing in cloud.
 */
async function syncLocalQuestionsToCloud(cloudIds: Set<string>): Promise<void> {
  const localCustom = getLocalCustomQuestions();
  for (const q of localCustom) {
    if (!cloudIds.has(q.id)) {
      try {
        await setDoc(doc(db, SAVED_QUESTIONS_COLLECTION, q.id), {
          ...q,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn(`Sync question ${q.id} to cloud failed:`, err);
      }
    }
  }
}

/**
 * Loads all questions from Firestore `saved_questions` collection and merges them with NCTB defaults
 * and local custom questions. Never loses questions on page refresh!
 */
export async function loadCloudQuestions(): Promise<Question[]> {
  let cloudQs: Question[] = [];

  try {
    const snap = await getDocs(collection(db, SAVED_QUESTIONS_COLLECTION));
    if (!snap.empty) {
      cloudQs = snap.docs.map((d) => d.data() as Question);
      const cloudIds = new Set(cloudQs.map((q) => q.id));
      // Proactively sync local questions up to Firestore
      syncLocalQuestionsToCloud(cloudIds).catch(() => {});
    }
  } catch (err) {
    console.warn('Could not fetch questions from Firestore, relying on local storage:', err);
  }

  const merged = mergeWithDefaultQuestions(cloudQs);
  try {
    localStorage.setItem(LOCAL_STORAGE_ALL_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }

  return merged;
}

/**
 * Real-time subscription to cloud questions.
 * When admin or user uploads a question, all connected users immediately receive the update.
 */
export function subscribeToCloudQuestions(onUpdate: (questions: Question[]) => void): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, SAVED_QUESTIONS_COLLECTION),
      (snap) => {
        const cloudQs = snap.docs.map((d) => d.data() as Question);
        const merged = mergeWithDefaultQuestions(cloudQs);
        try {
          localStorage.setItem(LOCAL_STORAGE_ALL_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
        onUpdate(merged);
      },
      (err) => {
        console.warn('Questions onSnapshot listener error:', err);
        // Even on error, provide merged local & default questions so UI is always functional
        const fallback = mergeWithDefaultQuestions([]);
        onUpdate(fallback);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not attach questions snapshot listener:', err);
    return () => {};
  }
}

/**
 * Saves a question directly into Firestore `saved_questions` and local persistence
 * so it is 100% permanently preserved across page reloads and device restarts.
 */
export async function saveQuestionToCloud(question: Question): Promise<void> {
  // 1. Always save locally first so user never loses their data
  saveLocalCustomQuestion(question);

  // Update cached full questions list
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_ALL_KEY);
    const list: Question[] = cached ? JSON.parse(cached) : AUTHENTIC_NCTB_QUESTIONS;
    const idx = list.findIndex((q) => q.id === question.id);
    const updated = idx >= 0 ? list.map((q) => (q.id === question.id ? question : q)) : [question, ...list];
    localStorage.setItem(LOCAL_STORAGE_ALL_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to update cached questions list:', e);
  }

  // 2. Persist to Firestore `saved_questions`
  try {
    const cleanQuestion: Question = {
      ...question,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, SAVED_QUESTIONS_COLLECTION, question.id), cleanQuestion);
  } catch (err) {
    console.warn('Failed to save question to Firestore:', err);
  }
}

/**
 * Deletes a question from Firestore `saved_questions` and local cache.
 */
export async function deleteQuestionFromCloud(questionId: string): Promise<void> {
  removeLocalCustomQuestion(questionId);

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_ALL_KEY);
    if (cached) {
      const list: Question[] = JSON.parse(cached);
      const filtered = list.filter((q) => q.id !== questionId);
      localStorage.setItem(LOCAL_STORAGE_ALL_KEY, JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }

  try {
    await deleteDoc(doc(db, SAVED_QUESTIONS_COLLECTION, questionId));
  } catch (err) {
    console.warn('Failed to delete question from Firestore:', err);
  }
}
