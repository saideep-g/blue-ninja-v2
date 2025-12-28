# Phase 1 Complete Execution Guide - Steps 5-10
## Blue Ninja v3 Rebuild

**Status**: Ready for implementation  
**Version**: 1.0 | December 28, 2025  
**Target Completion**: Jan 3-4, 2025  
**Total Time**: 15-20 hours  
**Current Progress**: 40% (Steps 1-4 done, Zustand installed)

---

## 🎯 Quick Summary

**What you have**: Repository structure, TypeScript, Zustand (DONE)  
**What's next**: IndexedDB → Firestore → Auth → Profiles → Theme → Logging  
**Timeline**: 6 days at ~2.5-3 hours per day  
**End Goal**: Solid foundation for Phase 2

---

## 📋 Phase 1 Steps Overview

| # | Step | Duration | Doc | Status |
|---|------|----------|-----|--------|
| 5 | IndexedDB | 3-4 hrs | NEXT_STEPS_STEP5.md | ⏳ Ready |
| 6 | Firestore | 2-3 hrs | This Doc | 🔸 Ready |
| 7 | Authentication | 3-4 hrs | This Doc | 🔸 Ready |
| 8 | User Profiles | 2-3 hrs | This Doc | 🔸 Ready |
| 9 | Theme System | 1-2 hrs | This Doc | 🔸 Ready |
| 10 | Logging | 2-3 hrs | This Doc | 🔸 Ready |
| | **TOTAL** | **15-20 hrs** | | |

---

# STEP 5: IndexedDB Setup with Dexie (Already documented)

**See**: `NEXT_STEPS_STEP5.md` - Complete guide with all code  
**Duration**: 3-4 hours  
**What creates**: 5 files in `src/services/idb/` + type file

**Start here** if you haven't already.

---

# STEP 6: Firestore Optimization

**Duration**: 2-3 hours  
**Goal**: Reduce Firestore read costs by 80%+ using client-side caching  
**Creates**: Service for Firestore operations with IndexedDB cache-first strategy

## 6.1: Firestore Service Setup

**Create**: `src/services/firebase/firestore.ts`

```typescript
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  doc,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { firebaseApp } from './config';
import { getFirestore } from 'firebase/firestore';
import * as idb from '../idb';
import { logger } from '../logging';

const firestore = getFirestore(firebaseApp);

// ===== QUESTIONS SYNC =====

/**
 * Get questions from IndexedDB first, then Firestore if needed
 * Cache-first strategy to minimize reads
 */
export async function getQuestions(filters?: {
  subject?: string;
  topic?: string;
  level?: string;
}): Promise<any[]> {
  try {
    logger.info('📚 Fetching questions...');

    // Try IndexedDB first
    let questions: any[] = [];

    if (filters?.topic) {
      questions = await idb.getQuestionsByTopic(filters.topic);
    } else if (filters?.level) {
      questions = await idb.getQuestionsByLevel(filters.level);
    }

    // If we have cached questions, return them
    if (questions.length > 0) {
      logger.info(`✅ Found ${questions.length} questions in cache`);
      return questions;
    }

    // If online and cache empty, fetch from Firestore
    if (idb.getOnlineStatus()) {
      logger.info('🌐 Fetching from Firestore...');
      const constraints: QueryConstraint[] = [];

      if (filters?.subject) {
        constraints.push(where('subject', '==', filters.subject));
      }
      if (filters?.level) {
        constraints.push(where('level', '==', filters.level));
      }

      const q = query(collection(firestore, 'questions'), ...constraints);
      const snapshot = await getDocs(q);

      questions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Cache in IndexedDB for future use
      if (questions.length > 0) {
        await idb.saveQuestions(questions);
        logger.info(`💾 Cached ${questions.length} questions`);
      }

      return questions;
    }

    logger.warn('⚠️ Offline - no questions cached');
    return [];
  } catch (error) {
    logger.error('❌ Error fetching questions:', error);
    throw error;
  }
}

// ===== ASSESSMENTS SYNC =====

/**
 * Save assessment to IndexedDB immediately
 * Sync to Firestore when online
 */
export async function saveAssessment(assessment: any): Promise<string> {
  try {
    logger.info('💾 Saving assessment...');

    // Save to IndexedDB immediately
    const id = await idb.saveAssessment({
      ...assessment,
      synced: false,
    });

    // Try to sync to Firestore if online
    if (idb.getOnlineStatus()) {
      await syncAssessmentToFirestore(id, assessment);
    }

    return id;
  } catch (error) {
    logger.error('❌ Error saving assessment:', error);
    throw error;
  }
}

async function syncAssessmentToFirestore(id: string, assessment: any) {
  try {
    const docRef = doc(firestore, 'assessments', id);
    await setDoc(docRef, {
      ...assessment,
      synced: true,
      syncedAt: new Date(),
    });

    // Mark as synced in IndexedDB
    await idb.markAsSynced('assessments', [id]);
    logger.info('✅ Assessment synced to Firestore');
  } catch (error) {
    logger.error('⚠️ Could not sync assessment to Firestore:', error);
    // Don't throw - data is safe in IndexedDB
  }
}

// ===== BATCH SYNC =====

/**
 * Sync all unsynced records when coming online
 */
export async function syncUnSyncedRecords(): Promise<void> {
  if (!idb.getOnlineStatus()) {
    logger.warn('🚫 Offline - skipping sync');
    return;
  }

  try {
    logger.info('🔄 Starting batch sync...');
    const unsynced = await idb.getUnSyncedRecords();

    let syncedCount = 0;

    // Sync assessments
    for (const assessment of unsynced.assessments) {
      try {
        await syncAssessmentToFirestore(assessment.id, assessment);
        syncedCount++;
      } catch (error) {
        logger.error(`Failed to sync assessment ${assessment.id}:`, error);
      }
    }

    // Sync progress
    for (const progress of unsynced.progress) {
      try {
        const docRef = doc(firestore, 'progress', progress.id);
        await setDoc(docRef, {
          ...progress,
          synced: true,
          syncedAt: new Date(),
        });
        syncedCount++;
      } catch (error) {
        logger.error(`Failed to sync progress ${progress.id}:`, error);
      }
    }

    logger.info(`✅ Synced ${syncedCount} records to Firestore`);
  } catch (error) {
    logger.error('❌ Batch sync error:', error);
  }
}

// ===== CONFIG =====

export function setupFirestoreSync(): void {
  // Sync periodically
  idb.setupPeriodicSync();

  // Sync when coming online
  window.addEventListener('online', () => {
    syncUnSyncedRecords();
  });
}
```

## 6.2: Verify Firebase Config

**Check**: `src/services/firebase/config.ts` exists and has:

```typescript
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
```

**Make sure** `.env.local` has all these variables:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 6.3: Service Exports

**Update**: `src/services/firebase/index.ts`

```typescript
export { firebaseApp } from './config';
export * from './firestore';
```

## 6.4: Test Firestore Integration

```bash
# No new dependencies needed - Firebase already installed

npm run check-types  # Should pass
npm run lint         # Should pass
npm run dev          # Should start without errors
```

**In browser console**:
```typescript
// Test importing and using
import { getQuestions, setupFirestoreSync } from './services/firebase';

// This should return cached questions or empty array if offline
const questions = await getQuestions({ topic: 'algebra' });
console.log('Questions:', questions);
```

---

# STEP 7: Authentication System

**Duration**: 3-4 hours  
**Goal**: Complete auth flow with login, signup, logout  
**Creates**: Auth service + Zustand store + Protected routes

## 7.1: Authentication Service

**Create**: `src/services/firebase/auth.ts`

```typescript
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from './config';
import * as idb from '../idb';
import { logger } from '../logging';

const auth = getAuth(firebaseApp);

// Enable persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
  logger.error('Error setting persistence:', error);
});

// ===== AUTH STATE MANAGEMENT =====

let currentUser: FirebaseUser | null = null;

export function getCurrentUser(): FirebaseUser | null {
  return currentUser;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, (firebaseUser) => {
    currentUser = firebaseUser;
    callback(firebaseUser);
  });
}

// ===== SIGNUP =====

export async function signup(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  try {
    logger.info('📝 Creating account...');

    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save to IndexedDB
    await idb.saveUser({
      id: user.uid,
      email: user.email || '',
      displayName,
      photoURL: user.photoURL || undefined,
      role: 'student',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      offline: false,
    });

    // Create default profile
    await idb.saveUserProfile({
      userId: user.uid,
      preferredLanguage: 'en',
      theme: 'system',
      notifications: true,
      updatedAt: Date.now(),
    });

    logger.info('✅ Account created successfully');
    return user;
  } catch (error) {
    logger.error('❌ Signup error:', error);
    throw error;
  }
}

// ===== LOGIN =====

export async function login(email: string, password: string): Promise<FirebaseUser> {
  try {
    logger.info('🔑 Logging in...');

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save/update in IndexedDB
    const existingUser = await idb.getUser(user.uid);
    if (existingUser) {
      existingUser.updatedAt = Date.now();
      await idb.saveUser(existingUser);
    } else {
      await idb.saveUser({
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || undefined,
        role: 'student',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        offline: false,
      });
    }

    logger.info('✅ Logged in successfully');
    return user;
  } catch (error) {
    logger.error('❌ Login error:', error);
    throw error;
  }
}

// ===== LOGOUT =====

export async function logout(): Promise<void> {
  try {
    logger.info('👋 Logging out...');
    await signOut(auth);
    currentUser = null;
    logger.info('✅ Logged out successfully');
  } catch (error) {
    logger.error('❌ Logout error:', error);
    throw error;
  }
}

// ===== SESSION RECOVERY =====

export async function recoverSession(): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Update in IndexedDB
        await idb.saveUser({
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || undefined,
          role: 'student',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          offline: false,
        });
      }
      unsubscribe();
      resolve(user);
    });
  });
}
```

## 7.2: Auth Zustand Store

**Create**: `src/store/auth.ts`

```typescript
import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import * as authService from '../services/firebase/auth';
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

export const useAuthStore = create<AuthState>((set) => ({
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
}));
```

## 7.3: Protected Route Component

**Create**: `src/components/ProtectedRoute.tsx`

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'teacher' | 'admin';
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps): React.ReactNode {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role check can be added in Phase 2 when we have user roles
  // For now, just check if user is authenticated

  return children;
}
```

## 7.4: Initialize Auth in App

**Update**: `src/App.tsx` - Add to useEffect:

```typescript
import { useEffect } from 'react';
import { useAuthStore } from './store/auth';

export default function App() {
  const { initializeAuth, isLoading } = useAuthStore();

  useEffect(() => {
    // Recover session on app load
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Rest of component...
}
```

---

# STEP 8: User Profiles

**Duration**: 2-3 hours  
**Goal**: User settings persistence and profile management  
**Creates**: Profile service + Profile store + Settings form

## 8.1: Profile Service

**Create**: `src/services/profile.ts`

```typescript
import * as idb from './idb';
import { logger } from './logging';

export interface UserSettings {
  grade?: string;
  school?: string;
  preferredLanguage: 'en' | 'te' | 'hi';
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
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
```

## 8.2: Profile Zustand Store

**Create**: `src/store/profile.ts`

```typescript
import { create } from 'zustand';
import * as profileService from '../services/profile';

interface ProfileState {
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
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  preferredLanguage: 'en',
  theme: 'system',
  notifications: true,
  isLoading: false,
  error: null,

  loadProfile: async (userId) => {
    set({ isLoading: true });
    try {
      const profile = await profileService.getUserProfile(userId);
      set({
        ...profile,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load profile',
        isLoading: false,
      });
    }
  },

  updateProfile: async (userId, updates) => {
    set({ isLoading: true });
    try {
      const updated = await profileService.updateUserProfile(userId, updates);
      set({ ...updated, isLoading: false, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update profile',
        isLoading: false,
      });
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    // Theme change will be handled in Step 9
  },
}));
```

---

# STEP 9: Theme System

**Duration**: 1-2 hours  
**Goal**: Light/dark theme with system preference detection  
**Creates**: Theme provider + CSS variables

## 9.1: Theme Provider

**Create**: `src/theme/provider.tsx`

```typescript
import React, { useEffect, createContext, useContext } from 'react';
import { useProfileStore } from '../store/profile';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme: setProfileTheme } = useProfileStore();
  const [effectiveTheme, setEffectiveTheme] = React.useState<'light' | 'dark'>('light');

  // Detect system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      const newTheme =
        theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : theme;

      setEffectiveTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);

    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  const value: ThemeContextType = {
    theme: theme as ThemeType,
    effectiveTheme,
    setTheme: async (newTheme: ThemeType) => {
      await setProfileTheme(newTheme);
    },
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

## 9.2: Theme CSS Variables

**Update**: `src/index.css` - Add theme styles:

```css
:root {
  /* Light theme (default) */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-border: #e0e0e0;
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #dbeafe;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease;
}

/* Dark theme */
[data-theme='dark'] {
  --color-bg-primary: #1a1a1a;
  --color-bg-secondary: #2d2d2d;
  --color-text-primary: #ffffff;
  --color-text-secondary: #b0b0b0;
  --color-border: #404040;
  --color-primary: #3b82f6;
  --color-primary-hover: #60a5fa;
  --color-primary-light: #1e3a8a;
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-error: #f87171;
}

body {
  font-family: var(--font-family);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: background-color var(--transition-normal),
              color var(--transition-normal);
}
```

## 9.3: Update App with Theme

**Update**: `src/App.tsx`:

```typescript
import { ThemeProvider } from './theme/provider';

export default function App() {
  return (
    <ThemeProvider>
      {/* Rest of your app */}
    </ThemeProvider>
  );
}
```

---

# STEP 10: Logging System

**Duration**: 2-3 hours  
**Goal**: Comprehensive debug logging with levels  
**Creates**: Logger service + Log viewer component

## 10.1: Logger Service

**Create**: `src/services/logging/index.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 500;
  private isDev = import.meta.env.DEV;

  private log(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    if (data instanceof Error) {
      entry.stack = data.stack;
    }

    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in dev
    if (this.isDev) {
      const style = this.getConsoleStyle(level);
      console.log(`%c[${level.toUpperCase()}] ${message}`, style, data);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #888; font-weight: normal;',
      info: 'color: #2563eb; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;',
    };
    return styles[level];
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return this.logs;
    return this.logs.filter((log) => log.level === level);
  }

  getRecent(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  clear() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();

// Global error handler
window.addEventListener('error', (event) => {
  logger.error('Uncaught error:', event.error);
});

// Global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason);
});
```

## 10.2: Log Viewer Component

**Create**: `src/components/LogViewer.tsx`

```typescript
import React, { useState } from 'react';
import { logger } from '../services/logging';

export function LogViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const logs = filterLevel
    ? logger.getLogs(filterLevel as any)
    : logger.getRecent(50);

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-4 py-2 rounded shadow-lg"
      >
        {isOpen ? '✕ Close Logs' : '📋 Show Logs'}
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded shadow-lg w-96 max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 p-3 flex gap-2 flex-wrap">
            {['debug', 'info', 'warn', 'error'].map((level) => (
              <button
                key={level}
                onClick={() =>
                  setFilterLevel(filterLevel === level ? null : level)
                }
                className={`px-2 py-1 rounded text-sm ${
                  filterLevel === level
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                {level}
              </button>
            ))}
            <button
              onClick={() => logger.clear()}
              className="px-2 py-1 rounded text-sm bg-red-500 text-white"
            >
              Clear
            </button>
          </div>

          <div className="p-3 font-mono text-xs space-y-1">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`p-1 rounded ${
                  log.level === 'error'
                    ? 'bg-red-100 dark:bg-red-900'
                    : log.level === 'warn'
                      ? 'bg-yellow-100 dark:bg-yellow-900'
                      : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <span className="text-gray-500">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                {' '}
                <span className="font-bold">[{log.level}]</span>
                {' '}
                {log.message}
                {log.data && (
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    {JSON.stringify(log.data).substring(0, 100)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 10.3: Add LogViewer to App

**Update**: `src/App.tsx`:

```typescript
import { LogViewer } from './components/LogViewer';

export default function App() {
  return (
    <>
      {/* Your app content */}
      <LogViewer />
    </>
  );
}
```

---

# ✅ Phase 1 Completion Checklist

After all 10 steps:

## Infrastructure
- [ ] TypeScript: 100%, strict mode, zero 'any'
- [ ] All npm dependencies installed
- [ ] All `.env.local` variables set
- [ ] Folder structure matches architecture

## Data Layer
- [ ] IndexedDB database working (Dexie)
- [ ] Firestore optimization implemented
- [ ] Sync logic handles online/offline

## Authentication
- [ ] Signup works
- [ ] Login works
- [ ] Logout works
- [ ] Session persists on reload
- [ ] Protected routes working

## User Experience
- [ ] Profile settings save
- [ ] Theme switching works
- [ ] Light/dark modes render correctly
- [ ] Logging system working

## Code Quality
- [ ] `npm run check-types` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] No console errors/warnings

## Testing
- [ ] Create test user account
- [ ] Login with test account
- [ ] Change theme
- [ ] Close browser, reopen
- [ ] Data persists
- [ ] Go offline, change app
- [ ] Come online, sync works

---

# 📝 Commit Messages

Use these commit messages for each step:

```bash
# Step 5
git commit -m "feat: Step 5 - IndexedDB setup with Dexie

- Initialize BlueNinjaDB with 8 tables
- Create CRUD operations for all entities
- Implement online/offline sync logic
- Add Zod validation schemas"

# Step 6
git commit -m "feat: Step 6 - Firestore optimization

- Implement cache-first read strategy
- Batch sync for unsynced records
- Reduce Firestore reads by caching"

# Step 7
git commit -m "feat: Step 7 - Authentication system

- Firebase auth (signup/login/logout)
- Session recovery on app load
- Zustand auth store
- Protected routes component"

# Step 8
git commit -m "feat: Step 8 - User profiles

- Profile settings persistence
- User preferences (language, theme, notifications)
- Profile Zustand store"

# Step 9
git commit -m "feat: Step 9 - Theme system

- Light/dark theme switching
- System preference detection
- Theme provider with context
- CSS custom properties for theming"

# Step 10
git commit -m "feat: Step 10 - Logging system

- Logger service with levels (debug/info/warn/error)
- Log viewer component for dev
- Global error/rejection handlers
- Log persistence in memory"
```

---

# 🎯 Phase 1 Summary

**What you'll have**:
✅ 100% TypeScript application  
✅ IndexedDB offline-first database  
✅ Firestore optimization with caching  
✅ Complete authentication  
✅ User profiles & preferences  
✅ Theme system  
✅ Logging infrastructure  

**Ready for**: Phase 2 (Questions, Assessments, Dashboards)

**Total Time**: 15-20 hours  
**Recommended Pace**: 2.5-3 hours/day over 6 days

---

**Next**: After completing Phase 1, start Phase 2 execution guide

**Version**: 1.0 | Ready for Implementation  
**Last Updated**: December 28, 2025
