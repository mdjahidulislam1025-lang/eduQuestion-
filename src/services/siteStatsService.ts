import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
} from 'firebase/firestore';

export interface SiteStats {
  id: string;
  totalViews: number;
  uniqueVisitors: number;
  lastVisitedAt: string;
  createdAt: string;
}

const STATS_DOC_ID = 'main_counter';
const LOCAL_STORAGE_KEY = 'eduquestion_site_views';
const HAS_RECORDED_SESSION_KEY = 'eduquestion_session_view_recorded';

/**
 * Converts English digits to Bengali digits
 */
export function toBengaliNumerals(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}

/**
 * Formats a number with comma separators in Bengali
 */
export function formatBengaliNumber(num: number): string {
  const formattedEn = num.toLocaleString('en-US');
  return toBengaliNumerals(formattedEn);
}

/**
 * Increments the total view count in Firestore atomically whenever the link is opened
 */
export async function recordPageView(): Promise<number> {
  const now = new Date().toISOString();

  try {
    const statsRef = doc(db, 'site_stats', STATS_DOC_ID);
    const snap = await getDoc(statsRef);

    if (!snap.exists()) {
      // First time initialization (seed with an active count, e.g. 1025 matching creator's lucky number)
      const initialCount = 1026;
      await setDoc(statsRef, {
        id: STATS_DOC_ID,
        totalViews: initialCount,
        uniqueVisitors: 1,
        lastVisitedAt: now,
        createdAt: now,
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, String(initialCount));
      return initialCount;
    } else {
      await updateDoc(statsRef, {
        totalViews: increment(1),
        lastVisitedAt: now,
      });
      const updatedCount = (snap.data()?.totalViews || 0) + 1;
      localStorage.setItem(LOCAL_STORAGE_KEY, String(updatedCount));
      return updatedCount;
    }
  } catch (error) {
    console.warn('Firestore view counter update failed, falling back to local storage:', error);
    const cached = parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) || '1025', 10);
    const nextCount = cached + 1;
    localStorage.setItem(LOCAL_STORAGE_KEY, String(nextCount));
    return nextCount;
  }
}

/**
 * Gets the latest view count without incrementing
 */
export async function getLatestViewCount(): Promise<number> {
  try {
    const statsRef = doc(db, 'site_stats', STATS_DOC_ID);
    const snap = await getDoc(statsRef);
    if (snap.exists()) {
      const count = snap.data()?.totalViews || 1025;
      localStorage.setItem(LOCAL_STORAGE_KEY, String(count));
      return count;
    }
  } catch (e) {
    console.warn('Error reading stats from Firestore:', e);
  }
  return parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) || '1025', 10);
}

/**
 * Subscribes to real-time updates for the site view counter
 */
export function subscribeToViewCount(onUpdate: (views: number) => void): () => void {
  try {
    const statsRef = doc(db, 'site_stats', STATS_DOC_ID);
    const unsubscribe = onSnapshot(
      statsRef,
      (snap) => {
        if (snap.exists()) {
          const views = snap.data()?.totalViews || 1025;
          localStorage.setItem(LOCAL_STORAGE_KEY, String(views));
          onUpdate(views);
        }
      },
      (err) => {
        console.warn('Snapshot listener error on site_stats:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not attach snapshot listener to site_stats:', err);
    return () => {};
  }
}
