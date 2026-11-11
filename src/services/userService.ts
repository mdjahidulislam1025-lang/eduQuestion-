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
}

const OWNER_EMAIL = 'mdjahidulislam1025@gmail.com';
const LOCAL_USERS_KEY = 'edu_registered_users_cache';

/**
 * Records or updates the user profile in Firestore when they log in.
 * Guaranteed to be called on any login (Google redirect, popup, or email/password).
 */
export async function recordUserLogin(user: FirebaseUser): Promise<AppUserProfile> {
  const now = new Date().toISOString();
  const isOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const userRef = doc(db, 'users', user.uid);

  let existingCreatedAt = now;
  try {
    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists()) {
      existingCreatedAt = existingSnap.data()?.createdAt || now;
    }
  } catch (e) {
    console.warn('Could not read existing user doc before update:', e);
  }

  const profile: AppUserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL || '',
    role: isOwner ? 'OWNER' : 'USER',
    providerId: user.providerData?.[0]?.providerId || 'google.com',
    lastLoginAt: now,
    createdAt: existingCreatedAt,
    updatedAt: now,
  };

  try {
    await setDoc(userRef, profile, { merge: true });
  } catch (err) {
    console.warn('Failed to save user profile in Firestore:', err);
  }

  // Update local cache
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
