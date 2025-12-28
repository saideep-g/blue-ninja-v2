import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Question } from '../../types';
import { QuestionItem } from '../../types/curriculum.v3';

// Import templates
import { MCQTemplate } from './MCQTemplate';
import { TwoTierTemplate } from './TwoTierTemplate';

interface TemplateRouterProps {
  question: Question;
  onSubmit: (result: any) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
}

// ----------------------------------------------------------------------
// ADAPTER: V2 Question -> V3 QuestionItem (For TwoTierTemplate)
// ----------------------------------------------------------------------
const TwoTierAdapter: React.FC<TemplateRouterProps> = ({ question, onSubmit }) => {

  // Transform V2 Question to V3 QuestionItem on the fly
  const item: QuestionItem = useMemo(() => {
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

  // Handle V3 Telemetry -> V2 'onSubmit' translation
  const handleTelemetry = (event: string, payload: any) => {
    if (event === 'tier_2_submitted') {
      // Map V3 submission back to V2 expected format
      onSubmit({
        isCorrect: true, // If they reached here, they passed Tier 1
        explanation: payload.text,
        tier1Correct: true
      });
    }
    // Handle terminal failure (3 wrong attempts)
    if (event === 'item_terminated') {
      onSubmit({
        isCorrect: false,
        explanation: 'Terminated',
        tier1Correct: false
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

// ----------------------------------------------------------------------
// ROUTER
// ----------------------------------------------------------------------

const TEMPLATE_REGISTRY: Record<string, React.ComponentType<any>> = {
  'MCQ_CONCEPT': MCQTemplate,
  'MCQ_SKILL': MCQTemplate,
  'TWO_TIER': TwoTierAdapter, // USE ADAPTER
};

export function TemplateRouter({ question, onSubmit, isSubmitting = false, readOnly = false }: TemplateRouterProps) {
  const TemplateComponent = useMemo(() => {
    const templateId = question.type || (question as any).templateId;
    // Default to MCQTemplate if ID is missing or not in registry (e.g. "KPOP_THEME")
    if (!templateId) return MCQTemplate;
    return TEMPLATE_REGISTRY[templateId] || MCQTemplate;
  }, [question]);

  // Fallback is handled above, so TemplateComponent is never null.
  // We keep the "Under Construction" logic only if explicitly needed, 
  // but User requested standard fallback to prevent crashes.

  return (
    <TemplateComponent
      question={question}
      onSubmit={onSubmit} // Pass onSubmit specifically for Adapter
      onAnswer={onSubmit} // Pass onAnswer for V2 templates
      isSubmitting={isSubmitting}
      readOnly={readOnly}
    />
  );
}

export default TemplateRouter;
