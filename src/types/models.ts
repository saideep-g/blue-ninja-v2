import { SelectionRationale } from './analytics';

export interface User {
    id: string;
    email: string;
    username: string;
    role: "STUDENT" | "ADMIN" | "TEACHER" | "PARENT";
    createdAt: string | Date;
    updatedAt: string | Date;
    profile: UserProfile;
}

export interface UserProfile {
    class: 2 | 3 | 4 | 5 | 6 | 7 | 8;
    theme: "light" | "dark";
    dailyQuestionCount: number; // 1-15
    diagnosticQuestionCount: number; // 1-30
    excludedChapters: string[];
    layout?: "default" | "mobile-quest-v1" | "study-era";
    enrolledSubjects?: string[]; // IDs like 'math', 'science'
}

export interface QuestionOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface Question {
    id: string;
    questionId?: string; // Legacy/Duplicate support
    curriculum_version: "v3" | string;
    subject: string;
    topic: string;
    chapter: string;
    difficulty: "easy" | "medium" | "hard" | number;
    type: string; // Template type
    question_text: string; // The prompt
    options: QuestionOption[];
    correct_answer: string;
    explanation?: string;
    created_at?: string | Date;
    updated_by?: string;

    // Legacy/Support fields
    atom?: string;
    atom_id?: string;
    template_id?: string;
    module_id?: string;
    item_id?: string;
    content?: {
        prompt?: {
            text?: string;
            latex?: string;
            instruction?: string; // Added instruction
        };
        interaction?: any;
        instruction?: string; // alternate location
    };
    metadata?: {
        missionId?: string;
        phase?: string;
        selectionRationale?: SelectionRationale;
        [key: string]: any;
    };
    answerKey?: any; // Legacy/V2 support
    workedSolution?: any; // Legacy/V2 support
}

export interface NinjaStats {
    powerPoints: number;
    heroLevel: number;
    mastery: Record<string, number>;
    hurdles: Record<string, number>;
    consecutiveBossSuccesses: Record<string, number>;
    completedMissions: number;
    currentQuest: string;
    streakCount: number;
    lastMissionDate: string | null;
    activityLog?: string[]; // Array of YYYY-MM-DD strings indicating active practice days

    // Configuration
    layout?: "default" | "mobile-quest-v1" | "study-era";
    enrolledSubjects?: string[]; // IDs like 'math', 'science'
    profile?: UserProfile;
    username?: string;
    email?: string;
}

export interface QuestionLog {
    id?: string;
    questionId: string;
    studentAnswer: string | number | any;
    isCorrect: boolean;
    isRecovered?: boolean;
    recoveryVelocity?: number;
    diagnosticTag?: string;
    timeSpent?: number;
    cappedThinkingTime?: number;
    speedRating?: string;
    masteryBefore?: number;
    masteryAfter?: number;
    masteryDelta?: number;
    atomId?: string;
    mode?: string;
    timestamp?: any; // Firestore timestamp
    studentId?: string;
    isSuccess?: boolean;
    syncedAt?: number;
    selectionRationale?: SelectionRationale;
}
