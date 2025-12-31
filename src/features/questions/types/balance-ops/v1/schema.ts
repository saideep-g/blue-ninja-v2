import { z } from 'zod';

export const BalanceOpsSchemaV1 = z.object({
    id: z.string().optional(),
    type: z.string().optional(),

    // Prompt text (e.g. "Solve for x")
    // Can be direct string or object with text property depending on legacy data
    prompt: z.union([z.string(), z.object({ text: z.string() })]).optional(),

    // Core Interaction Config
    interaction: z.object({
        config: z.object({
            // V3 Simplifiction
            equation_latex: z.string().optional(),

            // Legacy Structured
            equation: z.object({
                left: z.object({
                    a: z.number(),
                    b: z.number(),
                    variable: z.string().optional()
                }).optional(),
                right: z.object({
                    value: z.number()
                }).optional()
            }).optional(),

            operations: z.array(z.any()).optional()
        })
    }).optional(),

    // Handling flattened content structure if present
    content: z.any().optional(),

    // Metadata
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BalanceOpsDataV1 = z.infer<typeof BalanceOpsSchemaV1>;
