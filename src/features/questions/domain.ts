import { z } from 'zod';
import React from 'react';

/**
 * PLATINUM ANALYTICS STANDARD
 * 
 * This interface defines the "Actionable Intelligence" we extract from every single question attempt.
 * It goes beyond simple "Correct/Incorrect" to measure student behavior, focus, and cognitive state.
 * 
 * These metrics are calculated by the specific Question Manifest's `analytics.computeMetrics` function
 * right after the student submits an answer.
 */
export interface PlatinumAnalytics {
    // --- CORE IDENTIFIERS ---

    /**
     * The unique ID of the specific question stored in Firestore.
     * Format: `q_{uuid}`
     */
    questionId: string;

    /**
     * The unique ID of the learning session (e.g., a Daily Quest or Diagnostic run).
     * Used to group attempts for session-level analysis (e.g., "Did they get tired?").
     */
    sessionId: string;

    /**
     * The specific "Atom" (Micro-concept) being tested.
     * Example: `A001_DIVISION_BASICS`
     * Critical for generating the Knowledge Graph.
     */
    atomId: string;

    /**
     * The timestamp (ms) when the answer was submitted.
     */
    timestamp: number;

    // --- PERFORMANCE METRICS ---

    /**
     * The student's final submitted answer.
     * Stored as string, but structure depends on question type manifest.
     */
    studentAnswer: string | number | object;

    /**
     * The correct answer (for reference/auditing).
     */
    correctAnswer: string | number | object;

    /**
     * The binary correctness verdict.
     * TRUE = Fully Correct.
     * FALSE = Incorrect or Partially Correct (score < 1.0).
     */
    isCorrect: boolean;

    /**
     * Total time spent on the question in milliseconds.
     * Includes active and passive time.
     */
    timeSpent: number;

    /**
     * A categorical rating of the student's speed relative to the question's expected time.
     * - 'RUSHED': (time < 0.3 * expected) -> Likely guessing.
     * - 'FAST': (0.3 < time < 0.7 * expected) -> High fluency.
     * - 'STEADY': (0.7 < time < 1.3 * expected) -> Normal deliberation.
     * - 'SLOW': (time > 1.3 * expected) -> Struggling or distracted.
     */
    speedRating: 'RUSHED' | 'FAST' | 'STEADY' | 'SLOW';

    /**
     * How many times the student has attempted *this specific question* in this session.
     * 1 = First try.
     */
    attemptNumber: number;

    // --- DIAGNOSTIC & REMEDIATION ---

    /**
     * The specific error pattern detected, if incorrect.
     * Example: `SIGN_IGNORANCE` (User calculated 5-3=2 but wrote -2 or vice versa).
     * Null if correct.
     */
    diagnosticTag: string | null;

    /**
     * DID THE STUDENT BOUNCE BACK?
     * True if: The student failed this *concept* recently (last 3 attempts) but got THIS question correct.
     * This is a "High Five" moment for the UI.
     */
    isRecovered: boolean;

    /**
     * The rate at which the student is improving on this concept this session.
     * Calculated as: (Current Score - Avg Score of First 3 Attempts) / Attempts.
     * Positive = Learning. Negative = Fatigue/Confusion.
     */
    recoveryVelocity: number | null;

    /**
     * Suggestion for the parent/teacher or the System's next step.
     * - 'NONE': Keep going.
     * - 'HINT': Suggest a hint next time.
     * - 'SCAFFOLD': Breaking down the problem.
     * - 'INTERVENE': Stop session, needs human help.
     */
    suggestedIntervention: 'NONE' | 'HINT' | 'SCAFFOLD' | 'INTERVENE';

    // --- COGNITIVE & BEHAVIORAL ---

    /**
     * Estimated cognitive load based on interaction patterns (mouse moves, answer changes).
     * - 'LOW': Automatic processing / fluent.
     * - 'MEDIUM': Active thinking.
     * - 'HIGH': Struggling / heavy processing.
     */
    cognitiveLoad: 'LOW' | 'MEDIUM' | 'HIGH';

    /**
     * A score (0-100) indicating likely external distraction.
     * Inferred from: Tab switching (blur events), long periods of mouse inactivity.
     * > 50 implies high likelihood of distraction.
     */
    distractionScore: number;

    /**
     * Measure of focus (0.0 to 1.0).
     * 1.0 = Constant interaction/mouse movement.
     * 0.0 = Idle.
     */
    focusConsistency: number;

    /**
     * The difference between "Assumed Mastery" and "Actual Performance".
     * 0.0 = performed exactly as expected.
     * > 0.5 = Surprise Failure (Overconfidence).
     * < -0.5 = Surprise Success (Underconfidence).
     */
    confidenceGap: number;

    /**
     * Pattern of answers in recent history.
     * e.g., 'STABLE' (Correct-Correct-Correct), 'OSCILLATING' (Correct-Incorrect-Correct), 'DECLINING'.
     */
    correctnessPattern?: 'STABLE' | 'OSCILLATING' | 'DECLINING' | 'IMPROVING' | 'RANDOM';

    /**
     * List of related Atom IDs that are conceptually cohesive with this question.
     * Used for identifying cross-topic weaknesses.
     */
    conceptualCohesion?: string[];

    /**
     * Calculated percentile rank compared to peer group for this specific question/atom.
     * 0-100.
     */
    peerPercentile?: number;

    // --- META & LONG TERM ---

    /**
     * Mastery level of the Atom BEFORE this attempt (0.0 - 1.0).
     */
    masteryBefore: number;

    /**
     * Mastery level of the Atom AFTER this attempt (0.0 - 1.0).
     */
    masteryAfter: number;

    /**
     * When this concept should be reviewed again (Spaced Repetition).
     * Timestamp (ms).
     */
    spaceRepetitionDue: number;

    /**
     * Technical validity flag.
     * 'VALID' = Data is good.
     * 'ANOMALY' = System detected glitch (e.g. 0ms completion time).
     */
    dataQuality: 'VALID' | 'ANOMALY';
}

/**
 * Raw events captured by the UI component tailored for analysis.
 * The 'manifest.analytics.mapToGlobal' function digests these into PlatinumAnalytics.
 */
export interface RawInteractionLog {
    type: 'mount' | 'view' | 'focus' | 'blur' | 'click' | 'keypress' | 'answer_select' | 'submit'
    | 'transition' | 'select_option' | 'submit_stage';
    payload?: any;
    timestamp: number;
}

/**
 * Validation Result for Analytics Integrity Check.
 */
export interface ValidationResult {
    isValid: boolean;
    issues: string[];
}

/**
 * THE QUESTION MANIFEST
 * This is the blueprint for every version of every question type.
 */
export interface QuestionManifest<T = any> {
    // META
    id: string;              // e.g., 'multiple-choice'
    version: number;         // e.g., 1
    name: string;            // 'Multiple Choice (Standard)'
    description: string;

    // 1. DATA CONTRACT (Zod validated)
    schema: z.ZodType<T>;

    // 2. UI COMPONENT (Rendered by QuestionRenderer)
    component: React.ComponentType<{
        data: T;
        // Component emits raw logs (clicks, answers) which the container collects
        onInteract?: (log: RawInteractionLog) => void;
        onComplete?: (result: any) => void;
        readOnly?: boolean;
        isPreview?: boolean;
    }>;

    // 3. AI CONTEXT (Prompt engineering instructions)
    aiContext: {
        generationPrompt: string;
        description: string;
    };

    // 4. ANALYTICS STRATEGY
    analytics: {
        /**
         * The Magic Function.
         * Takes the static Question Data and the Raw User Logs.
         * Returns the standardized PlatinumAnalytics object.
         * 
         * @param data The question configurations (prompt, answer key)
         * @param logs The array of raw user interactions (clicks, blurs, timestamps)
         * @param context External context (user's previous mastery, session ID)
         */
        computeMetrics: (
            data: T,
            logs: RawInteractionLog[],
            context: {
                userId: string,
                sessionId: string,
                atomHistory?: any[]
            }
        ) => PlatinumAnalytics;
    };
}
