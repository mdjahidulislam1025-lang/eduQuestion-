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

export interface AppDownloadStats {
  totalAppDownloads: number;
  androidDownloads: number;
  iosDownloads: number;
  desktopDownloads: number;
  lastDownloadedAt?: string;
}

const LOCAL_DOWNLOADS_KEY = 'eduquestion_app_downloads_stats';
const DOWNLOAD_RECORDED_FLAG = 'eduquestion_app_download_recorded_v1';

function getCachedDownloadStats(): AppDownloadStats {
  try {
    const raw = localStorage.getItem(LOCAL_DOWNLOADS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        totalAppDownloads: Number(parsed.totalAppDownloads) || 0,
        androidDownloads: Number(parsed.androidDownloads) || 0,
        iosDownloads: Number(parsed.iosDownloads) || 0,
        desktopDownloads: Number(parsed.desktopDownloads) || 0,
        lastDownloadedAt: parsed.lastDownloadedAt,
      };
    }
  } catch {
    // ignore
  }
  return {
    totalAppDownloads: 0,
    androidDownloads: 0,
    iosDownloads: 0,
    desktopDownloads: 0,
  };
}

/**
 * Records an app install / download in Firestore atomically (Android, iOS, or Desktop)
 */
export async function recordAppDownload(
  platform: 'android' | 'ios' | 'desktop',
  forceCount = false
): Promise<AppDownloadStats> {
  const alreadyRecorded = !forceCount && localStorage.getItem(DOWNLOAD_RECORDED_FLAG) === '1';
  if (alreadyRecorded) {
    return getCachedDownloadStats();
  }

  localStorage.setItem(DOWNLOAD_RECORDED_FLAG, '1');
  const now = new Date().toISOString();
  const fieldKey =
    platform === 'android'
      ? 'androidDownloads'
      : platform === 'ios'
      ? 'iosDownloads'
      : 'desktopDownloads';

  const currentLocal = getCachedDownloadStats();
  const optimistic: AppDownloadStats = {
    ...currentLocal,
    totalAppDownloads: currentLocal.totalAppDownloads + 1,
    [fieldKey]: (currentLocal[fieldKey] || 0) + 1,
    lastDownloadedAt: now,
  };
  localStorage.setItem(LOCAL_DOWNLOADS_KEY, JSON.stringify(optimistic));

  try {
    const statsRef = doc(db, 'site_stats', STATS_DOC_ID);
    const snap = await getDoc(statsRef);

    if (!snap.exists()) {
      await setDoc(statsRef, {
        id: STATS_DOC_ID,
        totalViews: 1026,
        uniqueVisitors: 1,
        totalAppDownloads: 1,
        androidDownloads: platform === 'android' ? 1 : 0,
        iosDownloads: platform === 'ios' ? 1 : 0,
        desktopDownloads: platform === 'desktop' ? 1 : 0,
        lastVisitedAt: now,
        lastDownloadedAt: now,
        createdAt: now,
      });
      return {
        totalAppDownloads: 1,
        androidDownloads: platform === 'android' ? 1 : 0,
        iosDownloads: platform === 'ios' ? 1 : 0,
        desktopDownloads: platform === 'desktop' ? 1 : 0,
        lastDownloadedAt: now,
      };
    } else {
      await updateDoc(statsRef, {
        totalAppDownloads: increment(1),
        [fieldKey]: increment(1),
        lastDownloadedAt: now,
      });
      const data = snap.data() || {};
      const synced: AppDownloadStats = {
        totalAppDownloads: (Number(data.totalAppDownloads) || 0) + 1,
        androidDownloads:
          (Number(data.androidDownloads) || 0) + (platform === 'android' ? 1 : 0),
        iosDownloads: (Number(data.iosDownloads) || 0) + (platform === 'ios' ? 1 : 0),
        desktopDownloads:
          (Number(data.desktopDownloads) || 0) + (platform === 'desktop' ? 1 : 0),
        lastDownloadedAt: now,
      };
      localStorage.setItem(LOCAL_DOWNLOADS_KEY, JSON.stringify(synced));
      return synced;
    }
  } catch (error) {
    console.warn('Firestore app download counter update failed, kept locally:', error);
    return optimistic;
  }
}

/**
 * Subscribes to real-time updates for app download counts
 */
export function subscribeToAppDownloads(
  onUpdate: (stats: AppDownloadStats) => void
): () => void {
  onUpdate(getCachedDownloadStats());
  try {
    const statsRef = doc(db, 'site_stats', STATS_DOC_ID);
    const unsubscribe = onSnapshot(
      statsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          const stats: AppDownloadStats = {
            totalAppDownloads: Number(data.totalAppDownloads) || 0,
            androidDownloads: Number(data.androidDownloads) || 0,
            iosDownloads: Number(data.iosDownloads) || 0,
            desktopDownloads: Number(data.desktopDownloads) || 0,
            lastDownloadedAt: data.lastDownloadedAt,
          };
          localStorage.setItem(LOCAL_DOWNLOADS_KEY, JSON.stringify(stats));
          onUpdate(stats);
        }
      },
      (err) => {
        console.warn('Snapshot listener error on app downloads:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not attach snapshot listener for app downloads:', err);
    return () => {};
  }
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
