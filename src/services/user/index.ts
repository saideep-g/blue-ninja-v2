import * as idb from "../db/idb";
import { logger } from "../logging";
import { db } from "../db/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export interface UserSettings {
  grade?: string;
  school?: string;
  preferredLanguage: 'en' | 'te' | 'hi';
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  dailyQuestionCount: number;
  diagnosticQuestionCount: number;
  excludedChapters: string[];
}

export async function getUserProfile(userId: string) {
  try {
    // Try Firestore first for single source of truth if online
    const userDoc = await getDoc(doc(db, 'students', userId));
    if (userDoc.exists() && userDoc.data().profile) {
      // Sync to IDB for offline cache
      await idb.saveUserProfile({ ...userDoc.data().profile, userId });
      return userDoc.data().profile;
    }

    const profile = await idb.getUserProfile(userId);
    if (!profile) {
      // Return defaults
      return {
        userId,
        preferredLanguage: 'en' as const,
        theme: 'system' as const,
        notifications: true,
      };
    }
    return profile;
  } catch (error) {
    logger.error('Error fetching profile:', error);
    // Fallback to IDB on error
    return await idb.getUserProfile(userId);
  }
}

export async function updateUserProfile(userId: string, settings: Partial<UserSettings>) {
  try {
    logger.info('💾 Updating profile...');

    const existingProfile = await idb.getUserProfile(userId) || {
      userId,
      preferredLanguage: 'en' as const,
      theme: 'system' as const,
      notifications: true,
    };

    const updatedProfile = {
      ...existingProfile,
      ...settings,
      updatedAt: Date.now(),
    };

    // Save to IDB
    await idb.saveUserProfile(updatedProfile);

    // Sync to Firestore
    const userRef = doc(db, 'students', userId);
    await setDoc(userRef, { profile: updatedProfile }, { merge: true });

    logger.info('✅ Profile updated to Firestore & IDB');
    return updatedProfile;
  } catch (error) {
    logger.error('❌ Error updating profile:', error);
    throw error;
  }
}
