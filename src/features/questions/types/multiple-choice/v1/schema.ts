import { z } from 'zod';

export const MCQSchemaV1 = z.object({
    id: z.string().optional(),
    type: z.literal('multiple_choice').or(z.literal('MULTIPLE_CHOICE')).optional(), // Lenient for V1
    prompt: z.string().or(z.object({ text: z.string() })).transform(val =>
        typeof val === 'string' ? val : val.text
    ),
    options: z.array(z.object({
        id: z.string(),
        text: z.string(),
        imageUrl: z.string().optional()
    })),
    correctOptionId: z.string(),
    explanation: z.string().optional(),
    // Legacy fields we might encounter
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export type MCQDataV1 = z.infer<typeof MCQSchemaV1>;
