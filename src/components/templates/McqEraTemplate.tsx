// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import { CheckCircle2, XCircle, Sparkles, AlertCircle, Loader2, ArrowRightCircle, Zap, Crown, Flag } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/db/firebase';
import { Question } from '../../types';
import { useProfileStore } from '../../store/profile';
import { getRandomPraise } from '../../utils/feedbackUtils';

interface MCQTemplateProps {
    question: Question;
    onAnswer: (result: any) => void;
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

export function McqEraTemplate({ question, onAnswer, isSubmitting, readOnly, isPreview = false }: MCQTemplateProps) {
    const { autoAdvance } = useProfileStore();
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    const [result, setResult] = useState<any>(null);
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [showFlagModal, setShowFlagModal] = useState(false);
    const [reporting, setReporting] = useState(false);

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

    const handleSelect = (index: number) => {
        if (!submitted && !isSubmitting && !isPreview) {
            setSelectedIndex(index);
        }
    };

    const handleContinue = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (result && onAnswer) {
            onAnswer(result);
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
        if (isCorrect && autoAdvance !== false) {
            setIsAutoAdvancing(true);
            timeoutRef.current = setTimeout(() => { onAnswer(resultData); }, 2000);
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

            {/* OPTIONS GRID */}
            <div className="space-y-4">
                {options.map((option, index) => {
                    const isSelected = selectedIndex === index;
                    const isCorrectOption = index === correctIndex;
                    const isWrongSelected = submitted && isSelected && !isCorrectOption;
                    const shouldHighlightCorrect = (submitted || isPreview) && isCorrectOption;

                    let containerStyle = { backgroundColor: bgOption, borderColor: borderColor, transition: 'all 0.2s ease', transform: 'scale(1)' };
                    let textStyle = { color: textColor, fontWeight: 'normal' };
                    let icon = null;

                    if (!submitted && !isPreview) {
                        if (isSelected) {
                            // Selected: High Contrast Light Mode override (Pink)
                            containerStyle = { ...containerStyle, backgroundColor: '#fce7f3', borderColor: '#f472b6', transform: 'scale(1.02)' };
                            textStyle = { color: '#831843', fontWeight: 'bold' };
                        }
                    } else {
                        if (shouldHighlightCorrect) {
                            // Correct: Vibrant Green
                            containerStyle = { ...containerStyle, backgroundColor: '#00DDA5', borderColor: '#00BFA5', transform: 'scale(1.02)' };
                            textStyle = { color: 'white', fontWeight: '900' };
                            icon = <CheckCircle2 className="text-white w-8 h-8" />;
                        } else if (isWrongSelected) {
                            // Wrong: Red
                            containerStyle = { ...containerStyle, backgroundColor: '#fff1f2', borderColor: '#fda4af' };
                            textStyle = { color: '#e11d48', textDecoration: 'line-through', opacity: 0.7 };
                            icon = <XCircle className="text-rose-400" />;
                        } else {
                            // Dim others
                            containerStyle = { ...containerStyle, opacity: 0.5, filter: 'grayscale(0.8)' };
                        }
                    }

                    const labels = ['A', 'B', 'C', 'D', 'E'];

                    return (
                        <button
                            key={index}
                            onClick={() => handleSelect(index)}
                            disabled={submitted || isSubmitting}
                            className="w-full p-5 rounded-[2rem] border-2 text-left relative overflow-hidden group/opt active:scale-95 shadow-sm"
                            style={containerStyle}
                        >
                            <div className="flex items-center gap-4 relative z-10 w-full">
                                {/* Label A/B/C */}
                                <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shadow-sm border-2 shrink-0"
                                    style={{ backgroundColor: 'var(--color-surface)', borderColor: borderColor, color: textColor }}>
                                    {labels[index] || '?'}
                                </div>
                                <span className="text-lg md:text-xl flex-1 leading-snug" style={textStyle}>
                                    <LatexRenderer text={option.text} />
                                </span>
                                <div className="shrink-0">
                                    {(submitted || isPreview) && shouldHighlightCorrect ? (
                                        <CheckCircle2 className="text-white w-8 h-8" />
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
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    {!isPreview && feedback && (
                        <div className={`p-6 rounded-[2rem] mb-4 text-center border-2 shadow-xl`}
                            style={{ backgroundColor: bgCard, borderColor: feedback?.isCorrect ? '#34d399' : '#f43f5e' }}>
                            <h3 className="font-serif italic text-lg mb-2 opacity-80" style={{ color: feedback?.isCorrect ? '#059669' : '#f43f5e' }}>
                                {feedback?.feedback}
                            </h3>
                            {!feedback?.isCorrect && question.explanation && (
                                <div className="mt-2 animate-in zoom-in-50 duration-300">
                                    <div className="p-4 rounded-2xl text-left border-l-4"
                                        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: borderColor }}>
                                        <div className="flex gap-2 items-start leading-relaxed font-medium" style={{ color: textColor }}>
                                            <Sparkles size={20} className="text-yellow-500 shrink-0 mt-1" />
                                            <div><LatexRenderer text={question.explanation} /></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <button
                        onClick={handleContinue}
                        className="w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2 border-2"
                        // Theme compliant button
                        style={{ backgroundColor: bgCard, color: textColor, borderColor: isPreview ? '#34d399' : borderColor }}
                    >
                        {isPreview ? 'Next Question' : 'Next Era'} <ArrowRightCircle size={18} />
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
