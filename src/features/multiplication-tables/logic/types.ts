export type TableStatus = 'NOT_STARTED' | 'PRACTICING' | 'FOCUS_NEEDED' | 'MASTERED';

export interface TableStats {
    status: TableStatus;
    accuracy: number;
    avgTime: number;
    totalAttempts: number;
    lastPracticed?: number;
}

export interface FactStreak {
    streak: number; // Consecutive correct < 3s (or threshold)
    lastAttempt: number;
}

export interface TablesConfig {
    selectedTables: number[]; // From old config (still useful for manual override if needed)
    currentPathStage: number; // For Mastery Path (Campaign Mode)
    tableStats: Record<number, TableStats>; // "Summary Ledger"
    factStreaks: Record<string, FactStreak>; // Key: "12x7" -> Streak
    targetAccuracy: number;
    dailyGoalMinutes: number;
}

export const DEFAULT_TABLES_CONFIG: TablesConfig = {
    selectedTables: [2, 3, 4],
    currentPathStage: 2,
    tableStats: {},
    factStreaks: {},
    targetAccuracy: 90,
    dailyGoalMinutes: 10
};
