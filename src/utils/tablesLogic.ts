
/**
 * Calculates a weighted mastery score for Multiplication Tables (1x1 to 20x20).
 * 
 * Logic:
 * - We assume mastery is tracked for each fact as 'table_{a}x{b}' (e.g., 'table_7x8').
 * - Mastery requires > 80% accuracy (0.8 score).
 * - Weights are assigned based on difficulty.
 */

export const calculateWeightedTableMastery = (masteryMap: Record<string, number> = {}): number => {
    let totalWeightedScore = 0;
    let totalPossibleWeight = 0;

    for (let i = 1; i <= 20; i++) {
        for (let j = 1; j <= 20; j++) {
            // Commutativity: 7x8 is same difficulty as 8x7, but we treat them as distinct atoms for drill completeness
            // unless we want to normalize. Let's track both for full grid coverage.

            const atomId = `table_${i}x${j}`;
            const score = masteryMap[atomId] || 0; // 0.0 to 1.0

            // 1. Determine Weight (Difficulty)
            let weight = 1;

            // Easy (1s, 10s, 11s, 2s)
            if (i === 1 || j === 1) weight = 0.5;
            else if (i === 10 || j === 10) weight = 0.5;
            else if (i === 11 || j === 11) weight = 0.8;
            else if (i === 2 || j === 2) weight = 0.8;

            // Medium (3s, 4s, 5s)
            else if (i <= 5 && j <= 5) weight = 1.5;

            // Hard (6, 7, 8, 9, 12)
            else if (i <= 12 && j <= 12) weight = 3;

            // Very Hard (13 - 19)
            else if (i > 12 || j > 12) weight = 5;

            // Square numbers (e.g. 13x13) get a slight "landmark" bonus weight because they are critical anchors
            if (i === j) weight += 1;

            // 2. Threshold Check
            // User requirement: "learnt ... with 80% accuracy"
            // We only count the score if it effectively contributes to "mastery". 
            // However, for a progress bar, partial credit is valid, 
            // but let's apply a curve: < 50% = 0 progress, > 80% = full progress.

            let effectiveScore = 0;
            if (score >= 0.8) effectiveScore = 1; // Mastered
            else if (score < 0.2) effectiveScore = 0; // Novice
            else {
                // Linear interpolation between 0.2 and 0.8
                // 0.2 -> 0
                // 0.8 -> 1
                effectiveScore = (score - 0.2) / 0.6;
            }

            totalWeightedScore += (effectiveScore * weight);
            totalPossibleWeight += weight;
        }
    }

    if (totalPossibleWeight === 0) return 0;
    return Math.round((totalWeightedScore / totalPossibleWeight) * 100);
};

/**
 * Returns a detailed breakdown of Table Mastery Stats
 */
export const getTableStats = (masteryMap: Record<string, number> = {}) => {
    let masteredCount = 0;
    let totalFacts = 400; // 20x20

    for (let i = 1; i <= 20; i++) {
        for (let j = 1; j <= 20; j++) {
            const atomId = `table_${i}x${j}`;
            if ((masteryMap[atomId] || 0) >= 0.8) {
                masteredCount++;
            }
        }
    }

    return {
        masteredCount,
        totalFacts,
        percentage: Math.round((masteredCount / totalFacts) * 100)
    };
};
