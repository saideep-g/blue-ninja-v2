import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as profileService from '../services/profile';
import { logger } from '../services/logging';

interface ProfileState {
  userId?: string;
  grade?: string;
  school?: string;
  preferredLanguage: 'en' | 'te' | 'hi';
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, updates: any) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (lang: 'en' | 'te' | 'hi') => void;
  setNotifications: (enabled: boolean) => void;
}

export const useProfileStore = create<ProfileState>(
  persist(
    (set) => ({
      preferredLanguage: 'en',
      theme: 'system',
      notifications: true,
      isLoading: false,
      error: null,

      loadProfile: async (userId) => {
        set({ isLoading: true, userId });
        try {
          const profile = await profileService.getUserProfile(userId);
          set({
            ...profile,
            isLoading: false,
            userId,
          });
          logger.info('✅ Profile loaded');
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to load profile';
          set({
            error: msg,
            isLoading: false,
          });
          logger.error('❌ Error loading profile:', error);
        }
      },

      updateProfile: async (userId, updates) => {
        set({ isLoading: true });
        try {
          const updated = await profileService.updateUserProfile(userId, updates);
          set({
            ...updated,
            isLoading: false,
            error: null,
          });
          logger.info('✅ Profile updated');
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to update profile';
          set({
            error: msg,
            isLoading: false,
          });
          logger.error('❌ Error updating profile:', error);
        }
      },

      setTheme: (theme) => {
        set({ theme });
        logger.debug(`Theme changed to: ${theme}`);
      },

      setLanguage: (lang) => {
        set({ preferredLanguage: lang });
        logger.debug(`Language changed to: ${lang}`);
      },

      setNotifications: (enabled) => {
        set({ notifications: enabled });
        logger.debug(`Notifications: ${enabled ? 'enabled' : 'disabled'}`);
      },
    }),
    {
      name: 'profile-store',
    }
  )
);
