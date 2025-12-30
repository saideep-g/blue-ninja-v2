/**
 * src/services/uploadValidationEngine.ts
 * ======================================
 * 
 * A unified, high-integrity validation engine for the Question Upload Portal.
 * Orchestrates V3 validation, duplicate detection, and internal consistency checks.
 */

import { validateQuestionV3 } from "./question";

export interface ValidationIssue {
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    code: string;
    message: string;
    field?: string;
    suggestion?: string;
}

export interface ValidatedItem {
    originalIndex: number;
    data: any;
    isValid: boolean;
    hasWarnings: boolean;
    issues: ValidationIssue[];
    item_id: string;
    template_id: string;
    schemaVersion: string;
}

export interface ValidationSummary {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
    duplicates: number;
}

/**
 * Checks for duplicate options within a single question (Internal Consistency)
 */
function checkInternalConsistency(item: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Rule: Duplicate Options in MCQ
    if (item.interaction?.config?.options) {
        const seenValues = new Set();
        item.interaction.config.options.forEach((opt: any, idx: number) => {
            // Check text/html content for duplicates
            const content = opt.text || opt.html || opt.label;
            if (content) {
                const signature = String(content).trim().toLowerCase();
                if (seenValues.has(signature)) {
                    issues.push({
                        severity: 'CRITICAL',
                        code: 'DUPLICATE_OPTION',
                        message: `Option at index ${idx} is a duplicate of a previous option ("${content.substring(0, 20)}...").`,
                        field: `interaction.config.options[${idx}]`
                    });
                }
                seenValues.add(signature);
            }
        });
    }

    return issues;
}

/**
 * Main Orchestrator
 */
export async function runFullValidationSuite(
    rawItems: any[],
    existingItemIds: Set<string>,
    schemaVersion = '3.0'
): Promise<{ items: ValidatedItem[]; summary: ValidationSummary }> {
    const validatedItems: ValidatedItem[] = [];
    const summary: ValidationSummary = { total: 0, valid: 0, invalid: 0, warnings: 0, duplicates: 0 };

    // Track IDs and Content Signatures within this batch
    const batchIds = new Set<string>();
    const batchSignatures = new Map<string, string>(); // Signature -> First Item ID

    for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const itemIssues: ValidationIssue[] = [];
        let isValid = true;
        const itemId = item.item_id || 'UNKNOWN';

        // Gen Signature
        let prompt = item.prompt?.text || item.content?.prompt?.text || '';
        if (prompt.trim().length === 0 && item.stages && Array.isArray(item.stages) && item.stages.length > 0) {
            prompt = item.stages[0].prompt?.text || '';
        }
        const sig = prompt.length > 10 ? prompt.toLowerCase().trim().replace(/[^a-z0-9]/g, '') : null;


        // 1. Schema Check (V3 Only)
        let coreResult;

        // Detect V3-ishness
        const version = item.schema_version || schemaVersion;
        const isV3 = version === '3.0' || version === 'V3' || !!item.bundle_id || !!item.atom_id;

        if (isV3) {
            coreResult = await validateQuestionV3(item);
        } else {
            // Treat non-V3 as invalid legacy
            coreResult = {
                itemId: item.item_id || 'UNKNOWN',
                isValid: false,
                errors: ['Legacy V2 format not supported. Ensure item has atom_id/template_id and no telemetry.'],
                warnings: [],
                qualityGrade: 'F' as const
            };
        }

        // Map core errors to Issues
        coreResult.errors.forEach((e: string) => itemIssues.push({ severity: 'CRITICAL', code: 'SCHEMA_VIOLATION', message: e }));
        coreResult.warnings.forEach((w: string) => itemIssues.push({ severity: 'WARNING', code: 'BEST_PRACTICE', message: w }));

        // 2. Internal Consistency (Duplicate Options, etc)
        const consistencyIssues = checkInternalConsistency(item);
        itemIssues.push(...consistencyIssues);

        // 3. Global Duplication Check (Scanning IndexedDB cache + Batch Self-Check)

        if (itemId) {
            // Check against DB
            if (existingItemIds.has(itemId)) {
                itemIssues.push({
                    severity: 'CRITICAL',
                    code: 'DB_DUPLICATE',
                    message: `Question ID '${itemId}' already exists in the local database.`,
                    suggestion: "Rename logic or skip this item."
                });
                summary.duplicates++;
            }

            // Check ID against Batch
            if (batchIds.has(itemId)) {
                itemIssues.push({
                    severity: 'CRITICAL',
                    code: 'BATCH_ID_DUPLICATE',
                    message: `Question ID '${itemId}' appears multiple times in this upload.`,
                });
            }
            batchIds.add(itemId);

            // Check Content against Batch
            if (sig) {
                if (batchSignatures.has(sig)) {
                    const firstId = batchSignatures.get(sig);
                    itemIssues.push({
                        severity: 'CRITICAL',
                        code: 'BATCH_CONTENT_DUPLICATE',
                        message: `Question content is identical to '${firstId}'. AI may have generated duplicates.`,
                        suggestion: "Modify the prompt text slightly."
                    });
                } else {
                    batchSignatures.set(sig, itemId);
                }
            }
        }

        // Final Validity Decision
        isValid = itemIssues.every(issue => issue.severity !== 'CRITICAL');
        const hasWarnings = itemIssues.some(issue => issue.severity === 'WARNING');

        if (isValid) summary.valid++;
        else summary.invalid++;
        if (hasWarnings) summary.warnings++;
        summary.total++;

        validatedItems.push({
            originalIndex: i,
            data: item,
            isValid,
            hasWarnings,
            issues: itemIssues,
            item_id: itemId || 'UNKNOWN',
            template_id: item.template_id || 'UNKNOWN',
            schemaVersion: version
        });
    }

    return { items: validatedItems, summary };
}
