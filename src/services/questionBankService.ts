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
const LOCAL_STORAGE_KEY = 'edu_questions';

/**
 * Merges cloud questions with authentic NCTB questions, ensuring no duplicates.
 * Cloud questions take precedence.
 */
export function mergeWithDefaultQuestions(cloudQuestions: Question[]): Question[] {
  const map = new Map<string, Question>();

  // First add default NCTB questions
  AUTHENTIC_NCTB_QUESTIONS.forEach((q) => {
    map.set(q.id, q);
  });

  // Then overlay / prepend cloud questions (admin added / approved)
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
 * Loads all questions from Firestore `saved_questions` collection and merges them with NCTB defaults.
 */
export async function loadCloudQuestions(): Promise<Question[]> {
  try {
    const snap = await getDocs(collection(db, SAVED_QUESTIONS_COLLECTION));
    if (!snap.empty) {
      const cloudQs = snap.docs.map((d) => d.data() as Question);
      const merged = mergeWithDefaultQuestions(cloudQs);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch questions from Firestore, falling back to local:', err);
  }

  // Fallback to localStorage or default NCTB
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeWithDefaultQuestions(parsed);
      }
    }
  } catch {
    // Ignore
  }

  return AUTHENTIC_NCTB_QUESTIONS;
}

/**
 * Real-time subscription to cloud questions.
 * When admin uploads or approves a question, all other users instantly get the updated questions.
 */
export function subscribeToCloudQuestions(onUpdate: (questions: Question[]) => void): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, SAVED_QUESTIONS_COLLECTION),
      (snap) => {
        const cloudQs = snap.docs.map((d) => d.data() as Question);
        const merged = mergeWithDefaultQuestions(cloudQs);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        onUpdate(merged);
      },
      (err) => {
        console.warn('Questions onSnapshot listener error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not attach questions snapshot listener:', err);
    return () => {};
  }
}

/**
 * Saves a question directly into Firestore `saved_questions` so all users can see and use it.
 */
export async function saveQuestionToCloud(question: Question): Promise<void> {
  try {
    const cleanQuestion = {
      ...question,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, SAVED_QUESTIONS_COLLECTION, question.id), cleanQuestion);
  } catch (err) {
    console.warn('Failed to save question to Firestore:', err);
  }
}

/**
 * Deletes a question from Firestore `saved_questions`.
 */
export async function deleteQuestionFromCloud(questionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, SAVED_QUESTIONS_COLLECTION, questionId));
  } catch (err) {
    console.warn('Failed to delete question from Firestore:', err);
  }
}
