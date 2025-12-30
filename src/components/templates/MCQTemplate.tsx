import React, { useState } from 'react';
import { CheckCircle2, XCircle, Lightbulb, AlertCircle } from 'lucide-react';
import { Question } from '../../types';

interface MCQTemplateProps {
  question: Question;
  onAnswer: (result: any) => void;
  isSubmitting: boolean;
  readOnly?: boolean;
}

interface Feedback {
  isCorrect: boolean;
  selectedIndex?: number;
  feedback: string;
}

/**
 * REDESIGNED MCQTemplate
 * World-class experience for young learners
 * - Question is the hero
 * - Clear, large options
 * - Encouraging feedback
 * - No anxiety-inducing metadata
 */
export function MCQTemplate({ question, onAnswer, isSubmitting }: MCQTemplateProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Safe typed access (Supports V2 ContentWrapper, V3 Stages, and V2 Flat)
  const stage0 = (question as any).stages?.[0];
  const interactionConfig =
    stage0?.interaction?.config ||
    (question as any).interaction?.config ||
    (question.content as any)?.interaction?.config ||
    {};

  const options = (interactionConfig.options || []) as { text: string; id?: string }[];

  // Resolve correct index (V3 uses IDs, V2 uses Index)
  let correctIndex = question.answerKey?.correctOptionIndex as number;
  if (stage0?.answer_key?.correct_option_id) {
    correctIndex = options.findIndex(o => o.id === stage0.answer_key.correct_option_id);
  } else if ((question as any).correctOptionId) {
    correctIndex = options.findIndex(o => o.id === (question as any).correctOptionId);
  }

  // Robust Prompt Extraction
  const getPromptText = (q: any) => {
    if (q.stages?.[0]?.prompt?.text) return q.stages[0].prompt.text;
    if (q.prompt?.text) return q.prompt.text;
    if (typeof q.prompt === 'string') return q.prompt;
    if (q.content?.prompt?.text) return q.content.prompt.text;
    if (q.question_text) return q.question_text;
    return 'What is your answer?';
  };
  const prompt = getPromptText(question);
  const instruction = (question as any).instruction || (question.content as any)?.instruction;

  const feedbackMap = (question as any).feedbackMap || {};

  const handleSelect = (index: number) => {
    if (!submitted && !isSubmitting) {
      setSelectedIndex(index);
    }
  };

  const handleSubmit = async () => {
    if (selectedIndex === null || isSubmitting) return;

    const isCorrect = selectedIndex === correctIndex;
    const result = {
      isCorrect,
      selectedIndex,
      feedback: isCorrect
        ? feedbackMap.onCorrect || '✓ Excellent! That\'s correct!'
        : feedbackMap.onIncorrectAttempt1 || '✗ Not quite. Try thinking about it differently.',
    };

    setFeedback(result);
    setSubmitted(true);
    onAnswer(result);
  };

  return (
    <div className="w-full space-y-8 flex flex-col">
      {/* ========== QUESTION PROMPT (HERO) ========== */}
      <div className="space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight whitespace-pre-wrap">
          {prompt}
        </h2>
        {instruction && (
          <p className="text-base text-gray-600 leading-relaxed whitespace-pre-wrap">
            {instruction}
          </p>
        )}

        {/* DEBUGGING AID: Only show if content failed to load */}
        {prompt === 'What is your answer?' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900 font-mono overflow-auto">
            <div className="font-bold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Content Load Error (Fallback Triggered)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <span className="opacity-75">ID:</span> <span>{question.id}</span>
              <span className="opacity-75">Type:</span> <span>{question.type || (question as any).template_id || 'UNKNOWN'}</span>
            </div>
            <details className="cursor-pointer">
              <summary className="font-bold opacity-75 hover:opacity-100">View Raw Data</summary>
              <pre className="mt-2 text-xs bg-white p-2 border rounded overflow-auto max-h-40">
                {JSON.stringify(question, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      {/* ========== OPTIONS (LARGE, TOUCHABLE) ========== */}
      <div className="space-y-3 flex-1">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrectOption = index === correctIndex;
          const isWrongSelected = submitted && isSelected && !isCorrectOption;
          const isCorrectSelected = submitted && isCorrectOption;

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={submitted || isSubmitting}
              className={`w-full p-5 md:p-6 rounded-xl border-2 text-left transition-all duration-200 font-medium text-base md:text-lg ${
                // Before submission
                !submitted
                  ? isSelected
                    ? 'border-blue-500 bg-blue-50 text-gray-900 shadow-md'
                    : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300 hover:bg-blue-50'
                  : // After submission
                  isCorrectSelected
                    ? 'border-green-500 bg-green-50 text-green-900 shadow-md'
                    : isWrongSelected
                      ? 'border-red-500 bg-red-50 text-red-900 shadow-md'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                } ${submitted || isSubmitting ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-4">
                {/* Radio button indicator */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${!submitted
                    ? isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 bg-white'
                    : isCorrectSelected
                      ? 'border-green-500 bg-green-500'
                      : isWrongSelected
                        ? 'border-red-500 bg-red-500'
                        : 'border-gray-300 bg-gray-100'
                    }`}
                >
                  {isSelected && !submitted && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                  {submitted && isCorrectSelected && (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  )}
                  {submitted && isWrongSelected && (
                    <XCircle className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Option text */}
                <span className="flex-1">{option.text}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========== ACTION BUTTON ========== */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={selectedIndex === null || isSubmitting}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold text-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Checking...' : 'Check Answer'}
        </button>
      ) : null}

      {/* ========== FEEDBACK (ENCOURAGING) ========== */}
      {submitted && feedback && (
        <div
          className={`p-5 md:p-6 rounded-xl flex gap-4 items-start ${feedback.isCorrect
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-blue-50 border-2 border-blue-200'
            }`}
        >
          {feedback.isCorrect ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p
              className={`text-base md:text-lg font-semibold ${feedback.isCorrect ? 'text-green-900' : 'text-blue-900'
                }`}
            >
              {feedback.feedback}
            </p>
            {!feedback.isCorrect && (
              <p className="text-sm text-blue-700 mt-2">
                The correct answer is: <strong>{options[correctIndex]?.text}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========== WORKED SOLUTION (COLLAPSIBLE) ========== */}
      {submitted && question.workedSolution?.steps && question.workedSolution.steps.length > 0 && (
        <details className="bg-gradient-to-br from-purple-50 to-indigo-50 p-5 md:p-6 rounded-xl border-2 border-purple-200 group">
          <summary className="cursor-pointer font-bold text-gray-900 text-base md:text-lg flex items-center gap-2 hover:text-purple-600 transition-colors">
            <span>💡 See how to solve this</span>
            <span className="ml-auto text-gray-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-4 space-y-3">
            {question.workedSolution.steps.map((step: string, idx: number) => (
              <div key={idx} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
                <p className="text-gray-700 text-sm md:text-base leading-relaxed flex-1 pt-0.5">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}