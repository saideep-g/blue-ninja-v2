import { MCQDataV1 } from '../types/multiple-choice/v1/schema';

type TransformResult<T> = { success: true; data: T } | { success: false; error: string };

export interface QuestionTransformer {
    id: string; // e.g., 'legacy-mcq-to-v1'
    sourceType: string; // 'legacy_multiple_choice'
    targetType: string; // 'multiple-choice:1'
    description: string;
    transform: (legacy: any) => TransformResult<any>;
}

/**
 * TRANSFORMER: Legacy -> MCQ V1
 * Robust logic to convert various "old" formats into the strict V1 schema.
 */
export const LegacyToMCQV1: QuestionTransformer = {
    id: 'legacy-mcq-to-v1',
    sourceType: 'legacy',
    targetType: 'multiple-choice',
    description: 'Converts unstructured legacy MCQ objects into strict V1 Schema',
    transform: (legacy: any): TransformResult<MCQDataV1> => {
        try {
            // Heuristic Check: Is this actually an MCQ?
            if (!legacy.options || !Array.isArray(legacy.options)) {
                return { success: false, error: 'Source is missing strict options array' };
            }

            // 1. Normalize Options
            const options = legacy.options.map((opt: any, idx: number) => ({
                id: opt.id || `opt_${idx}`,
                text: typeof opt === 'string' ? opt : (opt.text || ''),
                imageUrl: opt.imageUrl
            }));

            // 2. Resolve Correct Option
            let correctOptionId = '';

            // Case A: Explicit ID
            if (legacy.correctOptionId) {
                correctOptionId = legacy.correctOptionId;
            }
            // Case B: Explicit Text Matching
            else if (typeof legacy.answer === 'string') {
                const match = options.find((o: any) => o.text === legacy.answer || o.id === legacy.answer);
                if (match) correctOptionId = match.id;
            }
            // Case C: Index Based (Common in old apps)
            else if (typeof legacy.correctOptionIndex === 'number') {
                correctOptionId = options[legacy.correctOptionIndex]?.id;
            }
            // Case D: 'isCorrect' flag inside options
            else {
                const correctOpt = legacy.options.find((o: any) => o.isCorrect === true);
                if (correctOpt) {
                    // We need to match it to our new normalized options list
                    // Assuming index preservation
                    const originalIndex = legacy.options.indexOf(correctOpt);
                    correctOptionId = options[originalIndex]?.id;
                }
            }

            if (!correctOptionId) {
                return { success: false, error: 'Could not resolve correctOptionId from legacy data' };
            }

            // 3. Construct V1
            const v1Data: MCQDataV1 = {
                id: legacy.id,
                type: 'multiple_choice',
                prompt: legacy.question || legacy.prompt?.text || legacy.text || 'No Prompt Found',
                options,
                correctOptionId,
                explanation: legacy.explanation || legacy.solution || '',
                metadata: {
                    originalId: legacy.id,
                    migratedAt: new Date().toISOString(),
                    source: 'legacy_migration_tool'
                }
            };

            return { success: true, data: v1Data };

        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
};
