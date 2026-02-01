import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { Question } from '../../../../types';

// Helper for LaTeX
const renderLatexContent = (text: string) => {
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

                // Handle implicit power notation (e.g. 2^3, (a+b)^2)
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

interface QuestQuizViewProps {
    questions: Question[];
    currentQIndex: number;
    selectedAnswer: string | null;
    feedback: 'correct' | 'wrong' | null;
    onAnswer: (answerId: string, isCorrect: boolean, timeSpent: number) => void;
    onNext: () => void;
    onBack: () => void;
}

export const QuestQuizView: React.FC<QuestQuizViewProps> = ({
    questions,
    currentQIndex,
    selectedAnswer,
    feedback,
    onAnswer,
    onNext,
    onBack
}) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        setSeconds(0);
        const timer = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [currentQIndex]);
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

    // Wrapper to play sound on answer
    const handleAnswerWrapper = (id: string, isCorrect: boolean) => {
        if (!selectedAnswer) {
            playFeedbackSound(isCorrect ? 'correct' : 'wrong');
            onAnswer(id, isCorrect, seconds);
        }
    };

    return (
        <div className="flex flex-col h-full relative z-10">
            <div className="flex-1 flex flex-col justify-center items-center px-3 max-w-xl mx-auto w-full">

                {/* Question Card */}
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-xl w-full border-4 border-indigo-100 min-h-[200px] flex flex-col justify-center items-center text-center relative overflow-hidden">
                    {/* Integrated Progress Bar */}
                    <div
                        className="absolute top-0 left-0 h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(100, ((currentQIndex + 1) / questions.length) * 100)}%` }}
                    />

                    <h2 className="text-xl md:text-2xl font-black text-indigo-900 leading-snug">
                        {renderLatexContent(questions[currentQIndex]?.question_text)}
                    </h2>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-4">
                    {questions[currentQIndex]?.options.map((opt) => {
                        let btnClass = "bg-white text-indigo-900 border-white/50 hover:bg-indigo-50";

                        if (feedback) {
                            if (opt.isCorrect) {
                                btnClass = "bg-emerald-500 text-white border-emerald-400 ring-4 ring-emerald-200 scale-105";
                            } else if (selectedAnswer === opt.id) {
                                btnClass = "bg-rose-500 text-white border-rose-400 ring-4 ring-rose-200 opacity-100";
                            } else {
                                btnClass = "bg-white/50 text-indigo-900/40 border-transparent opacity-50 cursor-not-allowed";
                            }
                        }

                        return (
                            <button
                                key={opt.id}
                                onClick={() => handleAnswerWrapper(opt.id, opt.isCorrect)}
                                disabled={!!selectedAnswer}
                                className={`
                                    p-4 rounded-2xl font-black text-lg shadow-lg border-b-4 transition-all
                                    transform active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed
                                    ${btnClass}
                                `}
                            >
                                {renderLatexContent(opt.text)}
                                {feedback && opt.isCorrect && <span className="ml-2 absolute right-4">✅</span>}
                                {feedback && selectedAnswer === opt.id && !opt.isCorrect && <span className="ml-2 absolute right-4">❌</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Explanation / Feedback Overlay */}
                {feedback === 'wrong' && (
                    <div className="mt-8 bg-white/90 backdrop-blur-md rounded-3xl p-6 border-l-8 border-rose-500 shadow-2xl animate-in slide-in-from-bottom-4 w-full text-left relative">
                        <h3 className="text-rose-600 font-extrabold text-lg uppercase tracking-wider mb-2">Not Quite...</h3>
                        <p className="text-slate-700 font-medium text-lg leading-relaxed mb-6">
                            {renderLatexContent(questions[currentQIndex]?.explanation || "The correct answer is highlighted in green.")}
                        </p>
                        <button
                            onClick={onNext}
                            className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-xl shadow-lg shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            Got it! Next <ArrowLeft className="rotate-180" size={24} />
                        </button>
                    </div>
                )}
            </div>

            {/* Back Button */}
            <div className="p-4 flex justify-center pb-8">
                <button onClick={onBack} className="flex items-center gap-2 text-white/80 font-bold hover:text-white hover:bg-white/10 px-6 py-3 rounded-full transition-all">
                    <ArrowLeft size={18} /> Quit Mission
                </button>
            </div>
        </div>
    );
};
