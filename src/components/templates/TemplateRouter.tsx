import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Question } from '../../types';
import { QuestionItem } from '../../types/curriculum.v3';

// Import templates
import { MCQTemplate } from './MCQTemplate';
import { McqEraTemplate } from './McqEraTemplate';
import { TwoTierTemplate } from './TwoTierTemplate';
import { NumericInputTemplate } from './NumericInputTemplate';
import { MatchingTemplate } from './MatchingTemplate';
import { ClassifySortTemplate } from './ClassifySortTemplate';
import { NumberLineTemplate } from './NumberLineTemplate';
import { SortOrderTemplate } from './SortOrderTemplate';
import { ErrorAnalysisTemplate } from './ErrorAnalysisTemplate';
import { McqBranchingTemplate } from './McqBranchingTemplate';
import { BalanceOpsTemplate } from './BalanceOpsTemplate';
import { NumericAutoTemplate } from './NumericAutoTemplate';

interface TemplateRouterProps {
  question: Question;
  onSubmit: (result: any, shouldAdvance?: boolean) => void;
  onInteract?: (log: any) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
  isPreview?: boolean;
}

// ----------------------------------------------------------------------
// ADAPTER: V2 Question -> V3 QuestionItem (For TwoTierTemplate)
// ----------------------------------------------------------------------
const TwoTierAdapter: React.FC<TemplateRouterProps & { onAnswer: (result: any) => void }> = ({ question, onAnswer }) => {

  // Transform V2 Question to V3 QuestionItem on the fly
  const item: QuestionItem = useMemo(() => {
    // DIRECT PASSTHROUGH: If it's already a V3 item (has stages), use it.
    if ((question as any).stages && Array.isArray((question as any).stages)) {
      return question as any as QuestionItem;
    }

    const config = question.content?.interaction?.config || {};
    const options = (config.options || []).map((opt: any, idx: number) => ({
      id: `opt-${idx}`, // Generate synthetic IDs if missing
      text: opt.text || '',
      diagnostic: opt.distractor_type ? { misconception_id: opt.distractor_type, confidence: 0.5 } : undefined
    }));

    const correctIndex = question.answerKey?.correctOptionIndex ?? 0;
    const correctOptionId = `opt-${correctIndex}`;

    return {
      item_id: question.id,
      atom_id: question.atom || 'atom-001',
      template_id: 'TWO_TIER',
      difficulty: 1,
      context_tags: [],
      evidence: [],
      stages: [
        {
          stage_id: 'stage-1',
          prompt: {
            text: question.content?.prompt?.text || '',
            latex: null
          },
          instruction: 'Select the correct answer',
          interaction: {
            type: 'MCQ',
            config: {
              options,
              shuffle: false
            }
          },
          answer_key: {
            correct_option_id: correctOptionId
          }
        },
        {
          stage_id: 'stage-2',
          prompt: {
            text: question.answerKey?.tier2Prompt || 'Explain your reasoning...',
            latex: null
          },
          instruction: 'Explain your thinking',
          interaction: {
            type: 'TEXT_INPUT',
            config: {
              max_chars: 500
            }
          },
          answer_key: {
            key_points: question.answerKey?.keywords || []
          }
        }
      ]
    };
  }, [question]);

  const attemptsRef = React.useRef(1);

  // Handle V3 Telemetry -> V2 'onSubmit' translation
  const handleTelemetry = (event: string, payload: any) => {
    if (event === 'tier_1_correct') {
      attemptsRef.current = payload.attempts || 1;
    }

    if (event === 'tier_2_submitted') {
      // Map V3 submission back to V2 expected format
      // We pass rich data in the explanation field or as extra props
      onAnswer({
        isCorrect: true,
        explanation: payload.text,
        tier1Correct: true,
        attempts: attemptsRef.current,
        isRecovered: attemptsRef.current > 1
      });
    }
    // Handle terminal failure (3 wrong attempts)
    if (event === 'item_terminated') {
      onAnswer({
        isCorrect: false,
        explanation: 'Terminated',
        tier1Correct: false,
        attempts: 3,
        isRecovered: false
      });
    }
  };

  return (
    <TwoTierTemplate
      item={item}
      coreCurriculum={{}} // Mock
      assessmentGuide={{}} // Mock
      onEmitTelemetry={handleTelemetry}
    />
  );
};

const TEMPLATE_REGISTRY: Record<string, React.ComponentType<any>> = {
  'MCQ_CONCEPT': MCQTemplate,
  'MCQ_SKILL': MCQTemplate,
  'MCQ_SIMPLIFIED': McqEraTemplate, // Restored Era-specific template with Sound & Vibe
  'TWO_TIER': TwoTierAdapter,
  'NUMERIC_INPUT': NumericAutoTemplate, // Force use of new Auto Template
  'NUMERIC_AUTO': NumericAutoTemplate,
  'MATCHING': MatchingTemplate,
  'CLASSIFY_SORT': ClassifySortTemplate,
  'DRAG_DROP_MATCH': ClassifySortTemplate,
  'NUMBER_LINE_PLACE': NumberLineTemplate,
  'STEP_ORDER': SortOrderTemplate,
  'SORT_ORDER': SortOrderTemplate,
  'ERROR_ANALYSIS': ErrorAnalysisTemplate,
  'MCQ_BRANCHING': McqBranchingTemplate,
  'BALANCE_OPS': BalanceOpsTemplate,
};

export function TemplateRouter({ question, onSubmit, onInteract, isSubmitting = false, readOnly = false, isPreview = false }: TemplateRouterProps) {
  const TemplateComponent = useMemo(() => {
    const q = question as any;
    // Check all possible ID locations (V2 camelCase, V3 snake_case, legacy type)
    let templateId = q.type || q.templateId || q.template_id || q.template;

    // HEURISTIC: If templateId is missing, try to infer it from the data structure
    if (!templateId) {
      const hasAnswer = q.answer || q.correct_answer || q.correctAnswer || (q.answerKey && (q.answerKey.correctValue || q.answerKey.value));
      const hasOptions = q.options && Array.isArray(q.options) && q.options.length > 0;

      if (hasAnswer && !hasOptions) {
        templateId = 'NUMERIC_AUTO';
      } else {
        templateId = 'MCQ_SIMPLIFIED'; // Default fallback
      }
    }

    if (templateId && typeof templateId === 'string') {
      templateId = templateId.toUpperCase();
    }

    return TEMPLATE_REGISTRY[templateId || 'MCQ_SIMPLIFIED'] || McqEraTemplate;
  }, [question]);

  // Fallback is handled above, so TemplateComponent is never null.
  return (
    <TemplateComponent
      question={question}
      onAnswer={onSubmit} // Pass onAnswer for V2 templates
      onInteract={onInteract}
      isSubmitting={isSubmitting}
      readOnly={readOnly}
      isPreview={isPreview}
    />
  );
}

export default TemplateRouter;
