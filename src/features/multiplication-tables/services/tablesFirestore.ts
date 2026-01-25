
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
    increment,
    deleteDoc,
    arrayUnion
} from 'firebase/firestore';

export interface TableSettings {
    selectedTables: number[];
    targetAccuracy: number; // e.g., 90
    dailyGoalMinutes: number; // e.g., 10
}

export interface FirestorePracticeLog {
    // studentId removed as it's redundant in subcollection
    questionId?: string; // Optional (legacy)
    table: number;
    multiplier: number;
    type: string;
    isCorrect: boolean;
    timeTaken: number;
    isValidForSpeed?: boolean;
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
// const SUBCOLLECTION_SETTINGS = 'tables_config'; // Removed: Storing on document root
const SUBCOLLECTION_LOGS = 'table_practice_logs';

/**
 * Save Parent Configuration for Tables
 */
/**
 * Save Parent Configuration for Tables
 * Stored as a map field on the student document to avoid subcollections.
 */
export async function saveTableSettings(studentId: string, settings: TableSettings) {
    if (!studentId) return;
    const ref = doc(db, COLLECTION_USERS, studentId);
    await setDoc(ref, { tables_config: settings }, { merge: true });
}

/**
 * Get Parent Configuration for Tables
 */
/**
 * Get Parent Configuration for Tables
 */
export async function getTableSettings(studentId: string): Promise<TableSettings | null> {
    if (!studentId) return null;
    const ref = doc(db, COLLECTION_USERS, studentId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const data = snap.data();
        if (data.tables_config) {
            return data.tables_config as TableSettings;
        }
    }
    // Default Tables 2, 3, 4 if not configured
    return { selectedTables: [2, 3, 4], targetAccuracy: 90, dailyGoalMinutes: 10 };
}

/**
 * Determine Bucket ID based on timestamp
 * Strategy: "Archives" until Jun 2026, then Semiannual Buckets.
 */
function getBucketId(date: Date = new Date()): string {
    const cutoff = new Date('2026-07-01T00:00:00');
    if (date < cutoff) {
        return 'logs_until_jun2026'; // Single bucket for all history up to June 2026
    }

    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    const half = month < 6 ? 'h1' : 'h2';
    return `logs_${year}_${half}`;
}

/**
 * Unified Log Reader
 * Reads both old individual docs and new bucketed docs transparently.
 */
async function fetchAllLogsUnsorted(studentId: string): Promise<FirestorePracticeLog[]> {
    const logsCol = collection(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS);
    const snap = await getDocs(logsCol);
    let allLogs: FirestorePracticeLog[] = [];

    snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.logs && Array.isArray(data.logs)) {
            // It's a bucket
            allLogs.push(...data.logs);
        } else if (data.table && (data.timestamp || data.timeTaken)) { // Looser check for legacy
            // It's a legacy single log
            allLogs.push(data as FirestorePracticeLog);
        }
    });

    return allLogs;
}

/**
 * Save a single practice log immediately (Optimized Wrapper)
 */
export async function saveSinglePracticeLog(studentId: string, log: Omit<FirestorePracticeLog, 'timestamp'>) {
    if (!studentId) return;

    // Remove questionId and ensure no studentId
    const { questionId, ...cleanLog } = log as any;
    delete cleanLog.studentId; // Explicit safety

    const finalLog = {
        ...cleanLog,
        timestamp: Timestamp.now()
    };

    const bucketId = getBucketId(new Date());
    const docRef = doc(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS, bucketId);

    // Merge: true ensures creation if missing. arrayUnion appends.
    await setDoc(docRef, {
        logs: arrayUnion(finalLog),
        lastUpdated: serverTimestamp()
    }, { merge: true });
}

/**
 * Save a batch of practice logs (Legacy/Bulk Import)
 */
export async function savePracticeSession(studentId: string, logs: Omit<FirestorePracticeLog, 'timestamp'>[]) {
    if (!studentId || logs.length === 0) return;

    const bucketId = getBucketId(new Date());
    const docRef = doc(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS, bucketId);

    const cleanLogs = logs.map(l => {
        const { questionId, ...rest } = l as any;
        delete rest.studentId; // Explicit safety
        return {
            ...rest,
            timestamp: Timestamp.now()
        };
    });

    await setDoc(docRef, {
        logs: arrayUnion(...cleanLogs),
        lastUpdated: serverTimestamp()
    }, { merge: true });

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
// --- REWRITTEN READ FUNCTIONS (STATS) ---

/**
 * Get Aggregated Stats for Dashboard (Bucketed)
 */
export async function getStudentTableStats(studentId: string) {
    if (!studentId) return [];

    const allLogs = await fetchAllLogsUnsorted(studentId);

    // Simplify logic: Just process all logs in memory. 
    // 5000 items loop is trivial for JS engine (micro-seconds).

    const stats: Record<number, { correct: number, total: number, timeSum: number, speedSamples: number }> = {};

    allLogs.forEach(data => {
        const table = data.table;
        if (!stats[table]) stats[table] = { correct: 0, total: 0, timeSum: 0, speedSamples: 0 };

        stats[table].total++;
        if (data.isCorrect) stats[table].correct++;

        const timeTaken = data.timeTaken || 0;
        const isReasonableTime = timeTaken < 30000;

        if (data.isValidForSpeed !== false && isReasonableTime) {
            stats[table].timeSum += timeTaken;
            stats[table].speedSamples++;
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
 * Get Detailed Question Stats (Bucketed)
 */
export async function getDetailedTableStats(studentId: string) {
    if (!studentId) return {};

    const allLogs = await fetchAllLogsUnsorted(studentId);
    // Sort desc by timestamp to limit to recent 500 if needed, 
    // but calculating stats on ALL history is actually better for "Mastery" accuracy.
    // Let's use ALL logs for now as per user volume analysis (small enough).

    const stats: Record<number, Record<number, QuestionStats>> = {};

    allLogs.forEach(data => {
        const t = data.table;
        const m = data.multiplier;

        if (!stats[t]) stats[t] = {};
        if (!stats[t][m]) stats[t][m] = { correct: 0, total: 0, timeSum: 0, speedSamples: 0, accuracy: 0, avgTime: 0 };

        const entry = stats[t][m];
        entry.total++;
        if (data.isCorrect) entry.correct++;

        const timeTaken = data.timeTaken || 0;
        const isReasonableTime = timeTaken < 30000;
        if (data.isValidForSpeed !== false && isReasonableTime && data.isCorrect) {
            entry.timeSum += timeTaken;
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

/**
 * Get All Practice Logs (For Admin Export) - Updated for Buckets
 */
export async function getAllPracticeLogs(studentId: string) {
    if (!studentId) return [];

    const logs = await fetchAllLogsUnsorted(studentId);
    // Sort desc
    return logs.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return tB - tA;
    });
}

// --- MIGRATION UTILS ---

export async function migrateLogsToBuckets(studentId: string): Promise<{ migrated: number, errors: number }> {
    const logsCol = collection(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS);
    const snap = await getDocs(logsCol);

    const logsToMigrate: any[] = [];
    const docsToDelete: string[] = [];

    snap.forEach(docSnap => {
        const data = docSnap.data();
        // Identify Legacy Docs: They have 'table' at top level and NO 'logs' array
        if (data.table !== undefined && !data.logs) {
            logsToMigrate.push({
                ...data,
                // Ensure timestamp is preserved or valid
                timestamp: data.timestamp || Timestamp.now()
            });
            docsToDelete.push(docSnap.id);
        }
    });

    if (logsToMigrate.length === 0) {
        return { migrated: 0, errors: 0 };
    }

    // Group logs by bucket (though we mostly expect 'archive' for now)
    const batches: Record<string, any[]> = {};

    logsToMigrate.forEach(log => {
        // Convert timestamp to Date for bucket calc
        const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        const bucket = getBucketId(date);

        if (!batches[bucket]) batches[bucket] = [];

        // Clean log (remove id if it was stuck there, remove questionId, remove studentId)
        const { questionId, studentId, ...clean } = log;
        batches[bucket].push(clean);
    });

    // Write Buckets
    for (const [bucket, logs] of Object.entries(batches)) {
        const docRef = doc(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS, bucket);
        // We use setDoc with merge to be safe, but arrayUnion for the logs
        // Note: arrayUnion limits? 
        // Firestore max write size is 1MB. 5000 logs might be close if we send all at once.
        // We should chunk them.

        const CHUNK_SIZE = 500;
        for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
            const chunk = logs.slice(i, i + CHUNK_SIZE);
            await setDoc(docRef, {
                logs: arrayUnion(...chunk),
                lastUpdated: serverTimestamp()
            }, { merge: true });
        }
    }

    // Delete Old Docs
    // Delete in chunks/parallel
    const deletePromises = docsToDelete.map(id => deleteDoc(doc(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS, id)));
    await Promise.all(deletePromises);

    return { migrated: logsToMigrate.length, errors: 0 };
}
