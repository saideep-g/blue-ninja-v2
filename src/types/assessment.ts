/**
 * Assessment Types for Blue Ninja v3
 * 
 * This module defines all TypeScript types for diagnostic assessments,
 * including assessment creation, question tracking, answer submission,
 * and result generation.
 * 
 * @module types/assessment
 */

import type { Question } from './questions';

/**
 * Assessment status enumeration
 */
export enum AssessmentStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

/**
 * Skill level classification
 */
export enum SkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

/**
 * Configuration for creating diagnostic assessments
 */
export interface DiagnosticAssessmentConfig {
  userId: string;
  grade: string;
  subject?: string;
  topic?: string;
  easyCount?: number;     // Default: 3
  mediumCount?: number;   // Default: 3
  hardCount?: number;     // Default: 3
}

/**
 * Question record within an assessment
 * Tracks a specific question assigned to the assessment
 */
export interface AssessmentQuestion {
  id: string;
  questionId: string;
  question: Question;
  assignedAt: number;     // timestamp
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: 'PENDING' | 'ANSWERED' | 'SKIPPED';
}

/**
 * User's answer to a question in the assessment
 */
export interface AssessmentAnswer {
  questionId: string;
  userAnswer: any;        // Can be string, number, array, etc. depending on question type
  submittedAt: number;    // timestamp
  isCorrect: boolean;     // Calculated after submission
  pointsEarned: number;   // Points awarded for this answer
  explanation?: string;   // Why the answer is correct/incorrect
}

/**
 * Main Assessment entity
 * Represents a diagnostic assessment instance
 */
export interface Assessment {
  id: string;                                    // Unique assessment ID (uuid)
  userId: string;                                 // Student who took the assessment
  type: 'DIAGNOSTIC' | 'PRACTICE' | 'BENCHMARK'; // Assessment type
  status: AssessmentStatus;                      // Current status
  questions: AssessmentQuestion[];               // Questions in this assessment
  answers: AssessmentAnswer[];                   // Answers submitted
  config: DiagnosticAssessmentConfig;           // Configuration used
  createdAt: number;                            // timestamp
  startedAt?: number;                           // When student started (timestamp)
  completedAt?: number;                         // When student submitted (timestamp)
  duration?: number;                            // Duration in milliseconds
}

/**
 * Assessment score breakdown
 */
export interface AssessmentScore {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  totalPoints: number;      // Total possible points
  pointsEarned: number;     // Points earned by student
  percentage: number;       // Score as percentage (0-100)
  accuracy: number;         // Accuracy as decimal (0-1)
}

/**
 * Assessment result recommendations
 */
export interface AssessmentRecommendation {
  skillLevel: SkillLevel;
  summary: string;          // Short summary (1-2 sentences)
  strengths: string[];      // Topics/areas where student did well
  weaknesses: string[];     // Topics/areas where student struggled
  nextSteps: string[];      // Recommended actions
  topicsToFocus: string[];  // Specific topics to practice
}

/**
 * Complete assessment results
 * Generated after assessment completion
 */
export interface AssessmentResults {
  assessmentId: string;
  userId: string;
  score: AssessmentScore;
  skillLevel: SkillLevel;
  recommendation: AssessmentRecommendation;
  detailedAnalysis: {
    easyAccuracy: number;   // % correct on easy questions
    mediumAccuracy: number; // % correct on medium questions
    hardAccuracy: number;   // % correct on hard questions
    timeTaken: number;      // milliseconds
    averageTimePerQuestion: number; // milliseconds
  };
  generatedAt: number;      // timestamp
}

/**
 * Assessment question with metadata
 * Used in database queries
 */
export interface AssessmentQuestionRecord {
  id: string;
  assessmentId: string;
  questionId: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  sequenceNumber: number;  // Order in assessment
  createdAt: number;
}

/**
 * Assessment answer record
 * Used in database storage
 */
export interface AssessmentAnswerRecord {
  id: string;
  assessmentId: string;
  questionId: string;
  userAnswer: any;
  isCorrect: boolean;
  pointsEarned: number;
  submittedAt: number;
  timeSpentMs: number;
}

/**
 * Assessment progress tracking
 */
export interface AssessmentProgress {
  assessmentId: string;
  userId: string;
  totalQuestions: number;
  answeredQuestions: number;
  currentProgress: number;  // 0-100
  estimatedTimeRemaining: number; // milliseconds
  lastAnsweredAt: number;   // timestamp
}

/**
 * Assessment statistics for analytics
 */
export interface AssessmentStats {
  assessmentId: string;
  userId: string;
  duration: number;         // milliseconds
  accuracy: number;         // 0-1
  skillLevel: SkillLevel;
  easyScore: number;       // percentage
  mediumScore: number;     // percentage
  hardScore: number;       // percentage
  completedAt: number;     // timestamp
  improvementArea: string; // Topic to focus on
}
