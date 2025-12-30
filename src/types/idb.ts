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
  template: string;
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
  date: string;
  questionsAttempted: number;
  questionsCorrect: number;
  timeSpent: number;
  topics: Record<string, { attempted: number; correct: number }>;
  synced: boolean;
}

export interface DailyMission {
  id: string;
  userId: string;
  date: string;
  type: 'SOLVE_QUESTIONS' | 'LEARN' | 'PRACTICE' | 'CHALLENGE';
  status: 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  title: string;
  description: string;
  instruction: string;
  questionCount?: number;
  targetScore?: number;
  questions?: any[];
  pointsReward: number;
  questionsCompleted?: number;
  completedQuestionIds?: string[];
  currentScore?: number;
  startedAt?: number;
  completedAt?: number;
  timeSpentMs?: number;
  synced: boolean;
  createdAt?: number;
  expiresAt?: number;
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

export interface Streak {
  id: string; // userId
  userId: string;
  current: number;
  longest: number;
  startDate: string;
  lastMissionDate: string;
  totalMissionsCompleted: number;
  totalPoints: number;
  badges: string[]; // Badge Types
  updatedAt: number;
}

export interface Badge {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: number;
}

export interface MissionCompletion {
  id: string;
  userId: string;
  missionId: string;
  date: string;
  timeSpentMs: number;
  pointsEarned: number;
  completedAt: number;
  accuracy?: number;
}
