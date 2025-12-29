/**
 * analyticsSchema.ts - v5.0
 * 
 * The Data Contract for Blue Ninja Analytics
 * Defines structure, type, range, and validation logic for all fields
 */

interface LogicalValidationResult {
    valid: boolean;
    error?: string;
    warning?: string;
    severity?: 'ERROR' | 'WARNING' | 'INFO';
    expected?: string;
}

interface ValidationIssue {
    valid: boolean;
    warning?: string;
    severity?: 'WARNING';
}

interface FieldSpec {
    type: string;
    required: boolean;
    description: string;
    validationError: string;
    example: any;
    enum?: string[];
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    step?: number;
    unit?: string;
    conditionalRequired?: (log: any) => boolean;
    conditionalValidationError?: string;
    logicalValidation?: (log: any) => LogicalValidationResult | ValidationIssue[];
}

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

export const ANALYTICS_SCHEMA: Record<string, FieldSpec> = {
    // ────────────────────────────────────────────────────────────────────────
    // IDENTITY FIELDS: Link log to curriculum and question bank
    // ────────────────────────────────────────────────────────────────────────

    questionId: {
        type: 'string',
        required: true,
        pattern: /^Q\d{3,}$/,
        description: 'Unique question identifier (Q001, Q042, etc.)',
        validationError: 'questionId must match pattern Q### (e.g., Q042)',
        example: 'Q001'
    },

    atomId: {
        type: 'string',
        required: true,
        enum: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13'],
        description: 'Curriculum atom (unit) identifier',
        validationError: 'atomId must be one of: A1-A13',
        example: 'A5'
    },

    // ────────────────────────────────────────────────────────────────────────
    // ANSWER FIELDS: Capture what student answered and what is correct
    // ────────────────────────────────────────────────────────────────────────

    studentAnswer: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 500,
        description: 'Student\'s response (selected option or typed answer)',
        validationError: 'studentAnswer must be 1-500 characters',
        example: 'The quotient is 42'
    },

    correctAnswer: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 500,
        description: 'Ground truth correct answer for comparison',
        validationError: 'correctAnswer must be 1-500 characters',
        example: 'The quotient is 42'
    },

    isCorrect: {
        type: 'boolean',
        required: true,
        description: 'Whether student answer matches correct answer',
        validationError: 'isCorrect must be true or false',
        example: true,

        // LOGICAL CHECK: If answers match, isCorrect must be true
        logicalValidation: (log: any) => {
            const normalize = (str: string) => str?.toLowerCase().trim();
            const match = normalize(log.studentAnswer) === normalize(log.correctAnswer);

            if (match && !log.isCorrect) {
                return {
                    valid: false,
                    error: 'CONTRADICTION: Answers match but isCorrect=false',
                    severity: 'ERROR'
                };
            }
            return { valid: true };
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // TIMING FIELDS: Capture speed and categorize thinking patterns
    // ────────────────────────────────────────────────────────────────────────

    timeSpent: {
        type: 'number',
        required: true,
        minimum: 0,
        maximum: 300000,
        unit: 'milliseconds',
        description: 'How long student spent on this question',
        validationError: 'timeSpent must be 0-300000 ms (0-5 minutes)',
        example: 4250,

        logicalValidation: (log: any) => {
            const issues: ValidationIssue[] = [];

            // TOO FAST: Likely automation or random clicking
            if (log.timeSpent < 200) {
                issues.push({
                    valid: false,
                    warning: 'AUTOMATION_SUSPECTED: Response < 200ms (human reaction time ~200ms)',
                    severity: 'WARNING'
                });
            }

            // TOO SLOW: Student might be distracted or gave up
            if (log.timeSpent > 180000) {
                issues.push({
                    valid: false,
                    warning: 'ABANDONMENT_SUSPECTED: Student took 3+ minutes on single question',
                    severity: 'WARNING'
                });
            }

            return issues.length > 0 ? issues : { valid: true };
        }
    },

    speedRating: {
        type: 'string',
        required: true,
        enum: ['SPRINT', 'STEADY', 'DEEP'],
        description: 'Learning behavior category based on time',
        validationError: 'speedRating must be: SPRINT, STEADY, or DEEP',
        example: 'STEADY',

        logicalValidation: (log: any) => {
            // Must be consistent with timeSpent
            const mapping: Record<string, { min: number; max: number; label: string }> = {
                'SPRINT': { min: 200, max: 3000, label: '< 3 seconds' },
                'STEADY': { min: 3000, max: 10000, label: '3-10 seconds' },
                'DEEP': { min: 10000, max: 300000, label: '> 10 seconds' }
            };

            const range = mapping[log.speedRating];
            if (!range) {
                return { valid: false, error: 'Invalid speedRating enum' };
            }

            if (log.timeSpent < range.min || log.timeSpent > range.max) {
                return {
                    valid: false,
                    error: `MISMATCH: "${log.speedRating}" (${range.label}) != ${log.timeSpent}ms`,
                    severity: 'ERROR',
                    expected: Object.entries(mapping).find(([_, r]) =>
                        log.timeSpent >= r.min && log.timeSpent <= r.max
                    )?.[0]
                };
            }

            return { valid: true };
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // MASTERY FIELDS: Track confidence/competence before and after
    // ────────────────────────────────────────────────────────────────────────

    masteryBefore: {
        type: 'number',
        required: true,
        minimum: 0,
        maximum: 1.0,
        step: 0.01,
        description: 'Student\'s self-reported confidence BEFORE answering',
        validationError: 'masteryBefore must be 0.0-1.0',
        example: 0.45,

        logicalValidation: (log: any) => {
            // Edge case: If masteryBefore > 0.9 but answer wrong, shows overconfidence
            if (log.masteryBefore >= 0.9 && !log.isCorrect) {
                return {
                    valid: true, // Still valid, but noted
                    warning: 'OVERCONFIDENCE: High mastery but incorrect answer',
                    severity: 'INFO'
                };
            }
            return { valid: true };
        }
    },

    masteryAfter: {
        type: 'number',
        required: true,
        minimum: 0,
        maximum: 1.0,
        step: 0.01,
        description: 'Student\'s updated confidence AFTER answering (Bayesian)',
        validationError: 'masteryAfter must be 0.0-1.0',
        example: 0.62,

        logicalValidation: (log: any) => {
            // CRITICAL: Mastery should move in right direction
            if (!log.isCorrect && log.masteryAfter > log.masteryBefore) {
                return {
                    valid: false,
                    error: 'LOGICAL_INVERSION: Mastery increased after WRONG answer',
                    severity: 'ERROR'
                };
            }

            // ALLOWED: Correct but slightly lower mastery (luck perception)
            if (log.isCorrect && log.masteryAfter < log.masteryBefore) {
                return {
                    valid: true,
                    warning: 'Student feels less confident despite correct answer',
                    severity: 'INFO'
                };
            }

            return { valid: true };
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // DIAGNOSTIC FIELDS: Identify specific misconception if answer is wrong
    // ────────────────────────────────────────────────────────────────────────

    diagnosticTag: {
        type: 'string',
        required: false, // Only required if isCorrect === false
        enum: [
            'SIGN_IGNORANCE',        // +/- confusion
            'UNIT_CONFUSION',        // mixing units (m vs cm)
            'OPERATOR_SWAP',         // × vs ÷
            'NOTATION_ERROR',        // incorrect math notation
            'CALCULATION_ERROR',     // arithmetic mistakes
            'CONCEPTUAL_GAP'         // fundamental misunderstanding
        ],
        description: 'Type of misconception/hurdle',
        validationError: 'diagnosticTag must be one of the 6 hurdle types',
        example: 'CALCULATION_ERROR',

        conditionalRequired: (log: any) => !log.isCorrect,
        conditionalValidationError: 'diagnosticTag is REQUIRED when isCorrect=false',

        logicalValidation: (log: any) => {
            // If correct, should NOT have a diagnostic tag
            if (log.isCorrect && log.diagnosticTag) {
                return {
                    valid: false,
                    error: 'diagnosticTag should be empty for correct answers',
                    severity: 'WARNING'
                };
            }
            return { valid: true };
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // RECOVERY FIELDS: Track improvement on retry/bonus mission
    // ────────────────────────────────────────────────────────────────────────

    isRecovered: {
        type: 'boolean',
        required: true,
        description: 'Did student correct their mistake on retry?',
        validationError: 'isRecovered must be true or false',
        example: true
    },

    recoveryVelocity: {
        type: 'number',
        required: false,
        minimum: 0,
        maximum: 1.0,
        step: 0.01,
        description: 'How much faster (0-1.0) student recovered',
        validationError: 'recoveryVelocity must be 0.0-1.0 (where 0.5 = 50% faster)',
        example: 0.65,

        conditionalRequired: (log: any) => log.isRecovered === true,
        conditionalValidationError: 'recoveryVelocity is REQUIRED when isRecovered=true',

        logicalValidation: (log: any) => {
            // If recovered but velocity shows NO improvement, flag it
            if (log.isRecovered && log.recoveryVelocity < 0.2) {
                return {
                    valid: true,
                    warning: 'SLOW_RECOVERY: Took same/longer time to fix mistake',
                    severity: 'WARNING'
                };
            }
            return { valid: true };
        }
    },

    // ────────────────────────────────────────────────────────────────────────
    // TIMESTAMP: When was this logged?
    // ────────────────────────────────────────────────────────────────────────

    timestamp: {
        type: 'number',
        required: true,
        description: 'Unix timestamp (milliseconds) when log was created',
        validationError: 'timestamp must be valid Unix timestamp',
        example: 1703000000000,

        logicalValidation: (log: any) => {
            const now = Date.now();
            const clockSkew = Math.abs(now - log.timestamp);
            const maxSkew = 5 * 60 * 1000; // 5 minute tolerance

            if (clockSkew > maxSkew) {
                return {
                    valid: false,
                    warning: `CLOCK_SKEW: Device time off by ${Math.round(clockSkew / 1000)}s`,
                    severity: 'WARNING'
                };
            }
            return { valid: true };
        }
    }
};

// ============================================================================
// FIELD GROUPS (for easier reference)
// ============================================================================

export const FIELD_GROUPS: Record<string, string[]> = {
    identity: ['questionId', 'atomId'],
    answers: ['studentAnswer', 'correctAnswer', 'isCorrect'],
    timing: ['timeSpent', 'speedRating'],
    mastery: ['masteryBefore', 'masteryAfter'],
    diagnostics: ['diagnosticTag'],
    recovery: ['isRecovered', 'recoveryVelocity'],
    metadata: ['timestamp']
};

// ============================================================================
// VALIDATION STATUS CODES
// ============================================================================

export const VALIDATION_CODES = {
    PASS: 'VALIDATION_PASS',
    FAIL_TYPE_MISMATCH: 'TYPE_MISMATCH',
    FAIL_OUT_OF_RANGE: 'OUT_OF_RANGE',
    FAIL_LOGICAL_CONTRADICTION: 'LOGICAL_CONTRADICTION',
    FAIL_MISSING_REQUIRED: 'MISSING_REQUIRED',
    FAIL_INVALID_ENUM: 'INVALID_ENUM',
    WARNING_DATA_QUALITY: 'DATA_QUALITY_WARNING',
    WARNING_SUSPICIOUS: 'SUSPICIOUS_ACTIVITY'
};

// ============================================================================
// HELPER: Get all required fields
// ============================================================================

export const getRequiredFields = () => {
    return Object.entries(ANALYTICS_SCHEMA)
        .filter(([_, spec]) => spec.required)
        .map(([name, _]) => name);
};

// ============================================================================
// HELPER: Get all field names
// ============================================================================

export const getAllFieldNames = () => {
    return Object.keys(ANALYTICS_SCHEMA);
};

// ============================================================================
// HELPER: Get field specs by group
// ============================================================================

export const getFieldsByGroup = (group: string) => {
    const fieldNames = FIELD_GROUPS[group] || [];
    return fieldNames.map(name => ({
        name,
        spec: ANALYTICS_SCHEMA[name]
    }));
};

// ============================================================================
// EXPORT: Schema for documentation/UI generation
// ============================================================================

export const generateSchemaDocumentation = () => {
    const doc = {
        title: 'Blue Ninja Analytics Schema v5.0',
        totalFields: Object.keys(ANALYTICS_SCHEMA).length,
        requiredFields: getRequiredFields().length,
        fieldGroups: Object.keys(FIELD_GROUPS),
        validationCodes: Object.keys(VALIDATION_CODES),
        fields: Object.entries(ANALYTICS_SCHEMA).map(([name, spec]) => ({
            name,
            type: spec.type,
            required: spec.required || false,
            description: spec.description,
            example: spec.example,
            constraints: {
                enum: spec.enum,
                minimum: spec.minimum,
                maximum: spec.maximum,
                minLength: spec.minLength,
                maxLength: spec.maxLength,
                pattern: spec.pattern?.toString()
            }
        }))
    };
    return doc;
};
