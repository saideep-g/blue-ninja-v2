import { z } from 'zod';

// Zod Schema for QuestionOption
export const QuestionOptionSchema = z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
});

// Zod Schema for Question
// Matches src/types/models.ts strictly
export const QuestionSchema = z.object({
    id: z.string(), // Often injected manually, but schema expects it
    questionId: z.string().optional(),
    curriculum_version: z.string().or(z.literal('v3')),
    subject: z.string(),
    topic: z.string(),
    chapter: z.string(),
    difficulty: z.union([
        z.literal('easy'),
        z.literal('medium'),
        z.literal('hard'),
        z.number()
    ]),
    type: z.string(),
    question_text: z.string(),
    options: z.array(QuestionOptionSchema),
    correct_answer: z.string(),
    explanation: z.string().optional(),
    created_at: z.union([z.string(), z.date()]).optional(),
    updated_by: z.string().optional(),

    // Legacy/Support fields (Typed loosely to match interface pragmatism)
    atom: z.string().optional(),
    atom_id: z.string().optional(),
    template_id: z.string().optional(),
    module_id: z.string().optional(),
    item_id: z.string().optional(),
    content: z.object({
        prompt: z.object({
            text: z.string().optional(),
            latex: z.string().optional(),
            instruction: z.string().optional(),
        }).optional(),
        interaction: z.any().optional(),
        instruction: z.string().optional(),
    }).optional(),
    metadata: z.any().optional(),
    answerKey: z.any().optional(),
    workedSolution: z.any().optional(),
}).passthrough(); // Allow unknown fields (Firestore often has extra metadata)
