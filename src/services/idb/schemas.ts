import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  role: z.enum(['student', 'teacher', 'admin']),
  createdAt: z.number(),
  updatedAt: z.number(),
  offline: z.boolean(),
});

// UserProfile schema
export const userProfileSchema = z.object({
  userId: z.string(),
  grade: z.string().optional(),
  school: z.string().optional(),
  preferredLanguage: z.enum(['en', 'te', 'hi']),
  theme: z.enum(['light', 'dark', 'system']),
  notifications: z.boolean(),
  updatedAt: z.number(),
});

// Question schema
export const questionSchema = z.object({
  id: z.string(),
  template: z.string(),
  subject: z.string(),
  topic: z.string(),
  level: z.enum(['easy', 'medium', 'hard']),
  content: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string(),
  explanation: z.string(),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number(),
});

// Assessment schema
export const assessmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['diagnostic', 'daily', 'practice']),
  status: z.enum(['in_progress', 'completed', 'abandoned']),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  duration: z.number(),
  score: z.number().optional(),
  answers: z.record(z.string()),
  synced: z.boolean(),
});

// Progress schema
export const progressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  questionsAttempted: z.number(),
  questionsCorrect: z.number(),
  timeSpent: z.number(),
  topics: z.record(z.object({ attempted: z.number(), correct: z.number() })),
  synced: z.boolean(),
});

// DailyMission schema
export const dailyMissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  mission: z.string(),
  description: z.string(),
  completed: z.boolean(),
  completedAt: z.number().optional(),
  reward: z.number().optional(),
  synced: z.boolean(),
});

// Validation helpers
export function validateUser(data: unknown) {
  return userSchema.parse(data);
}

export function validateQuestion(data: unknown) {
  return questionSchema.parse(data);
}

export function validateAssessment(data: unknown) {
  return assessmentSchema.parse(data);
}
