import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Zap, Mic, StopCircle, RefreshCw, Send, CheckCircle, Circle,
    ArrowRightCircle, Lightbulb, User, Sparkles, MessageSquare,
    AlertCircle, XCircle, Loader2
} from 'lucide-react';
import { Question } from '../../types';
import { aiEvaluationService } from '../../services/aiEvaluationService';
import { useNinja } from '../../context/NinjaContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/db/firebase';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

// Internal helper for score animation
const AnimatedScore = ({ value }: { value: number }) => {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        let start = 0;
        const duration = 1000; // 1s animation
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);

            setDisplay(Math.floor(ease * value));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplay(value); // Ensure final value is exact
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <>{display}</>;
};

interface ShortAnswerProps {
    question: Question;
    onAnswer: (result: any, shouldAdvance?: boolean) => void;
    isSubmitting: boolean;
    readOnly?: boolean;
    isPreview?: boolean;
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
                    return <strong key={i} className="font-black" style={{ color: 'var(--color-primary)' }}>{content}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const Typewriter = ({ text, delay = 10 }: { text: string, delay?: number }) => {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        let i = 0;
        setDisplayed(''); // Reset state on text change
        const timer = setInterval(() => {
            if (i < text.length) {
                i++;
                setDisplayed(text.substring(0, i)); // Robust slicing
            } else {
                clearInterval(timer);
            }
        }, delay);
        return () => clearInterval(timer);
    }, [text, delay]);
    return <span>{displayed}</span>;
};

export function ShortAnswerTemplate({ question, onAnswer, isSubmitting: parentSubmitting, readOnly, isPreview }: ShortAnswerProps) {
    const { user, ninjaStats } = useNinja();
    const [answer, setAnswer] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState<any>(null);
    const [fallbackMode, setFallbackMode] = useState(false);
    const [manualScore, setManualScore] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);

    // Animation States
    const [visibleIndex, setVisibleIndex] = useState(-1);
    const [statusMessage, setStatusMessage] = useState("Initializing...");
    const [showSummary, setShowSummary] = useState(false);

    // Voice Input Support (omitted for brevity, keep existing logic if needed or reimplement)
    // ... Keeping voice logic ...
    const recognitionRef = useRef<any>(null);
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                }
                if (finalTranscript) setAnswer(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
            };
            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => setIsListening(false);
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) return alert("Voice input not supported.");
        isListening ? recognitionRef.current.stop() : (recognitionRef.current.start(), setIsListening(true));
    };

    const wordCount = useMemo(() => answer.trim() === '' ? 0 : answer.trim().split(/\s+/).length, [answer]);

    // Progressive Messaging
    useEffect(() => {
        if (isEvaluating) {
            const messages = [
                "Analyzing your response...",
                "Checking against rubric...",
                "Comparing with model answer...",
                "Identifying key concepts...",
                "Formulating feedback..."
            ];
            let i = 0;
            setStatusMessage(messages[0]);
            const interval = setInterval(() => {
                i = (i + 1) % messages.length;
                setStatusMessage(messages[i]);
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [isEvaluating]);

    // Cleanup when question changes
    useEffect(() => {
        setAnswer('');
        setIsEvaluating(false);
        setEvaluationResult(null);
        setFallbackMode(false);
        setVisibleIndex(-1);
        setShowSummary(false);
    }, [question.id]);

    // Sequential Reveal Logic
    useEffect(() => {
        if (evaluationResult && evaluationResult.results) {
            // If we have shown all items, schedule summary
            if (visibleIndex >= evaluationResult.results.length - 1) {
                if (!showSummary) {
                    const lastResult = evaluationResult.results[evaluationResult.results.length - 1];
                    const feedbackLength = lastResult?.feedback?.length || 50;
                    // Wait for last item typing (15ms/char) + buffer
                    const delay = (feedbackLength * 15) + 1000;

                    const timer = setTimeout(() => setShowSummary(true), delay);
                    return () => clearTimeout(timer);
                }
                return;
            }

            // Schedule transition to next item
            let delay = 0;
            if (visibleIndex === -1) {
                delay = 500; // Initial start
            } else {
                const currentResult = evaluationResult.results[visibleIndex];
                const feedbackLength = currentResult?.feedback?.length || 50;
                // Wait for typing (15ms/char) + 500ms delay per user req + extra buffer for readability
                delay = (feedbackLength * 15) + 800;
            }

            const timer = setTimeout(() => {
                setVisibleIndex(prev => prev + 1);
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [evaluationResult, visibleIndex, showSummary]);

    // Calculate current score based on visible items
    const currentScore = useMemo(() => {
        if (!evaluationResult || visibleIndex === -1) return 0;
        return evaluationResult.results.slice(0, visibleIndex + 1).filter((r: any) => r.passed).length;
    }, [evaluationResult, visibleIndex]);

    const handleSubmit = async () => {
        if (answer.trim().length < 5) {
            setErrorMessage("Your answer is too short.");
            setTimeout(() => setErrorMessage(null), 3000);
            return;
        }

        setIsEvaluating(true);
        setErrorMessage(null);
        // Reset animation state
        setVisibleIndex(-1);
        setShowSummary(false);

        // Timeout handler
        const timeoutId = setTimeout(() => {
            if (isEvaluating) {
                setIsEvaluating(false);
                setFallbackMode(true);
                setErrorMessage("AI took too long to respond. Switching to manual mode.");
            }
        }, 45000); // 45s timeout

        try {
            const targetUid = isPreview ? 'preview-admin-id' : (user?.uid || 'anonymous');
            const targetName = isPreview ? 'Admin Preview' : (ninjaStats?.username || 'Student');

            // ALWAYS use real AI, even in preview, to allow testing rubric quality
            const response = await aiEvaluationService.evaluateShortAnswer(
                targetUid,
                targetName,
                question,
                answer
            );

            clearTimeout(timeoutId);
            setIsEvaluating(false); // Stop "Evaluating" state, start "Reveal" state (via evaluationResult presence)

            if (response.isSuccess && response.data) {
                setEvaluationResult(response.data);
                onAnswer({
                    isCorrect: response.data.score === (question.max_points || 3),
                    score: response.data.score,
                    studentAnswer: answer,
                    aiFeedback: response.data,
                    questionType: 'SHORT_ANSWER'
                }, false);
            } else {
                setFallbackMode(true);
            }
        } catch (error: any) {
            clearTimeout(timeoutId);
            setIsEvaluating(false);
            setFallbackMode(true);
        }
    };

    const handleSkipAnimation = () => {
        if (evaluationResult) {
            setVisibleIndex(evaluationResult.results.length - 1);
            setShowSummary(true);
        }
    };

    const handleManualSubmit = async () => { /* ... existing manual logic ... */
        if (manualScore === null) return;
        if (!isPreview) await aiEvaluationService.logSelfEvaluation(user?.uid || 'auto', ninjaStats?.username || 'Student', question, answer, manualScore);
        onAnswer({ isCorrect: manualScore === (question.max_points || 3), score: manualScore, studentAnswer: answer, isSelfEvaluated: true, questionType: 'SHORT_ANSWER' }, false);
        setEvaluationResult({ score: manualScore, summary: "Self-evaluated." });
        setVisibleIndex(100); setShowSummary(true); // Force reveal
    };

    const handleContinue = () => {
        if (evaluationResult) onAnswer({ isCorrect: evaluationResult.score === (question.max_points || 3), score: evaluationResult.score }, true);
    };

    const textColor = 'var(--color-text)';
    const borderColor = 'var(--color-border, transparent)';
    const bgCard = 'var(--color-card, rgba(255, 255, 255, 0.05))';

    // Criteria List for Render
    const criteriaList = question.evaluation_criteria || [];

    return (
        <div className="w-full space-y-6 flex flex-col font-sans max-w-4xl mx-auto" style={{ color: textColor }}>
            {/* QUESTION CARD */}
            <div className="p-8 md:p-10 rounded-[2.5rem] border-2 shadow-xl relative overflow-hidden"
                style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                <h2 className="text-2xl md:text-3xl font-serif italic leading-tight pr-4">
                    <LatexRenderer text={question.question || (question as any).content?.prompt?.text || 'Question text'} />
                </h2>
                {((question as any).content?.prompt?.instruction) && (
                    <p className="mt-4 text-sm font-bold opacity-60 uppercase tracking-widest"><LatexRenderer text={(question as any).content.prompt.instruction} /></p>
                )}
            </div>

            {/* INPUT AREA */}
            <div className="space-y-4">
                {!evaluationResult && !fallbackMode && !isEvaluating && (
                    <div className="relative group/input">
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            disabled={readOnly}
                            placeholder="Type your answer here..."
                            className="w-full min-h-[160px] p-6 rounded-[2rem] border-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-lg focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                            style={{ borderColor: borderColor }}
                        />
                        <div className="absolute bottom-4 right-6 flex items-center gap-4">
                            <span className="text-xs font-bold opacity-40 uppercase tracking-tighter">{wordCount} Words</span>
                            <button onClick={toggleListening} className={`p-3 rounded-full transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
                            </button>
                        </div>
                    </div>
                )}

                {errorMessage && <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in"><AlertCircle size={20} /><span className="font-bold text-sm">{errorMessage}</span></div>}

                {!evaluationResult && !fallbackMode && !isEvaluating && (
                    <button onClick={handleSubmit} disabled={readOnly || answer.trim().length === 0} className="w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-3" style={{ backgroundColor: textColor, color: 'var(--color-surface)' }}>
                        Get AI Feedback <Zap size={18} fill="currentColor" />
                    </button>
                )}
            </div>

            {/* INTERACTIVE EVALUATION & RESULTS */}
            {(isEvaluating || evaluationResult) && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                    {/* READ-ONLY ANSWER */}
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
                        <h5 className="text-xs font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2"><User size={14} /> Your Answer</h5>
                        <p className="text-slate-700 dark:text-slate-300 italic text-lg leading-relaxed">"{answer}"</p>
                    </div>

                    <div className="p-8 rounded-[2.5rem] border-2 shadow-xl relative overflow-hidden bg-white dark:bg-slate-900"
                        style={{ borderColor: evaluationResult && showSummary ? (currentScore >= (question.max_points || 3) ? '#34d399' : '#f43f5e') : borderColor }}>

                        {/* STATUS HEADER */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl ${isEvaluating ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {isEvaluating ? <Loader2 size={24} className="animate-spin" /> : <MessageSquare size={24} />}
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Tutor Status</h4>
                                    <div className="h-8 flex items-center">
                                        {isEvaluating ? (
                                            <p className="text-xl font-black text-slate-800 dark:text-white animate-pulse">{statusMessage}</p>
                                        ) : (
                                            <p className="text-xl font-black text-slate-800 dark:text-white">Detailed Evaluation</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-bold uppercase opacity-40 block">Score</span>
                                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                                    <AnimatedScore value={currentScore} /> / {question.max_points || 3}
                                </span>
                            </div>
                        </div>

                        {/* SEQUENCE REVEAL CRITERIA */}
                        <div className="space-y-6 mb-8">
                            {(!isEvaluating && !evaluationResult) ? null :
                                /* Use criteriaList for Skeletons, evaluationResult.results for Results */
                                (evaluationResult ? evaluationResult.results : criteriaList).map((item: any, idx: number) => {
                                    // Determine state: 'pending', 'analyzing', 'revealed'
                                    const isRevealed = visibleIndex >= idx;
                                    const isNext = visibleIndex === idx - 1; // Used if we want to show spinner on the *next* item

                                    // If result is available:
                                    const result = evaluationResult ? evaluationResult.results[idx] : null;
                                    const criterionText = result ? result.criterion : (typeof item === 'string' ? item : item.criterion);

                                    return (
                                        <div key={idx} className={`flex gap-4 p-4 rounded-xl transition-all duration-500 ${isRevealed ? 'bg-transparent' : 'bg-slate-50 dark:bg-slate-800/50 opacity-60'}`}>
                                            <div className="shrink-0 mt-1">
                                                {isRevealed && result ? (
                                                    result.passed ? <CheckCircle size={24} className="text-emerald-500" fill="currentColor" /> : <XCircle size={24} className="text-rose-400 stroke-[2.5]" />
                                                ) : (
                                                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`font-bold mb-1 transition-colors ${isRevealed ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                                                    {criterionText}
                                                </p>
                                                {isRevealed && result && (
                                                    <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed animate-in fade-in duration-700">
                                                        <Typewriter text={result.feedback} delay={15} />
                                                    </div>
                                                )}
                                                {!isRevealed && (
                                                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-2" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            }
                        </div>

                        {/* SKIP ANIMATION BTN */}
                        {evaluationResult && !showSummary && (
                            <button onClick={handleSkipAnimation} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-500 mb-4 mx-auto block">Skip Animation &rarr;</button>
                        )}

                        {/* SUMMARY (REVEALED LAST) */}
                        {showSummary && evaluationResult && (
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 mb-8 animate-in zoom-in-95 duration-500">
                                <h5 className="text-xs font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                                    <Sparkles size={14} /> Tutor's Summary
                                </h5>
                                <p className="text-slate-700 dark:text-slate-300 italic">"{evaluationResult.summary}"</p>
                            </div>
                        )}

                        {/* MODEL ANSWER */}
                        {showSummary && (
                            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                <div>
                                    <h5 className="text-xs font-black uppercase tracking-widest opacity-40 mb-3">Model Answer</h5>
                                    <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-100 font-medium">
                                        <LatexRenderer text={question.model_answer || (question as any).interaction?.config?.model_answer || ''} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {showSummary && (
                        <button onClick={handleContinue} className="w-full py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2 border-2 active:scale-95 group/next bg-white dark:bg-slate-900 text-slate-800 dark:text-white animate-in slide-in-from-bottom-4" style={{ borderColor: borderColor }}>
                            Next Challenge <ArrowRightCircle size={18} className="group-hover/next:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            )}

            {/* FALLBACK MODE */}
            {fallbackMode && !evaluationResult && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="p-8 rounded-[2.5rem] border-2 border-yellow-400 bg-white dark:bg-slate-900 shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-2xl text-yellow-600">
                                <User size={24} />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-800 dark:text-white">Self-Evaluation Mode</h4>
                                <p className="text-sm text-slate-500 font-medium">We couldn't reach the AI grader right now. Please grade yourself.</p>
                            </div>
                        </div>

                        <div className="space-y-6 mb-8">
                            <div>
                                <h5 className="text-xs font-black uppercase tracking-widest opacity-40 mb-3">Your Answer</h5>
                                <p className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl italic border border-slate-100 dark:border-slate-700">"{answer}"</p>
                            </div>
                            <div>
                                <h5 className="text-xs font-black uppercase tracking-widest opacity-40 mb-3">Model Answer (Goal)</h5>
                                <p className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-100 font-bold">
                                    <LatexRenderer text={question.model_answer || ''} />
                                </p>
                            </div>
                            <div>
                                <h5 className="text-xs font-black uppercase tracking-widest opacity-40 mb-3">Grading Criteria</h5>
                                <ul className="space-y-2">
                                    {question.evaluation_criteria?.map((c: string, i: number) => (
                                        <li key={i} className="flex gap-3 items-center text-sm font-medium opacity-70">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-3xl text-center">
                            <label className="text-xs font-black uppercase tracking-widest opacity-40 block mb-4">How many points did you earn?</label>
                            <div className="flex justify-center gap-4">
                                {[...Array((question.max_points || 3) + 1)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setManualScore(i)}
                                        className={`w-14 h-14 rounded-full font-black text-xl transition-all border-2 ${manualScore === i ? 'bg-indigo-600 border-indigo-600 text-white scale-110' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}
                                    >
                                        {i}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleManualSubmit}
                                disabled={manualScore === null}
                                className="mt-8 px-12 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all disabled:opacity-30"
                            >
                                Submit My Grade
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
