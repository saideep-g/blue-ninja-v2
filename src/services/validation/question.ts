/**
 * src/services/questionValidatorV3.ts
 * ===================================
 * 
 * Validates question items against the AI Reading Guide V3 specs.
 * Implements the "Logic Bridge" checks:
 * 1. Atom existence in Core Curriculum (Doc1).
 * 2. Template existence in Template Library (Doc2).
 * 3. Misconception ID validity (Doc1).
 * 4. Schema compliance (Doc3/Schema file).
 */

import coreCurriculum from '../../data/cbse7_core_curriculum_v3.json';
import templateLibrary from '../../data/template_library_v3.json';
// Assessment guide (Doc3) if needed, mostly for scaffolding rules not item validation
// import assessmentGuide from '../../data/cbse7_assessment_guide_v3.json';

interface ValidationResultV3 {
    itemId: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
    qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

const VALID_TEMPLATES = new Set(templateLibrary.templates.map(t => t.template_id));
const ATOM_INDEX = (coreCurriculum as any).atom_index || {};
// If atom_index is missing in JSON (might be generated), we might need to build it.
// Checking `atom_index` existence in Step 1818 summary... it says "atom_index{}".
// I'll assume it exists.

const MISCONCEPTION_IDS = new Set(Object.keys((coreCurriculum as any).misconception_library || {}));

export async function validateQuestionV3(item: any): Promise<ValidationResultV3> {
    const result: ValidationResultV3 = {
        itemId: item.item_id || 'UNKNOWN',
        isValid: true,
        errors: [],
        warnings: [],
        qualityGrade: 'A'
    };

    // 1. Basic Identity
    if (!item.item_id) result.errors.push("Missing item_id");
    if (!item.atom_id) result.errors.push("Missing atom_id");
    if (!item.template_id) result.errors.push("Missing template_id");
    if (!item.difficulty) result.errors.push("Missing difficulty");
    if (!item.evidence || !Array.isArray(item.evidence)) result.errors.push("Missing evidence[]");

    // 2. Telemetry Check (MUST NOT EXIST)
    if (item.telemetry) {
        result.errors.push("Telemetry field MUST NOT be present in V3 items. It is derived from Doc2.");
    }

    // 3. Atom Validity (Doc1)
    if (item.atom_id) {
        if (!ATOM_INDEX[item.atom_id]) {
            // Fallback: search modules if atom_index is missing/incomplete
            let found = false;
            for (const mod of (coreCurriculum as any).modules || []) {
                if (mod.atoms && mod.atoms.some((a: any) => a.id === item.atom_id || a.atom_id === item.atom_id)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                result.errors.push(`Invalid atom_id: '${item.atom_id}' not found in Core Curriculum.`);
            }
        }
    }

    // 4. Template Validity (Doc2)
    if (item.template_id) {
        if (!VALID_TEMPLATES.has(item.template_id)) {
            result.errors.push(`Invalid template_id: '${item.template_id}' not found in Template Library.`);
        }
    }

    // 5. Structure Logic (Single vs Multi-stage)
    if (item.stages) {
        // Multi-stage
        if (!Array.isArray(item.stages) || item.stages.length < 2) {
            result.errors.push("Multi-stage items must have at least 2 stages.");
        }
        // Validate each stage
        item.stages.forEach((stage: any, idx: number) => {
            if (!stage.prompt) result.errors.push(`Stage ${idx} missing prompt`);
            if (!stage.interaction) result.errors.push(`Stage ${idx} missing interaction`);
            if (!stage.answer_key) result.errors.push(`Stage ${idx} missing answer_key`);
        });
    } else {
        // Single-stage
        if (!item.prompt) result.errors.push("Missing prompt");
        if (!item.interaction) result.errors.push("Missing interaction");
        if (!item.answer_key) result.errors.push("Missing answer_key");
    }

    // 6. Diagnostics (Open Response vs Option Based)
    // "For option-based templates, diagnostics should be INLINE within options"
    // "For open-response, use diagnostics.error_model"
    // We can check checks based on template type if we had type info map.
    // For now, check references.

    if (item.diagnostics?.error_model) {
        item.diagnostics.error_model.forEach((rule: any, idx: number) => {
            const miscId = rule.diagnostic?.misconception_id;
            if (miscId && !MISCONCEPTION_IDS.has(miscId)) {
                result.warnings.push(`Unknown misconception_id '${miscId}' in error_model[${idx}]`);
            }
        });
    }

    // Inline diagnostics in options (if any)
    if (item.interaction?.config?.options) {
        item.interaction.config.options.forEach((opt: any, idx: number) => {
            if (opt.diagnostic?.misconception_id) {
                if (!MISCONCEPTION_IDS.has(opt.diagnostic.misconception_id)) {
                    result.warnings.push(`Unknown misconception_id '${opt.diagnostic.misconception_id}' in option[${idx}]`);
                }
            }
        });
    }

    // 7. Evidence Checks
    if (item.evidence) {
        item.evidence.forEach((ev: any, idx: number) => {
            if (!['conceptual', 'procedural', 'logical', 'transfer'].includes(ev.outcome_type)) {
                result.errors.push(`Invalid outcome_type '${ev.outcome_type}' in evidence[${idx}]`);
            }
        });
    }

    // Quality Grading
    if (result.errors.length > 0) {
        result.isValid = false;
        result.qualityGrade = 'F';
    } else if (result.warnings.length > 0) {
        result.qualityGrade = 'B'; // Or C dependent on count
    }

    return result;
}
