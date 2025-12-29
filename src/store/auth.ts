import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User as FirebaseUser } from 'firebase/auth';
import * as authService from '../services/auth';
import { logger } from '../services/logging';

export interface AuthState {
  user: FirebaseUser | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      signup: async (email, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.signup(email, password, displayName);
          set({ user, isLoading: false });
          logger.info('✅ Signup successful');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Signup failed';
          set({ error: message, isLoading: false });
          logger.error('❌ Signup failed:', error);
          throw error;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.login(email, password);
          set({ user, isLoading: false });
          logger.info('✅ Login successful');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, isLoading: false });
          logger.error('❌ Login failed:', error);
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
          set({ user: null, isLoading: false, error: null });
          logger.info('✅ Logout successful');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Logout failed';
          set({ error: message, isLoading: false });
          logger.error('❌ Logout failed:', error);
          throw error;
        }
      },

      initializeAuth: async () => {
        set({ isLoading: true });
        try {
          const user = await authService.recoverSession();
          set({ user, isLoading: false });
          if (user) {
            logger.info('✅ Session recovered');
          }
        } catch (error) {
          logger.error('❌ Auth initialization error:', error);
          set({ isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: null, // Don't persist user, let Firebase handle it
      }),
    }
  )
);
