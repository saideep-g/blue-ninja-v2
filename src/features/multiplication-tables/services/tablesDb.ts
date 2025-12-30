
import Dexie, { Table } from 'dexie';

export interface PracticeLog {
    id?: number;
    questionId: string; // "2-x-3-direct"
    table: number;
    multiplier: number;
    type: 'DIRECT' | 'MISSING_MULTIPLIER';
    isCorrect: boolean;
    timeTaken: number;
    timestamp: number;
}

export class TablesDatabase extends Dexie {
    practiceLogs!: Table<PracticeLog>;

    constructor() {
        super('BlueNinjaTablesDB');
        this.version(1).stores({
            practiceLogs: '++id, questionId, table, isCorrect, timestamp'
        });
    }
}

export const db = new TablesDatabase();

export async function saveSessionLogs(logs: PracticeLog[]) {
    try {
        await db.practiceLogs.bulkAdd(logs);
    } catch (error) {
        console.error('Failed to save logs:', error);
    }
}

export async function getWeakestQuestions(limit = 10): Promise<string[]> {
    // Simple heuristic: Questions with lowest accuracy or recently incorrect
    // For V1, let's just specific questions that were wrong in the last 100 attempts
    const recentLogs = await db.practiceLogs
        .orderBy('timestamp')
        .reverse()
        .limit(200)
        .toArray();

    const stats: Record<string, { attempts: number, correct: number }> = {};

    recentLogs.forEach(log => {
        if (!stats[log.questionId]) stats[log.questionId] = { attempts: 0, correct: 0 };
        stats[log.questionId].attempts++;
        if (log.isCorrect) stats[log.questionId].correct++;
    });

    // innovative "Struggle Score" = (Attempts / (Correct + 1))
    // High attempts with low correct = High score
    const struggleScores = Object.entries(stats).map(([qid, s]) => ({
        qid,
        score: (s.attempts - s.correct) // Simple: number of mistakes
    })).filter(x => x.score > 0);

    struggleScores.sort((a, b) => b.score - a.score);

    return struggleScores.slice(0, limit).map(x => x.qid);
}

export async function getTableMasteryStats() {
    const allLogs = await db.practiceLogs.toArray();
    const stats: Record<number, { correct: number, total: number }> = {};

    allLogs.forEach(log => {
        if (!stats[log.table]) stats[log.table] = { correct: 0, total: 0 };
        stats[log.table].total++;
        if (log.isCorrect) stats[log.table].correct++;
    });

    return Object.entries(stats).map(([table, s]) => ({
        table: parseInt(table),
        accuracy: Math.round((s.correct / s.total) * 100),
        totalAttempts: s.total
    }));
}
