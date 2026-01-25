
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

import { TablesConfig, DEFAULT_TABLES_CONFIG } from '../logic/types';
import { updateLedger } from '../logic/ledgerUpdates';

export type TableSettings = TablesConfig; // Alias for backward compat in naming


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
    // Default Tables 2, 3, 4 if not configured, using new Default Config
    return DEFAULT_TABLES_CONFIG;
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
export async function fetchAllLogsUnsorted(studentId: string): Promise<FirestorePracticeLog[]> {
    const logsCol = collection(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS);
    const snap = await getDocs(logsCol);
    let allLogs: FirestorePracticeLog[] = [];

    // ... (rest of implementation) ...

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
/**
 * Save a single practice log immediately (Optimized Wrapper with Ledger Update)
 */
export async function saveSinglePracticeLog(studentId: string, log: Omit<FirestorePracticeLog, 'timestamp'>) {
    if (!studentId) return;

    // 1. Fetch Current State (Config + Grade) to update Ledger
    const studentRef = doc(db, COLLECTION_USERS, studentId);
    const studentSnap = await getDoc(studentRef);
    let currentConfig = DEFAULT_TABLES_CONFIG;
    let isAdvanced = false;

    if (studentSnap.exists()) {
        const data = studentSnap.data();
        if (data.tables_config) currentConfig = data.tables_config as TablesConfig;

        // Determine Advanced (Grade 6+)
        const grade = data.class || data.grade || data.profile?.class || 2;
        isAdvanced = parseInt(grade) >= 6;
    }

    // 2. Format Log
    const { questionId, ...cleanLog } = log as any;
    delete cleanLog.studentId;

    // Add timestamp for calculations
    const now = Date.now();
    const logForLedger = {
        table: cleanLog.table,
        multiplier: cleanLog.multiplier,
        isCorrect: cleanLog.isCorrect,
        timeTaken: cleanLog.timeTaken,
        timestamp: now
    };

    // 3. Update Ledger (Write-Ahead)
    const newConfig = updateLedger(currentConfig, logForLedger, isAdvanced);

    // 4. Save Updates (Ledger + Daily Progress)
    // Check for New Day Reset (4 AM Cutoff) to prevent "Ghost Progress" from previous day
    let isNewDay = false;
    const sData = studentSnap.exists() ? studentSnap.data() : null;
    const lastDate = sData?.lastActive?.toDate();

    if (lastDate) {
        const nowDt = new Date();
        const resetTime = new Date();
        resetTime.setHours(4, 0, 0, 0);
        if (nowDt < resetTime) resetTime.setDate(resetTime.getDate() - 1);

        if (lastDate < resetTime) isNewDay = true;
    } else {
        isNewDay = true; // First time or missing date
    }

    const updatePayload: any = {
        tables_config: newConfig,
        lastActive: serverTimestamp()
    };

    if (isNewDay) {
        // Reset Logic: Wipe daily stats for the new day, start Tables at 1
        updatePayload.daily = { Tables: 1 };
        // We leave streak management to the main dashboard for now to avoid logic duplication/conflicts,
        // but updating lastActive ensures the dashboard knows "Today is active".
        // Use setDoc with merge:true to overwrite 'daily' map but keep other fields.
    } else {
        // Standard Update: Increment Tables count
        updatePayload['daily.Tables'] = increment(1);
    }

    await setDoc(studentRef, updatePayload, { merge: true });

    // 5. Save Log to Bucket (Audit Trail)
    const finalLog = {
        ...cleanLog,
        timestamp: Timestamp.fromMillis(now)
    };

    const bucketId = getBucketId(new Date());
    const docRef = doc(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS, bucketId);

    await setDoc(docRef, {
        logs: arrayUnion(finalLog),
        lastUpdated: serverTimestamp()
    }, { merge: true });
}

/**
 * Save a batch of practice logs (Legacy/Bulk Import)
 */
/**
 * Save a batch of practice logs (Legacy/Bulk Import)
 * Updates ledger for each log sequentially (or batched)
 */
export async function savePracticeSession(studentId: string, logs: Omit<FirestorePracticeLog, 'timestamp'>[]) {
    if (!studentId || logs.length === 0) return;

    // 1. Fetch Context
    const studentRef = doc(db, COLLECTION_USERS, studentId);
    const studentSnap = await getDoc(studentRef);
    let currentConfig = DEFAULT_TABLES_CONFIG;
    let isAdvanced = false;

    if (studentSnap.exists()) {
        const data = studentSnap.data();
        if (data.tables_config) currentConfig = data.tables_config as TablesConfig;
        const grade = data.class || data.grade || data.profile?.class || 2;
        isAdvanced = parseInt(grade) >= 6;
    }

    // 2. Process Ledger Updates
    // We must process sequentially to respect streaks
    let runningConfig = currentConfig;
    const now = Date.now();
    const cleanLogs: any[] = [];

    logs.forEach((l, idx) => {
        const { questionId, ...rest } = l as any;
        delete rest.studentId;

        // Ledger Update
        const logForLedger = {
            table: rest.table,
            multiplier: rest.multiplier,
            isCorrect: rest.isCorrect,
            timeTaken: rest.timeTaken,
            timestamp: now + idx // Slight offset to preserve order conceptually
        };
        runningConfig = updateLedger(runningConfig, logForLedger, isAdvanced);

        cleanLogs.push({
            ...rest,
            timestamp: Timestamp.fromMillis(now + idx)
        });
    });

    // 3. Save Ledger & Daily
    await setDoc(studentRef, {
        tables_config: runningConfig,
        'daily.Tables': increment(logs.length),
        lastActive: serverTimestamp()
    }, { merge: true });

    // 4. Save Logs to Bucket
    const bucketId = getBucketId(new Date());
    const docRef = doc(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS, bucketId);

    await setDoc(docRef, {
        logs: arrayUnion(...cleanLogs),
        lastUpdated: serverTimestamp()
    }, { merge: true });
}

/**
 * Get Aggregated Stats for Dashboard
 */
// --- REWRITTEN READ FUNCTIONS (STATS) ---

/**
 * Get Daily Activity for Last 7 Days (or 30)
 */
export async function getDailyActivity(studentId: string, days: number = 7): Promise<{ date: string, count: number }[]> {
    const allLogs = await fetchAllLogsUnsorted(studentId);

    // Filter for last 'days'
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - days);

    const relevantLogs = allLogs.filter(l => {
        const ts = l.timestamp instanceof Timestamp ? l.timestamp.toMillis() : (l.timestamp || 0);
        return ts >= cutoff.getTime();
    });

    const grouped: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize all days to 0 to show gaps
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayStr = `${months[d.getMonth()]} ${d.getDate()}`;
        grouped[dayStr] = 0;
    }

    // Fill counts
    relevantLogs.forEach(l => {
        const ts = l.timestamp instanceof Timestamp ? l.timestamp.toMillis() : (l.timestamp || 0);
        const d = new Date(ts);
        const dayStr = `${months[d.getMonth()]} ${d.getDate()}`;
        if (grouped[dayStr] !== undefined) {
            grouped[dayStr]++;
        }
    });

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
}

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

    // 1. Identify Legacy Docs
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

    // 2. Fetch Grade/Context for Ledger
    const studentDoc = await getDoc(doc(db, COLLECTION_USERS, studentId));
    let isAdvanced = false;
    let runningConfig = DEFAULT_TABLES_CONFIG;

    if (studentDoc.exists()) {
        const d = studentDoc.data();
        const grade = d.class || d.grade || d.profile?.class || 2;
        isAdvanced = parseInt(grade) >= 6;
        // If config already exists, start from it? OR reset?
        if (d.tables_config) runningConfig = d.tables_config;
    }

    // 3. Sort Logs Chronologically for Replay
    logsToMigrate.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return tA - tB;
    });

    // 4. Process Buckets & Ledger
    const batches: Record<string, any[]> = {};

    logsToMigrate.forEach(log => {
        // A. Ledger Update
        const ts = log.timestamp?.toMillis ? log.timestamp.toMillis() : new Date(log.timestamp).getTime();
        const logForLedger = {
            table: log.table,
            multiplier: log.multiplier,
            isCorrect: log.isCorrect,
            timeTaken: log.timeTaken,
            timestamp: ts
        };
        runningConfig = updateLedger(runningConfig, logForLedger, isAdvanced);

        // B. Bucket Grouping
        const bucket = getBucketId(new Date(ts));
        if (!batches[bucket]) batches[bucket] = [];

        // Clean log
        const { questionId, studentId, ...clean } = log;
        batches[bucket].push(clean);
    });

    // 5. Write Buckets
    for (const [bucket, logs] of Object.entries(batches)) {
        const docRef = doc(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS, bucket);
        const CHUNK_SIZE = 500;
        for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
            const chunk = logs.slice(i, i + CHUNK_SIZE);
            await setDoc(docRef, {
                logs: arrayUnion(...chunk),
                lastUpdated: serverTimestamp()
            }, { merge: true });
        }
    }

    // 6. Save Final Ledger
    await setDoc(doc(db, COLLECTION_USERS, studentId), {
        tables_config: runningConfig
    }, { merge: true });

    // 7. Delete Old Docs
    const deletePromises = docsToDelete.map(id => deleteDoc(doc(db, COLLECTION_USERS, studentId, SUBCOLLECTION_LOGS, id)));
    await Promise.all(deletePromises);

    return { migrated: logsToMigrate.length, errors: 0 };
}

/**
 * Re-calculate Table Stats from Scratch
 * Useful for updating existing students to new Mastery logic (Fast-Track, etc.)
 * reads ALL logs -> resets ledger -> replays history -> saves.
 */
export async function rehydrateStudentStats(studentId: string): Promise<boolean> {
    try {
        // 1. Fetch All Logs
        const allLogs = await fetchAllLogsUnsorted(studentId);
        if (allLogs.length === 0) return false;

        // Sort chronologically
        const sortedLogs = allLogs.sort((a, b) => {
            const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
            const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
            return tA - tB;
        });

        // 2. Fetch Grade Context
        const studentRef = doc(db, COLLECTION_USERS, studentId);
        const studentDoc = await getDoc(studentRef);
        let isAdvanced = false;

        // Reset Config to Default
        let runningConfig = JSON.parse(JSON.stringify(DEFAULT_TABLES_CONFIG));

        if (studentDoc.exists()) {
            const d = studentDoc.data();
            const grade = d.class || d.grade || d.profile?.class || 2;
            isAdvanced = parseInt(grade) >= 6;
        }

        // 3. Replay History
        sortedLogs.forEach(log => {
            const ts = log.timestamp?.toMillis ? log.timestamp.toMillis() : new Date(log.timestamp).getTime();
            const logForLedger = {
                table: log.table,
                multiplier: log.multiplier,
                isCorrect: log.isCorrect,
                timeTaken: log.timeTaken,
                timestamp: ts
            };
            // Run update
            runningConfig = updateLedger(runningConfig, logForLedger, isAdvanced);
        });

        // 4. Save Fresh Ledger
        await setDoc(studentRef, {
            tables_config: runningConfig
        }, { merge: true });

        return true;
    } catch (e) {
        console.error("Rehydration failed:", e);
        return false;
    }
}
