
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Lightbulb, Calculator, ArrowRight, ArrowRightCircle, Loader2 } from 'lucide-react';
import { Question } from '../../types';
import { useProfileStore } from '../../store/profile';
import { getRandomPraise } from '../../utils/feedbackUtils';

interface NumericInputTemplateProps {
    question: Question;
    onAnswer: (result: any) => void;
    isSubmitting: boolean;
    readOnly?: boolean;
}

interface Feedback {
    isCorrect: boolean;
    value: string;
    feedback: string;
}

/**
 * NUMERIC INPUT TEMPLATE
 * Designed for 13-year-old math learners.
 * Focus: Clarity, Encouragement, Touch-First.
 */
export function NumericInputTemplate({ question, onAnswer, isSubmitting, readOnly }: NumericInputTemplateProps) {
    const { autoAdvance } = useProfileStore(); // Get preference

    const [inputValue, setInputValue] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [result, setResult] = useState<any>(null); // Store result for delayed submission
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Safe Access
    const content = question.content || {};
    const prompt = (question as any).prompt?.text || content.prompt?.text || 'Calculate the answer:';
    const instruction = (question as any).instruction || content.instruction || 'Enter your answer below.';

    const interactionConfig = content.interaction?.config || (question as any).interaction?.config || {};
    const placeholder = interactionConfig.placeholder || 'Enter a number...';
    const unit = interactionConfig.unit || '';

    const parseValue = (val: string | number | undefined): number | null => {
        if (typeof val === 'number') return val;
        if (!val) return null;
        val = val.toString().trim();

        // Handle Fractions (e.g. "5/12", " 5 / 12 ")
        if (val.includes('/')) {
            const parts = val.split('/');
            if (parts.length === 2) {
                const num = parseFloat(parts[0]);
                const den = parseFloat(parts[1]);
                if (!isNaN(num) && !isNaN(den) && den !== 0) {
                    return num / den;
                }
            }
        }

        // Handle standard numbers
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    };

    const answerKey = question.answerKey || (question as any).answer_key || {};
    // Support both 'correctValue' (number) and 'value' (string fraction)
    const rawCorrectValue = answerKey.correctValue ?? answerKey.value;
    const correctValue = parseValue(rawCorrectValue) ?? 0;
    const tolerance = answerKey.tolerance || 0.001; // Default tolerance for float math

    const feedbackMap = (question as any).feedbackMap || {};

    const handleCreateFeedback = (isCorrect: boolean, selectedPraise?: string) => {
        if (isCorrect) {
            return selectedPraise || feedbackMap.onCorrect || getRandomPraise();
        }
        return feedbackMap.onIncorrectAttempt1 || '✗ Not quite. Double check your calculation.';
    };

    const gcd = (a: number, b: number): number => {
        return b === 0 ? a : gcd(b, a % b);
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || submitted || isSubmitting || readOnly) return;

        const userNum = parseValue(inputValue);

        // Basic number validation
        if (userNum === null) {
            alert("Please enter a valid number or fraction (e.g. 5/12).");
            return;
        }

        const config = content.interaction?.config || (question as any).interaction?.config || {};
        const isFractionMode = config.mode === 'fraction';
        const requireSimplest = config.require_simplest_form === true;

        if (isFractionMode && requireSimplest) {
            // 1. Must be a fraction (contain '/')
            if (!inputValue.includes('/')) {
                alert("Please enter your answer as a fraction (e.g. 1/2).");
                return;
            }

            // 2. Must be simplified
            const parts = inputValue.split('/');
            if (parts.length === 2) {
                const num = Math.abs(parseInt(parts[0]));
                const den = Math.abs(parseInt(parts[1]));
                // gcd includes sign check usually but Math.abs safer for logical simplification check
                const divisor = gcd(num, den);
                if (divisor > 1) {
                    const resultData = {
                        isCorrect: false,
                        value: inputValue,
                        feedback: `Your answer is correct roughly, but not in simplest form.Please simplify ${inputValue}.`
                    };
                    setFeedback(resultData);
                    setSubmitted(true);
                    setResult(resultData);
                    // onAnswer (immediately) removed - wait for user to click next
                    return;
                }
            }
        }

        // Check Answer with Tolerance
        const diff = Math.abs(userNum - correctValue);
        const isCorrect = diff <= tolerance;

        const selectedPraise = isCorrect ? getRandomPraise() : undefined;

        const resultData = {
            isCorrect,
            value: inputValue,
            feedback: handleCreateFeedback(isCorrect, selectedPraise)
        };

        setFeedback(resultData);
        setSubmitted(true);
        setResult(resultData);

        // AUTO-ADVANCE FOR CORRECT ANSWERS
        // Only if correct AND autoAdvance preference is explicitly true (or undefined default)
        if (isCorrect && autoAdvance !== false) {
            setIsAutoAdvancing(true);
            timeoutRef.current = setTimeout(() => {
                if (onAnswer) onAnswer(resultData);
            }, 2000); // 2 second delay
        }
    };

    const handleContinue = () => {
        // Clear timeout if user manually clicks
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (result && onAnswer) {
            onAnswer(result);
        }
    };

    const submittable = !submitted && !isSubmitting && !readOnly;

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ========== HERO SECTION (Question Prompt) ========== */}
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-blue-900/5 border-2 border-white relative overflow-hidden group hover:border-blue-100 transition-all">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:bg-blue-100 transition-colors" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-50 rounded-full blur-2xl -ml-12 -mb-12 opacity-50 group-hover:bg-purple-100 transition-colors" />

                <div className="relative z-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                        <Calculator className="w-3 h-3" />
                        Numeric Problem
                    </div>

                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                        {prompt}
                    </h2>

                    {instruction && (
                        <p className="text-lg text-slate-600 font-medium">
                            {instruction}
                        </p>
                    )}
                </div>
            </div>

            {/* ========== INPUT SECTION ========== */}
            <div className="relative group">
                <form onSubmit={handleSubmit} className="relative">
                    <div className={`
            relative flex items-center bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 overflow-hidden
            ${submitted
                            ? feedback?.isCorrect
                                ? 'border-green-400 ring-4 ring-green-100'
                                : 'border-red-300 ring-4 ring-red-100'
                            : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 hover:border-blue-300'
                        }
`}>
                        {/* Input Field */}
                        <input
                            type="text" // Using text to allow negative signs easily, but validated as number
                            inputMode="decimal"
                            disabled={!submittable}
                            placeholder={placeholder}
                            value={inputValue}
                            onChange={(e) => {
                                // Allow numbers, dots, negative sign, and slashes for fractions
                                const val = e.target.value;
                                if (val === '' || /^[0-9./\s-]*$/.test(val)) {
                                    setInputValue(val);
                                }
                            }}
                            className="w-full p-6 md:p-8 text-3xl md:text-4xl font-bold text-slate-800 placeholder:text-slate-300 bg-transparent outline-none disabled:bg-slate-50 disabled:text-slate-500 text-center md:text-left"
                        />

                        {/* Unit Badge */}
                        {unit && (
                            <div className="pr-6 md:pr-8">
                                <span className="text-xl md:text-2xl font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
                                    {unit}
                                </span>
                            </div>
                        )}

                        {/* Status Icon Overlay */}
                        {submitted && feedback && (
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 animate-in zoom-in spin-in-12 duration-300">
                                {feedback.isCorrect ? (
                                    <div className="bg-green-100 p-2 rounded-full">
                                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="bg-red-100 p-2 rounded-full">
                                        <XCircle className="w-8 h-8 text-red-600" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Submit Button (Only before submit) */}
                    {!submitted && (
                        <button
                            type="submit"
                            disabled={!inputValue || isSubmitting}
                            className="mt-6 w-full md:w-auto md:absolute md:right-2 md:top-2 md:bottom-2 md:mt-0 px-8 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                        >
                            Check Answer <ArrowRight className="w-5 h-5" />
                        </button>
                    )}
                </form>
            </div>

            {/* ========== INLINE FEEDBACK SECTION ========== */}
            {submitted && feedback && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className={`p-6 rounded-2xl ${feedback.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex gap-4">
                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${feedback.isCorrect ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                                {feedback.isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <Lightbulb className="w-6 h-6" />}
                            </div>
                            <div className="space-y-1 pt-1 flex-1">
                                <h4 className={`font-bold text-lg ${feedback.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                    {feedback.isCorrect ? (
                                        <span className="flex items-center gap-2">
                                            {feedback.feedback}
                                            {isAutoAdvancing && <Loader2 className="w-4 h-4 animate-spin opacity-50" />}
                                        </span>
                                    ) : 'Correct Answer:'}
                                </h4>

                                {!feedback.isCorrect && (
                                    <p className="text-2xl font-mono font-bold text-red-800 mt-1">
                                        {correctValue} {unit}
                                    </p>
                                )}

                                {!feedback.isCorrect && (
                                    <p className={`mt-2 text-red-700`}>
                                        {feedback.feedback}
                                    </p>
                                )}

                                {isAutoAdvancing && (
                                    <div className="w-full h-1 bg-green-200 mt-3 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 animate-[progress_2s_linear_forward]" style={{ width: '100%' }}></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Explanation (Worked Solution) - Show only if exists */}
                    {question.workedSolution?.steps && question.workedSolution.steps.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
                            <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4">
                                <span className="bg-slate-100 p-2 rounded-lg text-blue-600">💡</span>
                                How to solve this
                            </h4>
                            <div className="space-y-4 relative">
                                <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-slate-100" />
                                {question.workedSolution.steps.map((step: string, idx: number) => (
                                    <div key={idx} className="flex gap-4 relative z-10">
                                        <div className="flex-shrink-0 w-10 h-10 bg-white border-2 border-slate-100 text-slate-500 rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                                            {idx + 1}
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4 flex-1 text-slate-700 leading-relaxed font-medium">
                                            {step}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CONTINUE BUTTON */}
                    <button
                        autoFocus
                        onClick={handleContinue}
                        className={`w-full py-4 rounded-xl font-extrabold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${feedback.isCorrect
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 text-white'
                            }`}
                    >
                        {feedback.isCorrect ? 'Finish & Next Question' : 'Got it, Next Question'} <ArrowRightCircle size={24} />
                    </button>
                    <p className="text-center text-xs text-slate-400 font-medium pb-4">
                        Press Enter or Click to continue
                    </p>
                </div>
            )}
        </div>
    );
}
