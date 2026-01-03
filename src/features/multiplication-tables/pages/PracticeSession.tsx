import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Sparkles, Zap } from 'lucide-react';
import { useNinja } from '../../../context/NinjaContext';
// Static import to resolve build warning (was mixed with dynamic/static in other files)
import { getStudentTableStats, saveSinglePracticeLog, getDetailedTableStats } from '../services/tablesFirestore';
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
        // Study Era "Soft & Smart" Theme
        bg: "bg-[#FAF9F6]",
        cardBg: "bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        text: "text-[#4A4A4A]",
        accent: "text-[#FF8DA1]",
        button: "bg-[#FF8DA1] hover:bg-[#ff7b93] text-white shadow-[0_10px_20px_rgba(255,141,161,0.3)]",
        secondaryButton: "bg-gray-100 text-gray-400 font-medium hover:bg-gray-200",
        numpadBg: "bg-white text-gray-600 border border-gray-100 hover:bg-pink-50 hover:border-pink-200 transition-colors",
        numpadActive: "border-pink-300 bg-pink-50",
        progressBar: "bg-[#FF8DA1]",
        feedbackCorrect: "text-[#FF8DA1] drop-shadow-sm",
        feedbackBg: "bg-white/90"
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

    // State from navigation - initialized once to maintain stability and prevent infinite loops
    const [selectedTables] = useState<number[]>(() =>
        (location.state as { tables: number[] })?.tables || [2]
    );

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
    const [detailedStats, setDetailedStats] = useState<Record<number, Record<number, any>>>({}); // New detailed stats

    // Fetch Mastery Stats for Advanced Mode
    useEffect(() => {
        if (!user) {
            setMasteryFetched(true);
            return;
        }

        const loadStats = async () => {
            // 1. General Stats for Limit
            if (isAdvanced) {
                console.log('[PracticeSession] Fetching mastery stats for dynamic limits...');
                try {
                    const stats = await getStudentTableStats(user.uid);
                    let maxMastered = 10;
                    stats.forEach(s => {
                        if (s.accuracy >= 80 && s.totalAttempts >= 20) {
                            if (s.table > maxMastered) maxMastered = s.table;
                        }
                    });
                    const limit = Math.max(10, maxMastered);
                    setMasteryLimit(limit);

                    // 2. Detailed Stats for Adaptive Selection
                    const detailed = await getDetailedTableStats(user.uid);
                    setDetailedStats(detailed);
                } catch (e) {
                    console.error("Error fetching stats", e);
                }
            }
            setMasteryFetched(true);
        };

        loadStats();

    }, [user, isAdvanced]);

    // Initialize Session with Adaptive Logic
    useEffect(() => {
        if (!masteryFetched) return; // Wait for mastery check

        console.log(`[PracticeSession] Generating questions. Tables: ${selectedTables.join(', ')}`);

        // 1. Build Candidate Pool with Weights
        const candidates: { table: number, multiplier: number, weight: number }[] = [];

        selectedTables.forEach(t => {
            // Multiplier Range
            const limit = isAdvanced ? masteryLimit : 12;
            for (let m = 1; m <= limit; m++) {
                // Exclusion Logic for Advanced Mode: No x1 or x10
                if (isAdvanced && (m === 1 || m === 10)) continue;

                // Weight Calculation
                let weight = 10; // Base Weight

                if (isAdvanced) {
                    // Get stats
                    const stat = detailedStats && detailedStats[t] && detailedStats[t][m];
                    if (stat) {
                        // Heavily penalize low accuracy to force practice
                        if (stat.accuracy < 70) weight += 100;
                        else if (stat.accuracy < 90) weight += 50;

                        // Prioritize slow answers
                        if (stat.avgTime > 6000) weight += 40; // >6 seconds
                        else if (stat.avgTime > 4000) weight += 20; // >4 seconds

                        // Ensure we revisit "mastered" ones occasionally (base weight handles this)

                        // If total attempts is low, boost it to categorize it
                        if (stat.total < 5) weight += 30;
                    } else {
                        // Completely new/unseen
                        weight += 50;
                    }
                }

                candidates.push({ table: t, multiplier: m, weight });
            }
        });

        // Helper: Weighted Random Picker
        const pickWeighted = (): { table: number, multiplier: number } => {
            if (candidates.length === 0) return { table: 2, multiplier: 2 }; // Fallback

            const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
            let random = Math.random() * totalWeight;

            for (const cand of candidates) {
                random -= cand.weight;
                if (random <= 0) return cand;
            }
            return candidates[candidates.length - 1];
        };

        const newQuestions: Question[] = [];
        const sessionLength = isAdvanced ? 25 : 20;

        // Generate Questions
        const usedIds = new Set<string>();

        for (let i = 0; i < sessionLength; i++) {
            let selected = pickWeighted();
            let uniqueKey = `${selected.table}x${selected.multiplier}`;

            // Try to avoid immediate duplicates if pool is large enough
            let retries = 5;
            while (usedIds.has(uniqueKey) && candidates.length > 5 && retries > 0) {
                selected = pickWeighted();
                uniqueKey = `${selected.table}x${selected.multiplier}`;
                retries--;
            }
            usedIds.add(uniqueKey);

            // Determine Type
            // Grade 2: 20% Missing Mutliplier
            // Grade 7 (Advanced): 40% Missing Multiplier
            const missingChance = isAdvanced ? 0.4 : 0.2;
            const type: QuestionType = Math.random() < missingChance ? 'MISSING_MULTIPLIER' : 'DIRECT';

            newQuestions.push({
                id: `${selected.table}-x-${selected.multiplier}-${type}-${i}`, // Unique ID even if duplicate fact
                table: selected.table,
                multiplier: selected.multiplier,
                type: type,
                correctAnswer: type === 'MISSING_MULTIPLIER' ? selected.multiplier : (selected.table * selected.multiplier)
            });
        }

        setQuestions(newQuestions);
    }, [selectedTables, isAdvanced, masteryFetched, masteryLimit, detailedStats]);

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
                    <div className="fixed -top-20 -right-20 w-96 h-96 bg-pink-100/50 rounded-full blur-[100px] animate-pulse" />
                    <div className="fixed bottom-0 -left-20 w-80 h-80 bg-purple-100/40 rounded-full blur-[120px]" />
                </>
            ) : (
                // Original playful blobs
                <>
                </>
            )}

            {/* Top Bar */}
            <div className="w-full p-4 flex justify-between items-center max-w-lg mx-auto z-10">
                <button onClick={() => navigate('/tables')} className={`p-2 rounded-full hover:bg-opacity-80 transition ${isAdvanced ? 'bg-white shadow-sm text-pink-400' : 'bg-white text-slate-600'}`}>
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex gap-2 items-center flex-1 mx-4">
                    <div className={`h-2 flex-1 rounded-full overflow-hidden ${isAdvanced ? 'bg-pink-100' : 'bg-slate-200'}`}>
                        <div
                            className={`h-full transition-all duration-500 ${theme.progressBar}`}
                            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                        />
                    </div>
                    <span className={`text-xs font-bold ${isAdvanced ? 'text-pink-400' : 'text-slate-400'}`}>{currentIndex + 1}/{questions.length}</span>
                </div>
                <div className={`flex items-center gap-1 font-bold ${isAdvanced ? 'text-[#FF8DA1]' : 'text-orange-500'}`}>
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
                        {isAdvanced && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-pink-300/50 to-transparent" />}
                        <div className={`text-6xl font-black tracking-tighter flex items-center gap-4 ${theme.text}`}>
                            {currentQuestion.type === 'DIRECT' ? (
                                <>
                                    <span>{currentQuestion.table}</span>
                                    <span className={theme.accent}>×</span>
                                    <span>{currentQuestion.multiplier}</span>
                                    <span className="opacity-40">=</span>
                                    <span className={`min-w-[80px] text-center border-b-4 ${userAnswer ? (isAdvanced ? 'border-pink-400 text-pink-500' : 'border-indigo-500 text-indigo-600') : (isAdvanced ? 'border-pink-100' : 'border-slate-200')} pb-2 transition-colors`}>
                                        {userAnswer || '?'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span>{currentQuestion.table}</span>
                                    <span className={theme.accent}>×</span>
                                    <span className={`min-w-[80px] text-center border-b-4 ${userAnswer ? (isAdvanced ? 'border-fuchsia-500 text-fuchsia-400' : 'border-indigo-500 text-indigo-600') : (isAdvanced ? 'border-violet-600' : 'border-slate-200')} pb-2 transition-colors`}>
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
                            <div className={`${theme.feedbackCorrect} font-black text-6xl flex flex-col items-center gap-4 text-center`}>
                                {isAdvanced ? <Zap size={64} /> : null}
                                {isAdvanced ? "SLAY!" : "AWESOME!"}
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
                <div className="grid grid-cols-3 gap-3 md:gap-8 w-full max-w-xs md:max-w-3xl">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleInput(num)}
                            className={`h-16 md:h-24 rounded-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 text-2xl md:text-5xl font-bold transition-all font-mono ${theme.numpadBg}`}
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleBackspace}
                        className={`h-16 md:h-24 rounded-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 font-bold transition-all flex items-center justify-center ${theme.secondaryButton}`}
                    >
                        <span className="text-xl md:text-4xl">⌫</span>
                    </button>
                    <button
                        onClick={() => handleInput(0)}
                        className={`h-16 md:h-24 rounded-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 text-2xl md:text-5xl font-bold transition-all font-mono ${theme.numpadBg}`}
                    >
                        0
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`h-16 md:h-24 rounded-xl border-b-4 active:border-b-0 active:translate-y-1 font-bold transition-all flex items-center justify-center ${theme.button}`}
                        style={{ borderBottomColor: 'rgba(0,0,0,0.2)' }}
                    >
                        <Send className="w-6 h-6 md:w-10 md:h-10" />
                    </button>
                </div>

            </div>
        </div>
    );
}
