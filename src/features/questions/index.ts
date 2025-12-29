import { registry } from './registry';
import { MCQManifestV1 } from './types/multiple-choice/v1/manifest';

export function initializeQuestionRegistry() {
    registry.register(MCQManifestV1);
    // register(DragDropManifestV1);
    // ... future types
}

export { registry };
export type { QuestionManifest } from './domain';
export { QuestionRenderer } from './components/QuestionRenderer';
