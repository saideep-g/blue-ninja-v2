// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { CheckCircle2, XCircle, Lightbulb, Calculator, ArrowRight, ArrowRightCircle, Loader2, PenTool, Hash } from 'lucide-react';
import { Question } from '../../types';
import { useProfileStore } from '../../store/profile';
import { getRandomPraise } from '../../utils/feedbackUtils';
import { useThemedSvg } from '../../hooks/useThemedSvg';

interface NumericAutoTemplateProps {
    question: Question;
    onAnswer: (result: any) => void;
    onInteract?: (log: any) => void;
    isSubmitting: boolean;
    readOnly?: boolean;
    isPreview?: boolean;
}

interface Feedback {
    isCorrect: boolean;
    value: string;
    feedback: string;
}

const LatexRenderer = ({ text }: { text: string | null }) => {
    if (!text) return null;
    const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
    return (
        <>
            {parts.map((part, i) => {
                if ((part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('$') && part.endsWith('$'))) {
                    const math = part.startsWith('$$') ? part.slice(2, -2) : part.slice(1, -1);
                    return <InlineMath key={i} math={math} />;
                }
                if (part.includes('^')) {
                    const subParts = part.split(/([a-zA-Z0-9\(\)\+\-\.\\,\/\=\<\>_]+(?:\^[a-zA-Z0-9\(\)\+\-\.\\,\/\=\<\>_\^]+)+)/g);
                    return (
                        <span key={i}>
                            {subParts.map((sub, j) => {
                                if (sub.includes('^')) {
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

const ExplanationStepRenderer = ({ text }: { text: string }) => {
    // Split by newline, filter empty
    const lines = text.split('\n').filter(l => l.trim());
    return (
        <div className="space-y-3 pt-2">
            {lines.map((line, idx) => {
                // Check for "1. ", "1) ", "(1) " style numbering
                const match = line.match(/^(\d+)[\.)]\s*(.*)/) || line.match(/^\((\d+)\)\s*(.*)/);
                if (match) {
                    return (
                        <div key={idx} className="flex gap-3 items-start group">
                            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold ring-1 ring-indigo-200 dark:ring-indigo-500/40 mt-0.5 group-hover:scale-110 transition-transform">
                                {match[1]}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                <LatexRenderer text={match[2]} />
                            </span>
                        </div>
                    );
                }
                return (
                    <p key={idx} className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        <LatexRenderer text={line} />
                    </p>
                );
            })}
        </div>
    );
};

/**
 * NUMERIC AUTO TEMPLATE
 * Enhanced numeric input with SVG/Image support and "Solve on Paper" focus.
 */
export function NumericAutoTemplate({ question, onAnswer, onInteract, isSubmitting, readOnly, isPreview = false }: NumericAutoTemplateProps) {
    const { autoAdvance } = useProfileStore();

    const [inputValue, setInputValue] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [result, setResult] = useState<any>(null);
    const [interactionLogged, setInteractionLogged] = useState(false);
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const answerKey = question.answerKey || (question as any).answer_key || {};
    const rawCorrectValue = answerKey.correctValue ?? answerKey.value ?? (question as any).correctAnswer ?? (question as any).correct_answer ?? (question as any).answer;

    // FORCE RESET when question ID changes
    useEffect(() => {
        setInputValue(isPreview ? String(rawCorrectValue || '') : '');
        setSubmitted(false);
        setFeedback(null);
        setResult(null);
        setInteractionLogged(false);
        setIsAutoAdvancing(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Debug Visuals (Once per question load)
        const qContent = question.content || {};
        const rawType = (question as any).visualType || qContent.visualType;
        const vData = (question as any).visualData || qContent.visualData;

        console.log('[NumericTemplate] Visual Debug:', {
            id: question.id,
            rawType: rawType,
            hasVisualData: !!vData,
            dataHead: vData ? String(vData).substring(0, 25) : 'None'
        });

    }, [question.id, isPreview, rawCorrectValue]);

    // Extract content
    // Check both standard location and content object
    const qContent = question.content || {};


    const getSafePrompt = (q: any) => {
        // 1. Explicit text field
        if (typeof q.question_text === 'string') return q.question_text;

        // 2. Content Object path
        const cPrompt = q.content?.prompt;
        if (cPrompt) {
            if (typeof cPrompt === 'string') return cPrompt;
            if (typeof cPrompt.text === 'string') return cPrompt.text;
            // V3 simplified backup
            if (typeof cPrompt.question === 'string') return cPrompt.question;
        }

        // 3. Fallback normalized props
        if (typeof q.question === 'string') return q.question;

        // 4. Object detection (Emergency Fix)
        if (typeof q.question === 'object') return JSON.stringify(q.question);
        if (typeof cPrompt === 'object') return JSON.stringify(cPrompt);

        return 'Calculate the answer:';
    };

    const prompt = getSafePrompt(question);
    const instruction = (question as any).instruction || qContent.instruction || 'Solve in your notebook.';

    // Config
    const interactionConfig = qContent.interaction?.config || (question as any).interaction?.config || {};
    const placeholder = interactionConfig.placeholder || 'Enter final value...';
    const unit = interactionConfig.unit || (question as any).unit || '';

    // Visuals
    // Check top level or inside content
    const rawVisualType = (question as any).visualType || qContent.visualType;
    const visualData = (question as any).visualData || qContent.visualData;
    const imageUrl = (question as any).imageUrl || qContent.imageUrl || question.imageUrl;

    let visualType = rawVisualType;
    if (!visualType && visualData && typeof visualData === 'string' && visualData.trim().startsWith('<svg')) {
        visualType = 'svg';
    }

    const themedVisualData = useThemedSvg(visualType === 'svg' ? visualData : undefined);

    const parseValue = (val: string | number | undefined): number | string | null => {
        if (typeof val === 'number') return val;
        if (!val) return null;
        val = val.toString().trim();

        // Handle Ratios (X:Y)
        if (val.includes(':')) {
            return val.replace(/\s+/g, '');
        }

        // Handle Fractions
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

        const num = parseFloat(val);
        return isNaN(num) ? val : num; // Return raw string if parseFloat is incomplete
    };

    const parsedCorrectValue = parseValue(rawCorrectValue);
    const tolerance = answerKey.tolerance ?? (question as any).tolerance ?? 0.001;

    const feedbackMap = (question as any).feedbackMap || {};

    const handleCreateFeedback = (isCorrect: boolean, selectedPraise?: string) => {
        if (isCorrect) {
            return selectedPraise || feedbackMap.onCorrect || getRandomPraise();
        }
        return feedbackMap.onIncorrectAttempt1 || '✗ Check your calculation.';
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || submitted || isSubmitting || readOnly) return;

        const userVal = parseValue(inputValue);
        if (userVal === null) {
            alert("Please enter a valid number, fraction, or ratio.");
            return;
        }

        let isCorrect = false;
        if (typeof userVal === 'number' && typeof parsedCorrectValue === 'number') {
            isCorrect = Math.abs(userVal - parsedCorrectValue) <= tolerance;
        } else {
            // String comparison for ratios or non-numeric strings
            isCorrect = String(userVal).toLowerCase() === String(parsedCorrectValue).toLowerCase();
        }

        const selectedPraise = isCorrect ? getRandomPraise() : undefined;

        const resultData = {
            isCorrect,
            value: inputValue,
            feedback: handleCreateFeedback(isCorrect, selectedPraise),
            studentAnswerText: inputValue + (unit ? ` ${unit}` : ''),
            correctAnswerText: (String(rawCorrectValue)) + (unit ? ` ${unit}` : '')
        };

        setFeedback(resultData);
        setSubmitted(true);
        setResult(resultData);

        // IMMEDIATE LOG (Step 2)
        if (onAnswer) {
            onAnswer(resultData, false); // Log only
        }

        if (isCorrect && autoAdvance !== false) {
            setIsAutoAdvancing(true);
            timeoutRef.current = setTimeout(() => {
                if (onAnswer) onAnswer(resultData, true); // Advance
            }, 2000);
        }
    };

    const handleContinue = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (result && onAnswer) {
            onAnswer(result, true); // Advance = true
        }
    };

    const submittable = !submitted && !isSubmitting && !readOnly;

    return (
        <div className={`w-full ${isPreview ? 'max-w-5xl' : 'max-w-3xl'} mx-auto flex flex-col gap-6 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500`}>

            {/* ========== HERO SECTION ========== */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden relative border-2 border-white dark:border-slate-700">
                {/* ID Badge */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                    <div className="bg-slate-100/80 dark:bg-slate-700/80 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 border border-slate-200 dark:border-slate-600">
                        <Hash className="w-3 h-3" />
                        {question.id}
                    </div>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider">
                        <PenTool className="w-3 h-3" />
                        Solve on Paper
                    </div>

                    {/* Question Text */}
                    <div className="prose prose-lg prose-slate dark:prose-invert max-w-none">
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                            <LatexRenderer text={prompt} />
                        </h2>
                    </div>

                    {/* Visual Data (SVG or Image) */}
                    {(visualType === 'svg' && (themedVisualData || visualData)) && (
                        <div className="my-6 flex justify-center bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 thematic-svg">
                            <div
                                className="w-full max-w-md"
                                dangerouslySetInnerHTML={{ __html: themedVisualData || visualData }}
                            />
                        </div>
                    )}

                    {imageUrl && !visualData && (
                        <div className="my-6 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                            <img src={imageUrl} alt="Question Diagram" className="w-full h-auto object-contain max-h-[300px]" />
                        </div>
                    )}

                    {instruction && (
                        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium italic border-l-4 border-indigo-200 dark:border-indigo-500/30 pl-4 py-1">
                            <LatexRenderer text={instruction} />
                        </p>
                    )}
                </div>
            </div>

            {/* ========== INPUT SECTION ========== */}
            <div className="bg-white dark:bg-slate-800 p-2 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700">
                <form onSubmit={handleSubmit} className="relative flex flex-col md:flex-row gap-2">
                    <div className={`
                        flex-1 relative flex items-center bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 transition-all duration-300 overflow-hidden
                        ${submitted
                            ? feedback?.isCorrect
                                ? 'border-green-400 bg-green-50/30 dark:bg-green-900/10'
                                : 'border-red-300 bg-red-50/30 dark:bg-red-900/10'
                            : 'border-transparent focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-900'
                        }
                    `}>
                        <input
                            type="text"
                            inputMode="text" // 'text' ensures full keyboard access for fractions (/)
                            disabled={!submittable}
                            placeholder={placeholder}
                            value={inputValue}
                            onChange={(e) => {
                                // Allow digits, decimal relative chars, space, and colon
                                const val = e.target.value;
                                if (val === '' || /^[0-9./\s:-]*$/.test(val)) {
                                    setInputValue(val);

                                    // LOG INTERACTION (Step 4)
                                    if (val !== '' && !interactionLogged && onInteract) {
                                        onInteract({ type: 'keypress', payload: { firstKey: true } });
                                        setInteractionLogged(true);
                                    }
                                }
                            }}
                            className="w-full p-4 md:p-6 text-2xl md:text-3xl font-bold text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 bg-transparent outline-none text-center md:text-left font-mono"
                        />
                        {unit && (
                            <div className="pr-6">
                                <span className="text-lg font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                    {unit}
                                </span>
                            </div>
                        )}

                        {/* Status Icon */}
                        {(submitted || isPreview) && (
                            <div className="absolute right-4 animate-in zoom-in spin-in-12 duration-300">
                                {isPreview || feedback?.isCorrect ? (
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                ) : (
                                    <XCircle className="w-8 h-8 text-red-500" />
                                )}
                            </div>
                        )}
                    </div>

                    {!submitted && !isPreview ? (
                        <button
                            type="submit"
                            disabled={!inputValue || isSubmitting}
                            className="p-4 md:px-8 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shrink-0"
                        >
                            Check <ArrowRight className="w-5 h-5" />
                        </button>
                    ) : (submitted || isPreview) && (
                        <button
                            type="button"
                            onClick={handleContinue}
                            autoFocus
                            className={`p-4 md:px-8 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95 ${feedback?.isCorrect || isPreview
                                ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20'
                                : 'bg-slate-800 text-white hover:bg-slate-900'
                                }`}
                        >
                            {isPreview ? 'Next' : 'Next'} <ArrowRightCircle className="w-5 h-5" />
                        </button>
                    )}
                </form>
            </div>

            {/* ========== EXPLANATION (On Wrong/Submit/Preview) ========== */}
            {((submitted && !feedback?.isCorrect) || (isPreview && question.explanation)) && (
                <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 shadow-sm animate-in slide-in-from-top-2 ${isPreview ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-red-100 dark:border-red-900/30'}`}>
                    <div className="flex gap-4">
                        <div className={`${isPreview ? 'bg-emerald-100' : 'bg-red-100'} p-2 rounded-full h-fit`}>
                            <Lightbulb className={`w-6 h-6 ${isPreview ? 'text-emerald-600' : 'text-red-600'}`} />
                        </div>
                        <div className="space-y-4 w-full">
                            <div>
                                <h4 className={`font-bold ${isPreview ? 'text-emerald-800' : 'text-red-800'} dark:text-red-400 text-lg mb-1 uppercase tracking-wider`}>
                                    {isPreview ? 'Solution Breakdown' : "Step-by-Step Fix"}
                                </h4>
                                <div className="mt-2 p-4 bg-indigo-50 dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-700 inline-block shadow-sm">
                                    <span className="text-xs text-indigo-400 dark:text-slate-500 font-black uppercase tracking-widest block mb-1">Correct Answer</span>
                                    <span className="text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400">{String(rawCorrectValue)} {unit}</span>
                                </div>
                            </div>

                            {question.explanation && (
                                <div className="mt-2 pt-4 border-t border-red-100/50 dark:border-white/10">
                                    <ExplanationStepRenderer text={question.explanation} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
