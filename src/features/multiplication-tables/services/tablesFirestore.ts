
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
    Timestamp,
    updateDoc,
    increment
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

export interface QuestionStats {
    correct: number;
    total: number;
    timeSum: number;
    speedSamples: number;
    accuracy: number;
    avgTime: number;
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

    // Sync with Main Dashboard Daily Progress
    try {
        const studentRef = doc(db, COLLECTION_USERS, studentId);
        await updateDoc(studentRef, {
            'daily.Tables': increment(logs.length),
            lastActive: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to sync daily tables progress", e);
    }
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

        if (data.isValidForSpeed !== false && isReasonableTime) {
            stats[data.table].timeSum += data.timeTaken || 0;
            stats[data.table].speedSamples++;
        }
    });

    return Object.entries(stats).map(([table, s]) => {
        let avgTime = 0;
        if (s.speedSamples > 0 && s.timeSum > 0) {
            avgTime = parseFloat((s.timeSum / s.speedSamples / 1000).toFixed(1));
        }

        return {
            table: parseInt(table),
            accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
            totalAttempts: s.total,
            avgTime
        };
    });
}

/**
 * Get Detailed Question Stats (Table x Multiplier)
 * Returns a map: Table -> Multiplier -> { stats }
 */
export async function getDetailedTableStats(studentId: string) {
    if (!studentId) return {};

    const logsCol = collection(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS);
    const q = query(logsCol, orderBy('timestamp', 'desc'), limit(500)); // Last 500 attempts focus
    const snap = await getDocs(q);

    const stats: Record<number, Record<number, QuestionStats>> = {};

    snap.forEach(doc => {
        const data = doc.data() as FirestorePracticeLog;
        const t = data.table;
        const m = data.multiplier;

        if (!stats[t]) stats[t] = {};
        if (!stats[t][m]) stats[t][m] = { correct: 0, total: 0, timeSum: 0, speedSamples: 0, accuracy: 0, avgTime: 0 };

        const entry = stats[t][m];
        entry.total++;
        if (data.isCorrect) entry.correct++;

        const isReasonableTime = data.timeTaken < 30000;
        if (data.isValidForSpeed !== false && isReasonableTime && data.isCorrect) {
            entry.timeSum += data.timeTaken || 0;
            entry.speedSamples++;
        }
    });

    // Calculate Averages
    Object.keys(stats).forEach(tKey => {
        const t = parseInt(tKey);
        Object.keys(stats[t]).forEach(mKey => {
            const m = parseInt(mKey);
            const s = stats[t][m];
            s.accuracy = s.total > 0 ? (s.correct / s.total) * 100 : 0;
            s.avgTime = (s.speedSamples > 0 && s.timeSum > 0) ? (s.timeSum / s.speedSamples) : 0;
        });
    });

    return stats;
}
