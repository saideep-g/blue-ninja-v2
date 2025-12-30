
import { db } from '../../../services/db/firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

export interface TableSettings {
    selectedTables: number[];
    targetAccuracy: number; // e.g., 90
    dailyGoalMinutes: number; // e.g., 10
}

export interface FirestorePracticeLog {
    studentId: string;
    questionId: string;
    table: number;
    multiplier: number;
    type: string;
    isCorrect: boolean;
    timeTaken: number;
    isValidForSpeed?: boolean; // New Flag
    timestamp: any; // ServerTimestamp
}

const COLLECTION_USERS = 'students'; // Reusing 'students' collection from main app
const SUBCOLLECTION_SETTINGS = 'table_settings';
const SUBCOLLECTION_LOGS = 'table_practice_logs';

/**
 * Save Parent Configuration for Tables
 */
export async function saveTableSettings(studentId: string, settings: TableSettings) {
    if (!studentId) return;
    const ref = doc(db, COLLECTION_USERS, studentId, SUBCOLLECTION_SETTINGS, 'config');
    await setDoc(ref, settings, { merge: true });
}

/**
 * Get Parent Configuration for Tables
 */
export async function getTableSettings(studentId: string): Promise<TableSettings | null> {
    if (!studentId) return null;
    const ref = doc(db, COLLECTION_USERS, studentId, SUBCOLLECTION_SETTINGS, 'config');
    const snap = await getDoc(ref);
    if (snap.exists()) {
        return snap.data() as TableSettings;
    }
    return null;
}

/**
 * Save a single practice log immediately
 */
export async function saveSinglePracticeLog(studentId: string, log: Omit<FirestorePracticeLog, 'studentId' | 'timestamp'>) {
    if (!studentId) return;
    const logsCol = collection(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS);
    await addDoc(logsCol, {
        ...log,
        studentId,
        timestamp: serverTimestamp()
    });
}

/**
 * Save a batch of practice logs (Legacy/Bulk Import)
 */
export async function savePracticeSession(studentId: string, logs: Omit<FirestorePracticeLog, 'studentId' | 'timestamp'>[]) {
    if (!studentId) return;

    const logsCol = collection(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS);

    // Serial execution to ensure order roughly or just parallel
    await Promise.all(logs.map(log => addDoc(logsCol, {
        ...log,
        studentId,
        timestamp: serverTimestamp()
    })));
}

/**
 * Get Aggregated Stats for Dashboard
 */
export async function getStudentTableStats(studentId: string) {
    if (!studentId) return [];

    const logsCol = collection(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS);
    // Get all logs for now. In production, we'd use aggregation queries or cloud functions.
    // Assuming < 10,000 logs for a single student for this V1.
    const q = query(logsCol, orderBy('timestamp', 'desc'), limit(1000));
    const snap = await getDocs(q);

    const stats: Record<number, { correct: number, total: number, timeSum: number, speedSamples: number }> = {};

    snap.forEach(doc => {
        const data = doc.data() as FirestorePracticeLog;
        if (!stats[data.table]) stats[data.table] = { correct: 0, total: 0, timeSum: 0, speedSamples: 0 };

        stats[data.table].total++;
        if (data.isCorrect) stats[data.table].correct++;

        // Only count time if valid. Default to valid if undefined (backward compat) unless explicit false.
        // Also check threshold just in case older logs have bad times without flag.
        // Threshold: 30 seconds (30000ms) as requested.
        const isReasonableTime = data.timeTaken < 30000;

        if (data.isValidForSpeed !== false && isReasonableTime && data.isCorrect) {
            stats[data.table].timeSum += data.timeTaken || 0;
            stats[data.table].speedSamples++;
        }
    });

    return Object.entries(stats).map(([table, s]) => ({
        table: parseInt(table),
        accuracy: Math.round((s.correct / s.total) * 100),
        totalAttempts: s.total,
        avgTime: s.speedSamples > 0 ? parseFloat((s.timeSum / s.speedSamples / 1000).toFixed(1)) : 0
    }));
}
