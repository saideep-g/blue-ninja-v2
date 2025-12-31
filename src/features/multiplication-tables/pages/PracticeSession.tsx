import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Sparkles, Zap } from 'lucide-react';
import { useNinja } from '../../../context/NinjaContext';
// Static import to resolve build warning (was mixed with dynamic/static in other files)
import { getStudentTableStats, saveSinglePracticeLog } from '../services/tablesFirestore';
import { playCorrectSound, playIncorrectSound, playCompletionSound } from '../utils/sounds';

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
    const { user, ninjaStats } = useNinja();

    // Determine Grade Level / Mode
    // Robust detection logic matching TableSelection
    const statsAny = ninjaStats as any;
    const userAny = user as any;

    // Check all potential locations
    const rawClass =
        statsAny?.class ||
        statsAny?.grade ||
        statsAny?.profile?.class ||
        userAny?.profile?.class ||
        userAny?.class ||
        2;

    const userClass = parseInt(String(rawClass), 10); // Ensure integer
    const isAdvanced = userClass >= 7;

    useEffect(() => {
        console.log(`[PracticeSession] Theme Init - Class: ${userClass} (Raw: ${rawClass}), Advanced: ${isAdvanced}`);
    }, [userClass, isAdvanced, rawClass]);

    const theme = isAdvanced ? {
        bg: "bg-slate-900",
        cardBg: "bg-slate-800 border border-slate-700",
        text: "text-white",
        accent: "text-cyan-400",
        button: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)]",
        secondaryButton: "bg-slate-700 text-slate-300 border-slate-600",
        numpadBg: "bg-slate-800 text-cyan-50 border-slate-700 hover:bg-slate-700",
        numpadActive: "border-cyan-500",
        progressBar: "bg-cyan-500 shadow-[0_0_10px_#06b6d4]",
        feedbackCorrect: "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]",
        feedbackBg: "bg-slate-900/90"
    } : {
        bg: "bg-slate-50",
        cardBg: "bg-white shadow-xl",
        text: "text-slate-800",
        accent: "text-indigo-400",
        button: "bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm",
        secondaryButton: "bg-rose-50 text-rose-500 border-rose-200",
        numpadBg: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
        numpadActive: "border-indigo-700",
        progressBar: "bg-green-500",
        feedbackCorrect: "text-green-500",
        feedbackBg: "bg-white/80"
    };

    // State from navigation
    const selectedTables = (location.state as { tables: number[] })?.tables || [2];

    // Session State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState<string>('');
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [showFeedback, setShowFeedback] = useState<'CORRECT' | 'INCORRECT' | null>(null);
    const [sessionLogs, setSessionLogs] = useState<InteractionLog[]>([]);
    const [streak, setStreak] = useState(0);
    const [masteryFetched, setMasteryFetched] = useState(false);
    const [masteryLimit, setMasteryLimit] = useState(10); // Default for Advanced

    // Fetch Mastery Stats for Advanced Mode
    useEffect(() => {
        if (!isAdvanced || !user) {
            setMasteryFetched(true);
            return;
        }

        console.log('[PracticeSession] Fetching mastery stats for dynamic limits...');
        getStudentTableStats(user.uid).then(stats => {
            let maxMastered = 10;
            stats.forEach(s => {
                // Definition of Mastery: 80% accuracy after 20+ attempts
                // This creates a "Safe Zone" where we assume the student knows the table well enough to use it as a multiplier
                if (s.accuracy >= 80 && s.totalAttempts >= 20) {
                    if (s.table > maxMastered) maxMastered = s.table;
                }
            });

            const limit = Math.max(10, maxMastered);
            console.log(`[PracticeSession] Max Mastered: ${maxMastered}, Multiplier Limit: ${limit}`);
            setMasteryLimit(limit);
            setMasteryFetched(true);
        });
    }, [user, isAdvanced]);

    // Initialize Session
    useEffect(() => {
        if (!masteryFetched) return; // Wait for mastery check

        console.log(`[PracticeSession] Generating questions. Tables: ${selectedTables.join(', ')}`);
        const newQuestions: Question[] = [];

        // Available multipliers
        // Advanced Mode (Grade 7+): Multiplier capped at MAX(10, highest_mastered_table).
        // Rationale: Expand safe zone dynamically. If mastered table 12, allows 10x12, 14x12...
        // Standard Mode (Grade 2-6): Standard curriculum often goes up to 12x12.
        const limit = isAdvanced ? masteryLimit : 12;
        const multipliers = Array.from({ length: limit }, (_, i) => i + 1);

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

                // Missing Multiplier logic
                // Grade 2: 20% chance
                // Grade 7: 40% chance (increases challenge)
                const missingChance = isAdvanced ? 0.4 : 0.2;

                if (Math.random() < missingChance) {
                    newQuestions.push({
                        id: `${table}-x-${mult}-missing`,
                        table,
                        multiplier: mult,
                        type: 'MISSING_MULTIPLIER',
                        correctAnswer: mult
                    });
                }
            });
        });

        // Shuffle
        for (let i = newQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newQuestions[i], newQuestions[j]] = [newQuestions[j], newQuestions[i]];
        }

        // Session Length
        // Grade 7 users might want a longer session? Keeping 20 for now to be "snackable".
        const sessionLength = isAdvanced ? 25 : 20;
        setQuestions(newQuestions.slice(0, sessionLength));
    }, [selectedTables, isAdvanced, masteryFetched, masteryLimit]); // Re-run when mastery is fetched

    // Intercept Back Button
    useEffect(() => {
        window.history.pushState(null, '', window.location.pathname);
        const handlePopState = (event: PopStateEvent) => {
            // Only confirm if not at end
            if (currentIndex < questions.length - 1) {
                const confirmExit = window.confirm("Do you want to exit the practice session? Progress may be lost.");
                if (confirmExit) navigate('/tables');
                else window.history.pushState(null, '', window.location.pathname);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [navigate, currentIndex, questions.length]);

    const currentQuestion = questions[currentIndex];

    const handleInput = (num: number) => {
        if (userAnswer.length < 4) { // Allow up to 4 digits for larger tables (20x20=400)
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

        setSessionLogs(prev => [...prev, {
            questionId: currentQuestion.id,
            table: currentQuestion.table,
            isCorrect,
            timeTaken,
            timestamp: Date.now()
        }]);

        if (user) {
            const isValidForSpeed = timeTaken <= 30000 && isCorrect;
            saveSinglePracticeLog(user.uid, {
                questionId: currentQuestion.id,
                table: currentQuestion.table,
                multiplier: currentQuestion.multiplier,
                type: currentQuestion.type,
                isCorrect,
                timeTaken,
                isValidForSpeed
            });
        }

        if (isCorrect) {
            setShowFeedback('CORRECT');
            setStreak(s => s + 1);
            playCorrectSound();
        } else {
            setShowFeedback('INCORRECT');
            setStreak(0);
            playIncorrectSound();
        }

        setTimeout(() => {
            setShowFeedback(null);
            setUserAnswer('');

            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setStartTime(Date.now());
            } else {
                playCompletionSound();
                const currentLog = {
                    questionId: currentQuestion!.id,
                    table: currentQuestion!.table,
                    isCorrect,
                    timeTaken,
                    timestamp: Date.now()
                };
                navigate('/tables/summary', { state: { logs: [...sessionLogs, currentLog] } });
            }
        }, isCorrect ? (isAdvanced ? 600 : 1000) : 2500); // Faster transition for advanced users

    }, [currentIndex, currentQuestion, userAnswer, startTime, questions, sessionLogs, navigate, user, isAdvanced]);

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showFeedback) return;
            if (e.key >= '0' && e.key <= '9') handleInput(parseInt(e.key));
            else if (e.key === 'Backspace') handleBackspace();
            else if (e.key === 'Enter') handleSubmit();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [userAnswer, showFeedback, handleSubmit]);


    if (!currentQuestion) return <div>Loading...</div>;

    return (
        <div className={`min-h-screen ${theme.bg} ${theme.text} flex flex-col items-center relative overflow-hidden transition-colors duration-500`}>

            {/* Background Animations */}
            {isAdvanced ? (
                <>
                    <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-50" />
                    <div className="fixed bottom-0 right-0 w-96 h-96 bg-cyan-900/20 rounded-full filter blur-3xl" />
                    <div className="fixed top-20 left-10 w-64 h-64 bg-purple-900/20 rounded-full filter blur-3xl animate-pulse" />
                </>
            ) : (
                // Original playful blobs
                <>
                </>
            )}

            {/* Top Bar */}
            <div className="w-full p-4 flex justify-between items-center max-w-lg mx-auto z-10">
                <button onClick={() => navigate('/tables')} className={`p-2 rounded-full hover:bg-opacity-80 transition ${isAdvanced ? 'bg-slate-800 text-cyan-400' : 'bg-white text-slate-600'}`}>
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex gap-2 items-center flex-1 mx-4">
                    <div className={`h-2 flex-1 rounded-full overflow-hidden ${isAdvanced ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div
                            className={`h-full transition-all duration-500 ${theme.progressBar}`}
                            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                        />
                    </div>
                    <span className={`text-xs font-bold ${isAdvanced ? 'text-slate-500' : 'text-slate-400'}`}>{currentIndex + 1}/{questions.length}</span>
                </div>
                <div className={`flex items-center gap-1 font-bold ${isAdvanced ? 'text-cyan-400' : 'text-orange-500'}`}>
                    {isAdvanced ? <Zap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    <span>{streak}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-center p-4 z-10">

                {/* Question Card */}
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50 }}
                        className={`${theme.cardBg} w-full rounded-3xl p-8 mb-8 flex flex-col items-center justify-center min-h-[220px] transition-colors duration-300 relative overflow-hidden`}
                    >
                        {isAdvanced && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />}

                        <div className={`text-6xl font-black tracking-tighter flex items-center gap-4 ${theme.text}`}>
                            {currentQuestion.type === 'DIRECT' ? (
                                <>
                                    <span>{currentQuestion.table}</span>
                                    <span className={theme.accent}>×</span>
                                    <span>{currentQuestion.multiplier}</span>
                                    <span className="opacity-40">=</span>
                                    <span className={`min-w-[80px] text-center border-b-4 ${userAnswer ? (isAdvanced ? 'border-cyan-500 text-cyan-400' : 'border-indigo-500 text-indigo-600') : (isAdvanced ? 'border-slate-600' : 'border-slate-200')} pb-2 transition-colors`}>
                                        {userAnswer || '?'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span>{currentQuestion.table}</span>
                                    <span className={theme.accent}>×</span>
                                    <span className={`min-w-[80px] text-center border-b-4 ${userAnswer ? (isAdvanced ? 'border-cyan-500 text-cyan-400' : 'border-indigo-500 text-indigo-600') : (isAdvanced ? 'border-slate-600' : 'border-slate-200')} pb-2 transition-colors`}>
                                        {userAnswer || '?'}
                                    </span>
                                    <span className="opacity-40">=</span>
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
                            className={`absolute inset-0 flex items-center justify-center ${theme.feedbackBg} backdrop-blur-sm z-20 pointer-events-none`}
                        >
                            <div className={`${theme.feedbackCorrect} font-black text-6xl flex flex-col items-center gap-4`}>
                                {isAdvanced ? <Zap size={64} /> : null}
                                {isAdvanced ? "SYSTEM OPTIMAL" : "AWESOME!"}
                            </div>
                        </motion.div>
                    )}
                    {showFeedback === 'INCORRECT' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-32 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg border border-red-400 z-20 pointer-events-none"
                        >
                            <span className="font-bold">Result: {currentQuestion.correctAnswer}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleInput(num)}
                            className={`h-16 rounded-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 text-2xl font-bold transition-all font-mono ${theme.numpadBg}`}
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleBackspace}
                        className={`h-16 rounded-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 font-bold transition-all flex items-center justify-center ${theme.secondaryButton}`}
                    >
                        ⌫
                    </button>
                    <button
                        onClick={() => handleInput(0)}
                        className={`h-16 rounded-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 text-2xl font-bold transition-all font-mono ${theme.numpadBg}`}
                    >
                        0
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`h-16 rounded-xl border-b-4 active:border-b-0 active:translate-y-1 font-bold transition-all flex items-center justify-center bg-transparent ${theme.button}`}
                        style={{ borderBottomColor: 'rgba(0,0,0,0.2)' }}
                    >
                        <Send className="w-6 h-6" />
                    </button>
                </div>

            </div>
        </div>
    );
}
