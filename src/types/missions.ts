/**
 * Daily Missions Types for Blue Ninja v3
 * 
 * This module defines all TypeScript types for daily missions system,
 * including mission creation, completion tracking, streaks, and badges.
 * 
 * @module types/missions
 */

/**
 * Mission difficulty level
 */
export enum MissionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

/**
 * Mission status
 */
export enum MissionStatus {
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

/**
 * Badge type for achievements
 */
export enum BadgeType {
  FIRST_MISSION = 'FIRST_MISSION',           // Completed first mission
  WEEK_STREAK = 'WEEK_STREAK',               // 7 day streak
  MONTH_STREAK = 'MONTH_STREAK',             // 30 day streak
  PERFECT_DAY = 'PERFECT_DAY',               // Completed all 5 missions
  HARD_CHAMPION = 'HARD_CHAMPION',           // Completed 10 hard missions
  SPEED_RUNNER = 'SPEED_RUNNER',             // Completed mission in <2 minutes
  CONSISTENCY = 'CONSISTENCY',               // 50 missions completed
  MASTER = 'MASTER',                        // 100 missions completed
}

/**
 * Single daily mission
 */
export interface Mission {
  id: string;                              // Unique mission ID (uuid)
  userId: string;                          // Student ID
  date: string;                            // Date (YYYY-MM-DD)
  type: 'SOLVE_QUESTIONS' | 'LEARN' | 'PRACTICE' | 'CHALLENGE';
  status: MissionStatus;                   // Current status
  difficulty: MissionDifficulty;           // Difficulty level
  title: string;                           // Mission title
  description: string;                     // Mission description
  instruction: string;                     // What to do
  
  // Requirements
  questionCount?: number;                  // Number of questions to answer
  targetScore?: number;                    // Target percentage (0-100)
  topicId?: string;                        // Specific topic
  
  // Progress
  questionsCompleted?: number;              // Questions answered so far
  currentScore?: number;                    // Current percentage
  startedAt?: number;                       // When student started (timestamp)
  completedAt?: number;                     // When completed (timestamp)
  timeSpentMs?: number;                     // Time spent in milliseconds
  
  // Rewards
  pointsReward: number;                    // Points awarded on completion
  experience?: number;                      // XP awarded
  
  createdAt: number;                       // When mission created (timestamp)
  expiresAt?: number;                      // When mission expires (timestamp)
}

/**
 * Daily missions batch for a specific date
 */
export interface DailyMissionBatch {
  id: string;                              // Batch ID
  userId: string;                          // Student ID
  date: string;                            // Date (YYYY-MM-DD)
  missions: Mission[];                     // Array of 5 missions
  generatedAt: number;                     // When batch was generated (timestamp)
  completedCount: number;                  // Number of completed missions
  totalPoints: number;                     // Total points possible
  earnedPoints: number;                    // Points earned so far
}

/**
 * Streak tracking
 */
export interface Streak {
  id: string;                              // Streak ID (usually userId)
  userId: string;                          // Student ID
  current: number;                         // Current streak length (days)
  longest: number;                         // Longest streak (days)
  startDate?: string;                      // Current streak start date (YYYY-MM-DD)
  lastMissionDate?: string;                // Last date with completed mission (YYYY-MM-DD)
  totalMissionsCompleted: number;          // Total missions ever completed
  totalPoints: number;                     // Total points from all missions
  badges: BadgeType[];                     // Earned badges
  updatedAt: number;                       // Last update timestamp
}

/**
 * Badge achievement record
 */
export interface Badge {
  id: string;                              // Badge ID
  userId: string;                          // Student ID
  type: BadgeType;                         // Badge type
  title: string;                           // Display title
  description: string;                     // What it means
  icon: string;                            // Icon emoji or class
  earnedAt: number;                        // When earned (timestamp)
}

/**
 * Mission completion record
 */
export interface MissionCompletion {
  id: string;                              // Completion ID
  userId: string;                          // Student ID
  missionId: string;                       // Mission ID
  date: string;                            // Completion date (YYYY-MM-DD)
  timeSpentMs: number;                     // Time spent
  pointsEarned: number;                    // Points earned
  completedAt: number;                     // Completion timestamp
  accuracy?: number;                       // Accuracy percentage
  questions?: Array<{                      // Questions answered
    questionId: string;
    isCorrect: boolean;
  }>;
}

/**
 * Mission statistics for tracking
 */
export interface MissionStats {
  userId: string;                          // Student ID
  totalMissionsAvailable: number;          // Total missions this period
  totalCompleted: number;                  // Completed count
  totalInProgress: number;                 // In progress count
  totalFailed: number;                     // Failed count
  completionRate: number;                  // Percentage completed
  currentStreak: number;                   // Current day streak
  longestStreak: number;                   // Longest streak
  totalPoints: number;                     // Total points earned
  averageCompletionTime: number;           // Avg time in milliseconds
  favoriteType: string;                    // Most completed mission type
  lastUpdate: number;                      // Last update timestamp
}

/**
 * Configuration for mission generation
 */
export interface MissionGenerationConfig {
  userId: string;
  date: string;                            // YYYY-MM-DD
  missionCount?: number;                   // Default: 5
  difficulty?: MissionDifficulty;          // Mix difficulties if not specified
  topics?: string[];                       // Specific topics to include
  gradeLevel?: string;                     // Grade/level filter
}

/**
 * Mission template for generation
 */
export interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  type: 'SOLVE_QUESTIONS' | 'LEARN' | 'PRACTICE' | 'CHALLENGE';
  difficulty: MissionDifficulty;
  defaultQuestionCount: number;
  defaultTargetScore: number;              // Target accuracy percentage
  pointsReward: number;
  instructions: string;
  icon: string;
}
