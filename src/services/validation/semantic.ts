/**
 * semanticValidator.ts
 * 
 * Tier 2: Semantic Validation
 * Checks if data MEANS something educationally valid
 * (beyond just type/range correctness)
 */

import { QuestionLog } from '../../types';

interface ValidationIssue {
    code: string;
    severity: 'WARNING' | 'ERROR' | 'MEDIUM' | 'HIGH';
    category?: string;
    message: string;
    interpretation?: string;
    recommendation?: string;
    fields?: string[];
    type?: string;
}

interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    semanticScore: number;
    issueCount: number;
    errorCount: number;
    warningCount: number;
}

// Mocking VALIDATION_CODES if missing from import, or defining locally
const VALIDATION_CODES = {
    WARNING_DATA_QUALITY: 'WARNING_DATA_QUALITY',
    WARNING_SUSPICIOUS: 'WARNING_SUSPICIOUS'
};

/**
 * Main entry point: Validates semantic consistency of a log entry
 */
export const validateSemanticIntegrity = (log: any): ValidationResult => { // Using any for log temporarily if QuestionLog incomplete
    const issues: ValidationIssue[] = [];

    // CHECK 1: Speed-Accuracy Mismatch
    if (log.speedRating === 'SPRINT' && log.isCorrect && (log.masteryAfter || 0) < 0.3) {
        issues.push({
            code: VALIDATION_CODES.WARNING_DATA_QUALITY,
            severity: 'WARNING',
            category: 'SPEED_ACCURACY_MISMATCH',
            message: 'Student answered correctly very quickly (SPRINT) but shows low confidence',
            interpretation: 'Likely lucky guess rather than understanding',
            recommendation: 'Flag for manual review. Consider reasking similar question for true mastery check',
            fields: ['speedRating', 'isCorrect', 'masteryAfter']
        });
    }

    // CHECK 2: Confidence Paradox After Correct Answer
    if (log.isCorrect && (log.masteryAfter || 0) < (log.masteryBefore || 0) - 0.1) {
        issues.push({
            code: VALIDATION_CODES.WARNING_DATA_QUALITY,
            severity: 'WARNING',
            category: 'CONFIDENCE_PARADOX',
            message: 'Mastery decreased despite correct answer (possible uncertainty)',
            interpretation: 'Student answered correctly but feels less confident. May be lucky guess.',
            recommendation: 'Provide more similar questions to build confidence',
            fields: ['isCorrect', 'masteryBefore', 'masteryAfter']
        });
    }

    // CHECK 3: Misconception Resistance
    if (log.isRecovered && log.recoveryVelocity !== undefined && log.recoveryVelocity < 0.2) {
        issues.push({
            code: VALIDATION_CODES.WARNING_SUSPICIOUS,
            severity: 'ERROR',
            category: 'RESISTANT_MISCONCEPTION',
            message: `Misconception shows minimal recovery (velocity: ${(log.recoveryVelocity * 100).toFixed(0)}%)`,
            interpretation: 'Student barely improved on retry. Misconception is persistent.',
            recommendation: 'Escalate to interactive coaching with scaffolded explanations',
            fields: ['isRecovered', 'recoveryVelocity', 'diagnosticTag']
        });
    }

    // CHECK 4: Time Inconsistency
    if (log.speedRating === 'DEEP' && !log.isCorrect && !log.diagnosticTag) {
        issues.push({
            code: VALIDATION_CODES.WARNING_DATA_QUALITY,
            severity: 'WARNING',
            category: 'DEEP_STRUGGLE_NO_DIAGNOSIS',
            message: 'Student spent 10+ seconds but no diagnostic tag recorded',
            interpretation: 'Student struggled but we didn\'t capture WHY',
            recommendation: 'Have diagnostic tag populated for all wrong answers',
            fields: ['speedRating', 'isCorrect', 'diagnosticTag']
        });
    }

    // CHECK 5: Overconfidence Before Wrong Answer
    if ((log.masteryBefore || 0) >= 0.8 && !log.isCorrect) {
        issues.push({
            code: VALIDATION_CODES.WARNING_SUSPICIOUS,
            severity: 'ERROR',
            category: 'HIDDEN_MISCONCEPTION',
            message: 'Student showed high confidence (0.8+) but answered incorrectly',
            interpretation: 'Student has a hidden misconception - they think they understand but don\'t',
            recommendation: 'This is CRITICAL. Address misconception before it solidifies. Use scaffolded approach.',
            fields: ['masteryBefore', 'isCorrect', 'diagnosticTag']
        });
    }

    const semanticScore = calculateSemanticScore(issues);

    return {
        valid: issues.filter(i => i.severity === 'ERROR').length === 0,
        issues,
        semanticScore,
        issueCount: issues.length,
        errorCount: issues.filter(i => i.severity === 'ERROR').length,
        warningCount: issues.filter(i => i.severity === 'WARNING').length
    };
};

const calculateSemanticScore = (issues: ValidationIssue[]) => {
    let score = 1.0;
    issues.forEach(issue => {
        if (issue.severity === 'ERROR') score -= 0.3;
        if (issue.severity === 'WARNING') score -= 0.1;
    });
    return Math.max(0, Math.min(1, score));
};

export const analyzeSemanticPatterns = (log: any) => {
    const validation = validateSemanticIntegrity(log);
    return {
        ...validation,
        categories: {
            speedAccuracy: extractIssueCategory(validation.issues, 'SPEED_ACCURACY_MISMATCH'),
            confidence: extractIssueCategory(validation.issues, 'CONFIDENCE_PARADOX'),
            misconception: extractIssueCategory(validation.issues, 'RESISTANT_MISCONCEPTION'),
            hidden: extractIssueCategory(validation.issues, 'HIDDEN_MISCONCEPTION')
        }
    };
};

const extractIssueCategory = (issues: ValidationIssue[], category: string) => {
    return issues.find(i => i.category === category) || null;
};

export const generateSemanticReport = (log: any) => {
    const validation = validateSemanticIntegrity(log);
    return {
        overallHealth: getHealthStatus(validation.semanticScore),
        score: (validation.semanticScore * 100).toFixed(0) + '%',
        issues: validation.issues.map(issue => ({
            severity: issue.severity,
            title: (issue.category || '').replace(/_/g, ' '),
            message: issue.message,
            interpretation: issue.interpretation,
            actionableAdvice: issue.recommendation
        }))
    };
};

const getHealthStatus = (score: number) => {
    if (score >= 0.9) return { status: 'EXCELLENT', emoji: '💚' };
    if (score >= 0.7) return { status: 'GOOD', emoji: '💛' };
    if (score >= 0.5) return { status: 'CAUTION', emoji: '🟡' };
    return { status: 'CRITICAL', emoji: '❤️' };
};

/**
 * SEMANTIC VALIDATOR (Tier 2)
 * Updated to work with insightGenerator
 */
export function semanticValidate(log: QuestionLog) {
    const issues: ValidationIssue[] = [];

    // Lucky Guess (using any cast for legacy props if not in QuestionLog interface)
    if (log.isCorrect && log.speedRating === 'SPRINT' && ((log as any).confidenceAfter || 0) < 0.5) {
        issues.push({
            type: 'WARNING',
            code: 'LUCKY_GUESS',
            message: 'Correct but too fast + low confidence = lucky guess',
            severity: 'MEDIUM',
        });
    }

    // Hidden Misconception
    if (!log.isCorrect && ((log as any).confidenceBefore || 0) > 0.7) {
        issues.push({
            type: 'ERROR',
            code: 'HIDDEN_MISCONCEPTION',
            message: 'High confidence but wrong = dangerous misconception',
            severity: 'HIGH',
        });
    }

    // Resistant Misconception
    if (!log.isCorrect && log.isRecovered && (log.timeSpent || 0) > 5000) {
        issues.push({
            type: 'WARNING',
            code: 'RESISTANT_MISCONCEPTION',
            message: 'Took long time to recover - concept is resistant',
            severity: 'MEDIUM',
        });
    }

    // Confidence Drop
    if (((log as any).confidenceAfter || 0) - ((log as any).confidenceBefore || 0) < -0.3) {
        issues.push({
            type: 'WARNING',
            code: 'CONFIDENCE_DROP',
            message: 'Confidence dropped significantly',
            severity: 'MEDIUM',
        });
    }

    return {
        isValid: issues.length === 0,
        score: 100 - issues.length * 10,
        issues,
    };
}

export default semanticValidate;
