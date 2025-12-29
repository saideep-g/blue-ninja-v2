import { QuestionTransformer } from '../transformers';
import { MCQBranchingDataV1, Stage } from '../../types/mcq-branching/v1/schema';

/**
 * COMPILER: V3 Declarative -> Branching FSM
 * Converts "Unlock Logic" (e.g., "Show this after Stage 1 is correct")
 * into explicit navigation paths (e.g., "Option A -> Go to Stage 2").
 */
export const V3ToBranchingTransformer: QuestionTransformer = {
    id: 'v3-declarative-to-branching',
    sourceType: 'v3_declarative_mcq',
    targetType: 'mcq-branching:1',
    description: 'Compiles V3 Logic (unlock_when) into an executable Finite State Machine.',

    transform: (source: any) => {
        try {
            if (!source.stages || !Array.isArray(source.stages)) {
                return { success: false, error: 'Invalid V3: source.stages array missing' };
            }

            // 1. Clone stages to avoid mutation
            const rawStages = JSON.parse(JSON.stringify(source.stages));

            // 2. Identify Entry Stage (No dependencies)
            // Usually the first one if unlock_logic is 'always' or null
            const entryStage = rawStages.find((s: any) =>
                !s.unlock_logic ||
                s.unlock_logic.show_when === 'always' ||
                !s.unlock_logic.depends_on_stage_id
            );

            if (!entryStage) {
                return { success: false, error: 'No entry stage found (unlock_logic: show_when=always)' };
            }

            // 3. COMPILE LINKS
            // iterate over all stages to find where they should be linked FROM
            rawStages.forEach((targetStage: any) => {
                const logic = targetStage.unlock_logic;
                if (!logic || !logic.depends_on_stage_id) return;

                const parentId = logic.depends_on_stage_id;
                const parentStage = rawStages.find((s: any) => s.stage_id === parentId);

                if (!parentStage) {
                    console.warn(`Orphan stage ${targetStage.stage_id} depends on missing ${parentId}`);
                    return;
                }

                // TYPE A: SUCCESS LINK (Show after Correct)
                if (logic.show_when === 'after_stage_correct') {
                    const correctOptId = parentStage.answer_key?.correct_option_id;
                    const correctOpt = parentStage.interaction.config.options.find((o: any) => o.id === correctOptId);

                    if (correctOpt) {
                        // INJECT TRANSITION
                        correctOpt.next = { type: 'goto_stage', target: targetStage.stage_id };
                    }
                }

                // TYPE B: REPAIR LINK (Show after Failure / Attempts Exceeded)
                if (logic.show_when === 'after_stage_attempts_exceeded') {
                    const correctOptId = parentStage.answer_key?.correct_option_id;
                    const incorrectOptions = parentStage.interaction.config.options.filter((o: any) => o.id !== correctOptId);

                    incorrectOptions.forEach((opt: any) => {
                        // INJECT TRANSITION
                        // Only if it doesn't already have a robust specific misconception branch
                        if (!opt.next) {
                            opt.next = { type: 'goto_stage', target: targetStage.stage_id };
                        }
                    });
                }
            });

            // 4. CLEANUP & NORMALIZE
            // Ensure every terminal option has an 'exit' action if not linked
            const compiledStages: Stage[] = rawStages.map((s: any) => {
                // Map V3 'interaction' structure to our schema if slightly different
                // V3 sample: interaction.config.options has { id, text, diagnostic... }
                // Our Schema: same.

                const options = s.interaction.config.options.map((opt: any) => {
                    const isCorrect = s.answer_key?.correct_option_id === opt.id;

                    // Default Next Action
                    let next = opt.next;
                    if (!next) {
                        if (isCorrect) {
                            // Check if there is ANY stage that depends on this one? 
                            // If not, it's an EXIT.
                            // We did the linking above. If opt.next is still null, it's a leaf node.
                            next = { type: 'exit', outcome: 'pass' };
                        } else {
                            // Incorrect default: Loop (try again)
                            next = { type: 'loop' };
                        }
                    }

                    return {
                        id: opt.id,
                        text: opt.text,
                        latex: opt.latex,
                        is_correct: isCorrect,
                        feedback: opt.feedback || (isCorrect ? 'Correct!' : 'Try again.'), // V3 might lack feedback strings
                        diagnostic: opt.diagnostic?.misconception_id,
                        next
                    };
                });

                return {
                    stage_id: s.stage_id,
                    intent: s.intent || 'INITIAL', // Map 'STR' -> 'REPAIR_PROCEDURE'? Heuristics can go here
                    prompt: s.prompt,
                    instruction: s.instruction,
                    interaction: {
                        type: 'mcq_concept', // Mapping 'mcq_concept' -> 'mcq_concept'
                        config: {
                            options,
                            shuffle: s.interaction.config.shuffle,
                            single_select: s.interaction.config.single_select
                        }
                    }
                };
            });

            // 5. FINAL ASSEMBLY
            const result: MCQBranchingDataV1 = {
                item_id: source.item_id,
                atom_id: source.atom_id,
                flow: {
                    mode: 'branching',
                    entry_stage_id: entryStage.stage_id,
                    return_behavior: 'reload_with_new_vars'
                },
                stages: compiledStages
            };

            return { success: true, data: result };

        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
};
