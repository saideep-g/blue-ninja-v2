import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Zap, Mic, StopCircle, RefreshCw, Send, CheckCircle, Circle,
    ArrowRightCircle, Lightbulb, User, Sparkles, MessageSquare,
    AlertCircle
} from 'lucide-react';
import { Question } from '../../types';
import { aiEvaluationService } from '../../services/aiEvaluationService';
import { useNinja } from '../../context/NinjaContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/db/firebase';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

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

export function ShortAnswerTemplate({ question, onAnswer, isSubmitting: parentSubmitting, readOnly, isPreview }: ShortAnswerProps) {
    const { user, ninjaStats } = useNinja();
    const [answer, setAnswer] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState<any>(null);
    const [fallbackMode, setFallbackMode] = useState(false);
    const [manualScore, setManualScore] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);

    // Voice Input Support
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
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setAnswer(prev => {
                        const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
                        return prev + spacer + finalTranscript;
                    });
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Voice input not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const wordCount = useMemo(() => {
        return answer.trim() === '' ? 0 : answer.trim().split(/\s+/).length;
    }, [answer]);

    const handleSubmit = async () => {
        if (answer.trim().length < 5) {
            setErrorMessage("Your answer is too short. Please provide more detail.");
            setTimeout(() => setErrorMessage(null), 3000);
            return;
        }

        setIsEvaluating(true);
        setErrorMessage(null);

        const response = isPreview
            ? await (async () => {
                // Mock behavior for preview if we don't want to call real AI
                // Actually, the user wants "Dry Run" but that's in the simulator sidebar.
                // For the "actual" template in the preview window, let's keep it simple or call real AI but skip LOGGING.
                const evaluateFn = (httpsCallable as any)(functions, 'evaluateShortAnswer');
                const result = await evaluateFn({
                    question: question.question_text || (question as any).question,
                    student_answer: answer,
                    evaluation_criteria: question.evaluation_criteria,
                    max_points: question.max_points || 3
                });
                return { isSuccess: true, data: (result.data as any).evaluation };
            })()
            : await aiEvaluationService.evaluateShortAnswer(
                user?.uid || 'anonymous',
                ninjaStats?.username || 'Student',
                question,
                answer
            );

        if (response.isSuccess && response.data) {
            setEvaluationResult(response.data);
            // Log final result to parent
            onAnswer({
                isCorrect: response.data.score === (question.max_points || 3),
                score: response.data.score,
                studentAnswer: answer,
                aiFeedback: response.data,
                questionType: 'SHORT_ANSWER'
            }, false); // Don't advance immediately
        } else {
            setFallbackMode(true);
        }
        setIsEvaluating(false);
    };

    const handleManualSubmit = async () => {
        if (manualScore === null) return;

        if (!isPreview) {
            await aiEvaluationService.logSelfEvaluation(
                user?.uid || 'anonymous',
                ninjaStats?.username || 'Student',
                question,
                answer,
                manualScore
            );
        }

        onAnswer({
            isCorrect: manualScore === (question.max_points || 3),
            score: manualScore,
            studentAnswer: answer,
            isSelfEvaluated: true,
            questionType: 'SHORT_ANSWER'
        }, false);

        // Hide manual input area by setting a mock result for UI
        setEvaluationResult({
            score: manualScore,
            summary: "Self-evaluated answer."
        });
    };

    const handleContinue = () => {
        if (evaluationResult) {
            onAnswer({
                isCorrect: evaluationResult.score === (question.max_points || 3),
                score: evaluationResult.score
            }, true);
        }
    };

    const textColor = 'var(--color-text)';
    const borderColor = 'var(--color-border)';
    const bgCard = 'var(--color-card)';

    return (
        <div className="w-full space-y-6 flex flex-col font-sans max-w-4xl mx-auto" style={{ color: textColor }}>

            {/* QUESTION CARD */}
            <div className="backdrop-blur-xl p-8 rounded-[2.5rem] border-2 shadow-sm relative overflow-hidden group"
                style={{ backgroundColor: bgCard, borderColor: borderColor }}>
                <h2 className="text-2xl md:text-3xl font-serif italic leading-tight pr-4">
                    <LatexRenderer text={question.question_text || question.content?.prompt?.text || ''} />
                </h2>
                {question.content?.prompt?.instruction && (
                    <p className="mt-4 text-sm font-bold opacity-60 uppercase tracking-widest">
                        <LatexRenderer text={question.content.prompt.instruction} />
                    </p>
                )}
            </div>

            {/* INPUT AREA */}
            <div className="space-y-4">
                {!evaluationResult && !fallbackMode && (
                    <div className="relative group/input">
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            disabled={isEvaluating || readOnly}
                            placeholder="Type your answer here..."
                            className="w-full min-h-[160px] p-6 rounded-[2rem] border-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-lg focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                            style={{ borderColor: borderColor }}
                        />

                        {/* BOTTOM BAR: COUNTER & MIC */}
                        <div className="absolute bottom-4 right-6 flex items-center gap-4">
                            <span className="text-xs font-bold opacity-40 uppercase tracking-tighter">
                                {wordCount} Words | {answer.length} Chars
                            </span>
                            <button
                                onClick={toggleListening}
                                disabled={isEvaluating || readOnly}
                                className={`p-3 rounded-full transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                            >
                                {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
                            </button>
                        </div>
                    </div>
                )}

                {/* ERROR MESSAGE TOAST */}
                {errorMessage && (
                    <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={20} />
                        <span className="font-bold text-sm">{errorMessage}</span>
                    </div>
                )}

                {/* SUBMIT BUTTON */}
                {!evaluationResult && !fallbackMode && (
                    <button
                        onClick={handleSubmit}
                        disabled={isEvaluating || readOnly || answer.trim().length === 0}
                        className="w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        style={{ backgroundColor: textColor, color: 'var(--color-surface)' }}
                    >
                        {isEvaluating ? (
                            <>
                                <RefreshCw className="animate-spin" size={20} />
                                Gemini is evaluating...
                            </>
                        ) : (
                            <>
                                Get AI Feedback <Zap size={18} fill="currentColor" />
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* AI FEEDBACK AREA */}
            {evaluationResult && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="p-8 rounded-[2.5rem] border-2 shadow-xl relative overflow-hidden bg-white dark:bg-slate-900"
                        style={{ borderColor: evaluationResult.score >= (question.max_points || 3) ? '#34d399' : '#f43f5e' }}>

                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                    <MessageSquare size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">AI Feedback</h4>
                                    <p className="text-xl font-black text-slate-800 dark:text-white">Detailed Rubric Check</p>
                                </div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-bold uppercase opacity-40 block">Score</span>
                                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                    {evaluationResult.score} / {question.max_points || 3}
                                </span>
                            </div>
                        </div>

                        {/* CRITERIA CHECKLIST */}
                        <div className="space-y-6 mb-8">
                            {evaluationResult.results?.map((res: any, idx: number) => (
                                <div key={idx} className="flex gap-4 group/item">
                                    <div className={`shrink-0 mt-1 ${res.passed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}`}>
                                        {res.passed ? <CheckCircle size={24} fill="currentColor" className="text-white dark:text-slate-900" /> : <Circle size={24} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white mb-1">{res.criterion}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{res.feedback}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* AI SUMMARY */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 mb-8">
                            <h5 className="text-xs font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                                <Sparkles size={14} /> Tutor's Summary
                            </h5>
                            <p className="text-slate-700 dark:text-slate-300 italic">"{evaluationResult.summary}"</p>
                        </div>

                        {/* MODEL COMPARISON */}
                        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <h5 className="text-xs font-black uppercase tracking-widest opacity-40 mb-3">Model Answer</h5>
                                <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-100 font-medium">
                                    <LatexRenderer text={question.model_answer || (question as any).interaction?.config?.model_answer || ''} />
                                </div>
                            </div>
                            {question.explanation && (
                                <div>
                                    <h5 className="text-xs font-black uppercase tracking-widest opacity-40 mb-3">Teacher's Explanation</h5>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        <LatexRenderer text={question.explanation} />
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleContinue}
                        className="w-full py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2 border-2 active:scale-95 group/next bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        style={{ borderColor: borderColor }}
                    >
                        Next Challenge
                        <ArrowRightCircle size={18} className="group-hover/next:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

            {/* FALLBACK / SELF-EVALUATION MODE */}
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
