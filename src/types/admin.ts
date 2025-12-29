/**
 * Admin Dashboard Types
 * Defines types for admin analytics, student management, question management, and reporting
 */

/**
 * Admin Analytics - System-wide statistics and metrics
 */
export interface AdminAnalytics {
  totalStudents: number;
  activeStudents: number; // Last 7 days
  totalQuestions: number;
  averageAccuracy: number; // Percentage
  totalMissionsCompleted: number;
  mostPopularTopics: TopicPopularity[];
  successRateByDifficulty: DifficultyStats[];
  lastUpdated: Date;
}

/**
 * Topic Popularity - Most used topics in assessments
 */
export interface TopicPopularity {
  topic: string;
  count: number;
  accuracy: number;
  lastUsed: Date;
}

/**
 * Difficulty Statistics - Performance metrics by difficulty level
 */
export interface DifficultyStats {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  totalAttempts: number;
  correctAttempts: number;
  successRate: number; // Percentage
  averageTime: number; // Seconds
}

/**
 * Student Information - Admin view of student data
 */
export interface StudentInfo {
  id: string;
  email: string;
  name: string;
  grade: string;
  lastLogin: Date;
  totalAssessments: number;
  averageScore: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  createdAt: Date;
  progressSummary: {
    currentLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    totalMissions: number;
    streak: number;
    totalPoints: number;
  };
}

/**
 * Question Statistics - Usage and performance metrics for questions
 */
export interface QuestionStats {
  id: string;
  statement: string;
  type: string;
  difficulty: string;
  subject: string;
  topic: string;
  atom?: string; // Smallest unit of concept
  misconceptions?: string[]; // Tagged misconceptions
  distractors?: string[]; // Wrong answer choices
  conceptualGap?: string; // Identified gap (if any)
  timesUsed: number;
  correctAttempts: number;
  totalAttempts: number;
  accuracy: number; // Percentage
  averageTime: number; // Seconds
  createdAt: Date;
  lastUsed: Date;
}

export interface IntelligenceAction {
  id: string;
  type: 'GAP_FILL' | 'REMEDIAL' | 'EXTENSION';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  targetAtom?: string;
  suggestedTemplate?: string;
  reasoning: string;
}

/**
 * Student Progress Report - Detailed analytics for individual student
 */
export interface StudentProgressReport {
  studentId: string;
  studentName: string;
  reportDate: Date;
  periodStart: Date;
  periodEnd: Date;
  assessmentStats: {
    totalCompleted: number;
    averageScore: number;
    skillLevelProgression: {
      date: Date;
      level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    }[];
  };
  missionStats: {
    totalCompleted: number;
    completionRate: number;
    currentStreak: number;
    totalPoints: number;
    badgesEarned: number;
  };
  topicPerformance: {
    topic: string;
    accuracy: number;
    totalQuestions: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  recommendations: string[];
}

/**
 * Topic Performance Report - Analytics for specific topic across all students
 */
export interface TopicPerformanceReport {
  topic: string;
  reportDate: Date;
  totalStudents: number;
  averageAccuracy: number;
  difficultyBreakdown: DifficultyStats[];
  commonMistakes: {
    questionId: string;
    errorPattern: string;
    frequency: number;
  }[];
  successFactors: string[];
}

/**
 * Mission Completion Report - Analytics on daily mission system
 */
export interface MissionCompletionReport {
  reportDate: Date;
  totalStudents: number;
  completedToday: number;
  completionRate: number; // Percentage
  averagePointsEarned: number;
  streakDistribution: {
    range: string; // "1-7", "8-14", "15-30", "30+"
    count: number;
  }[];
  popularMissionTypes: {
    type: string;
    completionRate: number;
  }[];
}

/**
 * Assessment Statistics Report - System-wide assessment analytics
 */
export interface AssessmentStatsReport {
  reportDate: Date;
  totalAssessments: number;
  averageScore: number;
  skillLevelDistribution: {
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    count: number;
    percentage: number;
  }[];
  difficultyAnalysis: DifficultyStats[];
  timeAnalysis: {
    averageTimePerQuestion: number;
    fastestCompletion: number;
    slowestCompletion: number;
  };
}

/**
 * Admin Action Log - Track admin operations
 */
export interface AdminActionLog {
  id: string;
  adminId: string;
  action: 'RESET_STUDENT' | 'DELETE_QUESTION' | 'BLOCK_STUDENT' | 'BULK_UPLOAD' | 'GENERATE_REPORT';
  targetId?: string; // Student ID or Question ID
  timestamp: Date;
  details: Record<string, any>;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

/**
 * Bulk Upload Result - Results from bulk question upload
 */
export interface BulkUploadResult {
  id: string;
  uploadDate: Date;
  totalAttempted: number;
  successfullyAdded: number;
  failed: number;
  errors: {
    rowNumber: number;
    reason: string;
  }[];
  summary: {
    addedByType: Record<string, number>;
    addedByDifficulty: Record<string, number>;
  };
}

/**
 * Admin Dashboard Data - Aggregated data for dashboard display
 */
export interface AdminDashboardData {
  analytics: AdminAnalytics;
  recentActions: AdminActionLog[];
  studentList: StudentInfo[];
  questionStats: QuestionStats[];
  alerts: AdminAlert[];
}

/**
 * Admin Alert - Issues or metrics requiring admin attention
 */
export interface AdminAlert {
  id: string;
  type: 'HIGH_FAILURE_RATE' | 'INACTIVE_STUDENTS' | 'LOW_ENGAGEMENT' | 'DATA_SYNC_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  affectedCount: number;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Admin Filter Options - For searching and filtering data
 */
export interface AdminFilterOptions {
  searchTerm?: string;
  grade?: string;
  status?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'name' | 'lastLogin' | 'score' | 'missionsCompleted';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

/**
 * Pagination Meta - For paginated results
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}
