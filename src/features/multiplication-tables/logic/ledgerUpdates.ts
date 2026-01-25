import { TablesConfig, TableStatus, FactStreak } from './types';

// Constants
const MASTERY_ACCURACY = 90;
const MASTERY_TIME_MS = 4000;
const FAST_TIME_MS = 2000; // For weight reduction
const STREAK_THRESHOLD_MS = 3000; // For building streaks

/**
 * Updates the summary ledger after a practice session or single log.
 * purely functional: takes current config + log + isAdvanced -> returns new config partial
 */
export function updateLedger(
    currentConfig: TablesConfig,
    log: { table: number; multiplier: number; isCorrect: boolean; timeTaken: number; timestamp: number },
    isAdvanced: boolean
): TablesConfig {
    const { table, multiplier, isCorrect, timeTaken } = log;
    const newConfig = JSON.parse(JSON.stringify(currentConfig)); // Deep clone for safety
    if (!newConfig.tableStats) newConfig.tableStats = {};
    if (!newConfig.factStreaks) newConfig.factStreaks = {};

    // Migration: activeTable -> currentPathStage
    if (newConfig['activeTable'] !== undefined && newConfig.currentPathStage === undefined) {
        newConfig.currentPathStage = newConfig['activeTable'];
        delete newConfig['activeTable'];
    }
    if (newConfig.currentPathStage === undefined) newConfig.currentPathStage = 2;

    // --- 1. Fair Start Rule (Initial Placement) ---
    // If Advanced Student (Grade 7+) starts at defaults (Stage 2) with no history, jump to Stage 11.
    if (isAdvanced && newConfig.currentPathStage === 2) {
        const hasHistory = Object.values(newConfig.tableStats).some((s: any) => s.totalAttempts > 0);
        if (!hasHistory) {
            newConfig.currentPathStage = 11;
        }
    }

    // --- 2. Update Table Stats ---
    if (!newConfig.tableStats[table]) {
        newConfig.tableStats[table] = {
            status: 'NOT_STARTED',
            accuracy: 0,
            avgTime: 0,
            totalAttempts: 0
        };
    }

    const stats = newConfig.tableStats[table];

    // Weighted Average for Time (Moving Average)
    const weight = 0.1;
    if (stats.totalAttempts === 0) stats.avgTime = timeTaken;
    else stats.avgTime = (stats.avgTime * (1 - weight)) + (timeTaken * weight);

    // Accuracy (Weighted Moving Average)
    const currentScore = isCorrect ? 100 : 0;
    if (stats.totalAttempts === 0) stats.accuracy = currentScore;
    else stats.accuracy = (stats.accuracy * 0.95) + (currentScore * 0.05);

    stats.totalAttempts++;
    stats.lastPracticed = log.timestamp;

    // --- 3. Determine Status (Fast-Track Gate) ---
    const FAST_TRACK_TIME = 2500;
    const isFastTrack = isAdvanced && stats.accuracy === 100 && stats.avgTime < FAST_TRACK_TIME && stats.totalAttempts >= 10;

    if (isFastTrack) {
        stats.status = 'MASTERED';
    } else if (stats.accuracy >= MASTERY_ACCURACY && stats.avgTime < MASTERY_TIME_MS && stats.totalAttempts > 20) {
        stats.status = 'MASTERED';
    } else if (stats.accuracy < 70 || stats.avgTime > 10000) {
        stats.status = 'FOCUS_NEEDED';
    } else {
        stats.status = 'PRACTICING';
    }

    // --- 4. Update Fact Streaks ---
    const factKey = `${table}x${multiplier}`;
    if (!newConfig.factStreaks[factKey]) {
        newConfig.factStreaks[factKey] = { streak: 0, lastAttempt: 0 };
    }

    const streakData = newConfig.factStreaks[factKey];
    if (isCorrect && timeTaken < STREAK_THRESHOLD_MS) {
        streakData.streak++;
    } else if (!isCorrect) {
        streakData.streak = 0; // Reset on error
        // 3x Weight Logic handled in inputEngine via reading this streak=0
    } else {
        streakData.streak = 0; // Too slow
    }
    streakData.lastAttempt = log.timestamp;

    // --- 5. Campaign Progression (Auto-Advance) ---
    if (table === newConfig.currentPathStage && stats.status === 'MASTERED') {
        const maxStage = isAdvanced ? 20 : 12;
        if (newConfig.currentPathStage < maxStage) {
            newConfig.currentPathStage = table + 1;
        }
    }

    return newConfig;
}
