import { registry } from './registry';
import { MCQManifestV1 } from './types/multiple-choice/v1/manifest';
import { MCQBranchingManifestV1 } from './types/mcq-branching/v1/manifest';

export function initializeQuestionRegistry() {
    registry.register(MCQManifestV1);
    registry.register(MCQBranchingManifestV1);
}

export { registry };
export type { QuestionManifest } from './domain';
export { QuestionRenderer } from './components/QuestionRenderer';
