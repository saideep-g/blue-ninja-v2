
export interface SimplifiedQuestion {
    id?: string; // Optional for upload, assigned by Firestore
    question: string; // Supports LaTeX/KaTeX
    options: string[]; // List of options
    answer: string; // The correct option text
    difficulty: 'easy' | 'medium' | 'hard';
    explanation?: string; // Optional explanation

    // Metadata for tracking
    timeLimit?: number; // Optional custom time limit in seconds
    chapter_id?: string; // Optional chapter identifier
}

export interface QuestionBundleMetadata {
    id: string; // Firestore Doc ID
    title: string;
    description?: string;
    subject: string; // 'math', 'science', etc.
    grade: number; // 1, 2, 7, etc.
    questionCount: number;
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
    isActive: boolean;
}

export interface QuestionBundle {
    metadata: QuestionBundleMetadata;
    questions?: SimplifiedQuestion[]; // Fetched from sub-collection
}
