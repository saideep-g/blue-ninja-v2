import { Timestamp } from 'firebase/firestore';

/**
 * Student Profile - Main configuration document
 * Firestore Path: students/{studentId}
 */
export interface StudentProfile {
    // Basic Info (from auth + admin config)
    studentId: string;
    studentName: string;        // From auth (displayName or email)
    email: string;              // From auth
    grade: number;              // 1-12
    curriculum: 'CBSE' | 'Telangana State Board';

    // Interface Preference
    preferredLayout: 'mobile-quest-v1' | 'study-era';

    // Subject Enrollment
    enrolledSubjects: string[];  // ['math', 'science', 'english', 'social', 'vocabulary', 'gk', 'reasoning']

    // Practice Settings
    dailyQuestionConfig: {
        weekday: number;    // default: 20
        weekend: number;    // default: 25
        holiday: number;    // default: 30
    };

    // Phase 2: Module Management
    enabledModules?: {
        [subject: string]: {
            [moduleId: string]: {
                enabled: boolean;
                enabledDate: string;
                scheduledDate?: string;
            };
        };
    };

    // Phase 2: Boost Periods
    boostPeriods?: Array<{
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        subjectBoosts: {
            [subject: string]: number;
        };
        active: boolean;
    }>;

    // Phase 3: Exam Mode
    examMode?: {
        enabled: boolean;
        examName: string;
        startDate: string;
        endDate: string;
        focusTopics: {
            [subject: string]: string[];
        };
        questionMultiplier: number;
        difficultyLevel: 'medium' | 'hard';
    };

    // Metadata
    lastActive?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Student Metrics - Performance tracking
 * Firestore Path: students/{studentId}/metrics/current
 */
export interface StudentMetrics {
    studentId: string;

    // Streak Tracking
    currentStreak: number;
    longestStreak: number;
    lastPracticeDate: string;  // YYYY-MM-DD

    // Weekly Stats
    weeklyStats: {
        questionsAnswered: number;
        correctAnswers: number;
        accuracy: number;      // percentage
        timeSpent: number;     // minutes
    };

    // Subject Performance
    subjectStats: {
        [subject: string]: {
            totalQuestions: number;
            correctAnswers: number;
            accuracy: number;
            lastPracticed: string;  // YYYY-MM-DD
        };
    };

    // Metadata
    lastUpdated: Timestamp;
}

/**
 * Combined view for admin UI
 */
export interface StudentWithMetrics extends StudentProfile {
    metrics?: StudentMetrics;
}

/**
 * Form data for student profile updates
 */
export interface StudentProfileUpdateData {
    grade?: number;
    curriculum?: 'CBSE' | 'Telangana State Board';
    preferredLayout?: 'mobile-quest-v1' | 'study-era';
    enrolledSubjects?: string[];
    dailyQuestionConfig?: {
        weekday: number;
        weekend: number;
        holiday: number;
    };
}

/**
 * Available subjects
 */
export const CURRICULUM_SUBJECTS = [
    { id: 'math', name: 'Mathematics', icon: '📐', category: 'curriculum' },
    { id: 'science', name: 'Science', icon: '🔬', category: 'curriculum' },
    { id: 'english', name: 'English', icon: '📚', category: 'curriculum' },
    { id: 'social', name: 'Social Studies', icon: '🏛️', category: 'curriculum' }
] as const;

export const SUPPLEMENTAL_SUBJECTS = [
    { id: 'vocabulary', name: 'Vocabulary', icon: '📖', category: 'supplemental' },
    { id: 'gk', name: 'General Knowledge', icon: '🌍', category: 'supplemental' },
    { id: 'reasoning', name: 'Reasoning', icon: '🧠', category: 'supplemental' }
] as const;

export const ALL_SUBJECTS = [...CURRICULUM_SUBJECTS, ...SUPPLEMENTAL_SUBJECTS];

/**
 * Grade options
 */
export const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `Grade ${i + 1}`
}));

/**
 * Curriculum options
 */
export const CURRICULUM_OPTIONS = [
    { value: 'CBSE', label: 'CBSE' },
    { value: 'Telangana State Board', label: 'Telangana State Board' }
] as const;

/**
 * Layout options
 */
export const LAYOUT_OPTIONS = [
    {
        value: 'mobile-quest-v1',
        label: 'Mobile Quest',
        description: 'Gamified experience (recommended for younger students)',
        icon: '🎮'
    },
    {
        value: 'study-era',
        label: 'Study Era',
        description: 'Subject-based navigation (recommended for older students)',
        icon: '📚'
    }
] as const;
