
import { Timestamp } from 'firebase/firestore';

export interface FirestoreUserDocument {
    email: string;
    username: string;
    role: string;
    created_at: Timestamp;
    lastUpdated: Timestamp;
    powerPoints: number;
    heroLevel: number;
    mastery: Record<string, number>;
    hurdles: Record<string, number>;
    currentQuest: string;
    streakCount: number;
    lastMissionDate: string | null;
}

export interface FirestoreQuestionDocument {
    item_id: string;
    bankId: string;
    publishedAt: string;
    metadata: {
        itemId: string;
        templateId: string;
        moduleId: string;
        atomId: string;
        difficulty: number;
        version: string;
    };
    [key: string]: any;
}
