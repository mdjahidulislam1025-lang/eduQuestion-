import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'OWNER' | 'ADMIN' | 'USER';
  providerId: string;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
  institutionName?: string;
  institutionAddress?: string;
  logoUrl?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkPosition?: 'center' | 'diagonal';
  phoneNumber?: string;
}

const OWNER_EMAIL = 'mdjahidulislam1025@gmail.com';
const LOCAL_USERS_KEY = 'edu_registered_users_cache';
const CURRENT_USER_PROFILE_PREFIX = 'edu_user_profile_';

/**
 * Loads a specific user's saved profile & exam branding from Firestore or local cache.
 */
export async function loadUserProfile(uid: string): Promise<AppUserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as AppUserProfile;
      localStorage.setItem(`${CURRENT_USER_PROFILE_PREFIX}${uid}`, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn(`Could not load user profile for ${uid} from Firestore:`, err);
  }

  try {
    const cached = localStorage.getItem(`${CURRENT_USER_PROFILE_PREFIX}${uid}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore cache failure
  }

  return null;
}

/**
 * Saves a user's personalized institution details, watermark, and branding to Firestore.
 */
export async function saveUserExamBranding(
  uid: string,
  branding: {
    displayName?: string;
    institutionName?: string;
    institutionAddress?: string;
    logoUrl?: string;
    watermarkText?: string;
    watermarkOpacity?: number;
    watermarkPosition?: 'center' | 'diagonal';
    phoneNumber?: string;
  }
): Promise<AppUserProfile> {
  const userRef = doc(db, 'users', uid);
  const now = new Date().toISOString();

  const updates: Partial<AppUserProfile> = {
    ...branding,
    updatedAt: now,
  };

  try {
    await setDoc(userRef, updates, { merge: true });
  } catch (err) {
    console.warn('Failed to save user exam branding to Firestore:', err);
  }

  // Update local cache for this user
  let updatedProfile: AppUserProfile;
  const existingCached = localStorage.getItem(`${CURRENT_USER_PROFILE_PREFIX}${uid}`);
  if (existingCached) {
    updatedProfile = { ...JSON.parse(existingCached), ...updates };
  } else {
    updatedProfile = {
      uid,
      email: '',
      displayName: branding.displayName || 'Teacher',
      role: 'USER',
      providerId: 'google.com',
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      ...branding,
    };
  }

  localStorage.setItem(`${CURRENT_USER_PROFILE_PREFIX}${uid}`, JSON.stringify(updatedProfile));

  // Also update registered users cache if present
  try {
    const cachedListStr = localStorage.getItem(LOCAL_USERS_KEY);
    if (cachedListStr) {
      let list: AppUserProfile[] = JSON.parse(cachedListStr);
      const index = list.findIndex((u) => u.uid === uid);
      if (index >= 0) {
        list[index] = { ...list[index], ...updates };
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
      }
    }
  } catch {
    // Ignore cache failure
  }

  return updatedProfile;
}

/**
 * Records or updates the user profile in Firestore when they log in.
 * Guaranteed to be called on any login (Google redirect, popup, or email/password).
 */
export async function recordUserLogin(user: FirebaseUser): Promise<AppUserProfile> {
  const now = new Date().toISOString();
  const isOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const userRef = doc(db, 'users', user.uid);

  let existingData: Partial<AppUserProfile> = {};
  try {
    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists()) {
      existingData = existingSnap.data() as Partial<AppUserProfile>;
    }
  } catch (e) {
    console.warn('Could not read existing user doc before update:', e);
  }

  // Check local user cache if Firestore was offline
  if (!existingData.institutionName) {
    try {
      const localCached = localStorage.getItem(`${CURRENT_USER_PROFILE_PREFIX}${user.uid}`);
      if (localCached) {
        existingData = { ...JSON.parse(localCached), ...existingData };
      }
    } catch {
      // Ignore
    }
  }

  const profile: AppUserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: existingData.displayName || user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL || existingData.photoURL || '',
    role: isOwner ? 'OWNER' : 'USER',
    providerId: user.providerData?.[0]?.providerId || 'google.com',
    lastLoginAt: now,
    createdAt: existingData.createdAt || now,
    updatedAt: now,
    institutionName:
      existingData.institutionName !== undefined
        ? existingData.institutionName
        : isOwner
        ? 'মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ'
        : '',
    institutionAddress:
      existingData.institutionAddress !== undefined
        ? existingData.institutionAddress
        : isOwner
        ? 'মতিঝিল, ঢাকা-১০০০'
        : '',
    logoUrl: existingData.logoUrl || '',
    watermarkText:
      existingData.watermarkText !== undefined
        ? existingData.watermarkText
        : isOwner
        ? 'IDEAL SCHOOL'
        : '',
    watermarkOpacity: existingData.watermarkOpacity ?? 0.08,
    watermarkPosition: existingData.watermarkPosition || 'diagonal',
    phoneNumber: existingData.phoneNumber || '',
  };

  try {
    await setDoc(userRef, profile, { merge: true });
  } catch (err) {
    console.warn('Failed to save user profile in Firestore:', err);
  }

  // Save specific user profile to local storage
  localStorage.setItem(`${CURRENT_USER_PROFILE_PREFIX}${user.uid}`, JSON.stringify(profile));

  // Update registered users global cache
  try {
    const cachedStr = localStorage.getItem(LOCAL_USERS_KEY);
    let list: AppUserProfile[] = cachedStr ? JSON.parse(cachedStr) : [];
    const index = list.findIndex((u) => u.uid === profile.uid);
    if (index >= 0) {
      list[index] = profile;
    } else {
      list.unshift(profile);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
  } catch {
    // Ignore cache failure
  }

  return profile;
}

/**
 * Loads all registered users from Firestore for the Admin Dashboard.
 */
export async function loadAllRegisteredUsers(): Promise<AppUserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (!snap.empty) {
      const users: AppUserProfile[] = snap.docs.map((d) => d.data() as AppUserProfile);
      users.sort((a, b) => new Date(b.lastLoginAt || 0).getTime() - new Date(a.lastLoginAt || 0).getTime());
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      return users;
    }
  } catch (err) {
    console.warn('Could not load users from Firestore, using local cache:', err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_USERS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore
  }

  return [];
}

/**
 * Subscribes to registered users in real-time for the Admin Dashboard.
 */
export function subscribeToRegisteredUsers(onUpdate: (users: AppUserProfile[]) => void): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        if (!snap.empty) {
          const users: AppUserProfile[] = snap.docs.map((d) => d.data() as AppUserProfile);
          users.sort((a, b) => new Date(b.lastLoginAt || 0).getTime() - new Date(a.lastLoginAt || 0).getTime());
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
          onUpdate(users);
        }
      },
      (err) => {
        console.warn('Users snapshot listener error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not attach user snapshot listener:', err);
    return () => {};
  }
}
