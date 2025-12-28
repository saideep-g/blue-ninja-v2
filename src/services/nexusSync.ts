/**
 * nexusSync.ts
 * 
 * The Local-First database for Blue Ninja.
 * Stores the entire question bank locally to allow for instant, offline auditing.
 */

import { db } from '../firebase/config';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import Dexie, { Table } from 'dexie';
import { Question } from '../types';

// Define the schema for IndexedDB
interface LocalQuestion extends Question {
    // Add any IndexedDB specific fields if needed, 
    // otherwise it mirrors the Question interface
}

interface LocalLog {
    id?: number; // Auto-incrementing primary key
    questionId: string;
    timestamp: number;
    type: string;
    [key: string]: any; // Allow flexibility for other log props
}

class NexusDatabase extends Dexie {
    questions!: Table<LocalQuestion>;
    logs!: Table<LocalLog>;

    constructor() {
        super('NexusDB');
        this.version(1).stores({
            questions: 'id, atom, module, difficulty, [module+atom]',
            // This MUST be named 'logs' to match nexusValidator.js and NinjaContext.jsx
            logs: '++id, questionId, timestamp, type'
        });
    }
}

export const nexusDB = new NexusDatabase();

/**
 * pullQuestionsFromCloud
 * Fetches all questions from Firestore and populates IndexedDB.
 */
export const pullQuestionsFromCloud = async () => {
    console.log("🌀 Nexus: Pulling questions from Firestore...");
    try {
        const qSnap = await getDocs(collection(db, 'diagnostic_questions'));
        // Cast to LocalQuestion (which extends Question)
        const questions = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LocalQuestion));

        // Clear local and bulk add
        await nexusDB.questions.clear();
        await nexusDB.questions.bulkAdd(questions);

        console.log(`✅ Nexus: ${questions.length} questions cached locally.`);
        return questions.length;
    } catch (error) {
        console.error("❌ Nexus Pull Failed:", error);
        throw error;
    }
};

/**
 * pushQuestionsToCloud
 * Takes all local changes and performs a batched write to Firestore.
 */
export const pushQuestionsToCloud = async () => {
    const localQuestions = await nexusDB.questions.toArray();
    const batch = writeBatch(db);

    console.log(`🚀 Nexus: Pushing ${localQuestions.length} questions to Cloud...`);

    localQuestions.forEach(q => {
        if (!q.id) return; // Skip if no ID
        const qRef = doc(db, 'diagnostic_questions', q.id);
        batch.set(qRef, q);
    });

    try {
        await batch.commit();
        console.log("✅ Nexus: Cloud Sync Complete.");
    } catch (error) {
        console.error("❌ Nexus Push Failed:", error);
        throw error;
    }
};