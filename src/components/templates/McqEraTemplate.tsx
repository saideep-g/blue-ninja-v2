// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { CheckCircle2, XCircle, Sparkles, AlertCircle, Loader2, ArrowRightCircle, Zap, Crown } from 'lucide-react';
import { Question } from '../../types';
import { useProfileStore } from '../../store/profile';
import { getRandomPraise } from '../../utils/feedbackUtils';

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

const LatexRenderer = ({ text }: { text: string | null }) => {
    if (!text) return null;
    const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
    return (
        <>
            {parts.map((part, i) => {
                if ((part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('$') && part.endsWith('$'))) {
                    const math = part.startsWith('$$') ? part.slice(2, -2) : part.slice(1, -1);
                    return <span key={i} className="font-sans not-italic inline-block mx-1"><InlineMath math={math} /></span>;
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

export function McqEraTemplate({ question, onAnswer, isSubmitting }: MCQTemplateProps) {
    const { autoAdvance } = useProfileStore();
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    const [result, setResult] = useState<any>(null);
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setSelectedIndex(null);
        setSubmitted(false);
        setFeedback(null);
        setResult(null);
        setIsAutoAdvancing(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, [question.id]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Safe Access
    const stage0 = (question as any).stages?.[0];
    const interactionConfig = stage0?.interaction?.config || (question.content as any)?.interaction?.config || {};
    const options = (interactionConfig.options || []) as { text: string; id?: string }[];

    // Resolve Correct Index
    let correctIndex = -1;
    const correctOptionId = stage0?.answer_key?.correct_option_id || (question as any).correctOptionId;
    if (correctOptionId) {
        correctIndex = options.findIndex(o => String(o.id) === String(correctOptionId));
    }
    if (correctIndex === -1 && question.answerKey?.correctOptionIndex !== undefined) {
        correctIndex = question.answerKey.correctOptionIndex as number;
    }

    // Fallback for simple simplified_mcq structure from upload
    if (correctIndex === -1 && options.length > 0 && question.correct_answer) {
        // Try to match text
        correctIndex = options.findIndex(o => o.text === question.correct_answer);
    }

    const prompt = question.question_text || (question.content?.prompt?.text) || "Identify the correct option:";
    const instruction = (question as any).instruction || (question.content as any)?.instruction;

    const handleSelect = (index: number) => {
        if (!submitted && !isSubmitting) {
            setSelectedIndex(index);
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
        const feedbackText = isCorrect
            ? "Slayed it! 💅"
            : "Not quite the vibe... try again!";

        const resultData = {
            isCorrect,
            selectedIndex,
            feedback: feedbackText,
        };

        setFeedback(resultData);
        setSubmitted(true);
        setResult(resultData);

        if (isCorrect && autoAdvance !== false) {
            setIsAutoAdvancing(true);
            timeoutRef.current = setTimeout(() => {
                onAnswer(resultData);
            }, 2000);
        }
    };

    return (
        <div className="w-full space-y-8 flex flex-col font-sans text-gray-800">

            {/* QUESTION CARD */}
            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Crown size={80} className="rotate-12" />
                </div>

                <h2 className="text-2xl md:text-3xl font-serif italic text-gray-800 leading-tight relative z-10">
                    <LatexRenderer text={prompt} />
                </h2>

                {instruction && (
                    <p className="mt-4 text-sm font-bold text-gray-400 uppercase tracking-widest relative z-10">
                        <LatexRenderer text={instruction} />
                    </p>
                )}
            </div>

            {/* OPTIONS GRID */}
            <div className="space-y-4">
                {options.map((option, index) => {
                    const isSelected = selectedIndex === index;
                    const isCorrectOption = index === correctIndex;

                    const isWrongSelected = submitted && isSelected && !isCorrectOption;
                    const shouldHighlightCorrect = submitted && isCorrectOption;

                    let containerClass = "bg-white/40 border-white hover:bg-white hover:border-pink-200";
                    let textClass = "text-gray-600";
                    let icon = null;

                    if (!submitted) {
                        if (isSelected) {
                            containerClass = "bg-pink-50 border-pink-300 shadow-lg scale-[1.02]";
                            textClass = "text-pink-600 font-bold";
                        }
                    } else {
                        if (shouldHighlightCorrect) {
                            containerClass = "bg-emerald-50 border-emerald-400 shadow-lg";
                            textClass = "text-emerald-700 font-black";
                            icon = <CheckCircle2 className="text-emerald-500" />;
                        } else if (isWrongSelected) {
                            containerClass = "bg-rose-50 border-rose-300";
                            textClass = "text-rose-500 line-through opacity-70";
                            icon = <XCircle className="text-rose-400" />;
                        } else {
                            containerClass = "opacity-50 grayscale";
                        }
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => handleSelect(index)}
                            disabled={submitted || isSubmitting}
                            className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all duration-300 relative overflow-hidden group/opt ${containerClass}`}
                        >
                            <div className="flex items-center justify-between relative z-10">
                                <span className={`text-lg md:text-xl font-medium transition-colors ${textClass}`}>
                                    <LatexRenderer text={option.text} />
                                </span>
                                <div>
                                    {icon ? icon : (
                                        <div className={`w-6 h-6 rounded-full border-2 transition-colors ${isSelected ? 'border-pink-400 bg-pink-400' : 'border-gray-200 group-hover/opt:border-pink-200'}`} />
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ACTION AREA */}
            {!submitted ? (
                <button
                    onClick={handleSubmit}
                    disabled={selectedIndex === null || isSubmitting}
                    className="w-full py-6 bg-[#1A1A1A] text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-pink-500 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <>Final Answer <Zap size={18} fill="currentColor" /></>}
                </button>
            ) : (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className={`p-6 rounded-[2rem] mb-4 text-center border-2 ${feedback?.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                        <h3 className={`font-serif italic text-2xl mb-1 ${feedback?.isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {feedback?.isCorrect ? "Immaculate Vibes! ✨" : "Oop... Glitch in the Matrix 👾"}
                        </h3>
                        {!feedback?.isCorrect && (
                            <p className="text-xs font-black uppercase tracking-widest text-rose-400">Correct: {options[correctIndex]?.text}</p>
                        )}
                    </div>

                    <button
                        onClick={handleContinue}
                        autoFocus
                        className="w-full py-6 bg-white text-gray-800 border-2 border-gray-100 hover:border-pink-200 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                        Next Era <ArrowRightCircle size={18} />
                    </button>
                </div>
            )}

        </div>
    );
}
