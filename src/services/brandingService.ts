import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Workspace, UserProfile } from '../types';

export const DEFAULT_WORKSPACE: Workspace = {
  id: 'ws-main',
  name: 'আইডিয়াল একাডেমিক ওয়ার্কস্পেস',
  ownerId: 'owner-jahidul',
  ownerEmail: 'mdjahidulislam1025@gmail.com',
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
};

/**
 * Loads institutional branding preferences from Firestore (with localStorage fallback).
 */
export async function loadWorkspaceBranding(): Promise<Workspace> {
  // 1. Try local cache first for instant render
  let result: Workspace = DEFAULT_WORKSPACE;
  try {
    const cachedWorkspace = localStorage.getItem('edu_workspace');
    if (cachedWorkspace) {
      result = { ...result, ...JSON.parse(cachedWorkspace) };
    }
  } catch (e) {
    console.warn('Failed to parse local workspace branding cache', e);
  }

  // 2. Fetch authoritative configuration from Firestore
  try {
    const docRef = doc(db, 'workspaces', 'ws-main');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remoteData = snap.data() as Partial<Workspace>;
      result = { ...result, ...remoteData, id: 'ws-main' };
      localStorage.setItem('edu_workspace', JSON.stringify(result));
    } else {
      // Initialize default in Firestore if it doesn't exist
      try {
        await setDoc(docRef, result, { merge: true });
      } catch (err) {
        console.warn('Could not initialize remote workspace in Firestore', err);
      }
    }
  } catch (err) {
    console.warn('Could not fetch workspace branding from Firestore (using local cache):', err);
  }

  return result;
}

/**
 * Saves institutional branding preferences to both Firestore and localStorage.
 */
export async function saveWorkspaceBranding(updates: Partial<Workspace>): Promise<Workspace> {
  const current = await loadWorkspaceBranding();
  const updated: Workspace = {
    ...current,
    ...updates,
    id: 'ws-main',
    updatedAt: new Date().toISOString(),
  };

  // 1. Persist to localStorage immediately
  localStorage.setItem('edu_workspace', JSON.stringify(updated));

  // Also sync with UserProfile in localStorage
  const userProfile: UserProfile = {
    uid: auth.currentUser?.uid || 'owner',
    email: auth.currentUser?.email || 'mdjahidulislam1025@gmail.com',
    institutionName: updated.institutionName,
    institutionAddress: updated.institutionAddress,
    logoUrl: updated.logoUrl,
    watermarkText: updated.watermarkText,
    watermarkOpacity: updated.watermarkOpacity,
    defaultLanguage: updated.defaultLanguage || 'Bangla',
    updatedAt: updated.updatedAt,
  };
  localStorage.setItem('edu_profile', JSON.stringify(userProfile));

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, 'workspaces', 'ws-main');
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Failed to save workspace branding to Firestore:', err);
  }

  return updated;
}
