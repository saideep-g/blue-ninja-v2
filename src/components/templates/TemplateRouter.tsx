import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Question } from '../../types';

// Import only surviving templates
import { MCQTemplate } from './MCQTemplate';
import { TwoTierTemplate } from './TwoTierTemplate';

interface TemplateRouterProps {
  question: Question;
  onSubmit: (result: any) => void;
  isSubmitting?: boolean;
  readOnly?: boolean;
}

const TEMPLATE_REGISTRY: Record<string, React.ComponentType<any>> = {
  'MCQ_CONCEPT': MCQTemplate,
  'MCQ_SKILL': MCQTemplate,
  'TWO_TIER': TwoTierTemplate,
};

export function TemplateRouter({ question, onSubmit, isSubmitting = false, readOnly = false }: TemplateRouterProps) {
  const TemplateComponent = useMemo(() => {
    // Determine template ID from question.type (standard) or legacy templateId field
    const templateId = question.type || (question as any).templateId;

    if (!templateId) return null;
    return TEMPLATE_REGISTRY[templateId] || null;
  }, [question]);

  if (!TemplateComponent) {
    const templateId = question.type || (question as any).templateId || 'UNKNOWN';
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900">Activity Under Construction</h3>
          <p className="text-yellow-700 mt-1">
            This learning activity (<code>{templateId}</code>) is currently being upgraded to our new world-class standard.
            Please skip to the next question.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TemplateComponent
      question={question}
      onAnswer={onSubmit}
      isSubmitting={isSubmitting}
      readOnly={readOnly}
    />
  );
}

// Utility functions for completeness (used by other components?)
export function getTemplateComponent(templateId: string) {
  return TEMPLATE_REGISTRY[templateId] || null;
}

export function isTemplateSupported(templateId: string) {
  return !!TEMPLATE_REGISTRY[templateId];
}

export default TemplateRouter;
