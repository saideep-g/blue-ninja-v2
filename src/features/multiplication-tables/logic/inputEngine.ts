import { TablesConfig, TableStatus, FactStreak } from './types';

interface QuestionCandidate {
    table: number;
    multiplier: number;
    weight: number;
    type: 'DIRECT' | 'MISSING_MULTIPLIER';
}

/**
 * The Brain of the Campaign Mode (Mastery Path)
 * Generates the weighted pool of questions for a session.
 */
export function generatePathQuestions(
    config: TablesConfig,
    isAdvanced: boolean,
    sessionLength: number = 20
): QuestionCandidate[] {
    const { currentPathStage = 2, tableStats = {}, factStreaks = {} } = config || {};

    // 1. Identify Pool Sources
    // 70% from Current Stage
    // 30% from Mastered Tables (Review of previously cleared stages)
    const activeCount = Math.floor(sessionLength * 0.7);
    const reviewCount = sessionLength - activeCount;

    const pool: QuestionCandidate[] = [];
    const usedFacts = new Set<string>();

    // --- Helper: Calculate Weight for a Fact ---
    const getWeight = (t: number, m: number): number => {
        const key = `${t}x${m}`;
        const streakStats = factStreaks ? factStreaks[key] : undefined;

        // Base weight
        let w = 10;

        // Weighted Randomness Rules:
        if (streakStats) {
            // 3x multiplier if previously incorrect (implies streak reset to 0 recently? No, streak 0 could be just start)
            // We don't track "previously incorrect" explicitly in ledger other than low streak/accuracy.
            // If we had a "weakFacts" array we'd use it. 
            // Proxy: If streak is 0 and we have attempted it (lastAttempt > 0), it might be weak.
            if (streakStats.streak === 0 && streakStats.lastAttempt > 0) w *= 3;
        }

        // Reduced weight if mastered (streak > 5) or fast?
        // "Facts answered correctly in under 2 seconds should have a reduced weight."
        // We don't store per-fact avgTime, just streak.
        // Proxy: High streak usually implies mastery.
        if (streakStats && streakStats.streak > 5) w *= 0.5;

        // Smart Injection: Easy facts from Next Stage
        // "If currentPathStage reaches 70% of mastery threshold..."
        // Threshold is 90%. 70% of 90 is 63%.
        // If current table stats > 63% accuracy, we allow NEXT table's easy facts (x2, x3).

        return w;
    };


    // --- 2. Generate Current Stage Questions ---
    // Rule:
    // Basic (Grade < 7): Multipliers 1 to 10
    // Advanced (Grade >= 7): Multipliers 2 to 9, BUT allows up to currentPathStage (e.g., 2x14 if Stage 14)
    // Restrictions for Advanced: No x1, No x10.

    const baseLimit = isAdvanced ? 9 : 10;
    const limit = Math.max(baseLimit, currentPathStage);

    // Let's refactor candidate loop slightly to be generic
    const allCandidates: { t: number, m: number, w: number }[] = [];

    // Current Stage Candidates
    for (let m = 1; m <= limit; m++) {
        if (isAdvanced && (m === 1 || m === 10)) continue; // Filter Grade 6+
        allCandidates.push({ t: currentPathStage, m, w: getWeight(currentPathStage, m) });
    }

    // Smart Injections Logic
    const activeStats = tableStats[currentPathStage];
    const injectNextTable = activeStats && activeStats.accuracy > 63; // 70% of 90

    if (injectNextTable) {
        const nextT = currentPathStage + 1;
        // Inject easy ones (x2, x3... maybe x10 if not advanced)
        allCandidates.push({ t: nextT, m: 2, w: 20 }); // Boost weight to ensure they appear
        allCandidates.push({ t: nextT, m: 3, w: 20 });
    }


    // --- Pick Current Questions ---
    for (let i = 0; i < activeCount; i++) {
        const picked = pickWeighted(allCandidates);
        // Determine Type (Missing Multiplier Step-up)
        // "Only introduce MISSING_MULTIPLIER... after 5-hit streak in under 3s"
        const key = `${picked.t}x${picked.m}`;
        const s = factStreaks ? factStreaks[key] : undefined;
        const allowMissing = s && s.streak >= 5;

        // 20% chance of missing if allowed, else DIRECT
        const type = (allowMissing && Math.random() < 0.2) ? 'MISSING_MULTIPLIER' : 'DIRECT';

        pool.push({
            table: picked.t,
            multiplier: picked.m,
            weight: picked.w,
            type
        });
    }

    // --- 3. Generate Review Questions (Mixed Mastered from Previous Stages) ---
    // Find mastered tables < currentPathStage
    const masteredTables = Object.entries(tableStats)
        .filter(([tStr, stats]) => {
            const t = parseInt(tStr);
            return stats.status === 'MASTERED' && t < currentPathStage;
        })
        .map(([t, _]) => parseInt(t));

    if (masteredTables.length > 0) {
        const reviewCandidates: { t: number, m: number, w: number }[] = [];
        masteredTables.forEach(t => {
            for (let m = 1; m <= limit; m++) {
                if (isAdvanced && (m === 1 || m === 10)) continue;
                reviewCandidates.push({ t, m, w: getWeight(t, m) });
            }
        });

        for (let i = 0; i < reviewCount; i++) {
            const picked = pickWeighted(reviewCandidates);
            // Type logic same as above
            const key = `${picked.t}x${picked.m}`;
            const s = factStreaks ? factStreaks[key] : undefined;
            const allowMissing = s && s.streak >= 5;
            const type = (allowMissing && Math.random() < 0.2) ? 'MISSING_MULTIPLIER' : 'DIRECT';

            pool.push({
                table: picked.t,
                multiplier: picked.m,
                weight: picked.w,
                type
            });
        }
    } else {
        // If no mastered tables (early game), fill rest with Active Table
        for (let i = 0; i < reviewCount; i++) {
            const picked = pickWeighted(allCandidates);
            pool.push({ table: picked.t, multiplier: picked.m, weight: picked.w, type: 'DIRECT' });
        }
    }

    return pool;
}

function pickWeighted(candidates: { t: number, m: number, w: number }[]): { t: number, m: number, w: number } {
    if (candidates.length === 0) return { t: 2, m: 2, w: 0 };

    // Identify failed/weak items strongly? Weights handles that.

    const totalW = candidates.reduce((a, b) => a + b.w, 0);
    let r = Math.random() * totalW;

    for (const c of candidates) {
        r -= c.w;
        if (r <= 0) return c;
    }
    return candidates[candidates.length - 1];
}
