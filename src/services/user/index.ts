import * as idb from "../db/idb";
import { logger } from "../logging";

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
    throw error;
  }
}

export async function updateUserProfile(userId: string, settings: Partial<UserSettings>) {
  try {
    logger.info('💾 Updating profile...');

    const existingProfile = await idb.getUserProfile(userId);
    const updatedProfile = {
      ...(existingProfile || {
        userId,
        preferredLanguage: 'en' as const,
        theme: 'system' as const,
        notifications: true,
      }),
      ...settings,
      updatedAt: Date.now(),
    };

    await idb.saveUserProfile(updatedProfile);
    logger.info('✅ Profile updated');
    return updatedProfile;
  } catch (error) {
    logger.error('❌ Error updating profile:', error);
    throw error;
  }
}
