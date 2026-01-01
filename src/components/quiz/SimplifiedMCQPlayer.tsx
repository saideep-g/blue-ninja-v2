import React, { useState, useEffect } from 'react';
import { SimplifiedQuestion } from '../../types/bundle';
import { Check, X, Clock, ArrowRight, RefreshCw, Trophy } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';


interface SimplifiedMCQPlayerProps {
    title: string;
    questions: SimplifiedQuestion[];
    onComplete: (score: number, total: number) => void;
    onExit: () => void;
}

export default function SimplifiedMCQPlayer({ title, questions, onComplete, onExit }: SimplifiedMCQPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const currentQ = questions[currentIndex];

    useEffect(() => {
        setSelectedOption(null);
        setFeedback(null);
        setIsPaused(false);
    }, [currentIndex]);

    useEffect(() => {
        if (!isPaused) {
            const timer = setInterval(() => setTimeLeft(prev => prev + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [isPaused]);

    const handleAnswer = (option: string) => {
        if (selectedOption) return;

        setSelectedOption(option);
        setIsPaused(true);

        const isCorrect = option === currentQ.answer;

        if (isCorrect) {
            setScore(prev => prev + 1);
            setStreak(prev => prev + 1);
            setFeedback('correct');

            setTimeout(() => {
                nextQuestion();
            }, 2000);
        } else {
            setStreak(0);
            setFeedback('wrong');
            setTimeout(() => {
                nextQuestion();
            }, 3000);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onComplete(score + (feedback === 'correct' ? 1 : 0), questions.length);
        }
    };

    const getMotivationalMessage = () => {
        if (streak > 2) return "You're on fire! 🔥";
        if (streak > 0) return "Great job! Keep it up!";
        return "Correct!";
    };

    if (!currentQ) return <div className="p-8 text-center">Loading Quiz...</div>;

    const renderContent = (text: string) => {
        if (!text) return '';
        const parts = text.split('$');
        return (
            <span>
                {parts.map((part, i) =>
                    i % 2 === 1 ? <InlineMath key={i} math={part} /> : <span key={i}>{part}</span>
                )}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-white px-6 py-4 shadow-sm flex justify-between items-center">
                <button onClick={onExit} className="text-slate-400 hover:text-red-500 font-bold">
                    <X size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <h2 className="font-black text-purple-900 uppercase tracking-widest text-sm">{title}</h2>
                    <div className="flex gap-1 mt-1">
                        {questions.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 w-6 rounded-full transition-colors 
                                    ${i < currentIndex ? 'bg-purple-500' : i === currentIndex ? 'bg-purple-200' : 'bg-slate-100'}`}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-lg">
                    <Clock size={16} />
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
            </div>

            {/* Question Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto w-full">
                <div className="bg-white rounded-3xl shadow-xl shadow-purple-100 p-8 w-full mb-8 min-h-[200px] flex items-center justify-center relative overflow-hidden">
                    {/* Difficulty Badge */}
                    <div className={`absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded
                        ${currentQ.difficulty === 'hard' ? 'bg-red-100 text-red-600' :
                            currentQ.difficulty === 'medium' ? 'bg-amber-100 text-amber-600' :
                                'bg-emerald-100 text-emerald-600'}`}>
                        {currentQ.difficulty}
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                        {renderContent(currentQ.question)}
                    </h1>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {currentQ.options.map((opt, i) => {
                        const isSelected = selectedOption === opt;
                        const isCorrect = opt === currentQ.answer;

                        let btnClass = "bg-white border-2 border-slate-100 text-slate-600 hover:border-purple-200 hover:bg-purple-50";

                        if (feedback && isSelected) {
                            if (isCorrect) btnClass = "bg-emerald-500 border-emerald-600 text-white shadow-lg scale-[1.02]";
                            else btnClass = "bg-red-500 border-red-600 text-white shadow-lg opacity-50";
                        } else if (feedback && isCorrect) {
                            // Reveal correct answer if wrong was selected
                            btnClass = "bg-emerald-100 border-emerald-300 text-emerald-700 animate-pulse";
                        }

                        return (
                            <button
                                key={i}
                                disabled={!!selectedOption}
                                onClick={() => handleAnswer(opt)}
                                className={`p-6 rounded-2xl text-xl font-bold transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${btnClass}`}
                            >
                                <span className="z-10">{renderContent(opt)}</span>
                                {feedback && isSelected && isCorrect && <Check className="z-10" />}
                                {feedback && isSelected && !isCorrect && <X className="z-10" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Feedback Footer / Overlay */}
            {feedback && (
                <div className={`fixed bottom-0 left-0 right-0 p-6 animate-in slide-in-from-bottom-10 fade-in duration-300 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]
                    ${feedback === 'correct' ? 'bg-emerald-100 border-t-4 border-emerald-400' : 'bg-red-100 border-t-4 border-red-400'}
                `}>
                    <div className="max-w-3xl mx-auto flex justify-between items-center">
                        <div>
                            <h3 className={`text-xl font-black ${feedback === 'correct' ? 'text-emerald-800' : 'text-red-800'}`}>
                                {feedback === 'correct' ? getMotivationalMessage() : 'Not quite right...'}
                            </h3>
                            <p className={`text-sm font-medium mt-1 ${feedback === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {feedback === 'correct' ? 'Proceeding to next question...' : `The correct answer is: ${currentQ.answer}`}
                            </p>
                            {feedback === 'wrong' && currentQ.explanation && (
                                <p className="text-xs text-red-500 mt-2 bg-white/50 p-2 rounded-lg inline-block">
                                    💡 {currentQ.explanation}
                                </p>
                            )}
                        </div>
                        <div className="h-12 w-12 rounded-full bg-white/50 flex items-center justify-center animate-spin-slow">
                            <RefreshCw size={24} className={feedback === 'correct' ? 'text-emerald-500' : 'text-red-500'} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
