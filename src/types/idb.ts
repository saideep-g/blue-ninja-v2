/**
 * IndexedDB Type Definitions for Blue Ninja v3
 * Database: BlueNinjaDB (8 tables)
 * Powered by: Dexie.js
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: number;
  updatedAt: number;
  offline: boolean;
}

export interface UserProfile {
  userId: string;
  grade?: string;
  school?: string;
  preferredLanguage: 'en' | 'te' | 'hi';
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  updatedAt: number;
}

export interface Question {
  id: string;
  template: string; // 'mcq', 'fill-blank', 'essay', etc.
  subject: string;
  topic: string;
  level: 'easy' | 'medium' | 'hard';
  content: string;
  options?: string[];
  answer: string;
  explanation: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface Assessment {
  id: string;
  userId: string;
  type: 'diagnostic' | 'daily' | 'practice';
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: number;
  completedAt?: number;
  duration: number;
  score?: number;
  answers: Record<string, string>;
  synced: boolean;
}

export interface Progress {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  questionsAttempted: number;
  questionsCorrect: number;
  timeSpent: number; // seconds
  topics: Record<string, { attempted: number; correct: number }>;
  synced: boolean;
}

export interface DailyMission {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mission: string;
  description: string;
  completed: boolean;
  completedAt?: number;
  reward?: number;
  synced: boolean;
}

export interface AdminData {
  id: string;
  key: string;
  value: unknown;
  updatedBy: string;
  updatedAt: number;
  version: number;
}

export interface SyncLog {
  id?: number;
  timestamp: number;
  action: 'upload' | 'download' | 'sync';
  entity: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  recordCount: number;
}
