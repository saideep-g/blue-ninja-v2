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
}

interface Feedback {
    isCorrect: boolean;
    selectedIndex?: number;
    feedback: string;
}

const LatexRenderer = ({ text }: { text: string | null }) => {
    if (!text) return null;
    // Split by LaTeX ($$ or $) AND Markdown Bold (**)
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
                    return <strong key={i} className="font-black text-indigo-900">{content}</strong>;
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

    // Flagging State
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

    // Safe Access
    const stage0 = (question as any).stages?.[0];
    const interactionConfig = stage0?.interaction?.config || (question as any).interaction?.config || (question.content as any)?.interaction?.config || {};

    // Updated Logic: Check robust paths including direct .options property used by MobileQuestDashboard bundles
    const options =
        (interactionConfig.options as { text: string; id?: string }[]) ||
        ((question as any).options as { text: string; id?: string }[]) ||
        [];

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

    // Explicit 'isCorrect' flag check (Used by StudyEraDashboard bundles)
    if (correctIndex === -1) {
        correctIndex = options.findIndex((o: any) => o.isCorrect === true);
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

    // Sound Feedback Helper using Web Audio API
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
            // Show localized success/toast if we had one, for now just close
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

        const feedbackText = isCorrect
            ? getRandomPraise()
            : "Not quite the vibe... check the fix!";

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
                {/* Crown pushed further right to avoid text overlap */}
                <div className="absolute top-[-1rem] right-[-2rem] p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <Crown size={120} className="rotate-12" />
                </div>

                <h2 className="text-2xl md:text-3xl font-serif italic text-gray-800 leading-tight relative z-10 pr-12">
                    <LatexRenderer text={prompt} />
                </h2>

                {instruction && (
                    <p className="mt-4 text-sm font-bold text-gray-400 uppercase tracking-widest relative z-10">
                        <LatexRenderer text={instruction} />
                    </p>
                )}

                {/* FLAG BUTTON */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowFlagModal(true);
                    }}
                    className="absolute bottom-4 right-4 z-20 p-2 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
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
                            // GEN Z GREEN: Vibrant and bold
                            containerClass = "bg-[#00DDA5] border-[#00BFA5] shadow-xl scale-[1.02]";
                            textClass = "text-white font-black tracking-wide";
                            icon = <CheckCircle2 className="text-white w-8 h-8" />;
                        } else if (isWrongSelected) {
                            containerClass = "bg-rose-50 border-rose-300";
                            textClass = "text-rose-500 line-through opacity-70";
                            icon = <XCircle className="text-rose-400" />;
                        } else {
                            containerClass = "opacity-40 grayscale";
                        }
                    }

                    const labels = ['A', 'B', 'C', 'D', 'E'];
                    const pastelColors = [
                        'bg-blue-50 text-blue-500 border-blue-100',
                        'bg-purple-50 text-purple-500 border-purple-100',
                        'bg-pink-50 text-pink-500 border-pink-100',
                        'bg-orange-50 text-orange-500 border-orange-100',
                    ];
                    const labelColor = pastelColors[index % pastelColors.length];

                    return (
                        <button
                            key={index}
                            onClick={() => handleSelect(index)}
                            disabled={submitted || isSubmitting}
                            // Added active:scale-95 for tactile feel
                            className={`w-full p-5 rounded-[2rem] border-2 text-left transition-all duration-200 relative overflow-hidden group/opt active:scale-95 ${containerClass}`}
                        >
                            {/* Flex gap-4 with flex-1 on text ensures spacing and alignment */}
                            <div className="flex items-center gap-4 relative z-10 w-full">

                                {/* Aesthetic Label Circle */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shadow-sm border-2 shrink-0 ${labelColor}`}>
                                    {labels[index] || '?'}
                                </div>

                                <span className={`text-lg md:text-xl transition-colors flex-1 leading-snug ${textClass}`}>
                                    <LatexRenderer text={option.text} />
                                </span>

                                <div className="shrink-0">
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
                    <div className={`p-6 rounded-[2rem] mb-4 text-center border-2 ${feedback?.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-rose-100 shadow-xl'}`}>
                        {/* De-emphasized Feedback Text */}
                        <h3 className={`font-serif italic text-lg mb-2 opacity-60 ${feedback?.isCorrect ? 'text-emerald-600' : 'text-rose-400'}`}>
                            {feedback?.feedback}
                        </h3>

                        {!feedback?.isCorrect && (
                            <div className="mt-2 animate-in zoom-in-50 duration-300">

                                {/* Hero Explanation */}
                                {question.explanation && (
                                    <div className="p-4 bg-gray-50 rounded-2xl text-left border-l-4 border-gray-300">
                                        <div className="flex gap-2 items-start text-gray-700 leading-relaxed font-medium">
                                            <Sparkles size={20} className="text-yellow-500 shrink-0 mt-1" />
                                            <div><LatexRenderer text={question.explanation} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
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


            {/* --- REPORT MODAL --- */}
            {showFlagModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-rose-500" />

                        <div className="text-center mb-6 pt-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-500 mb-3">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800">Vibe Check 🤨</h3>
                            <p className="text-sm text-slate-500 font-medium">What's wrong with this question?</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleReportIssue('Question is confusing')}
                                disabled={reporting}
                                className="w-full p-4 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl font-bold text-sm transition-all text-left flex items-center gap-3 group border border-transparent hover:border-rose-200"
                            >
                                <span className="text-xl group-hover:scale-110 transition-transform">😵‍💫</span>
                                <span>Question is confusing</span>
                            </button>

                            <button
                                onClick={() => handleReportIssue('Answer is incorrect')}
                                disabled={reporting}
                                className="w-full p-4 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl font-bold text-sm transition-all text-left flex items-center gap-3 group border border-transparent hover:border-rose-200"
                            >
                                <span className="text-xl group-hover:scale-110 transition-transform">❌</span>
                                <span>Answer seems wrong</span>
                            </button>

                            <button
                                onClick={() => handleReportIssue('Typo / Glitch')}
                                disabled={reporting}
                                className="w-full p-4 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl font-bold text-sm transition-all text-left flex items-center gap-3 group border border-transparent hover:border-rose-200"
                            >
                                <span className="text-xl group-hover:scale-110 transition-transform">🐛</span>
                                <span>Typo or Glitch</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowFlagModal(false)}
                            className="mt-6 w-full py-3 text-slate-400 font-bold text-sm hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Nevermind, it's fine.
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
