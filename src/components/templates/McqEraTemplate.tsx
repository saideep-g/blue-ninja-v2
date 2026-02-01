// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { CheckCircle2, XCircle, Sparkles, AlertCircle, Loader2, ArrowRightCircle, Zap, Crown, Flag, Lightbulb } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/db/firebase';
import { Question } from '../../types';
import { useProfileStore } from '../../store/profile';
import { getRandomPraise } from '../../utils/feedbackUtils';
import { useThemedSvg } from '../../hooks/useThemedSvg';

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
    const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$|\*\*[^*]+\*\*)/g);
    return (
        <>
            {parts.map((part, i) => {
                if ((part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('$') && part.endsWith('$'))) {
                    const math = part.startsWith('$$') ? part.slice(2, -2) : part.slice(1, -1);
                    return <span key={i} className="font-sans not-italic inline-block mx-1"><InlineMath math={math} /></span>;
                }
                if (part.startsWith('**') && part.endsWith('**')) {
                    const content = part.slice(2, -2);
                    return <strong key={i} className="font-black text-[var(--color-primary)]">{content}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const ExplanationStepRenderer = ({ text, textColor }: { text: string, textColor: string }) => {
    const lines = text.split('\n').filter(l => l.trim());
    return (
        <div className="space-y-4 pt-2">
            {lines.map((line, idx) => {
                const isStep = line.match(/^(\d+[\.\)\:]|\(?\d+\)?|Step\s+\d+)/i);
                const content = isStep ? line.replace(/^.*?[\.\)\:]\s*/, '') : line;

                return (
                    <div key={idx} className="flex gap-4 group/step items-start">
                        {isStep ? (
                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center text-sm font-black shrink-0 group-hover/step:bg-indigo-500 group-hover/step:text-white transition-all shadow-sm">
                                {idx + 1}
                            </div>
                        ) : (
                            <div className="w-2 h-2 rounded-full bg-indigo-500/30 mt-2.5 shrink-0 ml-3" />
                        )}
                        <p className="text-base md:text-lg leading-relaxed font-medium pt-0.5" style={{ color: textColor }}>
                            <LatexRenderer text={content} />
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

export function McqEraTemplate({ question, onAnswer, onInteract, isSubmitting, readOnly, isPreview = false }: MCQTemplateProps) {
    const { autoAdvance } = useProfileStore();
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    const [result, setResult] = useState<any>(null);
    const [firstThoughtLogged, setFirstThoughtLogged] = useState(false);
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [showFlagModal, setShowFlagModal] = useState(false);
    const [reporting, setReporting] = useState(false);

    useEffect(() => {
        setSelectedIndex(null);
        setSubmitted(false);
        setFeedback(null);
        setResult(null);
        setFirstThoughtLogged(false);
        setIsAutoAdvancing(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, [question.id]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const stage0 = (question as any).stages?.[0];
    const interactionConfig = stage0?.interaction?.config || (question as any).interaction?.config || (question.content as any)?.interaction?.config || {};

    const options =
        (interactionConfig.options as { text: string; id?: string }[]) ||
        ((question as any).options as { text: string; id?: string }[]) ||
        [];

    let correctIndex = -1;
    const correctOptionId = stage0?.answer_key?.correct_option_id || (question as any).correctOptionId;
    if (correctOptionId) {
        correctIndex = options.findIndex(o => String(o.id) === String(correctOptionId));
    }
    if (correctIndex === -1 && question.answerKey?.correctOptionIndex !== undefined) {
        correctIndex = question.answerKey.correctOptionIndex as number;
    }
    if (correctIndex === -1 && options.length > 0 && question.correct_answer) {
        correctIndex = options.findIndex(o => o.text === question.correct_answer);
    }
    if (correctIndex === -1) {
        correctIndex = options.findIndex((o: any) => o.isCorrect === true);
    }

    const prompt = (question as any).question || (question as any).question_text || (question.content?.prompt?.text) || "Identify the correct option:";
    const instruction = (question as any).instruction || (question.content as any)?.instruction;

    // Visuals Logic
    const visualData = (question as any).visualData || (question.content as any)?.visualData;
    const imageUrl = (question as any).imageUrl || (question.content as any)?.imageUrl || (question as any).image;

    // Auto-detect SVG in visualData string
    let visualType = (question as any).visualType || 'image';
    if (visualData && typeof visualData === 'string' && visualData.trim().startsWith('<svg')) {
        visualType = 'svg';
    }

    const themedVisualData = useThemedSvg(visualType === 'svg' ? visualData : undefined);

    const handleSelect = (index: number) => {
        if (!submitted && !isSubmitting && !isPreview) {
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
            onAnswer(result, true); // Should Advance = true
        }
    };

    const playFeedbackSound = (type: 'correct' | 'wrong') => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            if (type === 'correct') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
            } else {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
            }
        } catch (e) {
            console.error("Audio playback failed", e);
        }
    };

    const handleReportIssue = async (reason: string) => {
        setReporting(true);
        try {
            await addDoc(collection(db, 'question_reports'), {
                questionId: question.id || 'unknown',
                questionText: prompt,
                reason: reason,
                reportedAt: serverTimestamp(),
                userAction: 'flagged_in_era'
            });
            alert("Sent! Thanks for keeping it real. 🙌");
            setShowFlagModal(false);
        } catch (e) {
            console.error("Report failed", e);
            alert("Could not send report. Bummer.");
        } finally {
            setReporting(false);
        }
    };

    const handleSubmit = async () => {
        if (selectedIndex === null || isSubmitting || submitted) return;
        const isCorrect = selectedIndex === correctIndex;
        playFeedbackSound(isCorrect ? 'correct' : 'wrong');
        const feedbackText = isCorrect ? getRandomPraise() : "Not quite the vibe... check the fix!";

        // Get actual answer texts
        const selectedOption = options[selectedIndex];
        const correctOption = options[correctIndex];

        const resultData = {
            isCorrect,
            selectedIndex,
            feedback: feedbackText,
            studentAnswerText: selectedOption?.text || `Option ${selectedIndex}`,
            correctAnswerText: correctOption?.text || 'N/A'
        };

        setFeedback(resultData);
        setSubmitted(true);
        setResult(resultData);

        // IMMEDIATE LOG (Step 2)
        if (onAnswer) {
            onAnswer(resultData, false); // Log only, do NOT advance
        }

        // Auto Advance Logic
        if (isCorrect && autoAdvance !== false) {
            setIsAutoAdvancing(true);
            timeoutRef.current = setTimeout(() => {
                onAnswer(resultData, true); // Advance now
            }, 2000);
        }
    };

    // --- THEME VARIABLES ---
    const bgCard = 'var(--color-card)';
    // Use secondary bg for options to differentiate from card/surface
    const bgOption = 'var(--color-bg-secondary)';
    const borderColor = 'var(--color-border)';
    const textColor = 'var(--color-text)';

    return (
        <div className="w-full space-y-8 flex flex-col font-sans" style={{ color: textColor }}>

            {/* QUESTION CARD */}
            <div className="backdrop-blur-xl p-8 rounded-[2.5rem] border-2 shadow-sm relative overflow-hidden group"
                style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                <div className="absolute top-[-1rem] right-[-2rem] p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none" style={{ color: borderColor }}>
                    <Crown size={120} className="rotate-12" />
                </div>
                <h2 className="text-2xl md:text-3xl font-serif italic leading-tight relative z-10 pr-12" style={{ color: textColor }}>
                    <LatexRenderer text={prompt} />
                </h2>

                {/* VISUAL BLOCK */}
                {(visualType === 'svg' && (themedVisualData || visualData)) && (
                    <div className="my-6 flex justify-center bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 thematic-svg relative z-10">
                        <div
                            className="w-full max-w-md"
                            dangerouslySetInnerHTML={{ __html: themedVisualData || visualData }}
                        />
                    </div>
                )}
                {imageUrl && !visualData && (
                    <div className="my-6 rounded-xl overflow-hidden shadow-sm border border-slate-100 relative z-10">
                        <img src={imageUrl} alt="Question Diagram" className="w-full h-auto object-contain max-h-[300px]" />
                    </div>
                )}
                {instruction && (
                    <p className="mt-4 text-sm font-bold opacity-60 uppercase tracking-widest relative z-10" style={{ color: textColor }}>
                        <LatexRenderer text={instruction} />
                    </p>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowFlagModal(true); }}
                    className="absolute bottom-4 right-4 z-20 p-2 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-red-50 text-slate-300 hover:text-red-400"
                    title="Report Issue"
                >
                    <Flag size={16} />
                </button>
            </div>

            <div className="space-y-4">
                {options.map((option, index) => {
                    const isSelected = selectedIndex === index;
                    const isCorrectOption = index === correctIndex;
                    const isWrongSelected = submitted && isSelected && !isCorrectOption;
                    const shouldHighlightCorrect = (submitted || isPreview) && isCorrectOption;

                    let btnClasses = "w-full p-5 rounded-[2rem] border-2 text-left relative overflow-hidden group/opt active:scale-95 shadow-sm transition-all ";
                    let styleProperties: React.CSSProperties = { transition: 'all 0.2s ease', transform: 'scale(1)' };
                    let labelStyle: React.CSSProperties = { backgroundColor: 'var(--color-surface)', borderColor: borderColor, color: textColor };
                    let optionTextStyle: React.CSSProperties = { color: textColor, fontWeight: 'normal' };
                    let icon = null;

                    if (!submitted && !isPreview) {
                        // Default Interactive State
                        if (isSelected) {
                            // Selected State (Light/Dark Pink contrast handling)
                            styleProperties = { ...styleProperties, backgroundColor: '#fce7f3', borderColor: '#f472b6', transform: 'scale(1.02)' };
                            optionTextStyle = { ...optionTextStyle, color: '#831843', fontWeight: 'bold' };
                        } else {
                            // Normal State
                            styleProperties = { ...styleProperties, backgroundColor: bgOption, borderColor: borderColor };
                        }
                    } else {
                        // Result State
                        if (shouldHighlightCorrect) {
                            // Success State (Theme Aware - Forced High Contrast)
                            btnClasses += "!bg-emerald-500 !border-emerald-600 !text-white transform scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.4)] ";

                            // Clear inline
                            styleProperties = { ...styleProperties, transform: 'scale(1.02)', backgroundColor: '', borderColor: '' };

                            optionTextStyle = { ...optionTextStyle, color: 'white', fontWeight: '900' };
                            labelStyle = { backgroundColor: 'white', borderColor: 'white', color: '#059669' }; // Green text on white circle
                            icon = <CheckCircle2 className="text-white w-8 h-8" />;
                        } else if (isWrongSelected) {
                            // Error State
                            btnClasses += "bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-900/40 dark:border-rose-400 dark:text-rose-300 ";

                            styleProperties = { ...styleProperties, backgroundColor: '', borderColor: '' };

                            optionTextStyle = { ...optionTextStyle, color: 'currentColor', textDecoration: 'line-through', opacity: 0.9, fontWeight: 'bold' };
                            labelStyle = { backgroundColor: 'transparent', borderColor: 'currentColor', color: 'currentColor' };
                            icon = <XCircle className="text-rose-500 dark:text-rose-400 w-8 h-8" />;
                        } else {
                            // Dimmed State
                            styleProperties = { ...styleProperties, backgroundColor: bgOption, borderColor: borderColor, opacity: 0.3, filter: 'grayscale(1)' };
                        }
                    }

                    const labels = ['A', 'B', 'C', 'D', 'E'];

                    return (
                        <button
                            key={index}
                            onClick={() => handleSelect(index)}
                            disabled={submitted || isSubmitting}
                            className={btnClasses}
                            style={styleProperties}
                        >
                            <div className="flex items-center gap-4 relative z-10 w-full">
                                {/* Label A/B/C */}
                                <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shadow-sm border-2 shrink-0 transition-colors"
                                    style={labelStyle}>
                                    {labels[index] || '?'}
                                </div>
                                <span className="text-lg md:text-xl flex-1 leading-snug" style={optionTextStyle}>
                                    <LatexRenderer text={option.text} />
                                </span>
                                <div className="shrink-0">
                                    {(submitted || isPreview) && shouldHighlightCorrect ? (
                                        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 w-8 h-8" />
                                    ) : (icon ? icon : (
                                        <div className={`w-6 h-6 rounded-full border-2 transition-colors ${isSelected && !isPreview ? 'border-pink-400 bg-pink-400' : 'border-gray-200'}`} style={{ borderColor: isSelected && !isPreview ? '' : borderColor }} />
                                    ))}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ACTION AREA */}
            {!submitted && !isPreview ? (
                <button
                    onClick={handleSubmit}
                    disabled={selectedIndex === null || isSubmitting}
                    className="w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    // Invert Theme: Button is TextColor, Text is BgColor
                    style={{ backgroundColor: textColor, color: 'var(--color-surface)' }}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <>Final Answer <Zap size={18} fill="currentColor" /></>}
                </button>
            ) : (submitted || isPreview) && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-4">
                    {/* FEEDBACK & EXPLANATION CARD */}
                    {(feedback || (isPreview && question.explanation)) && (
                        <div className="p-8 rounded-[2.5rem] border-2 shadow-xl relative overflow-hidden group/expl"
                            style={{
                                backgroundColor: bgCard,
                                borderColor: (isPreview || feedback?.isCorrect) ? '#34d399' : '#f43f5e',
                                transition: 'all 0.5s ease'
                            }}>

                            {/* Feedback Header */}
                            {feedback && (
                                <div className="mb-6">
                                    <h3 className="font-serif italic text-2xl mb-1" style={{ color: feedback.isCorrect ? '#059669' : '#e11d48' }}>
                                        {feedback.feedback}
                                    </h3>
                                    <div className={`h-1 w-24 rounded-full ${feedback.isCorrect ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                </div>
                            )}


                            {/* Explanation Body - Show for BOTH Correct & Incorrect if explanation exists */}
                            {(submitted || isPreview) && question.explanation && (
                                <div className="animate-in fade-in zoom-in-95 duration-500">
                                    {/* MCQ Conditional Layout */}
                                    {['MCQ_SIMPLIFIED', 'MCQ_ERA', 'MCQ'].includes((question as any).type || (question as any).template_id || 'MCQ_SIMPLIFIED') ? (
                                        <div className="space-y-6">
                                            {/* Reasoning Block */}
                                            {question.explanation && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2 opacity-60">
                                                        <Lightbulb size={16} />
                                                        <h4 className="text-xs font-black uppercase tracking-[0.2em]">Reasoning</h4>
                                                    </div>
                                                    <p className="text-base md:text-lg leading-relaxed font-medium opacity-90" style={{ color: textColor }}>
                                                        <LatexRenderer text={question.explanation} />
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Default Step-by-Step for Complex/Numeric Types */
                                        <div>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-3 bg-yellow-400/10 rounded-2xl">
                                                    <Sparkles size={24} className="text-yellow-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] opacity-40">Step-by-Step Fix</h4>
                                                    <p className="text-xs font-bold opacity-30 italic">Learn the vibe of this solution</p>
                                                </div>
                                            </div>

                                            {question.explanation && (
                                                <div className="p-1 rounded-2xl">
                                                    <ExplanationStepRenderer text={question.explanation} textColor={textColor} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Background Decorative Element */}
                            <div className="absolute top-[-2rem] right-[-2rem] opacity-[0.03] rotate-12 pointer-events-none transition-transform group-hover/expl:scale-110 duration-700">
                                <Lightbulb size={240} />
                            </div>
                        </div>
                    )}

                    {/* ACTIONS */}
                    <button
                        onClick={handleContinue}
                        className="w-full py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2 border-2 active:scale-95 group/next"
                        style={{
                            backgroundColor: bgCard,
                            color: textColor,
                            borderColor: isPreview ? '#34d399' : borderColor
                        }}
                    >
                        {isPreview ? 'Next Question' : 'Next Era'}
                        <ArrowRightCircle size={18} className="group-hover/next:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

            {/* REPORT MODAL */}
            {showFlagModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-rose-500" />
                        <div className="text-center mb-6 pt-4">
                            <h3 className="text-xl font-black text-slate-800">Vibe Check 🤨</h3>
                            <p className="text-sm text-slate-500 font-medium">What's wrong with this question?</p>
                        </div>
                        <div className="space-y-3">
                            <button onClick={() => handleReportIssue('Question is confusing')} disabled={reporting} className="w-full p-4 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl font-bold text-sm transition-all text-left flex items-center gap-3 group border border-transparent hover:border-rose-200">
                                <span className="text-xl group-hover:scale-110 transition-transform">😵‍💫</span><span>Question is confusing</span>
                            </button>
                            <button onClick={() => handleReportIssue('Answer is incorrect')} disabled={reporting} className="w-full p-4 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl font-bold text-sm transition-all text-left flex items-center gap-3 group border border-transparent hover:border-rose-200">
                                <span className="text-xl group-hover:scale-110 transition-transform">❌</span><span>Answer seems wrong</span>
                            </button>
                            <button onClick={() => handleReportIssue('Typo / Glitch')} disabled={reporting} className="w-full p-4 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl font-bold text-sm transition-all text-left flex items-center gap-3 group border border-transparent hover:border-rose-200">
                                <span className="text-xl group-hover:scale-110 transition-transform">🐛</span><span>Typo or Glitch</span>
                            </button>
                        </div>
                        <button onClick={() => setShowFlagModal(false)} className="mt-6 w-full py-3 text-slate-400 font-bold text-sm hover:bg-slate-50 rounded-xl">Nevermind, it's fine.</button>
                    </div>
                </div>
            )}
        </div>
    );
}
