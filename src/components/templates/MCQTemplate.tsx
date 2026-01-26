// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { CheckCircle2, XCircle, Lightbulb, AlertCircle, Loader2, ArrowRightCircle } from 'lucide-react';
import { Question } from '../../types';
import { useProfileStore } from '../../store/profile';
import { getRandomPraise } from '../../utils/feedbackUtils';

interface MCQTemplateProps {
  question: Question;
  onAnswer: (result: any) => void;
  onInteract?: (log: any) => void;
  isSubmitting: boolean;
  readOnly?: boolean;
  isPreview?: boolean;
}

interface Feedback {
  isCorrect: boolean;
  selectedIndex?: number;
  feedback: string;
}

const LatexRenderer = ({ text }: { text: string | null }) => {
  if (!text) return null;
  // Match both $$...$$ and $...$ delimiters
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if ((part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('$') && part.endsWith('$'))) {
          const math = part.startsWith('$$') ? part.slice(2, -2) : part.slice(1, -1);
          return <InlineMath key={i} math={math} />;
        }

        // Handle implicit power notation (e.g. 2^3, (a+b)^2, (-2)^3, 2.5^x)
        if (part.includes('^')) {
          // Allow alphanumeric, parens, +, -, ., ,, /, =, <, >, _
          const subParts = part.split(/([a-zA-Z0-9\(\)\+\-\.\\,\/\=\<\>_]+(?:\^[a-zA-Z0-9\(\)\+\-\.\\,\/\=\<\>_\^]+)+)/g);
          return (
            <span key={i}>
              {subParts.map((sub, j) => {
                if (sub.includes('^')) {
                  // Fix for parenthesized exponents e.g. 2^(3^2) -> 2^{(3^2)} to ensure entire group is superscript
                  const fixedSub = sub.replace(/\^(\([^\)]+\))/g, '^{$1}');
                  return <InlineMath key={`${i}-${j}`} math={fixedSub} />;
                }
                return <span key={`${i}-${j}`}>{sub}</span>;
              })}
            </span>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

/**
 * REDESIGNED MCQTemplate
 * World-class experience for young learners
 * - Question is the hero
 * - Clear, large options
 * - Encouraging feedback
 * - No anxiety-inducing metadata
 */
export function MCQTemplate({ question, onAnswer, onInteract, isSubmitting, readOnly, isPreview = false }: MCQTemplateProps) {
  const { autoAdvance } = useProfileStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // New State for Control Flow
  const [result, setResult] = useState<any>(null);
  const [firstThoughtLogged, setFirstThoughtLogged] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // FORCE RESET when question ID changes
  React.useEffect(() => {
    setSelectedIndex(null);
    setSubmitted(false);
    setFeedback(null);
    setResult(null);
    setFirstThoughtLogged(false);
    setIsAutoAdvancing(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    console.log(`[MCQTemplate] Mounted/Reset for Question: ${question.id}`);
  }, [question.id]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Safe typed access
  const stage0 = (question as any).stages?.[0];
  const interactionConfig =
    stage0?.interaction?.config ||
    (question as any).interaction?.config ||
    (question.content as any)?.interaction?.config ||
    {};

  const options = (interactionConfig.options || []) as { text: string; id?: string }[];

  // Resolve correct index
  let correctIndex = -1;
  const correctOptionId = stage0?.answer_key?.correct_option_id || (question as any).correctOptionId || question.answerKey?.correctOptionId;

  if (correctOptionId) {
    // String comparison for safety
    correctIndex = options.findIndex(o => String(o.id) === String(correctOptionId));
  }

  // Fallback to index if ID lookup failed but we have a direct index
  if (correctIndex === -1 && question.answerKey?.correctOptionIndex !== undefined) {
    correctIndex = question.answerKey.correctOptionIndex as number;
  }

  // Debug if needed
  // console.log('Correct Index:', correctIndex, 'ID:', correctOptionId);

  // Robust Prompt Extraction
  const getPromptText = (q: any) => {
    if (q.stages?.[0]?.prompt?.text) return q.stages[0].prompt.text;
    if (q.prompt?.text) return q.prompt.text;
    if (typeof q.prompt === 'string') return q.prompt;
    if (q.content?.prompt?.text) return q.content.prompt.text;
    if (q.question_text) return q.question_text;
    if (q.question) return q.question;
    return 'What is your answer?';
  };
  const prompt = getPromptText(question);
  const instruction = (question as any).instruction || (question.content as any)?.instruction;

  const feedbackMap = (question as any).feedbackMap || {};

  const handleSelect = (index: number) => {
    if (!submitted && !isSubmitting) {
      setSelectedIndex(index);

      // LOG INTERACTION (Step 4)
      if (onInteract) {
        onInteract({
          type: 'select_option',
          payload: {
            index,
            isFirstThought: !firstThoughtLogged
          }
        });
      }
      if (!firstThoughtLogged) setFirstThoughtLogged(true);
    }
  };

  const handleContinue = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (result && onAnswer) {
      onAnswer(result);
    }
  };

  const handleSubmit = async () => {
    if (selectedIndex === null || isSubmitting || submitted) return;

    const isCorrect = selectedIndex === correctIndex;

    // Gen Z Praise Logic
    const selectedPraise = isCorrect ? getRandomPraise() : undefined;
    const feedbackText = isCorrect
      ? selectedPraise!
      : feedbackMap.onIncorrectAttempt1 || '✗ Not quite. Try thinking about it differently.';

    const resultData = {
      isCorrect,
      selectedIndex,
      feedback: feedbackText,
    };

    setFeedback(resultData);
    setSubmitted(true);
    setResult(resultData);

    // Auto Advance Logic
    if (isCorrect && autoAdvance !== false) {
      setIsAutoAdvancing(true);
      timeoutRef.current = setTimeout(() => {
        onAnswer(resultData);
      }, 2000);
    }
  };

  return (
    <div className="w-full space-y-8 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ========== QUESTION PROMPT (HERO) ========== */}
      <div className="space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight whitespace-pre-wrap">
          <LatexRenderer text={prompt} />
        </h2>
        {instruction && (
          <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            <LatexRenderer text={instruction} />
          </p>
        )}

        {/* DEBUGGING AID */}
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

          // Logic for AFTER submission or PREVIEW
          const isWrongSelected = submitted && isSelected && !isCorrectOption;
          const shouldHighlightCorrect = (submitted || isPreview) && isCorrectOption;

          // Highlight logic
          let borderClass = 'border-gray-200 dark:border-slate-700';
          let bgClass = 'bg-white dark:bg-slate-800';
          let textClass = 'text-gray-900 dark:text-gray-100';
          let shadowClass = '';

          if (!submitted && !isPreview) {
            if (isSelected) {
              borderClass = 'border-blue-500';
              bgClass = 'bg-blue-50 dark:bg-blue-900/30';
              shadowClass = 'shadow-md';
            } else {
              // Hover state handled in main className
            }
          } else {
            // Submitted or Preview State
            if (shouldHighlightCorrect) {
              // ALWAYS Highlight the correct answer in Green
              borderClass = 'border-green-500';
              bgClass = 'bg-green-50 dark:bg-green-900/30';
              textClass = 'text-green-900 dark:text-green-100';
              shadowClass = 'shadow-md';
            } else if (isWrongSelected) {
              // Highlight selected wrong answer in Red
              borderClass = 'border-red-500';
              bgClass = 'bg-red-50 dark:bg-red-900/30';
              textClass = 'text-red-900 dark:text-red-100';
              shadowClass = 'shadow-md';
            } else {
              // Grey out everything else
              bgClass = 'bg-gray-50 dark:bg-slate-900/50';
              textClass = 'text-gray-400 dark:text-slate-500';
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={submitted || isSubmitting}
              className={`w-full p-5 md:p-6 rounded-xl border-2 text-left transition-all duration-200 font-medium text-base md:text-lg 
                ${borderClass} ${bgClass} ${textClass} ${shadowClass}
                ${!submitted && !isSelected ? 'hover:border-blue-300 hover:bg-blue-50' : ''}
                ${submitted || isSubmitting ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-4">
                {/* Radio button indicator */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all 
                    ${(!submitted && !isPreview)
                      ? (isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-700')
                      : (shouldHighlightCorrect ? 'border-green-500 bg-green-500' : (isWrongSelected ? 'border-red-500 bg-red-500' : 'border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700'))
                    }`}
                >
                  {isSelected && !submitted && !isPreview && <div className="w-2 h-2 bg-white rounded-full" />}
                  {(submitted || isPreview) && shouldHighlightCorrect && <CheckCircle2 className="w-5 h-5 text-white" />}
                  {submitted && isWrongSelected && <XCircle className="w-5 h-5 text-white" />}
                </div>

                <span className="flex-1"><LatexRenderer text={option.text} /></span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========== ACTION BUTTON (BEFORE SUBMIT) ========== */}
      {!submitted && !isPreview && (
        <button
          onClick={handleSubmit}
          disabled={selectedIndex === null || isSubmitting}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold text-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Checking...' : 'Check Answer'}
        </button>
      )}

      {/* ========== FEEDBACK & NEXT SECTION ========== */}
      {(submitted || isPreview) && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div
            className={`p-6 rounded-2xl flex gap-4 items-start ${((feedback && feedback.isCorrect) || isPreview)
              ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
              }`}
          >
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${((feedback && feedback.isCorrect) || isPreview) ? 'bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-300'}`}>
              {((feedback && feedback.isCorrect) || isPreview) ? <CheckCircle2 className="w-6 h-6" /> : <Lightbulb className="w-6 h-6" />}
            </div>

            <div className="flex-1 space-y-1 pt-1">
              <h4 className={`font-bold text-lg ${((feedback && feedback.isCorrect) || isPreview) ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                {isPreview ? 'Solution Breakdown' : (feedback.isCorrect ? (
                  <span className="flex items-center gap-2">
                    {feedback.feedback}
                    {isAutoAdvancing && <Loader2 className="w-4 h-4 animate-spin opacity-50" />}
                  </span>
                ) : 'Correct Answer:')}
              </h4>

              {/* Show explanation text if INCORRECT or PREVIEW */}
              {(((feedback && !feedback.isCorrect) || isPreview) && !isAutoAdvancing) && (
                <div className="space-y-2">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm inline-block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">The Correct Answer</span>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">
                      <LatexRenderer text={options[correctIndex]?.text} />
                    </p>
                  </div>
                  {feedback && !feedback.isCorrect && (
                    <p className="text-base text-red-700 dark:text-red-400">
                      {feedback.feedback}
                    </p>
                  )}
                  {/* Detailed Explanation Text */}
                  {(question.explanation || (question as any).explanation_text) && (
                    <div className="mt-4 p-4 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                      <LatexRenderer text={question.explanation || (question as any).explanation_text} />
                    </div>
                  )}
                </div>
              )}

              {/* Progress Bar for Auto Advance */}
              {isAutoAdvancing && (
                <div className="w-full h-1 bg-green-200 mt-3 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 animate-[progress_2s_linear_forward]" style={{ width: '100%' }}></div>
                </div>
              )}
            </div>
          </div>

          {/* CONTINUE BUTTON */}
          <button
            autoFocus
            onClick={handleContinue}
            className={`w-full py-4 rounded-xl font-extrabold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${((feedback && feedback.isCorrect) || isPreview)
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 text-white'
              }`}
          >
            {isPreview ? 'Got it, Next Question' : (feedback.isCorrect ? 'Finish & Next Question' : 'Got it, Next Question')} <ArrowRightCircle size={24} />
          </button>
          {!isPreview && (
            <p className="text-center text-xs text-slate-400 font-medium pb-4">
              Press Enter or Click to continue
            </p>
          )}
        </div>
      )}

      {/* ========== WORKED SOLUTION (COLLAPSIBLE) ========== */}
      {(submitted || isPreview) && question.workedSolution?.steps && question.workedSolution.steps.length > 0 && (
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
                  <LatexRenderer text={step} />
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}