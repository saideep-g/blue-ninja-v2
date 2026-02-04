import { Timestamp } from 'firebase/firestore';

/**
 * Exam Mode Configuration
 */
export interface ExamMode {
    enabled: boolean;
    examName: string;
    startDate: string;          // YYYY-MM-DD
    endDate: string;            // YYYY-MM-DD
    focusTopics: {
        [subject: string]: string[];  // Module IDs
    };
    questionMultiplier: number;  // e.g., 1.5 for 50% more questions
    difficultyLevel: 'medium' | 'hard';
}

/**
 * Grade History Entry
 */
export interface GradeHistoryEntry {
    grade: number;
    academicYear: string;       // e.g., "2024-2025"
    startDate: string;          // YYYY-MM-DD
    endDate: string;            // YYYY-MM-DD
    curriculum: string;

    // Overall Stats
    totalQuestions: number;
    totalCorrect: number;
    overallAccuracy: number;    // percentage
    totalTimeSpent: number;     // minutes

    // Subject-wise Performance
    subjectStats: {
        [subject: string]: {
            questionsAnswered: number;
            correctAnswers: number;
            accuracy: number;
            timeSpent: number;
            masteryLevel: number;
        };
    };

    completedAt: Timestamp;
}

/**
 * Grade History Document
 * Firestore Path: students/{studentId}/metrics/gradeHistory
 */
export interface GradeHistoryDocument {
    studentId: string;
    completedGrades: GradeHistoryEntry[];
    lastUpdated: Timestamp;
}

/**
 * Performance Summary for Dashboard
 */
export interface PerformanceSummary {
    // This Week
    thisWeek: {
        questionsAnswered: number;
        correctAnswers: number;
        accuracy: number;
        timeSpent: number;
        streak: number;
    };

    // Subject Performance
    subjects: {
        [subject: string]: {
            accuracy: number;
            questionsAnswered: number;
            trend: 'up' | 'down' | 'stable';
        };
    };

    // Needs Attention
    needsAttention: Array<{
        subject: string;
        reason: string;
        severity: 'high' | 'medium' | 'low';
    }>;
}

/**
 * Chart Data Point
 */
export interface ChartDataPoint {
    date: string;
    value: number;
    label?: string;
}

/**
 * Subject Distribution
 */
export interface SubjectDistribution {
    subject: string;
    questions: number;
    percentage: number;
    color: string;
}

/**
 * Mastery Heatmap Data
 */
export interface MasteryHeatmapData {
    date: string;
    value: number;  // 0-100
    count: number;  // Questions answered
}

/**
 * Helper: Calculate exam readiness score
 */
export function calculateExamReadiness(
    focusTopics: { [subject: string]: string[] },
    moduleStats: any
): number {
    // Simple calculation: average mastery of focus topics
    let totalMastery = 0;
    let count = 0;

    Object.entries(focusTopics).forEach(([subject, modules]) => {
        modules.forEach(moduleId => {
            const mastery = moduleStats?.[subject]?.[moduleId]?.masteryLevel || 0;
            totalMastery += mastery;
            count++;
        });
    });

    return count > 0 ? Math.round(totalMastery / count) : 0;
}

/**
 * Helper: Get difficulty multiplier
 */
export function getDifficultyMultiplier(level: 'medium' | 'hard'): number {
    return level === 'hard' ? 1.3 : 1.0;
}

/**
 * Helper: Calculate total daily questions in exam mode
 */
export function calculateExamModeQuestions(
    baseQuestions: number,
    questionMultiplier: number,
    difficultyMultiplier: number
): number {
    return Math.round(baseQuestions * questionMultiplier * difficultyMultiplier);
}
