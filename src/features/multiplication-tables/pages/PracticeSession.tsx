
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Sparkles } from 'lucide-react';

type QuestionType = 'DIRECT' | 'MISSING_MULTIPLIER';

interface Question {
    id: string;
    table: number;
    multiplier: number;
    type: QuestionType;
    correctAnswer: number;
}

interface InteractionLog {
    questionId: string;
    table: number;
    isCorrect: boolean;
    timeTaken: number;
    timestamp: number;
}

export default function PracticeSession() {
    const location = useLocation();
    const navigate = useNavigate();

    // State from navigation
    const selectedTables = (location.state as { tables: number[] })?.tables || [2]; // Fallback to 2

    // Session State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState<string>('');
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [showFeedback, setShowFeedback] = useState<'CORRECT' | 'INCORRECT' | null>(null);
    const [sessionLogs, setSessionLogs] = useState<InteractionLog[]>([]);
    const [streak, setStreak] = useState(0);

    // Initialize Session
    useEffect(() => {
        const newQuestions: Question[] = [];
        const multipliers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        // Generate pool of questions
        selectedTables.forEach((table: number) => {
            multipliers.forEach((mult: number) => {
                // Direct: 2 x 3 = ?
                newQuestions.push({
                    id: `${table}-x-${mult}-direct`,
                    table,
                    multiplier: mult,
                    type: 'DIRECT',
                    correctAnswer: table * mult
                });

                // Occasional missing multiplier for variety (20% chance)
                if (Math.random() > 0.8) {
                    newQuestions.push({
                        id: `${table}-x-${mult}-missing`,
                        table,
                        multiplier: mult,
                        type: 'MISSING_MULTIPLIER',
                        correctAnswer: mult // The answer is the multiplier: 5 x ? = 15
                    });
                }
            });
        });

        // Shuffle
        for (let i = newQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newQuestions[i], newQuestions[j]] = [newQuestions[j], newQuestions[i]];
        }

        // Slice for session length (e.g., 20 questions)
        setQuestions(newQuestions.slice(0, 20));
    }, [selectedTables]);

    const currentQuestion = questions[currentIndex];

    const handleInput = (num: number) => {
        if (userAnswer.length < 3) {
            setUserAnswer(prev => prev + num.toString());
        }
    };

    const handleBackspace = () => {
        setUserAnswer(prev => prev.slice(0, -1));
    };

    const handleSubmit = useCallback(() => {
        if (!currentQuestion || !userAnswer) return;

        const answerInt = parseInt(userAnswer, 10);
        const isCorrect = answerInt === currentQuestion.correctAnswer;
        const timeTaken = Date.now() - startTime;

        // Log result
        setSessionLogs(prev => [...prev, {
            questionId: currentQuestion.id,
            table: currentQuestion.table,
            isCorrect,
            timeTaken,
            timestamp: Date.now()
        }]);

        if (isCorrect) {
            setShowFeedback('CORRECT');
            setStreak(s => s + 1);
            // Play sound?
        } else {
            setShowFeedback('INCORRECT');
            setStreak(0);
        }

        // Delay for feedback then move next
        setTimeout(() => {
            setShowFeedback(null);
            setUserAnswer('');

            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setStartTime(Date.now());
            } else {
                // End of session
                // Save to DB asynchronously
                import('../services/tablesDb').then(({ saveSessionLogs }) => {
                    // Correctly map all logs to DB format
                    const dbLogs = sessionLogs.map(l => {
                        const q = questions.find(q => q.id === l.questionId);
                        return {
                            questionId: l.questionId,
                            table: l.table,
                            multiplier: q?.multiplier || 0,
                            type: q?.type || 'DIRECT',
                            isCorrect: l.isCorrect,
                            timeTaken: l.timeTaken,
                            timestamp: l.timestamp
                        };
                    });

                    const currentLog = {
                        questionId: currentQuestion!.id,
                        table: currentQuestion!.table,
                        multiplier: currentQuestion!.multiplier,
                        type: currentQuestion!.type,
                        isCorrect,
                        timeTaken,
                        timestamp: Date.now()
                    };

                    // Cast to any to bypass strict type check for now if types slightly mismatch, or ensure strictly matching
                    saveSessionLogs([...dbLogs, currentLog] as any);
                    navigate('/tables/summary', { state: { logs: [...sessionLogs, { ...currentLog, questionId: currentQuestion!.id }] } });
                });
            }
        }, isCorrect ? 1000 : 2500); // Longer delay for incorrect to show answer

    }, [currentIndex, currentQuestion, userAnswer, startTime, questions, sessionLogs, navigate]);

    // Keyboard support (optional but good)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showFeedback) return;
            if (e.key >= '0' && e.key <= '9') {
                handleInput(parseInt(e.key));
            } else if (e.key === 'Backspace') {
                handleBackspace();
            } else if (e.key === 'Enter') {
                handleSubmit();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [userAnswer, showFeedback, handleSubmit]);


    if (!currentQuestion) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center relative overflow-hidden">

            {/* Top Bar */}
            <div className="w-full p-4 flex justify-between items-center max-w-lg mx-auto">
                <button onClick={() => navigate('/tables')} className="p-2 rounded-full hover:bg-slate-200">
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                </button>
                <div className="flex gap-1">
                    <div className="h-2 w-32 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-slate-400 ml-2">{currentIndex + 1}/{questions.length}</span>
                </div>
                <div className="flex items-center gap-1 text-orange-500 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>{streak}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-center p-4">

                {/* Question Card */}
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="bg-white w-full rounded-3xl shadow-xl p-8 mb-8 flex flex-col items-center justify-center min-h-[200px]"
                    >
                        <div className="text-6xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
                            {currentQuestion.type === 'DIRECT' ? (
                                <>
                                    <span>{currentQuestion.table}</span>
                                    <span className="text-indigo-400">×</span>
                                    <span>{currentQuestion.multiplier}</span>
                                    <span className="text-slate-300">=</span>
                                    <span className={`min-w-[80px] text-center border-b-4 ${userAnswer ? 'border-indigo-500 text-indigo-600' : 'border-slate-200'} pb-2 transition-colors`}>
                                        {userAnswer || '?'}
                                    </span>
                                </>
                            ) : (
                                // Missing Multiplier: 5 x ? = 15
                                <>
                                    <span>{currentQuestion.table}</span>
                                    <span className="text-indigo-400">×</span>
                                    <span className={`min-w-[80px] text-center border-b-4 ${userAnswer ? 'border-indigo-500 text-indigo-600' : 'border-slate-200'} pb-2 transition-colors`}>
                                        {userAnswer || '?'}
                                    </span>
                                    <span className="text-slate-300">=</span>
                                    <span>{currentQuestion.table * currentQuestion.multiplier}</span>
                                </>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Feedback Overlay */}
                <AnimatePresence>
                    {showFeedback === 'CORRECT' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1.2 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 pointer-events-none"
                        >
                            <div className="text-green-500 font-black text-6xl drop-shadow-lg">AWESOME!</div>
                        </motion.div>
                    )}
                    {showFeedback === 'INCORRECT' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-32 bg-red-100 text-red-600 px-6 py-3 rounded-xl shadow-lg border border-red-200 z-20 pointer-events-none"
                        >
                            <span className="font-bold">Correct Answer: {currentQuestion.correctAnswer}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleInput(num)}
                            className="h-16 bg-white rounded-xl shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 text-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all font-mono"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleBackspace}
                        className="h-16 bg-rose-50 rounded-xl shadow-sm border-b-4 border-rose-200 active:border-b-0 active:translate-y-1 text-rose-500 font-bold hover:bg-rose-100 transition-all flex items-center justify-center"
                    >
                        ⌫
                    </button>
                    <button
                        onClick={() => handleInput(0)}
                        className="h-16 bg-white rounded-xl shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 text-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all font-mono"
                    >
                        0
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="h-16 bg-indigo-500 rounded-xl shadow-sm border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1 text-white font-bold hover:bg-indigo-600 transition-all flex items-center justify-center"
                    >
                        <Send className="w-6 h-6" />
                    </button>
                </div>

            </div>
        </div>
    );
}
