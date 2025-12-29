import { z } from 'zod';

// --- ACTIONS ---
export const FlowActionSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('goto_stage'), target: z.string() }),
    z.object({ type: z.literal('branch'), target: z.string() }), // Semantically same as goto? user distinctions?
    z.object({ type: z.literal('loop') }), // Stay on current/restart current
    z.object({ type: z.literal('exit'), outcome: z.enum(['pass', 'fail']).optional() })
]);

// --- OPTIONS ---
export const OptionSchema = z.object({
    id: z.string(),
    text: z.string(),
    latex: z.string().optional(),
    is_correct: z.boolean().optional(),
    feedback: z.string().optional(),
    diagnostic: z.string().optional(), // Misconception ID
    next: FlowActionSchema.optional()
});

// --- STAGES ---
export const StageSchema = z.object({
    stage_id: z.string(),
    intent: z.enum([
        'INITIAL', 'REPAIR_CONCEPT', 'REPAIR_VISUAL', 'REPAIR_PROCEDURE',
        'SCAFFOLDED_PRACTICE', 'TRANSFER'
    ]).optional(),

    prompt: z.object({
        text: z.string(),
        latex: z.string().optional(),
        media_ref: z.string().optional()
    }),

    instruction: z.string().optional(),

    interaction: z.object({
        type: z.enum(['mcq_procedural', 'mcq_concept']),
        config: z.object({
            options: z.array(OptionSchema),
            shuffle: z.boolean().optional(),
            single_select: z.boolean().optional().default(true)
        })
    })
});

// --- ROOT ---
export const MCQBranchingSchemaV1 = z.object({
    item_id: z.string().optional(),
    atom_id: z.string().optional(),

    flow: z.object({
        mode: z.literal('branching'),
        entry_stage_id: z.string(),
        return_behavior: z.enum(['reload_with_new_vars', 'static']).optional()
    }),

    stages: z.array(StageSchema)
});

export type MCQBranchingDataV1 = z.infer<typeof MCQBranchingSchemaV1>;
export type StageAction = z.infer<typeof FlowActionSchema>;
export type Stage = z.infer<typeof StageSchema>;
